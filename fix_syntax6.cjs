const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/    calculating: "Calculating..."\s*\},,\s*UK: \{/g, `    calculating: "Calculating..."\n  },\n  UK: {`);

fs.writeFileSync('src/App.tsx', content);

