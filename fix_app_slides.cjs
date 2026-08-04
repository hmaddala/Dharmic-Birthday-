const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

const slideTexts = `
    slideTitle15: "Mandatory: Exact Date of Birth",
    slideDesc15: "We need your exact day, month, and year of birth to align with the planetary positions of that specific day.",
    slideTitle16: "Mandatory: Exact Time of Birth",
    slideDesc16: "Your exact hour and minute of birth are crucial. A few minutes can change your entire astrological chart.",
    slideTitle17: "Mandatory: Place of Birth",
    slideDesc17: "City and coordinates determine the precise angle of the cosmos at the moment you were born.",
`;

// we will insert it right before `testiText0:` for EN translations.
app = app.replace('    testiText0:', slideTexts + '\n    testiText0:');
fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx slides updated');
