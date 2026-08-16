const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldResponseBlock = `        const finishReason = candidate ? candidate.finishReason : 'UNKNOWN';
        console.error("Model generation failed. Finish reason:", finishReason);
        console.error("Candidate:", JSON.stringify(candidate, null, 2));
        throw new Error(\`No text returned by the model. Finish reason: \${finishReason}, BlockReason: \${candidate?.safetyRatings ? JSON.stringify(candidate.safetyRatings) : 'none'}\`);`;

const newResponseBlock = `        const finishReason = candidate ? candidate.finishReason : 'UNKNOWN';
        fs.writeFileSync('candidate-error.json', JSON.stringify(candidate, null, 2));
        throw new Error(\`No text returned by the model. Finish reason: \${finishReason}\`);`;

content = content.replace(oldResponseBlock, newResponseBlock);
fs.writeFileSync('server.ts', content);
