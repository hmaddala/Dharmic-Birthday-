const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the specific prompt language condition with a generic one using a map
const langMapObj = `
const LANG_PROMPT_MAP: Record<string, string> = {
  EN: "English",
  DE: "German",
  HI: "Hindi",
  TE: "Telugu",
  PA: "Punjabi",
  AS: "Assamese",
  FR: "French",
  IT: "Italian",
  ES: "Spanish",
  RU: "Russian",
  UK: "Ukrainian",
};
`;

app = app.replace("const LANGUAGE_LABELS", langMapObj + "\nconst LANGUAGE_LABELS");

app = app.replace(
  /\$\{uiLang === 'DE'.*?'English'\}/g,
  "${LANG_PROMPT_MAP[uiLang] || 'English'}"
);

fs.writeFileSync('src/App.tsx', app);
