const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const startIndex = content.indexOf('const handleCalculateBlueprint = async () => {');
if (startIndex !== -1) {
  let depth = 0;
  let endIndex = -1;
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  if (endIndex !== -1) {
    // Also remove the "};" part. Actually the loop above matches the closing brace of the arrow function.
    content = content.substring(0, startIndex) + content.substring(endIndex + 1);
    // Remove lingering empty lines or trailing semicolons
    content = content.replace(/};\s*$/, '');
    fs.writeFileSync('src/App.tsx', content);
    console.log("Removed handleCalculateBlueprint");
  }
}
