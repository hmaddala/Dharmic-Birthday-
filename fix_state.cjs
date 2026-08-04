const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace totalSteps
app = app.replace('const totalSteps = 4;', 'const totalSteps = 3;');

// Add states
const statesToInsert = `
  const [isBlueprintGenerated, setIsBlueprintGenerated] = useState(false);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);
`;
app = app.replace('const [isLoading, setIsLoading] = useState(false);', 'const [isLoading, setIsLoading] = useState(false);\n' + statesToInsert);

// Add generateBlueprint function
const functionToInsert = `
  const generateBlueprint = async () => {
    if (!birthDate || !birthTime || !birthPlace || !timezone) return;
    setIsGeneratingBlueprint(true);
    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthTime, birthPlace, timezone })
      });
      if (res.ok) {
        const data = await res.json();
        setNakshatra(data.nakshatra || "Unknown");
        setPaksha(data.paksha || "Unknown");
        setTithi(data.tithi || "Unknown");
        setLunarMonth(data.lunarMonth || "Unknown");
        setIsBlueprintGenerated(true);
      } else {
        alert("Failed to generate blueprint. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate blueprint.");
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };
`;
app = app.replace('const handleSubmit = async (e: React.FormEvent) => {', functionToInsert + '\n  const handleSubmit = async (e: React.FormEvent) => {');

// Update isFormValid
app = app.replace(
  'const isFormValid = !!(birthDate && birthTime && birthPlace && timezone && targetYearRange);',
  'const isFormValid = !!(birthDate && birthTime && birthPlace && timezone && targetYearRange && acceptedBlueprint);'
);

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx states and functions injected');
