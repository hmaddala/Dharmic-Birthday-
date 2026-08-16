const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const \[showTerms, setShowTerms\] = useState\(false\);\n  const \[showPrivacyPolicy, setShowPrivacyPolicy\] = useState\(false\);/;
content = content.replace(regex, ""); // Remove the duplicate.

fs.writeFileSync('src/App.tsx', content);
