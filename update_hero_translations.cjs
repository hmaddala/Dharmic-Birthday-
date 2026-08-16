const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Insert new translations after heroProblemDesc
content = content.replace(
  /heroProblemDesc: (.*?),/,
  'heroProblemDesc: $1,\n    heroCoreTitle: "Only 3 Details Required",\n    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",'
);

// We should also add the slide texts for the 3 new slides:
content = content.replace(
  /slideTitle0: (.*?),/,
  'slideTitle_req1: "1. The Date of Incarnation",\n    slideDesc_req1: "Your Birth Date pinpoints your arrival within the solar year, setting the baseline for your cosmic journey.",\n    slideTitle_req2: "2. The Exact Moment",\n    slideDesc_req2: "Your Birth Time determines the specific lunar phase and the precise position of celestial bodies at your first breath.",\n    slideTitle_req3: "3. The Earthly Coordinates",\n    slideDesc_req3: "Your Birth Place provides the geographical anchor, aligning the celestial map to your exact location on Earth.",\n    slideTitle0: $1,'
);

fs.writeFileSync('src/App.tsx', content);
