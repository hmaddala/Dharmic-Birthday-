const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldInst = `5. If the user gives both a birth date and a Hindu calendar combination, check whether they align. If they do not align, explain the mismatch politely.`;
const newInst = `5. If the user gives both a birth date and a Hindu calendar combination, check whether they align. If they do not align, explain the mismatch politely.
- IMPORTANT: Use the Google Search tool to look up the exact Panchang details (Tithi, Nakshatra) for the specific date and location to verify accuracy, rather than relying purely on internal approximations.
- When generating the traditional birthday for a future/past year, ALWAYS use the Google Search tool to find the exact Gregorian date where the specified Tithi and lunar month align in that specific year.`;

content = content.replace(oldInst, newInst);
fs.writeFileSync('server.ts', content);
