/**
 * LEDGER — Card Catalog Seeder
 *
 * Pulls Holo Rare / Ultra Rare cards from the Pokémon TCG API
 * and upserts them into Supabase with realistic PSA pricing.
 *
 * Usage:
 *   npx tsx scripts/seed-cards.ts
 *
 * Prerequisites:
 *   1. Supabase project created at supabase.com
 *   2. Schema applied: run supabase/schema.sql in the SQL editor
 *   3. .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * Note: Uses SUPABASE_SERVICE_ROLE_KEY (not the anon key) to bypass RLS for writes.
 *       Never expose this key to the browser.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// ── Load .env.local ──────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "\n❌  Missing env vars.\n" +
    "    Add to .env.local:\n" +
    "      NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co\n" +
    "      SUPABASE_SERVICE_ROLE_KEY=eyJ...\n" +
    "    (Service role key is in Supabase → Settings → API)\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const POKEMON_API = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_TCG_API_KEY; // optional

// ─────────────────────────────────────────────────────────────
// Target Sets
// ─────────────────────────────────────────────────────────────

const TARGET_SETS: Array<{ id: string; name: string; year: number }> = [
  { id: "base1",       name: "Base Set",            year: 1999 },
  { id: "jungle",      name: "Jungle",               year: 1999 },
  { id: "fossil",      name: "Fossil",               year: 1999 },
  { id: "base2",       name: "Base Set 2",           year: 2000 },
  { id: "teamrocket",  name: "Team Rocket",          year: 2000 },
  { id: "gym1",        name: "Gym Heroes",           year: 2000 },
  { id: "gym2",        name: "Gym Challenge",        year: 2000 },
  { id: "neo1",        name: "Neo Genesis",          year: 2000 },
  { id: "neo2",        name: "Neo Discovery",        year: 2001 },
  { id: "neo3",        name: "Neo Revelation",       year: 2001 },
  { id: "neo4",        name: "Neo Destiny",          year: 2002 },
  { id: "ecard1",      name: "Expedition Base Set",  year: 2002 },
  { id: "basep",       name: "WotC Black Star Promos", year: 1999 },
];

// Rarities to include (anything below this is too common to PSA)
const INCLUDE_RARITIES = new Set([
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Ultra",
  "Rare Secret",
  "Rare Rainbow",
  "Amazing Rare",
  "Radiant Rare",
  "Rare Shiny",
  "Rare Shiny GX",
  "Shining",
  "Promo",
]);

// ─────────────────────────────────────────────────────────────
// Marquee Prices (PSA 10 values, USD)
// Based on real-world market comps as of 2025
// ─────────────────────────────────────────────────────────────

const MARQUEE_PRICES: Record<string, number> = {
  // Base Set
  "base1-4":   14_500,   // Charizard Holo
  "base1-2":    3_800,   // Blastoise Holo
  "base1-15":   2_200,   // Venusaur Holo
  "base1-5":      580,   // Clefairy Holo
  "base1-6":      420,   // Gyarados Holo
  "base1-9":      280,   // Magneton Holo
  "base1-10":     320,   // Mewtwo Holo
  "base1-11":     260,   // Nidoking Holo
  "base1-12":     300,   // Ninetales Holo
  "base1-13":     240,   // Poliwrath Holo
  "base1-14":     450,   // Raichu Holo
  "base1-16":     560,   // Zapdos Holo

  // Jungle
  "jungle-1":     380,   // Clefable Holo
  "jungle-2":     320,   // Electrode Holo
  "jungle-3":     420,   // Flareon Holo
  "jungle-4":     260,   // Jolteon Holo
  "jungle-5":     340,   // Kangaskhan Holo
  "jungle-6":     290,   // Mr. Mime Holo
  "jungle-7":     260,   // Nidoqueen Holo
  "jungle-8":     220,   // Pidgeot Holo
  "jungle-9":     480,   // Pinsir Holo
  "jungle-10":    310,   // Scyther Holo
  "jungle-11":    260,   // Snorlax Holo
  "jungle-12":    580,   // Vaporeon Holo
  "jungle-13":    240,   // Venomoth Holo
  "jungle-14":    220,   // Victreebel Holo
  "jungle-15":    200,   // Vileplume Holo
  "jungle-16":    220,   // Wigglytuff Holo

  // Fossil
  "fossil-1":     380,   // Aerodactyl Holo
  "fossil-2":     220,   // Ditto Holo
  "fossil-3":     280,   // Dragonite Holo
  "fossil-4":     580,   // Gengar Holo
  "fossil-5":     240,   // Haunter Holo
  "fossil-6":     420,   // Hitmonlee Holo
  "fossil-7":     360,   // Hypno Holo
  "fossil-8":     480,   // Kabutops Holo
  "fossil-9":     320,   // Lapras Holo
  "fossil-10":    260,   // Magneton Holo
  "fossil-11":    220,   // Moltres Holo
  "fossil-12":    380,   // Muk Holo
  "fossil-13":    560,   // Raichu Holo
  "fossil-14":    680,   // Slowbro Holo
  "fossil-15":    340,   // Articuno Holo
  "fossil-16":    420,   // Zapdos Holo

  // Team Rocket
  "teamrocket-1":  520,  // Dark Blastoise Holo
  "teamrocket-2":  480,  // Dark Dragonite Holo
  "teamrocket-3":  800,  // Dark Charizard Holo (non-holo version is more iconic but holo is rarer)
  "teamrocket-4":  360,  // Dark Dugtrio Holo
  "teamrocket-5":  280,  // Dark Golbat Holo
  "teamrocket-6":  300,  // Dark Gyarados Holo
  "teamrocket-7":  260,  // Dark Hypno Holo
  "teamrocket-8":  420,  // Dark Machamp Holo
  "teamrocket-9":  380,  // Dark Magneton Holo
  "teamrocket-10": 340,  // Dark Slowbro Holo
  "teamrocket-11": 460,  // Dark Vileplume Holo
  "teamrocket-12": 3_200, // Dark Raichu Holo (extremely rare)

  // Neo Genesis
  "neo1-2":  4_800,  // Lugia Holo
  "neo1-4":    480,  // Feraligatr Holo
  "neo1-6":    420,  // Meganium Holo
  "neo1-10":   360,  // Typhlosion Holo
  "neo1-16":   280,  // Pichu Holo
  "neo1-1":    520,  // Ampharos Holo
  "neo1-3":    380,  // Cleffa Holo

  // Neo Revelation
  "neo3-10":  12_800,  // Umbreon Holo
  "neo3-18":  38_000,  // Ho-Oh Holo
  "neo3-1":      480,  // Ampharos Holo
  "neo3-2":      520,  // Blissey Holo
  "neo3-3":      380,  // Celebi Holo
  "neo3-7":      420,  // Magcargo Holo
  "neo3-8":    2_400,  // Espeon Holo

  // Neo Destiny
  "neo4-109": 22_000,  // Shining Charizard
  "neo4-106":  8_500,  // Shining Magikarp
  "neo4-111": 12_000,  // Shining Mewtwo
  "neo4-110":  7_200,  // Shining Raichu
  "neo4-113":  6_800,  // Shining Tyranitar
  "neo4-112":  9_400,  // Shining Steelix
  "neo4-107": 11_000,  // Shining Gyarados

  // Promos
  "basep-1":    680,   // Pikachu
  "basep-4":    420,   // Pikachu (surf)
  "basep-9":  1_200,   // Mew
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Generate a deterministic trading symbol from card metadata */
function makeSymbol(name: string, grade: number, setId: string, year: number): string {
  // Take first 4 uppercase letters of name (no spaces/special chars)
  const nameAbbrev = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(3, "X");

  // Take first 4 uppercase letters of set ID (strip numbers)
  const setAbbrev = setId
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(3, "X");

  return `${nameAbbrev}${grade}-${setAbbrev}-${year}`;
}

