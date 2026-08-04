const fs = require('fs');

let app = fs.readFileSync('src/components/WelcomeHero.tsx', 'utf-8');

// Insert 3 new slides for the mandatory details at the top of the array
const baseSlidesReplacement = `const baseSlides: SlideData[] = [
  { type: 'info', img: panchangImg, translationKeyId: 15 },
  { type: 'info', img: chartImg, translationKeyId: 16 },
  { type: 'info', img: vedicChartImg, translationKeyId: 17 },
`;

app = app.replace('const baseSlides: SlideData[] = [', baseSlidesReplacement);

// Add the hero section about mandatory details
const problemSection = `            {/* The Problem */}`;
const requiredSection = `            {/* Required Details */}
            <div className="space-y-3 bg-[#e6f4ff] p-5 rounded-md border border-[#90cdf4] shadow-sm mb-6">
              <h3 className="text-lg font-bold text-[#2b6cb0] flex items-center gap-2">
                <Target className="w-5 h-5 shrink-0" /> {t.heroRequiredTitle || "Only 3 Details Required"}
              </h3>
              <div className="text-[#2c5282] text-[0.95rem] leading-relaxed font-medium space-y-2">
                {t.heroRequiredDesc || (
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Exact Date of Birth:</strong> Day, Month, and Year</li>
                    <li><strong>Exact Time of Birth:</strong> Hours and Minutes</li>
                    <li><strong>Place of Birth:</strong> City or coordinates</li>
                  </ul>
                )}
                <p className="mt-2 text-[0.85rem] italic">
                  Note: Nakshatra, Paksha, Tithi, and Lunar Month are optional! Our advanced AI models will calculate these four details for you accurately.
                </p>
              </div>
            </div>

            {/* The Problem */}`;

app = app.replace(problemSection, requiredSection);

fs.writeFileSync('src/components/WelcomeHero.tsx', app);
console.log('Slides and hero section updated in WelcomeHero.tsx');
