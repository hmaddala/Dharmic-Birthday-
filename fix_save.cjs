const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const modelMsg: MessageItem = \{ id: Date\.now\(\)\.toString\(\) \+ "_m", role: "model", text: cleanText\.trim\(\), jsonArray: extractedJson \};\n\s*setMessages\(\[\.\.\.newMessages, modelMsg\]\);/g,
  `const modelMsg: MessageItem = { id: Date.now().toString() + "_m", role: "model", text: cleanText.trim(), jsonArray: extractedJson };
      setMessages([...newMessages, modelMsg]);
      saveConfig(cleanText.trim());`
);

content = content.replace(
  /setIsLoading\(true\);\s*saveConfig\(\);\s*try \{/g,
  `setIsLoading(true);\n    try {`
);

fs.writeFileSync('src/App.tsx', content);
