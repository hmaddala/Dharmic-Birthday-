const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const langs = ["PA", "AS", "FR", "IT", "ES", "RU", "UK"];

// Extract EN translations
const enStart = code.indexOf("  EN: {");
const enEnd = code.indexOf("  DE: {", enStart);
let enObjectText = code.substring(enStart + 8, enEnd - 4).trim();

let newTranslations = "";

for (const lang of langs) {
  let langText = `  ${lang}: {\n` + enObjectText + `\n  },\n`;
  newTranslations += langText;
}

// 1. Update useState
code = code.replace(
  /useState<"EN" \| "DE" \| "HI" \| "TE">/g,
  'useState<"EN" | "DE" | "HI" | "TE" | "PA" | "AS" | "FR" | "IT" | "ES" | "RU" | "UK">'
);

// 2. Update language array
code = code.replace(
  /\(\["EN", "DE", "HI", "TE"\] as const\)/g,
  '(["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"] as const)'
);

// 3. Inject new translations
const trMatch = code.match(/TRANSLATIONS: Record<string, Record<string, any>> = \{([\s\S]*?)^\};/m);
if (trMatch) {
  const endIdx = trMatch.index + trMatch[0].length - 2; // before `};`
  code = code.substring(0, endIdx) + newTranslations + code.substring(endIdx);
} else {
  // Let's just do replace
  code = code.replace(/  TE: \{[\s\S]*?  \},\n};/m, match => {
     return match.replace(/  \},\n\};/, `  },\n${newTranslations}};`);
  });
}

fs.writeFileSync('src/App.tsx', code);
console.log("Injected translations");
