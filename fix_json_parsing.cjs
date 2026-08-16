const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldParse = `      let jsonStr = data.text;
      if (jsonStr.includes('\`\`\`json')) {
        jsonStr = jsonStr.split('\`\`\`json')[1].split('\`\`\`')[0];
      }
      
      const parsed = JSON.parse(jsonStr.trim());`;

const newParse = `      let jsonStr = data.text;
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(jsonStr.trim());`;

content = content.replace(oldParse, newParse);
fs.writeFileSync('src/App.tsx', content);
