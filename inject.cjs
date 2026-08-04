const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Update useState
code = code.replace(
  /useState<"EN" \| "DE" \| "HI" \| "TE">/g,
  'useState<"EN" | "DE" | "HI" | "TE" | "FR" | "IT" | "ES" | "RU" | "UK" | "PA" | "AS">'
);

// 2. Update language array
code = code.replace(
  /\\(\\["EN", "DE", "HI", "TE"\\] as const\\)/g,
  '(["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"] as const)'
);

// 3. Inject new translations
const langs = ["FR", "IT", "ES", "RU", "UK", "PA", "AS"];
let newTranslations = "";

for (const lang of langs) {
  try {
    const text = fs.readFileSync(`translated_${lang}.txt`, 'utf-8');
    newTranslations += text + "\n";
  } catch (e) {
    console.error("Missing translation for " + lang);
  }
}

// insert before `};` of TRANSLATIONS
// The TRANSLATIONS object ends with something like `  },\n};\n` or `    guestTip: "Tip: password is hari2",\n  },\n};`
// Find TRANSLATIONS end
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
