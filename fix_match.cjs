const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldParse = `      const exactM = LUNAR_MONTHS.find(x => m.toLowerCase().includes(x.toLowerCase())) || m;
         setLunarMonth(exactM);`;

const newParse = `      let matchedM = LUNAR_MONTHS.find(x => m.toLowerCase().includes(x.toLowerCase()));
         if (!matchedM) {
           const map = {
             "vaisakha": "Vaishakha", "sravana": "Shravana", "asvina": "Ashvin", "ashwina": "Ashvin", "ashwin": "Ashvin",
             "margashirsa": "Margashirsha", "posha": "Pausha", "phalgun": "Phalguna"
           };
           for (const key in map) {
             if (m.toLowerCase().includes(key)) {
               matchedM = map[key];
               break;
             }
           }
         }
         setLunarMonth(matchedM || m);`;

content = content.replace(oldParse, newParse);

const oldNakParse = `const exactN = NAKSHATRAS.find(x => n.toLowerCase().includes(x.toLowerCase())) || n;
         setNakshatra(exactN);`;

const newNakParse = `let matchedN = NAKSHATRAS.find(x => n.toLowerCase().includes(x.toLowerCase()));
         if (!matchedN) {
           const nMap = {
             "mrigashirsha": "Mrigashira", "purva phalguni": "Purva Phalguni", "uttara phalguni": "Uttara Phalguni",
             "purvashadha": "Purva Ashadha", "uttarashadha": "Uttara Ashadha", "sravana": "Shravana",
             "dhanishta": "Dhanishta", "purva bhadrapada": "Purva Bhadrapada", "uttara bhadrapada": "Uttara Bhadrapada"
           };
           for (const key in nMap) {
             if (n.toLowerCase().replace(/\\s/g, '').includes(key.replace(/\\s/g, ''))) {
               matchedN = nMap[key];
               break;
             }
           }
         }
         setNakshatra(matchedN || n);`;

content = content.replace(oldNakParse, newNakParse);

fs.writeFileSync('src/App.tsx', content);
