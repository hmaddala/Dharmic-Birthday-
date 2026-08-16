const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/setShowTermsModal/g, "setShowTerms");
content = content.replace(/setShowPrivacyModal/g, "setShowPrivacyPolicy");

fs.writeFileSync('src/App.tsx', content);
