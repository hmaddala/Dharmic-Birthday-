const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Revert Auto Calculate
content = content.replace(
  /letHariGptCalculate: "Auto Calculate \(AI\)",/g,
  'letHariGptCalculate: "Let HariGPT Calculate",'
);

content = content.replace(
  /\{t\.letHariGptCalculate \|\| "Auto Calculate \(AI\)"\}/g,
  '{t.letHariGptCalculate || "Let HariGPT Calculate"}'
);

// We need to add translations for the extra buttons to all languages where they are missing.
// The easiest way is to provide defaults if missing, or we can use regex to inject them, 
// but wait, React uses `t.underConstructionBtn || "Under Construction"`. 
// If they are missing in the translation object, they fallback to English. But the user said:
// "every thing from top to bottom. end to end, inside all buttons for example content inside the buttons likle these should be translated"

fs.writeFileSync('src/App.tsx', content);
