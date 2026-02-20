// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CardNFT.sol";

contract CardNFTTest is Test {
    CardNFT public nft;

    address admin   = makeAddr("admin");
    address minter  = makeAddr("minter");
    address user    = makeAddr("user");
    address user2   = makeAddr("user2");

    string constant SERIAL  = "12345678";
    string constant NAME    = "Charizard Holo";
    string constant SET     = "Base Set 1999";
    string constant SYMBOL  = "CHZ10-BASE-1999";
    uint8  constant GRADE   = 10;

    function setUp() public {
        vm.startPrank(admin);
        nft = new CardNFT(admin, "https://api.ledger.xyz/cards/{id}");
        nft.grantRole(nft.MINTER_ROLE(), minter);
        vm.stopPrank();
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    function test_mint_success() public {
        vm.prank(minter);
        uint256 tokenId = nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);

        assertEq(nft.balanceOf(user, tokenId), 1);

        CardNFT.CardMetadata memory meta = nft.getMetadata(tokenId);
        assertEq(meta.psaSerialNumber, SERIAL);
        assertEq(meta.grade, GRADE);
        assertEq(meta.cardName, NAME);
        assertEq(meta.setName, SET);
        assertEq(meta.symbol, SYMBOL);
    }

    function test_mint_derivesTokenIdFromSerial() public {
        vm.prank(minter);
        uint256 tokenId = nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);

        uint256 expected = uint256(keccak256(abi.encodePacked(SERIAL)));
        assertEq(tokenId, expected);
    }

    function test_mint_revertsIfNotMinter() public {
        vm.prank(user);
        vm.expectRevert();
        nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);
    }

    function test_mint_revertsOnDuplicateSerial() public {
        vm.startPrank(minter);
        nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);
        vm.expectRevert(abi.encodeWithSelector(CardNFT.AlreadyMinted.selector, SERIAL));
        nft.mint(user2, SERIAL, GRADE, NAME, SET, SYMBOL);
        vm.stopPrank();
    }

    function test_mint_revertsOnInvalidGrade() public {
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(CardNFT.InvalidGrade.selector, 7));
        nft.mint(user, SERIAL, 7, NAME, SET, SYMBOL);
    }

    function test_mint_revertsOnEmptySerial() public {
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(CardNFT.EmptyString.selector, "psaSerialNumber"));
        nft.mint(user, "", GRADE, NAME, SET, SYMBOL);
    }

    function test_mint_gradeRange() public {
        vm.startPrank(minter);
        nft.mint(user,  "SER8", 8, NAME, SET, SYMBOL);
        nft.mint(user,  "SER9", 9, NAME, SET, SYMBOL);
        nft.mint(user,  "SER10", 10, NAME, SET, SYMBOL);
        vm.stopPrank();
    }

    // ── Burn ──────────────────────────────────────────────────────────────────

    function test_burn_success() public {
        vm.prank(minter);
        uint256 tokenId = nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);

        vm.prank(admin);
        nft.burn(user, tokenId);

        assertEq(nft.balanceOf(user, tokenId), 0);
        assertFalse(nft.tokenExists(tokenId));
    }

    function test_burn_revertsIfNotBurner() public {
        vm.prank(minter);
        uint256 tokenId = nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);

        vm.prank(user);
        vm.expectRevert();
        nft.burn(user, tokenId);
    }

    function test_burn_clearsSerialLookup() public {
        vm.prank(minter);
        uint256 tokenId = nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);

        vm.prank(admin);
        nft.burn(user, tokenId);

        assertEq(nft.tokenIdForSerial(SERIAL), 0);
    }

    // ── Reverse lookup ────────────────────────────────────────────────────────

    function test_tokenIdForSerial() public {
        vm.prank(minter);
        uint256 tokenId = nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);
        assertEq(nft.tokenIdForSerial(SERIAL), tokenId);
    }

    // ── Pause ─────────────────────────────────────────────────────────────────

    function test_pause_blocksMinting() public {
        vm.prank(admin);
        nft.pause();

        vm.prank(minter);
        vm.expectRevert();
        nft.mint(user, SERIAL, GRADE, NAME, SET, SYMBOL);
    }

    // ── Royalties ─────────────────────────────────────────────────────────────

    function test_royaltyInfo() public view {
        (address receiver, uint256 amount) = nft.royaltyInfo(0, 10_000);
        assertEq(receiver, admin);
        assertEq(amount, 250); // 2.5%
    }

    // ── supportsInterface ─────────────────────────────────────────────────────

    function test_supportsERC1155() public view {
        assertTrue(nft.supportsInterface(type(IERC1155).interfaceId));
    }

    function test_supportsERC2981() public view {
        // ERC2981 interface id
        assertTrue(nft.supportsInterface(0x2a55205a));
    }
}
