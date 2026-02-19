/**
 * LEDGER — Deployed Contract Addresses & ABIs
 *
 * Chain: Base Sepolia (testnet)
 * Deployed: 2025
 */

// ── Addresses ────────────────────────────────────────────────────────────────

export const CHAIN_ID = 84532 // Base Sepolia

export const CARD_NFT_ADDRESS =
  "0xA5BF9A6766333b7D0Eb55a6021Dc261f3A1894B2" as const

export const LEDGER_EXCHANGE_ADDRESS =
  "0x16Fd269841d0925ddC12D486B30B04d1aFb2246b" as const

export const LEDGER_ESCROW_ADDRESS =
  "0xB5F550EBEf4F72bD5C0f0b376dBB63a023a6fC11" as const

/** USDC on Base Sepolia (6 decimals) */
export const USDC_ADDRESS =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const

// ── LedgerExchange ABI (settle + cancel + view functions + events) ────────────

export const LEDGER_EXCHANGE_ABI = [
  {
    type: "function",
    name: "settle",
    inputs: [
      {
        name: "buyOrder",
        type: "tuple",
        components: [
          { name: "maker",      type: "address" },
          { name: "tokenId",   type: "uint256" },
          { name: "priceUsdc", type: "uint256" },
          { name: "isBuy",     type: "bool"    },
          { name: "quantity",  type: "uint256" },
          { name: "nonce",     type: "uint256" },
          { name: "expiry",    type: "uint256" },
        ],
      },
      { name: "buySignature",  type: "bytes" },
      {
        name: "sellOrder",
        type: "tuple",
        components: [
          { name: "maker",      type: "address" },
          { name: "tokenId",   type: "uint256" },
          { name: "priceUsdc", type: "uint256" },
          { name: "isBuy",     type: "bool"    },
          { name: "quantity",  type: "uint256" },
          { name: "nonce",     type: "uint256" },
          { name: "expiry",    type: "uint256" },
        ],
      },
      { name: "sellSignature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelOrders",
    inputs: [{ name: "nonces", type: "uint256[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "feeBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isOrderValid",
    inputs: [
      {
        name: "order",
        type: "tuple",
        components: [
          { name: "maker",      type: "address" },
          { name: "tokenId",   type: "uint256" },
          { name: "priceUsdc", type: "uint256" },
          { name: "isBuy",     type: "bool"    },
          { name: "quantity",  type: "uint256" },
          { name: "nonce",     type: "uint256" },
          { name: "expiry",    type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "valid",  type: "bool"   },
      { name: "reason", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "settledOrders",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DOMAIN_SEPARATOR",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "OrderSettled",
    inputs: [
      { name: "buyOrderHash",  type: "bytes32", indexed: true  },
      { name: "sellOrderHash", type: "bytes32", indexed: true  },
      { name: "buyer",         type: "address", indexed: true  },
      { name: "seller",        type: "address", indexed: false },
      { name: "tokenId",       type: "uint256", indexed: false },
      { name: "quantity",      type: "uint256", indexed: false },
      { name: "priceUsdc",     type: "uint256", indexed: false },
      { name: "feeUsdc",       type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "OrderCancelled",
    inputs: [
      { name: "maker", type: "address", indexed: true  },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
  // Custom errors from LedgerExchange
  { type: "error", name: "OrderExpired",       inputs: [{ name: "orderHash", type: "bytes32" }] },
  { type: "error", name: "OrderAlreadySettled",inputs: [{ name: "orderHash", type: "bytes32" }] },
  { type: "error", name: "OrderCancelledError",inputs: [{ name: "orderHash", type: "bytes32" }] },
  { type: "error", name: "InvalidSignature",   inputs: [{ name: "orderHash", type: "bytes32" }] },
  { type: "error", name: "PriceMismatch",      inputs: [{ name: "buyPrice", type: "uint256" }, { name: "sellPrice", type: "uint256" }] },
  { type: "error", name: "QuantityMismatch",   inputs: [{ name: "buyQty", type: "uint256" }, { name: "sellQty", type: "uint256" }] },
  { type: "error", name: "SideError",          inputs: [] },
  { type: "error", name: "FeeTooHigh",         inputs: [{ name: "feeBps", type: "uint256" }] },
  { type: "error", name: "ZeroAddress",        inputs: [] },
] as const
