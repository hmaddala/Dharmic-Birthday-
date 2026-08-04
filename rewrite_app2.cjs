const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/\{currentStep === 4 && \([\s\S]*?<\/motion\.div>\n\s*\)}/g, '');

fs.writeFileSync('src/App.tsx', app);
console.log('Removed Step 4 blocks');
