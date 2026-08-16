const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldPrompt = `    userPrompt += "**Traditional Data (Cosmic Blueprint):**\\n";
    userPrompt += \`- Nakshatra: \${nakshatra || "Not provided"}\\n\`;
    userPrompt += \`- Paksha: \${paksha || "Not provided"}\\n\`;
    userPrompt += \`- Tithi: \${tithi || "Not provided"}\\n\`;
    userPrompt += \`- Lunar Month: \${lunarMonth || "Not provided"}\\n\\n\`;
    
    if (targetYearRange) userPrompt += \`- Target Year / Range: \${targetYearRange}\\n\`;
    if (notes) userPrompt += \`- Additional Notes: \${notes}\\n\`;

    userPrompt += \`\\n\\nCRITICAL INSTRUCTION: Start your conversational response by confirming the user's Birth Details and Traditional Data EXACTLY as provided above. Then provide the Dharmic Birthday results. All Gregorian dates in your text response (except the JSON block) MUST be formatted exactly as \${dateFormat}.\`;`;

const newPrompt = `    if (targetYearRange) userPrompt += \`- Target Year / Range: \${targetYearRange}\\n\`;
    if (notes) userPrompt += \`- Additional Notes: \${notes}\\n\`;

    userPrompt += \`\\n\\nCRITICAL INSTRUCTION: First calculate and determine the Nakshatra, Paksha, Tithi, and Lunar Month from the birth details. Start your conversational response by confirming the user's Birth Details, and then explicitly state the calculated Traditional Data (Nakshatra, Paksha, Tithi, Lunar Month). Then provide the Dharmic Birthday results. All Gregorian dates in your text response (except the JSON block) MUST be formatted exactly as \${dateFormat}.\`;`;

content = content.replace(oldPrompt, newPrompt);
fs.writeFileSync('src/App.tsx', content);
