const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add isAiCalculated state
content = content.replace(
  /const \[acceptedBlueprint, setAcceptedBlueprint\] = useState\(false\);/,
  `const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);
  const [isAiCalculated, setIsAiCalculated] = useState(false);`
);

// Reset isAiCalculated when user manually changes values
content = content.replace(/onChange=\{\(e\) => setNakshatra\(e.target.value\)\}/, 'onChange={(e) => { setNakshatra(e.target.value); setIsAiCalculated(false); setAcceptedBlueprint(false); }}');
content = content.replace(/onChange=\{\(e\) => setPaksha\(e.target.value\)\}/, 'onChange={(e) => { setPaksha(e.target.value); setIsAiCalculated(false); setAcceptedBlueprint(false); }}');
content = content.replace(/onChange=\{\(e\) => setTithi\(e.target.value\)\}/, 'onChange={(e) => { setTithi(e.target.value); setIsAiCalculated(false); setAcceptedBlueprint(false); }}');
content = content.replace(/onChange=\{\(e\) => setLunarMonth\(e.target.value\)\}/, 'onChange={(e) => { setLunarMonth(e.target.value); setIsAiCalculated(false); setAcceptedBlueprint(false); }}');

// When AI calculates, set it to true
content = content.replace(
  /setShowCosmicBlueprintCheckbox\(true\);/,
  `setShowCosmicBlueprintCheckbox(true);
      setIsAiCalculated(true);
      setAcceptedBlueprint(false);`
);

// Modify needsAiCalculation logic
content = content.replace(
  /const hasAllFourDetails = !!\(nakshatra && paksha && tithi && lunarMonth\);\n\s*const needsAiCalculation = !hasAllFourDetails;\n\s*const isSubmitReady = isFormValid && \(\!needsAiCalculation \|\| acceptedBlueprint\);/,
  `const hasAllFourDetails = !!(nakshatra && paksha && tithi && lunarMonth);
  const needsAiCalculation = !hasAllFourDetails && !isAiCalculated;
  const requireApproval = isAiCalculated;
  const isSubmitReady = isFormValid && hasAllFourDetails && (!requireApproval || acceptedBlueprint);`
);

// Replace `{needsAiCalculation && (` for the calculate button
content = content.replace(
  /\{needsAiCalculation && \(/,
  `{!hasAllFourDetails && !isAiCalculated && (`
);

// Replace `{showCosmicBlueprintCheckbox && (` with `{requireApproval && (`
content = content.replace(
  /\{showCosmicBlueprintCheckbox && \(/,
  `{requireApproval && (`
);

// Replace `{(!needsAiCalculation || acceptedBlueprint) && (` with `{(hasAllFourDetails && (!requireApproval || acceptedBlueprint)) && (`
content = content.replace(
  /\{\(\!needsAiCalculation \|\| acceptedBlueprint\) && \(/g,
  `{(hasAllFourDetails && (!requireApproval || acceptedBlueprint)) && (`
);

// Fix the label warning message
content = content.replace(
  /\* Please fill all mandatory fields \{needsAiCalculation && "and approve the Cosmic Blueprint"\}/,
  `* Please fill all mandatory fields {requireApproval && !acceptedBlueprint && "and approve the Cosmic Blueprint"}`
);

fs.writeFileSync('src/App.tsx', content);
