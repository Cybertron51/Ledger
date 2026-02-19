/**
 * LEDGER — Order Book API
 *
 * POST /api/orders  — Submit a new order (custodial: server signs on behalf of user)
 * GET  /api/orders  — List open orders
 *
 * Architecture:
 *   Each user has a custodial wallet derived deterministically from a master key.
 *   Orders are signed server-side and stored in an in-memory order book.
 *   When a buy and sell order match, settle() is called on LedgerExchange.
 *
 * Production swap: replace the in-memory store with a database (Redis / Postgres).
 */

import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, keccak256, encodePacked, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "wagmi/chains";
import {
  ORDER_DOMAIN,
  ORDER_TYPES,
  type Order,
  type SignedOrder,
  usdToUsdc,
  defaultExpiry,
} from "@/lib/orders";
import {
  LEDGER_EXCHANGE_ADDRESS,
  LEDGER_EXCHANGE_ABI,
} from "@/lib/contracts";

// ── Config ───────────────────────────────────────────────────────────────────

const MASTER_KEY = (process.env.LEDGER_MASTER_KEY ??
  // Testnet fallback — never use this on mainnet
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef") as `0x${string}`;

const RPC_URL = "https://sepolia.base.org";

// ── In-memory order book ─────────────────────────────────────────────────────
// Replace with DB in production

const orderBook: SignedOrder[] = [];

// ── Custodial wallet helpers ─────────────────────────────────────────────────

/** Derive a deterministic private key per user from the master secret */
function deriveUserKey(userId: string): `0x${string}` {
  return keccak256(encodePacked(["bytes32", "string"], [MASTER_KEY, userId]));
}

function getUserAccount(userId: string) {
  return privateKeyToAccount(deriveUserKey(userId));
}

// ── Viem clients ─────────────────────────────────────────────────────────────

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// Settler wallet — uses deployer key to call settle() (operator role)
const SETTLER_KEY = (process.env.DEPLOYER_PRIVATE_KEY ??
  "0x48c6f8657d0cfff0fd9aa04ac9f1b13f3099048a678c99a07eacb5194b13a9f8") as `0x${string}`;

const settlerClient = createWalletClient({
  account: privateKeyToAccount(SETTLER_KEY),
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ── Matching logic ───────────────────────────────────────────────────────────

function findMatch(incoming: SignedOrder): SignedOrder | null {
  const { order } = incoming;
  return (
    orderBook.find((candidate) => {
      const c = candidate.order;
      return (
        c.tokenId === order.tokenId &&
        c.isBuy !== order.isBuy && // opposite sides
        c.quantity === order.quantity &&
        // Buy price must meet or exceed sell price
        (order.isBuy
          ? order.priceUsdc >= c.priceUsdc
          : c.priceUsdc >= order.priceUsdc)
      );
    }) ?? null
  );
}

async function settleMatch(
  buyEntry: SignedOrder,
  sellEntry: SignedOrder
): Promise<`0x${string}`> {
  const tx = await settlerClient.writeContract({
    address: LEDGER_EXCHANGE_ADDRESS,
    abi: LEDGER_EXCHANGE_ABI,
    functionName: "settle",
    args: [
      buyEntry.order,
      buyEntry.signature,
      sellEntry.order,
      sellEntry.signature,
    ],
  });
  return tx;
}

// ── POST /api/orders ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      tokenId,       // numeric string or number
      priceUsd,      // USD number e.g. 1250.50
      isBuy,         // boolean
      quantity,      // number
      cardName,      // display label
    } = body;

    if (!userId || tokenId === undefined || !priceUsd || isBuy === undefined || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Derive user's custodial wallet
    const account = getUserAccount(userId);

    // Build order struct
    const order: Order = {
      maker:     account.address,
      tokenId:   BigInt(tokenId),
      priceUsdc: usdToUsdc(priceUsd),
      isBuy:     Boolean(isBuy),
      quantity:  BigInt(quantity),
      nonce:     BigInt(Date.now()),   // unique per order
      expiry:    defaultExpiry(),
    };

    // Sign with EIP-712 typed data
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const signature = await walletClient.signTypedData({
      domain: ORDER_DOMAIN,
      types: ORDER_TYPES,
      primaryType: "Order",
      message: order,
    });

    const signedOrder: SignedOrder = {
      order,
      signature,
      createdAt: Date.now(),
      userId,
      cardName: cardName ?? `Token #${tokenId}`,
      priceUsd,
    };

    // Check for a match
    const match = findMatch(signedOrder);

    if (match) {
      // Remove matched order from book
      const matchIdx = orderBook.indexOf(match);
      if (matchIdx !== -1) orderBook.splice(matchIdx, 1);

      const buyEntry  = isBuy ? signedOrder : match;
      const sellEntry = isBuy ? match : signedOrder;

      try {
        const txHash = await settleMatch(buyEntry, sellEntry);
        return NextResponse.json({
          status: "settled",
          txHash,
          makerAddress: account.address,
          message: "Order matched and settled on-chain",
        });
      } catch (err) {
        // Settlement failed — put match back, queue incoming
        orderBook.push(match);
        orderBook.push(signedOrder);
        console.error("settle() failed:", err);
        return NextResponse.json({
          status: "queued",
          makerAddress: account.address,
          message: "Match found but on-chain settlement pending",
        });
      }
    }

    // No match — add to order book
    orderBook.push(signedOrder);

    return NextResponse.json({
      status: "queued",
      makerAddress: account.address,
      message: "Order submitted to order book",
    });
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/orders ──────────────────────────────────────────────────────────

export async function GET() {
  const open = orderBook.map((entry) => ({
    cardName:    entry.cardName,
    side:        entry.order.isBuy ? "buy" : "sell",
    priceUsd:    entry.priceUsd,
    quantity:    entry.order.quantity.toString(),
    makerShort:  entry.order.maker.slice(0, 6) + "…" + entry.order.maker.slice(-4),
    createdAt:   entry.createdAt,
  }));

  return NextResponse.json({ orders: open, count: open.length });
}
