const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldInst = `- IMPORTANT: Use the Google Search tool to look up the exact Panchang details (Tithi, Nakshatra) for the specific date and location to verify accuracy, rather than relying purely on internal approximations.
- When generating the traditional birthday for a future/past year, ALWAYS use the Google Search tool to find the exact Gregorian date where the specified Tithi and lunar month align in that specific year.`;

const newInst = `- IMPORTANT: Use the Google Search tool to look up the exact Panchang details (Tithi, Nakshatra) for the specific date and location to verify accuracy, rather than relying purely on internal approximations. Check authentic sources like Drik Panchang or AstroSage.
- Remember that Vedic dates (Tithi) change at specific times, often after sunrise. Always check the exact time of birth against the Tithi's active time period.
- When generating the traditional birthday for a future/past year, ALWAYS use the Google Search tool to find the exact Gregorian date where the specified Tithi and lunar month align in that specific year.`;

content = content.replace(oldInst, newInst);
fs.writeFileSync('server.ts', content);
