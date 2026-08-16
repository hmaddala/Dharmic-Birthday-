const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldParse = `      let jsonStr = data.text;
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      
      if (parsed.nakshatra) setNakshatra(parsed.nakshatra);
      if (parsed.paksha) setPaksha(parsed.paksha);
      if (parsed.tithi) setTithi(parsed.tithi);
      if (parsed.lunarMonth) setLunarMonth(parsed.lunarMonth);`;

const newParse = `      let jsonStr = data.text;
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      
      const cleanStr = (str) => typeof str === 'string' ? str.trim() : "";
      
      const n = cleanStr(parsed.nakshatra);
      if (n) {
         const exactN = NAKSHATRAS.find(x => x.toLowerCase() === n.toLowerCase()) || n;
         setNakshatra(exactN);
      }
      
      let p = cleanStr(parsed.paksha);
      if (p) {
         if (p.toLowerCase().includes("shukla")) p = "Shukla Paksha (Waxing)";
         else if (p.toLowerCase().includes("krishna")) p = "Krishna Paksha (Waning)";
         setPaksha(p);
      }
      
      const t = cleanStr(parsed.tithi);
      if (t) {
         const exactT = TITHIS.find(x => x.toLowerCase() === t.toLowerCase()) || t;
         setTithi(exactT);
      }
      
      const m = cleanStr(parsed.lunarMonth);
      if (m) {
         const exactM = LUNAR_MONTHS.find(x => x.toLowerCase() === m.toLowerCase()) || m;
         setLunarMonth(exactM);
      }`;

content = content.replace(oldParse, newParse);
fs.writeFileSync('src/App.tsx', content);
