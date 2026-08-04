const fs = require('fs');

const lang = process.argv[2]; // e.g. "PA"
let app = fs.readFileSync('src/App.tsx', 'utf-8');
const translated = fs.readFileSync(`translated_${lang}.txt`, 'utf-8');

// Find the start of the current lang block
const startIndex = app.indexOf(`  ${lang}: {`);
if (startIndex === -1) {
  console.log(`Could not find ${lang}: { in App.tsx`);
  process.exit(1);
}

// We need to find the end of this lang block. Since it's followed by the next lang or the end of the TRANSLATIONS object.
// The next lang is AS (if lang == PA)
const langs = ["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"];
const nextLangIndex = langs.indexOf(lang) + 1;
let endIndex = -1;
if (nextLangIndex < langs.length) {
  const nextLang = langs[nextLangIndex];
  endIndex = app.indexOf(`  ${nextLang}: {`, startIndex);
} else {
  // UK is the last one, it ends with:
  //     guestTip: "Tip: password is hari2",
  //   },
  // }
  // We can just find "\n};"
  endIndex = app.indexOf(`\n};`, startIndex);
}

if (endIndex === -1) {
  console.log(`Could not find end of ${lang} block`);
  process.exit(1);
}

// The block to replace:
const toReplace = app.substring(startIndex, endIndex);
console.log(`Replacing block of length ${toReplace.length}`);

// We need to make sure translated ends with "  },\n"
let cleanTranslated = translated.trim();
if (!cleanTranslated.endsWith(',')) {
  if (cleanTranslated.endsWith('}')) {
    cleanTranslated += ',';
  } else {
    cleanTranslated += '  },';
  }
}
cleanTranslated += '\n';

app = app.substring(0, startIndex) + cleanTranslated + app.substring(endIndex);
fs.writeFileSync('src/App.tsx', app);
console.log(`Successfully replaced ${lang}`);
