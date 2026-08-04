const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// Add validation message state
const stateToInsert = `  const [validationMessage, setValidationMessage] = useState("");\n`;
app = app.replace('const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);', 'const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);\n' + stateToInsert);

// Update Find My Dharmic Birthday block to show validation message
const finalBtnBlockRegex = /<div className="p-4 lg:p-6 border-t border-\[#e2d1b3\] bg-\[#fdfcfb\]">[\s\S]*?<\/div>/;
const replacementFinalBtn = `
          <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb] flex flex-col items-center">
            {validationMessage && (
               <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-600 text-sm font-semibold mb-3 flex items-center gap-2 bg-red-50 p-2 rounded border border-red-200">
                 <Info className="w-4 h-4" /> {validationMessage}
               </motion.div>
            )}
            <button
               form="main-form"
               type="submit"
               title={!isFormValid ? "Please fill all mandatory fields to continue" : undefined}
               onClick={(e) => {
                 if (currentStep < 3) {
                   e.preventDefault();
                   setValidationMessage("Please complete all form steps first.");
                   setTimeout(() => setValidationMessage(""), 4000);
                 } else if (!acceptedBlueprint) {
                   e.preventDefault();
                   setValidationMessage("Please review and accept the Cosmic Blueprint results to proceed.");
                   setTimeout(() => setValidationMessage(""), 4000);
                 }
               }}
               className={\`w-full text-white border-0 p-3 rounded-[4px] font-bold uppercase tracking-[0.05em] transition-colors flex items-center justify-center space-x-2 bg-[#8b0000] \${(currentStep < 3 || !isFormValid || !acceptedBlueprint || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#6b0000] cursor-pointer'}\`}
             >
               {isLoading ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span>{t.calculating}</span>
                 </>
               ) : (
                 <>
                   <span>{t.findBday}</span>
                   <Send className="w-4 h-4" />
                 </>
               )}
             </button>
          </div>
`;
app = app.replace(finalBtnBlockRegex, replacementFinalBtn);

// Update Generate Horoscope button
const horoscopeBtnRegex = /<div className="max-w-4xl mx-auto flex justify-center mb-4">[\s\S]*?<\/button>\s*<\/div>/;
const replacementHoroscopeBtn = `
                   <div className="max-w-4xl mx-auto flex justify-center mb-4">
                     <motion.button
                       onClick={generateHoroscope}
                       disabled={isLoading}
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       animate={{ 
                         y: [0, -5, 0],
                         boxShadow: [
                           "0 0 15px rgba(218,165,32,0.5)", 
                           "0 0 25px rgba(218,165,32,0.8)", 
                           "0 0 15px rgba(218,165,32,0.5)"
                         ]
                       }}
                       transition={{ y: { duration: 2, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                       className="relative overflow-hidden group bg-gradient-to-r from-[#daa520] to-[#b8860b] text-white px-8 py-3 rounded-full transition-all duration-300"
                     >
                       <span className="absolute inset-0 w-full h-full bg-white/30 group-hover:animate-pulse rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                       <span className="relative font-bold tracking-wider text-sm flex items-center justify-center gap-2">
                         <Sparkles className="w-5 h-5" /> Generate Horoscope
                       </span>
                     </motion.button>
                   </div>
`;
app = app.replace(horoscopeBtnRegex, replacementHoroscopeBtn);


fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx updated UI elements');
