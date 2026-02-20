// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title  LedgerEscrow
 * @notice Optional escrow for users who want to deposit assets on-chain
 *         ahead of trading rather than granting token approvals to the exchange.
 *
 * Use case
 * ────────
 * - Seller deposits card NFT → receives an escrowed balance the exchange can fill from
 * - Buyer deposits USDC      → ditto
 * - Either party can withdraw their escrowed assets at any time if unmatched
 *
 * Only the LedgerExchange (set as `operator`) may move escrowed assets to settle.
 * Users retain self-custody until settlement — Ledger cannot unilaterally move funds.
 */
contract LedgerEscrow is ERC1155Holder, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    IERC20   public immutable usdc;
    IERC1155 public immutable cardNft;

    /// @dev The exchange contract allowed to pull assets during settlement
    address public operator;

    /// @dev user → USDC balance in escrow
    mapping(address => uint256) public usdcBalance;

    /// @dev user → tokenId → quantity in escrow
    mapping(address => mapping(uint256 => uint256)) public nftBalance;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event UsdcDeposited(address indexed user, uint256 amount);
    event UsdcWithdrawn(address indexed user, uint256 amount);
    event NftDeposited(address indexed user, uint256 indexed tokenId, uint256 quantity);
    event NftWithdrawn(address indexed user, uint256 indexed tokenId, uint256 quantity);
    event OperatorUpdated(address oldOperator, address newOperator);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error InsufficientBalance();
    error NotOperator();
    error ZeroAmount();
    error ZeroAddress();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(
        address _usdc,
        address _cardNft,
        address _operator,
        address _owner
    ) Ownable(_owner) {
        if (_usdc == address(0) || _cardNft == address(0)) revert ZeroAddress();
        usdc     = IERC20(_usdc);
        cardNft  = IERC1155(_cardNft);
        operator = _operator;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Deposit
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Deposit USDC into escrow. Caller must approve this contract first.
    function depositUsdc(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdcBalance[msg.sender] += amount;
        emit UsdcDeposited(msg.sender, amount);
    }

    /// @notice Deposit a card NFT into escrow. Caller must setApprovalForAll first.
    function depositNft(uint256 tokenId, uint256 quantity) external nonReentrant whenNotPaused {
        if (quantity == 0) revert ZeroAmount();
        cardNft.safeTransferFrom(msg.sender, address(this), tokenId, quantity, "");
        nftBalance[msg.sender][tokenId] += quantity;
        emit NftDeposited(msg.sender, tokenId, quantity);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Withdraw
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Withdraw USDC from escrow back to caller.
    function withdrawUsdc(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (usdcBalance[msg.sender] < amount) revert InsufficientBalance();
        usdcBalance[msg.sender] -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit UsdcWithdrawn(msg.sender, amount);
    }

    /// @notice Withdraw a card NFT from escrow back to caller.
    function withdrawNft(uint256 tokenId, uint256 quantity) external nonReentrant {
        if (quantity == 0) revert ZeroAmount();
        if (nftBalance[msg.sender][tokenId] < quantity) revert InsufficientBalance();
        nftBalance[msg.sender][tokenId] -= quantity;
        cardNft.safeTransferFrom(address(this), msg.sender, tokenId, quantity, "");
        emit NftWithdrawn(msg.sender, tokenId, quantity);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Operator settlement hooks (called by LedgerExchange during settle())
    // ─────────────────────────────────────────────────────────────────────────

    function transferUsdcFrom(address from, address to, uint256 amount) external {
        if (msg.sender != operator) revert NotOperator();
        if (usdcBalance[from] < amount) revert InsufficientBalance();
        usdcBalance[from] -= amount;
        usdc.safeTransfer(to, amount);
    }

    function transferNftFrom(address from, address to, uint256 tokenId, uint256 quantity) external {
        if (msg.sender != operator) revert NotOperator();
        if (nftBalance[from][tokenId] < quantity) revert InsufficientBalance();
        nftBalance[from][tokenId] -= quantity;
        cardNft.safeTransferFrom(address(this), to, tokenId, quantity, "");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setOperator(address _operator) external onlyOwner {
        if (_operator == address(0)) revert ZeroAddress();
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
