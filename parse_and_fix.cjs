const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

// The lines with errors: 386, 441, 1145, 1277, 1409, 1541, 1673
// Let's print those lines to see the problem
console.log("386:", lines[385]);
console.log("441:", lines[440]);
console.log("1145:", lines[1144]);
console.log("1277:", lines[1276]);
console.log("1409:", lines[1408]);
console.log("1541:", lines[1540]);
console.log("1673:", lines[1672]);
