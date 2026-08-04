const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const labelsObj = `
const LANGUAGE_LABELS: Record<string, string> = {
  EN: "🇬🇧 English",
  DE: "🇩🇪 Deutsch",
  HI: "🇮🇳 हिंदी",
  TE: "🇮🇳 తెలుగు",
  PA: "🇮🇳 ਪੰਜਾਬੀ",
  AS: "🇮🇳 অসমীয়া",
  FR: "🇫🇷 Français",
  IT: "🇮🇹 Italiano",
  ES: "🇪🇸 Español",
  RU: "🇷🇺 русский",
  UK: "🇺🇦 Українська",
};
`;

code = code.replace("export default function App() {", labelsObj + "\nexport default function App() {");

code = code.replace(
  ">\\n                 {l}\\n               </button>",
  ">\\n                 {LANGUAGE_LABELS[l] || l}\\n               </button>"
);

fs.writeFileSync('src/App.tsx', code);
