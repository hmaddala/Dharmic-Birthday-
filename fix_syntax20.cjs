const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 1530; i < 1540; i++) {
    console.log(`${i+1}: ${lines[i]}`);
}
