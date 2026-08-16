const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Target year hint and dropdown
const yearDropdown = `
              <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.targetYears}
                    <InfoTooltip content={t.tooltipTargetYear} />
                  </label>
                  <p className="text-[0.65rem] text-[#8b4513] italic mb-1">Select a year to get a 5-Year Projection</p>
                  <input
                    type="text"
                    list="year-options"
                    placeholder={t.targetYearPlaceholder}
                    value={targetYearRange}
                    onChange={(e) => setTargetYearRange(e.target.value)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                  />
                  <datalist id="year-options">
                    <option value="2025" />
                    <option value="2026" />
                    <option value="2027" />
                    <option value="2028" />
                    <option value="2029" />
                    <option value="2030" />
                  </datalist>
              </div>
`;

content = content.replace(
  /<div className="flex flex-col gap-1 relative">\s*<label className="text-\[0\.7rem\] font-semibold text-\[#5c554a\] flex items-center">\s*\{t\.targetYears\}.*?<\/label>\s*<input[^>]*targetYearRange[\s\S]*?<\/div>/m,
  yearDropdown
);

// Truncate the selects for HariGPT Calculate
content = content.replace(
  /className="p-2 border border-\[#d1c4b2\] rounded-\[4px\] text-\[0\.85rem\] bg-\[#fdfcfb\] focus:outline-none focus:border-\[#daa520\]"/g,
  'className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.75rem] sm:text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] truncate w-full"'
);

// Checkbox for accepting cosmic blueprint
const acceptBlueprintHtml = `
          <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">
            <div className="flex items-start space-x-2 mb-4 bg-[#fff9e6] p-3 rounded-md border border-[#daa520]/50">
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
            <button
`;

content = content.replace(
  /<div className="p-4 lg:p-6 border-t border-\[#e2d1b3\] bg-\[#fdfcfb\]">\s*<button/g,
  acceptBlueprintHtml
);

// Header reordering
const headerHtml = `
      <header className="border-b-[4px] border-[#daa520] bg-[#8b0000] shrink-0 min-h-16 h-auto py-3 px-3 md:px-8 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-3 cursor-pointer group w-auto justify-start" onClick={() => { handleClear(); window.scrollTo(0,0); }} title="Home / Reset">
          <div className="w-8 h-8 bg-[#daa520] text-[#8b0000] rounded-[4px] flex items-center justify-center font-bold text-xl leading-none group-hover:bg-[#e2d1b3] transition-colors shrink-0">
            ॐ
          </div>
          <div className="flex flex-col text-white group-hover:text-white/90 transition-colors text-left overflow-hidden">
            <h1 className="text-[0.85rem] sm:text-[1.1rem] font-bold tracking-[0.02em] leading-tight truncate">{t.appName}</h1>
            <span className="text-[0.65rem] sm:text-[0.8rem] opacity-90 leading-tight truncate">{t.subtitle1}</span>
          </div>
        </div>

        <div className="flex items-center justify-end w-auto flex-1 space-x-2 sm:space-x-4 flex-wrap sm:flex-nowrap gap-y-2 ml-auto">
          {messages.length > 0 && (
            <>
              <button 
                 onClick={handleShare}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Share Result"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                 onClick={() => window.print()}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Print Result"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button 
                 onClick={handleDownload}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Download JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="flex items-center bg-[#6b0000] rounded-[4px] p-1 text-xs shrink-0 max-w-[150px] sm:max-w-none overflow-x-auto hide-scrollbar">
             <Globe className="w-3.5 h-3.5 text-white/70 mx-2 shrink-0" />
             {(["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"] as const).map(l => (
               <button
                 key={l}
                 onClick={() => setUiLang(l)}
                 title={LANGUAGE_ENGLISH_NAMES[l] || l}
                 className={\`px-2 py-1 rounded-[2px] font-bold transition-colors shrink-0 \${uiLang === l ? "bg-[#daa520] text-[#8b0000]" : "text-white/80 hover:text-white"}\`}
               >
                 {LANGUAGE_LABELS[l] || l}
               </button>
             ))}
          </div>

          {!authLoading && (
            <div className="flex items-center space-x-2 shrink-0">
              {(user || isGuest) ? (
                <>
                  {user && (
                    <button
                      onClick={() => setShowDashboard(true)}
                      className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider hidden sm:flex"
                      title={t.history}
                    >
                      <span>{t.history}</span>
                      <History className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      await signOut(auth);
                      setMessages([]);
                      setRecentConfigs([]);
                    }}
                    className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider bg-black/20 px-3 py-1.5 rounded-[4px]"
                  >
                    <span className="hidden sm:inline">{user ? "Logout" : "End Guest Session"}</span>
                    <LogOut className="w-3.5 h-3.5 sm:hidden" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-[#8b0000] bg-[#daa520] hover:bg-[#e2d1b3] px-3 py-1.5 rounded-[4px] transition-colors uppercase tracking-wider"
                >
                  <span>{t.login}</span>
                  <LogIn className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </header>
`;

content = content.replace(
  /<header className="border-b-\[4px\][\s\S]*?<\/header>/,
  headerHtml
);

fs.writeFileSync('src/App.tsx', content);
