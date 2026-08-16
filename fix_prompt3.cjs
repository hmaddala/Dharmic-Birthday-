const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldPromptBlock = `      const prompt = \`Determine the precise traditional Vedic astrology (Panchang) details for someone born on:
Birth Date: \${birthDate}
Birth Time: \${birthTime}
Birth Place: \${birthPlace}
Timezone: \$\{timezone\}

Use your Google Search tool to look up the exact Tithi (lunar day), Nakshatra (lunar mansion), and lunar month for this specific date, time, and location to ensure high accuracy. Do not guess or rely solely on internal calculation.
Once you have verified the correct details via search, provide your final answer as a JSON object enclosed in \\\`\\\`\\\`json and \\\`\\\`\\\`, exactly matching this format:
{
  "nakshatra": "String (name of Nakshatra)",
  "paksha": "String ('Shukla Paksha (Waxing)' or 'Krishna Paksha (Waning)')",
  "tithi": "String (MUST exactly match one of these: Pratipada, Dwitiya, Tritiya, Chaturthi, Panchami, Shashthi, Saptami, Ashtami, Navami, Dashami, Ekadashi, Dwadashi, Trayodashi, Chaturdashi, Purnima, Amavasya)",
  "lunarMonth": "String (MUST exactly match one of these: Chaitra, Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadrapada, Ashvin, Kartika, Margashirsha, Pausha, Magha, Phalguna, Adhik Maas)"
}\`;`;

const newPromptBlock = `      const prompt = \`Determine the precise traditional Vedic astrology (Panchang) details for someone born on:
Birth Date: \${birthDate}
Birth Time: \${birthTime}
Birth Place: \${birthPlace}
Timezone: \$\{timezone\}

Use your Google Search tool to look up the exact Panchang (Tithi, Nakshatra, and Lunar Month) for this specific date, time, and location to ensure high accuracy. You MUST consult reliable astrological sources via search (like Drik Panchang, AstroSage, etc.) and NOT guess.
IMPORTANT: Vedic dates change at sunrise, not midnight. The Tithi and Nakshatra are the ones active at the exact time of birth.
Once you have verified the correct details via search, provide your final answer as a JSON object enclosed in \\\`\\\`\\\`json and \\\`\\\`\\\`, exactly matching this format:
{
  "nakshatra": "String (MUST exactly match one of: Ashwini, Bharani, Krittika, Rohini, Mrigashira, Ardra, Punarvasu, Pushya, Ashlesha, Magha, Purva Phalguni, Uttara Phalguni, Hasta, Chitra, Swati, Vishakha, Anuradha, Jyeshtha, Mula, Purva Ashadha, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati)",
  "paksha": "String ('Shukla Paksha (Waxing)' or 'Krishna Paksha (Waning)')",
  "tithi": "String (MUST exactly match one of these: Pratipada, Dwitiya, Tritiya, Chaturthi, Panchami, Shashthi, Saptami, Ashtami, Navami, Dashami, Ekadashi, Dwadashi, Trayodashi, Chaturdashi, Purnima, Amavasya)",
  "lunarMonth": "String (MUST exactly match one of these: Chaitra, Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadrapada, Ashvin, Kartika, Margashirsha, Pausha, Magha, Phalguna, Adhik Maas)"
}\`;`;

content = content.replace(oldPromptBlock, newPromptBlock);
fs.writeFileSync('src/App.tsx', content);
