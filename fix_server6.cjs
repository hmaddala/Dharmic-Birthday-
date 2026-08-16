const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = `import fs from 'fs';\n` + content;
fs.writeFileSync('server.ts', content);
