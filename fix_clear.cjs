const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const handleClear = \(\) => \{/g,
  'const handleClear = () => {\n    setShowDashboard(false);'
);

fs.writeFileSync('src/App.tsx', content);
