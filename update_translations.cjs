const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace tradData for EN
content = content.replace(
  /tradData: "Traditional Data",/,
  'tradData: "Traditional Data (cosmic blueprint)",\n    tradDataHint: "Helpful Hint: If you know these 4 details below (Nakshatra, Paksha, Tithi, and Lunar Month), you can select them. Otherwise, leave them as \'Let HariGPT Calculate\' (the default option), and our high-performance AI models will accurately calculate these details for you using your Birth Date, Time, and Place!",\n    letHariGptCalculate: "Let HariGPT Calculate",'
);

// We should also replace the `<option value="">{t.select}</option>` with `<option value="">{t.letHariGptCalculate || t.select || "Let HariGPT Calculate"}</option>`
content = content.replace(/<option value="">\{t\.select\}<\/option>/g, '<option value="">{t.letHariGptCalculate || "Let HariGPT Calculate"}</option>');

fs.writeFileSync('src/App.tsx', content);
