import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const GEMINI_API_KEY = process.env.GEMINI_GENERATIVE_API_KEY;
const PSA_API_TOKEN = process.env.PSA_API_TOKEN;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

async function fetchPSAMetadata(certNumber: string) {
    if (!PSA_API_TOKEN) return null;
    try {
        console.log(`🔍 [PSA API] Fetching cert: ${certNumber}`);
        const res = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`, {
            headers: { Authorization: `Bearer ${PSA_API_TOKEN}` }
        });
        if (!res.ok) {
            console.log(`⚠️  [PSA API] Error: ${res.status}`);
            return null;
        }
        const data = await res.json();
        return data.PSACert;
    } catch (err: any) {
        console.log(`❌ [PSA API] Failed: ${err.message}`);
        return null;
    }
}

function buildPrompt() {
    return `Analyze this image of a trading card slab and return ONLY a single JSON object — no markdown, no code fences, no explanation.
Return exactly this structure:
{
  "certNumber": "12345678",
  "cardName": "Charizard-Holo",
  "setName": "Base Set",
  "year": 1999,
  "psaGrade": 10,
  "category": "pokemon"
}
Return ONLY the JSON.`;
}

async function runWaterfall(certNumber: string, imagePath: string) {
    console.log(`\n🌊 Starting Waterfall for Cert: ${certNumber}`);

    let finalCardData: any = null;

    // 1. Try PSA API
    const psaData = await fetchPSAMetadata(certNumber);
    if (psaData) {
        console.log("✅ [Step 1] PSA API Success");
        finalCardData = {
            name: psaData.Subject || psaData.Player || "Unknown",
            set: psaData.CardSet || psaData.Brand || "Unknown",
            year: psaData.Year,
            grade: psaData.CardGrade,
            source: "PSA API"
        };
    } else {
        console.log("⏭️  [Step 1] PSA API Failed/No Data");
    }

    // 2. Fallback to Gemini if needed
    if (!finalCardData || finalCardData.name === "Unknown") {
        if (!genAI) {
            console.log("❌ [Step 2] Gemini Fallback skipped: No API Key");
        } else {
            console.log("🤖 [Step 2] Attempting Gemini Fallback...");
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const fileBuffer = fs.readFileSync(imagePath);

            try {
                const result = await model.generateContent([
                    { inlineData: { mimeType: "image/jpeg", data: fileBuffer.toString("base64") } },
                    { text: buildPrompt() }
                ]);
                const text = result.response.text().replace(/```json|```/g, "").trim();
                const ai = JSON.parse(text);
                finalCardData = {
                    ...ai,
                    source: "Gemini AI"
                };
                console.log("✅ [Step 2] Gemini Fallback Success");
            } catch (err: any) {
                console.log(`❌ [Step 2] Gemini Fallback Failed: ${err.message}`);
            }
        }
    }

    console.log("\n--- Final Result ---");
    console.log(JSON.stringify(finalCardData, null, 2));
}

// Get first image from tashseedcards to test
const certsDir = path.join(__dirname, "scripts", "tashseedcards");
if (fs.existsSync(certsDir)) {
    const files = fs.readdirSync(certsDir).filter(f => f.endsWith(".jpg"));
    if (files.length > 0) {
        const testFile = files[0];
        const cert = testFile.split(".")[0];
        runWaterfall(cert, path.join(certsDir, testFile));
    } else {
        console.log("No images found in scripts/tashseedcards");
    }
} else {
    // try direct path
    const directDir = path.join(__dirname, "tashseedcards");
    const files = fs.readdirSync(directDir).filter(f => f.endsWith(".jpg"));
    if (files.length > 0) {
        const testFile = files[0];
        const cert = testFile.split(".")[0];
        runWaterfall(cert, path.join(directDir, testFile));
    }
}
