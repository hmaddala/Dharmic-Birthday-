const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/    calculating: "Calculating..."\s*\}\s*\},\s*;/g, `    calculating: "Calculating..."\n  }\n};`);

fs.writeFileSync('src/App.tsx', content);
