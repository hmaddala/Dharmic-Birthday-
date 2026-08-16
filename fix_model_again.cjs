const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldModel = `            model: attempt === 1 ? "gemini-2.5-flash" : attempt === 2 ? "gemini-2.0-flash" : "gemini-1.5-flash",`;
const newModel = `            model: attempt === 1 ? "gemini-2.5-flash" : attempt === 2 ? "gemini-2.5-pro" : "gemini-2.0-flash",`;

content = content.replace(oldModel, newModel);
fs.writeFileSync('server.ts', content);
console.log("Model updated");
