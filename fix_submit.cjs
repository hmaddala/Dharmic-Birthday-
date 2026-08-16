const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldSubmit = `            <button
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
               <p className="text-[#8b0000] text-xs text-center mt-2 font-medium">* Please fill all mandatory fields {requireApproval && !acceptedBlueprint && "and approve the Cosmic Blueprint"}</p>
             )}`;

const newSubmit = `            <div className="flex items-start space-x-2 mb-4">
               <input
                 type="checkbox"
                 id="accept-terms"
                 checked={acceptTerms}
                 onChange={(e) => setAcceptTerms(e.target.checked)}
                 className="mt-1 w-4 h-4 text-[#8b0000] focus:ring-[#daa520] border-[#d1c4b2] rounded cursor-pointer shrink-0"
               />
               <label htmlFor="accept-terms" className="text-[0.75rem] text-[#5c554a] cursor-pointer leading-tight">
                 I accept the <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#8b0000] hover:underline">Terms & Conditions</button> and <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-[#8b0000] hover:underline">Privacy Policy</button>.
               </label>
             </div>
             
             <button
               form="main-form"
               type="submit"
               title={!isSubmitReady ? "Please fill all mandatory fields and accept terms to continue" : undefined}
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
               <p className="text-[#8b0000] text-xs text-center mt-2 font-medium">* Please fill all mandatory fields and accept terms and conditions</p>
             )}`;

content = content.replace(oldSubmit, newSubmit);
fs.writeFileSync('src/App.tsx', content);
