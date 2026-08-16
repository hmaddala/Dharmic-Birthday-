const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const ts = require('typescript');
const sf = ts.createSourceFile('src/App.tsx', content, ts.ScriptTarget.Latest, true);

function visit(node) {
    if (node.kind === ts.SyntaxKind.PropertyAssignment) {
        if (node.name.text === 'UK') {
            console.log("Found UK block");
        }
    }
    ts.forEachChild(node, visit);
}
// Maybe typescript fails parsing and error location is a bit off.
// The errors all point to lines 1517 to 1684 which correspond to the `UK` block!
