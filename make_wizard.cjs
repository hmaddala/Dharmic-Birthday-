const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// Add currentStep state
app = app.replace(
  'const [targetYearRange, setTargetYearRange] = useState(new Date().getFullYear().toString());',
  'const [targetYearRange, setTargetYearRange] = useState(new Date().getFullYear().toString());\n  const [currentStep, setCurrentStep] = useState(1);'
);

// We need to replace the form rendering logic. Let's find the form block
const formStartStr = '<form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar relative">';
const formStartIndex = app.indexOf(formStartStr);
if (formStartIndex === -1) {
  console.log("Could not find form start");
  process.exit(1);
}

// Find where form ends
const nextDivIndex = app.indexOf('</form>', formStartIndex);
if (nextDivIndex === -1) {
    console.log("Could not find form end");
    process.exit(1);
}

const originalFormContent = app.substring(formStartIndex, nextDivIndex + '</form>'.length);

fs.writeFileSync('original_form.txt', originalFormContent);
console.log("Extracted original form to original_form.txt");
