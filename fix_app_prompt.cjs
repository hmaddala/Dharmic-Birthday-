const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldPromptBlock = `IMPORTANT: Vedic dates change at sunrise, not midnight. The Tithi and Nakshatra are the ones active at the exact time of birth.`;
const newPromptBlock = `CRITICAL FOR ACCURACY: Tithis and Nakshatras change at highly specific times during the day. You MUST verify the exact transition times (end times) for the Tithi and Nakshatra on the birth date. Then, compare the given Birth Time against those transition times to determine which Tithi and Nakshatra were actually active at that exact moment.`;

content = content.replace(oldPromptBlock, newPromptBlock);
fs.writeFileSync('src/App.tsx', content);
