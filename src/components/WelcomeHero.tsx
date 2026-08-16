import React, { useState, useEffect } from 'react';
import { Sparkles, Target, Compass, HeartHandshake, Star, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Original 10 Images
import cosmicImg from '../assets/images/vedic_astrology_cosmic_alignment_1785337382154.jpg';
import chartImg from '../assets/images/vedic_astrology_chart_1785340607294.jpg';
import celebrationImg from '../assets/images/dharmic_celebration_1785340623014.jpg';
import mandalaImg from '../assets/images/hindu_astrology_mandala_1785396782356.jpg';
import vedicChartImg from '../assets/images/vedic_birth_chart_1785396794961.jpg';
import diwaliImg from '../assets/images/diwali_celebration_diyas_1785396808924.jpg';
import pujaImg from '../assets/images/hindu_puja_fire_1785396819535.jpg';
import moonImg from '../assets/images/moon_over_temple_1785396832104.jpg';
import omImg from '../assets/images/cosmic_om_lotus_1785396844951.jpg';
import panchangImg from '../assets/images/traditional_panchang_calendar_1785396856906.jpg';

// New ISKCON 5 images
import iskconChanting from '../assets/images/iskcon_devotee_chanting_1785406518046.jpg';
import familyAarti from '../assets/images/joyful_family_aarti_1785406535780.jpg';
import peaceTemple from '../assets/images/spiritual_peace_temple_1785406550894.jpg';
import joyfulKirtan from '../assets/images/joyful_kirtan_1785406566866.jpg';
import vedicBlessings from '../assets/images/vedic_blessings_1785406582172.jpg';

// New Testimonial Faces (10)
import face1 from '../assets/images/testimonial_face_1_1785406650096.jpg';
import face2 from '../assets/images/testimonial_face_2_1785406668369.jpg';
import face3 from '../assets/images/testimonial_face_3_1785406687599.jpg';
import face4 from '../assets/images/testi_face_4_1785407195628.jpg';
import face5 from '../assets/images/testi_face_5_1785407210342.jpg';
import face6 from '../assets/images/testi_face_6_1785407222845.jpg';
import face7 from '../assets/images/testi_face_7_1785407234441.jpg';
import face8 from '../assets/images/testi_face_8_1785407246551.jpg';
import face9 from '../assets/images/testi_face_9_1785407258569.jpg';
import face10 from '../assets/images/testi_face_10_1785407271529.jpg';

type SlideData = 
  | { type: 'info'; img: string; translationKeyId: number | string }
  | { type: 'testimonial'; img: string; faceImg: string; translationKeyId: number | string };


const mandatorySlides: SlideData[] = [
  { type: 'info', img: cosmicImg, translationKeyId: '_req1' },
  { type: 'info', img: chartImg, translationKeyId: '_req2' },
  { type: 'info', img: mandalaImg, translationKeyId: '_req3' },
];

const baseSlides: SlideData[] = [
  { type: 'info', img: cosmicImg, translationKeyId: 0 },
  { type: 'info', img: chartImg, translationKeyId: 1 },
  { type: 'info', img: celebrationImg, translationKeyId: 2 },
  { type: 'info', img: mandalaImg, translationKeyId: 3 },
  { type: 'info', img: vedicChartImg, translationKeyId: 4 },
  { type: 'info', img: diwaliImg, translationKeyId: 5 },
  { type: 'info', img: pujaImg, translationKeyId: 6 },
  { type: 'info', img: moonImg, translationKeyId: 7 },
  { type: 'info', img: omImg, translationKeyId: 8 },
  { type: 'info', img: panchangImg, translationKeyId: 9 },
  { type: 'info', img: joyfulKirtan, translationKeyId: 10 },
  { type: 'info', img: familyAarti, translationKeyId: 11 },
  { type: 'info', img: peaceTemple, translationKeyId: 12 },
  { type: 'info', img: vedicBlessings, translationKeyId: 13 },
  { type: 'info', img: iskconChanting, translationKeyId: 14 },

  { type: 'testimonial', img: celebrationImg, faceImg: face1, translationKeyId: 0 },
  { type: 'testimonial', img: familyAarti, faceImg: face2, translationKeyId: 1 },
  { type: 'testimonial', img: peaceTemple, faceImg: face3, translationKeyId: 2 },
  { type: 'testimonial', img: diwaliImg, faceImg: face4, translationKeyId: 3 },
  { type: 'testimonial', img: cosmicImg, faceImg: face5, translationKeyId: 4 },
  { type: 'testimonial', img: mandalaImg, faceImg: face6, translationKeyId: 5 },
  { type: 'testimonial', img: vedicChartImg, faceImg: face7, translationKeyId: 6 },
  { type: 'testimonial', img: pujaImg, faceImg: face8, translationKeyId: 7 },
  { type: 'testimonial', img: omImg, faceImg: face9, translationKeyId: 8 },
  { type: 'testimonial', img: panchangImg, faceImg: face10, translationKeyId: 9 }
];

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function WelcomeHero({ t }: { t: any }) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Shuffle slides on mount
    setSlides([...mandatorySlides, ...shuffleArray(baseSlides)]);
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides]);

  const currentSlide = slides[currentIndex];

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-8 overflow-y-auto print:hidden w-full relative">
       <div className="w-16 h-16 rounded-full bg-white border-2 border-[#e2d1b3] mb-6 flex items-center justify-center shadow-sm text-3xl font-bold text-[#8b0000] shrink-0">
         ॐ
       </div>
       <h2 className="text-xl font-medium mb-3 text-center">{t.welcomeTitle || "Welcome to the Panchang Assistant"}</h2>
       <p className="text-[#5c554a] max-w-md mx-auto text-center leading-relaxed text-sm font-medium mb-8 shrink-0">
         {t.welcomeDesc || "Enter your birth details in the panel and I will compute the correct Dharmic calendar day, matching Tithi and Nakshatra, to help you celebrate your traditional birthday."}
       </p>

       <div className="max-w-3xl w-full bg-white rounded-lg shadow-2xl overflow-hidden border border-[#d1c4b2] z-10 animate-fade-in-up mb-12 shrink-0">
         
         {/* Slideshow Area */}
         <div className="w-full h-72 sm:h-96 relative overflow-hidden bg-black">
            <AnimatePresence mode="wait">
               {currentSlide && (
                 <motion.img
                   key={currentIndex}
                   src={currentSlide.img}
                   initial={{ opacity: 0, scale: 1.05 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 1.2, ease: "easeInOut" }}
                   className="absolute inset-0 w-full h-full object-cover"
                   alt="Astrology Slideshow"
                 />
               )}
            </AnimatePresence>
            
            {/* Overlay Gradient for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white z-10 min-h-[160px] flex flex-col justify-end">
                <AnimatePresence mode="wait">
                  {currentSlide && (
                    <motion.div
                      key={`content-${currentIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      {currentSlide.type === 'info' ? (
                        <>
                          <h2 className="text-xl sm:text-2xl font-bold mb-2 drop-shadow-md text-[#daa520] flex items-center gap-2">
                            <Sparkles className="w-5 h-5 shrink-0" />
                            {t[`slideTitle${currentSlide.translationKeyId}`] || "Celebrate Your True Cosmic Arrival"}
                          </h2>
                          <p className="text-sm sm:text-base opacity-90 font-medium max-w-2xl text-gray-200">
                            {t[`slideDesc${currentSlide.translationKeyId}`] || "Discover your exact Dharmic birthday based on precise Vedic astrology."}
                          </p>
                        </>
                      ) : (
                        <div className="flex flex-col space-y-4">
                           <div className="flex items-start gap-3">
                              <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-[#daa520] shrink-0 opacity-70 mt-1" />
                              <p className="text-sm sm:text-[1.05rem] italic font-medium leading-relaxed max-w-2xl text-gray-100">
                                "{t[`testiText${currentSlide.translationKeyId}`]}"
                              </p>
                           </div>
                           <div className="flex items-center gap-3 ml-9 sm:ml-11">
                              <img src={currentSlide.faceImg} alt="Testimonial Author" className="w-10 h-10 rounded-full object-cover border-2 border-[#daa520]" />
                              <span className="text-[#daa520] font-bold text-sm">— {t[`testiAuthor${currentSlide.translationKeyId}`]}</span>
                           </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
         </div>

         <div className="p-6 sm:p-8 text-left space-y-8 bg-[#fdfcfb]">
            
            {/* Core Details Panel */}
            <div className="space-y-3 bg-[#fdfcfb] p-5 rounded-md border border-[#d1c4b2] shadow-sm">
              <h3 className="text-lg font-bold text-[#8b4513] flex items-center gap-2">
                <Sparkles className="w-5 h-5 shrink-0" /> {t.heroCoreTitle || "Only 3 Details Required"}
              </h3>
              <div className="text-[#5c554a] text-[0.95rem] leading-relaxed font-medium space-y-2">
                {t.heroCoreDesc || "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint."}
              </div>
            </div>

            {/* The Problem */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-[#8b0000] flex items-center gap-2">
                <Compass className="w-5 h-5 shrink-0" /> {t.heroProblemTitle}
              </h3>
              <div className="text-[#2d2a26] text-[0.95rem] leading-relaxed font-medium space-y-2">
                {t.heroProblemDesc}
              </div>
            </div>

            {/* The Solution */}
            <div className="space-y-3 bg-[#fff9e6] p-5 rounded-md border border-[#daa520]/30 shadow-sm">
              <h3 className="text-lg font-bold text-[#daa520] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#8b0000] shrink-0" /> {t.heroSolutionTitle}
              </h3>
              <div className="text-[#5c554a] text-[0.95rem] leading-relaxed font-medium space-y-2">
                {t.heroSolutionDesc}
              </div>
            </div>

            {/* Who is it for & Why it's the best */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#e2d1b3]">
               <div className="space-y-2">
                  <h4 className="font-bold text-[#8b0000] text-[0.9rem] mb-2 flex items-center gap-2">
                     <HeartHandshake className="w-4 h-4 shrink-0"/> 
                     {t.heroWhoTitle}
                  </h4>
                  <div className="text-[0.85rem] text-[#5c554a] leading-relaxed space-y-2">
                    {t.heroWhoDesc}
                  </div>
               </div>
               <div className="space-y-2">
                  <h4 className="font-bold text-[#8b0000] text-[0.9rem] mb-2 flex items-center gap-2">
                     <Star className="w-4 h-4 shrink-0"/> 
                     {t.heroWhyTitle}
                  </h4>
                  <div className="text-[0.85rem] text-[#5c554a] leading-relaxed space-y-2">
                    {t.heroWhyDesc}
                  </div>
               </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 pt-4 border-t border-[#e2d1b3] opacity-80">
               <div className="space-y-2">
                  <h4 className="font-bold text-[#8b0000] text-[0.8rem] mb-1 flex items-center gap-2">
                     <span className="text-xs">⚠️</span> {t.heroDisclaimerTitle}
                  </h4>
                  <div className="text-[0.7rem] text-[#5c554a] leading-relaxed text-justify">
                    {t.heroDisclaimerDesc}
                  </div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}
