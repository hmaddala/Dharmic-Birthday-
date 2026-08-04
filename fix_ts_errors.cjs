const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/\}, \)\)/g, '}))');
app = app.replace(/\},\)\)/g, '}))');
app = app.replace(/\}, \)/g, '})');
app = app.replace(/\},\)/g, '})');

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx TS errors fixed');
