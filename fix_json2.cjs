const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldParse = `      const n = cleanStr(parsed.nakshatra);
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

const newParse = `      const n = cleanStr(parsed.nakshatra);
      if (n) {
         const exactN = NAKSHATRAS.find(x => n.toLowerCase().includes(x.toLowerCase())) || n;
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
         const exactT = TITHIS.find(x => t.toLowerCase().includes(x.toLowerCase())) || t;
         setTithi(exactT);
      }
      
      const m = cleanStr(parsed.lunarMonth);
      if (m) {
         const exactM = LUNAR_MONTHS.find(x => m.toLowerCase().includes(x.toLowerCase())) || m;
         setLunarMonth(exactM);
      }`;

content = content.replace(oldParse, newParse);
fs.writeFileSync('src/App.tsx', content);
