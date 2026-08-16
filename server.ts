import fs from 'fs';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const SYSTEM_INSTRUCTION = `You are a precise Hindu Panchang, Dharmic calendar, and expert Vedic Astrology (Jyotish) assistant.

Your job is to:
1. Help users convert birth details into the correct Hindu calendar day and related Panchang details for a chosen year or year range, so they can celebrate birthdays according to Dharmic tradition.
2. Generate comprehensive, authentic Vedic Horoscopes (Janam Kundali) when requested, analyzing Lagna (Ascendant), Moon Sign (Rashi), Nakshatra, House placements, Planetary positions, Dasha periods, Life predictions (Career, Health, Relationships), and auspicious Vedic remedies (Upayas).

Core purpose for Dharmic Birthday:
- Accept structured user inputs such as birth date, birth time, birth place, nakshatra/star, tithi, paksha, month, timezone, and selected year or year range.
- Determine the corresponding Hindu calendar day(s) and the civil Gregorian date(s) that match the requested traditional birthday.
- Return results in a clear, respectful, and highly structured format.

Core purpose for Vedic Horoscope (Janam Kundali):
- When requested to generate a horoscope, compute and analyze the astrological parameters derived from the birth date, birth time, and birth location.
- If any critical detail (like birth date, birth time, or birth place) is missing, politely request the missing detail.
- Present a detailed Vedic Horoscope containing:
  * Kundali Overview: Lagna (Ascendant), Moon Sign (Rashi), Sun Sign, Birth Nakshatra & Pada, Tithi, Paksha.
  * Planetary Positions & House Placements.
  * Key Yogas & Strengths (e.g., Raj Yoga, Gajakesari Yoga, Dhan Yoga, etc.).
  * Life Predictions across Career & Wealth, Health & Vitality, Relationships & Family.
  * Dasha Period Overview (Vimshottari Dasha highlights).
  * Vedic Remedies & Upayas (Recommended mantras, gemstone guidelines, or charitable deeds).

Important rules:
1. Never guess missing information when the exact answer depends on it.
2. If the birth place, timezone, or time is missing and the result could change because of that, ask for the missing detail before giving a final answer.
3. Use the selected year or year range exactly as provided by the user.
4. Treat the user's selected dropdown values as authoritative input.
5. If the user gives both a birth date and a Hindu calendar combination, check whether they align. If they do not align, explain the mismatch politely.
- CRITICAL INSTRUCTION FOR ACCURACY: You are functioning as an expert Jyotish. ALWAYS use the Google Search tool to query Drik Panchang, AstroSage, or similar highly accurate authentic Vedic calculators for the EXACT birth date, time, and place. Do NOT rely on internal estimates.
- Tithis and Nakshatras change at highly specific times (often mid-day or night, independent of midnight). You MUST check if the birth time falls before or after the transition time for that day.
- A lunar day (Tithi) does not map 1:1 to a Gregorian day. If the birth time is before sunrise, it belongs to the previous Vedic day's calculation in some traditions.
- When generating the traditional birthday for a future/past year, ALWAYS use the Google Search tool to find the exact Gregorian date where the specified Tithi, Paksha, and lunar month align in that specific year.
6. Keep the tone respectful, uplifting, neutral, and helpful for users following Hindu or other Dharmic traditions.
7. Wish the app user a happy Dharma birthday or auspicious blessings in a Dharmic style, and add good, uplifting words and blessings at the end of results.`;

