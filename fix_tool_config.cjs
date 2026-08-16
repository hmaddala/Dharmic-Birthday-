const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Need to include toolConfig: { includeServerSideToolInvocations: true } when using search with systemInstruction or just to ensure it works well
content = content.replace(
  /tools: \[\{ googleSearch: \{\} \}\],/,
  `tools: [{ googleSearch: {} }],\n          toolConfig: { includeServerSideToolInvocations: true },`
);

fs.writeFileSync('server.ts', content);
