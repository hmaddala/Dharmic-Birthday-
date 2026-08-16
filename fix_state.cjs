const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldState = `  const hasAllFourDetails = !!(nakshatra && paksha && tithi && lunarMonth);
  const needsAiCalculation = !hasAllFourDetails && !isAiCalculated;
  const requireApproval = isAiCalculated;
  const isSubmitReady = isFormValid && hasAllFourDetails && (!requireApproval || acceptedBlueprint);`;

const newState = `  const [acceptTerms, setAcceptTerms] = useState(false);
  const isSubmitReady = isFormValid && acceptTerms;`;

content = content.replace(oldState, newState);

const oldHooks = `  const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);
  const [isAiCalculated, setIsAiCalculated] = useState(false);
  const [isCalculatingBlueprint, setIsCalculatingBlueprint] = useState(false);`;

const newHooks = ``;
content = content.replace(oldHooks, newHooks);

fs.writeFileSync('src/App.tsx', content);
