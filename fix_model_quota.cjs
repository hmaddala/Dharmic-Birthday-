const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldModel = `            model: attempt === 1 ? "gemini-2.5-flash" : attempt === 2 ? "gemini-3.1-flash-lite" : "gemini-2.0-flash-lite-001",`;
const newModel = `            model: attempt === 1 ? "gemini-3.5-flash" : attempt === 2 ? "gemini-3.1-flash-lite" : "gemini-flash-lite-latest",`;

const oldTools = `const configTools = attempt <= 2 ? [{ googleSearch: {} }] : undefined;`;
const newTools = `const configTools = attempt === 1 ? [{ googleSearch: {} }] : undefined;`;

content = content.replace(oldModel, newModel).replace(oldTools, newTools);
fs.writeFileSync('server.ts', content);
console.log("Model updated");
