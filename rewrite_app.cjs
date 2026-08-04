const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Rename step 2
app = app.replace('Step 2: Where did you begin?', 'Step 2: Where were you born?');

// 2. Change totalSteps to 3
app = app.replace('const totalSteps = 4;', 'const totalSteps = 3;');

// 3. Move Target Year to Step 1, move Notes to Step 2
// Target year block:
const targetYearMatch = app.match(/<div className="flex flex-col gap-1 relative">[\s\S]*?\{t\.targetYears\}[\s\S]*?<\/label>[\s\S]*?<\/div>/);
const notesMatch = app.match(/<div className="flex flex-col gap-1 relative">[\s\S]*?\{t\.notes\}[\s\S]*?<\/label>[\s\S]*?<\/div>/);

if (targetYearMatch) {
  app = app.replace(targetYearMatch[0], '');
  // Insert it at the end of Step 1
  app = app.replace('Step 1: When were you born?</h3>\n                  <div className="flex flex-col gap-4">', 'Step 1: When were you born?</h3>\n                  <div className="flex flex-col gap-4">\n                    ' + targetYearMatch[0]);
}

if (notesMatch) {
  app = app.replace(notesMatch[0], '');
  // Insert it at the end of Step 2
  app = app.replace('Step 2: Where were you born?</h3>\n                  <div className="flex flex-col gap-4">', 'Step 2: Where were you born?</h3>\n                  <div className="flex flex-col gap-4">\n                    ' + notesMatch[0]);
}

// Now we need to remove the whole Step 4 block entirely
const step4Start = app.indexOf('{currentStep === 4 && (');
if (step4Start !== -1) {
    const step4End = app.indexOf(')}', step4Start + 100);
    const step4EndFull = app.indexOf(')}', step4End + 2) + 2; 
    // Wait, let's use regex
}

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx step restructuring step 1 done.');
