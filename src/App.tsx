import React, { useState, useRef, useEffect } from "react";
import { Send, MapPin, Calendar, Clock, Star, Moon, CalendarDays, Loader2, Info, Printer, Globe, Share2, Download, LogIn, LogOut, History, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { Timeline, ProjectionDate } from "./components/Timeline";
import { LocationMap } from "./components/LocationMap";
import { auth, db } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs, setDoc, doc, where, deleteDoc } from "firebase/firestore";

type SearchConfig = {
  id: string;
  userId?: string;
  createdAt?: number;
  label: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timezone: string;
  nakshatra: string;
  paksha: string;
  tithi: string;
  lunarMonth: string;
  targetYearRange: string;
};

type MessageItem = {
  id: string;
  role: "user" | "model";
  text: string;
  jsonArray?: ProjectionDate[];
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima", "Amavasya"];
const LUNAR_MONTHS = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashvin", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna", "Adhik Maas"];
const TIMEZONES = [
  "IST (UTC+5:30) - India",
  "EST (UTC-5:00) - Eastern US",
  "CST (UTC-6:00) - Central US",
  "PST (UTC-8:00) - Pacific US",
  "GMT (UTC+0:00) - London",
  "BST (UTC+1:00) - British Summer",
  "CET (UTC+1:00) - Central Europe",
  "GST (UTC+4:00) - Gulf Standard",
  "SGT (UTC+8:00) - Singapore",
  "AEST (UTC+10:00) - Australian Eastern"
];

const POPULAR_INDIAN_CITIES = [
  "New Delhi, NCT, India",
  "Mumbai, Maharashtra, India",
  "Varanasi, Uttar Pradesh, India",
  "Chennai, Tamil Nadu, India",
  "Kolkata, West Bengal, India",
  "Hyderabad, Telangana, India",
  "Bangalore, Karnataka, India",
  "Pune, Maharashtra, India",
  "Ahmedabad, Gujarat, India",
  "Surat, Gujarat, India",
];

