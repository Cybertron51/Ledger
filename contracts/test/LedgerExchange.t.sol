// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/CardNFT.sol";
import "../src/LedgerExchange.sol";

/// @dev Minimal mock USDC (6 decimals)
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) { return 6; }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract LedgerExchangeTest is Test {
    CardNFT        public nft;
    MockUSDC       public usdc;
    LedgerExchange public exchange;

    address admin        = makeAddr("admin");
    address feeRecipient = makeAddr("feeRecipient");
    address operator     = makeAddr("operator"); // matching engine

    uint256 buyerKey  = 0xB001;
    uint256 sellerKey = 0x5E11;
    address buyer     = vm.addr(buyerKey);
    address seller    = vm.addr(sellerKey);

    string  constant SERIAL  = "PSA-99999999";
    uint8   constant GRADE   = 10;
    uint256 constant PRICE   = 14_250e6; // $14,250 USDC
    uint256 constant QTY     = 1;

    uint256 tokenId;

    function setUp() public {
        // Deploy contracts
        vm.startPrank(admin);
        usdc     = new MockUSDC();
        nft      = new CardNFT(admin, "https://api.ledger.xyz/cards/{id}");
        exchange = new LedgerExchange(address(usdc), address(nft), feeRecipient, admin);

        // Mint card to seller
        tokenId = nft.mint(seller, SERIAL, GRADE, "Charizard Holo", "Base Set 1999", "CHZ10-BASE-1999");
        vm.stopPrank();

        // Fund buyer with USDC
        usdc.mint(buyer, 100_000e6);

        // Approvals
        vm.prank(seller);
        nft.setApprovalForAll(address(exchange), true);

        vm.prank(buyer);
        usdc.approve(address(exchange), type(uint256).max);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _buildOrder(
        uint256 signerKey,
        bool    isBuy,
        uint256 priceUsdc,
        uint256 nonce,
        uint256 expiry
    ) internal view returns (LedgerExchange.Order memory order, bytes memory sig) {
        address maker = vm.addr(signerKey);
        order = LedgerExchange.Order({
            maker:     maker,
            tokenId:   tokenId,
            priceUsdc: priceUsdc,
            isBuy:     isBuy,
            quantity:  QTY,
            nonce:     nonce,
            expiry:    expiry
        });

        bytes32 domainSeparator = exchange.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(abi.encode(
            exchange.ORDER_TYPEHASH(),
            order.maker,
            order.tokenId,
            order.priceUsdc,
            order.isBuy,
            order.quantity,
            order.nonce,
            order.expiry
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        sig = abi.encodePacked(r, s, v);
    }

    // ── Settle ────────────────────────────────────────────────────────────────

    function test_settle_success() public {
        uint256 expiry = block.timestamp + 1 hours;
        (LedgerExchange.Order memory buyOrder,  bytes memory buySig)  = _buildOrder(buyerKey,  true,  PRICE, 1, expiry);
        (LedgerExchange.Order memory sellOrder, bytes memory sellSig) = _buildOrder(sellerKey, false, PRICE, 1, expiry);

        uint256 feeUsdc = (PRICE * 150) / 10_000; // 1.5%
        uint256 netUsdc = PRICE - feeUsdc;

        vm.prank(admin);
        exchange.settle(buyOrder, buySig, sellOrder, sellSig);

        // NFT transferred to buyer
        assertEq(nft.balanceOf(buyer, tokenId), 1);
        assertEq(nft.balanceOf(seller, tokenId), 0);

        // USDC flows correct
        assertEq(usdc.balanceOf(seller),       netUsdc);
        assertEq(usdc.balanceOf(feeRecipient), feeUsdc);
        assertEq(usdc.balanceOf(buyer),        100_000e6 - PRICE);
    }

    function test_settle_revertsOnReplay() public {
        uint256 expiry = block.timestamp + 1 hours;
        (LedgerExchange.Order memory buyOrder,  bytes memory buySig)  = _buildOrder(buyerKey,  true,  PRICE, 1, expiry);
        (LedgerExchange.Order memory sellOrder, bytes memory sellSig) = _buildOrder(sellerKey, false, PRICE, 1, expiry);

        vm.startPrank(admin);
        exchange.settle(buyOrder, buySig, sellOrder, sellSig);

        vm.expectRevert();
        exchange.settle(buyOrder, buySig, sellOrder, sellSig);
        vm.stopPrank();
    }

    function test_settle_revertsOnExpiredOrder() public {
        uint256 expiry = block.timestamp - 1; // already expired
        (LedgerExchange.Order memory buyOrder,  bytes memory buySig)  = _buildOrder(buyerKey,  true,  PRICE, 1, expiry);
        (LedgerExchange.Order memory sellOrder, bytes memory sellSig) = _buildOrder(sellerKey, false, PRICE, 1, expiry);

        vm.prank(admin);
        vm.expectRevert();
        exchange.settle(buyOrder, buySig, sellOrder, sellSig);
    }

    function test_settle_revertsOnPriceMismatch() public {
        uint256 expiry = block.timestamp + 1 hours;
        (LedgerExchange.Order memory buyOrder,  bytes memory buySig)  = _buildOrder(buyerKey,  true,  PRICE - 1e6, 1, expiry);
        (LedgerExchange.Order memory sellOrder, bytes memory sellSig) = _buildOrder(sellerKey, false, PRICE,       1, expiry);

        vm.prank(admin);
        vm.expectRevert();
        exchange.settle(buyOrder, buySig, sellOrder, sellSig);
    }

    function test_settle_revertsOnBadSignature() public {
        uint256 expiry = block.timestamp + 1 hours;
        (LedgerExchange.Order memory buyOrder,  bytes memory buySig)  = _buildOrder(buyerKey,  true,  PRICE, 1, expiry);
        (LedgerExchange.Order memory sellOrder, bytes memory sellSig) = _buildOrder(sellerKey, false, PRICE, 1, expiry);

        // Corrupt the sell signature
        sellSig[0] = sellSig[0] ^ 0xFF;

        vm.prank(admin);
        vm.expectRevert();
        exchange.settle(buyOrder, buySig, sellOrder, sellSig);
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    function test_cancel_blocksSettle() public {
        uint256 expiry = block.timestamp + 1 hours;
        (LedgerExchange.Order memory buyOrder,  bytes memory buySig)  = _buildOrder(buyerKey,  true,  PRICE, 1, expiry);
        (LedgerExchange.Order memory sellOrder, bytes memory sellSig) = _buildOrder(sellerKey, false, PRICE, 1, expiry);

        uint256[] memory nonces = new uint256[](1);
        nonces[0] = 1;
        vm.prank(buyer);
        exchange.cancelOrders(nonces);

        vm.prank(admin);
        vm.expectRevert();
        exchange.settle(buyOrder, buySig, sellOrder, sellSig);
    }

    // ── Fee ───────────────────────────────────────────────────────────────────

    function test_setFee_revertsAboveMax() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(LedgerExchange.FeeTooHigh.selector, 501));
        exchange.setFeeBps(501);
    }

    function test_setFee_success() public {
        vm.prank(admin);
        exchange.setFeeBps(200); // 2%
        assertEq(exchange.feeBps(), 200);
    }

    // ── isOrderValid view ─────────────────────────────────────────────────────

    function test_isOrderValid_true() public view {
        uint256 expiry = block.timestamp + 1 hours;
        LedgerExchange.Order memory order = LedgerExchange.Order({
            maker: buyer, tokenId: tokenId, priceUsdc: PRICE,
            isBuy: true, quantity: QTY, nonce: 1, expiry: expiry
        });
        bytes32 domainSeparator = exchange.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(abi.encode(
            exchange.ORDER_TYPEHASH(),
            order.maker, order.tokenId, order.priceUsdc,
            order.isBuy, order.quantity, order.nonce, order.expiry
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(buyerKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        (bool valid,) = exchange.isOrderValid(order, sig);
        assertTrue(valid);
    }
}
