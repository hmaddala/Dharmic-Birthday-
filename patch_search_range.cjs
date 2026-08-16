const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetContent = `<div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 mt-4 mb-2">
               {t.searchRange}
            </div>`;

const replacementContent = `{(!needsAiCalculation || acceptedBlueprint) && (
            <>
            <div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 mt-4 mb-2">
               {t.searchRange}
            </div>`;

content = content.replace(targetContent, replacementContent);

const targetContent2 = `<p className="text-[#8b0000] text-xs text-center mt-2 font-medium">* Please fill all mandatory fields {needsAiCalculation && "and approve the Cosmic Blueprint"}</p>
             )}
          </div>`;

const replacementContent2 = `<p className="text-[#8b0000] text-xs text-center mt-2 font-medium">* Please fill all mandatory fields {needsAiCalculation && "and approve the Cosmic Blueprint"}</p>
             )}
          </div>
          </>
          )}`;

content = content.replace(targetContent2, replacementContent2);

fs.writeFileSync('src/App.tsx', content);
