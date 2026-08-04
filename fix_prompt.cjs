const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  'const isLoggedIn = !!user || isGuest;',
  `const isLoggedIn = !!user || isGuest;
    userPrompt += "\\n\\nIMPORTANT: Start your response by summarizing the original birth details provided by the user, followed by their 4 Cosmic Blueprint parameters. Then provide the Dharmic Birthday details.";`
);

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx prompt updated');
