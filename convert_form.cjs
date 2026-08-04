const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add currentStep to state
if (!app.includes('const [currentStep, setCurrentStep]')) {
  app = app.replace(
    'const [targetYearRange, setTargetYearRange] = useState(new Date().getFullYear().toString());',
    'const [targetYearRange, setTargetYearRange] = useState(new Date().getFullYear().toString());\n  const [currentStep, setCurrentStep] = useState(1);\n  const totalSteps = 4;'
  );
}

// Now let's extract the form content
const startIdx = app.indexOf('<form id="main-form"');
const endIdx = app.indexOf('</form>', startIdx) + '</form>'.length;

const originalForm = app.substring(startIdx, endIdx);
fs.writeFileSync('original_form.txt', originalForm);
console.log('Saved original form');

// Create new form code
const step1 = `
              {currentStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 1: When were you born?</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.birthDate} <span className="text-[#8b0000] ml-1">*</span>
                        <InfoTooltip content={t.tooltipDate} />
                      </label>
                      <DatePicker
                        selected={parseDateString(birthDate)}
                        onChange={handleDateChange}
                        dateFormat={getDatePickerFormat(dateFormat)}
                        maxDate={new Date()}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        popperPlacement="bottom-start"
                        portalId="root"
                        wrapperClassName="w-full"
                        className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                        placeholderText={dateFormat}
                      />
                    </div>
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.birthTime} <span className="text-[#8b0000] ml-1">*</span>
                        <InfoTooltip content={t.tooltipTime} />
                      </label>
                      <input
                        type="time"
                        value={birthTime}
                        onChange={(e) => setBirthTime(e.target.value)}
                        className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
`;

const step2 = `
              {currentStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 2: Where did you begin?</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                          {t.birthPlace} <span className="text-[#8b0000] ml-1">*</span>
                          <InfoTooltip content={t.tooltipPlace} />
                        </label>
                        <AppErrorBoundary fallbackMessage="Failed to load location input.">
                          <LocationInput
                            value={birthPlace}
                            onChange={setBirthPlace}
                            placeholder={t.locationPlaceholder}
                          />
                        </AppErrorBoundary>
                        {debouncedBirthPlace && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-2 flex flex-col gap-1"
                          >
                            <div className={\`\${isMapExpanded ? 'fixed inset-4 z-[9999] shadow-2xl rounded-lg' : 'h-72 w-full rounded-[4px] shadow-inner'} overflow-hidden border border-[#d1c4b2] relative group bg-white\`}>
                              <button
                                  type="button" 
                                 onClick={() => setIsMapExpanded(!isMapExpanded)}
                                 className="absolute top-2 right-2 z-[1000] bg-white p-2 rounded shadow border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center"
                                 title={isMapExpanded ? "Minimize Map" : "Maximize Map"}
                              >
                                {isMapExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                              </button>
                              <MapErrorBoundary>
                                <LocationMap placeName={debouncedBirthPlace} onChange={setBirthPlace} />
                              </MapErrorBoundary>
                            </div>
                            {!isMapExpanded && <span className="text-[0.65rem] text-[#8e8372] text-center italic">{t.mapHint}</span>}
                          </motion.div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                          {t.timezone} <span className="text-[#8b0000] ml-1">*</span>
                          <InfoTooltip content={t.tooltipTimezone} />
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                        >
                          <option value="">{t.selectTimezone}</option>
                          {TIMEZONES.map((tz, idx) => (
                            <option key={idx} value={tz}>{tz}</option>
                          ))}
                        </select>
                    </div>
                  </div>
                </motion.div>
              )}
`;

