const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldPromptBlock = `"paksha": "String ('Shukla (Waxing)' or 'Krishna (Waning)')",`;
const newPromptBlock = `"paksha": "String ('Shukla Paksha (Waxing)' or 'Krishna Paksha (Waning)')",`;

content = content.replace(oldPromptBlock, newPromptBlock);
fs.writeFileSync('src/App.tsx', content);
