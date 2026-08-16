const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /fillMandatory:\s*"[^"]*",\s*calculating:\s*"[^"]*"\s*\}/g;

content = content.replace(regex, (match) => {
    return match.replace(/\}?$/, '') + '  },';
});

content = content.replace(/,\s*,\s*}/g, '  },');

fs.writeFileSync('src/App.tsx', content);

