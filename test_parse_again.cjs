const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// I will just parse the TRANSLATIONS object using Babel or acorn to be sure, or just run eslint.
