const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /"paksha": "String \('Shukla \(Waxing\)' or 'Krishna \(Waning\)'\)",/,
  `"paksha": "String ('Shukla Paksha (Waxing)' or 'Krishna Paksha (Waning)')",`
);

fs.writeFileSync('src/App.tsx', content);
