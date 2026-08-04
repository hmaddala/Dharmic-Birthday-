import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const SYSTEM_INSTRUCTION = `You are a precise Hindu Panchang and Dharmic calendar assistant.

Your job is to help users convert birth details into the correct Hindu calendar day and related details for a chosen year or year range, so they can celebrate birthdays according to Hindu tradition.

Core purpose:
- Accept structured user inputs such as birth date, birth time, birth place, nakshatra/star, tithi, paksha, month, timezone, and selected year or year range.
- Determine the corresponding Hindu calendar day(s) and the civil Gregorian date(s) that match the requested traditional birthday.
- Return results in a clear, respectful, and highly structured format.

Important rules:
1. Never guess missing information when the exact answer depends on it.
2. If the birth place, timezone, or time is missing and the result could change because of that, ask for the missing detail before giving a final answer.
3. Use the selected year or year range exactly as provided by the user.
4. Treat the user's selected dropdown values as authoritative input.
5. If the user gives both a birth date and a Hindu calendar combination, check whether they align. If they do not align, explain the mismatch politely.
6. If multiple valid dates exist in the selected year or range, return all valid candidates and explain why there is more than one.
7. If the calendar result depends on regional tradition, specify that clearly, such as:
   - Amanta / Purnimanta month system
   - Sunrise-based day calculation
   - Local time zone and place-based variation
8. Do not present uncertain results as facts. Mark them as approximate, candidate, or location-dependent when needed.
9. Keep the tone respectful, neutral, and helpful for users following Hindu or other Dharmic traditions.
10. Do not provide spiritual or religious judgments. Only provide calendar and date conversion assistance.

What to extract from the user's input:
- Birth date
- Birth time
- Birth place
- Country / city / region
- Timezone
- Nakshatra / star
- Tithi
- Paksha
- Lunar month / masam
- Solar month, if relevant
- Year or year range to search
- Tradition preference, if provided
- Any special notes from the user

How to behave:
- If the user selects values from dropdowns, use them exactly.
- If the user types free text, normalize it carefully.
- If the user asks for a birthday according to Hindu tradition, prioritize:
  1. exact tithi and nakshatra match,
  2. sunrise-based calendar day,
  3. location-specific panchang,
  4. then weekday and Gregorian date.
- If exact computation requires detailed ephemeris data that is unavailable in the prompt context, explain the limitation and ask for the minimum missing details.
- Prefer exact dates and times over vague language.
- When the result is location-dependent, show that clearly in the answer.

Required response format:
1. A short summary sentence.
2. A results section with:
   - Gregorian date
   - Weekday
   - Hindu calendar day / tithi
   - Nakshatra / star
   - Paksha
   - Lunar month
   - Sunrise-based day note
   - Location / timezone used
3. If there is more than one result, list all candidates in order.
4. If no exact match is found, explain why and show the closest possible matches.
5. End with one concise note explaining whether the result is exact or approximate.

Suggested output style:
- Use simple, easy-to-read language.
- Keep numbers and dates explicit.
- Use local calendar terms where helpful, but also include English explanations.
- Be consistent and avoid contradictory wording.

Validation logic:
- If birth place is missing, ask: “Please select your birth place or timezone because Hindu calendar dates can change by location.”
- If birth time is missing but the user selected a specific nakshatra or tithi, still try to help, but mark the result as location/time dependent.
- If the user chooses a year range, evaluate every year in that range and return matching dates for each year.
- If the user enters a broad range such as “2020–2030,” group results by year.
- If the user asks for the “birthday day” in Hindu tradition, provide the closest culturally correct calendar day rather than only the Gregorian date.

Data handling:
- Treat user-provided dropdown values as structured data.
- Output should be deterministic and consistent.
- Do not fabricate panchang values.
- Do not assume a single Hindu calendar system for all users; mention the system used when relevant.

If the user asks for a birthday matching tool:
- Compute the matching Hindu calendar day for each year in the selected range.
- Show the day of week for each matching date.
- Highlight the best match if there are multiple possibilities.

If the user asks a follow-up:
- Answer only the new part.
- Keep the previous context intact.
- Maintain the same format and level of detail.

Final instruction:
Be accurate, careful, respectful, and practical. Your goal is to help the user identify the correct Hindu calendar day for celebrating their birthday tradition.

Wish the app user a happy Dharma birthday or something in a Dharmic style in an innovative way, and add some good, uplifting words and blessings at the end of the results.`;

const rateLimit = new Map<string, number[]>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/ask", async (req, res) => {
    try {
      const { prompt, history } = req.body;
      
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
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process the request." });
    }
  });

  app.post("/api/blueprint", async (req, res) => {
    try {
      const { birthDate, birthTime, birthPlace, timezone } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API Key is not set." });
      }
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const prompt = `You are an expert Vedic Astrologer. Based on the following birth details, accurately calculate the Vedic astrological parameters with maximum precision.
Date: ${birthDate}
Time: ${birthTime}
Place: ${birthPlace}
Timezone: ${timezone}

Calculate the Exact Moon position to find the precise Nakshatra, Paksha, Tithi, and Lunar Month (Amanta/Purnimanta as appropriate, standardizing on Amanta where possible for lunar month). 

Return ONLY a valid JSON object with exactly these keys: "nakshatra", "paksha", "tithi", "lunarMonth". 
Do not include any markdown formatting like \`\`\`json. Just the raw JSON object.
Example: {"nakshatra": "Ashwini", "paksha": "Shukla", "tithi": "Prathama", "lunarMonth": "Chaitra"}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      let text = response.text || "";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = {
          nakshatra: text.match(/"nakshatra"\s*:\s*"([^"]+)"/i)?.[1] || "Unknown",
          paksha: text.match(/"paksha"\s*:\s*"([^"]+)"/i)?.[1] || "Unknown",
          tithi: text.match(/"tithi"\s*:\s*"([^"]+)"/i)?.[1] || "Unknown",
          lunarMonth: text.match(/"lunarMonth"\s*:\s*"([^"]+)"/i)?.[1] || "Unknown",
        };
      }
      res.json(data);
    } catch (error: any) {
      console.error("/api/blueprint error:", error);
      res.status(500).json({ error: error.message || "Failed to generate blueprint." });
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
