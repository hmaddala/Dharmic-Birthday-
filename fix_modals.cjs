const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const stateRegex = /const \[showAuthModal, setShowAuthModal\] = useState\(false\);/;
const replacement = `const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);`;

if(stateRegex.test(content)) {
    content = content.replace(stateRegex, replacement);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Modals added");
} else {
    console.log("Could not find place to add modals");
}
