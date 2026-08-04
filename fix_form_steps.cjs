const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

const formRegex = /<form id="main-form"[\s\S]*?<\/form>/;
const match = app.match(formRegex);
if (!match) {
  console.log("Form not found");
  process.exit(1);
}

const newFormInner = `
          <form id="main-form" onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="space-y-4 flex flex-col flex-1 relative h-full">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
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
                      <DatePicker
                        selected={birthTime ? new Date(\`2000-01-01T\${birthTime}\`) : null}
                        onChange={handleTimeChange}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={1}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="HH:mm"
                        portalId="root"
                        wrapperClassName="w-full"
                        className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>
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
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 2: Where were you born?</h3>
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

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 3: Cosmic Blueprint</h3>
                  
                  {!isBlueprintGenerated ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-[0.85rem] text-[#5c554a]">
                        We will use our high-performance AI models to accurately calculate your Vedic Cosmic Blueprint (Nakshatra, Paksha, Tithi, Lunar Month) using your Date, Time, and Place of birth.
                      </p>
                      <button
                        type="button"
                        onClick={generateBlueprint}
                        disabled={!birthDate || !birthTime || !birthPlace || !timezone || isGeneratingBlueprint}
                        className={\`p-3 text-white font-bold rounded shadow transition-colors flex items-center justify-center gap-2 \${
                          (!birthDate || !birthTime || !birthPlace || !timezone || isGeneratingBlueprint) ? "bg-gray-400 cursor-not-allowed" : "bg-[#2b6cb0] hover:bg-[#1e4e8c]"
                        }\`}
                      >
                        {isGeneratingBlueprint ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="w-4 h-4" /> Generate Cosmic Blueprint</>
                        )}
                      </button>
                      {(!birthDate || !birthTime || !birthPlace || !timezone) && (
                        <p className="text-xs text-red-600">Please complete Steps 1 & 2 first.</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="p-4 bg-[#fdfcfb] border border-[#d1c4b2] rounded-[4px] space-y-3">
                        <div className="flex justify-between border-b border-[#e2d1b3] pb-2">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.nakshatra}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{nakshatra || "-"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#e2d1b3] pb-2">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.paksha}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{paksha || "-"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#e2d1b3] pb-2">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.tithi}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{tithi || "-"}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.lunarMonth}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{lunarMonth || "-"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" id="acceptBlueprint" checked={acceptedBlueprint} onChange={e => setAcceptedBlueprint(e.target.checked)} className="w-4 h-4 text-[#8b0000] rounded focus:ring-[#8b0000]" />
                        <label htmlFor="acceptBlueprint" className="text-[0.8rem] text-[#5c554a] font-medium cursor-pointer">I agree and accept these 4 Cosmic Blueprint results</label>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Wizard Navigation */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#e2d1b3]">
               {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-6 py-2 text-sm font-bold text-[#8b0000] border border-[#8b0000] rounded hover:bg-[#fff9e6] transition-colors"
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
                  <div></div>
               )}
            </div>
          </form>
`;

app = app.replace(formRegex, newFormInner);

// And we need to remove the extra button underneath the wizard that was doing Find My Dharmic Birthday
// It's in the block <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">
const finalBtnBlockRegex = /<div className="p-4 lg:p-6 border-t border-\[#e2d1b3\] bg-\[#fdfcfb\]">[\s\S]*?<\/div>/;
// We will replace it with the new button logic, but actually let's just make the final button dependent on step.
const replacementFinalBtn = `
          <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">
            <button
               form="main-form"
               type="submit"
               title={!isFormValid ? "Please fill all mandatory fields to continue" : undefined}
               onClick={(e) => {
                 if (currentStep < 3) {
                   e.preventDefault();
                   alert("Please complete the form steps first.");
                 } else if (!acceptedBlueprint) {
                   e.preventDefault();
                   alert("Please accept the Cosmic Blueprint results to proceed.");
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

fs.writeFileSync('src/App.tsx', app);
console.log('App form structure completely rewritten');
