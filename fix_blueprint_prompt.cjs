const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');

const oldPrompt = `      const prompt = \`Based on the following birth details, accurately calculate the Vedic astrological parameters:
Date: \${birthDate}
Time: \${birthTime}
Place: \${birthPlace}
Timezone: \${timezone}

Return ONLY a valid JSON object with exactly these keys: "nakshatra", "paksha", "tithi", "lunarMonth".
Do not include any markdown formatting like \\\`\\\`\\\`json. Just the raw JSON object.
Example: {"nakshatra": "Ashwini", "paksha": "Shukla", "tithi": "Prathama", "lunarMonth": "Chaitra"}\`;`;

const newPrompt = `      const prompt = \`You are an expert Vedic Astrologer. Based on the following birth details, accurately calculate the Vedic astrological parameters with maximum precision.
Date: \${birthDate}
Time: \${birthTime}
Place: \${birthPlace}
Timezone: \${timezone}

Calculate the Exact Moon position to find the precise Nakshatra, Paksha, Tithi, and Lunar Month (Amanta/Purnimanta as appropriate, standardizing on Amanta where possible for lunar month). 

Return ONLY a valid JSON object with exactly these keys: "nakshatra", "paksha", "tithi", "lunarMonth". 
Do not include any markdown formatting like \\\`\\\`\\\`json. Just the raw JSON object.
Example: {"nakshatra": "Ashwini", "paksha": "Shukla", "tithi": "Prathama", "lunarMonth": "Chaitra"}\`;`;

server = server.replace(oldPrompt, newPrompt);
// Update model to gemini-3.1-pro-preview for accurate calculations
server = server.replace('model: "gemini-3.1-flash-lite",\n        contents: [{ role: \'user\', parts: [{ text: prompt }] }],', 'model: "gemini-3.1-pro-preview",\n        contents: [{ role: \'user\', parts: [{ text: prompt }] }],');

fs.writeFileSync('server.ts', server);
console.log('server.ts blueprint prompt and model updated');
