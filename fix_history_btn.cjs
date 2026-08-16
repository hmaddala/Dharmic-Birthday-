const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /className="flex items-center space-x-1 text-xs font-bold text-white\/80 hover:text-white transition-colors uppercase tracking-wider hidden sm:flex"/g,
  `className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider"`
);

fs.writeFileSync('src/App.tsx', content);