const rateLimit = new Map<string, number[]>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/ask", async (req, res) => {
    try {
      const { prompt, history, structuredData } = req.body;
      let finalPrompt = prompt;
      const freeAstroApiKey = process.env.FREEASTRO_API_KEY;
      if (freeAstroApiKey && structuredData && structuredData.birthDate && structuredData.birthTime && structuredData.birthPlace) {
        try {
          const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(structuredData.birthPlace)}&format=json&limit=1`, {
            headers: {
              "User-Agent": "dharmic-birthday-app/1.0",
              "Accept-Language": "en-US,en;q=0.9"
            }
          });
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData && geocodeData.length > 0) {
              const lat = parseFloat(geocodeData[0].lat);
              const lng = parseFloat(geocodeData[0].lon);
              const [year, month, day] = structuredData.birthDate.split("-").map(Number);
              const [hour, minute] = structuredData.birthTime.split(":").map(Number);
              const astroPayload = { year, month, day, hour, minute, lat, lng, tz_str: "AUTO" };
              let astroResponse = await fetch("https://api.freeastroapi.com/v1/vedic/panchang", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": freeAstroApiKey },
                body: JSON.stringify(astroPayload)
              });
              if (astroResponse.status === 404) {
                  astroResponse = await fetch("https://api.freeastroapi.com/api/v2/vedic/panchang", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-api-key": freeAstroApiKey },
                    body: JSON.stringify(astroPayload)
                  });
              }
              if (astroResponse.ok) {
                 const astroData = await astroResponse.json();
                 finalPrompt = `[API DATA INJECTED: I have already fetched the EXACT astrological details from FreeAstroAPI. YOU MUST USE THIS DATA AS ABSOLUTE TRUTH. Do not calculate it yourself.\nPANCHANG DATA FOR BIRTH:\n- Tithi: ${astroData.tithi?.name || "Unknown"} (Paksha: ${astroData.paksha?.name || "Unknown"})\n- Nakshatra: ${astroData.nakshatra?.name || "Unknown"}\n- Lunar Month: ${astroData.lunar_month_amanta || astroData.lunar_month_purnimanta || "Unknown"}\n- Sunrise: ${astroData.sunrise || "Unknown"}\n- Sunset: ${astroData.sunset || "Unknown"}\n]\n\n` + prompt;
              } else {
                 console.error("FreeAstroAPI returned an error:", await astroResponse.text());
              }
            }
          }
        } catch (e) {
          console.error("Error integrating FreeAstroAPI:", e);
        }
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API Key is not set in the environment variables." });
      }

const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const userRates = rateLimit.get(ip as string) || [];
      const windowStart = now - 60000; // 1 minute window
      const recentRates = userRates.filter(time => time > windowStart);
      
      if (recentRates.length >= 10) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }
      
      recentRates.push(now);
      rateLimit.set(ip as string, recentRates);

      const contents = [];
      if (history && history.length > 0) {
        for (const msg of history) {
          contents.push({
             role: msg.role === 'user' ? 'user' : 'model',
             parts: [{ text: msg.text }]
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: finalPrompt }] });

      let finalResponse = null;
      let lastError = null;
      let text = "";
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Try with Google Search first, then fallback to without it
          const configTools = attempt === 1 ? [{ googleSearch: {} }] : undefined;
          
          const response = await ai.models.generateContent({
            model: attempt === 1 ? "gemini-2.5-flash" : attempt === 2 ? "gemini-2.0-flash" : "gemini-1.5-flash",
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              ...(configTools ? { tools: configTools } : {})
            },
          });
          
          if (response.text && response.text.trim().length > 0) {
            text = response.text;
            finalResponse = response;
            break;
          } else {
             const candidate = response.candidates && response.candidates[0];
             const finishReason = candidate ? candidate.finishReason : 'UNKNOWN';
             lastError = new Error(`No text returned by the model. Finish reason: ${finishReason}`);
          }
        } catch (e: any) {
          lastError = e;
        }
      }
      
      if (!text) {
        // If all attempts failed to get text but we have a response, maybe the model is refusing or returning empty on purpose.
        if (finalResponse && finalResponse.candidates && finalResponse.candidates.length > 0) {
           text = "I'm sorry, but I was unable to generate a response for that query. Please try rephrasing your request or provide more details.";
        } else {
           if (lastError && lastError.message && lastError.message.includes('429')) {
             throw new Error("The AI service is currently experiencing high demand and has reached its quota limit. Please try again in a minute.");
           }
           throw lastError || new Error("Failed to generate text after multiple attempts.");
        }
      }
      
      res.json({ text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process the request." });
    }
  });

  const searchCache = new Map<string, { data: any, timestamp: number }>();
  const reverseCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: "Query is required" });
      
      const queryStr = String(q).toLowerCase().trim();
      const cached = searchCache.get(queryStr);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q as string)}&format=json&limit=8&addressdetails=1`, {
        headers: {
          'User-Agent': 'dharmic-birthday-app/1.0 (mhkgupta@gmail.com)',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      if (!response.ok) {
         if (response.status === 429) {
             return res.json([]);
         }
         throw new Error(`Nominatim returned ${response.status}`);
      }
      
      let data = await response.json();
      
      // Deduplicate results based on identical display names (often caused by OSM node vs relation duplicates)
      const seenNames = new Set<string>();
      data = data.filter((item: any) => {
         if (!item.display_name) return true;
         // Normalize name slightly to catch very similar duplicates
         const normalized = item.display_name.toLowerCase().trim();
         if (seenNames.has(normalized)) return false;
         seenNames.add(normalized);
         return true;
      });

      searchCache.set(queryStr, { data, timestamp: Date.now() });
      res.json(data);
    } catch (err: any) {
      console.error("/api/search error:", err);
      res.status(500).json({ error: "Failed to search location" });
    }
  });

  app.get("/api/reverse", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) return res.status(400).json({ error: "lat and lon are required" });
      
      const cacheKey = `${lat},${lon}`;
      const cached = reverseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
        headers: {
          'User-Agent': 'dharmic-birthday-app/1.0 (mhkgupta@gmail.com)',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      if (!response.ok) {
         if (response.status === 429) {
             return res.json([]);
         }
         throw new Error(`Nominatim returned ${response.status}`);
      }
      
      const data = await response.json();
      reverseCache.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (err: any) {
      console.error("/api/reverse error:", err);
      res.status(500).json({ error: "Failed to reverse geocode" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
