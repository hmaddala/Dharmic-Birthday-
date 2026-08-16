const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /targetYearRange: string;\n\};/,
  `targetYearRange: string;
  resultText?: string;
};`
);

content = content.replace(
  /const saveConfig = async \(\) => \{/,
  `const saveConfig = async (resultText?: string) => {`
);

content = content.replace(
  /const config: SearchConfig = \{/,
  `const config: SearchConfig = {
        resultText,`
);

// We need to pass resultText from handleSubmit when it succeeds
const submitSuccessRegex = /const newMessages = \[\.\.\.messages, newUserMsg\];\s*setMessages\(newMessages\);\s*setIsLoading\(true\);\s*saveConfig\(\);\s*try \{\s*const response = await fetch\("\/api\/ask"/;

// Wait, the API call happens, THEN we have the result.
// Let's modify the handleSubmit
content = content.replace(
  /setMessages\(\[\.\.\.newMessages, botMsg\]\);\s*\} catch \(err: any\)/,
  `setMessages([...newMessages, botMsg]);
      saveConfig(botMsg.text);
    } catch (err: any)`
);

// and remove the original saveConfig() call before try
content = content.replace(
  /setIsLoading\(true\);\s*saveConfig\(\);\s*try \{/,
  `setIsLoading(true);\n    try {`
);

// when restoring from dashboard
content = content.replace(
  /setShowDashboard\(false\);\n                         \}\}>/,
  `if (c.resultText) {
                                     setMessages([
                                        { id: 'u' + c.id, role: 'user', text: \`**Restored Search**\\nBirth Date: \${c.birthDate}\\nTime: \${c.birthTime}\\nPlace: \${c.birthPlace}\` },
                                        { id: 'b' + c.id, role: 'model', text: c.resultText }
                                     ]);
                                 } else {
                                     setMessages([]);
                                 }
                                 setShowDashboard(false);
                         }}>`
);

fs.writeFileSync('src/App.tsx', content);
