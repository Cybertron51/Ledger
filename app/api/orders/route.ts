/**
 * TASH — Order Book API
 *
 * POST /api/orders  — Submit a new order
 * GET  /api/orders  — List open orders
 *
 * Architecture:
 *   Orders are stored in an in-memory order book.
 *   When a buy and sell order match, we just remove them from the orderbook.
 *
 * Production swap: replace the in-memory store with a database (Redis / Postgres).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  type Order,
  type StoredOrder,
  usdToUsdc,
  defaultExpiry,
} from "@/lib/orders";

// ── In-memory order book ─────────────────────────────────────────────────────
// Replace with DB in production

const orderBook: StoredOrder[] = [];

// ── Matching logic ───────────────────────────────────────────────────────────

function findMatch(incoming: StoredOrder): StoredOrder | null {
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

    // Generate a mock wallet address for the user deterministically (for demo UI)
    const mockAddress = `0x${userId.padStart(40, "0").slice(-40)}`;

    // Build order struct
    const order: Order = {
      maker: mockAddress,
      tokenId: Number(tokenId),
      priceUsdc: usdToUsdc(priceUsd),
      isBuy: Boolean(isBuy),
      quantity: Number(quantity),
      nonce: Date.now(),   // unique per order
      expiry: defaultExpiry(),
    };

    const storedOrder: StoredOrder = {
      order,
      createdAt: Date.now(),
      userId,
      cardName: cardName ?? `Token #${tokenId}`,
      priceUsd,
    };

    // Check for a match
    const match = findMatch(storedOrder);

    if (match) {
      // Remove matched order from book
      const matchIdx = orderBook.indexOf(match);
      if (matchIdx !== -1) orderBook.splice(matchIdx, 1);

      return NextResponse.json({
        status: "settled",
        makerAddress: mockAddress,
        message: "Order matched successfully",
      });
    }

    // No match — add to order book
    orderBook.push(storedOrder);

    return NextResponse.json({
      status: "queued",
      makerAddress: mockAddress,
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
    cardName: entry.cardName,
    side: entry.order.isBuy ? "buy" : "sell",
    priceUsd: entry.priceUsd,
    quantity: entry.order.quantity.toString(),
    makerShort: entry.order.maker.slice(0, 6) + "…" + entry.order.maker.slice(-4),
    createdAt: entry.createdAt,
  }));

  return NextResponse.json({ orders: open, count: open.length });
}
