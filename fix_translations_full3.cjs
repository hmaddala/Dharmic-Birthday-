const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The user is asking to translate the hero content and testimonials as well.
// We should check if they are already translated. Let's look at Italian (IT).
const itMatch = content.match(/IT:\s*\{[\s\S]*?heroProblemTitle:\s*"(.*?)"/);
console.log("IT hero problem title:", itMatch ? itMatch[1] : "NOT FOUND");
