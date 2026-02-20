// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CardNFT.sol";
import "../src/LedgerEscrow.sol";
import "../src/LedgerExchange.sol";

/**
 * @notice Deploy all Ledger contracts to Base Sepolia (testnet) or Base mainnet.
 *
 * Usage — Base Sepolia:
 *   forge script script/Deploy.s.sol \
 *     --rpc-url base_sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Usage — Base Mainnet:
 *   forge script script/Deploy.s.sol \
 *     --rpc-url base \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY   — deployer wallet private key
 *   ADMIN_ADDRESS          — multisig or EOA that receives admin roles
 *   FEE_RECIPIENT          — address that receives protocol fees
 *   USDC_ADDRESS           — USDC contract on target chain
 *   BASE_URI               — metadata URI e.g. "https://api.ledger.xyz/cards/{id}"
 *   ETHERSCAN_API_KEY      — for contract verification on Basescan
 */
contract Deploy is Script {

    // Base Sepolia USDC
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    // Base Mainnet USDC
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerKey  = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin        = vm.envOr("ADMIN_ADDRESS",   vm.addr(deployerKey));
        address feeRecipient = vm.envOr("FEE_RECIPIENT",   vm.addr(deployerKey));
        string  memory uri   = vm.envOr("BASE_URI",        string("https://api.ledger.xyz/cards/{id}"));

        // Pick USDC address based on chain
        address usdcAddr = vm.envOr("USDC_ADDRESS", block.chainid == 8453
            ? USDC_BASE_MAINNET
            : USDC_BASE_SEPOLIA
        );

        vm.startBroadcast(deployerKey);

        // 1. Deploy CardNFT
        CardNFT cardNft = new CardNFT(admin, uri);
        console.log("CardNFT deployed at:       ", address(cardNft));

        // 2. Deploy LedgerExchange
        LedgerExchange exchange = new LedgerExchange(
            usdcAddr,
            address(cardNft),
            feeRecipient,
            admin
        );
        console.log("LedgerExchange deployed at:", address(exchange));

        // 3. Deploy LedgerEscrow (optional — operator set to exchange)
        LedgerEscrow escrow = new LedgerEscrow(
            usdcAddr,
            address(cardNft),
            address(exchange),
            admin
        );
        console.log("LedgerEscrow deployed at:  ", address(escrow));

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== LEDGER DEPLOYMENT SUMMARY ===");
        console.log("Chain ID:     ", block.chainid);
        console.log("USDC:         ", usdcAddr);
        console.log("CardNFT:      ", address(cardNft));
        console.log("Exchange:     ", address(exchange));
        console.log("Escrow:       ", address(escrow));
        console.log("Admin:        ", admin);
        console.log("Fee Recipient:", feeRecipient);
        console.log("=================================\n");
    }
}
