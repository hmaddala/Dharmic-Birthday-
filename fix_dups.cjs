const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const langs = ["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"];
const objRegex = new RegExp(`const TRANSLATIONS[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`, 'm');

let match = content.match(objRegex);
if (match) {
    let block = match[1];
    
    // Quick fix: remove any lines matching "    calculating:" followed by english Calculating...
    // Except we have real duplicates in German, French, etc.
    // Let's just do a manual string replace to remove the second occurrence of `calculating: "Calculating...",` inside each object
    
    // Actually, maybe it's easier to find all duplicated keys in each language block
    let newBlock = block;
    for (const lang of langs) {
        // extract lang block
        const regex = new RegExp(`\\b${lang}:\\s*\\{([\\s\\S]*?)\\n  \\},?`, 'g');
        newBlock = newBlock.replace(regex, (m, inner) => {
            let lines = inner.split('\n');
            let seen = new Set();
            let newLines = [];
            for (let line of lines) {
                let kv = line.trim();
                if (kv) {
                    let key = kv.split(':')[0].trim();
                    if (seen.has(key)) {
                        continue; // skip duplicate
                    }
                    seen.add(key);
                }
                newLines.push(line);
            }
            return `${lang}: {\n${newLines.join('\n')}\n  },`;
        });
    }
    
    content = content.replace(block, newBlock);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Fixed duplicates");
} else {
    console.log("Could not find TRANSLATIONS");
}
