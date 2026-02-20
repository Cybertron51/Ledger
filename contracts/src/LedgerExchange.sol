// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/**
 * @title  LedgerExchange
 * @notice Settles matched orders from the off-chain order book.
 *
 * Flow
 * ────
 * 1. User signs an Order off-chain via EIP-712 typed data.
 * 2. Ledger's matching engine pairs a buy order with a sell order.
 * 3. Ledger calls settle() — funds and NFTs swap atomically.
 * 4. Protocol fee (default 1.5%) is deducted from USDC proceeds.
 *
 * Settlement is denominated in USDC (6 decimals on Base).
 * Users never interact with USDC directly — the frontend shows USD.
 *
 * Order cancellation
 * ──────────────────
 * Users can cancel individual orders by submitting their nonce on-chain.
 * The matching engine also checks cancelled nonces before pairing.
 */
contract LedgerExchange is EIP712, ReentrancyGuard, Ownable, Pausable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev EIP-712 type hash for Order struct
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,uint256 tokenId,uint256 priceUsdc,bool isBuy,uint256 quantity,uint256 nonce,uint256 expiry)"
    );

    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint256 public constant MAX_FEE         = 500; // 5% hard cap

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct Order {
        address maker;       // wallet that signed the order
        uint256 tokenId;     // CardNFT token ID
        uint256 priceUsdc;   // price per card in USDC (6 decimals)
        bool    isBuy;       // true = buy order, false = sell order
        uint256 quantity;    // number of cards
        uint256 nonce;       // unique per order per maker
        uint256 expiry;      // unix timestamp — order invalid after this
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    IERC20   public immutable usdc;
    IERC1155 public immutable cardNft;

    address  public feeRecipient;
    uint256  public feeBps = 150; // 1.5%

    /// @dev maker → nonce → cancelled
    mapping(address => mapping(uint256 => bool)) public cancelledNonces;

    /// @dev order hash → settled (prevents replay)
    mapping(bytes32 => bool) public settledOrders;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event OrderSettled(
        bytes32 indexed buyOrderHash,
        bytes32 indexed sellOrderHash,
        address indexed buyer,
        address seller,
        uint256 tokenId,
        uint256 quantity,
        uint256 priceUsdc,
        uint256 feeUsdc
    );

    event OrderCancelled(address indexed maker, uint256 nonce);
    event FeeUpdated(uint256 oldBps, uint256 newBps);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error OrderExpired(bytes32 orderHash);
    error OrderAlreadySettled(bytes32 orderHash);
    error OrderCancelledError(bytes32 orderHash);
    error InvalidSignature(bytes32 orderHash);
    error PriceMismatch(uint256 buyPrice, uint256 sellPrice);
    error QuantityMismatch(uint256 buyQty, uint256 sellQty);
    error SideError();
    error FeeTooHigh(uint256 feeBps);
    error ZeroAddress();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(
        address _usdc,
        address _cardNft,
        address _feeRecipient,
        address _owner
    ) EIP712("LedgerExchange", "1") Ownable(_owner) {
        if (_usdc == address(0) || _cardNft == address(0) || _feeRecipient == address(0))
            revert ZeroAddress();

        usdc         = IERC20(_usdc);
        cardNft      = IERC1155(_cardNft);
        feeRecipient = _feeRecipient;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core: settle a matched order pair
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Settle a matched buy/sell order pair.
     * @dev    Called by Ledger's matching engine (off-chain). Both makers must
     *         have pre-approved this contract to transfer their assets.
     *         - Buyer approves: usdc.approve(exchange, amount)
     *         - Seller approves: cardNft.setApprovalForAll(exchange, true)
     */
    function settle(
        Order calldata buyOrder,
        bytes  calldata buySignature,
        Order calldata sellOrder,
        bytes  calldata sellSignature
    ) external nonReentrant whenNotPaused {
        // ── Validate sides ────────────────────────────────────────────────────
        if (!buyOrder.isBuy || sellOrder.isBuy) revert SideError();

        // ── Validate prices match ─────────────────────────────────────────────
        if (buyOrder.priceUsdc < sellOrder.priceUsdc)
            revert PriceMismatch(buyOrder.priceUsdc, sellOrder.priceUsdc);
        if (buyOrder.quantity != sellOrder.quantity)
            revert QuantityMismatch(buyOrder.quantity, sellOrder.quantity);

        // ── Hash orders ───────────────────────────────────────────────────────
        bytes32 buyHash  = _hashOrder(buyOrder);
        bytes32 sellHash = _hashOrder(sellOrder);

        // ── Validate each order ───────────────────────────────────────────────
        _validateOrder(buyOrder,  buyHash,  buySignature);
        _validateOrder(sellOrder, sellHash, sellSignature);

        // ── Mark settled ──────────────────────────────────────────────────────
        settledOrders[buyHash]  = true;
        settledOrders[sellHash] = true;

        // ── Calculate amounts (use sell price as execution price) ─────────────
        uint256 execPrice  = sellOrder.priceUsdc;
        uint256 grossUsdc  = execPrice * sellOrder.quantity;
        uint256 feeUsdc    = (grossUsdc * feeBps) / FEE_DENOMINATOR;
        uint256 netUsdc    = grossUsdc - feeUsdc;

        // ── Atomic swap ───────────────────────────────────────────────────────
        // 1. NFT: seller → buyer
        cardNft.safeTransferFrom(
            sellOrder.maker,
            buyOrder.maker,
            sellOrder.tokenId,
            sellOrder.quantity,
            ""
        );

        // 2. USDC: buyer → seller (net) + fee recipient
        usdc.safeTransferFrom(buyOrder.maker, sellOrder.maker, netUsdc);
        if (feeUsdc > 0) {
            usdc.safeTransferFrom(buyOrder.maker, feeRecipient, feeUsdc);
        }

        emit OrderSettled(
            buyHash,
            sellHash,
            buyOrder.maker,
            sellOrder.maker,
            sellOrder.tokenId,
            sellOrder.quantity,
            execPrice,
            feeUsdc
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cancel
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Cancel one or more of your own orders by nonce.
     */
    function cancelOrders(uint256[] calldata nonces) external {
        for (uint256 i = 0; i < nonces.length; i++) {
            cancelledNonces[msg.sender][nonces[i]] = true;
            emit OrderCancelled(msg.sender, nonces[i]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    function hashOrder(Order calldata order) external view returns (bytes32) {
        return _hashOrder(order);
    }

    function isOrderValid(Order calldata order, bytes calldata signature)
        external
        view
        returns (bool valid, string memory reason)
    {
        bytes32 h = _hashOrder(order);
        if (block.timestamp > order.expiry)                   return (false, "expired");
        if (settledOrders[h])                                  return (false, "settled");
        if (cancelledNonces[order.maker][order.nonce])         return (false, "cancelled");
        address signer = ECDSA.recover(h, signature);
        if (signer != order.maker)                             return (false, "bad signature");
        return (true, "");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE) revert FeeTooHigh(_feeBps);
        emit FeeUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, _feeRecipient);
        feeRecipient = _feeRecipient;
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────────

    function _hashOrder(Order calldata order) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.tokenId,
            order.priceUsdc,
            order.isBuy,
            order.quantity,
            order.nonce,
            order.expiry
        )));
    }

    function _validateOrder(
        Order calldata order,
        bytes32 orderHash,
        bytes calldata signature
    ) internal view {
        if (block.timestamp > order.expiry)
            revert OrderExpired(orderHash);
        if (settledOrders[orderHash])
            revert OrderAlreadySettled(orderHash);
        if (cancelledNonces[order.maker][order.nonce])
            revert OrderCancelledError(orderHash);

        address signer = ECDSA.recover(orderHash, signature);
        if (signer != order.maker)
            revert InvalidSignature(orderHash);
    }
}
