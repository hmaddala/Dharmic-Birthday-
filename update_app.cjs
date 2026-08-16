const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard terms and conditions text with translations
content = content.replace(
  `I accept the <button type="button" onClick={() => setShowTerms(true)} className="text-[#8b0000] hover:underline">Terms & Conditions</button> and <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="text-[#8b0000] hover:underline">Privacy Policy</button>.`,
  `{t.iAcceptThe || "I accept the "} <button type="button" onClick={() => setShowTerms(true)} className="text-[#8b0000] hover:underline">{t.terms}</button> {t.and || "and"} <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="text-[#8b0000] hover:underline">{t.privacyPolicy}</button>.`
);

content = content.replace(
  `* Please fill all mandatory fields and accept terms and conditions`,
  `* {t.fillMandatory || "Please fill all mandatory fields and accept terms and conditions"}`
);

// We need to add 'iAcceptThe', 'and', 'fillMandatory', 'calculating' to TRANSLATIONS
// We also need to add missing translations for EN, IT, ES etc.

const englishReplacement = `
    guestTip: "Tip: password is hari2",
    iAcceptThe: "I accept the",
    and: "and",
    fillMandatory: "Please fill all mandatory fields and accept terms and conditions",
    calculating: "Calculating...",
  },
`;
content = content.replace(`    guestTip: "Tip: password is hari2",\n  },`, englishReplacement);

fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx modified");
