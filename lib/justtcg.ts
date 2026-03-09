/**
 * JustTCG API client for real-time pricing data.
 */

export interface JustTCGPrice {
    low: number | null;
    mid: number | null;
    high: number | null;
}

/**
 * Fetch a price estimate for a card from JustTCG.
 * 
 * @param name Card name (e.g., "Charizard-Holo")
 * @param setName Set name (e.g., "Base Set")
 * @param category Card category (e.g., "pokemon")
 * @param cardNumber Optional card number (e.g., "4/102")
 * @returns {JustTCGPrice | null} Pricing data or null if not found/error.
 */
export async function fetchJustTCGPrice(
    name: string,
    setName: string,
    category: string,
    cardNumber?: string | null
): Promise<JustTCGPrice | null> {
    const apiKey = process.env.JUSTTCG_API_KEY;

    if (!apiKey) {
        console.warn("[JustTCG] No API key configured. Skipping price fetch.");
        return null;
    }

    // Removal of category restriction based on user request.
    // JustTCG will be queried for all card types.

    try {
        // 1. Search for the card ID
        // Combine name + set into the query for better matching, as strict 'set' parameter often requires IDs.
        const query = `${name} ${setName}`.trim();
        const searchParams = new URLSearchParams({
            q: query
        });

        // Some card numbers from PSA are like "4/102". JustTCG might expect just "4".
        if (cardNumber) {
            const cleanNumber = cardNumber.split("/")[0].trim();
            searchParams.set("number", cleanNumber);
        }

        const searchUrl = `https://api.justtcg.com/v1/cards?${searchParams.toString()}`;
        console.log(`[JustTCG] Querying: ${searchUrl}`);

        const res = await fetch(searchUrl, {
            headers: {
                "x-api-key": apiKey,
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[JustTCG] Search failed (${res.status}): ${errText}`);
            return null;
        }

        const searchData = await res.json();
        const cards = searchData.data || [];

        console.log(`[JustTCG] Found ${cards.length} potential matches for "${query}"`);

        if (cards.length === 0) {
            // Fallback: if name + set failed, try just the name
            if (setName) {
                console.log(`[JustTCG] No matches with set context, trying name only: ${name}`);
                return fetchJustTCGPrice(name, "", category, cardNumber);
            }
            return null;
        }

        // Pick the best match
        const bestMatch = cards[0];
        console.log(`[JustTCG] Best match: ${bestMatch.name} (${bestMatch.set?.name || "No Set"}) - ID: ${bestMatch.id}`);

        // 2. Fetch prices for this card
        const priceUrl = `https://api.justtcg.com/v1/cards/${bestMatch.id}/prices`;
        console.log(`[JustTCG] Fetching prices: ${priceUrl}`);

        const priceRes = await fetch(priceUrl, {
            headers: {
                "x-api-key": apiKey,
                "Accept": "application/json"
            }
        });

        if (!priceRes.ok) {
            console.error(`[JustTCG] Price fetch failed: ${priceRes.status}`);
            return null;
        }

        const priceData = await priceRes.json();
        const prices = priceData.data || {};

        console.log(`[JustTCG] Raw price data:`, JSON.stringify(prices));

        // We look for a 'market' or 'mid' price.
        const mid = prices.market || prices.mid || prices.price || null;

        return {
            low: prices.low || null,
            mid: mid ? Number(mid) : null,
            high: prices.high || null
        };

    } catch (error) {
        console.error("[JustTCG] Exception:", error);
        return null;
    }
}
