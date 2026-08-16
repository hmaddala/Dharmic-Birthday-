const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// We need to inject a new handleCalculateBlueprint function and states
content = content.replace(
  /const \[isLoading, setIsLoading\] = useState\(false\);/,
  `const [isLoading, setIsLoading] = useState(false);
  const [isCalculatingBlueprint, setIsCalculatingBlueprint] = useState(false);`
);

content = content.replace(
  /const handleClear = \(\) => \{/,
  `const handleCalculateBlueprint = async () => {
    if (!birthDate || !birthTime || !birthPlace || !timezone) {
      alert("Please fill all birth details first.");
      return;
    }
    setIsCalculatingBlueprint(true);
    try {
      const prompt = \`Calculate the traditional Vedic astrology details for someone born on:
Birth Date: \${birthDate}
Birth Time: \${birthTime}
Birth Place: \${birthPlace}
Timezone: \${timezone}

Return ONLY a JSON object exactly matching this format, with no markdown formatting or other text:
{
  "nakshatra": "String (name of Nakshatra)",
  "paksha": "String ('Shukla Paksha (Waxing)' or 'Krishna Paksha (Waning)')",
  "tithi": "String (name of Tithi)",
  "lunarMonth": "String (name of Lunar Month)"
}\`;

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history: [] })
      });
      const data = await response.json();
      
      let jsonStr = data.text;
      if (jsonStr.includes('\`\`\`json')) {
        jsonStr = jsonStr.split('\`\`\`json')[1].split('\`\`\`')[0];
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      
      if (parsed.nakshatra) setNakshatra(parsed.nakshatra);
      if (parsed.paksha) setPaksha(parsed.paksha);
      if (parsed.tithi) setTithi(parsed.tithi);
      if (parsed.lunarMonth) setLunarMonth(parsed.lunarMonth);
      
      setShowCosmicBlueprintCheckbox(true);
    } catch (err) {
      console.error(err);
      alert("Failed to calculate blueprint. Please try again or enter manually.");
    } finally {
      setIsCalculatingBlueprint(false);
    }
  };

  const handleClear = () => {`
);

// Now move the button and checkbox
// 1. Remove it from the bottom
content = content.replace(
  /\{needsAiCalculation && !showCosmicBlueprintCheckbox && \([\s\S]*?<\/div>\s*\)\}/,
  ''
);

content = content.replace(
  /\{needsAiCalculation && showCosmicBlueprintCheckbox && \([\s\S]*?<\/div>\s*\)\}/,
  ''
);

content = content.replace(
  /\{needsAiCalculation && "and click 'Let HariGPT Calculate'"\}/g,
  '{needsAiCalculation && "and approve the Cosmic Blueprint"}'
);

// 2. Put it below the 4 traditional data boxes
const newTraditionalSectionEnd = `
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                      {t.tithi}
                      <InfoTooltip content={t.tooltipTithi} />
                    </label>
                    <select
                      value={tithi}
                      onChange={(e) => setTithi(e.target.value)}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.75rem] sm:text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] truncate w-full"
                    >
                      <option value="">{t.letHariGptCalculate || "Let HariGPT Calculate"}</option>
                      {TITHIS.map((tInfo, idx) => (
                        <option key={idx} value={tInfo.name}>{tInfo.name} ({tInfo.type})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                      {t.lunarMonth}
                      <InfoTooltip content={t.tooltipMonth} />
                    </label>
                    <select
                      value={lunarMonth}
                      onChange={(e) => setLunarMonth(e.target.value)}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.75rem] sm:text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] truncate w-full"
                    >
                      <option value="">{t.letHariGptCalculate || "Let HariGPT Calculate"}</option>
                      {MONTHS.map((m, idx) => (
                        <option key={idx} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
               </div>

               {/* HariGPT Calculation Button & Approval Checkbox placed here */}
               <div className="mt-4 flex flex-col items-center">
                 {needsAiCalculation && (
                   <button 
                     type="button" 
                     onClick={handleCalculateBlueprint} 
                     disabled={isCalculatingBlueprint || !birthDate || !birthTime || !birthPlace || !timezone}
                     className="bg-[#daa520] text-[#8b0000] px-6 py-2 rounded-[4px] text-sm font-bold uppercase tracking-wider hover:bg-[#c99510] transition-colors border border-[#8b0000]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                   >
                     {isCalculatingBlueprint ? (
                       <><Loader2 className="w-4 h-4 animate-spin" /> {t.calculating || "Calculating..."}</>
                     ) : (
                       t.letHariGptCalculate || "Let HariGPT Calculate"
                     )}
                   </button>
                 )}
                 {showCosmicBlueprintCheckbox && (
                   <div className="mt-4 flex items-start space-x-2 bg-[#fff9e6] p-3 rounded-md border border-[#daa520]/50 animate-in fade-in duration-300 w-full max-w-lg">
                     <input
                       type="checkbox"
                       id="accept-blueprint"
                       checked={acceptedBlueprint}
                       onChange={(e) => setAcceptedBlueprint(e.target.checked)}
                       className="mt-1 w-4 h-4 text-[#8b0000] focus:ring-[#daa520] border-[#d1c4b2] rounded cursor-pointer shrink-0"
                     />
                     <label htmlFor="accept-blueprint" className="text-[0.8rem] font-medium text-[#5c554a] cursor-pointer leading-tight">
                       I approve and accept the Cosmic Blueprint results generated above.
                     </label>
                   </div>
                 )}
               </div>
`;

content = content.replace(
  /<div className="grid grid-cols-2 gap-4">\s*<div className="flex flex-col gap-1 relative">\s*<label className="text-\[0\.7rem\] font-semibold text-\[#5c554a\] flex items-center">\s*\{t\.tithi\}[\s\S]*?<\/div>\s*<\/div>/,
  newTraditionalSectionEnd
);

fs.writeFileSync('src/App.tsx', content);
