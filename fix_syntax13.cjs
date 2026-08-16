const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const ruStart = lines.findIndex(l => l.includes('RU: {'));
console.log("RU starts at line", ruStart + 1);

for (let i = ruStart; i < ruStart + 15; i++) {
    console.log(`${i+1}: ${lines[i]}`);
}

