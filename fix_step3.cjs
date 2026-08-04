const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  'const isFormValid = !!(birthDate && birthTime && birthPlace && timezone && nakshatra && paksha && tithi && lunarMonth && targetYearRange);',
  'const isFormValid = !!(birthDate && birthTime && birthPlace && timezone && targetYearRange);'
);

const step3Old = `
              {currentStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 3: Cosmic Blueprint</h3>
                  <div className="flex flex-col gap-4">
`;

const step3New = `
              {currentStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 3: Cosmic Blueprint</h3>
                  
                  <div className="text-[0.75rem] text-[#5c554a] bg-yellow-50 p-3 rounded border border-yellow-200 mb-4">
                    <strong>Note:</strong> If you know these details, you can select them below. Otherwise, simply leave them as "Let AI Calculate" and our high-performance AI models will accurately calculate these details for you using your Date, Time, and Place of birth!
                  </div>

                  <div className="flex flex-col gap-4">
`;

app = app.replace(step3Old.trim(), step3New.trim());

// Remove asterisks from Nakshatra, Paksha, Tithi, Lunar Month labels in step 3
app = app.replace('{t.nakshatra} <span className="text-[#8b0000] ml-1">*</span>', '{t.nakshatra}');
app = app.replace('{t.paksha} <span className="text-[#8b0000] ml-1">*</span>', '{t.paksha}');
app = app.replace('{t.tithi} <span className="text-[#8b0000] ml-1">*</span>', '{t.tithi}');
app = app.replace('{t.lunarMonth} <span className="text-[#8b0000] ml-1">*</span>', '{t.lunarMonth}');

// Replace {t.select} with "Let AI Calculate" or just update it inline for these selects.
// Actually, I can just replace `<option value="">{t.select}</option>` with `<option value="">Let AI Calculate (Default)</option>` for Step 3 specifically.

app = app.replace(
  /<select\n\s*value=\{nakshatra\}[\s\S]*?<option value="">\{t\.select\}<\/option>/g,
  '<select\n                         value={nakshatra}\n                         onChange={(e) => setNakshatra(e.target.value)}\n                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"\n                       >\n                         <option value="">Let AI Calculate (Default)</option>'
);

app = app.replace(
  /<select\n\s*value=\{paksha\}[\s\S]*?<option value="">\{t\.select\}<\/option>/g,
  '<select\n                         value={paksha}\n                         onChange={(e) => setPaksha(e.target.value)}\n                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"\n                       >\n                         <option value="">Let AI Calculate (Default)</option>'
);

app = app.replace(
  /<select\n\s*value=\{tithi\}[\s\S]*?<option value="">\{t\.select\}<\/option>/g,
  '<select\n                         value={tithi}\n                         onChange={(e) => setTithi(e.target.value)}\n                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"\n                       >\n                         <option value="">Let AI Calculate (Default)</option>'
);

app = app.replace(
  /<select\n\s*value=\{lunarMonth\}[\s\S]*?<option value="">\{t\.select\}<\/option>/g,
  '<select\n                         value={lunarMonth}\n                         onChange={(e) => setLunarMonth(e.target.value)}\n                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"\n                       >\n                         <option value="">Let AI Calculate (Default)</option>'
);


fs.writeFileSync('src/App.tsx', app);
console.log('Step 3 fixed');
