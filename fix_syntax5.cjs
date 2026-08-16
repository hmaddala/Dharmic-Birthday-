const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const match = content.match(/UK: \{([\s\S]*?)\n};\n/);
if (match) {
    console.log(match[1].slice(0, 200));
}

