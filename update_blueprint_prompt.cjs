const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const tithisStr = '["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima", "Amavasya"]';
const monthsStr = '["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashvin", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna", "Adhik Maas"]';

const oldPromptStr = /const prompt = \`Calculate the traditional Vedic astrology details for someone born on:\\nBirth Date: \$\{birthDate\}\\nBirth Time: \$\{birthTime\}\\nBirth Place: \$\{birthPlace\}\\nTimezone: \$\{timezone\}\\n\\nReturn ONLY a JSON object exactly matching this format, with no markdown formatting or other text:\\n\{\\n  "nakshatra": "String \(name of Nakshatra\)",\\n  "paksha": "String \('Shukla Paksha \(Waxing\)' or 'Krishna Paksha \(Waning\)'\)",\\n  "tithi": "String \(name of Tithi\)",\\n  "lunarMonth": "String \(name of Lunar Month\)"\\n\}\`;/;

const newPromptStr = "const prompt = `Calculate the traditional Vedic astrology details for someone born on:\\nBirth Date: ${birthDate}\\nBirth Time: ${birthTime}\\nBirth Place: ${birthPlace}\\nTimezone: ${timezone}\\n\\nReturn ONLY a JSON object exactly matching this format, with no markdown formatting or other text:\\n{\\n  \"nakshatra\": \"String (name of Nakshatra)\",\\n  \"paksha\": \"String ('Shukla (Waxing)' or 'Krishna (Waning)')\",\\n  \"tithi\": \"String (must be exactly one of: Pratipada, Dwitiya, Tritiya, Chaturthi, Panchami, Shashthi, Saptami, Ashtami, Navami, Dashami, Ekadashi, Dwadashi, Trayodashi, Chaturdashi, Purnima, Amavasya)\",\\n  \"lunarMonth\": \"String (must be exactly one of: Chaitra, Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadrapada, Ashvin, Kartika, Margashirsha, Pausha, Magha, Phalguna, Adhik Maas)\"\\n}`;";

content = content.replace(oldPromptStr, newPromptStr);
fs.writeFileSync('src/App.tsx', content);
