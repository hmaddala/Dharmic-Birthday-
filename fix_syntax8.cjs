const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /    calculating: "Calculating..."\s*\}\s*\},;/g;
if (content.match(regex)) {
    console.log("Found another bad block");
}

