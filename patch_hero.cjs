const fs = require('fs');

let content = fs.readFileSync('src/components/WelcomeHero.tsx', 'utf8');

// Change translationKeyId to string | number
content = content.replace(
  /translationKeyId: number/g,
  'translationKeyId: number | string'
);

// Define mandatory slides
const mandatoryCode = `
const mandatorySlides: SlideData[] = [
  { type: 'info', img: cosmicImg, translationKeyId: '_req1' },
  { type: 'info', img: chartImg, translationKeyId: '_req2' },
  { type: 'info', img: mandalaImg, translationKeyId: '_req3' },
];
`;

content = content.replace(
  /const baseSlides: SlideData\[\] = \[/,
  mandatoryCode + '\nconst baseSlides: SlideData[] = ['
);

// Add mandatory slides before shuffled slides
content = content.replace(
  /setSlides\(shuffleArray\(baseSlides\)\);/,
  'setSlides([...mandatorySlides, ...shuffleArray(baseSlides)]);'
);

// Add the 3 Core Details panel
const coreDetailsHtml = `
            {/* Core Details Panel */}
            <div className="space-y-3 bg-[#e8f4f8] p-5 rounded-md border border-[#90cce0]/50 shadow-sm">
              <h3 className="text-lg font-bold text-[#206a85] flex items-center gap-2">
                <Sparkles className="w-5 h-5 shrink-0" /> {t.heroCoreTitle || "Only 3 Details Required"}
              </h3>
              <div className="text-[#3b5d69] text-[0.95rem] leading-relaxed font-medium space-y-2">
                {t.heroCoreDesc || "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint."}
              </div>
            </div>
`;

content = content.replace(
  /\{\/\* The Problem \*\/\}/,
  coreDetailsHtml + '\n            {/* The Problem */}'
);

fs.writeFileSync('src/components/WelcomeHero.tsx', content);
