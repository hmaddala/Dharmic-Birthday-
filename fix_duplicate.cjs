const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const isDuplicate = recentConfigs.some[\s\S]*?if \(isDuplicate\) return;/m,
  ''
);

fs.writeFileSync('src/App.tsx', content);
