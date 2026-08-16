const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldError = `           throw lastError || new Error("Failed to generate text after multiple attempts.");`;
const newError = `           if (lastError && lastError.message && lastError.message.includes('429')) {
             throw new Error("The AI service is currently experiencing high demand and has reached its quota limit. Please try again in a minute.");
           }
           throw lastError || new Error("Failed to generate text after multiple attempts.");`;

content = content.replace(oldError, newError);
fs.writeFileSync('server.ts', content);
console.log("Error handling updated");