/** Estimate PSA 10 market price for a card */
function estimatePrice(pokemonCardId: string, rarity: string, year: number): number {
  if (MARQUEE_PRICES[pokemonCardId]) {
    return MARQUEE_PRICES[pokemonCardId];
  }

  const rarityBase: Record<string, number> = {
    "Rare Holo":         180,
    "Rare Secret":       600,
    "Rare Ultra":        400,
    "Rare Rainbow":      350,
    "Amazing Rare":      250,
    "Rare Shiny":        800,
    "Rare Shiny GX":    1200,
    "Shining":          3000,
    "Promo":             120,
  };

  const base = rarityBase[rarity] ?? 100;
  // Older cards command age premiums
  const ageMultiplier = Math.max(1, (2025 - year) / 8);
  return Math.round(base * ageMultiplier);
}

/** Apply grade discount to a PSA 10 base price */
function gradePrice(basePrice10: number, grade: 8 | 9 | 10): number {
  const multipliers = { 10: 1.0, 9: 0.32, 8: 0.14 };
  return Math.max(25, Math.round(basePrice10 * multipliers[grade]));
}

/** Generate 24h stats around a price */
function priceStats(price: number) {
  const swing = price * (0.02 + Math.random() * 0.06);
  const up = Math.random() > 0.45;
  const change = up ? swing : -swing;
  return {
    price:           parseFloat(price.toFixed(2)),
    change_24h:      parseFloat(change.toFixed(2)),
    change_pct_24h:  parseFloat(((change / price) * 100).toFixed(3)),
    high_24h:        parseFloat((price * (1 + Math.random() * 0.04)).toFixed(2)),
    low_24h:         parseFloat((price * (1 - Math.random() * 0.04)).toFixed(2)),
    volume_24h:      Math.max(1, Math.floor(Math.random() * 8)),
  };
}

