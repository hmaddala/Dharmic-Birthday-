const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add state for terms
content = content.replace(
  /const \[notes, setNotes\] = useState\(""\);/,
  'const [notes, setNotes] = useState("");\n  const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);'
);

content = content.replace(
  /const isFormValid = !!\(birthDate && birthTime && birthPlace && timezone && targetYearRange\);/,
  'const isFormValid = !!(birthDate && birthTime && birthPlace && timezone);\n  const isSubmitReady = isFormValid && acceptedBlueprint;'
);

content = content.replace(
  /if \(isLoading \|\| !isFormValid\) return;/g,
  'if (isLoading || !isSubmitReady) return;'
);

content = content.replace(
  /setTargetYearRange\(new Date\(\)\.getFullYear\(\)\.toString\(\)\);/g,
  'setTargetYearRange("");\n    setAcceptedBlueprint(false);'
);

content = content.replace(
  /!isFormValid \? "Please fill all mandatory fields to continue" : undefined/g,
  '!isSubmitReady ? "Please fill all mandatory fields and accept the Cosmic Blueprint to continue" : undefined'
);

content = content.replace(
  /\(!isFormValid \|\| isLoading\)/g,
  '(!isSubmitReady || isLoading)'
);

content = content.replace(
  /\{!isFormValid && \(/g,
  '{!isSubmitReady && ('
);
content = content.replace(
  /\* Please fill all mandatory fields/g,
  '* Please fill all mandatory fields and approve the Cosmic Blueprint'
);

fs.writeFileSync('src/App.tsx', content);
