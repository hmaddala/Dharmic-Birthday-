const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const startStr = `            <div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 mt-4 mb-2">
               {t.tradData}
            </div>`;

const endStr = `            {(hasAllFourDetails && (!requireApproval || acceptedBlueprint)) && (
<>
<div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 mt-4 mb-2">
               {t.searchRange}
            </div>`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + `            <div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 mt-4 mb-2">
               {t.searchRange}
            </div>` + content.substring(endIndex + endStr.length);
  fs.writeFileSync('src/App.tsx', content);
  console.log("UI replaced");
} else {
  console.log("Not found");
  console.log(startIndex, endIndex);
}
