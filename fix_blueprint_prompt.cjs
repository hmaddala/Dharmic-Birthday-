const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldPromptBlock = `      const prompt = \`Calculate the traditional Vedic astrology details for someone born on:
Birth Date: \${birthDate}
Birth Time: \${birthTime}
Birth Place: \${birthPlace}
Timezone: \$\{timezone\}

Return ONLY a JSON object exactly matching this format, with no markdown formatting or other text:
{
  "nakshatra": "String (name of Nakshatra)",
  "paksha": "String ('Shukla Paksha (Waxing)' or 'Krishna Paksha (Waning)')",
  "tithi": "String (MUST exactly match one of these: Pratipada, Dwitiya, Tritiya, Chaturthi, Panchami, Shashthi, Saptami, Ashtami, Navami, Dashami, Ekadashi, Dwadashi, Trayodashi, Chaturdashi, Purnima, Amavasya)",
  "lunarMonth": "String (MUST exactly match one of these: Chaitra, Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadrapada, Ashvin, Kartika, Margashirsha, Pausha, Magha, Phalguna, Adhik Maas)"
}\`;`;

const newPromptBlock = `      const prompt = \`Calculate the precise traditional Vedic astrology details for someone born on:
Birth Date: \${birthDate}
Birth Time: \${birthTime}
Birth Place: \${birthPlace}
Timezone: \$\{timezone\}

Think step-by-step. Use your internal knowledge of astronomical ephemeris to calculate the exact position of the Moon and Sun at the given time to determine the correct Tithi (lunar day) and Nakshatra (lunar mansion).
Once you have determined the details, provide your final answer as a JSON object enclosed in \\\`\\\`\\\`json and \\\`\\\`\\\`, exactly matching this format:
{
  "nakshatra": "String (name of Nakshatra)",
  "paksha": "String ('Shukla (Waxing)' or 'Krishna (Waning)')",
  "tithi": "String (MUST exactly match one of these: Pratipada, Dwitiya, Tritiya, Chaturthi, Panchami, Shashthi, Saptami, Ashtami, Navami, Dashami, Ekadashi, Dwadashi, Trayodashi, Chaturdashi, Purnima, Amavasya)",
  "lunarMonth": "String (MUST exactly match one of these: Chaitra, Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadrapada, Ashvin, Kartika, Margashirsha, Pausha, Magha, Phalguna, Adhik Maas)"
}\`;`;

content = content.replace(oldPromptBlock, newPromptBlock);
fs.writeFileSync('src/App.tsx', content);