const step3 = `
              {currentStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 3: Cosmic Blueprint</h3>
                  <div className="flex flex-col gap-4">
                     <div className="flex flex-col gap-1 relative">
                       <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                         {t.nakshatra} <span className="text-[#8b0000] ml-1">*</span>
                         <InfoTooltip content={t.tooltipNakshatra} />
                       </label>
                       <select
                         value={nakshatra}
                         onChange={(e) => setNakshatra(e.target.value)}
                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                       >
                         <option value="">{t.select}</option>
                         {NAKSHATRAS.map((n, idx) => (
                           <option key={idx} value={n}>{n}</option>
                         ))}
                       </select>
                     </div>
                     <div className="flex flex-col gap-1 relative">
                       <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                         {t.paksha} <span className="text-[#8b0000] ml-1">*</span>
                         <InfoTooltip content={t.tooltipPaksha} />
                       </label>
                       <select
                         value={paksha}
                         onChange={(e) => setPaksha(e.target.value)}
                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                       >
                         <option value="">{t.select}</option>
                         <option value="Shukla Paksha (Waxing)">Shukla (Waxing)</option>
                         <option value="Krishna Paksha (Waning)">Krishna (Waning)</option>
                       </select>
                     </div>
                     <div className="flex flex-col gap-1 relative">
                       <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                         {t.tithi} <span className="text-[#8b0000] ml-1">*</span>
                         <InfoTooltip content={t.tooltipTithi} />
                       </label>
                       <select
                         value={tithi}
                         onChange={(e) => setTithi(e.target.value)}
                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                       >
                         <option value="">{t.select}</option>
                         {TITHIS.map((tInfo, idx) => (
                           <option key={idx} value={tInfo}>{tInfo}</option>
                         ))}
                       </select>
                     </div>
                     <div className="flex flex-col gap-1 relative">
                       <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                         {t.lunarMonth} <span className="text-[#8b0000] ml-1">*</span>
                         <InfoTooltip content={t.tooltipLunarMonth} />
                       </label>
                       <select
                         value={lunarMonth}
                         onChange={(e) => setLunarMonth(e.target.value)}
                         className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                       >
                         <option value="">{t.select}</option>
                         {LUNAR_MONTHS.map((m, idx) => (
                           <option key={idx} value={m}>{m}</option>
                         ))}
                       </select>
                     </div>
                  </div>
                </motion.div>
              )}
`;

const step4 = `
              {currentStep === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 4: Final Details</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.targetYears} <span className="text-[#8b0000] ml-1">*</span>
                        <InfoTooltip content={t.tooltipTargetYear} />
                      </label>
                      <input
                        type="text"
                        value={targetYearRange}
                        onChange={(e) => setTargetYearRange(e.target.value)}
                        placeholder="e.g. 2025"
                        className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.notes}
                        <InfoTooltip content={t.tooltipNotes} />
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional details or questions?"
                        className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] h-20 resize-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
`;

const controls = `
              {/* Wizard Navigation */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#e2d1b3]">
                 {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-4 py-2 text-sm font-bold text-[#8b0000] bg-white border border-[#8b0000] rounded hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                 ) : <div></div>}
                 
                 {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className="px-6 py-2 text-sm font-bold text-white bg-[#8b0000] rounded shadow hover:bg-[#6b0000] transition-colors"
                    >
                      Next
                    </button>
                 ) : (
                    <button
                      type="submit"
                      disabled={isLoading || !isFormValid}
                      className={\`px-6 py-2 text-sm font-bold text-white rounded shadow transition-colors flex items-center justify-center gap-2 \${
                        isLoading || !isFormValid ? "bg-gray-400 cursor-not-allowed" : "bg-[#8b0000] hover:bg-[#6b0000]"
                      }\`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>{t.findBday}</span>
                      )}
                    </button>
                 )}
              </div>
`;

const progressBar = `
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-1.5 mt-2 rounded overflow-hidden">
            <div 
              className="bg-[#daa520] h-full transition-all duration-300"
              style={{ width: \`\${(currentStep / totalSteps) * 100}%\` }}
            />
          </div>
`;

const newForm = `
          <form id="main-form" onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="space-y-4 flex flex-col flex-1 relative h-full">
            <AnimatePresence mode="wait">
              ${step1}
              ${step2}
              ${step3}
              ${step4}
            </AnimatePresence>
            <div className="flex-1" />
            ${controls}
          </form>
`;

app = app.substring(0, startIdx) + progressBar + '\n' + newForm + app.substring(endIdx);
fs.writeFileSync('src/App.tsx', app);
console.log('Successfully applied multi-step form');
