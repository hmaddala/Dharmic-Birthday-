const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state variable for showCosmicBlueprintCheckbox
content = content.replace(
  /const \[acceptedBlueprint, setAcceptedBlueprint\] = useState\(false\);/,
  'const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);\n  const [showCosmicBlueprintCheckbox, setShowCosmicBlueprintCheckbox] = useState(false);'
);

// 2. Add hasAllFourDetails and needsAiCalculation
content = content.replace(
  /const isSubmitReady = isFormValid && acceptedBlueprint;/,
  `const hasAllFourDetails = !!(nakshatra && paksha && tithi && lunarMonth);
  const needsAiCalculation = !hasAllFourDetails;
  const isSubmitReady = isFormValid && (!needsAiCalculation || acceptedBlueprint);`
);

// 3. Replace the submit section
const newSubmitSection = `          <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">
            {needsAiCalculation && !showCosmicBlueprintCheckbox && (
               <div className="mb-4">
                 <button type="button" onClick={() => setShowCosmicBlueprintCheckbox(true)} className="w-full bg-[#daa520] text-[#8b0000] p-3 rounded-[4px] font-bold uppercase tracking-wider hover:bg-[#e2d1b3] transition-colors border border-[#8b0000]/20">
                   {t.letHariGptCalculate || "Let HariGPT Calculate"}
                 </button>
               </div>
            )}
            {needsAiCalculation && showCosmicBlueprintCheckbox && (
              <div className="flex items-start space-x-2 mb-4 bg-[#fff9e6] p-3 rounded-md border border-[#daa520]/50 animate-in fade-in duration-300">
                <input
                  type="checkbox"
                  id="accept-blueprint"
                  checked={acceptedBlueprint}
                  onChange={(e) => setAcceptedBlueprint(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#8b0000] focus:ring-[#daa520] border-[#d1c4b2] rounded cursor-pointer"
                />
                <label htmlFor="accept-blueprint" className="text-[0.8rem] font-medium text-[#5c554a] cursor-pointer leading-tight">
                  I approve and accept the Cosmic Blueprint. Let the AI calculate my traditional details (Nakshatra, Tithi, etc.) if left blank.
                </label>
              </div>
            )}
            <button
               form="main-form"
               type="submit"
               title={!isSubmitReady ? "Please fill all mandatory fields to continue" : undefined}
               className={\`w-full text-white border-0 p-3 rounded-[4px] font-bold uppercase tracking-[0.05em] transition-colors flex items-center justify-center space-x-2 bg-[#8b0000] \${(!isSubmitReady || isLoading) ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#6b0000] cursor-pointer'}\`}
             >
               {isLoading ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span>{t.calculating || "Calculating..."}</span>
                 </>
               ) : (
                 <>
                   <span>{t.findBday || "Find My Dharmic Birthday"}</span>
                   <Send className="w-4 h-4" />
                 </>
               )}
             </button>
             {!isSubmitReady && (
               <p className="text-[#8b0000] text-xs text-center mt-2 font-medium">* Please fill all mandatory fields {needsAiCalculation && "and click 'Let HariGPT Calculate'"}</p>
             )}
          </div>`;

content = content.replace(
  /<div className="p-4 lg:p-6 border-t border-\[#e2d1b3\] bg-\[#fdfcfb\]">[\s\S]*?<\/div>\s*<\/section>/,
  newSubmitSection + '\n        </section>'
);

fs.writeFileSync('src/App.tsx', content);
