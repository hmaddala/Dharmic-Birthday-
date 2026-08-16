const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/          <\/div>\n\)}\n          <\/>\n          \)}\n        <\/section>/,
`          </div>
)}
        </section>`
);

fs.writeFileSync('src/App.tsx', content);
