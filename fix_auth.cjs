const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('const [showAuthModal, setShowAuthModal] = useState(false);')) {
  content = content.replace('const [authEmail, setAuthEmail] = useState("");', 'const [showAuthModal, setShowAuthModal] = useState(false);\n  const [authEmail, setAuthEmail] = useState("");');
  fs.writeFileSync('src/App.tsx', content);
  console.log("showAuthModal added");
}
