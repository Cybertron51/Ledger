// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title  CardNFT
 * @notice ERC-1155 token representing ownership of PSA-graded trading cards
 *         held in Ledger's physical vault.
 *
 * Token ID convention
 * ───────────────────
 * Each token ID is derived deterministically from the PSA serial number:
 *   tokenId = uint256(keccak256(abi.encodePacked(psaSerialNumber)))
 *
 * Supply
 * ──────
 * Each physical card is minted with supply = 1 (effectively ERC-721 semantics).
 * The ERC-1155 standard is used for gas efficiency and potential fractional
 * ownership in future upgrades.
 *
 * Roles
 * ─────
 * MINTER_ROLE  — Ledger vault ops: mints when a card is deposited
 * BURNER_ROLE  — Ledger vault ops: burns when a card is withdrawn
 * ADMIN_ROLE   — Protocol admin: sets royalties, pauses, upgrades URI
 */
contract CardNFT is ERC1155, ERC2981, AccessControl, Pausable {
    using Strings for uint256;

    // ─────────────────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────────────────

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct CardMetadata {
        string psaSerialNumber; // PSA cert number — unique per physical card
        uint8  grade;           // PSA grade: 8, 9, or 10
        string cardName;        // e.g. "Charizard Holo"
        string setName;         // e.g. "Base Set 1999"
        string symbol;          // Trading symbol e.g. "CHZ10-BASE-1999"
        uint256 mintedAt;       // Block timestamp of vault deposit
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev tokenId → metadata
    mapping(uint256 => CardMetadata) private _metadata;

    /// @dev tokenId → exists
    mapping(uint256 => bool) private _exists;

    /// @dev PSA serial → tokenId (reverse lookup)
    mapping(string => uint256) private _serialToTokenId;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event CardMinted(
        address indexed to,
        uint256 indexed tokenId,
        string psaSerialNumber,
        uint8 grade,
        string cardName
    );

    event CardBurned(
        address indexed from,
        uint256 indexed tokenId,
        string psaSerialNumber
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error InvalidGrade(uint8 grade);
    error AlreadyMinted(string psaSerialNumber);
    error TokenNotFound(uint256 tokenId);
    error EmptyString(string field);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address admin, string memory baseUri) ERC1155(baseUri) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);

        // Default royalty: 2.5% to admin
        _setDefaultRoyalty(admin, 250);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Minting — called by vault ops when a card is deposited
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Mint a new card NFT to `to`.
     * @dev    tokenId is derived from psaSerialNumber — guaranteed unique.
     */
    function mint(
        address to,
        string calldata psaSerialNumber,
        uint8  grade,
        string calldata cardName,
        string calldata setName,
        string calldata symbol
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 tokenId) {
        if (grade < 8 || grade > 10) revert InvalidGrade(grade);
        if (bytes(psaSerialNumber).length == 0) revert EmptyString("psaSerialNumber");
        if (bytes(cardName).length == 0)        revert EmptyString("cardName");
        if (_serialToTokenId[psaSerialNumber] != 0) revert AlreadyMinted(psaSerialNumber);

        tokenId = uint256(keccak256(abi.encodePacked(psaSerialNumber)));

        _metadata[tokenId] = CardMetadata({
            psaSerialNumber: psaSerialNumber,
            grade:           grade,
            cardName:        cardName,
            setName:         setName,
            symbol:          symbol,
            mintedAt:        block.timestamp
        });

        _exists[tokenId] = true;
        _serialToTokenId[psaSerialNumber] = tokenId;

        _mint(to, tokenId, 1, "");

        emit CardMinted(to, tokenId, psaSerialNumber, grade, cardName);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Burning — called by vault ops when a card is withdrawn
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Burn a card NFT when the owner redeems the physical card.
     */
    function burn(address from, uint256 tokenId) external onlyRole(BURNER_ROLE) {
        if (!_exists[tokenId]) revert TokenNotFound(tokenId);

        string memory serial = _metadata[tokenId].psaSerialNumber;
        delete _serialToTokenId[serial];
        delete _metadata[tokenId];
        delete _exists[tokenId];

        _burn(from, tokenId, 1);

        emit CardBurned(from, tokenId, serial);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reads
    // ─────────────────────────────────────────────────────────────────────────

    function getMetadata(uint256 tokenId) external view returns (CardMetadata memory) {
        if (!_exists[tokenId]) revert TokenNotFound(tokenId);
        return _metadata[tokenId];
    }

    function tokenIdForSerial(string calldata psaSerialNumber) external view returns (uint256) {
        return _serialToTokenId[psaSerialNumber];
    }

    function tokenExists(uint256 tokenId) external view returns (bool) {
        return _exists[tokenId];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setURI(string calldata newUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newUri);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ─────────────────────────────────────────────────────────────────────────
    // Overrides
    // ─────────────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