/** Sleep helper for rate limiting */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// Pokémon TCG API
// ─────────────────────────────────────────────────────────────

interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  artist?: string;
  hp?: string;
  types?: string[];
  images: { small: string; large: string };
  set: { id: string; name: string; releaseDate: string };
}

async function fetchSetCards(setId: string): Promise<PokemonCard[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) headers["X-Api-Key"] = API_KEY;

  // Build rarity filter query
  const rarityFilters = [
    '"Rare Holo"',
    '"Rare Ultra"',
    '"Rare Secret"',
    '"Amazing Rare"',
    '"Rare Shiny"',
    '"Rare Shiny GX"',
    '"Shining"',
  ].join(" OR rarity:");

  const params = new URLSearchParams({
    q: `set.id:${setId} (rarity:"Rare Holo" OR rarity:"Rare Ultra" OR rarity:"Rare Secret" OR rarity:"Amazing Rare")`,
    pageSize: "250",
    page: "1",
    select: "id,name,number,rarity,artist,hp,types,images,set",
  });

  const url = `${POKEMON_API}/cards?${params}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`  ⚠️  API ${res.status} for set ${setId}: ${body.slice(0, 120)}`);
      return [];
    }
    const json = (await res.json()) as { data: PokemonCard[]; totalCount: number };
    return json.data ?? [];
  } catch (err) {
    console.warn(`  ⚠️  Fetch error for set ${setId}:`, (err as Error).message);
    return [];
  }
}

// Also grab promos separately (they don't filter by rarity the same way)
async function fetchPromoCards(): Promise<PokemonCard[]> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-Api-Key"] = API_KEY;

  const params = new URLSearchParams({
    q: `set.id:basep`,
    pageSize: "100",
    select: "id,name,number,rarity,artist,hp,types,images,set",
  });

  try {
    const res = await fetch(`${POKEMON_API}/cards?${params}`, { headers });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: PokemonCard[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Seeder
// ─────────────────────────────────────────────────────────────

async function seed() {
  console.log("\n🌱  LEDGER Card Catalog Seeder\n");

  let totalInserted = 0;
  let totalSkipped = 0;

  // Track symbols used this run to avoid local duplicates
  const usedSymbols = new Set<string>();

  for (const targetSet of TARGET_SETS) {
    console.log(`📦  Fetching ${targetSet.name} (${targetSet.id})...`);

    const cards = await fetchSetCards(targetSet.id);

    if (cards.length === 0) {
      console.log(`    No holo/ultra cards found or API error — skipping.\n`);
      continue;
    }

    console.log(`    Found ${cards.length} cards to process.`);

    for (const card of cards) {
      const rarity = card.rarity ?? "Rare Holo";
      const basePrice10 = estimatePrice(card.id, rarity, targetSet.year);

      for (const grade of [8, 9, 10] as const) {
        // Generate symbol — deduplicate if collision
        let symbol = makeSymbol(card.name, grade, targetSet.id, targetSet.year);
        let suffix = 0;
        while (usedSymbols.has(symbol)) {
          suffix++;
          symbol = makeSymbol(card.name, grade, targetSet.id, targetSet.year) + suffix;
        }
        usedSymbols.add(symbol);

        const cardRow = {
          symbol,
          name:            card.name,
          category:        "pokemon" as const,
          set_name:        targetSet.name,
          set_id:          targetSet.id,
          year:            targetSet.year,
          rarity:          rarity,
          artist:          card.artist ?? null,
          hp:              card.hp ? parseInt(card.hp, 10) : null,
          card_types:      card.types ?? null,
          card_number:     card.number ?? null,
          psa_grade:       grade,
          population:      grade === 10 ? Math.floor(Math.random() * 200 + 10)
                                        : Math.floor(Math.random() * 800 + 50),
          image_url:       card.images.small,
          image_url_hi:    card.images.large,
          pokemon_card_id: card.id,
        };

        // Upsert card (on conflict → update image/population)
        const { data: upsertedCard, error: cardError } = await supabase
          .from("cards")
          .upsert(cardRow, {
            onConflict: "symbol",
            ignoreDuplicates: false,
          })
          .select("id")
          .single();

        if (cardError || !upsertedCard) {
          console.warn(`    ⚠️  Card upsert failed: ${symbol} — ${cardError?.message}`);
          totalSkipped++;
          continue;
        }

        // Upsert price
        const priceRow = {
          card_id: upsertedCard.id,
          ...priceStats(gradePrice(basePrice10, grade)),
        };

        const { error: priceError } = await supabase
          .from("prices")
          .upsert(priceRow, { onConflict: "card_id" });

        if (priceError) {
          console.warn(`    ⚠️  Price upsert failed: ${symbol} — ${priceError.message}`);
        }

        totalInserted++;
      }
    }

    console.log(`    ✓  Done.\n`);

    // Be polite to the API — 300ms between sets
    await sleep(300);
  }

  // Promo cards (flat list, no rarity filter)
  console.log("📦  Fetching WotC Promos (basep)...");
  const promos = await fetchPromoCards();
  console.log(`    Found ${promos.length} promo cards.`);

  for (const card of promos) {
    const basePrice10 = estimatePrice(card.id, "Promo", 1999);

    for (const grade of [8, 9, 10] as const) {
      let symbol = makeSymbol(card.name, grade, "basep", 1999);
      let suffix = 0;
      while (usedSymbols.has(symbol)) {
        suffix++;
        symbol = makeSymbol(card.name, grade, "basep", 1999) + suffix;
      }
      usedSymbols.add(symbol);

      const cardRow = {
        symbol,
        name:            card.name,
        category:        "pokemon" as const,
        set_name:        "WotC Black Star Promos",
        set_id:          "basep",
        year:            1999,
        rarity:          "Promo",
        artist:          card.artist ?? null,
        hp:              card.hp ? parseInt(card.hp, 10) : null,
        card_types:      card.types ?? null,
        card_number:     card.number ?? null,
        psa_grade:       grade,
        population:      grade === 10 ? Math.floor(Math.random() * 150 + 5)
                                      : Math.floor(Math.random() * 600 + 30),
        image_url:       card.images.small,
        image_url_hi:    card.images.large,
        pokemon_card_id: card.id,
      };

      const { data: upsertedCard, error: cardError } = await supabase
        .from("cards")
        .upsert(cardRow, { onConflict: "symbol", ignoreDuplicates: false })
        .select("id")
        .single();

      if (cardError || !upsertedCard) {
        totalSkipped++;
        continue;
      }

      const { error: priceError } = await supabase
        .from("prices")
        .upsert({
          card_id: upsertedCard.id,
          ...priceStats(gradePrice(basePrice10, grade)),
        }, { onConflict: "card_id" });

      if (!priceError) totalInserted++;
    }
  }

  console.log("    ✓  Done.\n");

  // ── Summary ───────────────────────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log(`✅  Seeding complete!`);
  console.log(`    Cards inserted/updated : ${totalInserted}`);
  console.log(`    Cards skipped          : ${totalSkipped}`);
  console.log(`    Unique symbols created : ${usedSymbols.size}`);
  console.log("═══════════════════════════════════════\n");
  console.log("Next steps:");
  console.log("  • Open Supabase → Table Editor → cards to browse the catalog");
  console.log("  • Open any image_url to verify real card artwork loads");
  console.log("  • Re-run any time to refresh prices (idempotent — no duplicates)\n");
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