function LocationInput({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>(POPULAR_INDIAN_CITIES.map(c => ({ id: c, label: c })));
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && query !== value && query.length > 2) {
        setIsSearching(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`, {
              headers: {
                  'Accept-Language': 'en-US,en;q=0.9',
                  'User-Agent': 'DharmaCalendarAssistant/1.0 (mhkgupta@gmail.com)'
              }
          });
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setResults(data.map((r: any) => ({
              id: r.place_id,
              label: r.display_name
            })));
          } else {
             setResults([]);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
          setIsOpen(true);
        }
      } else if (!query) {
        setResults(POPULAR_INDIAN_CITIES.map(c => ({ id: c, label: c })));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, value]);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { 
             setQuery(e.target.value); 
             onChange(e.target.value);
             if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
             setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (isOpen && results.length > 0) {
                 const firstResult = results[0];
                 onChange(firstResult.label);
                 setQuery(firstResult.label);
                 setIsOpen(false);
              }
            }
          }}
          className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] pr-8"
        />
        {isSearching && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b4513]">
             <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>
      <AnimatePresence>
      {isOpen && !isSearching && results.length > 0 && (
         <motion.div 
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto bg-white border border-[#d1c4b2] mt-1 rounded-[4px] shadow-lg z-50 overflow-x-hidden"
         >
            {results.map((r) => (
               <div 
                 key={r.id} 
                 onClick={() => {
                    onChange(r.label);
                    setQuery(r.label);
                    setIsOpen(false);
                 }}
                 className="px-3 py-2 text-[0.85rem] cursor-pointer hover:bg-[#f9f7f2] border-b border-[#e2d1b3] last:border-0 truncate"
               >
                 {r.label}
               </div>
            ))}
         </motion.div>
      )}
      {isOpen && !isSearching && query.length > 2 && results.length === 0 && (
         <motion.div 
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto bg-white border border-[#d1c4b2] mt-1 rounded-[4px] shadow-lg z-50 overflow-x-hidden p-3 text-[0.85rem] text-gray-500 text-center"
         >
            No places found for "{query}"
         </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  EN: {
    birthDetails: "Birth Details",
    birthDate: "Birth Date",
    birthTime: "Birth Time",
    birthPlace: "Birth Place",
    timezone: "Timezone",
    tradData: "Traditional Data",
    nakshatra: "Nakshatra",
    paksha: "Paksha",
    tithi: "Tithi",
    lunarMonth: "Lunar Month",
    searchRange: "Search Range & Notes",
    targetYears: "Target Year(s)",
    notes: "Notes or Questions",
    findBday: "Find My Dharmic Birthday",
    select: "Select",
    selectTimezone: "Select Timezone",
    footer: "Made with ❤️ in Berlin by HaBER Software Solutions",
    cookieText: "We use essential cookies to keep you logged in and save your preferences. We do not use tracking cookies.",
    privacyPolicy: "Privacy Policy",
    gotIt: "Got it",
    legalNotice: "Legal Notice",
    terms: "Terms & Conditions",
    imprint: "Imprint",
    appName: "FIND MY DHARMIC BIRTHDAY",
    subtitle1: "Precision Panchang & Tithi Converter",
    subtitle2: "Precision Panchang & Tithi Converter - Astrological Assessment",
    welcomeTitle: "Welcome to the Panchang Assistant",
    welcomeDesc: "Enter your birth details in the panel and I will compute the correct Dharmic calendar day, matching Tithi and Nakshatra, to help you celebrate your traditional birthday.",
    mapHint: "You can click on the map to fine-tune your location.",
    login: "Login",
    logout: "Logout",
    history: "History",
    syncHistory: "Login to sync history",
    privacyNoticeTitle: "Privacy Notice",
    privacyNoticeDesc: "Your astrological data is only processed for this session and will not be stored permanently.",
    searchHistory: "Search History",
    locationPlaceholder: "e.g. New Delhi, India",
    tooltipDate: "Used to calculate the precise day of your birth in the Gregorian calendar.",
    tooltipTime: "Time of birth is critical for accurate Tithi and Nakshatra calculation, as they change throughout the day.",
    tooltipPlace: "Sunrise and moon phases vary by location. Enter your city or town name. Select an option or type directly.",
    tooltipTimezone: "The local timezone offset at the time of your birth. Helps verify the exact universal time.",
    tooltipNakshatra: "The birth star or lunar mansion occupied by the Moon at your birth.",
    tooltipPaksha: "The fortnight of the lunar month. Shukla is waxing (bright), Krishna is waning (dark).",
    tooltipTithi: "The lunar day. Crucial for celebrating traditional Dharmic birthdays.",
    tooltipMonth: "The lunar month in which you were born (e.g., Chaitra, Vaishakha).",
    tooltipTargetYear: "Specify the year or range of years for which you want to find your traditional birthday date.",
    tooltipNotes: "Specify special calculation methods (like Amanta or Purnimanta) or add context to your inquiry.",
    calculating: "Calculating...",
    calculatingPanchang: "CALCULATING PANCHANG ALIGNMENTS...",
    targetYearPlaceholder: "e.g. 2026 or 2025-2030",
    notesPlaceholder: "Specific tradition (e.g. Amanta) or questions?",
    followupPlaceholder: "Ask a follow up question..."
  },
  DE: {
    birthDetails: "Geburtsdaten",
    birthDate: "Geburtsdatum",
    birthTime: "Geburtszeit",
    birthPlace: "Geburtsort",
    timezone: "Zeitzone",
    tradData: "Traditionelle Daten",
    nakshatra: "Nakshatra (Sternzeichen)",
    paksha: "Paksha (Mondphase)",
    tithi: "Tithi (Mondtag)",
    lunarMonth: "Mondmonat",
    searchRange: "Suchbereich & Notizen",
    targetYears: "Zieljahr(e)",
    notes: "Notizen oder Fragen",
    findBday: "Finde meinen Dharmic-Geburtstag",
    select: "Auswählen",
    selectTimezone: "Zeitzone auswählen",
    footer: "Mit ❤️ in Berlin entwickelt von HaBER Software Solutions",
    cookieText: "Wir verwenden essenzielle Cookies, um Sie angemeldet zu halten und Ihre Einstellungen zu speichern. Wir verwenden keine Tracking-Cookies.",
    privacyPolicy: "Datenschutzerklärung",
    gotIt: "Verstanden",
    legalNotice: "Rechtliche Hinweise",
    terms: "AGB",
    imprint: "Impressum",
    appName: "FINDE MEINEN DHARMIC-GEBURTSTAG",
    subtitle1: "Präziser Panchang & Tithi Konverter",
    subtitle2: "Präziser Panchang & Tithi Konverter - Astrologische Bewertung",
    welcomeTitle: "Willkommen beim Panchang-Assistenten",
    welcomeDesc: "Geben Sie Ihre Geburtsdaten ein und ich berechne den korrekten dharmischen Kalendertag, passend zu Tithi und Nakshatra, um Ihnen zu helfen, Ihren traditionellen Geburtstag zu feiern.",
    mapHint: "Sie können auf die Karte klicken, um Ihren Standort genauer zu bestimmen.",
    login: "Anmelden",
    logout: "Abmelden",
    history: "Verlauf",
    syncHistory: "Anmelden zum Verlauf-Synchronisieren",
    privacyNoticeTitle: "Datenschutzhinweis",
    privacyNoticeDesc: "Ihre astrologischen Daten werden nur für diese Sitzung verarbeitet und nicht dauerhaft gespeichert.",
    searchHistory: "Suchverlauf",
    locationPlaceholder: "z.B. Neu-Delhi, Indien",
    tooltipDate: "Wird verwendet, um den genauen Tag Ihrer Geburt im gregorianischen Kalender zu berechnen.",
    tooltipTime: "Die Geburtszeit ist entscheidend für die genaue Tithi- und Nakshatra-Berechnung, da sie sich im Laufe des Tages ändern.",
    tooltipPlace: "Sonnenaufgang und Mondphasen variieren je nach Standort. Geben Sie den Namen Ihrer Stadt ein.",
    tooltipTimezone: "Die lokale Zeitzonenverschiebung zum Zeitpunkt Ihrer Geburt. Hilft bei der Überprüfung der genauen Weltzeit.",
    tooltipNakshatra: "Der Geburtsstern oder die Mondstation, die der Mond bei Ihrer Geburt einnahm.",
    tooltipPaksha: "Die vierzehn Tage des Mondmonats. Shukla ist zunehmend (hell), Krishna ist abnehmend (dunkel).",
    tooltipTithi: "Der Mondtag. Entscheidend für das Feiern traditioneller dharmischer Geburtstage.",
    tooltipMonth: "Der Mondmonat, in dem Sie geboren wurden (z. B. Chaitra, Vaishakha).",
    tooltipTargetYear: "Geben Sie das Jahr oder den Zeitraum an, für den Sie Ihr traditionelles Geburtsdatum finden möchten.",
    tooltipNotes: "Geben Sie spezielle Berechnungsmethoden an (wie Amanta oder Purnimanta) oder fügen Sie Ihrer Anfrage Kontext hinzu.",
    calculating: "Berechne...",
    calculatingPanchang: "BERECHNE PANCHANG-AUSRICHTUNG...",
    targetYearPlaceholder: "z.B. 2026 oder 2025-2030",
    notesPlaceholder: "Spezielle Tradition (z.B. Amanta) oder Fragen?",
    followupPlaceholder: "Stellen Sie eine Anschlussfrage..."
  },
  HI: {
    birthDetails: "जन्म विवरण (Janma Vivarana)",
    birthDate: "दिनांक (Dinanka)",
    birthTime: "समय (Samaya)",
    birthPlace: "स्थान (Sthana)",
    timezone: "समय क्षेत्र (Samaya Kshetra)",
    tradData: "पारंपरिक डेटा (Paramparik Data)",
    nakshatra: "नक्षत्र (Nakshatra)",
    paksha: "पक्ष (Paksha)",
    tithi: "तिथि (Tithi)",
    lunarMonth: "मास (Masa)",
    searchRange: "खोज सीमा (Khoj Seema)",
    targetYears: "वर्ष (Varsha)",
    notes: "टिप्पणियाँ (Tippaniyan)",
    findBday: "खोजें (Khojen)",
    select: "चुनें (Chunen)",
    selectTimezone: "समय क्षेत्र चुनें",
    footer: "बर्लिन से ❤️ के साथ - HaBER Software Solutions",
    cookieText: "हम आपको लॉग इन रखने और आपकी प्राथमिकताएं सहेजने के लिए आवश्यक कुकीज़ का उपयोग करते हैं। हम ट्रैकिंग कुकीज़ का उपयोग नहीं करते हैं।",
    privacyPolicy: "गोपनीयता नीति (Privacy Policy)",
    gotIt: "समझ गया (Got it)",
    legalNotice: "कानूनी सूचना (Legal Notice)",
    terms: "नियम और शर्तें (Terms & Conditions)",
    imprint: "छाप (Imprint)",
    appName: "मेरा धर्मिक जन्मदिन खोजें",
    subtitle1: "सटीक पंचांग और तिथि कनवर्टर",
    subtitle2: "सटीक पंचांग और तिथि कनवर्टर - ज्योतिषीय मूल्यांकन",
    welcomeTitle: "पंचांग सहायक में आपका स्वागत है",
    welcomeDesc: "पैनल में अपना जन्म विवरण दर्ज करें और मैं आपके पारंपरिक जन्मदिन का जश्न मनाने में मदद करने के लिए तिथि और नक्षत्र से मेल खाने वाले सही धर्मिक कैलेंडर दिन की गणना करूंगा।",
    mapHint: "आप अपने स्थान को और सटीक बनाने के लिए मानचित्र पर क्लिक कर सकते हैं।",
    login: "लॉग इन करें",
    logout: "लॉग आउट करें",
    history: "इतिहास",
    syncHistory: "इतिहास सिंक करने के लिए लॉग इन करें",
    privacyNoticeTitle: "गोपनीयता सूचना",
    privacyNoticeDesc: "आपका ज्योतिषीय डेटा केवल इस सत्र के लिए संसाधित किया जाता है और स्थायी रूप से संग्रहीत नहीं किया जाएगा।",
    searchHistory: "खोज इतिहास",
    locationPlaceholder: "उदा. नई दिल्ली, भारत",
    tooltipDate: "ग्रेगोरियन कैलेंडर में आपके जन्म के सटीक दिन की गणना करने के लिए उपयोग किया जाता है।",
    tooltipTime: "सटीक तिथि और नक्षत्र गणना के लिए जन्म का समय महत्वपूर्ण है, क्योंकि वे पूरे दिन बदलते रहते हैं।",
    tooltipPlace: "सूर्योदय और चंद्रमा के चरण स्थान के अनुसार भिन्न होते हैं। अपने शहर या कस्बे का नाम दर्ज करें।",
    tooltipTimezone: "आपके जन्म के समय स्थानीय समय क्षेत्र ऑफसेट। सटीक सार्वभौमिक समय को सत्यापित करने में मदद करता है।",
    tooltipNakshatra: "जन्म तारा या चंद्र हवेली जो आपके जन्म के समय चंद्रमा द्वारा कब्जा कर ली गई थी।",
    tooltipPaksha: "चंद्र मास का पखवाड़ा। शुक्ल पक्ष पूर्णिमा (उज्ज्वल) है, कृष्ण पक्ष अमावस्या (अंधेरा) है।",
    tooltipTithi: "चंद्रमा का दिन। पारंपरिक धर्मिक जन्मदिन मनाने के लिए महत्वपूर्ण है।",
    tooltipMonth: "चंद्र मास जिसमें आपका जन्म हुआ था (पूर्णिमा, अमावस्या)।",
    tooltipTargetYear: "वह वर्ष या वर्षों की सीमा निर्दिष्ट करें जिसके लिए आप अपना पारंपरिक जन्मदिन दिनांक खोजना चाहते हैं।",
    tooltipNotes: "विशेष गणना विधियों (जैसे अमांत या पूर्णिमांत) को निर्दिष्ट करें या अपनी पूछताछ में संदर्भ जोड़ें।",
    calculating: "गणना हो रही है...",
    calculatingPanchang: "पंचांग संरेखण की गणना...",
    targetYearPlaceholder: "उदा. 2026 या 2025-2030",
    notesPlaceholder: "विशिष्ट परंपरा (जैसे अमांत) या प्रश्न?",
    followupPlaceholder: "एक अनुवर्ती प्रश्न पूछें..."
  },
  TE: {
    birthDetails: "జనన వివరాలు (Janana Vivaralu)",
    birthDate: "తేదీ (Thedi)",
    birthTime: "సమయం (Samayam)",
    birthPlace: "స్థలం (Sthalam)",
    timezone: "సమయ క్షేత్రం (Samaya Kshetram)",
    tradData: "సాంప్రదాయ డేటా (Sampradaya Data)",
    nakshatra: "నక్షత్రం (Nakshatram)",
    paksha: "పక్షం (Paksham)",
    tithi: "తిథి (Tithi)",
    lunarMonth: "చంద్ర మాసం (Lunar Month)",
    searchRange: "శోధన పరిధి (Search Range)",
    targetYears: "లక్ష్య సంవత్సరం(లు) (Target Years)",
    notes: "గమనికలు (Notes)",
    findBday: "కనుగొనండి (Kanugonandi)",
    select: "ఎంచుకోండి (Select)",
    selectTimezone: "సమయ క్షేత్రాన్ని ఎంచుకోండి",
    footer: "బెర్లిన్ నుండి ❤️తో, మీ కోసం - HaBER Software Solutions",
    cookieText: "మిమ్మల్ని లాగిన్ చేసి ఉంచడానికి మరియు మీ ప్రాధాన్యతలను సేవ్ చేయడానికి మేము అత్యవసర కుక్కీలను ఉపయోగిస్తాము. మేము ట్రాకింగ్ కుక్కీలను ఉపయోగించము.",
    privacyPolicy: "గోప్యతా విధానం (Privacy Policy)",
    gotIt: "అర్థమైంది (Got it)",
    legalNotice: "చట్టపరమైన నోటీసు (Legal Notice)",
    terms: "నిబంధనలు & షరతులు (Terms & Conditions)",
    imprint: "ముద్ర (Imprint)",
    appName: "నా ధార్మిక పుట్టినరోజును కనుగొనండి",
    subtitle1: "ఖచ్చితమైన పంచాంగం & తిథి కన్వర్టర్",
    subtitle2: "ఖచ్చితమైన పంచాంగం & తిథి కన్వర్టర్ - జ్యోతిష్య అంచనా",
    welcomeTitle: "పంచాంగ సహాయకారికి స్వాగతం",
    welcomeDesc: "ప్యానల్‌లో మీ జనన వివరాలను నమోదు చేయండి మరియు మీ సాంప్రదాయ పుట్టినరోజును జరుపుకోవడంలో సహాయపడటానికి నేను సరైన ధార్మిక క్యాలెండర్ రోజును, తిథి మరియు నక్షత్రానికి సరిపోలేలా గణిస్తాను.",
    mapHint: "మీ స్థానాన్ని మరింత కచ్చితంగా మార్చడానికి మీరు మ్యాప్‌పై క్లిక్ చేయవచ్చు.",
    login: "లాగిన్ చేయండి",
    logout: "లాగ్అవుట్ చేయండి",
    history: "చరిత్ర",
    syncHistory: "చరిత్రను సింక్ చేయడానికి లాగిన్ చేయండి",
    privacyNoticeTitle: "గోప్యతా నోటీసు",
    privacyNoticeDesc: "మీ జ్యోతిష్య డేటా ఈ సెషన్ కోసం మాత్రమే ప్రాసెస్ చేయబడుతుంది మరియు శాశ్వతంగా నిల్వ చేయబడదు.",
    searchHistory: "శోధన చరిత్ర",
    locationPlaceholder: "ఉదా. న్యూఢిల్లీ, భారతదేశం",
    tooltipDate: "గ్రెగోరియన్ క్యాలెండర్‌లో మీ పుట్టిన ఖచ్చితమైన రోజును లెక్కించడానికి ఉపయోగించబడుతుంది.",
    tooltipTime: "ఖచ్చితమైన తిథి మరియు నక్షత్ర గణన కోసం పుట్టిన సమయం కీలకం, ఎందుకంటే అవి రోజంతా మారుతూ ఉంటాయి.",
    tooltipPlace: "సూర్యోదయం మరియు చంద్ర దశలు స్థానాన్ని బట్టి మారుతాయి. మీ ప్రదేశం పేరును నమోదు చేయండి.",
    tooltipTimezone: "మీరు పుట్టిన సమయంలో స్థానిక సమయ క్షేత్రం ఆఫ్సెట్. ఖచ్చితమైన సమయాన్ని ధృవీకరించడానికి సహాయపడుతుంది.",
    tooltipNakshatra: "మీ పుట్టిన సమయంలో చంద్రునిచే ఆక్రమించబడిన జన్మ నక్షత్రం.",
    tooltipPaksha: "చంద్రుని దశ. శుక్ల పక్షం క్షీణిస్తోంది (ప్రకాశవంతమైనది), కృష్ణ పక్షం క్షీణిస్తుంది (చీకటి).",
    tooltipTithi: "చంద్ర రోజు. సాంప్రదాయ ధార్మిక పుట్టినరోజులు జరుపుకోవడానికి ముఖ్యమైనది.",
    tooltipMonth: "మీరు జన్మించిన చంద్ర మాసం (ఉదా., చైత్ర, వైశాఖ).",
    tooltipTargetYear: "మీరు మీ సాంప్రదాయ పుట్టినరోజు తేదీని కనుగొనవలసిన సంవత్సరం లేదా సంవత్సరాల పరిధిని పేర్కొనండి.",
    tooltipNotes: "ప్రత్యేక గణన పద్ధతులను (అమంత లేదా పూర్ణిమంత వంటివి) పేర్కొనండి లేదా మీ వివరణను జోడించండి.",
    calculating: "గణిస్తోంది...",
    calculatingPanchang: "పంచాంగ సమలేఖనాలను గణిస్తోంది...",
    targetYearPlaceholder: "ఉదా. 2026 లేదా 2025-2030",
    notesPlaceholder: "నిర్దిష్ట సంప్రదాయం (ఉదా. అమంత) లేదా ప్రశ్నలు?",
    followupPlaceholder: "తదుపరి ప్రశ్న అడగండి..."
  }
};

const InfoTooltip = ({ content }: { content: string }) => (
  <div className="relative group inline-flex items-center ml-1.5 focus-within:z-50 print:hidden">
    <Info className="w-3.5 h-3.5 text-[#8b4513] opacity-70 cursor-help" />
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-[#2d2a26] text-white text-[11px] leading-tight rounded-[4px] shadow-md z-[100] pointer-events-none text-center">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-[#2d2a26]" />
    </div>
  </div>
);

export default function App() {
  const [uiLang, setUiLang] = useState<"EN" | "DE" | "HI" | "TE">("EN");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardConfigs, setDashboardConfigs] = useState<SearchConfig[]>([]);

  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showImprint, setShowImprint] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('dharma_cookie_consent');
    if (!cookieConsent) {
      const timer = setTimeout(() => setShowCookieBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('dharma_cookie_consent', 'true');
    setShowCookieBanner(false);
  };

  // Form State
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [debouncedBirthPlace, setDebouncedBirthPlace] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBirthPlace(birthPlace);
    }, 800);
    return () => clearTimeout(timer);
  }, [birthPlace]);

  const [timezone, setTimezone] = useState("");
  const [nakshatra, setNakshatra] = useState("");
  const [tithi, setTithi] = useState("");
  const [paksha, setPaksha] = useState("");
  const [lunarMonth, setLunarMonth] = useState("");
  const [targetYearRange, setTargetYearRange] = useState(new Date().getFullYear().toString());
  const [notes, setNotes] = useState("");
  const [recentConfigs, setRecentConfigs] = useState<SearchConfig[]>([]);

  const t = TRANSLATIONS[uiLang];

  const scrollToBottom = () => {
    // Only scroll if not printing
    if (!window.matchMedia('print').matches) {
       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchConfigs = async () => {
        try {
          const q = query(
            collection(db, "users", user.uid, "searches"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(3)
          );
          const snap = await getDocs(q);
          const configs: SearchConfig[] = [];
          snap.forEach(d => configs.push(d.data() as SearchConfig));
          setRecentConfigs(configs);
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, `users/${user.uid}/searches`);
        }
      };
      fetchConfigs();
    } else {
      try {
        const stored = localStorage.getItem('dharma_recent_configs');
        if (stored) {
          setRecentConfigs(JSON.parse(stored));
        } else {
          setRecentConfigs([]);
        }
      } catch(e) {}
    }
  }, [user]);

  const saveConfig = async () => {
     if (!birthDate && !birthPlace) return;
     const config: SearchConfig = {
        id: Date.now().toString(),
        userId: user ? user.uid : "local",
        createdAt: Date.now(),
        label: `${birthDate || 'No Date'} - ${birthPlace || 'No Place'}`,
        birthDate, birthTime, birthPlace, timezone, nakshatra, paksha, tithi, lunarMonth, targetYearRange
     };
     const isDuplicate = recentConfigs.some(c => 
         c.birthDate === config.birthDate && 
         c.birthPlace === config.birthPlace && 
         c.birthTime === config.birthTime
     );
     
     if (isDuplicate) return;

     const newConfigs = [config, ...recentConfigs].slice(0, 3);
     setRecentConfigs(newConfigs);
     
     if (user) {
        try {
           await setDoc(doc(db, "users", user.uid, "searches", config.id), config);
        } catch(e) {
           handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/searches/${config.id}`);
        }
     } else {
        localStorage.setItem('dharma_recent_configs', JSON.stringify(newConfigs));
     }
  };

  const loadDashboard = async () => {
     if (!user) return;
     try {
       const q = query(
         collection(db, "users", user.uid, "searches"),
         where("userId", "==", user.uid),
         orderBy("createdAt", "desc")
       );
       const snap = await getDocs(q);
       const configs: SearchConfig[] = [];
       snap.forEach(d => configs.push(d.data() as SearchConfig));
       setDashboardConfigs(configs);
     } catch (e) {
       handleFirestoreError(e, OperationType.LIST, `users/${user.uid}/searches`);
     }
  };

  useEffect(() => {
     if (showDashboard && user) {
        loadDashboard();
     }
  }, [showDashboard, user]);

  const handleDeleteConfig = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) return;
      try {
         await deleteDoc(doc(db, "users", user.uid, "searches", id));
         setDashboardConfigs(prev => prev.filter(c => c.id !== id));
         setRecentConfigs(prev => prev.filter(c => c.id !== id));
      } catch (err) {
         handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/searches/${id}`);
      }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseJsonBlock = (text: string) => {
     let cleanText = text;
     let extractedJson: any[] | undefined = undefined;
     const jsonRegex = /```json\n([\s\S]*?)\n```/g;
     const match = jsonRegex.exec(text);
     
     if (match && match[1]) {
       try {
         const parsed = JSON.parse(match[1]);
         if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].year) {
             extractedJson = parsed;
             // Remove the json block from the text so we don't display it raw
             cleanText = cleanText.replace(match[0], '');
         }
       } catch(e) {}
     }
     return { cleanText, extractedJson };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    let userPrompt = "Here are my details for finding the equivalent Dharmic birthday:\n\n";
    if (birthDate) userPrompt += `- Birth Date: ${birthDate}\n`;
    if (birthTime) userPrompt += `- Birth Time: ${birthTime}\n`;
    if (birthPlace) userPrompt += `- Birth Place: ${birthPlace}\n`;
    if (timezone) userPrompt += `- Timezone: ${timezone}\n`;
    if (nakshatra) userPrompt += `- Nakshatra: ${nakshatra}\n`;
    if (tithi) userPrompt += `- Tithi: ${tithi}\n`;
    if (paksha) userPrompt += `- Paksha: ${paksha}\n`;
    if (lunarMonth) userPrompt += `- Lunar Month: ${lunarMonth}\n`;
    if (targetYearRange) userPrompt += `- Target Year / Range: ${targetYearRange}\n`;
    if (notes) userPrompt += `- Additional Notes: ${notes}\n`;

    if (userPrompt === "Here are my details for finding the equivalent Dharmic birthday:\n\n") {
       userPrompt = "Hi, can you help me find my Dharmic birthday?";
    }

    userPrompt += `\n\nPlease reply primarily in ${uiLang === 'DE' ? 'German' : uiLang === 'HI' ? 'Hindi' : uiLang === 'TE' ? 'Telugu' : 'English'}. Additionally, provide a 5-year projection of this birthday from the target year forward. Return this 5-year projection as a JSON array inside a markdown block starting exactly with \`\`\`json. Each object MUST have exactly these keys: { "year": number, "gregorianDate": "YYYY-MM-DD", "weekday": "Monday" }.`;

    const newUserMsg: MessageItem = { id: Date.now().toString(), role: "user", text: userPrompt };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsLoading(true);
    saveConfig();

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      const { cleanText, extractedJson } = parseJsonBlock(data.text);
      const modelMsg: MessageItem = { id: Date.now().toString() + "_m", role: "model", text: cleanText.trim(), jsonArray: extractedJson };
      setMessages([...newMessages, modelMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = { 
        id: Date.now().toString() + "_e", 
        role: "model", 
        text: `**Error:** ${err.message}. Please check your App API settings or try again.`
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setBirthDate("");
    setBirthTime("");
    setBirthPlace("");
    setTimezone("");
    setNakshatra("");
    setTithi("");
    setPaksha("");
    setLunarMonth("");
    setNotes("");
    setTargetYearRange(new Date().getFullYear().toString());
  };

  const handleShare = async () => {
    const aiMessages = messages.filter(m => m.role === 'model');
    if (aiMessages.length === 0) return;
    const lastAssessment = aiMessages[aiMessages.length - 1].text;
    const shareText = `Dharma Calendar Assistant Assessment:\n\n${lastAssessment}`;
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Astrological Assessment', text: shareText });
        } catch (e) {
            console.error(e);
        }
    } else {
        await navigator.clipboard.writeText(shareText);
        alert("Assessment copied to clipboard!");
    }
  };

  const exportToCsv = () => {
    const messagesWithJson = messages.filter(m => m.jsonArray && m.jsonArray.length > 0);
    if (messagesWithJson.length === 0) return;
    const lastJson = messagesWithJson[messagesWithJson.length - 1].jsonArray!;
    
    const headers = ["Year", "Gregorian Date", "Weekday"];
    const csvRows = [headers.join(",")];
    lastJson.forEach(row => {
        csvRows.push(`${row.year},${row.gregorianDate},${row.weekday}`);
    });
    const csvStr = csvRows.join("\n");
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projection_${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasProjectionData = messages.some(m => m.jsonArray && m.jsonArray.length > 0);

  return (
    <div className="flex flex-col h-screen bg-[#f9f7f2] text-[#2d2a26] font-sans overflow-hidden">
      <header className="border-b-[4px] border-[#daa520] bg-[#8b0000] shrink-0 h-16 px-8 flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#daa520] text-[#8b0000] rounded-[4px] flex items-center justify-center font-bold text-xl leading-none">
            ॐ
          </div>
          <div className="flex flex-col text-white">
            <h1 className="text-[1.1rem] font-bold tracking-[0.02em] leading-tight">{t.appName}</h1>
            <span className="text-[0.8rem] opacity-90 leading-tight">{t.subtitle1}</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          {!authLoading && (
            <div className="flex items-center space-x-2 mr-2">
              {user ? (
                <>
                  <button
                    onClick={() => setShowDashboard(true)}
                    className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider mr-3"
                    title={t.history}
                  >
                    <span>{t.history}</span>
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => signOut(auth)}
                    className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider"
                    title={t.logout}
                  >
                    <span>{t.logout}</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                  className="flex items-center space-x-1 text-xs font-bold text-[#daa520] border border-[#daa520]/50 hover:bg-[#daa520]/10 px-2 py-1 rounded-[4px] transition-colors uppercase tracking-wider"
                  title={t.syncHistory}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t.login}</span>
                </button>
              )}
            </div>
          )}
          <div className="flex items-center bg-[#6b0000] rounded-[4px] p-1 text-xs">
             <Globe className="w-3.5 h-3.5 text-white/70 mx-2" />
             {(["EN", "DE", "HI", "TE"] as const).map(l => (
               <button
                 key={l}
                 onClick={() => setUiLang(l)}
                 className={`px-2 py-1 rounded-[2px] font-bold transition-colors ${uiLang === l ? "bg-[#daa520] text-[#8b0000]" : "text-white/80 hover:text-white"}`}
               >
                 {l}
               </button>
             ))}
          </div>
          {messages.length > 0 && (
            <>
              <button 
                onClick={handleShare}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Share Result"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {hasProjectionData && (
                 <button 
                   onClick={exportToCsv}
                   className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                   title="Export to CSV"
                 >
                   <Download className="w-4 h-4" />
                 </button>
              )}
              <button 
                onClick={() => window.print()}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Print Result"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button 
                onClick={handleClear}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors uppercase tracking-wider"
              >
                Reset Flow
              </button>
            </>
          )}
        </div>
      </header>

      {/* Header specifically for printing */}
      <div className="hidden print:flex items-center justify-center border-b-[4px] border-[#daa520] pb-4 mb-8">
          <div className="w-12 h-12 bg-[#daa520] text-[#8b0000] rounded-[4px] flex items-center justify-center font-bold text-3xl leading-none mr-4">
            ॐ
          </div>
          <div className="flex flex-col text-[#8b0000]">
            <h1 className="text-2xl font-bold tracking-[0.02em] leading-tight">{t.appName}</h1>
            <span className="text-sm opacity-90 leading-tight">{t.subtitle2}</span>
          </div>
      </div>

      <main className="w-full flex flex-col lg:flex-row flex-1 overflow-hidden print:overflow-visible print:h-auto">
        {/* Left Side: Input Form */}
        <section className="w-full lg:w-[360px] border-r border-[#e2d1b3] bg-white p-6 flex-shrink-0 lg:overflow-y-auto flex flex-col space-y-4 print:hidden">
          {recentConfigs.length > 0 && (
             <div className="mb-2">
                 <div className="text-[0.65rem] uppercase tracking-widest text-[#8e8372] font-bold mb-2">Recent Searches</div>
                 <div className="flex flex-wrap gap-2">
                     {recentConfigs.map(c => (
                         <button
                             key={c.id}
                             type="button"
                             onClick={() => {
                                 setBirthDate(c.birthDate);
                                 setBirthTime(c.birthTime);
                                 setBirthPlace(c.birthPlace);
                                 setTimezone(c.timezone);
                                 setNakshatra(c.nakshatra);
                                 setPaksha(c.paksha);
                                 setTithi(c.tithi);
                                 setLunarMonth(c.lunarMonth);
                                 setTargetYearRange(c.targetYearRange);
                             }}
                             className="text-[0.7rem] px-2 py-1 bg-[#f9f7f2] border border-[#e2d1b3] rounded-[2px] text-[#5c554a] hover:bg-[#e2d1b3] transition-colors"
                         >
                             {c.label}
                         </button>
                     ))}
                 </div>
             </div>
          )}
          <div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1">
             {t.birthDetails}
          </div>

          <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="space-y-4 flex flex-col">
            <div className="space-y-4">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.birthDate}
                    <InfoTooltip content={t.tooltipDate} />
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                  />
                </div>
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.birthTime}
                    <InfoTooltip content={t.tooltipTime} />
                  </label>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                  />
                </div>
              </div>

              {/* Place & Timezone */}
              <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.birthPlace}
                    <InfoTooltip content={t.tooltipPlace} />
                  </label>
                  <LocationInput
                    value={birthPlace}
                    onChange={setBirthPlace}
                    placeholder={t.locationPlaceholder}
                  />
                  {debouncedBirthPlace && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 flex flex-col gap-1"
                    >
                      <div className="h-48 w-full rounded-[4px] overflow-hidden border border-[#d1c4b2] shadow-inner relative group z-0">
                        <LocationMap placeName={debouncedBirthPlace} onChange={setBirthPlace} />
                      </div>
                      <span className="text-[0.65rem] text-[#8e8372] text-center italic">{t.mapHint}</span>
                    </motion.div>
                  )}
              </div>

              <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.timezone}
                    <InfoTooltip content={t.tooltipTimezone} />
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                  >
                    <option value="">{t.selectTimezone}</option>
                    {TIMEZONES.map((tz, idx) => (
                      <option key={idx} value={tz}>{tz}</option>
                    ))}
                  </select>
              </div>
            </div>

            <div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 mt-4 mb-2">
               {t.tradData}
            </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                      {t.nakshatra}
                      <InfoTooltip content={t.tooltipNakshatra} />
                    </label>
                    <select
                      value={nakshatra}
                      onChange={(e) => setNakshatra(e.target.value)}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                    >
                      <option value="">{t.select}</option>
                      {NAKSHATRAS.map((n, idx) => (
                        <option key={idx} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                      {t.paksha}
                      <InfoTooltip content={t.tooltipPaksha} />
                    </label>
                    <select
                      value={paksha}
                      onChange={(e) => setPaksha(e.target.value)}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                    >
                      <option value="">{t.select}</option>
                      <option value="Shukla Paksha (Waxing)">Shukla (Waxing)</option>
                      <option value="Krishna Paksha (Waning)">Krishna (Waning)</option>
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                      {t.tithi}
                      <InfoTooltip content={t.tooltipTithi} />
                    </label>
                    <select
                      value={tithi}
                      onChange={(e) => setTithi(e.target.value)}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                    >
                      <option value="">{t.select}</option>
                      {TITHIS.map((tInfo, idx) => (
                        <option key={idx} value={tInfo}>{tInfo}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                      {t.lunarMonth}
                      <InfoTooltip content={t.tooltipMonth} />
                    </label>
                    <select
                      value={lunarMonth}
                      onChange={(e) => setLunarMonth(e.target.value)}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                    >
                      <option value="">{t.select}</option>
                      {LUNAR_MONTHS.map((m, idx) => (
                        <option key={idx} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
               </div>

            <div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 mt-4 mb-2">
               {t.searchRange}
            </div>

              <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.targetYears}
                    <InfoTooltip content={t.tooltipTargetYear} />
                  </label>
                  <input
                    type="text"
                    placeholder={t.targetYearPlaceholder}
                    value={targetYearRange}
                    onChange={(e) => setTargetYearRange(e.target.value)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                  />
              </div>

              <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.notes}
                    <InfoTooltip content={t.tooltipNotes} />
                  </label>
                  <textarea
                    rows={2}
                    placeholder={t.notesPlaceholder}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] resize-none focus:outline-none focus:border-[#daa520]"
                  />
              </div>

            <button
               type="submit"
               disabled={isLoading}
               className="w-full bg-[#8b0000] text-white border-0 p-3 rounded-[4px] font-bold cursor-pointer mt-4 uppercase tracking-[0.05em] hover:bg-[#6b0000] transition-colors disabled:opacity-70 flex items-center justify-center space-x-2"
             >
               {isLoading ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span>{t.calculating}</span>
                 </>
               ) : (
                 <>
                   <span>{t.findBday}</span>
                   <Send className="w-4 h-4" />
                 </>
               )}
             </button>
          </form>
        </section>

        {/* Right Side: Results / Chat Area */}
        <section 
          className="flex-1 relative flex flex-col h-full overflow-hidden print:overflow-visible print:h-auto print:bg-white"
          style={{ backgroundImage: 'radial-gradient(#e2d1b3 0.5px, transparent 0.5px)', backgroundSize: '20px 20px', backgroundColor: '#f9f7f2' }}
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center print:hidden">
               <div className="w-16 h-16 rounded-full bg-white border-2 border-[#e2d1b3] mb-6 flex items-center justify-center shadow-sm text-3xl font-bold text-[#8b0000]">
                 ॐ
               </div>
               <h2 className="text-xl font-medium mb-3">{t.welcomeTitle}</h2>
               <p className="text-[#5c554a] max-w-md mx-auto leading-relaxed text-sm font-medium">
                 {t.welcomeDesc}
               </p>
               <div className="mt-8 flex items-start space-x-3 text-left bg-white border border-[#e2d1b3] border-l-[4px] border-l-[#8b0000] p-4 rounded-[2px] shadow-sm max-w-sm">
                 <Info className="w-5 h-5 text-[#8b0000] flex-shrink-0 mt-0.5" />
                 <div>
                   <p className="font-bold text-sm text-[#2d2a26] mb-1">{t.privacyNoticeTitle}</p>
                   <p className="text-xs text-[#5c554a] font-medium leading-relaxed">
                     {t.privacyNoticeDesc}
                   </p>
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth print:overflow-visible print:p-0 print:bg-white">
               <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-center'} print:block print:mb-8`}
                  >
                    <div className={`flex items-center space-x-2 mb-2 w-full max-w-4xl px-1 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''} print:hidden`}>
                       <div className={`w-6 h-6 rounded-[2px] flex items-center justify-center text-xs font-bold ${msg.role === 'user' ? 'bg-[#e2d1b3] text-[#8b4513]' : 'bg-[#8b0000] text-white'}`}>
                         {msg.role === 'user' ? 'U' : 'ॐ'}
                       </div>
                       <span className="text-xs font-bold text-[#8b4513] uppercase tracking-widest">
                         {msg.role === 'user' ? 'Details Submitted' : 'Dharmic Assessment'}
                       </span>
                    </div>
                    
                    <div className={`w-full max-w-4xl print:max-w-none print:border-0 print:shadow-none ${msg.role === 'user' ? 'bg-white border border-[#e2d1b3] border-l-[4px] border-l-[#8b0000] p-5 rounded-[2px] shadow-sm' : 'bg-white border border-[#e2d1b3] p-5 sm:p-6 rounded-[4px] shadow-sm'}`}>
                      {msg.role === "user" ? (
                        <div className="text-[13px] sm:text-[0.85rem] text-[#2d2a26] whitespace-pre-wrap leading-relaxed font-mono">
                          {msg.text}
                        </div>
                      ) : (
                        <>
                          <div className="prose prose-sm xl:prose-base max-w-none text-[#2d2a26] leading-7 marker:text-[#8b0000] prose-h2:text-xl prose-h2:text-[#8b0000] prose-h2:font-bold prose-h2:pb-2 prose-h2:border-b prose-h2:border-[#e2d1b3] prose-h3:text-md prose-h3:font-bold prose-h3:text-[#8b4513] prose-p:font-medium prose-li:font-medium">
                            <Markdown>{msg.text}</Markdown>
                          </div>
                          {msg.jsonArray && msg.jsonArray.length > 0 && (
                             <div className="mt-8 pt-6 border-t-[4px] border-[#daa520] print:break-inside-avoid">
                                <h3 className="text-lg font-bold text-[#8b0000] mb-4">Upcoming 5-Year Projection</h3>
                                <Timeline data={msg.jsonArray} />
                                <div className="mt-4 border border-[#e2d1b3] rounded-[4px] overflow-hidden bg-white">
                                   <table className="w-full text-sm text-left">
                                      <thead className="text-xs uppercase bg-[#f9f7f2] border-b border-[#e2d1b3] text-[#8b4513]">
                                        <tr>
                                          <th className="px-4 py-3 font-bold border-r border-[#e2d1b3]">Year</th>
                                          <th className="px-4 py-3 font-bold border-r border-[#e2d1b3]">Equivalent Gregorian Date</th>
                                          <th className="px-4 py-3 font-bold">Weekday</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {msg.jsonArray.map((row, i) => (
                                          <tr key={i} className="border-b last:border-b-0 border-[#e2d1b3]">
                                            <td className="px-4 py-3 font-mono font-bold text-[#8b0000] border-r border-[#e2d1b3] bg-[#fdfcfb]">{row.year}</td>
                                            <td className="px-4 py-3 font-medium border-r border-[#e2d1b3]">{row.gregorianDate}</td>
                                            <td className="px-4 py-3 font-medium text-[#5c554a]">{row.weekday}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                   </table>
                                </div>
                             </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                 <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                   className="flex items-center justify-center space-x-3 text-[#5c554a] pt-4 print:hidden"
                 >
                   <Loader2 className="w-5 h-5 animate-spin text-[#8b0000]" />
                   <span className="text-sm font-bold animate-pulse tracking-wide">{t.calculatingPanchang}</span>
                 </motion.div>
               )}
               <div ref={messagesEndRef} />
             </div>
           )}
 
           {/* Persistent Quick Chat Input */}
           {messages.length > 0 && (
              <div className="p-4 bg-[#fdfcfb] border-t border-[#e2d1b3] print:hidden">
                <form 
                   onSubmit={(e) => {
                     e.preventDefault();
                     if (!notes.trim() || isLoading) return;
                     const newUserMsg: MessageItem = { id: Date.now().toString(), role: "user", text: notes };
                     setMessages(prev => [...prev, newUserMsg]);
                     setNotes("");
                     setIsLoading(true);
                     
                     let followupPrompt = notes + `\n\nPlease reply primarily in ${uiLang === 'DE' ? 'German' : uiLang === 'HI' ? 'Hindi' : uiLang === 'TE' ? 'Telugu' : 'English'}. If your answer includes dates across years, please ALSO provide them as a JSON array in a markdown block starting with \`\`\`json. Each object MUST have { "year": number, "gregorianDate": "YYYY-MM-DD", "weekday": "Monday" }.`;

                     fetch("/api/ask", {
                       method: "POST",
                       headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({
                         prompt: followupPrompt,
                         history: [...messages, newUserMsg].slice(0, -1).map(m => ({ role: m.role, text: m.text }))
                       }),
                     })
                     .then(r => r.json())
                     .then(data => {
                        const { cleanText, extractedJson } = parseJsonBlock(data.text || data.error);
                        const modelMsg: MessageItem = { id: Date.now().toString() + "_m", role: "model", text: cleanText.trim(), jsonArray: extractedJson };
                        setMessages(prev => [...prev, modelMsg]);
                     })
                     .catch(err => {
                        const errMs: MessageItem = { id: Date.now().toString() + "_e", role: "model", text: `**Error:** ${err.message}` };
                        setMessages(prev => [...prev, errMs]);
                     })
                     .finally(() => setIsLoading(false));
                   }}
                   className="flex space-x-3 max-w-4xl mx-auto"
                >
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t.followupPlaceholder}
                    className="flex-1 bg-white border border-[#d1c4b2] rounded-[4px] px-5 py-3 text-[0.85rem] focus:outline-none focus:border-[#daa520] focus:ring-1 focus:ring-[#daa520]"
                  />
                  <button 
                   type="submit" 
                   disabled={isLoading || !notes.trim()}
                   className="bg-[#8b0000] text-white px-6 py-3 rounded-[4px] hover:bg-[#6b0000] disabled:opacity-70 transition-colors font-bold tracking-wider uppercase text-sm flex items-center justify-center space-x-2"
                  >
                    <span>Send</span>
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
           )}
         </section>
       </main>

        {showDashboard && user && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
             <div className="bg-[#f9f7f2] w-full max-w-2xl rounded-[4px] shadow-2xl flex flex-col max-h-[80vh] border-2 border-[#e2d1b3]">
                <div className="flex items-center justify-between p-4 border-b border-[#e2d1b3] bg-white">
                   <h2 className="text-lg font-bold text-[#8b0000] uppercase tracking-wider ml-1">{t.searchHistory}</h2>
                   <button onClick={() => setShowDashboard(false)} className="text-[#5c554a] hover:text-[#8b0000]">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                   {dashboardConfigs.length === 0 ? (
                      <div className="text-center text-[#5c554a] py-8 text-sm font-medium">No previous searches found.</div>
                   ) : (
                      dashboardConfigs.map(c => (
                         <div key={c.id} className="bg-white border border-[#d1c4b2] p-4 rounded-[4px] flex items-center justify-between group hover:border-[#daa520] transition-colors cursor-pointer" onClick={() => {
                                 setBirthDate(c.birthDate);
                                 setBirthTime(c.birthTime);
                                 setBirthPlace(c.birthPlace);
                                 setTimezone(c.timezone);
                                 setNakshatra(c.nakshatra);
                                 setPaksha(c.paksha);
                                 setTithi(c.tithi);
                                 setLunarMonth(c.lunarMonth);
                                 setTargetYearRange(c.targetYearRange);
                                 setShowDashboard(false);
                         }}>
                             <div className="flex flex-col">
                                <span className="font-bold text-[#2d2a26] text-[0.85rem] leading-tight">{c.label}</span>
                                <span className="text-[#8e8372] text-[0.7rem] uppercase tracking-wider mt-1">
                                   {new Date(c.createdAt || Date.now()).toLocaleDateString()}
                                </span>
                             </div>
                             <button 
                               onClick={(e) => handleDeleteConfig(c.id, e)} 
                               className="text-white bg-[#8b0000] p-1.5 rounded-[2px] opacity-0 group-hover:opacity-100 hover:bg-[#6b0000] transition-all"
                               title="Delete this search"
                             >
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        )}

        <footer className="shrink-0 py-2 min-h-8 bg-[#8b0000] text-white/90 text-[0.65rem] sm:text-[0.70rem] tracking-wider text-center border-t border-[#daa520] flex flex-col sm:flex-row items-center justify-center print:hidden relative w-full font-medium px-4">
          <div className="flex items-center gap-1">
             {t.footer}
          </div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 sm:ml-6 text-white/70">
             <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors">{t.terms}</button>
             <button onClick={() => setShowPrivacyPolicy(true)} className="hover:text-white transition-colors">{t.privacyPolicy}</button>
             <button onClick={() => setShowImprint(true)} className="hover:text-white transition-colors">{t.imprint}</button>
          </div>
        </footer>

        {/* Cookie Banner */}
        <AnimatePresence>
          {showCookieBanner && (
            <motion.div 
               initial={{ opacity: 0, y: 50 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 50 }} 
               className="fixed bottom-12 left-4 md:bottom-6 md:left-6 max-w-sm bg-[#2d2a26] text-white p-5 rounded-[4px] shadow-2xl z-50 border border-[#4a453f]"
            >
               <p className="text-[0.8rem] leading-relaxed mb-4 text-white/90">
                 {t.cookieText}
               </p>
               <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setShowPrivacyPolicy(true)} 
                    className="text-[0.75rem] text-[#daa520] hover:text-[#e2d1b3] transition-colors uppercase tracking-wider font-bold"
                  >
                    {t.privacyPolicy}
                  </button>
                  <button 
                    onClick={handleAcceptCookies} 
                    className="bg-[#daa520] text-[#8b0000] px-4 py-1.5 rounded-[2px] text-[0.75rem] font-bold hover:bg-[#e2d1b3] transition-colors uppercase tracking-wider"
                  >
                    {t.gotIt}
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legal Modals */}
        <AnimatePresence>
           {showPrivacyPolicy && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
               <div className="bg-[#f9f7f2] w-full max-w-3xl rounded-[4px] shadow-2xl flex flex-col max-h-[85vh] border-2 border-[#e2d1b3]">
                 <div className="flex items-center justify-between p-4 border-b border-[#e2d1b3] bg-white">
                   <h2 className="text-lg font-bold text-[#8b0000] uppercase tracking-wider ml-1">{t.privacyPolicy}</h2>
                   <button onClick={() => setShowPrivacyPolicy(false)} className="text-[#5c554a] hover:text-[#8b0000]">
                      <X className="w-5 h-5" />
                   </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 md:p-8 text-[#2d2a26] text-sm leading-relaxed prose max-w-none">
                    <h3>Data Controller Information</h3>
                    <p>HaBER Software Solutions by HaBER Axis<br/>Hari aus Berlin<br/>Westend, 14059 Berlin, Germany</p>
                    
                    <h3>Usage of Technical Data & Local Storage</h3>
                    <p>We use essential cookies and browser local storage strictly to keep you logged in (if authenticated) and to save your preferences directly on your device. We do not deploy tracking cookies or cross-site fingerprinting scripts.</p>
                    
                    <h3>Your Data Rights</h3>
                    <p>Under GDPR, you have the right to access, rectify, or delete any data you provide to us. You may clear your history from the application interface or by securely clearing your browser storage.</p>
                 </div>
               </div>
             </motion.div>
           )}

           {showTerms && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
               <div className="bg-[#f9f7f2] w-full max-w-3xl rounded-[4px] shadow-2xl flex flex-col max-h-[85vh] border-2 border-[#e2d1b3]">
                 <div className="flex items-center justify-between p-4 border-b border-[#e2d1b3] bg-white">
                   <h2 className="text-lg font-bold text-[#8b0000] uppercase tracking-wider ml-1">{t.terms}</h2>
                   <button onClick={() => setShowTerms(false)} className="text-[#5c554a] hover:text-[#8b0000]">
                      <X className="w-5 h-5" />
                   </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 md:p-8 text-[#2d2a26] text-sm leading-relaxed prose max-w-none">
                    <h3>1. Applicability</h3>
                    <p>These terms are tailored for the B2B SaaS MVP operating in Germany by HaBER Software Solutions.</p>
                    
                    <h3>2. User Obligations (UWG context)</h3>
                    <p>Users must comply with German anti-spam regulations (UWG) when utilizing insights derived from this app for any commercial outreach.</p>
                    
                    <h3>3. Intellectual Property</h3>
                    <p>All core IP, including astronomical offset generators, interface designs, and calculation engines, are the exclusive property of HaBER Software Solutions.</p>

                    <h3>4. Liability</h3>
                    <p>Liability for slight negligence is limited in accordance with general German commercial standards.</p>
                    
                    <h3>5. Jurisdiction</h3>
                    <p>The place of jurisdiction is Berlin, Germany. The law of the Federal Republic of Germany applies.</p>
                 </div>
               </div>
             </motion.div>
           )}

           {showImprint && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
               <div className="bg-[#f9f7f2] w-full max-w-3xl rounded-[4px] shadow-2xl flex flex-col max-h-[85vh] border-2 border-[#e2d1b3]">
                 <div className="flex items-center justify-between p-4 border-b border-[#e2d1b3] bg-white">
                   <h2 className="text-lg font-bold text-[#8b0000] uppercase tracking-wider ml-1">{t.legalNotice} / {t.imprint}</h2>
                   <button onClick={() => setShowImprint(false)} className="text-[#5c554a] hover:text-[#8b0000]">
                      <X className="w-5 h-5" />
                   </button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 md:p-8 text-[#2d2a26] text-sm leading-relaxed prose max-w-none">
                    <h3>Legal Notice (MVP)</h3>
                    <p className="font-bold">MVP / Startup in Construction<br/>This project is a showcase.</p>
                    
                    <h3>Information according to § 5 TMG</h3>
                    <p>
                      HaBER Software Solutions by HaBER Axis<br/>
                      Hari aus Berlin<br/>
                      Westend<br/>
                      14059 Berlin<br/>
                      Germany
                    </p>

                    <h3>Contact</h3>
                    <p>
                      Phone: +49 (0) 157 3930 XXXX<br/>
                      Email: info@habersoftware.example.com
                    </p>

                    <h3>Register Entry</h3>
                    <p>
                      Entry in the commercial register:<br/>
                      Register Court: [Pending]<br/>
                      Register Number: [Pending]
                    </p>

                    <h3>VAT ID</h3>
                    <p>VAT ID according to § 27 a Sales Tax Law: [Pending]</p>
                 </div>
               </div>
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    );
  }


