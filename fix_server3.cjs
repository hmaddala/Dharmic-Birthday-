const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldResponseBlock = `      if (!response.text) {
        throw new Error("No text returned by the model. It might have been blocked or failed to generate.");
      }`;

const newResponseBlock = `      if (!response.text) {
        const candidate = response.candidates && response.candidates[0];
        const finishReason = candidate ? candidate.finishReason : 'UNKNOWN';
        console.error("Model generation failed. Finish reason:", finishReason);
        console.error("Candidate:", JSON.stringify(candidate, null, 2));
        throw new Error(\`No text returned by the model. Finish reason: \${finishReason}\`);
      }`;

content = content.replace(oldResponseBlock, newResponseBlock);
fs.writeFileSync('server.ts', content);
