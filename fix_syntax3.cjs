const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const itMatch = content.match(/IT: \{([\s\S]*?)UK: \{/);
if (itMatch) {
  let itru = itMatch[1];
  console.log(itru.slice(-200));
}

