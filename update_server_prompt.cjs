const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldInst = `- IMPORTANT: Use the Google Search tool to look up the exact Panchang details (Tithi, Nakshatra) for the specific date and location to verify accuracy, rather than relying purely on internal approximations. Check authentic sources like Drik Panchang or AstroSage.
- Remember that Vedic dates (Tithi) change at specific times, often after sunrise. Always check the exact time of birth against the Tithi's active time period.
- When generating the traditional birthday for a future/past year, ALWAYS use the Google Search tool to find the exact Gregorian date where the specified Tithi and lunar month align in that specific year.`;

const newInst = `- CRITICAL INSTRUCTION FOR ACCURACY: You are functioning as an expert Jyotish. ALWAYS use the Google Search tool to query Drik Panchang, AstroSage, or similar highly accurate authentic Vedic calculators for the EXACT birth date, time, and place. Do NOT rely on internal estimates.
- Tithis and Nakshatras change at highly specific times (often mid-day or night, independent of midnight). You MUST check if the birth time falls before or after the transition time for that day.
- A lunar day (Tithi) does not map 1:1 to a Gregorian day. If the birth time is before sunrise, it belongs to the previous Vedic day's calculation in some traditions.
- When generating the traditional birthday for a future/past year, ALWAYS use the Google Search tool to find the exact Gregorian date where the specified Tithi, Paksha, and lunar month align in that specific year.`;

if (content.includes('- IMPORTANT: Use the Google Search tool')) {
  content = content.replace(oldInst, newInst);
} else {
  // Just in case the exact string wasn't found
  content = content.replace(
    /5\. If the user gives both.*?specific year\./s,
    `5. If the user gives both a birth date and a Hindu calendar combination, check whether they align. If they do not align, explain the mismatch politely.
${newInst}`
  );
}

fs.writeFileSync('server.ts', content);
