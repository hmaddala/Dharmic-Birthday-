const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const languages = ["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"];
for(const l of languages) {
  const match = content.match(new RegExp(l + ':\\s*\\{[\\s\\S]*?testiText0:\\s*"(.*?)"'));
  console.log(l, match ? match[1].substring(0, 30) : "MISSING");
}
