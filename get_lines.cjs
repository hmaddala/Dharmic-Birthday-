const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(1679, 1689).join('\n'));
