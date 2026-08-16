const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const getDatePickerFormat = \(format: string\) => \{/,
  `const getDatePickerFormatList = (format: string) => {
    if (format === 'DD-MM-YYYY') return ['dd-MM-yyyy', 'dd.MM.yyyy', 'ddMMyyyy', 'dMyyyy', 'd.M.yy', 'dd.MM.yy', 'dd-MM-yy', 'd-M-yy', 'dd/MM/yyyy', 'd/M/yyyy', 'd/M/yy', 'dd/MM/yy'];
    if (format === 'MM-DD-YYYY') return ['MM-dd-yyyy', 'MM.dd.yyyy', 'MMddyyyy', 'Mdyyyy', 'M.d.yy', 'MM.dd.yy', 'MM-dd-yy', 'M-d-yy', 'MM/dd/yyyy', 'M/d/yyyy', 'M/d/yy', 'MM/dd/yy'];
    return ['yyyy-MM-dd', 'yy-MM-dd', 'yyyy/MM/dd', 'yyyy.MM.dd'];
  };

  const getDatePickerFormat = (format: string) => {`
);

content = content.replace(
  /dateFormat=\{getDatePickerFormat\(dateFormat\)\}/,
  `dateFormat={getDatePickerFormatList(dateFormat)}`
);

// Tithi mapping fix
content = content.replace(
  /\{TITHIS\.map\(\(tInfo, idx\) => \(\s*<option key=\{idx\} value=\{tInfo\.name\}>\{tInfo\.name\} \(\{tInfo\.type\}\)<\/option>\s*\)\)\}/,
  `{TITHIS.map((t, idx) => (
                        <option key={idx} value={t}>{t}</option>
                      ))}`
);

// Submit prompt fix
const oldPromptRegex = /let userPrompt = "Here are my details for finding the equivalent Dharmic birthday:\\n\\n";\s*if \(birthDate\).*?(?=const isLoggedIn = !!user \|\| isGuest;)/s;

const newPrompt = `let formattedBirthDate = birthDate;
    if (birthDate) {
      const parts = birthDate.split('-');
      if (parts.length === 3) {
         if (dateFormat === 'DD-MM-YYYY') formattedBirthDate = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
         else if (dateFormat === 'MM-DD-YYYY') formattedBirthDate = \`\${parts[1]}-\${parts[2]}-\${parts[0]}\`;
      }
    }
    
    let userPrompt = "Here are my details for finding the equivalent Dharmic birthday:\\n\\n";
    userPrompt += "**Birth Details:**\\n";
    if (birthDate) userPrompt += \`- Birth Date: \${formattedBirthDate}\\n\`;
    if (birthTime) userPrompt += \`- Birth Time: \${birthTime}\\n\`;
    if (birthPlace) userPrompt += \`- Birth Place: \${birthPlace}\\n\`;
    if (timezone) userPrompt += \`- Timezone: \${timezone}\\n\\n\`;
    
    userPrompt += "**Traditional Data (Cosmic Blueprint):**\\n";
    userPrompt += \`- Nakshatra: \${nakshatra || "Not provided"}\\n\`;
    userPrompt += \`- Paksha: \${paksha || "Not provided"}\\n\`;
    userPrompt += \`- Tithi: \${tithi || "Not provided"}\\n\`;
    userPrompt += \`- Lunar Month: \${lunarMonth || "Not provided"}\\n\\n\`;
    
    if (targetYearRange) userPrompt += \`- Target Year / Range: \${targetYearRange}\\n\`;
    if (notes) userPrompt += \`- Additional Notes: \${notes}\\n\`;

    userPrompt += \`\\n\\nCRITICAL INSTRUCTION: Start your conversational response by confirming the user's Birth Details and Traditional Data EXACTLY as provided above. Then provide the Dharmic Birthday results. All Gregorian dates in your text response (except the JSON block) MUST be formatted exactly as \${dateFormat}.\`;

    `;

content = content.replace(oldPromptRegex, newPrompt);

fs.writeFileSync('src/App.tsx', content);
