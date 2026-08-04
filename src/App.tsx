import React, { useState, useRef, useEffect } from "react";
import { Send, MapPin, Calendar, Clock, Star, Moon, CalendarDays, Loader2, Info, Printer, Globe, Share2, Download, LogIn, LogOut, History, X, Trash2, Maximize2, Minimize2, Github, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Timeline, ProjectionDate } from "./components/Timeline";
import { LocationMap } from "./components/LocationMap";
import { auth, db } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, GithubAuthProvider, signOut, onAuthStateChanged, User, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs, setDoc, doc, where, deleteDoc } from "firebase/firestore";

import { WelcomeHero } from "./components/WelcomeHero";

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
  },
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
  const skipSearchRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && query.length > 2 && !skipSearchRef.current) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          let data;
          try {
             data = await res.json();
          } catch(e) {
             data = [];
          }
          if (Array.isArray(data) && data.length > 0) {
            setResults(data.map((r: any) => ({
              id: r.place_id,
              label: r.display_name
            })));
          } else {
             setResults([]);
          }
        } catch (e) {
          console.error("Nominatim API error:", e);
          setResults([]);
        } finally {
          setIsSearching(false);
          setIsOpen(true);
        }
      } else if (!query) {
        setResults(POPULAR_INDIAN_CITIES.map(c => ({ id: c, label: c })));
      }
      skipSearchRef.current = false;
    }, 1500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { 
             skipSearchRef.current = false;
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
                 skipSearchRef.current = true;
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
                    skipSearchRef.current = true;
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

const TRANSLATIONS: Record<string, Record<string, any>> = {
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
    slideTitle0: "Celebrate Your True Cosmic Arrival",
    slideDesc0: "Discover your exact Dharmic birthday based on precise Vedic astrology.",
    slideTitle1: "The Wisdom of the Ancients",
    slideDesc1: "Our high-precision models use ancient Panchang calculations.",
    slideTitle2: "A Celestial Celebration",
    slideDesc2: "Align your special day with the authentic cosmic rhythms.",
    slideTitle3: "Sacred Astrological Mandalas",
    slideDesc3: "Connect deeply with the energetic patterns of the universe.",
    slideTitle4: "Your Vedic Birth Chart",
    slideDesc4: "Unlock the mysteries of your life's true journey.",
    slideTitle5: "Joyful Festivals of Light",
    slideDesc5: "Embrace the spiritual energy of traditional celebrations.",
    slideTitle6: "Sacred Fire Pujas",
    slideDesc6: "Harmonize with the divine through ancient fire rituals.",
    slideTitle7: "The Mystical Lunar Journey",
    slideDesc7: "Follow the moon's transit through the sacred Nakshatras.",
    slideTitle8: "Cosmic Om & Lotus",
    slideDesc8: "Awaken the inner peace and spiritual wisdom within.",
    slideTitle9: "The Traditional Panchang",
    slideDesc9: "Uncover the timeless rhythms of the Hindu calendar.",
    slideTitle10: "Ecstatic Kirtan Joy",
    slideDesc10: "Experience the pure bliss of congregational chanting.",
    slideTitle11: "Aarti Celebrations",
    slideDesc11: "Illuminate your path with traditional family aarti.",
    slideTitle12: "Spiritual Serenity",
    slideDesc12: "Find inner peace in the sacred atmosphere of the temple.",
    slideTitle13: "Vedic Fire Yajna",
    slideDesc13: "Receive divine blessings through ancient fire ceremonies.",
    slideTitle14: "The Holy Japa",
    slideDesc14: "Chant the holy names and awaken your spiritual consciousness.",

    slideTitle15: "Mandatory: Exact Date of Birth",
    slideDesc15: "We need your exact day, month, and year of birth to align with the planetary positions of that specific day.",
    slideTitle16: "Mandatory: Exact Time of Birth",
    slideDesc16: "Your exact hour and minute of birth are crucial. A few minutes can change your entire astrological chart.",
    slideTitle17: "Mandatory: Place of Birth",
    slideDesc17: "City and coordinates determine the precise angle of the cosmos at the moment you were born.",

    testiText0: "Ever since I started celebrating my birthday according to the Dharmic calendar, I've noticed a profound shift in my energy. It feels like the universe is aligning with me! It brought incredible luck and peace to my year.",
    testiAuthor0: "Rajesh K.",
    testiText1: "I was always celebrating on the wrong date! The Gregorian calendar is just a number, but the Tithi and Nakshatra alignment brings real cosmic blessings. Celebrating on my true Dharmic birthday opened doors I never imagined.",
    testiAuthor1: "Priya S.",
    testiText2: "This app helped me find my authentic birthday. The very first year I celebrated my Dharmic birthday, I got a long-awaited promotion. It's more than just a date; it's a spiritual reset.",
    testiAuthor2: "Amit P.",
    testiText3: "Finally found my real birthday! The Gregorian calendar felt disconnected, but this Dharmic date brings me closer to my roots. Celebrating with a puja made this year so special.",
    testiAuthor3: "Sneha M.",
    testiText4: "Such a beautiful way to reconnect with our traditions. My family now celebrates both dates, but the Dharmic birthday feels so much more spiritually fulfilling.",
    testiAuthor4: "Vikram R.",
    testiText5: "I was skeptical at first, but the accuracy of the Nakshatra and Tithi calculations is incredible. Finding my cosmic birthday was a truly eye-opening experience.",
    testiAuthor5: "Aditi V.",
    testiText6: "This tool is a blessing! I've been trying to figure out my authentic Hindu birthday for years. The celebration felt deeply personal and blessed by the divine.",
    testiAuthor6: "Karan D.",
    testiText7: "As an ISKCON devotee, knowing my exact Dharmic birthday based on Tithi allows me to align my spiritual practices perfectly. A must-have for every spiritual seeker.",
    testiAuthor7: "Anjali G.",
    testiText8: "Our grandparents always followed the Panchang, but we lost touch. This app brought that beautiful tradition back to our family. The joy of a Dharmic birthday is unmatched.",
    testiAuthor8: "Rohit S.",
    testiText9: "Amazing experience! The calculations are precise, and celebrating on my Tithi felt incredibly auspicious. The energy on that day was simply wonderful.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "The Challenge: Static Solar Dates vs. Dynamic Cosmic Rhythms",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "The Solution: Precision Dharmic Alignments",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "Who Benefits From This System?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "Why Our Methodology is Superior",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "Important Legal & Liability Disclaimer",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "Ask a follow up question...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
    underConstructionBtn: "Under Construction",
    guestLoginBtn: "Guest Login",
    underConstructionTitle: "Under Construction",
    underConstructionDesc1: "This application is currently being built.",
    underConstructionDesc2: "We sincerely apologize for the inconvenience. Please check back later.",
    password: "Password",
    loginBtn: "Login",
    incorrectPassword: "Incorrect password",
    showTip: "Show Tip",
    hideTip: "Hide Tip",
    guestTip: "Tip: password is hari2",
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
    slideTitle0: "Feiern Sie Ihre wahre kosmische Ankunft",
    slideDesc0: "Entdecken Sie Ihren genauen dharmischen Geburtstag basierend auf präziser vedischer Astrologie.",
    slideTitle1: "Die Weisheit der Alten",
    slideDesc1: "Unsere hochpräzisen Modelle verwenden alte Panchang-Berechnungen.",
    slideTitle2: "Eine himmlische Feier",
    slideDesc2: "Richten Sie Ihren besonderen Tag nach den authentischen kosmischen Rhythmen aus.",
    slideTitle3: "Heilige astrologische Mandalas",
    slideDesc3: "Verbinden Sie sich tief mit den energetischen Mustern des Universums.",
    slideTitle4: "Ihr vedisches Geburtshoroskop",
    slideDesc4: "Entschlüsseln Sie die Geheimnisse der wahren Reise Ihres Lebens.",
    slideTitle5: "Freudige Lichterfeste",
    slideDesc5: "Umfassen Sie die spirituelle Energie traditioneller Feiern.",
    slideTitle6: "Heilige Feuerpujas",
    slideDesc6: "Harmonisieren Sie mit dem Göttlichen durch alte Feuerrituale.",
    slideTitle7: "Die mystische Mondreise",
    slideDesc7: "Folgen Sie dem Transit des Mondes durch die heiligen Nakshatras.",
    slideTitle8: "Kosmische Om & Lotos",
    slideDesc8: "Erwecken Sie den inneren Frieden und die spirituelle Weisheit in sich.",
    slideTitle9: "Der traditionelle Panchang",
    slideDesc9: "Entdecken Sie die zeitlosen Rhythmen des hinduistischen Kalenders.",
    slideTitle10: "Ekstatische Kirtan-Freude",
    slideDesc10: "Erleben Sie die reine Glückseligkeit des gemeinsamen Singens.",
    slideTitle11: "Aarti-Feiern",
    slideDesc11: "Erleuchten Sie Ihren Weg mit traditionellem Familien-Aarti.",
    slideTitle12: "Spirituelle Gelassenheit",
    slideDesc12: "Finden Sie inneren Frieden in der heiligen Atmosphäre des Tempels.",
    slideTitle13: "Vedisches Feuer-Yajna",
    slideDesc13: "Erhalten Sie göttliche Segnungen durch alte Feuerzeremonien.",
    slideTitle14: "Das heilige Japa",
    slideDesc14: "Singen Sie die heiligen Namen und erwecken Sie Ihr spirituelles Bewusstsein.",
    testiText0: "Seitdem ich meinen Geburtstag nach dem dharmischen Kalender feiere, spüre ich eine tiefgreifende energetische Veränderung. Es fühlt sich an, als ob das Universum im Einklang mit mir ist! Es hat mir unglaubliches Glück gebracht.",
    testiAuthor0: "Rajesh K.",
    testiText1: "Ich habe immer am falschen Datum gefeiert! Der gregorianische Kalender ist nur eine Zahl, aber die Ausrichtung von Tithi und Nakshatra bringt echten kosmischen Segen.",
    testiAuthor1: "Priya S.",
    testiText2: "Diese App hat mir geholfen, meinen authentischen Geburtstag zu finden. Im ersten Jahr, in dem ich meinen dharmischen Geburtstag feierte, bekam ich eine langersehnte Beförderung. Es ist ein spiritueller Neustart.",
    testiAuthor2: "Amit P.",
    testiText3: "Endlich habe ich meinen wahren Geburtstag gefunden! Der gregorianische Kalender fühlte sich unverbunden an, aber dieses dharmische Datum bringt mich meinen Wurzeln näher.",
    testiAuthor3: "Sneha M.",
    testiText4: "Eine so schöne Möglichkeit, sich wieder mit unseren Traditionen zu verbinden. Meine Familie feiert jetzt beide Daten, aber der dharmische Geburtstag ist spirituell viel erfüllender.",
    testiAuthor4: "Vikram R.",
    testiText5: "Ich war anfangs skeptisch, aber die Genauigkeit der Berechnungen ist unglaublich. Die Entdeckung meines kosmischen Geburtstags war eine wirklich augenöffnende Erfahrung.",
    testiAuthor5: "Aditi V.",
    testiText6: "Dieses Werkzeug ist ein Segen! Ich versuche seit Jahren, meinen authentischen hinduistischen Geburtstag herauszufinden. Die Feier fühlte sich zutiefst persönlich an.",
    testiAuthor6: "Karan D.",
    testiText7: "Als ISKCON-Anhängerin ermöglicht mir das Wissen um meinen genauen dharmischen Geburtstag, meine spirituellen Praktiken perfekt abzustimmen. Ein Muss für jeden Suchenden.",
    testiAuthor7: "Anjali G.",
    testiText8: "Unsere Großeltern folgten immer dem Panchang, aber wir hatten den Bezug dazu verloren. Diese App hat diese schöne Tradition zurück in unsere Familie gebracht.",
    testiAuthor8: "Rohit S.",
    testiText9: "Erstaunliche Erfahrung! Die Berechnungen sind präzise, und die Feier an meinem Tithi fühlte sich unglaublich vielversprechend an. Die Energie an diesem Tag war einfach wunderbar.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "Die Herausforderung: Statische Sonnendaten vs. dynamische kosmische Rhythmen",
    heroProblemDesc: <><p>Wenn Sie sich auf den gregorianischen Standardkalender verlassen, ist Ihr Geburtstag dauerhaft an ein statisches Sonnendatum gebunden. Die wahre kosmische Ausrichtung der Sterne und Planeten – die exakte Konstellation im Moment Ihrer Geburt – verschiebt sich jedoch von Jahr zu Jahr dramatisch. Dies ist der Grund, warum alte Feste wie Diwali oder Navratri jedes Jahr an unterschiedlichen Daten gefeiert werden.</p><p>Indem Sie einem festen Sonnendatum folgen, verpassen Sie die tiefe spirituelle Bedeutung Ihrer tatsächlichen astrologischen Rückkehr. Der dharmische Kalender ehrt den dynamischen Tanz zwischen dem Mond und dem Kosmos und bietet eine tiefgreifende authentische Verbindung.</p></>,
    heroSolutionTitle: "Die Lösung: Präzise dharmische Ausrichtungen",
    heroSolutionDesc: <><p>Unser Dharmischer Geburtstagsrechner nutzt hochpräzise astronomische Algorithmen, um den genauen <b>Mondtag (Tithi)</b> und den <b>Geburtsstern (Nakshatra)</b> Ihrer Inkarnation zu berechnen. Indem wir diese sich verschiebenden himmlischen Rhythmen präzise verfolgen, bestimmen wir das authentische, traditionelle Datum, um Ihren Geburtstag jedes Jahr zu feiern.</p><p>Dieses Tool wurde sorgfältig entwickelt, um sich an Ihre genauen Koordinaten und Zeitzonen anzupassen und stellt sicher, dass die Berechnungen den wahren kosmischen Zustand über Ihrem Geburtsort widerspiegeln.</p></>,
    heroWhoTitle: "Für wen ist dieses System gedacht?",
    heroWhoDesc: <><p>Diese Anwendung wurde für spirituell Suchende, Anhänger dharmischer Traditionen und alle entwickelt, die sich wieder mit den universellen Rhythmen verbinden möchten. Es ist das perfekte Werkzeug zur Planung authentischer traditioneller Feiern, Pujas oder für tiefe persönliche Reflexion.</p></>,
    heroWhyTitle: "Warum unsere Methodik überlegen ist",
    heroWhyDesc: <><p>Entwickelt mit fortgeschrittener computergestützter Astrologie, gleicht diese Plattform Ihre genaue Geburtszeit und -orte mit Jahrtausenden etablierter vedischer Wissenschaft ab. Unser strenger mathematischer Ansatz liefert unübertroffene, professionelle Genauigkeit für den wichtigsten Tag Ihres Jahres.</p></>,
    heroDisclaimerTitle: "Wichtiger rechtlicher Haftungsausschluss",
    heroDisclaimerDesc: <><p>Die Informationen, Berechnungen, Daten und sonstigen Inhalte dieser Anwendung sind <strong>ausschließlich für spirituelle, pädagogische und Unterhaltungszwecke bestimmt.</strong> Die Ersteller, Eigentümer und Betreiber dieser App übernehmen <strong>keine Garantien – weder ausdrücklich noch stillschweigend – für die Richtigkeit, Vollständigkeit oder Zuverlässigkeit</strong> der astrologischen Berechnungen oder anderer hierin enthaltener Informationen.</p><p>Diese Anwendung <strong>bietet keine professionelle, medizinische, psychologische, finanzielle oder rechtliche Beratung und sollte auch nicht als solche ausgelegt werden.</strong></p><p>Durch die Nutzung dieses Dienstes erklären Sie sich ausdrücklich damit einverstanden, dass die Ersteller, Eigentümer und Betreiber <strong>keine Haftung für getroffene Entscheidungen, ergriffene Maßnahmen oder entstandene Folgen</strong> aufgrund der bereitgestellten Daten, Berechnungen oder Erkenntnisse übernehmen. Sie stimmen außerdem zu, dass jegliches Vertrauen, das Sie in diese Informationen setzen, <strong>ausschließlich auf Ihr eigenes Risiko</strong> erfolgt.</p><p>Die Ersteller, Eigentümer und Betreiber dieser Anwendung sind von <strong>jeglicher Haftung für rechtliche Ansprüche, Schäden, Verbindlichkeiten oder Streitigkeiten,</strong> die sich aus der Nutzung dieser Software oder dieses Dienstes ergeben, <strong>vollständig befreit.</strong> Sie erklären sich damit einverstanden, dass ihnen keine rechtliche Haftung auferlegt wird.</p></>,
    followupPlaceholder: "Stellen Sie eine Anschlussfrage...",
    termsContent: <><h3>1. Annahme der Bedingungen</h3><p>Durch den Zugriff auf und die Nutzung der Anwendung "Find My Dharmic Birthday" ("die App"), betrieben von HaBER Software Solutions ("wir", "uns" oder "unser"), erkennen Sie ("der Nutzer") an, dass Sie diese Allgemeinen Geschäftsbedingungen gelesen und verstanden haben und zustimmen, rechtlich an diese gebunden zu sein. Wenn Sie diesen Bedingungen nicht zustimmen, müssen Sie die Nutzung der App unverzüglich einstellen.</p><h3>2. Art der Dienstleistung und keine professionelle Beratung</h3><p>Die App generiert Daten, Erkenntnisse und astronomische Berechnungen <strong>ausschließlich für spirituelle, pädagogische und Unterhaltungszwecke.</strong> Wir bieten keine medizinische, psychologische, finanzielle, rechtliche oder sonstige professionelle Beratung an und keine Inhalte sollten als solche ausgelegt werden. Jegliches Vertrauen auf die bereitgestellten Informationen erfolgt ausschließlich auf eigenes Risiko des Nutzers.</p><h3>3. Absolute Haftungsbeschränkung und Freistellung</h3><p>Im größtmöglichen nach geltendem Recht zulässigen Umfang haften HaBER Software Solutions, seine Ersteller, Eigentümer, leitenden Angestellten und verbundenen Unternehmen <strong>in keinem Fall für direkte, indirekte, zufällige, Folge-, besondere oder exemplarische Schäden, Verluste oder Ausgaben,</strong> die sich aus oder im Zusammenhang mit der Nutzung oder Unmöglichkeit der Nutzung dieser App ergeben. Der Nutzer verzichtet ausdrücklich auf jegliches Recht, uns für Ergebnisse, Entscheidungen oder Maßnahmen, die auf der Grundlage der Inhalte der App getroffen wurden, zu verklagen, Ansprüche geltend zu machen oder haftbar zu machen. Der Nutzer erklärt sich damit einverstanden, HaBER Software Solutions von allen Ansprüchen Dritter freizustellen und schadlos zu halten, die sich aus der Nutzung der App ergeben.</p><h3>4. Keine Garantien</h3><p>Die App wird "WIE BESEHEN" und "WIE VERFÜGBAR" bereitgestellt, ohne jegliche ausdrückliche oder stillschweigende Garantien, einschließlich, aber nicht beschränkt auf stillschweigende Garantien der Marktgängigkeit, Eignung für einen bestimmten Zweck oder Nichtverletzung von Rechten Dritter. Wir garantieren nicht, dass die App ununterbrochen, zeitgerecht, sicher, fehlerfrei oder mathematisch makellos ist.</p><h3>5. Geistige Eigentumsrechte</h3><p>Der gesamte Softwarecode, mathematische Generatoren, Algorithmen, Benutzeroberflächen, Marken und Texte in der App sind das ausschließliche geistige Eigentum von HaBER Software Solutions. Dem Nutzer werden keine Rechte oder Lizenzen gewährt, mit Ausnahme des eingeschränkten, nicht exklusiven Rechts, die App bestimmungsgemäß zu nutzen.</p><h3>6. Geltendes Recht und ausschließlicher Gerichtsstand</h3><p>Diese Bedingungen unterliegen den Gesetzen der Bundesrepublik Deutschland und werden in Übereinstimmung mit diesen ausgelegt. Alle rechtlichen Streitigkeiten, Ansprüche oder Verfahren, die sich aus oder im Zusammenhang mit diesen Bedingungen oder der Nutzung der App ergeben, sind ausschließlich vor den zuständigen Gerichten in Berlin, Deutschland, anhängig zu machen.</p></>,
    privacyContent: <><h3>1. Einleitung und Geltungsbereich</h3><p>Wir nehmen Ihren Datenschutz sehr ernst. Diese Datenschutzerklärung legt dar, wie HaBER Software Solutions ("wir", "uns") Ihre personenbezogenen Daten bei der Nutzung der App "Find My Dharmic Birthday" erhebt, nutzt, verarbeitet und schützt. Diese Richtlinie entspricht den strengen Standards der Datenschutz-Grundverordnung (DSGVO).</p><h3>2. Datenerhebung und Verarbeitungsmethoden</h3><p><strong>Gastnutzer:</strong> Wenn Sie die App ohne Konto nutzen, werden Ihre Geburtsdaten (Datum, Uhrzeit und Ort) flüchtig im Browser verarbeitet, um Berechnungen zu generieren. Wir übertragen oder speichern diese höchstpersönlichen Daten nicht auf unseren Backend-Servern.</p><p><strong>Registrierte Nutzer:</strong> Wenn Sie sich für die Erstellung eines Kontos entscheiden, um Profile zu speichern, erfassen und speichern wir Ihre Authentifizierungsdaten (wie die E-Mail-Adresse) und die Geburtsdatenprofile, die Sie ausdrücklich speichern möchten, auf sichere Weise. Diese Daten werden sicher in Google Firebase gespeichert.</p><h3>3. Zweck der Verarbeitung</h3><p>Wir verarbeiten Ihre Daten ausschließlich zu dem Zweck, die Kernfunktionen der App bereitzustellen, Ihre Identität zu authentifizieren, Ihr Konto zu sichern und Ihre gespeicherten Profile über Sitzungen hinweg aufrechtzuerhalten. Wir <strong>verkaufen, vermieten oder monetarisieren Ihre personenbezogenen Daten unter keinen Umständen</strong> an Datenbroker oder Werbetreibende Dritter.</p><h3>4. Infrastruktur von Drittanbietern</h3><p>Um eine hohe Verfügbarkeit und robuste Sicherheit zu gewährleisten, nutzen wir Google Cloud Platform und Firebase (betrieben von Google) als unsere Infrastrukturanbieter. Diese Unternehmen verarbeiten Ihre Daten streng als Auftragsverarbeiter unter rechtsverbindlichen Auftragsverarbeitungsverträgen (AVV) in Übereinstimmung mit der DSGVO. Wir können wesentliche Cookies verwenden, die zur Aufrechterhaltung Ihrer Anmeldesitzung und zur Sicherung der Anwendung unbedingt erforderlich sind.</p><h3>5. Ihre Datenschutzrechte</h3><p>Gemäß der DSGVO verfügen Sie über umfassende Rechte bezüglich Ihrer Daten. Sie haben das Recht auf Auskunft über die von uns über Sie gespeicherten Daten, das Recht auf Berichtigung von Ungenauigkeiten, das Recht auf Datenübertragbarkeit und das <strong>"Recht auf Vergessenwerden" (vollständige Löschung Ihrer Daten)</strong>. Um eines dieser Rechte auszuüben, können Sie Ihre Daten in Ihren Kontoeinstellungen verwalten oder uns direkt kontaktieren.</p><h3>6. Sicherheitsmaßnahmen</h3><p>Wir setzen technische und organisatorische Sicherheitsmaßnahmen auf Unternehmensniveau ein, um Ihre Daten vor unbefugtem Zugriff, Verlust oder Veränderung zu schützen, einschließlich Verschlüsselung bei der Übertragung (HTTPS/TLS) und im Ruhezustand.</p></>,
    imprintContent: <><h3>Angaben gemäß § 5 TMG</h3><p><strong>Anbieter und Betreiber:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Bundesrepublik Deutschland</p><h3>Kontakt</h3><p>Telefon: +49 (0) 157 3930 XXXX<br/>E-Mail: info@habersoftware.example.com</p><h3>Gesetzliche und geschäftliche Vertretung</h3><p>Vertretungsberechtigter: Hari aus Berlin</p><h3>Streitschlichtung</h3><p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die Sie hier finden: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p><h3>Haftung für Inhalte und Links</h3><p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.</p></>,
    underConstructionBtn: "Im Bau",
    guestLoginBtn: "Gastzugang",
    underConstructionTitle: "Im Bau",
    underConstructionDesc1: "Diese Anwendung wird derzeit noch entwickelt.",
    underConstructionDesc2: "Wir entschuldigen uns für die Unannehmlichkeiten. Bitte schauen Sie später wieder vorbei.",
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
    slideTitle0: "अपना सच्चा ब्रह्मांडीय आगमन मनाएं",
    slideDesc0: "सटीक वैदिक ज्योतिष के आधार पर अपना सटीक धार्मिक जन्मदिन खोजें।",
    slideTitle1: "प्राचीन लोगों का ज्ञान",
    slideDesc1: "हमारे उच्च-परिशुद्धता मॉडल प्राचीन पंचांग गणनाओं का उपयोग करते हैं।",
    slideTitle2: "एक खगोलीय उत्सव",
    slideDesc2: "अपने विशेष दिन को प्रामाणिक ब्रह्मांडीय लय के साथ संरेखित करें।",
    slideTitle3: "पवित्र ज्योतिषीय मंडल",
    slideDesc3: "ब्रह्मांड के ऊर्जावान पैटर्न के साथ गहराई से जुड़ें।",
    slideTitle4: "आपकी वैदिक जन्म कुंडली",
    slideDesc4: "अपने जीवन की सच्ची यात्रा के रहस्यों को खोलें।",
    slideTitle5: "रोशनी के खुशी के त्योहार",
    slideDesc5: "पारंपरिक समारोहों की आध्यात्मिक ऊर्जा को अपनाएं।",
    slideTitle6: "पवित्र अग्नि पूजा",
    slideDesc6: "प्राचीन अग्नि अनुष्ठानों के माध्यम से परमात्मा के साथ सामंजस्य स्थापित करें।",
    slideTitle7: "रहस्यमय चंद्र यात्रा",
    slideDesc7: "पवित्र नक्षत्रों के माध्यम से चंद्रमा के पारगमन का पालन करें।",
    slideTitle8: "ब्रह्मांडीय ओम और कमल",
    slideDesc8: "भीतर आंतरिक शांति और आध्यात्मिक ज्ञान को जगाएं।",
    slideTitle9: "पारंपरिक पंचांग",
    slideDesc9: "हिंदू कैलेंडर की कालातीत लय को उजागर करें।",
    slideTitle10: "आनंदमयी कीर्तन",
    slideDesc10: "सामूहिक संकीर्तन के शुद्ध आनंद का अनुभव करें।",
    slideTitle11: "आरती उत्सव",
    slideDesc11: "पारंपरिक पारिवारिक आरती के साथ अपना मार्ग रोशन करें।",
    slideTitle12: "आध्यात्मिक शांति",
    slideDesc12: "मंदिर के पवित्र वातावरण में आंतरिक शांति पाएं।",
    slideTitle13: "वैदिक अग्नि यज्ञ",
    slideDesc13: "प्राचीन अग्नि अनुष्ठानों के माध्यम से दिव्य आशीर्वाद प्राप्त करें।",
    slideTitle14: "पवित्र जप",
    slideDesc14: "पवित्र नामों का जप करें और अपनी आध्यात्मिक चेतना को जाग्रत करें।",
    testiText0: "जब से मैंने धार्मिक कैलेंडर के अनुसार अपना जन्मदिन मनाना शुरू किया है, मैंने अपनी ऊर्जा में एक गहरा बदलाव देखा है। ऐसा लगता है जैसे ब्रह्मांड मेरे साथ संरेखित हो रहा है!",
    testiAuthor0: "राजेश के.",
    testiText1: "मैं हमेशा गलत तारीख पर जश्न मना रही थी! ग्रेगोरियन कैलेंडर सिर्फ एक संख्या है, लेकिन तिथि और नक्षत्र संरेखण वास्तविक ब्रह्मांडीय आशीर्वाद लाता है।",
    testiAuthor1: "प्रिया एस.",
    testiText2: "इस ऐप ने मुझे अपना प्रामाणिक जन्मदिन खोजने में मदद की। जिस पहले साल मैंने अपना धार्मिक जन्मदिन मनाया, मुझे लंबे समय से प्रतीक्षित पदोन्नति मिली। यह सिर्फ एक तारीख नहीं है; यह एक आध्यात्मिक शुरुआत है।",
    testiAuthor2: "अमित पी.",
    testiText3: "अंततः मुझे अपना असली जन्मदिन मिल गया! ग्रेगोरियन कैलेंडर से कोई जुड़ाव महसूस नहीं होता था, लेकिन यह धार्मिक तिथि मुझे अपनी जड़ों के करीब लाती है।",
    testiAuthor3: "स्नेहा एम.",
    testiText4: "हमारी परंपराओं से फिर से जुड़ने का यह कितना सुंदर तरीका है। मेरा परिवार अब दोनों तारीखें मनाता है, लेकिन धार्मिक जन्मदिन अधिक आध्यात्मिक रूप से संतोषजनक लगता है।",
    testiAuthor4: "विक्रम आर.",
    testiText5: "मुझे पहले संदेह था, लेकिन नक्षत्र और तिथि गणना की सटीकता अविश्वसनीय है। अपना ब्रह्मांडीय जन्मदिन खोजना वास्तव में आंखें खोलने वाला अनुभव था।",
    testiAuthor5: "अदिति वी.",
    testiText6: "यह उपकरण एक आशीर्वाद है! मैं वर्षों से अपने प्रामाणिक हिंदू जन्मदिन का पता लगाने की कोशिश कर रहा था। यह उत्सव बहुत व्यक्तिगत और दिव्य महसूस हुआ।",
    testiAuthor6: "करन डी.",
    testiText7: "इस्कॉन भक्त के रूप में, तिथि के आधार पर अपना सटीक धार्मिक जन्मदिन जानने से मुझे अपनी आध्यात्मिक प्रथाओं को संरेखित करने में मदद मिलती है।",
    testiAuthor7: "अंजलि जी.",
    testiText8: "हमारे दादा-दादी हमेशा पंचांग का पालन करते थे, लेकिन हम इससे दूर हो गए थे। इस ऐप ने उस खूबसूरत परंपरा को हमारे परिवार में वापस ला दिया है।",
    testiAuthor8: "रोहित एस.",
    testiText9: "अद्भुत अनुभव! गणनाएँ सटीक हैं, और मेरी तिथि पर जश्न मनाना अविश्वसनीय रूप से शुभ लगा। उस दिन की ऊर्जा बस अद्भुत थी।",
    testiAuthor9: "मीरा टी.",
    heroProblemTitle: "चुनौती: स्थिर सौर तिथियां बनाम गतिशील ब्रह्मांडीय लय",
    heroProblemDesc: <><p>जब हम मानक ग्रेगोरियन (अंग्रेजी) कैलेंडर पर निर्भर होते हैं, तो आपका जन्मदिन स्थायी रूप से एक स्थिर सौर तिथि से बंधा होता है। हालाँकि, तारों और ग्रहों का वास्तविक ब्रह्मांडीय संरेखण—आपके जन्म के क्षण में मौजूद सटीक खगोलीय स्थिति—हर साल नाटकीय रूप से बदल जाती है। यही कारण है कि दीवाली, नवरात्रि और गणेश चतुर्थी जैसे प्राचीन त्योहार हर साल अलग-अलग तिथियों पर मनाए जाते हैं।</p><p>एक निश्चित सौर तिथि का पालन करके, आप अपनी वास्तविक ज्योतिषीय वापसी के गहरे आध्यात्मिक महत्व को याद करते हैं। पारंपरिक धार्मिक कैलेंडर चंद्रमा और ब्रह्मांड के बीच गतिशील नृत्य का सम्मान करता है, जो आपके सच्चे खगोलीय मूल से एक गहरा प्रामाणिक संबंध प्रदान करता है।</p></>,
    heroSolutionTitle: "समाधान: सटीक धार्मिक संरेखण",
    heroSolutionDesc: <><p>हमारा एंटरप्राइज़-ग्रेड धार्मिक जन्मदिन कैलकुलेटर आपके जन्म के सटीक <b>चंद्र दिवस (तिथि)</b> और <b>जन्म तारे (नक्षत्र)</b> की गणना करने के लिए उच्च-सटीक खगोलीय एल्गोरिदम का लाभ उठाता है। इन खगोलीय लयों को सटीक रूप से ट्रैक करके, हम हर साल आपके जन्म का जश्न मनाने के लिए प्रामाणिक, पारंपरिक तिथि निर्धारित करते हैं।</p><p>यह उपकरण आपके सटीक देशांतर, अक्षांश और समयक्षेत्र के अनुकूल होने के लिए सावधानीपूर्वक इंजीनियर किया गया है, यह सुनिश्चित करता है कि ग्रह गणना आपके विशिष्ट जन्मस्थान के ऊपर वास्तविक ब्रह्मांडीय स्थिति को दर्शाती है।</p></>,
    heroWhoTitle: "इस प्रणाली से किसे लाभ होता है?",
    heroWhoDesc: <><p>यह एप्लिकेशन आध्यात्मिक साधकों, धार्मिक परंपराओं के अनुयायियों और इस दुनिया में उनके आगमन का मार्गदर्शन करने वाली सार्वभौमिक लयों के साथ फिर से जुड़ने का प्रयास करने वाले व्यक्तियों के लिए सावधानीपूर्वक डिज़ाइन किया गया है। यह प्रामाणिक पारंपरिक समारोहों की योजना बनाने, शुभ पूजा आयोजित करने, या गहरे व्यक्तिगत चिंतन के लिए समय समर्पित करने के लिए एकदम सही उपकरण है।</p></>,
    heroWhyTitle: "हमारी पद्धति बेहतर क्यों है",
    heroWhyDesc: <><p>उन्नत कम्प्यूटेशनल ज्योतिष का उपयोग करके निर्मित, यह प्लेटफ़ॉर्म वैदिक खगोलीय विज्ञान के हजारों वर्षों के ज्ञान के साथ आपके जन्म के सटीक समय और भौगोलिक निर्देशांक को क्रॉस-रेफरेंस करता है। हमारा कठोर गणितीय दृष्टिकोण बेजोड़, पेशेवर-ग्रेड सटीकता प्रदान करता है।</p></>,
    heroDisclaimerTitle: "महत्वपूर्ण कानूनी और देयता अस्वीकरण",
    heroDisclaimerDesc: <><p>इस एप्लिकेशन द्वारा प्रदान की गई जानकारी, गणना, तिथियां और अन्य सामग्री <strong>सख्ती से केवल आध्यात्मिक, शैक्षिक और मनोरंजन उद्देश्यों के लिए हैं।</strong> इस ऐप के निर्माता, मालिक और संचालक ज्योतिषीय गणनाओं या इसमें मौजूद किसी भी अन्य जानकारी की <strong>सटीकता, पूर्णता या विश्वसनीयता के संबंध में कोई वारंटी (व्यक्त या निहित) प्रदान नहीं करते हैं।</strong></p><p>यह एप्लिकेशन <strong>पेशेवर, चिकित्सा, मनोवैज्ञानिक, वित्तीय या कानूनी सलाह प्रदान नहीं करता है और इसे इस रूप में नहीं समझा जाना चाहिए।</strong></p><p>इस सेवा का उपयोग करके, आप स्पष्ट रूप से सहमत हैं कि निर्माता, मालिक और संचालक प्रदान की गई तिथियों, गणनाओं या अंतर्दृष्टि के आधार पर <strong>किए गए किसी भी निर्णय, की गई कार्रवाई या हुए परिणामों के लिए कोई दायित्व नहीं लेते हैं।</strong> आप यह भी सहमत हैं कि इस जानकारी पर आप जो भी भरोसा करते हैं वह पूरी तरह से <strong>आपके अपने जोखिम पर है।</strong></p><p>इस एप्लिकेशन के निर्माता, मालिक और संचालक इस सॉफ़्टवेयर या सेवा के उपयोग से उत्पन्न होने वाले <strong>किसी भी कानूनी दावे, नुकसान, देनदारियों या विवादों</strong> की स्थिति में <strong>पूरी तरह से देयता से मुक्त हैं।</strong> आप सहमत हैं कि उन पर कोई कानूनी दायित्व नहीं लगाया जाएगा।</p></>,
    followupPlaceholder: "एक अनुवर्ती प्रश्न पूछें...",
    termsContent: <><h3>1. शर्तों की स्वीकृति</h3><p>HaBER Software Solutions ("हम" या "हमारा") द्वारा संचालित "फाइंड माय धार्मिक बर्थडे" एप्लिकेशन ("ऐप") तक पहुंच कर और उसका उपयोग करके, आप ("उपयोगकर्ता") स्वीकार करते हैं कि आपने इन नियमों और शर्तों को पढ़ और समझ लिया है और कानूनी रूप से बाध्य होने के लिए सहमत हैं। यदि आप इन शर्तों से सहमत नहीं हैं, तो आपको तुरंत ऐप का उपयोग बंद कर देना चाहिए।</p><h3>2. सेवा की प्रकृति और कोई व्यावसायिक सलाह नहीं</h3><p>ऐप <strong>विशिष्ट रूप से आध्यात्मिक, शैक्षिक और मनोरंजन उद्देश्यों के लिए</strong> तिथियां, अंतर्दृष्टि और खगोलीय गणना उत्पन्न करता है। हम चिकित्सा, मनोवैज्ञानिक, वित्तीय, कानूनी या अन्य पेशेवर सलाह प्रदान नहीं करते हैं, न ही किसी भी सामग्री को इस रूप में समझा जाना चाहिए। प्रदान की गई जानकारी पर कोई भी निर्भरता पूरी तरह से उपयोगकर्ता के अपने जोखिम पर है।</p><h3>3. दायित्व की पूर्ण सीमा और क्षतिपूर्ति</h3><p>लागू कानून द्वारा अनुमत अधिकतम सीमा तक, HaBER Software Solutions, इसके निर्माता, मालिक, अधिकारी और सहयोगी <strong>किसी भी परिस्थिति में इस ऐप के उपयोग या उपयोग करने में असमर्थता से उत्पन्न होने वाले किसी भी प्रत्यक्ष, अप्रत्यक्ष, आकस्मिक, परिणामी, विशेष या अनुकरणीय नुकसान, हानि या खर्च के लिए उत्तरदायी नहीं होंगे।</strong> उपयोगकर्ता स्पष्ट रूप से ऐप की सामग्री के आधार पर किए गए परिणामों, निर्णयों या कार्यों के लिए हम पर मुकदमा करने, दावे करने या हमें जिम्मेदार ठहराने के किसी भी अधिकार को माफ करता है। उपयोगकर्ता ऐप के उपयोग से उत्पन्न होने वाले किसी भी तीसरे पक्ष के दावों के खिलाफ HaBER Software Solutions को क्षतिपूर्ति करने और हानिरहित रखने के लिए सहमत है।</p><h3>4. कोई वारंटी या गारंटी नहीं</h3><p>ऐप "जैसी है" और "जैसी उपलब्ध है" के आधार पर प्रदान किया जाता है, बिना किसी प्रकार की वारंटी के, चाहे वह व्यक्त या निहित हो। हम कोई वारंटी नहीं देते हैं कि ऐप निर्बाध, समय पर, सुरक्षित, त्रुटि-मुक्त या गणितीय रूप से त्रुटिहीन होगा।</p><h3>5. बौद्धिक संपदा अधिकार</h3><p>ऐप में निहित सभी सॉफ़्टवेयर कोड, गणितीय जनरेटर, एल्गोरिदम, उपयोगकर्ता इंटरफ़ेस, ब्रांडिंग और पाठ HaBER Software Solutions की अनन्य बौद्धिक संपदा हैं। उपयोगकर्ता को कोई अधिकार या लाइसेंस प्रदान नहीं किया जाता है, सिवाय इच्छित के रूप में ऐप का उपयोग करने के सीमित, गैर-अनन्य अधिकार के।</p><h3>6. शासी कानून और विशेष क्षेत्राधिकार</h3><p>ये शर्तें जर्मनी संघीय गणराज्य के कानूनों द्वारा शासित और उसके अनुसार समझी जाएंगी। इन शर्तों या ऐप के उपयोग से उत्पन्न या संबंधित कोई भी कानूनी विवाद, दावे या कार्यवाही विशेष रूप से बर्लिन, जर्मनी की सक्षम अदालतों में लाई जाएगी।</p></>,
    privacyContent: <><h3>1. परिचय और दायरा</h3><p>हम आपकी गोपनीयता को गंभीरता से लेते हैं। यह गोपनीयता नीति विवरण देती है कि जब आप "फाइंड माय धार्मिक बर्थडे" ऐप का उपयोग करते हैं तो HaBER Software Solutions ("हम", "हमें") आपके व्यक्तिगत डेटा को कैसे एकत्र, उपयोग, संसाधित और सुरक्षित करता है। यह नीति सामान्य डेटा संरक्षण विनियमन (GDPR) के सख्त मानकों का अनुपालन करती है।</p><h3>2. डेटा संग्रह और प्रसंस्करण के तरीके</h3><p><strong>अतिथि उपयोगकर्ता:</strong> जब आप बिना किसी खाते के ऐप का उपयोग करते हैं, तो गणना उत्पन्न करने के लिए आपके जन्म डेटा (दिनांक, समय और स्थान) को ब्राउज़र के भीतर अल्पकालिक रूप से संसाधित किया जाता है। हम इस अत्यधिक व्यक्तिगत डेटा को अपने बैकएंड सर्वर पर प्रसारित या संग्रहीत नहीं करते हैं।</p><p><strong>पंजीकृत उपयोगकर्ता:</strong> यदि आप प्रोफाइल को बचाने के लिए एक खाता बनाना चुनते हैं, तो हम आपके प्रमाणीकरण क्रेडेंशियल्स (जैसे ईमेल पता) और जन्म डेटा प्रोफाइल को एकत्र और सुरक्षित रूप से संग्रहीत करते हैं जिन्हें आप स्पष्ट रूप से सहेजना चुनते हैं। यह डेटा Google Firebase में सुरक्षित रूप से संग्रहीत किया जाता है।</p><h3>3. प्रसंस्करण का उद्देश्य</h3><p>हम आपके डेटा को विशेष रूप से ऐप की मुख्य कार्यक्षमता प्रदान करने, आपकी पहचान प्रमाणित करने, आपके खाते को सुरक्षित करने और सत्रों में आपके सहेजे गए प्रोफाइल को बनाए रखने के उद्देश्य से संसाधित करते हैं। हम किसी भी परिस्थिति में तीसरे पक्ष के डेटा ब्रोकरों या विज्ञापनदाताओं को <strong>आपका व्यक्तिगत डेटा बेचते, किराए पर नहीं देते या मुद्रीकृत नहीं करते हैं</strong>।</p><h3>4. तृतीय-पक्ष बुनियादी ढांचा</h3><p>उच्च उपलब्धता और मजबूत सुरक्षा सुनिश्चित करने के लिए, हम अपने बुनियादी ढांचे प्रदाताओं के रूप में Google Cloud Platform और Firebase का उपयोग करते हैं। ये संस्थाएं GDPR के अनुपालन में कानूनी रूप से बाध्यकारी डेटा प्रोसेसिंग समझौतों (DPA) के तहत सख्ती से डेटा प्रोसेसर के रूप में आपके डेटा को संसाधित करती हैं। हम आवश्यक कुकीज़ का उपयोग कर सकते हैं जो आपके लॉगिन सत्र को बनाए रखने और एप्लिकेशन को सुरक्षित करने के लिए सख्ती से आवश्यक हैं।</p><h3>5. आपके डेटा संरक्षण अधिकार</h3><p>GDPR के तहत, आपके पास अपने डेटा के संबंध में व्यापक अधिकार हैं। आपके पास हमारे द्वारा आपके बारे में रखे गए डेटा तक पहुंच का अनुरोध करने का अधिकार है, अशुद्धियों में सुधार की मांग करने का अधिकार है, और <strong>"भूल जाने का अधिकार" (आपके डेटा को पूरी तरह से हटाना)</strong> है। इनमें से किसी भी अधिकार का प्रयोग करने के लिए, आप अपनी खाता सेटिंग के भीतर अपना डेटा प्रबंधित कर सकते हैं या सीधे हमसे संपर्क कर सकते हैं।</p><h3>6. सुरक्षा उपाय</h3><p>हम आपके डेटा को अनधिकृत पहुंच, हानि या परिवर्तन से बचाने के लिए एंटरप्राइज़-ग्रेड तकनीकी और संगठनात्मक सुरक्षा उपाय अपनाते हैं, जिसमें ट्रांज़िट (HTTPS/TLS) और आराम के समय एन्क्रिप्शन शामिल है।</p></>,
    imprintContent: <><h3>§ 5 TMG (टेलीमीडिया अधिनियम) के अनुसार आवश्यक जानकारी</h3><p><strong>प्रदाता और संचालक:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>संपर्क जानकारी</h3><p>फ़ोन: +49 (0) 157 3930 XXXX<br/>ईमेल: info@habersoftware.example.com</p><h3>कानूनी और व्यावसायिक प्रतिनिधित्व</h3><p>अधिकृत प्रतिनिधि: Hari aus Berlin</p><h3>विवाद समाधान</h3><p>यूरोपीय आयोग ऑनलाइन विवाद समाधान (OS) के लिए एक मंच प्रदान करता है, जिसे <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a> पर पाया जा सकता है। हम उपभोक्ता मध्यस्थता बोर्ड के समक्ष विवाद निपटान कार्यवाही में भाग लेने के लिए न तो बाध्य हैं और न ही इच्छुक हैं।</p><h3>सामग्री और लिंक के लिए देयता</h3><p>एक सेवा प्रदाता के रूप में, हम § 7 Abs.1 TMG के अनुसार सामान्य कानूनों के अनुसार इन पृष्ठों पर अपनी सामग्री के लिए जिम्मेदार हैं। हालाँकि, §§ 8 से 10 TMG के अनुसार, हम प्रेषित या संग्रहीत तृतीय-पक्ष जानकारी की निगरानी करने या अवैध गतिविधि का संकेत देने वाली परिस्थितियों की जांच करने के लिए बाध्य नहीं हैं। हमारी साइट में बाहरी तृतीय-पक्ष वेबसाइटों के लिंक हो सकते हैं जिनकी सामग्री पर हमारा कोई नियंत्रण नहीं है। इसलिए, हम इस बाहरी सामग्री के लिए कोई दायित्व स्वीकार नहीं कर सकते।</p></>,
    underConstructionBtn: "निर्माणाधीन",
    guestLoginBtn: "अतिथि प्रवेश",
    underConstructionTitle: "निर्माणाधीन",
    underConstructionDesc1: "यह एप्लिकेशन वर्तमान में बनाया जा रहा है।",
    underConstructionDesc2: "असुविधा के लिए हमें खेद है। कृपया बाद में फिर से देखें।",
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
    slideTitle0: "మీ నిజమైన కాస్మిక్ రాకను జరుపుకోండి",
    slideDesc0: "ఖచ్చితమైన వేద జ్యోతిషశాస్త్రం ఆధారంగా మీ ఖచ్చితమైన ధార్మిక పుట్టినరోజును కనుగొనండి.",
    slideTitle1: "ప్రాచీనుల జ్ఞానం",
    slideDesc1: "మా అధిక-ఖచ్చితమైన నమూనాలు పురాతన పంచాంగ లెక్కలను ఉపయోగిస్తాయి.",
    slideTitle2: "ఖగోళ వేడుక",
    slideDesc2: "మీ ప్రత్యేక రోజును ప్రామాణికమైన కాస్మిక్ లయలతో సమలేఖనం చేయండి.",
    slideTitle3: "పవిత్ర జ్యోతిషశాస్త్ర మండలలు",
    slideDesc3: "విశ్వం యొక్క శక్తివంతమైన నమూనాలతో లోతుగా కనెక్ట్ అవ్వండి.",
    slideTitle4: "మీ వేద జన్మ చార్ట్",
    slideDesc4: "మీ జీవిత నిజమైన ప్రయాణం యొక్క రహస్యాలను అన్‌లాక్ చేయండి.",
    slideTitle5: "కాంతి పండుగలు",
    slideDesc5: "సాంప్రదాయ వేడుకల ఆధ్యాత్మిక శక్తిని స్వీకరించండి.",
    slideTitle6: "పవిత్ర అగ్ని పూజలు",
    slideDesc6: "పురాతన అగ్ని ఆచారాల ద్వారా దైవంతో సమన్వయం చేసుకోండి.",
    slideTitle7: "రహస్య చంద్ర ప్రయాణం",
    slideDesc7: "పవిత్ర నక్షత్రాల ద్వారా చంద్రుని రవాణాను అనుసరించండి.",
    slideTitle8: "కాస్మిక్ ఓం & లోటస్",
    slideDesc8: "లోపల అంతర్గత శాంతి మరియు ఆధ్యాత్మిక జ్ఞానాన్ని మేల్కొల్పండి.",
    slideTitle9: "సాంప్రదాయ పంచాంగ్",
    slideDesc9: "హిందూ క్యాలెండర్ యొక్క కలకాలం లయలను కనుగొనండి.",
    slideTitle10: "ఆనందకరమైన కీర్తన",
    slideDesc10: "సామూహిక కీర్తనల స్వచ్ఛమైన ఆనందాన్ని అనుభవించండి.",
    slideTitle11: "హారతి వేడుకలు",
    slideDesc11: "సాంప్రదాయ కుటుంబ హారతితో మీ మార్గాన్ని ప్రకాశవంతం చేయండి.",
    slideTitle12: "ఆధ్యాత్మిక ప్రశాంతత",
    slideDesc12: "ఆలయం యొక్క పవిత్ర వాతావరణంలో అంతర్గత శాంతిని కనుగొనండి.",
    slideTitle13: "వేద అగ్ని యజ్ఞం",
    slideDesc13: "పురాతన అగ్ని ఆచారాల ద్వారా దైవిక ఆశీర్వాదాలను పొందండి.",
    slideTitle14: "పవిత్ర జపం",
    slideDesc14: "పవిత్ర నామాలను జపించండి మరియు మీ ఆధ్యాత్మిక స్పృహను మేల్కొల్పండి.",
    testiText0: "నేను ధార్మిక క్యాలెండర్ ప్రకారం నా పుట్టినరోజు జరుపుకోవడం ప్రారంభించినప్పటి నుండి, నా శక్తిలో లోతైన మార్పును గమనించాను. విశ్వం నాతో అనుసంధానం అవుతున్నట్లు అనిపిస్తుంది!",
    testiAuthor0: "రాజేష్ కె.",
    testiText1: "నేను ఎప్పుడూ తప్పు తేదీలో జరుపుకునేదాన్ని! గ్రెగోరియన్ క్యాలెండర్ కేవలం ఒక సంఖ్య, కానీ తిథి మరియు నక్షత్రం అమరిక నిజమైన విశ్వ ఆశీర్వాదాలను తెస్తుంది.",
    testiAuthor1: "ప్రియా ఎస్.",
    testiText2: "ఈ యాప్ నా అసలు పుట్టినరోజును కనుగొనడంలో నాకు సహాయపడింది. నేను నా ధార్మిక పుట్టినరోజును జరుపుకున్న మొదటి సంవత్సరంలో, నేను చాలా కాలంగా ఎదురుచూస్తున్న పదోన్నతి పొందాను. ఇది కేవలం తేదీ కాదు; ఇది ఆధ్యాత్మిక పునఃప్రారంభం.",
    testiAuthor2: "అమిత్ పి.",
    testiText3: "చివరికి నా నిజమైన పుట్టినరోజును కనుగొన్నాను! గ్రెగోరియన్ క్యాలెండర్‌తో నాకు ఎటువంటి అనుబంధం అనిపించలేదు, కానీ ఈ ధార్మిక తేదీ నన్ను నా మూలాలకు దగ్గర చేస్తుంది.",
    testiAuthor3: "స్నేహా ఎం.",
    testiText4: "మన సంప్రదాయాలతో తిరిగి కనెక్ట్ కావడానికి ఇది ఎంత అందమైన మార్గం. నా కుటుంబం ఇప్పుడు రెండు తేదీలను జరుపుకుంటుంది, కానీ ధార్మిక పుట్టినరోజు మరింత ఆధ్యాత్మికంగా సంతృప్తికరంగా అనిపిస్తుంది.",
    testiAuthor4: "విక్రమ్ ఆర్.",
    testiText5: "నాకు మొదట్లో సందేహం ఉండేది, కానీ నక్షత్రం మరియు తిథి లెక్కల ఖచ్చితత్వం నమ్మశక్యం కాదు. నా కాస్మిక్ పుట్టినరోజును కనుగొనడం నిజంగా కళ్ళు తెరిపించే అనుభవం.",
    testiAuthor5: "అదితి వి.",
    testiText6: "ఈ సాధనం ఒక వరం! నేను నా ప్రామాణిక హిందూ పుట్టినరోజును తెలుసుకోవడానికి సంవత్సరాలుగా ప్రయత్నిస్తున్నాను. ఈ వేడుక చాలా వ్యక్తిగతంగా మరియు దైవికంగా అనిపించింది.",
    testiAuthor6: "కరణ్ డి.",
    testiText7: "ఇస్కాన్ భక్తురాలిగా, తిథి ఆధారంగా నా ఖచ్చితమైన ధార్మిక పుట్టినరోజును తెలుసుకోవడం నా ఆధ్యాత్మిక అభ్యాసాలను సమలేఖనం చేయడంలో నాకు సహాయపడుతుంది.",
    testiAuthor7: "అంజలి జి.",
    testiText8: "మా తాతలు ఎప్పుడూ పంచాంగాన్ని అనుసరించేవారు, కానీ మేము దాని నుండి దూరమయ్యాము. ఈ యాప్ ఆ అందమైన సంప్రదాయాన్ని మా కుటుంబానికి తిరిగి తీసుకువచ్చింది.",
    testiAuthor8: "రోహిత్ ఎస్.",
    testiText9: "అద్భుతమైన అనుభవం! లెక్కలు ఖచ్చితమైనవి, మరియు నా తిథి రోజున జరుపుకోవడం నమ్మశక్యం కాని శుభప్రదంగా అనిపించింది. ఆ రోజు శక్తి అద్భుతంగా ఉంది.",
    testiAuthor9: "మీరా టి.",
    heroProblemTitle: "సమస్య: స్థిరమైన తేదీలు వర్సెస్ కాస్మిక్ రిథమ్స్",
    heroProblemDesc: <><p>ప్రామాణిక గ్రెగోరియన్ (ఇంగ్లీష్) క్యాలెండర్‌ను అనుసరించినప్పుడు, మీ పుట్టినరోజు శాశ్వతంగా స్థిరమైన సౌర తేదీతో ముడిపడి ఉంటుంది. అయినప్పటికీ, నక్షత్రాలు మరియు గ్రహాల యొక్క నిజమైన విశ్వ అమరిక-మీరు పుట్టిన క్షణంలో ఉన్న ఖచ్చితమైన ఖగోళ ఆకృతీకరణ-సంవత్సరం నుండి సంవత్సరానికి మారుతుంది. దీపావళి, నవరాత్రి వంటి పండుగలు ప్రతి సంవత్సరం వేర్వేరు తేదీలలో జరుపుకోవడానికి ఇదే కారణం.</p><p>స్థిరమైన తేదీని అనుసరించడం ద్వారా, మీ అసలు జ్యోతిష్య పునరాగమనం యొక్క లోతైన ఆధ్యాత్మిక ప్రాముఖ్యతను మీరు కోల్పోతారు. ధార్మిక క్యాలెండర్ మీ నిజమైన ఖగోళ మూలాలకు లోతైన ప్రామాణికమైన కనెక్షన్‌ను అందిస్తుంది.</p></>,
    heroSolutionTitle: "పరిష్కారం: ఖచ్చితమైన ధార్మిక అమరికలు",
    heroSolutionDesc: <><p>మా ధార్మిక పుట్టినరోజు క్యాలిక్యులేటర్ మీ ఖచ్చితమైన <b>చంద్ర రోజు (తిథి)</b> మరియు <b>జన్మ నక్షత్రం (నక్షత్రం)</b>ను లెక్కించడానికి అత్యంత ఖచ్చితమైన ఖగోళ అల్గారిథమ్‌లను ప్రభావితం చేస్తుంది. ఈ ఖగోళ లయలను ఖచ్చితంగా ట్రాక్ చేయడం ద్వారా, మేము ప్రతి సంవత్సరం మీ పుట్టినరోజును జరుపుకోవడానికి ప్రామాణికమైన, సాంప్రదాయ తేదీని నిర్ణయిస్తాము.</p><p>మీ ఖచ్చితమైన రేఖాంశం, అక్షాంశం మరియు సమయమండలికి అనుగుణంగా ఈ సాధనం ఖచ్చితంగా రూపొందించబడింది, గ్రహాల లెక్కలు మీ నిర్దిష్ట జన్మస్థలం పైన ఉన్న నిజమైన విశ్వ స్థితిని ప్రతిబింబిస్తాయని నిర్ధారిస్తుంది.</p></>,
    heroWhoTitle: "ఈ వ్యవస్థ నుండి ఎవరికి ప్రయోజనం?",
    heroWhoDesc: <><p>ఈ అప్లికేషన్ ఆధ్యాత్మిక అన్వేషకులు, ధార్మిక సంప్రదాయాలను అనుసరించే వారి కోసం మరియు విశ్వ లయలతో మళ్లీ కనెక్ట్ అవ్వడానికి ప్రయత్నిస్తున్న వ్యక్తుల కోసం రూపొందించబడింది. ప్రామాణికమైన సాంప్రదాయ వేడుకలను ప్లాన్ చేయడానికి, పవిత్రమైన పూజలను షెడ్యూల్ చేయడానికి ఇది సరైన సాధనం.</p></>,
    heroWhyTitle: "మా పద్దతి ఎందుకు ఉత్తమమైనది",
    heroWhyDesc: <><p>అధునాతన గణన జ్యోతిషశాస్త్రాన్ని ఉపయోగించి రూపొందించబడిన ఈ ప్లాట్‌ఫారమ్ మీ ఖచ్చితమైన జనన సమయం మరియు భౌగోళిక కోఆర్డినేట్‌లను వేల సంవత్సరాల నాటి వేద ఖగోళ విజ్ఞానంతో క్రాస్ రిఫరెన్స్ చేస్తుంది. మా కఠినమైన గణిత విధానం సాటిలేని ఖచ్చితత్వాన్ని అందిస్తుంది.</p></>,
    heroDisclaimerTitle: "ముఖ్యమైన చట్టపరమైన మరియు బాధ్యత నిరాకరణ",
    heroDisclaimerDesc: <><p>ఈ అప్లికేషన్ అందించే సమాచారం, గణనలు, తేదీలు మరియు ఇతర కంటెంట్ <strong>కేవలం ఆధ్యాత్మిక, విద్యా మరియు వినోద ప్రయోజనాల కోసం మాత్రమే</strong> ఉద్దేశించబడ్డాయి. ఈ అప్లికేషన్ యొక్క సృష్టికర్తలు, యజమానులు మరియు నిర్వాహకులు ఇందులోని జ్యోతిష్య గణనలు లేదా ఇతర సమాచారం యొక్క <strong>ఖచ్చితత్వం, సంపూర్ణత లేదా విశ్వసనీయతకు సంబంధించి ఎలాంటి స్పష్టమైన లేదా పరోక్షమైన హామీలు (Warranties) ఇవ్వరు.</strong></p><p>ఈ అప్లికేషన్ <strong>వృత్తిపరమైన, వైద్య, మానసిక, ఆర్థిక లేదా చట్టపరమైన సలహాలను అందించదు మరియు అలాంటి సలహాలుగా పరిగణించరాదు.</strong></p><p>ఈ సేవను ఉపయోగించడం ద్వారా, ఈ అప్లికేషన్ అందించిన తేదీలు, గణనలు లేదా ఇతర అంతర్దృష్టుల ఆధారంగా మీరు తీసుకునే <strong>ఏ నిర్ణయాలు, చేపట్టే చర్యలు లేదా వాటి వల్ల కలిగే పరిణామాలకు</strong> సృష్టికర్తలు, యజమానులు లేదా నిర్వాహకులు <strong>ఎటువంటి బాధ్యత వహించరని మీరు స్పష్టంగా అంగీకరిస్తున్నారు.</strong> ఈ సమాచారంపై మీరు ఉంచే ఏ విధమైన ఆధారపడటం పూర్తిగా <strong>మీ స్వంత బాధ్యత మరియు మీ స్వంత ప్రమాదం (at your own risk)</strong> అని కూడా మీరు అంగీకరిస్తున్నారు.</p><p>ఈ సాఫ్ట్వేర్ లేదా సేవ వినియోగం వల్ల ఉత్పన్నమయ్యే <strong>ఏవైనా చట్టపరమైన దావాలు, నష్టాలు, క్లెయిమ్లు, బాధ్యతలు లేదా వివాదాల విషయంలో</strong> ఈ అప్లికేషన్ యొక్క సృష్టికర్తలు, యజమానులు మరియు నిర్వాహకులు <strong>పూర్తిగా బాధ్యత నుండి విముక్తులుగా ఉంటారు.</strong> వారిపై ఎలాంటి చట్టపరమైన బాధ్యత విధించబడదని మీరు అంగీకరిస్తున్నారు.</p></>,
    followupPlaceholder: "తదుపరి ప్రశ్న అడగండి...",
    termsContent: <><h3>1. నిబంధనల అంగీకారం</h3><p>HaBER సాఫ్ట్‌వేర్ సొల్యూషన్స్ ("మేము" లేదా "మా") ద్వారా నిర్వహించబడే "ఫైండ్ మై ధార్మిక్ బర్త్‌డే" అప్లికేషన్ ("యాప్")ను యాక్సెస్ చేయడం మరియు ఉపయోగించడం ద్వారా, మీరు ("వినియోగదారు") ఈ నిబంధనలు మరియు షరతులను చదివి, అర్థం చేసుకుని, చట్టబద్ధంగా కట్టుబడి ఉండటానికి అంగీకరిస్తున్నారని గుర్తిస్తున్నారు. మీరు ఈ నిబంధనలకు అంగీకరించకపోతే, మీరు వెంటనే యాప్ వాడకాన్ని నిలిపివేయాలి.</p><h3>2. సేవ యొక్క స్వభావం మరియు వృత్తిపరమైన సలహా కాదు</h3><p>యాప్ <strong>కేవలం ఆధ్యాత్మిక, విద్యా మరియు వినోద ప్రయోజనాల కోసం మాత్రమే</strong> తేదీలు, అంతర్దృష్టులు మరియు ఖగోళ గణనలను రూపొందిస్తుంది. మేము వైద్య, మానసిక, ఆర్థిక, చట్టపరమైన లేదా ఇతర వృత్తిపరమైన సలహాలను అందించము, అలాగే ఏ కంటెంట్‌ను అలా పరిగణించకూడదు. అందించిన సమాచారంపై ఆధారపడటం పూర్తిగా వినియోగదారు స్వంత బాధ్యత.</p><h3>3. బాధ్యత మరియు నష్టపరిహారం యొక్క సంపూర్ణ పరిమితి</h3><p>వర్తించే చట్టం ద్వారా అనుమతించబడిన గరిష్ట పరిధి వరకు, HaBER సాఫ్ట్‌వేర్ సొల్యూషన్స్, దాని సృష్టికర్తలు, యజమానులు, అధికారులు మరియు అనుబంధ సంస్థలు <strong>ఈ యాప్ ఉపయోగం లేదా ఉపయోగించలేకపోవడం వల్ల ఉత్పన్నమయ్యే ప్రత్యక్ష, పరోక్ష, ఆకస్మిక, పర్యవసానమైన, ప్రత్యేక లేదా ఆదర్శప్రాయమైన నష్టాలు, నష్టాలు లేదా ఖర్చులకు ఎట్టి పరిస్థితుల్లోనూ బాధ్యత వహించవు.</strong> యాప్ కంటెంట్ ఆధారంగా తీసుకున్న ఫలితాలు, నిర్ణయాలు లేదా చర్యల కోసం మాపై దావా వేసే, క్లెయిమ్ చేసే లేదా మమ్మల్ని బాధ్యులను చేసే హక్కును వినియోగదారు స్పష్టంగా వదులుకుంటారు. యాప్ ఉపయోగం వల్ల ఉత్పన్నమయ్యే ఏవైనా థర్డ్-పార్టీ క్లెయిమ్‌ల నుండి HaBER సాఫ్ట్‌వేర్ సొల్యూషన్స్‌కు నష్టపరిహారం చెల్లించడానికి మరియు హానిచేయని విధంగా ఉంచడానికి వినియోగదారు అంగీకరిస్తున్నారు.</p><h3>4. వారెంటీలు లేదా హామీలు లేవు</h3><p>యాప్ "యధాతథంగా" మరియు "అందుబాటులో ఉన్నట్లుగా" ఆధారంగా అందించబడుతుంది, స్పష్టమైన లేదా పరోక్షమైన ఎటువంటి వారెంటీలు లేకుండా. యాప్ నిరంతరాయంగా, సకాలంలో, సురక్షితంగా, లోపం లేకుండా లేదా గణితశాస్త్రపరంగా లోపం లేకుండా ఉంటుందని మేము ఎటువంటి వారెంటీని ఇవ్వము.</p><h3>5. మేధో సంపత్తి హక్కులు</h3><p>యాప్‌లో ఉన్న అన్ని సాఫ్ట్‌వేర్ కోడ్, మ్యాథమెటికల్ జనరేటర్లు, అల్గారిథమ్‌లు, యూజర్ ఇంటర్‌ఫేస్‌లు, బ్రాండింగ్ మరియు టెక్స్ట్ HaBER సాఫ్ట్‌వేర్ సొల్యూషన్స్ యొక్క ప్రత్యేక మేధో సంపత్తి. యాప్‌ను ఉద్దేశించిన విధంగా ఉపయోగించడానికి పరిమిత, నాన్-ఎక్స్‌క్లూజివ్ హక్కు మినహా, వినియోగదారుకు ఎటువంటి హక్కులు లేదా లైసెన్సులు మంజూరు చేయబడలేదు.</p><h3>6. పాలక చట్టం మరియు ప్రత్యేక అధికార పరిధి</h3><p>ఈ నిబంధనలు జర్మనీ ఫెడరల్ రిపబ్లిక్ చట్టాల ద్వారా నిర్వహించబడతాయి మరియు వాటికి అనుగుణంగా అన్వయించబడతాయి. ఈ నిబంధనలు లేదా యాప్ ఉపయోగం వల్ల లేదా దానికి సంబంధించి ఉత్పన్నమయ్యే ఏవైనా చట్టపరమైన వివాదాలు, క్లెయిమ్‌లు లేదా విచారణలు ప్రత్యేకంగా బెర్లిన్, జర్మనీలోని సమర్థ న్యాయస్థానాల్లో తీసుకురాబడతాయి.</p></>,
    privacyContent: <><h3>1. పరిచయం మరియు పరిధి</h3><p>మేము మీ గోప్యతను తీవ్రంగా పరిగణిస్తాము. ఈ గోప్యతా విధానం మీరు "ఫైండ్ మై ధార్మిక్ బర్త్‌డే" యాప్‌ను ఉపయోగించినప్పుడు HaBER సాఫ్ట్‌వేర్ సొల్యూషన్స్ ("మేము", "మాకు") మీ వ్యక్తిగత డేటాను ఎలా సేకరిస్తుంది, ఉపయోగిస్తుంది, ప్రాసెస్ చేస్తుంది మరియు రక్షిస్తుందో వివరిస్తుంది. ఈ విధానం జనరల్ డేటా ప్రొటెక్షన్ రెగ్యులేషన్ (GDPR) యొక్క కఠినమైన ప్రమాణాలకు అనుగుణంగా ఉంటుంది.</p><h3>2. డేటా సేకరణ మరియు ప్రాసెసింగ్ విధానాలు</h3><p><strong>అతిథి వినియోగదారులు:</strong> మీరు ఖాతా లేకుండా యాప్‌ను ఉపయోగించినప్పుడు, గణనలను రూపొందించడానికి మీ జనన డేటా (తేదీ, సమయం మరియు స్థానం) బ్రౌజర్‌లో తాత్కాలికంగా ప్రాసెస్ చేయబడుతుంది. మేము ఈ అత్యంత వ్యక్తిగత డేటాను మా బ్యాకెండ్ సర్వర్‌లకు ప్రసారం చేయము లేదా నిల్వ చేయము.</p><p><strong>నమోదిత వినియోగదారులు:</strong> మీరు ప్రొఫైల్‌లను సేవ్ చేయడానికి ఖాతాను సృష్టించాలని ఎంచుకుంటే, మేము మీ ప్రామాణీకరణ ఆధారాలను (ఇమెయిల్ చిరునామా వంటివి) మరియు మీరు స్పష్టంగా సేవ్ చేయడానికి ఎంచుకున్న జనన డేటా ప్రొఫైల్‌లను సేకరించి సురక్షితంగా నిల్వ చేస్తాము. ఈ డేటా Google Firebaseలో సురక్షితంగా నిల్వ చేయబడుతుంది.</p><h3>3. ప్రాసెసింగ్ యొక్క ఉద్దేశ్యం</h3><p>యాప్ యొక్క ప్రధాన కార్యాచరణను అందించడం, మీ గుర్తింపును ప్రామాణీకరించడం, మీ ఖాతాను భద్రపరచడం మరియు సెషన్‌లలో మీ సేవ్ చేసిన ప్రొఫైల్‌లను నిర్వహించడం కోసం మాత్రమే మేము మీ డేటాను ప్రాసెస్ చేస్తాము. మేము ఎట్టి పరిస్థితుల్లోనూ థర్డ్-పార్టీ డేటా బ్రోకర్లు లేదా ప్రకటనకర్తలకు <strong>మీ వ్యక్తిగత డేటాను విక్రయించము, అద్దెకు ఇవ్వము లేదా ద్రవ్యీకరించము</strong>.</p><h3>4. థర్డ్-పార్టీ మౌలిక సదుపాయాలు</h3><p>అధిక లభ్యత మరియు బలమైన భద్రతను నిర్ధారించడానికి, మేము Google క్లౌడ్ ప్లాట్‌ఫారమ్ మరియు ఫైర్‌బేస్‌ను మా మౌలిక సదుపాయాల ప్రొవైడర్‌లుగా ఉపయోగిస్తాము. ఈ సంస్థలు GDPRకి అనుగుణంగా చట్టబద్ధంగా కట్టుబడి ఉండే డేటా ప్రాసెసింగ్ ఒప్పందాల (DPAs) కింద ఖచ్చితంగా డేటా ప్రాసెసర్‌లుగా మీ డేటాను ప్రాసెస్ చేస్తాయి. మీ లాగిన్ సెషన్‌ను నిర్వహించడానికి మరియు అప్లికేషన్‌ను భద్రపరచడానికి ఖచ్చితంగా అవసరమైన కుక్కీలను మేము ఉపయోగించవచ్చు.</p><h3>5. మీ డేటా రక్షణ హక్కులు</h3><p>GDPR కింద, మీ డేటాకు సంబంధించి మీకు సమగ్ర హక్కులు ఉన్నాయి. మీ గురించి మేము కలిగి ఉన్న డేటాను యాక్సెస్ చేయమని అభ్యర్థించే హక్కు, తప్పులను సరిదిద్దమని డిమాండ్ చేసే హక్కు మరియు <strong>"మరచిపోయే హక్కు" (మీ డేటాను పూర్తిగా తొలగించడం)</strong> మీకు ఉన్నాయి. ఈ హక్కులలో దేనినైనా వినియోగించుకోవడానికి, మీరు మీ ఖాతా సెట్టింగ్‌లలో మీ డేటాను నిర్వహించవచ్చు లేదా నేరుగా మమ్మల్ని సంప్రదించవచ్చు.</p><h3>6. భద్రతా చర్యలు</h3><p>ట్రాన్సిట్ (HTTPS/TLS) మరియు విశ్రాంతి సమయంలో ఎన్‌క్రిప్షన్‌తో సహా అనధికార ప్రాప్యత, నష్టం లేదా మార్పు నుండి మీ డేటాను రక్షించడానికి మేము ఎంటర్‌ప్రైజ్-గ్రేడ్ సాంకేతిక మరియు సంస్థాగత భద్రతా చర్యలను ఉపయోగిస్తాము.</p></>,
    imprintContent: <><h3>§ 5 TMG (టెలిమీడియా చట్టం) ప్రకారం అవసరమైన సమాచారం</h3><p><strong>ప్రొవైడర్ మరియు ఆపరేటర్:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>సంప్రదింపు సమాచారం</h3><p>ఫోన్: +49 (0) 157 3930 XXXX<br/>ఇమెయిల్: info@habersoftware.example.com</p><h3>చట్టపరమైన మరియు వాణిజ్య ప్రాతినిధ్యం</h3><p>అధీకృత ప్రతినిధి: Hari aus Berlin</p><h3>వివాద పరిష్కారం</h3><p>యూరోపియన్ కమీషన్ ఆన్‌లైన్ వివాద పరిష్కారం (OS) కోసం ఒక వేదికను అందిస్తుంది, ఇది <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a> వద్ద కనుగొనవచ్చు. వినియోగదారుల మధ్యవర్తిత్వ బోర్డు ముందు వివాద పరిష్కార విచారణల్లో పాల్గొనడానికి మేము కట్టుబడి లేము మరియు ఇష్టపడము.</p><h3>కంటెంట్ మరియు లింక్‌ల కోసం బాధ్యత</h3><p>ఒక సర్వీస్ ప్రొవైడర్‌గా, § 7 Abs.1 TMG ప్రకారం సాధారణ చట్టాలకు అనుగుణంగా ఈ పేజీలలో మా స్వంత కంటెంట్‌కు మేము బాధ్యత వహిస్తాము. అయితే, §§ 8 నుండి 10 TMG ప్రకారం, ప్రసారం చేయబడిన లేదా నిల్వ చేయబడిన థర్డ్-పార్టీ సమాచారాన్ని పర్యవేక్షించడానికి లేదా చట్టవిరుద్ధమైన కార్యాచరణను సూచించే పరిస్థితులను దర్యాప్తు చేయడానికి మేము బాధ్యత వహించము. మా సైట్ బాహ్య థర్డ్-పార్టీ వెబ్‌సైట్‌లకు లింక్‌లను కలిగి ఉండవచ్చు, వాటి కంటెంట్‌పై మాకు నియంత్రణ లేదు. అందువల్ల, ఈ బాహ్య కంటెంట్‌కు మేము ఎటువంటి బాధ్యతను అంగీకరించలేము.</p></>,
    underConstructionBtn: "నిర్మాణంలో ఉంది",
    guestLoginBtn: "అతిథి లాగిన్",
    underConstructionTitle: "నిర్మాణంలో ఉంది",
    underConstructionDesc1: "ఈ అప్లికేషన్ ప్రస్తుతం నిర్మించబడుతోంది.",
    underConstructionDesc2: "అసౌకర్యానికి మేము హృదయపూర్వకంగా చింతిస్తున్నాము. దయచేసి తర్వాత మళ్లీ తనిఖీ చేయండి.",
  },
PA: {
    birthDetails: "ਜਨਮ ਵੇਰਵੇ",
    birthDate: "ਜਨਮ ਮਿਤੀ",
    birthTime: "ਜਨਮ ਦਾ ਸਮਾਂ",
    birthPlace: "ਜਨਮ ਸਥਾਨ",
    timezone: "ਸਮਾਂ ਖੇਤਰ",
    tradData: "ਰਵਾਇਤੀ ਡੇਟਾ",
    nakshatra: "ਨਕਸ਼ਤਰ",
    paksha: "ਪਕਸ਼",
    tithi: "ਤਿਥੀ",
    lunarMonth: "ਚੰਦਰ ਮਹੀਨਾ",
    searchRange: "ਖੋਜ ਰੇਂਜ ਅਤੇ ਨੋਟਸ",
    targetYears: "ਟੀਚਾ ਸਾਲ",
    notes: "ਨੋਟਸ ਜਾਂ ਸਵਾਲ",
    findBday: "ਮੇਰਾ ਧਰਮੀ ਜਨਮਦਿਨ ਲੱਭੋ",
    select: "ਚੁਣੋ",
    selectTimezone: "ਸਮਾਂ ਖੇਤਰ ਚੁਣੋ",
    footer: "HaBER Software Solutions ਦੁਆਰਾ ਬਰਲਿਨ ਵਿੱਚ ❤️ ਨਾਲ ਬਣਾਇਆ ਗਿਆ",
    cookieText: "ਅਸੀਂ ਤੁਹਾਨੂੰ ਲੌਗ ਇਨ ਰੱਖਣ ਅਤੇ ਤੁਹਾਡੀਆਂ ਤਰਜੀਹਾਂ ਨੂੰ ਸੁਰੱਖਿਅਤ ਰੱਖਣ ਲਈ ਜ਼ਰੂਰੀ ਕੂਕੀਜ਼ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਾਂ। ਅਸੀਂ ਟਰੈਕਿੰਗ ਕੂਕੀਜ਼ ਦੀ ਵਰਤੋਂ ਨਹੀਂ ਕਰਦੇ ਹਾਂ।",
    privacyPolicy: "ਪਰਾਈਵੇਟ ਨੀਤੀ",
    gotIt: "ਮਿਲ ਗਿਆ",
    legalNotice: "ਕਾਨੂੰਨੀ ਨੋਟਿਸ",
    terms: "ਨਿਯਮ ਅਤੇ ਸ਼ਰਤਾਂ",
    imprint: "ਛਾਪ",
    appName: "ਮੇਰਾ ਧਰਮਿਕ ਜਨਮਦਿਨ ਲੱਭੋ",
    subtitle1: "ਸ਼ੁੱਧਤਾ ਪੰਚਾਂਗ ਅਤੇ ਤਿਥੀ ਕਨਵਰਟਰ",
    subtitle2: "ਸ਼ੁੱਧਤਾ ਪੰਚਾਂਗ ਅਤੇ ਤਿਥੀ ਪਰਿਵਰਤਕ - ਜੋਤਿਸ਼ ਮੁਲਾਂਕਣ",
    welcomeTitle: "ਪੰਚਾਂਗ ਸਹਾਇਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ",
    welcomeDesc: "ਪੈਨਲ ਵਿੱਚ ਆਪਣੇ ਜਨਮ ਦੇ ਵੇਰਵੇ ਦਰਜ ਕਰੋ ਅਤੇ ਮੈਂ ਤੁਹਾਡੇ ਰਵਾਇਤੀ ਜਨਮ ਦਿਨ ਨੂੰ ਮਨਾਉਣ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰਨ ਲਈ, ਤਿਥੀ ਅਤੇ ਨਕਸ਼ਤਰ ਨਾਲ ਮੇਲ ਖਾਂਦਾ ਸਹੀ ਧਰਮਿਕ ਕੈਲੰਡਰ ਦਿਨ ਦੀ ਗਣਨਾ ਕਰਾਂਗਾ।",
    mapHint: "ਤੁਸੀਂ ਆਪਣੀ ਸਥਿਤੀ ਨੂੰ ਵਧੀਆ-ਟਿਊਨ ਕਰਨ ਲਈ ਨਕਸ਼ੇ 'ਤੇ ਕਲਿੱਕ ਕਰ ਸਕਦੇ ਹੋ।",
    login: "ਲਾਗਿਨ",
    logout: "ਲਾਗਆਉਟ",
    history: "ਇਤਿਹਾਸ",
    syncHistory: "ਸਿੰਕ ਇਤਿਹਾਸ ਲਈ ਲੌਗਇਨ ਕਰੋ",
    privacyNoticeTitle: "ਗੋਪਨੀਯਤਾ ਨੋਟਿਸ",
    privacyNoticeDesc: "ਤੁਹਾਡਾ ਜੋਤਸ਼ੀ ਡੇਟਾ ਸਿਰਫ ਇਸ ਸੈਸ਼ਨ ਲਈ ਪ੍ਰੋਸੈਸ ਕੀਤਾ ਜਾਂਦਾ ਹੈ ਅਤੇ ਸਥਾਈ ਤੌਰ 'ਤੇ ਸਟੋਰ ਨਹੀਂ ਕੀਤਾ ਜਾਵੇਗਾ।",
    searchHistory: "ਖੋਜ ਇਤਿਹਾਸ",
    locationPlaceholder: "ਜਿਵੇਂ ਕਿ ਨਵੀਂ ਦਿੱਲੀ, ਭਾਰਤ",
    tooltipDate: "ਗ੍ਰੇਗੋਰੀਅਨ ਕੈਲੰਡਰ ਵਿੱਚ ਤੁਹਾਡੇ ਜਨਮ ਦੇ ਸਹੀ ਦਿਨ ਦੀ ਗਣਨਾ ਕਰਨ ਲਈ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।",
    tooltipTime: "ਸਹੀ ਤਿਥੀ ਅਤੇ ਨਕਸ਼ਤਰ ਦੀ ਗਣਨਾ ਲਈ ਜਨਮ ਦਾ ਸਮਾਂ ਮਹੱਤਵਪੂਰਨ ਹੈ, ਕਿਉਂਕਿ ਇਹ ਦਿਨ ਭਰ ਬਦਲਦੇ ਰਹਿੰਦੇ ਹਨ।",
    tooltipPlace: "ਸੂਰਜ ਚੜ੍ਹਨ ਅਤੇ ਚੰਦਰਮਾ ਦੇ ਪੜਾਅ ਸਥਾਨ ਅਨੁਸਾਰ ਵੱਖ-ਵੱਖ ਹੁੰਦੇ ਹਨ। ਆਪਣੇ ਸ਼ਹਿਰ ਜਾਂ ਕਸਬੇ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ। ਕੋਈ ਵਿਕਲਪ ਚੁਣੋ ਜਾਂ ਸਿੱਧਾ ਟਾਈਪ ਕਰੋ।",
    tooltipTimezone: "ਤੁਹਾਡੇ ਜਨਮ ਦੇ ਸਮੇਂ ਸਥਾਨਕ ਟਾਈਮ ਜ਼ੋਨ ਆਫਸੈੱਟ। ਸਹੀ ਯੂਨੀਵਰਸਲ ਸਮੇਂ ਦੀ ਪੁਸ਼ਟੀ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।",
    tooltipNakshatra: "ਤੁਹਾਡੇ ਜਨਮ 'ਤੇ ਚੰਦਰਮਾ ਦੁਆਰਾ ਕਬਜ਼ਾ ਕੀਤਾ ਗਿਆ ਜਨਮ ਤਾਰਾ ਜਾਂ ਚੰਦਰ ਮਹਿਲ।",
    tooltipPaksha: "ਚੰਦਰ ਮਹੀਨੇ ਦਾ ਪੰਦਰਵਾੜਾ। ਸ਼ੁਕਲਾ ਮੋਮ ਹੋ ਰਿਹਾ ਹੈ (ਚਮਕਦਾ ਹੈ), ਕ੍ਰਿਸ਼ਨ ਵਿਗੜ ਰਿਹਾ ਹੈ (ਹਨੇਰਾ)।",
    tooltipTithi: "ਚੰਦਰ ਦਿਨ. ਰਵਾਇਤੀ ਧਾਰਮਿਕ ਜਨਮਦਿਨ ਮਨਾਉਣ ਲਈ ਮਹੱਤਵਪੂਰਨ।",
    tooltipMonth: "ਚੰਦਰਮਾ ਦਾ ਮਹੀਨਾ ਜਿਸ ਵਿੱਚ ਤੁਹਾਡਾ ਜਨਮ ਹੋਇਆ ਸੀ (ਉਦਾਹਰਨ ਲਈ, ਚੈਤਰ, ਵੈਸਾਖ)।",
    tooltipTargetYear: "ਉਹ ਸਾਲ ਜਾਂ ਸਾਲਾਂ ਦੀ ਰੇਂਜ ਨਿਸ਼ਚਿਤ ਕਰੋ ਜਿਸ ਲਈ ਤੁਸੀਂ ਆਪਣੀ ਰਵਾਇਤੀ ਜਨਮਦਿਨ ਮਿਤੀ ਲੱਭਣਾ ਚਾਹੁੰਦੇ ਹੋ।",
    tooltipNotes: "ਵਿਸ਼ੇਸ਼ ਗਣਨਾ ਵਿਧੀਆਂ (ਜਿਵੇਂ ਕਿ ਅਮੰਤਾ ਜਾਂ ਪੂਰਨਿਮੰਤਾ) ਨਿਸ਼ਚਿਤ ਕਰੋ ਜਾਂ ਆਪਣੀ ਪੁੱਛਗਿੱਛ ਵਿੱਚ ਸੰਦਰਭ ਸ਼ਾਮਲ ਕਰੋ।",
    calculating: "ਗਣਨਾ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    calculatingPanchang: "ਪੰਚਾਂਗ ਅਲਾਈਨਮੈਂਟਾਂ ਦੀ ਗਣਨਾ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...",
    targetYearPlaceholder: "ਜਿਵੇਂ ਕਿ 2026 ਜਾਂ 2025-2030",
    notesPlaceholder: "ਖਾਸ ਪਰੰਪਰਾ (ਜਿਵੇਂ ਕਿ ਅਮੰਤਾ) ਜਾਂ ਸਵਾਲ?",
    slideTitle0: "ਆਪਣੇ ਸੱਚੇ ਬ੍ਰਹਿਮੰਡੀ ਆਗਮਨ ਦਾ ਜਸ਼ਨ ਮਨਾਓ",
    slideDesc0: "ਸਟੀਕ ਵੈਦਿਕ ਜੋਤਿਸ਼ ਦੇ ਆਧਾਰ 'ਤੇ ਆਪਣੇ ਸਹੀ ਧਰਮਿਕ ਜਨਮਦਿਨ ਦੀ ਖੋਜ ਕਰੋ।",
    slideTitle1: "ਪ੍ਰਾਚੀਨ ਦੀ ਸਿਆਣਪ",
    slideDesc1: "ਸਾਡੇ ਉੱਚ-ਸ਼ੁੱਧਤਾ ਮਾਡਲ ਪ੍ਰਾਚੀਨ ਪੰਚਾਂਗ ਗਣਨਾਵਾਂ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਨ।",
    slideTitle2: "ਇੱਕ ਸਵਰਗੀ ਜਸ਼ਨ",
    slideDesc2: "ਆਪਣੇ ਖਾਸ ਦਿਨ ਨੂੰ ਪ੍ਰਮਾਣਿਕ ​​ਬ੍ਰਹਿਮੰਡੀ ਤਾਲਾਂ ਨਾਲ ਇਕਸਾਰ ਕਰੋ।",
    slideTitle3: "ਪਵਿੱਤਰ ਜੋਤਿਸ਼ ਮੰਡਲ",
    slideDesc3: "ਬ੍ਰਹਿਮੰਡ ਦੇ ਊਰਜਾਵਾਨ ਪੈਟਰਨਾਂ ਨਾਲ ਡੂੰਘਾਈ ਨਾਲ ਜੁੜੋ।",
    slideTitle4: "ਤੁਹਾਡਾ ਵੈਦਿਕ ਜਨਮ ਚਾਰਟ",
    slideDesc4: "ਆਪਣੀ ਜ਼ਿੰਦਗੀ ਦੀ ਸੱਚੀ ਯਾਤਰਾ ਦੇ ਰਹੱਸਾਂ ਨੂੰ ਖੋਲ੍ਹੋ।",
    slideTitle5: "ਰੋਸ਼ਨੀ ਦੇ ਖੁਸ਼ੀਆਂ ਭਰੇ ਤਿਉਹਾਰ",
    slideDesc5: "ਰਵਾਇਤੀ ਜਸ਼ਨਾਂ ਦੀ ਅਧਿਆਤਮਿਕ ਊਰਜਾ ਨੂੰ ਗਲੇ ਲਗਾਓ।",
    slideTitle6: "ਪਵਿੱਤਰ ਅਗਨੀ ਪੂਜਾ",
    slideDesc6: "ਪ੍ਰਾਚੀਨ ਅਗਨੀ ਰੀਤੀ ਰਿਵਾਜਾਂ ਦੁਆਰਾ ਬ੍ਰਹਮ ਨਾਲ ਮੇਲ ਖਾਂਦਾ ਹੈ।",
    slideTitle7: "ਰਹੱਸਮਈ ਚੰਦਰ ਯਾਤਰਾ",
    slideDesc7: "ਪਵਿੱਤਰ ਨਕਸ਼ਤਰਾਂ ਰਾਹੀਂ ਚੰਦਰਮਾ ਦੇ ਸੰਚਾਰ ਦਾ ਪਾਲਣ ਕਰੋ।",
    slideTitle8: "ਬ੍ਰਹਿਮੰਡੀ ਓਮ ਅਤੇ ਕਮਲ",
    slideDesc8: "ਅੰਦਰਲੀ ਸ਼ਾਂਤੀ ਅਤੇ ਆਤਮਕ ਗਿਆਨ ਨੂੰ ਜਗਾਓ।",
    slideTitle9: "ਪਰੰਪਰਾਗਤ ਪੰਚਾਂਗ",
    slideDesc9: "ਹਿੰਦੂ ਕੈਲੰਡਰ ਦੀਆਂ ਸਦੀਵੀ ਤਾਲਾਂ ਨੂੰ ਉਜਾਗਰ ਕਰੋ।",
    slideTitle10: "ਅਨੰਦਮਈ ਕੀਰਤਨ ਆਨੰਦ",
    slideDesc10: "ਸੰਗਤੀ ਜਪ ਦੇ ਸ਼ੁੱਧ ਅਨੰਦ ਦਾ ਅਨੁਭਵ ਕਰੋ।",
    slideTitle11: "ਆਰਤੀ ਦਾ ਜਸ਼ਨ",
    slideDesc11: "ਰਵਾਇਤੀ ਪਰਿਵਾਰਕ ਆਰਤੀ ਨਾਲ ਆਪਣੇ ਮਾਰਗ ਨੂੰ ਰੌਸ਼ਨ ਕਰੋ।",
    slideTitle12: "ਆਤਮਿਕ ਸ਼ਾਂਤੀ",
    slideDesc12: "ਮੰਦਿਰ ਦੇ ਪਵਿੱਤਰ ਮਾਹੌਲ ਵਿੱਚ ਮਨ ਦੀ ਸ਼ਾਂਤੀ ਪ੍ਰਾਪਤ ਕਰੋ।",
    slideTitle13: "ਵੈਦਿਕ ਅਗਨੀ ਯੱਗ",
    slideDesc13: "ਪ੍ਰਾਚੀਨ ਅਗਨੀ ਸਮਾਰੋਹਾਂ ਦੁਆਰਾ ਬ੍ਰਹਮ ਅਸੀਸਾਂ ਪ੍ਰਾਪਤ ਕਰੋ.",
    slideTitle14: "ਪਵਿਤ੍ਰ ਜਪ",
    slideDesc14: "ਪਵਿੱਤਰ ਨਾਮ ਦਾ ਉਚਾਰਨ ਕਰੋ ਅਤੇ ਆਪਣੀ ਆਤਮਿਕ ਚੇਤਨਾ ਨੂੰ ਜਗਾਓ।",
    testiText0: "ਜਦੋਂ ਤੋਂ ਮੈਂ ਧਰਮਿਕ ਕੈਲੰਡਰ ਦੇ ਅਨੁਸਾਰ ਆਪਣਾ ਜਨਮ ਦਿਨ ਮਨਾਉਣਾ ਸ਼ੁਰੂ ਕੀਤਾ ਹੈ, ਮੈਂ ਆਪਣੀ ਊਰਜਾ ਵਿੱਚ ਇੱਕ ਡੂੰਘਾ ਬਦਲਾਅ ਦੇਖਿਆ ਹੈ। ਇਹ ਮਹਿਸੂਸ ਹੁੰਦਾ ਹੈ ਜਿਵੇਂ ਬ੍ਰਹਿਮੰਡ ਮੇਰੇ ਨਾਲ ਇਕਸਾਰ ਹੋ ਰਿਹਾ ਹੈ! ਇਹ ਮੇਰੇ ਸਾਲ ਲਈ ਸ਼ਾਨਦਾਰ ਕਿਸਮਤ ਅਤੇ ਸ਼ਾਂਤੀ ਲਿਆਇਆ.",
    testiAuthor0: "ਰਾਜੇਸ਼ ਕੇ.",
    testiText1: "ਮੈਂ ਹਮੇਸ਼ਾ ਗਲਤ ਤਰੀਕ 'ਤੇ ਜਸ਼ਨ ਮਨਾ ਰਿਹਾ ਸੀ! ਗ੍ਰੈਗੋਰੀਅਨ ਕੈਲੰਡਰ ਸਿਰਫ ਇੱਕ ਸੰਖਿਆ ਹੈ, ਪਰ ਤਿਥੀ ਅਤੇ ਨਕਸ਼ਤਰ ਦੀ ਸੰਰਚਨਾ ਅਸਲ ਬ੍ਰਹਿਮੰਡੀ ਅਸੀਸਾਂ ਲਿਆਉਂਦੀ ਹੈ। ਮੇਰੇ ਸੱਚੇ ਧਰਮੀ ਜਨਮਦਿਨ 'ਤੇ ਜਸ਼ਨ ਮਨਾਉਣ ਨਾਲ ਉਹ ਦਰਵਾਜ਼ੇ ਖੁੱਲ੍ਹ ਗਏ ਜਿਨ੍ਹਾਂ ਦੀ ਮੈਂ ਕਦੇ ਕਲਪਨਾ ਵੀ ਨਹੀਂ ਕੀਤੀ ਸੀ।",
    testiAuthor1: "ਪ੍ਰਿਆ ਐਸ.",
    testiText2: "ਇਸ ਐਪ ਨੇ ਮੇਰਾ ਪ੍ਰਮਾਣਿਕ ​​ਜਨਮਦਿਨ ਲੱਭਣ ਵਿੱਚ ਮੇਰੀ ਮਦਦ ਕੀਤੀ। ਪਹਿਲੇ ਹੀ ਸਾਲ ਜਦੋਂ ਮੈਂ ਆਪਣਾ ਧਾਰਮਿਕ ਜਨਮਦਿਨ ਮਨਾਇਆ, ਮੈਨੂੰ ਲੰਬੇ ਸਮੇਂ ਤੋਂ ਉਡੀਕੀ ਜਾ ਰਹੀ ਤਰੱਕੀ ਮਿਲੀ। ਇਹ ਸਿਰਫ਼ ਇੱਕ ਤਾਰੀਖ ਤੋਂ ਵੱਧ ਹੈ; ਇਹ ਇੱਕ ਅਧਿਆਤਮਿਕ ਰੀਸੈਟ ਹੈ।",
    testiAuthor2: "ਅਮਿਤ ਪੀ.",
    testiText3: "ਆਖਰਕਾਰ ਮੇਰਾ ਅਸਲ ਜਨਮਦਿਨ ਮਿਲਿਆ! ਗ੍ਰੈਗੋਰੀਅਨ ਕੈਲੰਡਰ ਟੁੱਟਿਆ ਹੋਇਆ ਮਹਿਸੂਸ ਹੋਇਆ, ਪਰ ਇਹ ਧਾਰਮਿਕ ਤਾਰੀਖ ਮੈਨੂੰ ਆਪਣੀਆਂ ਜੜ੍ਹਾਂ ਦੇ ਨੇੜੇ ਲੈ ਜਾਂਦੀ ਹੈ। ਇਸ ਸਾਲ ਨੂੰ ਬਹੁਤ ਖਾਸ ਬਣਾਇਆ ਗਿਆ ਇੱਕ ਪੂਜਾ ਨਾਲ ਮਨਾਉਣਾ।",
    testiAuthor3: "ਸਨੇਹਾ ਐਮ.",
    testiText4: "ਸਾਡੀਆਂ ਪਰੰਪਰਾਵਾਂ ਨਾਲ ਮੁੜ ਜੁੜਨ ਦਾ ਅਜਿਹਾ ਸੁੰਦਰ ਤਰੀਕਾ। ਮੇਰਾ ਪਰਿਵਾਰ ਹੁਣ ਦੋਵੇਂ ਤਾਰੀਖਾਂ ਮਨਾਉਂਦਾ ਹੈ, ਪਰ ਧਾਰਮਿਕ ਜਨਮਦਿਨ ਅਧਿਆਤਮਿਕ ਤੌਰ 'ਤੇ ਬਹੁਤ ਜ਼ਿਆਦਾ ਸੰਪੂਰਨ ਮਹਿਸੂਸ ਕਰਦਾ ਹੈ।",
    testiAuthor4: "ਵਿਕਰਮ ਆਰ.",
    testiText5: "ਮੈਂ ਪਹਿਲਾਂ ਤਾਂ ਸ਼ੱਕੀ ਸੀ, ਪਰ ਨਕਸ਼ਤਰ ਅਤੇ ਤਿਥੀ ਦੀ ਗਣਨਾ ਦੀ ਸ਼ੁੱਧਤਾ ਸ਼ਾਨਦਾਰ ਹੈ। ਮੇਰਾ ਬ੍ਰਹਿਮੰਡੀ ਜਨਮਦਿਨ ਲੱਭਣਾ ਸੱਚਮੁੱਚ ਅੱਖਾਂ ਖੋਲ੍ਹਣ ਵਾਲਾ ਅਨੁਭਵ ਸੀ।",
    testiAuthor5: "ਅਦਿਤੀ ਵੀ.",
    testiText6: "ਇਹ ਸਾਧਨ ਇੱਕ ਬਰਕਤ ਹੈ! ਮੈਂ ਸਾਲਾਂ ਤੋਂ ਆਪਣੇ ਪ੍ਰਮਾਣਿਕ ​​ਹਿੰਦੂ ਜਨਮਦਿਨ ਦਾ ਪਤਾ ਲਗਾਉਣ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰ ਰਿਹਾ ਹਾਂ। ਜਸ਼ਨ ਡੂੰਘੇ ਨਿੱਜੀ ਅਤੇ ਬ੍ਰਹਮ ਦੁਆਰਾ ਬਖਸ਼ਿਸ਼ ਮਹਿਸੂਸ ਕੀਤਾ.",
    testiAuthor6: "ਕਰਨ ਡੀ.",
    testiText7: "ਇੱਕ ਇਸਕੋਨ ਸ਼ਰਧਾਲੂ ਹੋਣ ਦੇ ਨਾਤੇ, ਤਿਥੀ ਦੇ ਆਧਾਰ 'ਤੇ ਮੇਰਾ ਸਹੀ ਧਾਰਮਿਕ ਜਨਮਦਿਨ ਜਾਣਨਾ ਮੈਨੂੰ ਆਪਣੇ ਅਧਿਆਤਮਿਕ ਅਭਿਆਸਾਂ ਨੂੰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਨਾਲ ਇਕਸਾਰ ਕਰਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿੰਦਾ ਹੈ। ਹਰ ਅਧਿਆਤਮਿਕ ਖੋਜੀ ਲਈ ਲਾਜ਼ਮੀ ਹੈ।",
    testiAuthor7: "ਅੰਜਲੀ ਜੀ.",
    testiText8: "ਸਾਡੇ ਦਾਦਾ-ਦਾਦੀ ਹਮੇਸ਼ਾ ਪੰਚਾਂਗ ਦਾ ਪਾਲਣ ਕਰਦੇ ਸਨ, ਪਰ ਅਸੀਂ ਸੰਪਰਕ ਗੁਆ ਦਿੱਤਾ। ਇਸ ਐਪ ਨੇ ਉਸ ਸੁੰਦਰ ਪਰੰਪਰਾ ਨੂੰ ਸਾਡੇ ਪਰਿਵਾਰ ਵਿੱਚ ਵਾਪਸ ਲਿਆਂਦਾ ਹੈ। ਧਰਮ ਦੇ ਜਨਮ ਦਿਨ ਦੀ ਖੁਸ਼ੀ ਬੇਮਿਸਾਲ ਹੈ।",
    testiAuthor8: "ਰੋਹਿਤ ਐੱਸ.",
    testiText9: "ਸ਼ਾਨਦਾਰ ਅਨੁਭਵ! ਗਣਨਾਵਾਂ ਸਹੀ ਹਨ, ਅਤੇ ਮੇਰੀ ਤਿਥੀ ਨੂੰ ਮਨਾਉਣਾ ਬਹੁਤ ਹੀ ਸ਼ੁਭ ਮਹਿਸੂਸ ਹੋਇਆ। ਉਸ ਦਿਨ ਊਰਜਾ ਸਿਰਫ਼ ਸ਼ਾਨਦਾਰ ਸੀ.",
    testiAuthor9: "ਮੀਰਾ ਟੀ.",
    heroProblemTitle: "ਚੁਣੌਤੀ: ਸਥਿਰ ਸੂਰਜੀ ਤਾਰੀਖਾਂ ਬਨਾਮ ਗਤੀਸ਼ੀਲ ਬ੍ਰਹਿਮੰਡੀ ਤਾਲਾਂ",
    heroProblemDesc: <><p>ਸਟੈਂਡਰਡ ਗ੍ਰੇਗੋਰੀਅਨ (ਅੰਗਰੇਜ਼ੀ) ਕੈਲੰਡਰ 'ਤੇ ਭਰੋਸਾ ਕਰਦੇ ਹੋਏ, ਤੁਹਾਡਾ ਜਨਮਦਿਨ ਸਥਾਈ ਤੌਰ 'ਤੇ ਸਥਿਰ ਸੂਰਜੀ ਮਿਤੀ ਨਾਲ ਜੋੜਿਆ ਜਾਂਦਾ ਹੈ। ਹਾਲਾਂਕਿ, ਤਾਰਿਆਂ ਅਤੇ ਗ੍ਰਹਿਆਂ ਦੀ ਸੱਚੀ ਬ੍ਰਹਿਮੰਡੀ ਸੰਰਚਨਾ — ਤੁਹਾਡੇ ਜਨਮ ਦੇ ਸਮੇਂ ਮੌਜੂਦ ਸਹੀ ਆਕਾਸ਼ੀ ਸੰਰਚਨਾ — ਸਾਲ ਦਰ ਸਾਲ ਨਾਟਕੀ ਢੰਗ ਨਾਲ ਬਦਲਦੀ ਰਹਿੰਦੀ ਹੈ। ਇਹੀ ਕਾਰਨ ਹੈ ਕਿ ਦੀਵਾਲੀ, ਨਵਰਾਤਰੀ ਅਤੇ ਗਣੇਸ਼ ਚਤੁਰਥੀ ਵਰਗੇ ਪ੍ਰਾਚੀਨ ਤਿਉਹਾਰ ਹਰ ਸਾਲ ਵੱਖ-ਵੱਖ ਸੂਰਜੀ ਤਾਰੀਖਾਂ 'ਤੇ ਮਨਾਏ ਜਾਂਦੇ ਹਨ।</p><p>ਇੱਕ ਨਿਸ਼ਚਿਤ ਸੂਰਜੀ ਤਾਰੀਖ ਦੀ ਪਾਲਣਾ ਕਰਕੇ, ਤੁਸੀਂ ਆਪਣੀ ਅਸਲ ਜੋਤਿਸ਼ ਵਾਪਸੀ ਦੇ ਡੂੰਘੇ ਅਧਿਆਤਮਿਕ ਮਹੱਤਵ ਨੂੰ ਗੁਆ ਦਿੰਦੇ ਹੋ। ਰਵਾਇਤੀ ਧਰਮਿਕ ਕੈਲੰਡਰ ਚੰਦਰਮਾ ਅਤੇ ਬ੍ਰਹਿਮੰਡ ਦੇ ਵਿਚਕਾਰ ਗਤੀਸ਼ੀਲ ਨਾਚ ਦਾ ਸਨਮਾਨ ਕਰਦਾ ਹੈ, ਤੁਹਾਡੇ ਅਸਲੀ ਆਕਾਸ਼ੀ ਮੂਲ ਨਾਲ ਡੂੰਘੇ ਪ੍ਰਮਾਣਿਕ ​​ਸਬੰਧ ਦੀ ਪੇਸ਼ਕਸ਼ ਕਰਦਾ ਹੈ।</p></>,
    heroSolutionTitle: "ਹੱਲ: ਸ਼ੁੱਧਤਾ ਧਰਮਿਕ ਅਲਾਈਨਮੈਂਟਸ",
    heroSolutionDesc: <><p>ਸਾਡਾ ਐਂਟਰਪ੍ਰਾਈਜ਼-ਗ੍ਰੇਡ ਧਰਮਿਕ ਜਨਮਦਿਨ ਕੈਲਕੁਲੇਟਰ ਸਹੀ ਗਣਨਾ ਕਰਨ ਲਈ ਉੱਚ-ਸ਼ੁੱਧਤਾ ਵਾਲੇ ਖਗੋਲ-ਵਿਗਿਆਨਕ ਐਲਗੋਰਿਦਮ ਅਤੇ ਸਖ਼ਤ ਗ੍ਰਹਿ ਇਫੇਮੇਰਿਸ ਡੇਟਾ ਦਾ ਲਾਭ ਲੈਂਦਾ ਹੈ<b>ਚੰਦਰ ਦਿਵਸ (ਤਿਥੀ)</b>ਅਤੇ<b>ਜਨਮ ਤਾਰਾ (ਨਕਸ਼ਤਰ)</b>ਤੁਹਾਡੇ ਅਵਤਾਰ ਦਾ. ਇਹਨਾਂ ਬਦਲਦੀਆਂ ਆਕਾਸ਼ੀ ਤਾਲਾਂ ਨੂੰ ਸਹੀ ਢੰਗ ਨਾਲ ਟ੍ਰੈਕ ਕਰਕੇ, ਅਸੀਂ ਹਰ ਸਾਲ ਤੁਹਾਡੇ ਜਨਮ ਦਾ ਜਸ਼ਨ ਮਨਾਉਣ ਲਈ ਪ੍ਰਮਾਣਿਕ, ਪਰੰਪਰਾਗਤ ਮਿਤੀ ਨੂੰ ਗਣਿਤਿਕ ਤੌਰ 'ਤੇ ਦਰਸਾਉਂਦੇ ਹਾਂ।</p><p>ਇਹ ਟੂਲ ਤੁਹਾਡੇ ਸਹੀ ਲੰਬਕਾਰ, ਅਕਸ਼ਾਂਸ਼, ਅਤੇ ਸਮਾਂ ਖੇਤਰ ਦੇ ਅਨੁਕੂਲ ਹੋਣ ਲਈ ਸਾਵਧਾਨੀ ਨਾਲ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਹੈ, ਇਹ ਯਕੀਨੀ ਬਣਾਉਂਦਾ ਹੈ ਕਿ ਗ੍ਰਹਿਆਂ ਦੀਆਂ ਗਣਨਾਵਾਂ ਤੁਹਾਡੇ ਖਾਸ ਜਨਮ ਸਥਾਨ ਦੇ ਉੱਪਰ ਸੱਚੀ ਬ੍ਰਹਿਮੰਡੀ ਸਥਿਤੀ ਨੂੰ ਦਰਸਾਉਂਦੀਆਂ ਹਨ।</p></>,
    heroWhoTitle: "ਇਸ ਸਿਸਟਮ ਤੋਂ ਕੌਣ ਲਾਭ ਉਠਾਉਂਦਾ ਹੈ?",
    heroWhoDesc: <><p>ਇਹ ਐਪਲੀਕੇਸ਼ਨ ਅਧਿਆਤਮਿਕ ਖੋਜਕਰਤਾਵਾਂ, ਧਾਰਮਿਕ ਪਰੰਪਰਾਵਾਂ ਦੇ ਸ਼ਰਧਾਲੂ ਅਨੁਯਾਈਆਂ, ਅਤੇ ਉਹਨਾਂ ਲੋਕਾਂ ਲਈ ਤਿਆਰ ਕੀਤੀ ਗਈ ਹੈ ਜੋ ਵਿਸ਼ਵਵਿਆਪੀ ਤਾਲਾਂ ਨਾਲ ਦੁਬਾਰਾ ਜੁੜਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰ ਰਹੇ ਹਨ ਜੋ ਉਹਨਾਂ ਦੇ ਇਸ ਸੰਸਾਰ ਵਿੱਚ ਆਉਣ ਦੀ ਅਗਵਾਈ ਕਰਦੇ ਹਨ। ਇਹ ਪ੍ਰਮਾਣਿਕ ​​ਪਰੰਪਰਾਗਤ ਜਸ਼ਨਾਂ ਦੀ ਯੋਜਨਾ ਬਣਾਉਣ, ਸ਼ੁਭ ਪੂਜਾ ਦਾ ਸਮਾਂ ਨਿਯਤ ਕਰਨ, ਜਾਂ ਡੂੰਘੇ ਨਿੱਜੀ ਪ੍ਰਤੀਬਿੰਬ ਲਈ ਸਮਾਂ ਸਮਰਪਿਤ ਕਰਨ ਲਈ ਸੰਪੂਰਨ ਬੁਨਿਆਦੀ ਸਾਧਨ ਹੈ।</p></>,
    heroWhyTitle: "ਸਾਡੀ ਵਿਧੀ ਉੱਤਮ ਕਿਉਂ ਹੈ",
    heroWhyDesc: <><p>ਉੱਨਤ ਕੰਪਿਊਟੇਸ਼ਨਲ ਜੋਤਿਸ਼ ਵਿਗਿਆਨ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹੋਏ ਇੰਜੀਨੀਅਰਿੰਗ, ਇਹ ਪਲੇਟਫਾਰਮ ਹਜ਼ਾਰਾਂ ਸਾਲਾਂ ਦੇ ਸਥਾਪਿਤ ਵੈਦਿਕ ਖਗੋਲ ਵਿਗਿਆਨ ਦੇ ਮੁਕਾਬਲੇ ਤੁਹਾਡੇ ਸਹੀ ਸਮੇਂ ਅਤੇ ਜਨਮ ਦੇ ਭੂਗੋਲਿਕ ਧੁਰੇ ਦਾ ਹਵਾਲਾ ਦਿੰਦਾ ਹੈ। ਸਾਡੀ ਸਖ਼ਤ ਗਣਿਤਿਕ ਪਹੁੰਚ ਤੁਹਾਡੇ ਸਾਲ ਦੇ ਸਭ ਤੋਂ ਅਧਿਆਤਮਿਕ ਤੌਰ 'ਤੇ ਮਹੱਤਵਪੂਰਨ ਦਿਨ ਨੂੰ ਨਿਰਧਾਰਤ ਕਰਨ ਲਈ ਬੇਮਿਸਾਲ, ਪੇਸ਼ੇਵਰ-ਦਰਜੇ ਦੀ ਸ਼ੁੱਧਤਾ ਪ੍ਰਦਾਨ ਕਰਦੀ ਹੈ।</p></>,
    heroDisclaimerTitle: "ਮਹੱਤਵਪੂਰਨ ਕਾਨੂੰਨੀ ਅਤੇ ਦੇਣਦਾਰੀ ਬੇਦਾਅਵਾ",
    heroDisclaimerDesc: <><p>ਇਸ ਐਪਲੀਕੇਸ਼ਨ ਦੁਆਰਾ ਪ੍ਰਦਾਨ ਕੀਤੀ ਗਈ ਜਾਣਕਾਰੀ, ਗਣਨਾਵਾਂ, ਤਾਰੀਖਾਂ ਅਤੇ ਹੋਰ ਸਮੱਗਰੀ ਦਾ ਉਦੇਸ਼ ਹੈ<strong>ਸਿਰਫ਼ ਅਧਿਆਤਮਿਕ, ਵਿਦਿਅਕ ਅਤੇ ਮਨੋਰੰਜਨ ਦੇ ਉਦੇਸ਼ਾਂ ਲਈ ਸਖਤੀ ਨਾਲ।</strong>ਇਸ ਐਪ ਦੇ ਨਿਰਮਾਤਾ, ਮਾਲਕ ਅਤੇ ਆਪਰੇਟਰ ਪ੍ਰਦਾਨ ਕਰਦੇ ਹਨ<strong>ਸ਼ੁੱਧਤਾ, ਸੰਪੂਰਨਤਾ, ਜਾਂ ਭਰੋਸੇਯੋਗਤਾ ਦੇ ਸੰਬੰਧ ਵਿੱਚ ਕੋਈ ਵਾਰੰਟੀ ਨਹੀਂ - ਪ੍ਰਗਟ ਜਾਂ ਅਪ੍ਰਤੱਖ -</strong>ਜੋਤਿਸ਼ ਗਣਨਾ ਜਾਂ ਇੱਥੇ ਕੋਈ ਹੋਰ ਜਾਣਕਾਰੀ।</p><p>ਇਹ ਐਪਲੀਕੇਸ਼ਨ<strong>ਪੇਸ਼ਾਵਰ, ਡਾਕਟਰੀ, ਮਨੋਵਿਗਿਆਨਕ, ਵਿੱਤੀ, ਜਾਂ ਕਾਨੂੰਨੀ ਸਲਾਹ ਪ੍ਰਦਾਨ ਕਰਨ ਦੇ ਤੌਰ 'ਤੇ ਪੇਸ਼ ਨਹੀਂ ਕੀਤੀ ਜਾਂਦੀ ਅਤੇ ਨਹੀਂ ਕੀਤੀ ਜਾਣੀ ਚਾਹੀਦੀ।</strong></p><p>ਇਸ ਸੇਵਾ ਦੀ ਵਰਤੋਂ ਕਰਕੇ, ਤੁਸੀਂ ਸਪਸ਼ਟ ਤੌਰ 'ਤੇ ਸਹਿਮਤ ਹੁੰਦੇ ਹੋ ਕਿ ਸਿਰਜਣਹਾਰ, ਮਾਲਕ ਅਤੇ ਆਪਰੇਟਰ<strong>ਲਏ ਗਏ ਕਿਸੇ ਵੀ ਫੈਸਲਿਆਂ, ਕਾਰਵਾਈਆਂ, ਜਾਂ ਕੀਤੇ ਗਏ ਨਤੀਜਿਆਂ ਲਈ ਕੋਈ ਜ਼ਿੰਮੇਵਾਰੀ ਨਾ ਮੰਨੋ</strong>ਪ੍ਰਦਾਨ ਕੀਤੀਆਂ ਮਿਤੀਆਂ, ਗਣਨਾਵਾਂ, ਜਾਂ ਸੂਝ ਦੇ ਆਧਾਰ 'ਤੇ। ਤੁਸੀਂ ਇਹ ਵੀ ਸਹਿਮਤੀ ਦਿੰਦੇ ਹੋ ਕਿ ਤੁਸੀਂ ਇਸ ਜਾਣਕਾਰੀ 'ਤੇ ਜੋ ਵੀ ਭਰੋਸਾ ਕਰਦੇ ਹੋ ਉਹ ਸਖਤੀ ਨਾਲ ਹੈ<strong>ਤੁਹਾਡੇ ਆਪਣੇ ਜੋਖਮ 'ਤੇ.</strong></p><p>ਇਸ ਐਪਲੀਕੇਸ਼ਨ ਦੇ ਨਿਰਮਾਤਾ, ਮਾਲਕ ਅਤੇ ਆਪਰੇਟਰ ਹਨ<strong>ਜ਼ਿੰਮੇਵਾਰੀ ਤੋਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਮੁਕਤ</strong>ਦੀ ਘਟਨਾ ਵਿੱਚ<strong>ਕੋਈ ਕਾਨੂੰਨੀ ਦਾਅਵਿਆਂ, ਹਰਜਾਨੇ, ਦੇਣਦਾਰੀਆਂ, ਜਾਂ ਵਿਵਾਦ</strong>ਇਸ ਸੌਫਟਵੇਅਰ ਜਾਂ ਸੇਵਾ ਦੀ ਵਰਤੋਂ ਤੋਂ ਪੈਦਾ ਹੁੰਦਾ ਹੈ। ਤੁਸੀਂ ਸਹਿਮਤ ਹੋ ਕਿ ਉਹਨਾਂ 'ਤੇ ਕੋਈ ਕਾਨੂੰਨੀ ਜ਼ਿੰਮੇਵਾਰੀ ਨਹੀਂ ਲਗਾਈ ਜਾਵੇਗੀ।</p></>,
    followupPlaceholder: "ਇੱਕ ਫਾਲੋ-ਅੱਪ ਸਵਾਲ ਪੁੱਛੋ...",
    termsContent: <><h3>1. ਸ਼ਰਤਾਂ ਦੀ ਸਵੀਕ੍ਰਿਤੀ</h3><p>HaBER ਸੌਫਟਵੇਅਰ ਸਲਿਊਸ਼ਨਜ਼ ("ਅਸੀਂ," "ਸਾਨੂੰ," ਜਾਂ "ਸਾਡੇ" ਦੁਆਰਾ ਸੰਚਾਲਿਤ "ਫਾਈਂਡ ਮਾਈ ਧਾਰਮਿਕ ਬਰਥਡੇ" ਐਪਲੀਕੇਸ਼ਨ ("ਐਪ") ਤੱਕ ਪਹੁੰਚ ਕਰਕੇ ਅਤੇ ਇਸਦੀ ਵਰਤੋਂ ਕਰਕੇ, ਤੁਸੀਂ ("ਉਪਭੋਗਤਾ") ਸਵੀਕਾਰ ਕਰਦੇ ਹੋ ਕਿ ਤੁਸੀਂ ਇਹਨਾਂ ਨਿਯਮਾਂ ਅਤੇ ਸ਼ਰਤਾਂ ਨੂੰ ਪੜ੍ਹਿਆ, ਸਮਝਿਆ ਅਤੇ ਕਾਨੂੰਨੀ ਤੌਰ 'ਤੇ ਪਾਬੰਦ ਹੋਣ ਲਈ ਸਹਿਮਤ ਹੋ। ਜੇਕਰ ਤੁਸੀਂ ਇਹਨਾਂ ਸ਼ਰਤਾਂ ਨਾਲ ਸਹਿਮਤ ਨਹੀਂ ਹੋ, ਤਾਂ ਤੁਹਾਨੂੰ ਤੁਰੰਤ ਐਪ ਦੇ ਸਾਰੇ ਉਪਯੋਗ ਨੂੰ ਬੰਦ ਕਰ ਦੇਣਾ ਚਾਹੀਦਾ ਹੈ।</p><h3>2. ਸੇਵਾ ਦੀ ਪ੍ਰਕਿਰਤੀ ਅਤੇ ਕੋਈ ਪੇਸ਼ੇਵਰ ਸਲਾਹ ਨਹੀਂ</h3><p>ਐਪ ਤਾਰੀਖਾਂ, ਸੂਝ, ਅਤੇ ਖਗੋਲ ਗਣਨਾਵਾਂ ਤਿਆਰ ਕਰਦਾ ਹੈ<strong>ਸਿਰਫ਼ ਅਧਿਆਤਮਿਕ, ਵਿਦਿਅਕ ਅਤੇ ਮਨੋਰੰਜਨ ਦੇ ਉਦੇਸ਼ਾਂ ਲਈ।</strong>ਅਸੀਂ ਪ੍ਰਦਾਨ ਨਹੀਂ ਕਰਦੇ, ਨਾ ਹੀ ਕਿਸੇ ਸਮੱਗਰੀ ਨੂੰ ਡਾਕਟਰੀ, ਮਨੋਵਿਗਿਆਨਕ, ਵਿੱਤੀ, ਕਾਨੂੰਨੀ, ਜਾਂ ਹੋਰ ਪੇਸ਼ੇਵਰ ਸਲਾਹ ਵਜੋਂ ਸਮਝਿਆ ਜਾਣਾ ਚਾਹੀਦਾ ਹੈ। ਪ੍ਰਦਾਨ ਕੀਤੀ ਗਈ ਜਾਣਕਾਰੀ 'ਤੇ ਕੋਈ ਵੀ ਭਰੋਸਾ ਸਿਰਫ਼ ਉਪਭੋਗਤਾ ਦੇ ਆਪਣੇ ਜੋਖਮ 'ਤੇ ਹੈ।</p><h3>3. ਦੇਣਦਾਰੀ ਅਤੇ ਮੁਆਵਜ਼ੇ ਦੀ ਸੰਪੂਰਨ ਸੀਮਾ</h3><p>ਲਾਗੂ ਕਾਨੂੰਨ ਦੁਆਰਾ ਆਗਿਆ ਦਿੱਤੀ ਅਧਿਕਤਮ ਹੱਦ ਤੱਕ, HaBER ਸੌਫਟਵੇਅਰ ਸੋਲਿਊਸ਼ਨ, ਇਸਦੇ ਨਿਰਮਾਤਾ, ਮਾਲਕ, ਅਧਿਕਾਰੀ, ਅਤੇ ਸਹਿਯੋਗੀ<strong>ਕਿਸੇ ਵੀ ਘਟਨਾ ਵਿੱਚ ਕਿਸੇ ਵੀ ਪ੍ਰਤੱਖ, ਅਸਿੱਧੇ, ਇਤਫਾਕਨ, ਨਤੀਜੇ ਵਜੋਂ, ਵਿਸ਼ੇਸ਼, ਜਾਂ ਮਿਸਾਲੀ ਨੁਕਸਾਨ, ਨੁਕਸਾਨ, ਜਾਂ ਖਰਚਿਆਂ ਲਈ ਜ਼ਿੰਮੇਵਾਰ ਨਹੀਂ ਠਹਿਰਾਇਆ ਜਾਵੇਗਾ</strong>ਇਸ ਐਪ ਦੀ ਵਰਤੋਂ, ਜਾਂ ਇਸਦੀ ਵਰਤੋਂ ਕਰਨ ਦੀ ਅਸਮਰੱਥਾ ਦੇ ਸਬੰਧ ਵਿੱਚ ਪੈਦਾ ਹੋਈ। ਉਪਭੋਗਤਾ ਸਪੱਸ਼ਟ ਤੌਰ 'ਤੇ ਐਪ ਦੀ ਸਮੱਗਰੀ ਦੇ ਆਧਾਰ 'ਤੇ ਲਏ ਗਏ ਕਿਸੇ ਵੀ ਨਤੀਜਿਆਂ, ਫੈਸਲਿਆਂ ਜਾਂ ਕਾਰਵਾਈਆਂ ਲਈ ਮੁਕੱਦਮਾ ਕਰਨ, ਦਾਅਵੇ ਕਰਨ, ਜਾਂ ਸਾਨੂੰ ਜ਼ਿੰਮੇਵਾਰ ਠਹਿਰਾਉਣ ਦੇ ਕਿਸੇ ਵੀ ਅਧਿਕਾਰ ਨੂੰ ਛੱਡ ਦਿੰਦਾ ਹੈ। ਉਪਯੋਗਕਰਤਾ ਐਪ ਦੀ ਵਰਤੋਂ ਤੋਂ ਪੈਦਾ ਹੋਣ ਵਾਲੇ ਕਿਸੇ ਵੀ ਤੀਜੀ-ਧਿਰ ਦੇ ਦਾਅਵਿਆਂ ਦੇ ਵਿਰੁੱਧ ਨੁਕਸਾਨ ਰਹਿਤ HaBER ਸੌਫਟਵੇਅਰ ਹੱਲਾਂ ਨੂੰ ਮੁਆਵਜ਼ਾ ਦੇਣ, ਬਚਾਅ ਕਰਨ ਅਤੇ ਰੱਖਣ ਲਈ ਸਹਿਮਤ ਹੁੰਦਾ ਹੈ।</p><h3>4. ਕੋਈ ਵਾਰੰਟੀ ਜਾਂ ਗਾਰੰਟੀ ਨਹੀਂ</h3><p>ਐਪ "ਜਿਵੇਂ ਹੈ" ਅਤੇ "ਜਿਵੇਂ ਉਪਲਬਧ ਹੈ" ਦੇ ਆਧਾਰ 'ਤੇ, ਕਿਸੇ ਵੀ ਕਿਸਮ ਦੀ ਕਿਸੇ ਵੀ ਵਾਰੰਟੀ ਤੋਂ ਬਿਨਾਂ, ਜਾਂ ਤਾਂ ਸਪਸ਼ਟ ਜਾਂ ਅਪ੍ਰਤੱਖ, ਵਪਾਰਕਤਾ, ਕਿਸੇ ਖਾਸ ਉਦੇਸ਼ ਲਈ ਤੰਦਰੁਸਤੀ, ਜਾਂ ਗੈਰ-ਉਲੰਘਣ ਦੀ ਅਪ੍ਰਤੱਖ ਵਾਰੰਟੀਆਂ ਸਮੇਤ ਪਰ ਇਸ ਤੱਕ ਸੀਮਿਤ ਨਹੀਂ ਹੈ। ਅਸੀਂ ਕੋਈ ਵਾਰੰਟੀ ਨਹੀਂ ਦਿੰਦੇ ਹਾਂ ਕਿ ਐਪ ਨਿਰਵਿਘਨ, ਸਮੇਂ ਸਿਰ, ਸੁਰੱਖਿਅਤ, ਗਲਤੀ-ਮੁਕਤ, ਜਾਂ ਗਣਿਤਿਕ ਤੌਰ 'ਤੇ ਨਿਰਦੋਸ਼ ਹੋਵੇਗੀ।</p><h3>5. ਬੌਧਿਕ ਸੰਪੱਤੀ ਦੇ ਅਧਿਕਾਰ</h3><p>ਐਪ ਦੇ ਅੰਦਰ ਮੌਜੂਦ ਸਾਰੇ ਸਾਫਟਵੇਅਰ ਕੋਡ, ਗਣਿਤਿਕ ਜਨਰੇਟਰ, ਐਲਗੋਰਿਦਮ, ਯੂਜ਼ਰ ਇੰਟਰਫੇਸ, ਬ੍ਰਾਂਡਿੰਗ ਅਤੇ ਟੈਕਸਟ HaBER Software Solutions ਦੀ ਵਿਸ਼ੇਸ਼ ਬੌਧਿਕ ਸੰਪਤੀ ਹਨ। ਉਪਯੋਗਕਰਤਾ ਨੂੰ ਕੋਈ ਅਧਿਕਾਰ ਜਾਂ ਲਾਇਸੈਂਸ ਨਹੀਂ ਦਿੱਤੇ ਗਏ ਹਨ, ਸਿਵਾਏ ਇਰਾਦੇ ਅਨੁਸਾਰ ਐਪ ਦੀ ਵਰਤੋਂ ਕਰਨ ਦੇ ਸੀਮਤ, ਗੈਰ-ਨਿਵੇਕਲੇ ਅਧਿਕਾਰ ਨੂੰ ਛੱਡ ਕੇ।</p><h3>6. ਗਵਰਨਿੰਗ ਕਾਨੂੰਨ ਅਤੇ ਵਿਸ਼ੇਸ਼ ਅਧਿਕਾਰ ਖੇਤਰ</h3><p>ਇਹ ਸ਼ਰਤਾਂ ਜਰਮਨੀ ਦੇ ਸੰਘੀ ਗਣਰਾਜ ਦੇ ਕਾਨੂੰਨਾਂ ਦੁਆਰਾ ਨਿਯੰਤ੍ਰਿਤ ਅਤੇ ਸੰਚਾਲਿਤ ਕੀਤੀਆਂ ਜਾਣਗੀਆਂ। ਇਹਨਾਂ ਸ਼ਰਤਾਂ ਜਾਂ ਐਪ ਦੀ ਵਰਤੋਂ ਤੋਂ ਪੈਦਾ ਹੋਣ ਵਾਲੇ ਜਾਂ ਇਸ ਨਾਲ ਸਬੰਧਤ ਕੋਈ ਵੀ ਕਾਨੂੰਨੀ ਵਿਵਾਦ, ਦਾਅਵਿਆਂ, ਜਾਂ ਕਾਰਵਾਈਆਂ ਨੂੰ ਵਿਸ਼ੇਸ਼ ਤੌਰ 'ਤੇ ਬਰਲਿਨ, ਜਰਮਨੀ ਦੀਆਂ ਸਮਰੱਥ ਅਦਾਲਤਾਂ ਵਿੱਚ ਲਿਆਂਦਾ ਜਾਵੇਗਾ।</p></>,
    privacyContent: <><h3>1. ਜਾਣ-ਪਛਾਣ ਅਤੇ ਦਾਇਰੇ</h3><p>ਅਸੀਂ ਤੁਹਾਡੀ ਗੋਪਨੀਯਤਾ ਨੂੰ ਗੰਭੀਰਤਾ ਨਾਲ ਲੈਂਦੇ ਹਾਂ। ਇਹ ਗੋਪਨੀਯਤਾ ਨੀਤੀ ਵੇਰਵੇ ਦਿੰਦੀ ਹੈ ਕਿ ਜਦੋਂ ਤੁਸੀਂ "ਮੇਰਾ ਧਰਮੀ ਜਨਮਦਿਨ ਲੱਭੋ" ਐਪਲੀਕੇਸ਼ਨ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹੋ ਤਾਂ HaBER ਸੌਫਟਵੇਅਰ ਸਲਿਊਸ਼ਨ ("ਅਸੀਂ," "ਸਾਨੂੰ") ਤੁਹਾਡੇ ਨਿੱਜੀ ਡੇਟਾ ਨੂੰ ਕਿਵੇਂ ਇਕੱਠਾ ਕਰਦਾ ਹੈ, ਵਰਤਦਾ ਹੈ, ਪ੍ਰਕਿਰਿਆ ਕਰਦਾ ਹੈ ਅਤੇ ਸੁਰੱਖਿਅਤ ਕਰਦਾ ਹੈ। ਇਹ ਨੀਤੀ ਜਨਰਲ ਡਾਟਾ ਪ੍ਰੋਟੈਕਸ਼ਨ ਰੈਗੂਲੇਸ਼ਨ (GDPR) ਦੇ ਸਖਤ ਮਾਪਦੰਡਾਂ ਦੀ ਪਾਲਣਾ ਕਰਦੀ ਹੈ।</p><h3>2. ਡਾਟਾ ਇਕੱਠਾ ਕਰਨਾ ਅਤੇ ਪ੍ਰੋਸੈਸਿੰਗ ਵਿਧੀਆਂ</h3><p><strong>ਮਹਿਮਾਨ ਉਪਭੋਗਤਾ:</strong>ਜਦੋਂ ਤੁਸੀਂ ਬਿਨਾਂ ਖਾਤੇ ਦੇ ਐਪ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹੋ, ਤਾਂ ਤੁਹਾਡੇ ਜਨਮ ਡੇਟਾ (ਤਾਰੀਖ, ਸਮਾਂ ਅਤੇ ਸਥਾਨ) ਨੂੰ ਗਣਨਾ ਬਣਾਉਣ ਲਈ ਬ੍ਰਾਊਜ਼ਰ ਦੇ ਅੰਦਰ ਥੋੜ੍ਹੇ ਸਮੇਂ ਵਿੱਚ ਪ੍ਰਕਿਰਿਆ ਕੀਤੀ ਜਾਂਦੀ ਹੈ। ਅਸੀਂ ਆਪਣੇ ਬੈਕਐਂਡ ਸਰਵਰਾਂ 'ਤੇ ਇਸ ਉੱਚ ਨਿੱਜੀ ਡੇਟਾ ਨੂੰ ਪ੍ਰਸਾਰਿਤ ਜਾਂ ਸਟੋਰ ਨਹੀਂ ਕਰਦੇ ਹਾਂ।</p><p><strong>ਰਜਿਸਟਰਡ ਉਪਭੋਗਤਾ:</strong>ਜੇਕਰ ਤੁਸੀਂ ਪ੍ਰੋਫਾਈਲਾਂ ਨੂੰ ਸੁਰੱਖਿਅਤ ਕਰਨ ਲਈ ਇੱਕ ਖਾਤਾ ਬਣਾਉਣ ਦੀ ਚੋਣ ਕਰਦੇ ਹੋ, ਤਾਂ ਅਸੀਂ ਤੁਹਾਡੇ ਪ੍ਰਮਾਣੀਕਰਨ ਪ੍ਰਮਾਣ ਪੱਤਰਾਂ (ਜਿਵੇਂ ਕਿ ਈਮੇਲ ਪਤਾ) ਅਤੇ ਜਨਮ ਡਾਟਾ ਪ੍ਰੋਫਾਈਲਾਂ ਨੂੰ ਇਕੱਠਾ ਅਤੇ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਸਟੋਰ ਕਰਦੇ ਹਾਂ ਜਿਨ੍ਹਾਂ ਨੂੰ ਤੁਸੀਂ ਸਪਸ਼ਟ ਤੌਰ 'ਤੇ ਸੁਰੱਖਿਅਤ ਕਰਨ ਲਈ ਚੁਣਦੇ ਹੋ। ਇਹ ਡੇਟਾ ਸੁਰੱਖਿਅਤ ਰੂਪ ਨਾਲ Google Firebase ਵਿੱਚ ਸਟੋਰ ਕੀਤਾ ਜਾਂਦਾ ਹੈ।</p><h3>3. ਪ੍ਰੋਸੈਸਿੰਗ ਦਾ ਉਦੇਸ਼</h3><p>ਅਸੀਂ ਐਪ ਦੀ ਮੁੱਖ ਕਾਰਜਕੁਸ਼ਲਤਾ ਪ੍ਰਦਾਨ ਕਰਨ, ਤੁਹਾਡੀ ਪਛਾਣ ਨੂੰ ਪ੍ਰਮਾਣਿਤ ਕਰਨ, ਤੁਹਾਡੇ ਖਾਤੇ ਨੂੰ ਸੁਰੱਖਿਅਤ ਕਰਨ, ਅਤੇ ਸੈਸ਼ਨਾਂ ਵਿੱਚ ਤੁਹਾਡੇ ਸੁਰੱਖਿਅਤ ਕੀਤੇ ਪ੍ਰੋਫਾਈਲਾਂ ਨੂੰ ਕਾਇਮ ਰੱਖਣ ਦੇ ਉਦੇਸ਼ ਲਈ ਵਿਸ਼ੇਸ਼ ਤੌਰ 'ਤੇ ਤੁਹਾਡੇ ਡੇਟਾ ਦੀ ਪ੍ਰਕਿਰਿਆ ਕਰਦੇ ਹਾਂ। ਅਸੀਂ<strong>ਆਪਣੇ ਨਿੱਜੀ ਡੇਟਾ ਨੂੰ ਨਾ ਵੇਚੋ, ਕਿਰਾਏ 'ਤੇ ਨਾ ਲਓ ਜਾਂ ਮੁਦਰੀਕਰਨ ਨਾ ਕਰੋ</strong>ਕਿਸੇ ਵੀ ਸਥਿਤੀ ਵਿੱਚ ਤੀਜੀ-ਧਿਰ ਦੇ ਡੇਟਾ ਬ੍ਰੋਕਰਾਂ ਜਾਂ ਇਸ਼ਤਿਹਾਰ ਦੇਣ ਵਾਲਿਆਂ ਨੂੰ।</p><h3>4. ਤੀਜੀ-ਧਿਰ ਦਾ ਬੁਨਿਆਦੀ ਢਾਂਚਾ</h3><p>ਉੱਚ ਉਪਲਬਧਤਾ ਅਤੇ ਮਜ਼ਬੂਤ ​​ਸੁਰੱਖਿਆ ਨੂੰ ਯਕੀਨੀ ਬਣਾਉਣ ਲਈ, ਅਸੀਂ ਆਪਣੇ ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਪ੍ਰਦਾਤਾਵਾਂ ਵਜੋਂ Google ਕਲਾਊਡ ਪਲੇਟਫਾਰਮ ਅਤੇ ਫਾਇਰਬੇਸ (Google ਦੁਆਰਾ ਸੰਚਾਲਿਤ) ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਾਂ। ਇਹ ਸੰਸਥਾਵਾਂ GDPR ਦੀ ਪਾਲਣਾ ਵਿੱਚ ਕਨੂੰਨੀ ਤੌਰ 'ਤੇ ਬਾਈਡਿੰਗ ਡਾਟਾ ਪ੍ਰੋਸੈਸਿੰਗ ਇਕਰਾਰਨਾਮੇ (DPAs) ਦੇ ਤਹਿਤ ਡਾਟਾ ਪ੍ਰੋਸੈਸਰਾਂ ਦੇ ਤੌਰ 'ਤੇ ਸਖਤੀ ਨਾਲ ਤੁਹਾਡੇ ਡੇਟਾ ਦੀ ਪ੍ਰਕਿਰਿਆ ਕਰਦੀਆਂ ਹਨ। ਅਸੀਂ ਜ਼ਰੂਰੀ ਕੂਕੀਜ਼ ਦੀ ਵਰਤੋਂ ਕਰ ਸਕਦੇ ਹਾਂ ਜੋ ਤੁਹਾਡੇ ਲੌਗਇਨ ਸੈਸ਼ਨ ਨੂੰ ਕਾਇਮ ਰੱਖਣ ਅਤੇ ਐਪਲੀਕੇਸ਼ਨ ਨੂੰ ਸੁਰੱਖਿਅਤ ਕਰਨ ਲਈ ਸਖ਼ਤੀ ਨਾਲ ਜ਼ਰੂਰੀ ਹਨ।</p><h3>5. ਤੁਹਾਡੇ ਡੇਟਾ ਸੁਰੱਖਿਆ ਅਧਿਕਾਰ</h3><p>GDPR ਦੇ ਤਹਿਤ, ਤੁਹਾਡੇ ਕੋਲ ਤੁਹਾਡੇ ਡੇਟਾ ਸੰਬੰਧੀ ਵਿਆਪਕ ਅਧਿਕਾਰ ਹਨ। ਤੁਹਾਡੇ ਕੋਲ ਤੁਹਾਡੇ ਬਾਰੇ ਸਾਡੇ ਕੋਲ ਰੱਖੇ ਡੇਟਾ ਤੱਕ ਪਹੁੰਚ ਦੀ ਬੇਨਤੀ ਕਰਨ ਦਾ ਅਧਿਕਾਰ ਹੈ, ਅਸ਼ੁੱਧੀਆਂ ਨੂੰ ਸੁਧਾਰਨ ਦੀ ਮੰਗ ਕਰਨ ਦਾ ਅਧਿਕਾਰ, ਡੇਟਾ ਪੋਰਟੇਬਿਲਟੀ ਦਾ ਅਧਿਕਾਰ, ਅਤੇ<strong>"ਭੁੱਲਣ ਦਾ ਅਧਿਕਾਰ" (ਤੁਹਾਡੇ ਡੇਟਾ ਨੂੰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਮਿਟਾਉਣਾ)</strong>. ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਸੇ ਵੀ ਅਧਿਕਾਰ ਦੀ ਵਰਤੋਂ ਕਰਨ ਲਈ, ਤੁਸੀਂ ਆਪਣੀ ਖਾਤਾ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਆਪਣੇ ਡੇਟਾ ਦਾ ਪ੍ਰਬੰਧਨ ਕਰ ਸਕਦੇ ਹੋ ਜਾਂ ਸਾਡੇ ਨਾਲ ਸਿੱਧਾ ਸੰਪਰਕ ਕਰ ਸਕਦੇ ਹੋ।</p><h3>6. ਸੁਰੱਖਿਆ ਉਪਾਅ</h3><p>ਅਸੀਂ ਤੁਹਾਡੇ ਡੇਟਾ ਨੂੰ ਅਣਅਧਿਕਾਰਤ ਪਹੁੰਚ, ਨੁਕਸਾਨ, ਜਾਂ ਤਬਦੀਲੀ ਤੋਂ ਬਚਾਉਣ ਲਈ ਐਂਟਰਪ੍ਰਾਈਜ਼-ਗ੍ਰੇਡ ਤਕਨੀਕੀ ਅਤੇ ਸੰਗਠਨਾਤਮਕ ਸੁਰੱਖਿਆ ਉਪਾਵਾਂ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਾਂ, ਜਿਸ ਵਿੱਚ ਟ੍ਰਾਂਜ਼ਿਟ ਵਿੱਚ ਇਨਕ੍ਰਿਪਸ਼ਨ (HTTPS/TLS) ਅਤੇ ਆਰਾਮ ਵਿੱਚ ਸ਼ਾਮਲ ਹੈ।</p></>,
    imprintContent: <><h3>§ 5 TMG (Telemediengesetz) ਦੇ ਅਨੁਸਾਰ ਲੋੜੀਂਦੀ ਜਾਣਕਾਰੀ</h3><p><strong>ਪ੍ਰਦਾਤਾ ਅਤੇ ਆਪਰੇਟਰ:</strong><br/>HaBER ਸਾਫਟਵੇਅਰ ਹੱਲ<br/>HaBER ਐਕਸਿਸ ਦੁਆਰਾ<br/>ਹਰੀ ਔਸ ਬਰਲਿਨ<br/>ਵੈਸਟੈਂਡ<br/>14059 ਬਰਲਿਨ<br/>ਜਰਮਨੀ ਦੇ ਸੰਘੀ ਗਣਰਾਜ</p><h3>ਸੰਪਰਕ ਜਾਣਕਾਰੀ</h3><p>ਫ਼ੋਨ: +49 (0) 157 3930 XXXX<br/>ਈਮੇਲ: info@habersoftware.example.com</p><h3>ਕਾਨੂੰਨੀ ਅਤੇ ਵਪਾਰਕ ਪ੍ਰਤੀਨਿਧਤਾ</h3><p>ਅਧਿਕਾਰਤ ਪ੍ਰਤੀਨਿਧੀ: ਹਰੀ ਔਸ ਬਰਲਿਨ</p><h3>ਵਿਵਾਦ ਦਾ ਹੱਲ</h3><p>ਯੂਰਪੀਅਨ ਕਮਿਸ਼ਨ ਔਨਲਾਈਨ ਵਿਵਾਦ ਹੱਲ (OS) ਲਈ ਇੱਕ ਪਲੇਟਫਾਰਮ ਪ੍ਰਦਾਨ ਕਰਦਾ ਹੈ, ਜੋ ਕਿ ਇੱਥੇ ਲੱਭਿਆ ਜਾ ਸਕਦਾ ਹੈ<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. ਅਸੀਂ ਖਪਤਕਾਰ ਆਰਬਿਟਰੇਸ਼ਨ ਬੋਰਡ ਦੇ ਸਾਹਮਣੇ ਵਿਵਾਦ ਨਿਪਟਾਰੇ ਦੀਆਂ ਕਾਰਵਾਈਆਂ ਵਿੱਚ ਹਿੱਸਾ ਲੈਣ ਲਈ ਨਾ ਤਾਂ ਜ਼ਿੰਮੇਵਾਰ ਹਾਂ ਅਤੇ ਨਾ ਹੀ ਤਿਆਰ ਹਾਂ।</p><h3>ਸਮੱਗਰੀ ਅਤੇ ਲਿੰਕਾਂ ਲਈ ਜ਼ਿੰਮੇਵਾਰੀ</h3><p>ਇੱਕ ਸੇਵਾ ਪ੍ਰਦਾਤਾ ਵਜੋਂ, ਅਸੀਂ § 7 Abs.1 TMG ਦੇ ਅਨੁਸਾਰ ਆਮ ਕਾਨੂੰਨਾਂ ਦੇ ਅਨੁਸਾਰ ਇਹਨਾਂ ਪੰਨਿਆਂ 'ਤੇ ਸਾਡੀ ਆਪਣੀ ਸਮੱਗਰੀ ਲਈ ਜ਼ਿੰਮੇਵਾਰ ਹਾਂ। ਹਾਲਾਂਕਿ, §§ 8 ਤੋਂ 10 TMG ਦੇ ਅਨੁਸਾਰ, ਅਸੀਂ ਪ੍ਰਸਾਰਿਤ ਜਾਂ ਸਟੋਰ ਕੀਤੀ ਤੀਜੀ-ਧਿਰ ਦੀ ਜਾਣਕਾਰੀ ਦੀ ਨਿਗਰਾਨੀ ਕਰਨ ਜਾਂ ਗੈਰ-ਕਾਨੂੰਨੀ ਗਤੀਵਿਧੀ ਨੂੰ ਦਰਸਾਉਣ ਵਾਲੇ ਹਾਲਾਤਾਂ ਦੀ ਜਾਂਚ ਕਰਨ ਲਈ ਜ਼ਿੰਮੇਵਾਰ ਨਹੀਂ ਹਾਂ। ਸਾਡੀ ਸਾਈਟ ਵਿੱਚ ਬਾਹਰੀ ਤੀਜੀ-ਧਿਰ ਦੀਆਂ ਵੈੱਬਸਾਈਟਾਂ ਦੇ ਲਿੰਕ ਸ਼ਾਮਲ ਹੋ ਸਕਦੇ ਹਨ ਜਿਨ੍ਹਾਂ ਦੀ ਸਮੱਗਰੀ ਉੱਤੇ ਸਾਡਾ ਕੋਈ ਕੰਟਰੋਲ ਨਹੀਂ ਹੈ। ਇਸ ਲਈ, ਅਸੀਂ ਇਸ ਬਾਹਰੀ ਸਮਗਰੀ ਲਈ ਕੋਈ ਜ਼ਿੰਮੇਵਾਰੀ ਸਵੀਕਾਰ ਨਹੀਂ ਕਰ ਸਕਦੇ।</p></>,
    underConstructionBtn: "ਉਸਾਰੀ ਥੱਲੇ",
    guestLoginBtn: "ਮਹਿਮਾਨ ਲੌਗਇਨ",
    underConstructionTitle: "ਉਸਾਰੀ ਥੱਲੇ",
    underConstructionDesc1: "ਇਹ ਐਪਲੀਕੇਸ਼ਨ ਇਸ ਸਮੇਂ ਬਣਾਈ ਜਾ ਰਹੀ ਹੈ।",
    underConstructionDesc2: "ਅਸੀਂ ਅਸੁਵਿਧਾ ਲਈ ਦਿਲੋਂ ਮੁਆਫੀ ਚਾਹੁੰਦੇ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ ਜਾਂਚ ਕਰੋ।",
    password: "ਪਾਸਵਰਡ",
    loginBtn: "ਲਾਗਿਨ",
    incorrectPassword: "ਗਲਤ ਪਾਸਵਰਡ",
    showTip: "ਸੁਝਾਅ ਦਿਖਾਓ",
    hideTip: "ਟਿਪ ਲੁਕਾਓ",
    guestTip: "ਸੁਝਾਅ: ਪਾਸਵਰਡ hari2 ਹੈ",
  },
AS: {
    birthDetails: "জন্মৰ বিৱৰণ",
    birthDate: "জন্ম তাৰিখ",
    birthTime: "জন্মৰ সময়",
    birthPlace: "জন্মস্থান",
    timezone: "সময়মণ্ডল",
    tradData: "পৰম্পৰাগত তথ্য",
    nakshatra: "নক্ষত্ৰ",
    paksha: "পক্ষ",
    tithi: "তিথি",
    lunarMonth: "চন্দ্ৰ মাহ",
    searchRange: "সন্ধান পৰিসৰ আৰু টোকাসমূহ",
    targetYears: "লক্ষ্য বছৰ(সমূহ)",
    notes: "টোকা বা প্ৰশ্ন",
    findBday: "মোৰ ধৰ্মীয় জন্মদিন বিচাৰি পাওক",
    select: "চয়ন কৰা",
    selectTimezone: "সময়মণ্ডল নিৰ্ব্বাচন কৰক",
    footer: "HaBER Software Solutions দ্বাৰা বাৰ্লিনত ❤️ ৰ সৈতে নিৰ্মিত",
    cookieText: "আমি আপোনাক লগ ইন কৰি ৰাখিবলৈ আৰু আপোনাৰ পছন্দসমূহ সংৰক্ষণ কৰিবলৈ প্ৰয়োজনীয় কুকীজ ব্যৱহাৰ কৰো। আমি ট্ৰেকিং কুকীজ ব্যৱহাৰ নকৰো।",
    privacyPolicy: "গোপনীয়তা নীতি",
    gotIt: "এইটো পাইছো",
    legalNotice: "আইনী জাননী",
    terms: "চৰ্ত আৰু নিয়ম",
    imprint: "ছাপ",
    appName: "মোৰ ধৰ্মীয় জন্মদিন বিচাৰি পাওক",
    subtitle1: "নিখুঁত পাঞ্চাং আৰু তিথি কনভাৰ্টাৰ",
    subtitle2: "Precision Panchang & Tithi Converter - জ্যোতিষীয় মূল্যায়ন",
    welcomeTitle: "পাঞ্চাং সহায়কলৈ স্বাগতম",
    welcomeDesc: "পেনেলত আপোনাৰ জন্মৰ বিৱৰণ দিয়ক আৰু মই আপোনাৰ পৰম্পৰাগত জন্মদিন উদযাপন কৰাত সহায় কৰিবলৈ তিথি আৰু নক্ষত্ৰৰ সৈতে মিল থকা সঠিক ধৰ্মীয় কেলেণ্ডাৰ দিনটো গণনা কৰিম।",
    mapHint: "আপুনি আপোনাৰ অৱস্থান সূক্ষ্মভাৱে টিউন কৰিবলৈ মেপত ক্লিক কৰিব পাৰে।",
    login: "লগইন কৰক",
    logout: "লগআউট কৰক",
    history: "ইতিহাস",
    syncHistory: "ইতিহাস ছিঙ্ক কৰিবলৈ লগইন কৰক",
    privacyNoticeTitle: "গোপনীয়তা জাননী",
    privacyNoticeDesc: "আপোনাৰ জ্যোতিষ তথ্য কেৱল এই অধিবেশনৰ বাবে প্ৰক্ৰিয়া কৰা হয় আৰু স্থায়ীভাৱে সংৰক্ষণ কৰা নহ'ব।",
    searchHistory: "সন্ধানৰ ইতিহাস",
    locationPlaceholder: "যেনে- নতুন দিল্লী, ভাৰত",
    tooltipDate: "গ্ৰেগৰিয়ান কেলেণ্ডাৰত আপোনাৰ জন্মৰ নিৰ্দিষ্ট দিন গণনা কৰিবলৈ ব্যৱহাৰ কৰা হয়।",
    tooltipTime: "তিথি আৰু নক্ষত্ৰৰ সঠিক গণনাৰ বাবে জন্মৰ সময় অতি গুৰুত্বপূৰ্ণ, কিয়নো দিনটোৰ ভিতৰতে ইয়াৰ পৰিৱৰ্তন ঘটে।",
    tooltipPlace: "স্থান অনুসৰি সূৰ্য্য উদয় আৰু চন্দ্ৰৰ পৰ্যায় ভিন্ন হয়। আপোনাৰ চহৰ বা চহৰৰ নাম লিখক। এটা বিকল্প বা পোনপটীয়াকৈ টাইপ কৰক।",
    tooltipTimezone: "আপোনাৰ জন্মৰ সময়ত স্থানীয় সময়মণ্ডল অফছেট। সঠিক সাৰ্বজনীন সময় পৰীক্ষা কৰাত সহায় কৰে।",
    tooltipNakshatra: "আপোনাৰ জন্মৰ সময়ত চন্দ্ৰই দখল কৰা জন্ম নক্ষত্ৰ বা চন্দ্ৰ অট্টালিকা।",
    tooltipPaksha: "চন্দ্ৰ মাহৰ পষেক। শুক্ল মোম (উজ্জ্বল), কৃষ্ণ ক্ষীণ (আন্ধাৰ)।",
    tooltipTithi: "চন্দ্ৰৰ দিন। পৰম্পৰাগত ধৰ্মীয় জন্মদিন উদযাপনৰ বাবে অতি গুৰুত্বপূৰ্ণ।",
    tooltipMonth: "যি চন্দ্ৰ মাহত আপুনি জন্ম লৈছিল (যেনে, চৈত্ৰ, বৈশাখা)।",
    tooltipTargetYear: "আপুনি আপোনাৰ পৰম্পৰাগত জন্মদিনৰ তাৰিখ বিচাৰিব বিচৰা বছৰ বা বছৰৰ পৰিসৰ নিৰ্দিষ্ট কৰক।",
    tooltipNotes: "বিশেষ গণনা পদ্ধতি ধাৰ্য্য কৰক (যেনে অমন্ত বা পূৰ্ণিমন্ত) বা আপোনাৰ অনুসন্ধানত প্ৰসংগ যোগ কৰক।",
    calculating: "গণনা...",
    calculatingPanchang: "PANCHANG ALIGNMENTS গণনা...",
    targetYearPlaceholder: "যেনে- ২০২৬ বা ২০২৫-২০৩০ চন",
    notesPlaceholder: "নিৰ্দিষ্ট পৰম্পৰা (যেনে অমন্ত) নে প্ৰশ্ন?",
    slideTitle0: "আপোনাৰ প্ৰকৃত মহাজাগতিক আগমন উদযাপন কৰক",
    slideDesc0: "নিখুঁত বৈদিক জ্যোতিষৰ ওপৰত ভিত্তি কৰি আপোনাৰ সঠিক ধৰ্মীয় জন্মদিন আৱিষ্কাৰ কৰক।",
    slideTitle1: "প্ৰাচীনসকলৰ প্ৰজ্ঞা",
    slideDesc1: "আমাৰ উচ্চ নিখুঁত আৰ্হিত প্ৰাচীন পাঞ্চাং গণনা ব্যৱহাৰ কৰা হয়।",
    slideTitle2: "এটা আকাশী উদযাপন",
    slideDesc2: "প্ৰামাণিক মহাজাগতিক ছন্দৰ সৈতে আপোনাৰ বিশেষ দিনটোক একাকাৰ কৰক।",
    slideTitle3: "পবিত্ৰ জ্যোতিষ মণ্ডল",
    slideDesc3: "বিশ্বব্ৰহ্মাণ্ডৰ শক্তিশালী আৰ্হিৰ সৈতে গভীৰভাৱে সংযোগ স্থাপন কৰক।",
    slideTitle4: "আপোনাৰ বৈদিক জন্ম তালিকা",
    slideDesc4: "আপোনাৰ জীৱনৰ প্ৰকৃত যাত্ৰাৰ ৰহস্যসমূহ মুকলি কৰক।",
    slideTitle5: "পোহৰৰ আনন্দময় উৎসৱ",
    slideDesc5: "পৰম্পৰাগত উদযাপনৰ আধ্যাত্মিক শক্তিক আকোৱালি লওক।",
    slideTitle6: "পবিত্ৰ অগ্নি পূজা",
    slideDesc6: "প্ৰাচীন অগ্নি আচাৰ-ব্যৱহাৰৰ জৰিয়তে ঐশ্বৰিকতাৰ সৈতে মিল ৰাখক।",
    slideTitle7: "ৰহস্যময় চন্দ্ৰ যাত্ৰা",
    slideDesc7: "পবিত্ৰ নক্ষত্ৰৰ মাজেৰে চন্দ্ৰৰ ট্ৰেনজিট অনুসৰণ কৰক।",
    slideTitle8: "মহাজাগতিক ওম আৰু পদুম",
    slideDesc8: "ভিতৰৰ আভ্যন্তৰীণ শান্তি আৰু আধ্যাত্মিক প্ৰজ্ঞা জাগ্ৰত কৰক।",
    slideTitle9: "পৰম্পৰাগত পঞ্চাং",
    slideDesc9: "হিন্দু পঞ্জিকাৰ কালজয়ী ছন্দ উন্মোচন কৰক।",
    slideTitle10: "উল্লাসিত কীৰ্তন আনন্দ",
    slideDesc10: "মণ্ডলীৰ জপৰ বিশুদ্ধ আনন্দ অনুভৱ কৰক।",
    slideTitle11: "আৰতি উদযাপন",
    slideDesc11: "পৰম্পৰাগত পাৰিবাৰিক আৰতিৰে আপোনাৰ পথ আলোকিত কৰক।",
    slideTitle12: "আধ্যাত্মিক শান্তি",
    slideDesc12: "মন্দিৰৰ পবিত্ৰ পৰিৱেশত আভ্যন্তৰীণ শান্তি বিচাৰি পাওক।",
    slideTitle13: "বৈদিক অগ্নি যজ্ঞ",
    slideDesc13: "প্ৰাচীন অগ্নি অনুষ্ঠানৰ জৰিয়তে ঐশ্বৰিক আশীৰ্বাদ লাভ কৰক।",
    slideTitle14: "পবিত্ৰ জাপা",
    slideDesc14: "পবিত্ৰ নাম জপ কৰি আধ্যাত্মিক চেতনা জাগ্ৰত কৰক।",
    testiText0: "ধৰ্মীয় কেলেণ্ডাৰ অনুসৰি জন্মদিন উদযাপন কৰিবলৈ আৰম্ভ কৰাৰ পৰাই মোৰ শক্তিৰ গভীৰ পৰিৱৰ্তন লক্ষ্য কৰিছো। মোৰ লগত বিশ্বব্ৰহ্মাণ্ডখন যেন একাকাৰ হৈ পৰিছে! ই মোৰ বছৰটোলৈ অবিশ্বাস্য ভাগ্য আৰু শান্তি কঢ়িয়াই আনিলে।",
    testiAuthor0: "ৰাজেশ কে.",
    testiText1: "মই সদায় ভুল তাৰিখত উদযাপন কৰি আছিলো! গ্ৰেগৰিয়ান কেলেণ্ডাৰ মাত্ৰ এটা সংখ্যা, কিন্তু তিথি আৰু নক্ষত্ৰৰ প্ৰান্তিককৰণে প্ৰকৃত মহাজাগতিক আশীৰ্বাদ কঢ়িয়াই আনে। মোৰ প্ৰকৃত ধৰ্মীয় জন্মদিনত উদযাপন কৰি মই কেতিয়াও কল্পনা নকৰা দুৱাৰ মুকলি কৰি দিলে।",
    testiAuthor1: "প্ৰিয়া এছ.",
    testiText2: "এই এপটোৱে মোক মোৰ প্ৰামাণিক জন্মদিনটো বিচাৰি উলিয়াবলৈ সহায় কৰিলে। মোৰ ধৰ্মীয় জন্মদিন উদযাপন কৰাৰ প্ৰথম বছৰতে বহু প্ৰত্যাশিত প্ৰমোচন এটা পাইছিলোঁ। ই কেৱল ডেটতকৈও বেছি; ই এটা আধ্যাত্মিক ৰিছেট।",
    testiAuthor2: "অমিত পি.",
    testiText3: "অৱশেষত মোৰ প্ৰকৃত জন্মদিনটো বিচাৰি পালোঁ! গ্ৰেগৰিয়ান কেলেণ্ডাৰৰ সংযোগ বিচ্ছিন্ন যেন লাগিল, কিন্তু এই ধৰ্মীয় তাৰিখে মোক মোৰ শিপাৰ ওচৰলৈ লৈ যায়। পূজাৰে উদযাপন কৰি এই বছৰটো ইমান বিশেষ কৰি তুলিলে।",
    testiAuthor3: "স্নেহা এম.",
    testiText4: "আমাৰ পৰম্পৰাৰ সৈতে পুনৰ সংযোগ স্থাপনৰ ইমান সুন্দৰ উপায়। মোৰ পৰিয়ালে এতিয়া দুয়োটা তাৰিখ উদযাপন কৰে, কিন্তু ধৰ্মীয় জন্মদিনটো আধ্যাত্মিকভাৱে বহুত বেছি পূৰ্ণতাপূৰ্ণ অনুভৱ হয়।",
    testiAuthor4: "বিক্ৰম আৰ.",
    testiText5: "প্ৰথমতে মোৰ সন্দেহ আছিল যদিও নক্ষত্ৰ আৰু তিথিৰ হিচাপৰ সঠিকতা অবিশ্বাস্য। মোৰ মহাজাগতিক জন্মদিনটো বিচাৰি পোৱাটো সঁচাকৈয়ে চকু মুদা কুলিৰ ভাও ধৰা অভিজ্ঞতা আছিল।",
    testiAuthor5: "অদিতি ভি.",
    testiText6: "এই সঁজুলিটো আশীৰ্বাদ! বছৰ বছৰ ধৰি মোৰ প্ৰামাণিক হিন্দু জন্মদিনটো বুজিবলৈ চেষ্টা কৰি আহিছো। উদযাপনটো গভীৰভাৱে ব্যক্তিগত আৰু ঐশ্বৰিকতাৰ দ্বাৰা আশীৰ্বাদ অনুভৱ কৰা হৈছিল।",
    testiAuthor6: "কৰণ ডি.",
    testiText7: "এজন ইস্কন ভক্ত হিচাপে তিথিৰ ওপৰত ভিত্তি কৰি মোৰ সঠিক ধৰ্মীয় জন্মদিনটো জানিলে মোৰ আধ্যাত্মিক অনুশীলনসমূহ নিখুঁতভাৱে প্ৰান্তিককৰণ কৰিব পৰা যায়। প্ৰতিজন আধ্যাত্মিক সাধকৰ বাবে এটা আৱশ্যকীয় বস্তু।",
    testiAuthor7: "অঞ্জলি জি.",
    testiText8: "আমাৰ ককা-আইতাহঁতে সদায় পাঞ্চাঙৰ পিছে পিছে গৈছিল, কিন্তু আমাৰ সংস্পৰ্শ হেৰাই গ’ল। এই এপটোৱে সেই সুন্দৰ পৰম্পৰা আমাৰ পৰিয়াললৈ ঘূৰাই আনিলে। ধৰ্মীয় জন্মদিনৰ আনন্দৰ অতুলনীয়।",
    testiAuthor8: "ৰোহিত এছ.",
    testiText9: "আচৰিত অভিজ্ঞতা! হিচাপবোৰ নিখুঁত, আৰু মোৰ তিথিৰ দিনা উদযাপন কৰাটো অবিশ্বাস্যভাৱে শুভ অনুভৱ হৈছিল। সেইদিনা শক্তি আছিল সৰলভাৱে আচৰিত।",
    testiAuthor9: "মীৰা টি.",
    heroProblemTitle: "প্ৰত্যাহ্বান: ষ্টেটিক সৌৰ তাৰিখ বনাম গতিশীল মহাজাগতিক ছন্দ",
    heroProblemDesc: <><p>মানক গ্ৰেগ'ৰিয়ান (ইংৰাজী) কেলেণ্ডাৰৰ ওপৰত নিৰ্ভৰ কৰিলে আপোনাৰ জন্মদিন স্থায়ীভাৱে এটা স্থিতিশীল সৌৰ তাৰিখৰ সৈতে বান্ধ খাই থাকে। কিন্তু তৰা আৰু গ্ৰহৰ প্ৰকৃত মহাজাগতিক প্ৰান্তিককৰণ—আপুনি জন্মৰ সময়ত উপস্থিত থকা সঠিক আকাশী বিন্যাস—বছৰৰ পিছত বছৰ ধৰি নাটকীয়ভাৱে স্থানান্তৰিত হয়। এই কাৰণেই প্ৰতি বছৰে বিভিন্ন সৌৰ তাৰিখত প্ৰাচীন উৎসৱ যেনে দীপাৱলী, নৱৰাত্ৰি, গণেশ চতুৰ্থী পালন কৰা হয়।</p><p>এটা নিৰ্দিষ্ট সৌৰ তাৰিখ অনুসৰণ কৰিলে আপুনি আপোনাৰ প্ৰকৃত জ্যোতিষীয় উভতি অহাৰ গভীৰ আধ্যাত্মিক তাৎপৰ্য্য হেৰুৱাই পেলায়। পৰম্পৰাগত ধৰ্মীয় কেলেণ্ডাৰে চন্দ্ৰ আৰু মহাবিশ্বৰ মাজৰ গতিশীল নৃত্যক সন্মান জনায়, আপোনাৰ প্ৰকৃত আকাশী উৎপত্তিৰ সৈতে গভীৰভাৱে প্ৰামাণিক সংযোগ প্ৰদান কৰে।</p></>,
    heroSolutionTitle: "সমাধান: নিখুঁত ধৰ্মীয় প্ৰান্তিককৰণ",
    heroSolutionDesc: <><p>আমাৰ এণ্টাৰপ্ৰাইজ-গ্ৰেড ধৰ্মীয় জন্মদিন কেলকুলেটৰে সঠিক গণনা কৰিবলৈ উচ্চ-নিখুঁত জ্যোতিৰ্বিজ্ঞান এলগৰিদম আৰু কঠোৰ গ্ৰহীয় এফেমেৰিছ তথ্যৰ সহায় লয়<b>চন্দ্ৰ দিৱস (তিথি)</b>আৰু<b>জন্ম নক্ষত্ৰ (নক্ষত্ৰ)</b>তোমাৰ অৱতাৰৰ। এই স্থানান্তৰিত আকাশী ছন্দবোৰ নিখুঁতভাৱে অনুসৰণ কৰি আমি গাণিতিকভাৱে প্ৰতিটো বছৰতে আপোনাৰ জন্ম উদযাপন কৰিবলৈ প্ৰামাণিক, পৰম্পৰাগত তাৰিখটো চিনাক্ত কৰোঁ।</p><p>এই সঁজুলিটো আপোনাৰ সঠিক দ্ৰাঘিমাংশ, অক্ষাংশ আৰু সময়মণ্ডলৰ লগত খাপ খুৱাবলৈ নিখুঁতভাৱে অভিযন্তা কৰা হৈছে, যাতে গ্ৰহৰ গণনাই আপোনাৰ নিৰ্দিষ্ট জন্মস্থানৰ ওপৰৰ প্ৰকৃত মহাজাগতিক অৱস্থা প্ৰতিফলিত কৰে।</p></>,
    heroWhoTitle: "এই ব্যৱস্থাৰ পৰা কোনে লাভৱান হয়?",
    heroWhoDesc: <><p>এই এপ্লিকেচনটো আধ্যাত্মিক সাধক, ধৰ্মীয় পৰম্পৰাৰ ভক্তিময় অনুগামী, আৰু এই জগতলৈ তেওঁলোকৰ আগমনৰ পথ প্ৰদৰ্শক সাৰ্বজনীন ছন্দৰ সৈতে পুনৰ সংযোগ স্থাপনৰ বাবে চেষ্টা কৰা ব্যক্তিসকলৰ বাবে নিখুঁতভাৱে ডিজাইন কৰা হৈছে। প্ৰামাণিক পৰম্পৰাগত উদযাপনৰ পৰিকল্পনা, শুভ পূজাৰ সময় নিৰ্ধাৰণ, বা গভীৰ ব্যক্তিগত চিন্তা-চৰ্চাৰ বাবে সময় উচৰ্গা কৰাৰ বাবে ই এক নিখুঁত মূল আহিলা।</p></>,
    heroWhyTitle: "আমাৰ পদ্ধতি কিয় উচ্চমানৰ",
    heroWhyDesc: <><p>উন্নত গণনামূলক জ্যোতিষ ব্যৱহাৰ কৰি অভিযন্তা এই প্লেটফৰ্মে হাজাৰ হাজাৰ বছৰৰ প্ৰতিষ্ঠিত বৈদিক জ্যোতিৰ্বিজ্ঞানৰ বিপৰীতে আপোনাৰ জন্মৰ সঠিক সময় আৰু ভৌগোলিক স্থানাংক ক্ৰছ-ৰেফাৰেন্স কৰে। আমাৰ কঠোৰ গাণিতিক পদ্ধতিয়ে আপোনাৰ বছৰৰ আটাইতকৈ আধ্যাত্মিকভাৱে উল্লেখযোগ্য দিনটো নিৰ্ধাৰণৰ বাবে অতুলনীয়, পেছাদাৰী-গ্ৰেডৰ সঠিকতা প্ৰদান কৰে।</p></>,
    heroDisclaimerTitle: "গুৰুত্বপূৰ্ণ আইনী আৰু দায়বদ্ধতা অস্বীকাৰ",
    heroDisclaimerDesc: <><p>এই এপ্লিকেচনে প্ৰদান কৰা তথ্য, গণনা, তাৰিখ, আৰু অন্যান্য বিষয়বস্তু উদ্দেশ্য কৰা হৈছে<strong>কঠোৰভাৱে কেৱল আধ্যাত্মিক, শৈক্ষিক আৰু মনোৰঞ্জনৰ উদ্দেশ্যে।</strong>এই এপৰ সৃষ্টিকৰ্তা, মালিক, আৰু অপাৰেটৰে প্ৰদান কৰে<strong>সঠিকতা, সম্পূৰ্ণতা বা নিৰ্ভৰযোগ্যতাৰ সম্পৰ্কে কোনো ৱাৰেণ্টী—স্পষ্ট বা অস্পষ্ট</strong>জ্যোতিষীয় গণনা বা ইয়াত থকা অন্য কোনো তথ্যৰ তথ্য।</p><p>এই এপ্লিকেচন<strong>পেছাদাৰী, চিকিৎসা, মানসিক, আৰ্থিক বা আইনী পৰামৰ্শ প্ৰদান নকৰে আৰু ইয়াকো ধৰিব নালাগে।</strong></p><p>এই সেৱা ব্যৱহাৰ কৰি, আপুনি স্পষ্টভাৱে সন্মত হৈছে যে সৃষ্টিকৰ্তা, মালিক, আৰু অপাৰেটৰসকলে<strong>কোনো সিদ্ধান্ত, গ্ৰহণ বা পৰিণতিৰ বাবে কোনো দায়িত্ব গ্ৰহণ নকৰিব</strong>প্ৰদান কৰা তাৰিখ, গণনা বা অন্তৰ্দৃষ্টিৰ ওপৰত ভিত্তি কৰি। আপুনি এইটোও সন্মত যে এই তথ্যৰ ওপৰত আপুনি যিকোনো নিৰ্ভৰশীলতা কঠোৰভাৱে কৰা হয়<strong>নিজৰ দায়িত্বত।</strong></p><p>এই এপ্লিকেচনৰ সৃষ্টিকৰ্তা, মালিক, আৰু পৰিচালকসকল হৈছে...<strong>দায়বদ্ধতাৰ পৰা সম্পূৰ্ণৰূপে মুক্ত কৰা হৈছে</strong>ৰ ক্ষেত্ৰত<strong>যিকোনো আইনী দাবী, ক্ষতিপূৰণ, দায়বদ্ধতা, বা বিবাদ</strong>এই চফ্টৱেৰ বা সেৱাৰ ব্যৱহাৰৰ পৰা উদ্ভৱ হোৱা। আপুনি এই কথাত সন্মত যে তেওঁলোকৰ ওপৰত কোনো আইনী দায়বদ্ধতা জাপি দিয়া নহ’ব।</p></>,
    followupPlaceholder: "ফ'ল' আপ প্রশ্ন সোধক...",
    termsContent: <><h3>১/ চৰ্তসমূহ গ্ৰহণ কৰা</h3><p>HaBER Software Solutions ("আমি," "আমাক," বা "আমাৰ") দ্বাৰা পৰিচালিত "মোৰ ধৰ্মীয় জন্মদিন বিচাৰি উলিয়াওক" এপ্লিকেচন ("এপ") অভিগম আৰু ব্যৱহাৰ কৰি, আপুনি ("ব্যৱহাৰকাৰী") স্বীকাৰ কৰে যে আপুনি এই চৰ্ত আৰু নিয়মসমূহ পঢ়িছে, বুজিছে আৰু আইনগতভাৱে বান্ধ খাই থাকিবলৈ সন্মত হৈছে। যদি আপুনি এই চৰ্তসমূহত সন্মত নহয়, তেন্তে আপুনি তৎক্ষণাত App ৰ সকলো ব্যৱহাৰ বন্ধ কৰিব লাগিব।</p><h3>২/ সেৱাৰ প্ৰকৃতি আৰু কোনো পেছাদাৰী পৰামৰ্শ নাই</h3><p>এপটোৱে তাৰিখ, অন্তৰ্দৃষ্টি, আৰু জ্যোতিৰ্বিজ্ঞানৰ গণনা সৃষ্টি কৰে<strong>কেৱল আধ্যাত্মিক, শৈক্ষিক আৰু মনোৰঞ্জনৰ উদ্দেশ্যে।</strong>আমি চিকিৎসা, মানসিক, আৰ্থিক, আইনী বা অন্যান্য পেছাদাৰী পৰামৰ্শ প্ৰদান নকৰো, বা কোনো বিষয়বস্তুক ধৰি লোৱা উচিত নহয়। প্ৰদান কৰা তথ্যৰ ওপৰত যিকোনো নিৰ্ভৰশীলতা কেৱল ব্যৱহাৰকাৰীৰ নিজৰ দায়িত্বত।</p><h3>৩/ দায়বদ্ধতা আৰু ক্ষতিপূৰণৰ নিৰপেক্ষ সীমাবদ্ধতা</h3><p>প্ৰযোজ্য আইনৰ দ্বাৰা অনুমোদিত সৰ্বাধিক পৰিসৰলৈকে, HaBER চফ্টৱেৰ সমাধান, ইয়াৰ সৃষ্টিকৰ্তা, মালিক, বিষয়া, আৰু সংযুক্ত প্ৰতিষ্ঠানসমূহে...<strong>কোনো কাৰণতে কোনো প্ৰত্যক্ষ, পৰোক্ষ, আকস্মিক, ফলস্বৰূপ, বিশেষ, বা আদৰ্শগত ক্ষতি, লোকচান বা খৰচৰ বাবে দায়ী নহ'ব</strong>এই এপটোৰ ব্যৱহাৰৰ পৰা বা ইয়াৰ সৈতে জড়িত, বা ব্যৱহাৰ কৰিব নোৱাৰাৰ ফলত উদ্ভৱ হোৱা। ব্যৱহাৰকাৰীয়ে এপটোৰ বিষয়বস্তুৰ ওপৰত ভিত্তি কৰি লোৱা যিকোনো ফলাফল, সিদ্ধান্ত বা ব্যৱস্থাৰ বাবে আমাক মামলা কৰাৰ, বিৰুদ্ধে দাবী কৰাৰ বা দায়ী কৰাৰ কোনো অধিকাৰ স্পষ্টভাৱে ত্যাগ কৰে৷ ব্যৱহাৰকাৰীয়ে এপটোৰ ব্যৱহাৰৰ পৰা উদ্ভৱ হোৱা যিকোনো তৃতীয় পক্ষৰ দাবীৰ বিৰুদ্ধে নিৰাপদ HaBER চফ্টৱেৰ সমাধানসমূহক ক্ষতিপূৰণ, প্ৰতিৰক্ষা আৰু ধৰি ৰাখিবলৈ সন্মত হয়।</p><h3>৪/ কোনো ৱাৰেণ্টী বা নিশ্চয়তা নাই</h3><p>এপটো "যেনে আছে" আৰু "যেনেকৈ উপলব্ধ" ভিত্তিত প্ৰদান কৰা হৈছে, কোনো ধৰণৰ কোনো ধৰণৰ ৱাৰেণ্টী নোহোৱাকৈ, স্পষ্ট বা অন্তৰ্নিহিত, ইয়াৰ ভিতৰত আছে কিন্তু ইয়াৰ মাজতে সীমাবদ্ধ নহয়। আমি কোনো ৱাৰেণ্টী নিদিওঁ যে এপটো নিৰৱচ্ছিন্ন, সময়োপযোগী, সুৰক্ষিত, ভুলমুক্ত, বা গাণিতিকভাৱে ত্ৰুটিহীন হ'ব।</p><h3>৫/ বৌদ্ধিক সম্পত্তিৰ অধিকাৰ</h3><p>এপটোৰ ভিতৰত থকা সকলো চফ্টৱেৰ ক'ড, গাণিতিক জেনেৰেটৰ, এলগৰিদম, ব্যৱহাৰকাৰী আন্তঃপৃষ্ঠ, ব্ৰেণ্ডিং, আৰু টেক্সট HaBER চফ্টৱেৰ সমাধানৰ একচেটিয়া বৌদ্ধিক সম্পত্তি। ব্যৱহাৰকাৰীক কোনো অধিকাৰ বা অনুজ্ঞাপত্ৰ প্ৰদান কৰা নহয়, উদ্দেশ্য অনুসৰি এপটো ব্যৱহাৰ কৰাৰ সীমিত, অ-একচেটিয়া অধিকাৰৰ বাহিৰে।</p><h3>৬/ শাসকীয় আইন আৰু একচেটিয়া অধিকাৰক্ষেত্ৰ</h3><p>এই চৰ্তসমূহ ফেডাৰেল ৰিপাব্লিক অৱ জাৰ্মানীৰ আইন অনুসৰি পৰিচালিত আৰু ব্যাখ্যা কৰা হ'ব। এই চৰ্তসমূহ বা এপটোৰ ব্যৱহাৰৰ পৰা উদ্ভৱ হোৱা বা ইয়াৰ সৈতে জড়িত যিকোনো আইনী বিবাদ, দাবী, বা কাৰ্য্যবিধি একচেটিয়াভাৱে জাৰ্মানীৰ বাৰ্লিনৰ যোগ্য আদালতত অনা হ'ব।</p></>,
    privacyContent: <><h3>১/ পৰিচয় আৰু পৰিসৰ</h3><p>আমি আপোনাৰ গোপনীয়তাক গুৰুত্বসহকাৰে লওঁ। এই গোপনীয়তা নীতিয়ে বিৱৰণ দিয়ে যে আপুনি "মোৰ ধৰ্মীয় জন্মদিন বিচাৰি উলিয়াওক" এপ্লিকেচন ব্যৱহাৰ কৰাৰ সময়ত HaBER চফ্টৱেৰ সমাধানসমূহে ("আমি," "আমাক") আপোনাৰ ব্যক্তিগত ডাটা কেনেকৈ সংগ্ৰহ, ব্যৱহাৰ, প্ৰক্ৰিয়া আৰু সুৰক্ষা কৰে। এই নীতি সাধাৰণ তথ্য সুৰক্ষা নিয়ম (GDPR)ৰ কঠোৰ মানদণ্ডসমূহ মানি চলে।</p><h3>২) তথ্য সংগ্ৰহ আৰু প্ৰক্ৰিয়াকৰণৰ পদ্ধতি</h3><p><strong>অতিথি ব্যৱহাৰকাৰী:</strong>যেতিয়া আপুনি একাউণ্ট অবিহনে এপটো ব্যৱহাৰ কৰে, আপোনাৰ জন্মৰ তথ্য (তাৰিখ, সময়, আৰু অৱস্থান) ব্ৰাউজাৰৰ ভিতৰত ক্ষণস্থায়ীভাৱে প্ৰক্ৰিয়াকৰণ কৰি গণনা সৃষ্টি কৰা হয়। আমি এই অতি ব্যক্তিগত তথ্য আমাৰ বেকএণ্ড চাৰ্ভাৰত প্ৰেৰণ বা সংৰক্ষণ নকৰো।</p><p><strong>পঞ্জীয়নভুক্ত ব্যৱহাৰকাৰী:</strong>যদি আপুনি আলেখ্যনসমূহ সংৰক্ষণ কৰিবলৈ এটা একাউণ্ট সৃষ্টি কৰিবলৈ বাছি লয়, আমি আপোনাৰ প্ৰমাণীকৰণ প্ৰমাণপত্ৰসমূহ (যেনে ইমেইল ঠিকনা) আৰু আপুনি স্পষ্টভাৱে সংৰক্ষণ কৰিবলৈ বাছি লোৱা জন্ম তথ্য আলেখ্যনসমূহ সংগ্ৰহ আৰু সুৰক্ষিতভাৱে সংৰক্ষণ কৰোঁ৷ এই তথ্য গুগল ফায়াৰবেছত সুৰক্ষিতভাৱে সংৰক্ষণ কৰা হয়।</p><h3>৩/ প্ৰক্ৰিয়াকৰণৰ উদ্দেশ্য</h3><p>আমি আপোনাৰ ডাটা একচেটিয়াভাৱে এপটোৰ মূল কাৰ্য্যকৰীতা প্ৰদান কৰা, আপোনাৰ পৰিচয় প্ৰমাণীকৰণ কৰা, আপোনাৰ একাউণ্ট সুৰক্ষিত কৰা, আৰু অধিবেশনসমূহৰ মাজেৰে আপোনাৰ সংৰক্ষিত প্ৰ'ফাইলসমূহ ৰক্ষণাবেক্ষণ কৰাৰ উদ্দেশ্যে প্ৰক্ৰিয়াকৰণ কৰোঁ৷ আমি<strong>আপোনাৰ ব্যক্তিগত তথ্য বিক্ৰী, ভাড়া, বা মুদ্ৰাকৰণ নকৰিব</strong>যিকোনো পৰিস্থিতিত তৃতীয় পক্ষৰ ডাটা ব্ৰোকাৰ বা বিজ্ঞাপনদাতাক।</p><h3>৪/ তৃতীয় পক্ষৰ আন্তঃগাঁথনি</h3><p>উচ্চ উপলব্ধতা আৰু শক্তিশালী সুৰক্ষা নিশ্চিত কৰিবলৈ আমি আমাৰ আন্তঃগাঁথনি প্ৰদানকাৰী হিচাপে Google ক্লাউড প্লেটফৰ্ম আৰু ফায়াৰবেছ (Google দ্বাৰা পৰিচালিত) ব্যৱহাৰ কৰো। এই সত্তাসমূহে আপোনাৰ তথ্যসমূহ GDPR অনুসৰি আইনীভাৱে বাধ্যতামূলক ডাটা প্ৰচেছিং চুক্তিসমূহ (DPAs)ৰ অধীনত ডাটা প্ৰচেছৰ হিচাপে কঠোৰভাৱে প্ৰক্ৰিয়াকৰণ কৰে। আমি অত্যাৱশ্যকীয় কুকীজ ব্যৱহাৰ কৰিব পাৰো যিবোৰ আপোনাৰ প্ৰৱেশ অধিবেশন বজাই ৰাখিবলৈ আৰু এপ্লিকেচনটো সুৰক্ষিত কৰিবলৈ কঠোৰভাৱে প্ৰয়োজনীয়৷</p><h3>৫/ আপোনাৰ তথ্য সুৰক্ষাৰ অধিকাৰ</h3><p>GDPR ৰ অধীনত, আপোনাৰ তথ্যৰ সম্পৰ্কে আপুনি বিস্তৃত অধিকাৰ লাভ কৰে। আপোনাৰ বিষয়ে আমি ৰখা তথ্যসমূহৰ প্ৰৱেশৰ অনুৰোধ কৰাৰ অধিকাৰ, ভুলসমূহ শুধৰণিৰ দাবী কৰাৰ অধিকাৰ, তথ্য বহনযোগ্যতাৰ অধিকাৰ, আৰু...<strong>"পাহৰি যোৱাৰ অধিকাৰ" (আপোনাৰ তথ্য সম্পূৰ্ণৰূপে মচি পেলোৱা)</strong>. এই অধিকাৰসমূহৰ যিকোনো এটা ব্যৱহাৰ কৰিবলৈ, আপুনি আপোনাৰ একাউণ্ট ছেটিংছৰ ভিতৰত আপোনাৰ ডাটা পৰিচালনা কৰিব পাৰে বা আমাৰ সৈতে পোনপটীয়াকৈ যোগাযোগ কৰিব পাৰে৷</p><h3>৬/ নিৰাপত্তাৰ ব্যৱস্থা</h3><p>আমি আপোনাৰ ডাটাক অকৰ্তৃত্বশীল অভিগম, ক্ষতি, বা পৰিৱৰ্তনৰ বিৰুদ্ধে সুৰক্ষিত কৰিবলৈ এণ্টাৰপ্ৰাইজ-গ্ৰেড কাৰিকৰী আৰু সাংগঠনিক সুৰক্ষা ব্যৱস্থা ব্যৱহাৰ কৰো, ট্ৰেনজিটত (HTTPS/TLS) আৰু জিৰণি লোৱাৰ সময়ত এনক্ৰিপচনকে ধৰি৷</p></>,
    imprintContent: <><h3>§ 5 TMG (Telemediengesetz) অনুসৰি প্ৰয়োজনীয় তথ্য</h3><p><strong>প্ৰদানকাৰী আৰু অপাৰেটৰ:</strong><br/>HaBER চফ্টৱেৰ সমাধানসমূহ<br/>HaBER অক্ষৰ দ্বাৰা<br/>হৰি আউছ বাৰ্লিন<br/>ৱেষ্টেণ্ড<br/>১৪০৫৯ বাৰ্লিন<br/>জাৰ্মানীৰ ফেডাৰেল ৰিপাব্লিক</p><h3>যোগাযোগৰ তথ্য</h3><p>ফোন: +৪৯ (০) ১৫৭ ৩৯৩০ XXXX<br/>ইমেইল: info@habersoftware.example.com</p><h3>আইনী আৰু বাণিজ্যিক প্ৰতিনিধিত্ব</h3><p>অনুমোদিত প্ৰতিনিধি: হৰি আউছ বাৰ্লিন</p><h3>বিবাদ নিষ্পত্তি</h3><p>ইউৰোপীয় আয়োগে অনলাইন বিবাদ নিষ্পত্তি (OS)ৰ বাবে এটা মঞ্চ প্ৰদান কৰে, যিটো এই স্থানত পোৱা যাব<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/গ্ৰাহক/odr</a>. গ্ৰাহক সালিসী ব’ৰ্ডৰ আগত বিবাদ নিষ্পত্তিৰ কাৰ্য্যবিধিত অংশগ্ৰহণ কৰিবলৈ আমি বাধ্য নহয় বা ইচ্ছুক নহয়।</p><h3>বিষয়বস্তু আৰু সংযোগসমূহৰ বাবে দায়বদ্ধতা</h3><p>সেৱা প্ৰদানকাৰী হিচাপে, আমি § 7 Abs.1 TMG অনুসৰি সাধাৰণ আইন অনুসৰি এই পৃষ্ঠাসমূহত আমাৰ নিজৰ বিষয়বস্তুৰ বাবে দায়বদ্ধ। কিন্তু, §§ 8ৰ পৰা 10 TMG অনুসৰি, আমি প্ৰেৰণ কৰা বা সংৰক্ষিত তৃতীয় পক্ষৰ তথ্য নিৰীক্ষণ কৰিবলৈ বা অবৈধ কাৰ্যকলাপৰ ইংগিত দিয়া পৰিস্থিতিৰ তদন্ত কৰিবলৈ বাধ্য নহয়। আমাৰ চাইটত বাহ্যিক তৃতীয় পক্ষৰ ৱেবছাইটৰ লিংক থাকিব পাৰে যাৰ বিষয়বস্তুৰ ওপৰত আমাৰ কোনো নিয়ন্ত্ৰণ নাই। গতিকে এই বাহ্যিক বিষয়বস্তুৰ বাবে আমি কোনো ধৰণৰ দায়িত্ব গ্ৰহণ কৰিব নোৱাৰো।</p></>,
    underConstructionBtn: "নিৰ্মাণৰ কাম চলি আছে",
    guestLoginBtn: "অতিথি লগইন",
    underConstructionTitle: "নিৰ্মাণৰ কাম চলি আছে",
    underConstructionDesc1: "এই এপ্লিকেচনটো বৰ্তমান নিৰ্মাণ কৰা হৈছে।",
    underConstructionDesc2: "অসুবিধাৰ বাবে আমি আন্তৰিকতাৰে ক্ষমা বিচাৰিছো। অনুগ্ৰহ কৰি পিছত পুনৰ পৰীক্ষা কৰক।",
    password: "পাছৱৰ্ড",
    loginBtn: "লগইন কৰক",
    incorrectPassword: "ভুল পাছৱৰ্ড",
    showTip: "টিপচ্ দেখুৱাওক",
    hideTip: "টিপ লুকুৱাওক",
    guestTip: "টিপচ্: পাছৱৰ্ড হৈছে hari2",
  },
FR: {
    birthDetails: "Détails de la naissance",
    birthDate: "Date de naissance",
    birthTime: "Heure de naissance",
    birthPlace: "Lieu de naissance",
    timezone: "Fuseau horaire",
    tradData: "Données traditionnelles",
    nakshatra: "Nakshatra",
    paksha: "Paksa",
    tithi: "Tithi",
    lunarMonth: "Mois lunaire",
    searchRange: "Plage de recherche et notes",
    targetYears: "Année(s) cible(s)",
    notes: "Remarques ou questions",
    findBday: "Trouver mon anniversaire dharmique",
    select: "Sélectionner",
    selectTimezone: "Sélectionnez le fuseau horaire",
    footer: "Réalisé avec ❤️ à Berlin par HaBER Software Solutions",
    cookieText: "Nous utilisons des cookies essentiels pour vous garder connecté et enregistrer vos préférences. Nous n'utilisons pas de cookies de suivi.",
    privacyPolicy: "politique de confidentialité",
    gotIt: "J'ai compris",
    legalNotice: "Mentions légales",
    terms: "Conditions générales",
    imprint: "Imprimer",
    appName: "TROUVEZ MON ANNIVERSAIRE DHARMIQUE",
    subtitle1: "Convertisseur Panchang et Tithi de précision",
    subtitle2: "Convertisseur de précision Panchang et Tithi - Évaluation astrologique",
    welcomeTitle: "Bienvenue dans l'assistant Panchang",
    welcomeDesc: "Entrez vos détails de naissance dans le panneau et je calculerai le jour du calendrier dharmique correct, correspondant à Tithi et Nakshatra, pour vous aider à célébrer votre anniversaire traditionnel.",
    mapHint: "Vous pouvez cliquer sur la carte pour affiner votre localisation.",
    login: "Se connecter",
    logout: "Déconnexion",
    history: "Histoire",
    syncHistory: "Connectez-vous pour synchroniser l'historique",
    privacyNoticeTitle: "Avis de confidentialité",
    privacyNoticeDesc: "Vos données astrologiques ne sont traitées que pour cette session et ne seront pas stockées de manière permanente.",
    searchHistory: "Historique de recherche",
    locationPlaceholder: "par ex. New Delhi, Inde",
    tooltipDate: "Utilisé pour calculer le jour précis de votre naissance dans le calendrier grégorien.",
    tooltipTime: "L’heure de naissance est essentielle pour un calcul précis du Tithi et du Nakshatra, car elles changent au cours de la journée.",
    tooltipPlace: "Les phases du lever du soleil et de la lune varient selon le lieu. Entrez le nom de votre ville ou village. Sélectionnez une option ou saisissez directement.",
    tooltipTimezone: "Le fuseau horaire local décalé au moment de votre naissance. Aide à vérifier l’heure universelle exacte.",
    tooltipNakshatra: "L'étoile de naissance ou le manoir lunaire occupé par la Lune à votre naissance.",
    tooltipPaksha: "La quinzaine du mois lunaire. Shukla croît (lumineux), Krishna décroît (sombre).",
    tooltipTithi: "Le jour lunaire. Crucial pour célébrer les anniversaires dharmiques traditionnels.",
    tooltipMonth: "Le mois lunaire au cours duquel vous êtes né (par exemple, Chaitra, Vaishakha).",
    tooltipTargetYear: "Spécifiez l'année ou la plage d'années pour laquelle vous souhaitez trouver votre date d'anniversaire traditionnelle.",
    tooltipNotes: "Spécifiez des méthodes de calcul spéciales (comme Amanta ou Purnimanta) ou ajoutez du contexte à votre demande.",
    calculating: "Calculateur...",
    calculatingPanchang: "CALCUL DES ALIGNEMENTS DE PANCHANG...",
    targetYearPlaceholder: "par ex. 2026 ou 2025-2030",
    notesPlaceholder: "Tradition spécifique (par exemple Amanta) ou questions ?",
    slideTitle0: "Célébrez votre véritable arrivée cosmique",
    slideDesc0: "Découvrez votre anniversaire Dharmique exact basé sur l'astrologie védique précise.",
    slideTitle1: "La sagesse des anciens",
    slideDesc1: "Nos modèles de haute précision utilisent les anciens calculs de Panchang.",
    slideTitle2: "Une célébration céleste",
    slideDesc2: "Alignez votre journée spéciale avec les rythmes cosmiques authentiques.",
    slideTitle3: "Mandalas astrologiques sacrés",
    slideDesc3: "Connectez-vous profondément aux modèles énergétiques de l’univers.",
    slideTitle4: "Votre thème de naissance védique",
    slideDesc4: "Découvrez les mystères du véritable voyage de votre vie.",
    slideTitle5: "Joyeuses fêtes de lumière",
    slideDesc5: "Embrassez l’énergie spirituelle des célébrations traditionnelles.",
    slideTitle6: "Pujas du feu sacré",
    slideDesc6: "Harmonisez-vous avec le divin grâce à d'anciens rituels du feu.",
    slideTitle7: "Le voyage lunaire mystique",
    slideDesc7: "Suivez le transit de la lune à travers les Nakshatras sacrés.",
    slideTitle8: "Om cosmique et lotus",
    slideDesc8: "Éveillez la paix intérieure et la sagesse spirituelle intérieure.",
    slideTitle9: "Le Panchang traditionnel",
    slideDesc9: "Découvrez les rythmes intemporels du calendrier hindou.",
    slideTitle10: "La joie extatique du Kirtan",
    slideDesc10: "Découvrez le pur bonheur du chant en congrégation.",
    slideTitle11: "Célébrations d'Aarti",
    slideDesc11: "Illuminez votre chemin avec l'aarti familial traditionnel.",
    slideTitle12: "Sérénité spirituelle",
    slideDesc12: "Trouvez la paix intérieure dans l'atmosphère sacrée du temple.",
    slideTitle13: "Yajna du feu védique",
    slideDesc13: "Recevez des bénédictions divines à travers d’anciennes cérémonies du feu.",
    slideTitle14: "Le Saint-Japa",
    slideDesc14: "Chantez les saints noms et éveillez votre conscience spirituelle.",
    testiText0: "Depuis que j'ai commencé à célébrer mon anniversaire selon le calendrier Dharmique, j'ai remarqué un profond changement dans mon énergie. J'ai l'impression que l'univers s'aligne sur moi ! Cela a apporté une chance et une paix incroyables à mon année.",
    testiAuthor0: "Rajesh K.",
    testiText1: "Je faisais toujours la fête à la mauvaise date ! Le calendrier grégorien n’est qu’un nombre, mais l’alignement Tithi et Nakshatra apporte de véritables bénédictions cosmiques. Célébrer mon véritable anniversaire Dharmique a ouvert des portes que je n'aurais jamais imaginées.",
    testiAuthor1: "Priya S.",
    testiText2: "Cette application m'a aidé à trouver mon anniversaire authentique. La toute première année où j'ai célébré mon anniversaire Dharmique, j'ai obtenu une promotion tant attendue. C'est plus qu'un simple rendez-vous ; c'est une réinitialisation spirituelle.",
    testiAuthor2: "Amit P.",
    testiText3: "J'ai enfin trouvé mon vrai anniversaire ! Le calendrier grégorien semblait déconnecté, mais cette date dharmique me rapproche de mes racines. Célébrer avec une puja a rendu cette année si spéciale.",
    testiAuthor3: "Sneha M.",
    testiText4: "Une si belle façon de renouer avec nos traditions. Ma famille célèbre maintenant les deux dates, mais l’anniversaire Dharmique semble bien plus épanouissant spirituellement.",
    testiAuthor4: "Vikram R.",
    testiText5: "J'étais sceptique au début, mais la précision des calculs de Nakshatra et Tithi est incroyable. Trouver mon anniversaire cosmique a été une expérience vraiment révélatrice.",
    testiAuthor5: "Aditi V.",
    testiText6: "Cet outil est une bénédiction ! J'essaie de déterminer mon authentique anniversaire hindou depuis des années. La célébration était profondément personnelle et bénie par le divin.",
    testiAuthor6: "Karan D.",
    testiText7: "En tant que dévot d'ISKCON, connaître exactement mon anniversaire Dharmique basé sur Tithi me permet d'aligner parfaitement mes pratiques spirituelles. Un incontournable pour tout chercheur spirituel.",
    testiAuthor7: "Anjali G.",
    testiText8: "Nos grands-parents suivaient toujours les Panchang, mais nous avons perdu le contact. Cette application a ramené cette belle tradition dans notre famille. La joie d'un anniversaire Dharmique est inégalée.",
    testiAuthor8: "Rohit S.",
    testiText9: "Expérience incroyable! Les calculs sont précis et célébrer sur mon Tithi était incroyablement de bon augure. L’énergie ce jour-là était tout simplement merveilleuse.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "Le défi : dates solaires statiques et rythmes cosmiques dynamiques",
    heroProblemDesc: <><p>Lorsque vous utilisez le calendrier grégorien (anglais) standard, votre anniversaire est lié en permanence à une date solaire statique. Cependant, le véritable alignement cosmique des étoiles et des planètes – la configuration céleste exacte présente au moment de votre naissance – change radicalement d’année en année. C'est la raison même pour laquelle d'anciennes fêtes telles que Diwali, Navratri et Ganesh Chaturthi sont célébrées à des dates solaires différentes chaque année.</p><p>En suivant une date solaire fixe, vous passez à côté de la profonde signification spirituelle de votre véritable retour astrologique. Le calendrier dharmique traditionnel honore la danse dynamique entre la Lune et le cosmos, offrant une connexion profondément authentique avec vos véritables origines célestes.</p></>,
    heroSolutionTitle: "La solution : des alignements dharmiques de précision",
    heroSolutionDesc: <><p>Notre calculateur d'anniversaire dharmique de niveau entreprise exploite des algorithmes astronomiques de haute précision et des données rigoureuses d'éphémérides planétaires pour calculer le nombre exact d'anniversaires dharmiques.<b>Jour lunaire (Tithi)</b>et<b>Étoile de naissance (Nakshatra)</b>de votre incarnation. En suivant avec précision ces rythmes célestes changeants, nous identifions mathématiquement la date authentique et traditionnelle pour célébrer votre naissance chaque année.</p><p>Cet outil est méticuleusement conçu pour s'adapter à votre longitude, latitude et fuseau horaire exacts, garantissant que les calculs planétaires reflètent le véritable état cosmique au-dessus de votre lieu de naissance spécifique.</p></>,
    heroWhoTitle: "À qui profite ce système ?",
    heroWhoDesc: <><p>Cette application est méticuleusement conçue pour les chercheurs spirituels, les fervents adeptes des traditions dharmiques et les individus qui s'efforcent de renouer avec les rythmes universels qui ont guidé leur arrivée dans ce monde. C'est l'outil de base idéal pour planifier des célébrations traditionnelles authentiques, programmer des Pujas de bon augure ou consacrer du temps à une réflexion personnelle approfondie.</p></>,
    heroWhyTitle: "Pourquoi notre méthodologie est supérieure",
    heroWhyDesc: <><p>Conçue à l'aide d'une astrologie informatique avancée, cette plate-forme croise votre heure exacte et vos coordonnées géographiques de naissance avec des milliers d'années de science astronomique védique établie. Notre approche mathématique rigoureuse offre une précision inégalée de niveau professionnel pour déterminer le jour le plus spirituel de votre année.</p></>,
    heroDisclaimerTitle: "Avis de non-responsabilité juridique et de responsabilité important",
    heroDisclaimerDesc: <><p>Les informations, calculs, dates et autres contenus fournis par cette application sont destinés<strong>strictement à des fins spirituelles, éducatives et de divertissement.</strong>Les créateurs, propriétaires et opérateurs de cette application fournissent<strong>aucune garantie, expresse ou implicite, concernant l'exactitude, l'exhaustivité ou la fiabilité</strong>des calculs astrologiques ou de toute autre information contenue dans le présent document.</p><p>Cette application<strong>n’offre pas et ne doit pas être interprété comme fournissant des conseils professionnels, médicaux, psychologiques, financiers ou juridiques.</strong></p><p>En utilisant ce service, vous acceptez explicitement que les créateurs, propriétaires et opérateurs<strong>n'assume aucune responsabilité pour les décisions prises, les actions prises ou les conséquences encourues</strong>en fonction des dates, des calculs ou des informations fournies. Vous acceptez également que toute confiance que vous accordez à ces informations est strictement<strong>à vos propres risques.</strong></p><p>Les créateurs, propriétaires et opérateurs de cette application sont<strong>totalement dégagé de toute responsabilité</strong>en cas de<strong>toute réclamation légale, dommage, responsabilité ou litige</strong>découlant de l'utilisation de ce logiciel ou service. Vous acceptez qu'aucune responsabilité légale ne leur sera imposée.</p></>,
    followupPlaceholder: "Posez une question complémentaire...",
    termsContent: <><h3>1. Acceptation des conditions</h3><p>En accédant et en utilisant l'application « Find My Dharmic Birthday » (« l'Application ») exploitée par HaBER Software Solutions (« nous », « notre » ou « notre »), vous (« l'utilisateur ») reconnaissez que vous avez lu, compris et accepté d'être légalement lié par les présentes conditions générales. Si vous n'acceptez pas ces conditions, vous devez immédiatement cesser toute utilisation de l'Application.</p><h3>2. Nature du service et aucun conseil professionnel</h3><p>L'application génère des dates, des informations et des calculs astronomiques<strong>exclusivement à des fins spirituelles, éducatives et de divertissement.</strong>Nous ne fournissons pas, et aucun contenu ne doit être interprété comme, des conseils médicaux, psychologiques, financiers, juridiques ou autres conseils professionnels. Toute confiance accordée aux informations fournies est aux seuls risques de l'utilisateur.</p><h3>3. Limitation absolue de responsabilité et d’indemnisation</h3><p>Dans la mesure permise par la loi applicable, HaBER Software Solutions, ses créateurs, propriétaires, dirigeants et sociétés affiliées doivent<strong>en aucun cas être tenu responsable des dommages, pertes ou dépenses directs, indirects, accessoires, consécutifs, spéciaux ou exemplaires</strong>découlant de ou en relation avec l’utilisation ou l’incapacité d’utiliser cette application. L'utilisateur renonce expressément à tout droit de poursuivre, de faire des réclamations ou de nous tenir responsables de tout résultat, décision ou action prise sur la base du contenu de l'application. L'utilisateur s'engage à indemniser, défendre et dégager HaBER Software Solutions de toute responsabilité contre toute réclamation de tiers découlant de son utilisation de l'application.</p><h3>4. Aucune garantie ou garantie</h3><p>L'Application est fournie « EN L'ÉTAT » et « SELON LA DISPONIBILITÉ », sans aucune garantie d'aucune sorte, expresse ou implicite, y compris, mais sans s'y limiter, les garanties implicites de qualité marchande, d'adéquation à un usage particulier ou de non-contrefaçon. Nous ne garantissons pas que l'Application sera ininterrompue, opportune, sécurisée, sans erreur ou mathématiquement impeccable.</p><h3>5. Droits de propriété intellectuelle</h3><p>Tous les codes logiciels, générateurs mathématiques, algorithmes, interfaces utilisateur, marques et textes contenus dans l'application sont la propriété intellectuelle exclusive de HaBER Software Solutions. Aucun droit ni licence n'est accordé à l'Utilisateur, à l'exception du droit limité et non exclusif d'utiliser l'Application comme prévu.</p><h3>6. Loi applicable et compétence exclusive</h3><p>Les présentes conditions sont régies et interprétées conformément aux lois de la République fédérale d'Allemagne. Tout litige, réclamation ou procédure découlant de ou lié à ces Conditions ou à l'utilisation de l'Application sera porté exclusivement devant les tribunaux compétents de Berlin, en Allemagne.</p></>,
    privacyContent: <><h3>1. Introduction et portée</h3><p>Nous prenons votre vie privée au sérieux. Cette politique de confidentialité détaille comment HaBER Software Solutions (« nous », « notre ») collecte, utilise, traite et protège vos données personnelles lorsque vous utilisez l'application « Find My Dharmic Birthday ». Cette politique est conforme aux normes strictes du Règlement Général sur la Protection des Données (RGPD).</p><h3>2. Modalités de collecte et de traitement des données</h3><p><strong>Utilisateurs invités :</strong>Lorsque vous utilisez l'Application sans compte, vos données de naissance (date, heure et lieu) sont traitées de manière éphémère au sein du navigateur pour générer des calculs. Nous ne transmettons ni ne stockons ces données hautement personnelles sur nos serveurs backend.</p><p><strong>Utilisateurs enregistrés :</strong>Si vous choisissez de créer un compte pour enregistrer des profils, nous collectons et stockons en toute sécurité vos informations d'authentification (telles que l'adresse e-mail) et les profils de données de naissance que vous choisissez explicitement d'enregistrer. Ces données sont stockées en toute sécurité dans Google Firebase.</p><h3>3. Finalité du traitement</h3><p>Nous traitons vos données exclusivement dans le but de fournir les fonctionnalités de base de l'application, d'authentifier votre identité, de sécuriser votre compte et de conserver vos profils enregistrés au fil des sessions. Nous<strong>ne vendez pas, ne louez pas et ne monétisez pas vos données personnelles</strong>à des courtiers de données ou à des annonceurs tiers en aucune circonstance.</p><h3>4. Infrastructure tierce</h3><p>Pour garantir une haute disponibilité et une sécurité robuste, nous utilisons Google Cloud Platform et Firebase (exploité par Google) comme fournisseurs d'infrastructure. Ces entités traitent vos données strictement en tant que sous-traitants dans le cadre d'accords de traitement de données (DPA) juridiquement contraignants, conformément au RGPD. Nous pouvons utiliser des cookies essentiels strictement nécessaires au maintien de votre session de connexion et à la sécurisation de l'application.</p><h3>5. Vos droits en matière de protection des données</h3><p>En vertu du RGPD, vous disposez de droits complets concernant vos données. Vous avez le droit de demander l'accès aux données que nous détenons à votre sujet, le droit d'exiger la rectification des inexactitudes, le droit à la portabilité des données et le<strong>"droit à l'oubli" (suppression complète de vos données)</strong>. Pour exercer l'un de ces droits, vous pouvez gérer vos données dans les paramètres de votre compte ou nous contacter directement.</p><h3>6. Mesures de sécurité</h3><p>Nous utilisons des mesures de sécurité techniques et organisationnelles de niveau entreprise pour protéger vos données contre tout accès non autorisé, perte ou altération, y compris le chiffrement en transit (HTTPS/TLS) et au repos.</p></>,
    imprintContent: <><h3>Informations requises selon le § 5 TMG (Telemediengesetz)</h3><p><strong>Fournisseur et Opérateur :</strong><br/>Solutions logicielles HaBER<br/>par HaBER Axis<br/>Hari à Berlin<br/>Westend<br/>14059 Berlin<br/>République fédérale d'Allemagne</p><h3>Coordonnées</h3><p>Téléphone : +49 (0) 157 3930 XXXX<br/>E-mail : info@habersoftware.example.com</p><h3>Représentation Juridique et Commerciale</h3><p>Représentant autorisé : Hari aus Berlin</p><h3>Résolution des litiges</h3><p>La Commission européenne propose une plateforme de résolution des litiges en ligne (OS), disponible à l'adresse suivante :<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. Nous ne sommes ni obligés ni disposés à participer à une procédure de règlement des litiges devant un conseil d'arbitrage des consommateurs.</p><h3>Responsabilité du contenu et des liens</h3><p>En tant que prestataire de services, nous sommes responsables de nos propres contenus sur ces pages conformément aux lois générales conformément au § 7 Abs.1 TMG. Toutefois, conformément aux §§ 8 à 10 TMG, nous ne sommes pas tenus de surveiller les informations de tiers transmises ou stockées ni d'enquêter sur les circonstances indiquant une activité illégale. Notre site peut contenir des liens vers des sites Internet de tiers externes sur le contenu desquels nous n'avons aucun contrôle. Par conséquent, nous ne pouvons accepter aucune responsabilité pour ce contenu externe.</p></>,
    underConstructionBtn: "En cours de construction",
    guestLoginBtn: "Connexion invité",
    underConstructionTitle: "En cours de construction",
    underConstructionDesc1: "Cette application est actuellement en cours de construction.",
    underConstructionDesc2: "Nous nous excusons sincèrement pour la gêne occasionnée. Veuillez revenir plus tard.",
    password: "Mot de passe",
    loginBtn: "Se connecter",
    incorrectPassword: "Mot de passe incorrect",
    showTip: "Afficher le conseil",
    hideTip: "Masquer le conseil",
    guestTip: "Astuce : le mot de passe est hari2",
  },
IT: {
    birthDetails: "Dettagli di nascita",
    birthDate: "Data di nascita",
    birthTime: "Ora di nascita",
    birthPlace: "Luogo di nascita",
    timezone: "Fuso orario",
    tradData: "Dati tradizionali",
    nakshatra: "Nakshatra",
    paksha: "Paksha",
    tithi: "Tithi",
    lunarMonth: "Mese lunare",
    searchRange: "Intervallo di ricerca e note",
    targetYears: "Anno/i target",
    notes: "Note o domande",
    findBday: "Trova il mio compleanno dharmico",
    select: "Selezionare",
    selectTimezone: "Seleziona Fuso orario",
    footer: "Realizzato con ❤️ a Berlino da HaBER Software Solutions",
    cookieText: "Utilizziamo cookie essenziali per mantenerti connesso e salvare le tue preferenze. Non utilizziamo cookie di tracciamento.",
    privacyPolicy: "politica sulla riservatezza",
    gotIt: "Fatto",
    legalNotice: "Avviso legale",
    terms: "Termini e condizioni",
    imprint: "Impronta",
    appName: "TROVA IL MIO COMPLEANNO DHARMICO",
    subtitle1: "Convertitore di precisione Panchang e Tithi",
    subtitle2: "Convertitore di precisione Panchang e Tithi - Valutazione astrologica",
    welcomeTitle: "Benvenuti nell'Assistente Panchang",
    welcomeDesc: "Inserisci i tuoi dettagli di nascita nel pannello e calcolerò il giorno del calendario dharmico corretto, abbinando Tithi e Nakshatra, per aiutarti a celebrare il tuo compleanno tradizionale.",
    mapHint: "Puoi fare clic sulla mappa per ottimizzare la tua posizione.",
    login: "Login",
    logout: "Esci",
    history: "Storia",
    syncHistory: "Accedi per sincronizzare la cronologia",
    privacyNoticeTitle: "Informativa sulla privacy",
    privacyNoticeDesc: "I tuoi dati astrologici verranno elaborati solo per questa sessione e non verranno archiviati in modo permanente.",
    searchHistory: "Cronologia delle ricerche",
    locationPlaceholder: "per esempio. Nuova Delhi, India",
    tooltipDate: "Utilizzato per calcolare il giorno preciso della tua nascita nel calendario gregoriano.",
    tooltipTime: "L'ora di nascita è fondamentale per il calcolo accurato di Tithi e Nakshatra, poiché cambiano durante il giorno.",
    tooltipPlace: "Le fasi dell'alba e della luna variano in base alla località. Inserisci il nome della tua città o paese. Seleziona un'opzione o digita direttamente.",
    tooltipTimezone: "La differenza del fuso orario locale al momento della tua nascita. Aiuta a verificare l'esatta ora universale.",
    tooltipNakshatra: "La stella natale o la dimora lunare occupata dalla Luna alla tua nascita.",
    tooltipPaksha: "La quindicina del mese lunare. Shukla sta crescendo (luminoso), Krishna sta calando (oscuro).",
    tooltipTithi: "Il giorno lunare. Fondamentale per celebrare i tradizionali compleanni dharmici.",
    tooltipMonth: "Il mese lunare in cui sei nato (ad esempio Chaitra, Vaishakha).",
    tooltipTargetYear: "Specifica l'anno o l'intervallo di anni per il quale desideri trovare la data del tuo compleanno tradizionale.",
    tooltipNotes: "Specifica metodi di calcolo speciali (come Amanta o Purnimanta) o aggiungi contesto alla tua richiesta.",
    calculating: "Calcolo...",
    calculatingPanchang: "CALCOLO DEGLI ALLINEAMENTI PANCHANG...",
    targetYearPlaceholder: "per esempio. 2026 o 2025-2030",
    notesPlaceholder: "Tradizione specifica (ad esempio Amanta) o domande?",
    slideTitle0: "Festeggia il tuo vero arrivo cosmico",
    slideDesc0: "Scopri il tuo esatto compleanno dharmico basato sulla precisa astrologia vedica.",
    slideTitle1: "La saggezza degli antichi",
    slideDesc1: "I nostri modelli ad alta precisione utilizzano antichi calcoli Panchang.",
    slideTitle2: "Una celebrazione celeste",
    slideDesc2: "Allinea il tuo giorno speciale con gli autentici ritmi cosmici.",
    slideTitle3: "Mandala astrologici sacri",
    slideDesc3: "Connettiti profondamente con i modelli energetici dell'universo.",
    slideTitle4: "Il tuo tema natale vedico",
    slideDesc4: "Svela i misteri del vero viaggio della tua vita.",
    slideTitle5: "Gioiose feste di luce",
    slideDesc5: "Abbraccia l'energia spirituale delle celebrazioni tradizionali.",
    slideTitle6: "Puja del fuoco sacro",
    slideDesc6: "Armonizzarsi con il divino attraverso antichi rituali del fuoco.",
    slideTitle7: "Il mistico viaggio lunare",
    slideDesc7: "Segui il transito della luna attraverso le sacre Nakshatra.",
    slideTitle8: "Om cosmico e loto",
    slideDesc8: "Risveglia la pace interiore e la saggezza spirituale interiore.",
    slideTitle9: "Il Panchang tradizionale",
    slideDesc9: "Scopri i ritmi senza tempo del calendario indù.",
    slideTitle10: "Estatica gioia del Kirtan",
    slideDesc10: "Sperimenta la pura beatitudine del canto congregazionale.",
    slideTitle11: "Celebrazioni dell'Aarti",
    slideDesc11: "Illumina il tuo percorso con il tradizionale aarti familiare.",
    slideTitle12: "Serenità spirituale",
    slideDesc12: "Trova la pace interiore nell'atmosfera sacra del tempio.",
    slideTitle13: "Yajna del fuoco vedico",
    slideDesc13: "Ricevi benedizioni divine attraverso antiche cerimonie del fuoco.",
    slideTitle14: "Il Santo Japa",
    slideDesc14: "Canta i santi nomi e risveglia la tua coscienza spirituale.",
    testiText0: "Da quando ho iniziato a festeggiare il mio compleanno secondo il calendario dharmico, ho notato un profondo cambiamento nella mia energia. Sembra che l'universo si stia allineando con me! Ha portato incredibile fortuna e pace al mio anno.",
    testiAuthor0: "Rajesh K.",
    testiText1: "Festeggiavo sempre nella data sbagliata! Il calendario gregoriano è solo un numero, ma l’allineamento di Tithi e Nakshatra porta vere benedizioni cosmiche. Festeggiare il mio vero compleanno Dharmico ha aperto porte che non avrei mai immaginato.",
    testiAuthor1: "Priya S.",
    testiText2: "Questa app mi ha aiutato a trovare il mio compleanno autentico. Il primo anno in cui ho festeggiato il mio compleanno Dharmico, ho ottenuto una promozione tanto attesa. È più di un semplice appuntamento; è un reset spirituale.",
    testiAuthor2: "Amit P.",
    testiText3: "Finalmente ho trovato il mio vero compleanno! Il calendario gregoriano sembrava sconnesso, ma questa data dharmica mi avvicina alle mie radici. Festeggiare con una puja ha reso quest'anno così speciale.",
    testiAuthor3: "Sneha M.",
    testiText4: "Un modo così bello per riconnetterci con le nostre tradizioni. La mia famiglia ora celebra entrambe le date, ma il compleanno dharmico sembra molto più appagante dal punto di vista spirituale.",
    testiAuthor4: "Vikram R.",
    testiText5: "All'inizio ero scettico, ma la precisione dei calcoli di Nakshatra e Tithi è incredibile. Scoprire il mio compleanno cosmico è stata un’esperienza davvero illuminante.",
    testiAuthor5: "Aditi V.",
    testiText6: "Questo strumento è una benedizione! Sono anni che cerco di capire il mio autentico compleanno indù. La celebrazione è stata profondamente personale e benedetta dal divino.",
    testiAuthor6: "Karan D.",
    testiText7: "Come devoto ISKCON, conoscere il mio esatto compleanno Dharmico basato su Tithi mi permette di allineare perfettamente le mie pratiche spirituali. Un must per ogni ricercatore spirituale.",
    testiAuthor7: "Anjali G.",
    testiText8: "I nostri nonni seguivano sempre i Panchang, ma abbiamo perso i contatti. Questa app ha riportato quella bellissima tradizione nella nostra famiglia. La gioia di un compleanno Dharmico non ha eguali.",
    testiAuthor8: "Rohit S.",
    testiText9: "Esperienza straordinaria! I calcoli sono precisi e festeggiare sul mio Tithi mi è sembrato incredibilmente propizio. L’energia di quel giorno era semplicemente meravigliosa.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "La sfida: date solari statiche contro ritmi cosmici dinamici",
    heroProblemDesc: <><p>Quando fai affidamento sul calendario gregoriano (inglese) standard, il tuo compleanno è permanentemente legato a una data solare statica. Tuttavia, il vero allineamento cosmico di stelle e pianeti – l’esatta configurazione celeste presente nel momento in cui sei nato – cambia radicalmente di anno in anno. Questo è proprio il motivo per cui le antiche feste come Diwali, Navratri e Ganesh Chaturthi vengono celebrate ogni anno in date solari diverse.</p><p>Seguendo una data solare fissa, perdi il profondo significato spirituale del tuo effettivo ritorno astrologico. Il tradizionale calendario dharmico onora la danza dinamica tra la Luna e il cosmo, offrendo una connessione profondamente autentica con le tue vere origini celesti.</p></>,
    heroSolutionTitle: "La soluzione: allineamenti dharmici di precisione",
    heroSolutionDesc: <><p>Il nostro calcolatore di compleanno Dharmico di livello aziendale sfrutta algoritmi astronomici ad alta precisione e rigorosi dati sulle effemeridi planetarie per calcolare l'esatto<b>Giorno lunare (Tithi)</b>E<b>Stella della nascita (Nakshatra)</b>della tua incarnazione. Tracciando con precisione questi mutevoli ritmi celesti, individuiamo matematicamente la data autentica e tradizionale per celebrare la tua nascita ogni anno.</p><p>Questo strumento è meticolosamente progettato per adattarsi alla tua esatta longitudine, latitudine e fuso orario, garantendo che i calcoli planetari riflettano il vero stato cosmico sopra il tuo specifico luogo di nascita.</p></>,
    heroWhoTitle: "Chi trae vantaggio da questo sistema?",
    heroWhoDesc: <><p>Questa applicazione è meticolosamente progettata per ricercatori spirituali, devoti seguaci delle tradizioni dharmiche e individui che cercano di riconnettersi con i ritmi universali che hanno guidato il loro arrivo in questo mondo. È lo strumento fondamentale perfetto per pianificare autentiche celebrazioni tradizionali, programmare Puja di buon auspicio o dedicare tempo a una profonda riflessione personale.</p></>,
    heroWhyTitle: "Perché la nostra metodologia è superiore",
    heroWhyDesc: <><p>Progettata utilizzando l'astrologia computazionale avanzata, questa piattaforma confronta l'ora esatta e le coordinate geografiche di nascita con migliaia di anni di consolidata scienza astronomica vedica. Il nostro rigoroso approccio matematico offre una precisione ineguagliabile e di livello professionale per determinare il giorno spiritualmente più significativo dell'anno.</p></>,
    heroDisclaimerTitle: "Importante dichiarazione di non responsabilità legale e di responsabilità",
    heroDisclaimerDesc: <><p>Le informazioni, i calcoli, le date e gli altri contenuti forniti da questa applicazione sono destinati<strong>esclusivamente per scopi spirituali, educativi e di intrattenimento.</strong>I creatori, i proprietari e gli operatori di questa app forniscono<strong>nessuna garanzia, esplicita o implicita, riguardante l'accuratezza, la completezza o l'affidabilità</strong>dei calcoli astrologici o di qualsiasi altra informazione contenuta nel presente documento.</p><p>Questa applicazione<strong>non offre e non deve essere interpretato come fornitura di consulenza professionale, medica, psicologica, finanziaria o legale.</strong></p><p>Utilizzando questo servizio, accetti esplicitamente che i creatori, i proprietari e gli operatori<strong>non si assume alcuna responsabilità per eventuali decisioni prese, azioni intraprese o conseguenze subite</strong>in base alle date, ai calcoli o agli approfondimenti forniti. Accetti inoltre che qualsiasi affidamento che fai su queste informazioni è strettamente<strong>a tuo rischio e pericolo.</strong></p><p>I creatori, i proprietari e gli operatori di questa applicazione sono<strong>completamente liberato da responsabilità</strong>in caso di<strong>qualsiasi pretesa legale, danno, responsabilità o controversia</strong>derivanti dall'uso di questo software o servizio. Accetti che non verrà loro imposta alcuna responsabilità legale.</p></>,
    followupPlaceholder: "Fai una domanda di follow-up...",
    termsContent: <><h3>1. Accettazione dei Termini</h3><p>Accedendo e utilizzando l'applicazione "Trova il mio compleanno Dharmico" ("l'App") gestita da HaBER Software Solutions ("noi", "ci" o "nostro"), tu ("l'Utente") riconosci di aver letto, compreso e accettato di essere legalmente vincolato dai presenti Termini e condizioni. Se non accetti questi termini, devi immediatamente cessare qualsiasi utilizzo dell'App.</p><h3>2. Natura del Servizio e Nessuna Consulenza Professionale</h3><p>L'App genera date, approfondimenti e calcoli astronomici<strong>esclusivamente per scopi spirituali, educativi e di intrattenimento.</strong>Non forniamo, né alcun contenuto deve essere interpretato come consulenza medica, psicologica, finanziaria, legale o di altro tipo. Qualsiasi affidamento sulle informazioni fornite è esclusivamente a rischio e pericolo dell'Utente.</p><h3>3. Limitazione assoluta di responsabilità e indennizzo</h3><p>Nella misura massima consentita dalla legge applicabile, HaBER Software Solutions, i suoi creatori, proprietari, funzionari e affiliati dovranno<strong>in nessun caso sarà ritenuto responsabile per danni, perdite o spese diretti, indiretti, incidentali, consequenziali, speciali o esemplari</strong>derivanti da o in connessione con l'uso o l'impossibilità di utilizzare questa App. L'Utente rinuncia espressamente a qualsiasi diritto di citare in giudizio, avanzare pretese o ritenerci responsabili per eventuali risultati, decisioni o azioni intraprese in base al contenuto dell'App. L'Utente si impegna a indennizzare, difendere e manlevare le Soluzioni Software HaBER da qualsiasi pretesa di terzi derivante dall'utilizzo dell'App.</p><h3>4. Nessuna garanzia o garanzia</h3><p>L'App viene fornita "COSÌ COM'È" e "COME DISPONIBILE", senza garanzie di alcun tipo, esplicite o implicite, incluse ma non limitate a garanzie implicite di commerciabilità, idoneità per uno scopo particolare o non violazione. Non garantiamo in alcun modo che l'App sarà ininterrotta, tempestiva, sicura, priva di errori o matematicamente impeccabile.</p><h3>5. Diritti di proprietà intellettuale</h3><p>Tutto il codice software, i generatori matematici, gli algoritmi, le interfacce utente, i marchi e i testi contenuti nell'App sono proprietà intellettuale esclusiva di HaBER Software Solutions. All'Utente non viene concesso alcun diritto o licenza, ad eccezione del diritto limitato e non esclusivo di utilizzare l'App come previsto.</p><h3>6. Legge applicabile e giurisdizione esclusiva</h3><p>Le presenti Condizioni saranno regolate e interpretate in conformità con le leggi della Repubblica Federale di Germania. Qualsiasi controversia legale, reclamo o procedimento derivante da o correlato ai presenti Termini o all'utilizzo dell'App sarà sottoposto esclusivamente ai tribunali competenti di Berlino, Germania.</p></>,
    privacyContent: <><h3>1. Introduzione e ambito</h3><p>Prendiamo sul serio la tua privacy. La presente Informativa sulla privacy descrive in dettaglio come HaBER Software Solutions ("noi") raccoglie, utilizza, elabora e protegge i tuoi dati personali quando utilizzi l'applicazione "Trova il mio compleanno Dharmic". Questa politica è conforme ai severi standard del Regolamento generale sulla protezione dei dati (GDPR).</p><h3>2. Modalità di raccolta e trattamento dei dati</h3><p><strong>Utenti ospiti:</strong>Quando utilizzi l'App senza un account, i tuoi dati di nascita (data, ora e posizione) vengono elaborati temporaneamente all'interno del browser per generare calcoli. Non trasmettiamo né memorizziamo questi dati altamente personali sui nostri server backend.</p><p><strong>Utenti registrati:</strong>Se scegli di creare un account per salvare i profili, raccogliamo e archiviamo in modo sicuro le tue credenziali di autenticazione (come l'indirizzo email) e i profili dei dati di nascita che scegli esplicitamente di salvare. Questi dati sono archiviati in modo sicuro in Google Firebase.</p><h3>3. Finalità del trattamento</h3><p>Elaboriamo i tuoi dati esclusivamente allo scopo di fornire le funzionalità principali dell'App, autenticare la tua identità, proteggere il tuo account e mantenere i tuoi profili salvati tra le sessioni. Noi<strong>non vendere, affittare o monetizzare i tuoi dati personali</strong>a intermediari di dati o inserzionisti di terze parti in qualsiasi circostanza.</p><h3>4. Infrastruttura di terze parti</h3><p>Per garantire un'elevata disponibilità e una solida sicurezza, utilizziamo Google Cloud Platform e Firebase (gestito da Google) come fornitori di infrastruttura. Queste entità trattano i tuoi dati rigorosamente come responsabili del trattamento dei dati ai sensi di accordi di elaborazione dei dati (DPA) giuridicamente vincolanti in conformità con il GDPR. Potremmo utilizzare cookie essenziali che sono strettamente necessari per mantenere la sessione di accesso e proteggere l'applicazione.</p><h3>5. I tuoi diritti in materia di protezione dei dati</h3><p>Ai sensi del GDPR, possiedi diritti completi riguardo ai tuoi dati. Hai il diritto di richiedere l'accesso ai dati che conserviamo su di te, il diritto di richiedere la rettifica delle inesattezze, il diritto alla portabilità dei dati e il diritto<strong>“diritto all’oblio” (cancellazione completa dei tuoi dati)</strong>. Per esercitare uno di questi diritti, puoi gestire i tuoi dati nelle impostazioni del tuo account o contattarci direttamente.</p><h3>6. Misure di sicurezza</h3><p>Utilizziamo misure di sicurezza tecniche e organizzative di livello aziendale per proteggere i tuoi dati da accessi non autorizzati, perdite o alterazioni, inclusa la crittografia in transito (HTTPS/TLS) e a riposo.</p></>,
    imprintContent: <><h3>Informazioni richieste ai sensi del § 5 TMG (Telemediengesetz)</h3><p><strong>Fornitore e Operatore:</strong><br/>Soluzioni software HaBER<br/>di HaBER Axis<br/>Hari da Berlino<br/>Westend<br/>14059 Berlino<br/>Repubblica federale di Germania</p><h3>Informazioni sui contatti</h3><p>Telefono: +49 (0) 157 3930 XXXX<br/>E-mail: info@habersoftware.example.com</p><h3>Rappresentanza legale e commerciale</h3><p>Rappresentante autorizzato: Hari aus Berlin</p><h3>Risoluzione delle controversie</h3><p>La Commissione Europea fornisce una piattaforma per la risoluzione delle controversie online (OS), che può essere trovata all'indirizzo<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. Non siamo né obbligati né disposti a partecipare a procedure di risoluzione delle controversie dinanzi a un collegio arbitrale dei consumatori.</p><h3>Responsabilità per contenuti e collegamenti</h3><p>In qualità di fornitore di servizi siamo responsabili dei nostri contenuti su queste pagine in conformità con le leggi generali ai sensi del § 7 Abs.1 TMG. Tuttavia, ai sensi dei §§ da 8 a 10 TMG, non siamo obbligati a monitorare le informazioni di terzi trasmesse o memorizzate o a indagare su circostanze che indicano attività illegali. Il nostro sito può contenere collegamenti a siti Web esterni di terzi sul cui contenuto non abbiamo alcun controllo. Pertanto non possiamo assumerci alcuna responsabilità per questi contenuti esterni.</p></>,
    underConstructionBtn: "In costruzione",
    guestLoginBtn: "Accesso ospite",
    underConstructionTitle: "In costruzione",
    underConstructionDesc1: "Questa applicazione è attualmente in fase di creazione.",
    underConstructionDesc2: "Ci scusiamo sinceramente per l'inconveniente. Ricontrolla più tardi.",
    password: "Password",
    loginBtn: "Login",
    incorrectPassword: "Password errata",
    showTip: "Mostra suggerimento",
    hideTip: "Nascondi suggerimento",
    guestTip: "Suggerimento: la password è hari2",
  },
ES: {
    birthDetails: "Detalles de nacimiento",
    birthDate: "Fecha de nacimiento",
    birthTime: "hora de nacimiento",
    birthPlace: "Lugar de nacimiento",
    timezone: "Zona horaria",
    tradData: "Datos tradicionales",
    nakshatra: "Nakshatra",
    paksha: "Paksha",
    tithi: "tithi",
    lunarMonth: "Mes Lunar",
    searchRange: "Rango de búsqueda y notas",
    targetYears: "Año(s) objetivo",
    notes: "Notas o preguntas",
    findBday: "Encuentra mi cumpleaños dhármico",
    select: "Seleccionar",
    selectTimezone: "Seleccionar zona horaria",
    footer: "Hecho con ❤️ en Berlín por HaBER Software Solutions",
    cookieText: "Utilizamos cookies esenciales para mantener su sesión iniciada y guardar sus preferencias. No utilizamos cookies de seguimiento.",
    privacyPolicy: "política de privacidad",
    gotIt: "Entiendo",
    legalNotice: "Aviso Legal",
    terms: "Términos y condiciones",
    imprint: "Imprimir",
    appName: "ENCUENTRA MI CUMPLEAÑOS DHARMICO",
    subtitle1: "Convertidor de precisión Panchang y Tithi",
    subtitle2: "Convertidor de precisión Panchang y Tithi - Evaluación astrológica",
    welcomeTitle: "Bienvenido al Asistente de Panchang",
    welcomeDesc: "Ingresa los datos de tu nacimiento en el panel y calcularé el día del calendario dhármico correcto, que coincida con Tithi y Nakshatra, para ayudarte a celebrar tu cumpleaños tradicional.",
    mapHint: "Puede hacer clic en el mapa para ajustar su ubicación.",
    login: "Acceso",
    logout: "Cerrar sesión",
    history: "Historia",
    syncHistory: "Inicie sesión para sincronizar el historial",
    privacyNoticeTitle: "Aviso de privacidad",
    privacyNoticeDesc: "Tus datos astrológicos sólo se procesan para esta sesión y no se almacenarán de forma permanente.",
    searchHistory: "Historial de búsqueda",
    locationPlaceholder: "p.ej. Nueva Delhi, India",
    tooltipDate: "Se utiliza para calcular el día preciso de su nacimiento en el calendario gregoriano.",
    tooltipTime: "La hora de nacimiento es fundamental para un cálculo preciso de Tithi y Nakshatra, ya que cambian a lo largo del día.",
    tooltipPlace: "Las fases del amanecer y la luna varían según la ubicación. Ingrese el nombre de su ciudad o pueblo. Seleccione una opción o escriba directamente.",
    tooltipTimezone: "La zona horaria local compensada en el momento de su nacimiento. Ayuda a verificar la hora universal exacta.",
    tooltipNakshatra: "La estrella de nacimiento o mansión lunar ocupada por la Luna en tu nacimiento.",
    tooltipPaksha: "La quincena del mes lunar. Shukla está creciendo (brillante), Krishna está menguando (oscuro).",
    tooltipTithi: "El día lunar. Crucial para celebrar los cumpleaños tradicionales dhármicos.",
    tooltipMonth: "El mes lunar en el que naciste (por ejemplo, Chaitra, Vaishakha).",
    tooltipTargetYear: "Especifique el año o rango de años para el cual desea encontrar su fecha de cumpleaños tradicional.",
    tooltipNotes: "Especifique métodos de cálculo especiales (como Amanta o Purnimanta) o agregue contexto a su consulta.",
    calculating: "Calculador...",
    calculatingPanchang: "CÁLCULO DE ALINEACIONES DE PANCHANG...",
    targetYearPlaceholder: "p.ej. 2026 o 2025-2030",
    notesPlaceholder: "¿Tradición específica (por ejemplo, Amanta) o preguntas?",
    slideTitle0: "Celebre su verdadera llegada cósmica",
    slideDesc0: "Descubra su cumpleaños dhármico exacto según la astrología védica precisa.",
    slideTitle1: "La sabiduría de los antiguos",
    slideDesc1: "Nuestros modelos de alta precisión utilizan cálculos antiguos de Panchang.",
    slideTitle2: "Una celebración celestial",
    slideDesc2: "Alinea tu día especial con los auténticos ritmos cósmicos.",
    slideTitle3: "Mandalas Astrológicas Sagradas",
    slideDesc3: "Conéctate profundamente con los patrones energéticos del universo.",
    slideTitle4: "Tu carta natal védica",
    slideDesc4: "Desbloquea los misterios del verdadero viaje de tu vida.",
    slideTitle5: "Fiestas alegres de la luz",
    slideDesc5: "Abrace la energía espiritual de las celebraciones tradicionales.",
    slideTitle6: "Pujas del Fuego Sagrado",
    slideDesc6: "Armoniza con lo divino a través de antiguos rituales de fuego.",
    slideTitle7: "El místico viaje lunar",
    slideDesc7: "Sigue el tránsito de la luna a través de los sagrados Nakshatras.",
    slideTitle8: "Om cósmico y loto",
    slideDesc8: "Despierta la paz interior y la sabiduría espiritual interior.",
    slideTitle9: "El panchang tradicional",
    slideDesc9: "Descubra los ritmos atemporales del calendario hindú.",
    slideTitle10: "Alegría extática de Kirtan",
    slideDesc10: "Experimente la pura dicha del canto congregacional.",
    slideTitle11: "Celebraciones Aarti",
    slideDesc11: "Ilumina tu camino con el tradicional aarti familiar.",
    slideTitle12: "Serenidad espiritual",
    slideDesc12: "Encuentre la paz interior en la atmósfera sagrada del templo.",
    slideTitle13: "Yajña del fuego védico",
    slideDesc13: "Recibe bendiciones divinas a través de antiguas ceremonias de fuego.",
    slideTitle14: "El Santo Japa",
    slideDesc14: "Canten los santos nombres y despierten su conciencia espiritual.",
    testiText0: "Desde que comencé a celebrar mi cumpleaños según el calendario Dhármico, he notado un profundo cambio en mi energía. ¡Se siente como si el universo se estuviera alineando conmigo! Trajo una suerte y una paz increíbles a mi año.",
    testiAuthor0: "Rajesh K.",
    testiText1: "¡Siempre estaba celebrando en la fecha equivocada! El calendario gregoriano es sólo un número, pero la alineación de Tithi y Nakshatra trae verdaderas bendiciones cósmicas. Celebrar mi verdadero cumpleaños dhármico abrió puertas que nunca imaginé.",
    testiAuthor1: "Priya S.",
    testiText2: "Esta aplicación me ayudó a encontrar mi cumpleaños auténtico. El primer año que celebré mi cumpleaños dhármico, obtuve un ascenso muy esperado. Es más que una simple cita; es un reinicio espiritual.",
    testiAuthor2: "amit p.",
    testiText3: "¡Finalmente encontré mi verdadero cumpleaños! El calendario gregoriano me parecía desconectado, pero esta fecha dhármica me acerca a mis raíces. Celebrar con una puja hizo que este año fuera tan especial.",
    testiAuthor3: "Sneha M.",
    testiText4: "Una manera tan hermosa de reconectarnos con nuestras tradiciones. Mi familia ahora celebra ambas fechas, pero el cumpleaños dhármico se siente mucho más satisfactorio espiritualmente.",
    testiAuthor4: "Vikram R.",
    testiText5: "Al principio era escéptico, pero la precisión de los cálculos de Nakshatra y Tithi es increíble. Encontrar mi cumpleaños cósmico fue una experiencia verdaderamente reveladora.",
    testiAuthor5: "Aditi V.",
    testiText6: "¡Esta herramienta es una bendición! Llevo años intentando descubrir cuál es mi auténtico cumpleaños hindú. La celebración se sintió profundamente personal y bendecida por lo divino.",
    testiAuthor6: "Karan D.",
    testiText7: "Como devoto de ISKCON, saber mi cumpleaños dhármico exacto según Tithi me permite alinear mis prácticas espirituales perfectamente. Imprescindible para todo buscador espiritual.",
    testiAuthor7: "Anjali G.",
    testiText8: "Nuestros abuelos siempre siguieron a los Panchang, pero perdimos el contacto. Esta aplicación devolvió esa hermosa tradición a nuestra familia. La alegría de un cumpleaños dhármico no tiene comparación.",
    testiAuthor8: "Rohit S.",
    testiText9: "¡Experiencia increíble! Los cálculos son precisos y celebrar en mi Tithi me pareció increíblemente auspicioso. La energía de ese día fue simplemente maravillosa.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "El desafío: fechas solares estáticas versus ritmos cósmicos dinámicos",
    heroProblemDesc: <><p>Cuando confías en el calendario gregoriano (inglés) estándar, tu cumpleaños está permanentemente ligado a una fecha solar estática. Sin embargo, la verdadera alineación cósmica de estrellas y planetas (la configuración celeste exacta presente en el momento en que naciste) cambia dramáticamente de un año a otro. Esta es la razón por la que festivales antiguos como Diwali, Navratri y Ganesh Chaturthi se celebran en fechas solares diferentes cada año.</p><p>Al seguir una fecha solar fija, se pierde el profundo significado espiritual de su regreso astrológico real. El calendario dhármico tradicional honra la danza dinámica entre la Luna y el cosmos, ofreciendo una conexión profundamente auténtica con tus verdaderos orígenes celestiales.</p></>,
    heroSolutionTitle: "La solución: alineaciones dhármicas de precisión",
    heroSolutionDesc: <><p>Nuestra calculadora de cumpleaños dhármicos de nivel empresarial aprovecha algoritmos astronómicos de alta precisión y datos rigurosos de efemérides planetarias para calcular la fecha exacta.<b>Día Lunar (Tithi)</b>y<b>Estrella de nacimiento (Nakshatra)</b>de tu encarnación. Al seguir con precisión estos cambiantes ritmos celestiales, identificamos matemáticamente la fecha auténtica y tradicional para celebrar tu nacimiento cada año.</p><p>Esta herramienta está meticulosamente diseñada para adaptarse a su longitud, latitud y zona horaria exactas, asegurando que los cálculos planetarios reflejen el verdadero estado cósmico sobre su lugar de nacimiento específico.</p></>,
    heroWhoTitle: "¿Quién se beneficia de este sistema?",
    heroWhoDesc: <><p>Esta aplicación está meticulosamente diseñada para buscadores espirituales, seguidores devotos de las tradiciones dhármicas e individuos que se esfuerzan por reconectarse con los ritmos universales que guiaron su llegada a este mundo. Es la herramienta fundamental perfecta para planificar auténticas celebraciones tradicionales, programar Pujas auspiciosas o dedicar tiempo a una profunda reflexión personal.</p></>,
    heroWhyTitle: "Por qué nuestra metodología es superior",
    heroWhyDesc: <><p>Diseñada utilizando astrología computacional avanzada, esta plataforma compara su hora exacta y coordenadas geográficas de nacimiento con miles de años de ciencia astronómica védica establecida. Nuestro riguroso enfoque matemático ofrece una precisión inigualable y de nivel profesional para determinar el día espiritualmente más significativo de su año.</p></>,
    heroDisclaimerTitle: "Importante descargo de responsabilidad legal y de responsabilidad",
    heroDisclaimerDesc: <><p>La información, los cálculos, las fechas y otros contenidos proporcionados por esta aplicación están destinados<strong>estrictamente para fines espirituales, educativos y de entretenimiento únicamente.</strong>Los creadores, propietarios y operadores de esta aplicación proporcionan<strong>no hay garantías, expresas o implícitas, con respecto a la exactitud, integridad o confiabilidad</strong>de los cálculos astrológicos o cualquier otra información aquí contenida.</p><p>Esta aplicación<strong>no ofrece ni debe interpretarse como que brinda asesoramiento profesional, médico, psicológico, financiero o legal.</strong></p><p>Al utilizar este servicio, usted acepta explícitamente que los creadores, propietarios y operadores<strong>no asume ninguna responsabilidad por las decisiones tomadas, las acciones tomadas o las consecuencias incurridas</strong>basado en las fechas, cálculos o ideas proporcionadas. También acepta que cualquier confianza que deposite en esta información es estrictamente<strong>bajo su propio riesgo.</strong></p><p>Los creadores, propietarios y operadores de esta aplicación son<strong>completamente liberado de responsabilidad</strong>en caso de<strong>cualquier reclamo legal, daño, responsabilidad o disputa</strong>que surjan del uso de este software o servicio. Usted acepta que no se les impondrá ninguna responsabilidad legal.</p></>,
    followupPlaceholder: "Haga una pregunta de seguimiento...",
    termsContent: <><h3>1. Aceptación de Términos</h3><p>Al acceder y utilizar la aplicación "Find My Dharmic Birthday" ("la Aplicación") operada por HaBER Software Solutions ("nosotros", "nos" o "nuestro"), usted ("el Usuario") reconoce que ha leído, comprendido y aceptado estar legalmente vinculado por estos Términos y condiciones. Si no está de acuerdo con estos términos, debe dejar de utilizar inmediatamente la Aplicación.</p><h3>2. Naturaleza del Servicio y Ausencia de Asesoramiento Profesional</h3><p>La aplicación genera fechas, conocimientos y cálculos astronómicos.<strong>exclusivamente con fines espirituales, educativos y de entretenimiento.</strong>No proporcionamos, ni ningún contenido debe interpretarse como, asesoramiento médico, psicológico, financiero, legal u otro asesoramiento profesional. Cualquier confianza en la información proporcionada es únicamente bajo el propio riesgo del Usuario.</p><h3>3. Limitación absoluta de responsabilidad e indemnización</h3><p>En la máxima medida permitida por la ley aplicable, HaBER Software Solutions, sus creadores, propietarios, funcionarios y afiliados deberán<strong>en ningún caso será responsable de ningún daño, pérdida o gasto directo, indirecto, incidental, consecuente, especial o ejemplar.</strong>que surjan de o en conexión con el uso o la imposibilidad de usar esta Aplicación. El Usuario renuncia expresamente a cualquier derecho de demandarnos, presentar reclamaciones o responsabilizarnos por cualquier resultado, decisión o acción tomada con base en el contenido de la Aplicación. El Usuario acepta indemnizar, defender y eximir de responsabilidad a HaBER Software Solutions contra cualquier reclamo de terceros que surja de su uso de la Aplicación.</p><h3>4. Sin garantías ni avales</h3><p>La Aplicación se proporciona "TAL CUAL" y "SEGÚN DISPONIBILIDAD", sin garantías de ningún tipo, ya sean expresas o implícitas, incluidas, entre otras, garantías implícitas de comerciabilidad, idoneidad para un propósito particular o no infracción. No ofrecemos ninguna garantía de que la Aplicación será ininterrumpida, oportuna, segura, libre de errores o matemáticamente perfecta.</p><h3>5. Derechos de propiedad intelectual</h3><p>Todo el código de software, generadores matemáticos, algoritmos, interfaces de usuario, marcas y texto contenidos en la Aplicación son propiedad intelectual exclusiva de HaBER Software Solutions. No se otorgan derechos ni licencias al Usuario, excepto el derecho limitado y no exclusivo de utilizar la Aplicación según lo previsto.</p><h3>6. Ley aplicable y jurisdicción exclusiva</h3><p>Estos Términos se regirán e interpretarán de conformidad con las leyes de la República Federal de Alemania. Cualquier disputa, reclamo o procedimiento legal que surja de o esté relacionado con estos Términos o el uso de la Aplicación se presentará exclusivamente ante los tribunales competentes de Berlín, Alemania.</p></>,
    privacyContent: <><h3>1. Introducción y alcance</h3><p>Nos tomamos en serio su privacidad. Esta Política de privacidad detalla cómo HaBER Software Solutions ("nosotros", "nos") recopila, utiliza, procesa y protege sus datos personales cuando utiliza la aplicación "Find My Dharmic Birthday". Esta política cumple con los estrictos estándares del Reglamento General de Protección de Datos (GDPR).</p><h3>2. Modalidades de recopilación y procesamiento de datos</h3><p><strong>Usuarios invitados:</strong>Cuando utiliza la Aplicación sin una cuenta, sus datos de nacimiento (fecha, hora y ubicación) se procesan efímeramente dentro del navegador para generar cálculos. No transmitimos ni almacenamos estos datos altamente personales en nuestros servidores backend.</p><p><strong>Usuarios registrados:</strong>Si elige crear una cuenta para guardar perfiles, recopilamos y almacenamos de forma segura sus credenciales de autenticación (como la dirección de correo electrónico) y los perfiles de datos de nacimiento que usted elige explícitamente guardar. Estos datos se almacenan de forma segura en Google Firebase.</p><h3>3. Finalidad del Tratamiento</h3><p>Procesamos sus datos exclusivamente con el fin de proporcionar la funcionalidad principal de la aplicación, autenticar su identidad, proteger su cuenta y mantener sus perfiles guardados en todas las sesiones. Nosotros<strong>no venda, alquile ni monetice sus datos personales</strong>a intermediarios de datos o anunciantes de terceros bajo ninguna circunstancia.</p><h3>4. Infraestructura de terceros</h3><p>Para garantizar una alta disponibilidad y una seguridad sólida, utilizamos Google Cloud Platform y Firebase (operado por Google) como nuestros proveedores de infraestructura. Estas entidades procesan sus datos estrictamente como procesadores de datos según Acuerdos de Procesamiento de Datos (DPA) legalmente vinculantes de conformidad con el RGPD. Podemos utilizar cookies esenciales que son estrictamente necesarias para mantener su sesión de inicio de sesión y proteger la aplicación.</p><h3>5. Sus derechos de protección de datos</h3><p>Según el RGPD, usted posee amplios derechos con respecto a sus datos. Tiene derecho a solicitar acceso a los datos que tenemos sobre usted, derecho a exigir la rectificación de inexactitudes, derecho a la portabilidad de los datos y el<strong>"derecho al olvido" (eliminación completa de sus datos)</strong>. Para ejercer cualquiera de estos derechos, puede administrar sus datos dentro de la configuración de su cuenta o contactarnos directamente.</p><h3>6. Medidas de seguridad</h3><p>Empleamos medidas de seguridad organizativas y técnicas de nivel empresarial para proteger sus datos contra el acceso no autorizado, la pérdida o la alteración, incluido el cifrado en tránsito (HTTPS/TLS) y en reposo.</p></>,
    imprintContent: <><h3>Información requerida según el artículo 5 de la TMG (Telemediengesetz)</h3><p><strong>Proveedor y Operador:</strong><br/>Soluciones de software HaBER<br/>por HaBER Eje<br/>Hari en Berlín<br/>Oeste<br/>14059 Berlín<br/>República Federal de Alemania</p><h3>Información del contacto</h3><p>Teléfono: +49 (0) 157 3930 XXXX<br/>Correo electrónico: info@habersoftware.example.com</p><h3>Representación Legal y Comercial</h3><p>Representante autorizado: Hari aus Berlin</p><h3>Resolución de disputas</h3><p>La Comisión Europea proporciona una plataforma para la resolución de disputas (OS) en línea, que se puede encontrar en<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. No estamos obligados ni dispuestos a participar en procedimientos de solución de controversias ante una junta arbitral de consumo.</p><h3>Responsabilidad por el contenido y los enlaces</h3><p>Como proveedor de servicios, somos responsables de nuestro propio contenido en estas páginas de acuerdo con las leyes generales según § 7 Abs.1 TMG. Sin embargo, según los artículos 8 a 10 de la TMG, no estamos obligados a controlar la información de terceros transmitida o almacenada ni a investigar circunstancias que indiquen una actividad ilegal. Nuestro sitio puede contener enlaces a sitios web externos de terceros sobre cuyo contenido no tenemos control. Por lo tanto, no podemos aceptar ninguna responsabilidad por este contenido externo.</p></>,
    underConstructionBtn: "Bajo construcción",
    guestLoginBtn: "Inicio de sesión de invitado",
    underConstructionTitle: "Bajo construcción",
    underConstructionDesc1: "Esta aplicación se está construyendo actualmente.",
    underConstructionDesc2: "Nos disculpamos sinceramente por las molestias. Vuelve a consultar más tarde.",
    password: "Contraseña",
    loginBtn: "Acceso",
    incorrectPassword: "Contraseña incorrecta",
    showTip: "Mostrar sugerencia",
    hideTip: "Ocultar sugerencia",
    guestTip: "Consejo: la contraseña es hari2",
  },
RU: {
    birthDetails: "Детали рождения",
    birthDate: "Дата рождения",
    birthTime: "Время рождения",
    birthPlace: "Место рождения",
    timezone: "Часовой пояс",
    tradData: "Традиционные данные",
    nakshatra: "Накшатра",
    paksha: "Пакша",
    tithi: "Титхи",
    lunarMonth: "Лунный месяц",
    searchRange: "Диапазон поиска и примечания",
    targetYears: "Целевой год(ы)",
    notes: "Примечания или вопросы",
    findBday: "Найди мой дхармический день рождения",
    select: "Выбирать",
    selectTimezone: "Выберите часовой пояс",
    footer: "Сделано с ❤️ в Берлине компанией HaBER Software Solutions",
    cookieText: "Мы используем необходимые файлы cookie, чтобы вы оставались в системе и сохраняли ваши настройки. Мы не используем файлы cookie для отслеживания.",
    privacyPolicy: "политика конфиденциальности",
    gotIt: "Понятно",
    legalNotice: "Официальное уведомление",
    terms: "Условия использования",
    imprint: "Выходные данные",
    appName: "НАЙДИТЕ МОЙ ДХАРМИЧЕСКИЙ ДЕНЬ РОЖДЕНИЯ",
    subtitle1: "Прецизионный преобразователь Панчан и Титхи",
    subtitle2: "Прецизионный конвертер Панчан и Титхи - Астрологическая оценка",
    welcomeTitle: "Добро пожаловать в помощник Панчана",
    welcomeDesc: "Введите данные о своем рождении на панели, и я рассчитаю правильный день Дхармического календаря, соответствующий Титхи и Накшатре, чтобы помочь вам отпраздновать ваш традиционный день рождения.",
    mapHint: "Вы можете нажать на карту, чтобы уточнить свое местоположение.",
    login: "Авторизоваться",
    logout: "Выход из системы",
    history: "История",
    syncHistory: "Войдите, чтобы синхронизировать историю",
    privacyNoticeTitle: "Уведомление о конфиденциальности",
    privacyNoticeDesc: "Ваши астрологические данные обрабатываются только для этого сеанса и не будут храниться постоянно.",
    searchHistory: "История поиска",
    locationPlaceholder: "например Нью-Дели, Индия",
    tooltipDate: "Используется для расчета точного дня вашего рождения по григорианскому календарю.",
    tooltipTime: "Время рождения имеет решающее значение для точного расчета Титхи и Накшатр, поскольку они меняются в течение дня.",
    tooltipPlace: "Фазы восхода и луны различаются в зависимости от местоположения. Введите название вашего города или населенного пункта. Выберите вариант или введите текст напрямую.",
    tooltipTimezone: "Смещение местного часового пояса на момент вашего рождения. Помогает проверить точное всемирное время.",
    tooltipNakshatra: "Звезда рождения или лунный особняк, занимаемый Луной в момент вашего рождения.",
    tooltipPaksha: "Две недели лунного месяца. Шукла растет (яркий), Кришна убывает (темный).",
    tooltipTithi: "Лунный день. Крайне важно для празднования традиционных Дхармических дней рождения.",
    tooltipMonth: "Лунный месяц, в котором вы родились (например, Чайтра, Вайшакха).",
    tooltipTargetYear: "Укажите год или диапазон лет, для которого вы хотите найти традиционную дату рождения.",
    tooltipNotes: "Укажите специальные методы расчета (например, Аманта или Пурниманта) или добавьте контекст к вашему запросу.",
    calculating: "Расчет...",
    calculatingPanchang: "РАСЧЕТ ПАНЧАНГОВЫХ РАСПРОСТРАНЕНИЙ...",
    targetYearPlaceholder: "например 2026 или 2025-2030 гг.",
    notesPlaceholder: "Конкретная традиция (например, Аманта) или вопросы?",
    slideTitle0: "Отпразднуйте свое истинное космическое прибытие",
    slideDesc0: "Узнайте свой точный день рождения в Дхарме на основе точной ведической астрологии.",
    slideTitle1: "Мудрость древних",
    slideDesc1: "Наши высокоточные модели используют древние расчеты Панчанга.",
    slideTitle2: "Небесный праздник",
    slideDesc2: "Совместите свой особенный день с подлинными космическими ритмами.",
    slideTitle3: "Священные астрологические мандалы",
    slideDesc3: "Глубоко соединитесь с энергетическими структурами Вселенной.",
    slideTitle4: "Ваша ведическая карта рождения",
    slideDesc4: "Раскройте тайны истинного путешествия вашей жизни.",
    slideTitle5: "Радостные фестивали света",
    slideDesc5: "Ощутите духовную энергию традиционных праздников.",
    slideTitle6: "Священные огненные пуджи",
    slideDesc6: "Гармонизируйтесь с божественным посредством древних огненных ритуалов.",
    slideTitle7: "Мистическое лунное путешествие",
    slideDesc7: "Следите за транзитом Луны через священные Накшатры.",
    slideTitle8: "Космический Ом и Лотос",
    slideDesc8: "Пробудите внутренний мир и духовную мудрость внутри.",
    slideTitle9: "Традиционный Панчан",
    slideDesc9: "Откройте для себя вечные ритмы индуистского календаря.",
    slideTitle10: "Экстатическая радость киртана",
    slideDesc10: "Испытайте чистое блаженство совместного пения.",
    slideTitle11: "Праздник Аарти",
    slideDesc11: "Осветите свой путь традиционными семейными аарти.",
    slideTitle12: "Духовное спокойствие",
    slideDesc12: "Найдите внутренний покой в ​​священной атмосфере храма.",
    slideTitle13: "Ведическая огненная яджна",
    slideDesc13: "Получите божественные благословения посредством древних огненных церемоний.",
    slideTitle14: "Святая Джапа",
    slideDesc14: "Повторяйте святые имена и пробудите свое духовное сознание.",
    testiText0: "С тех пор, как я начал праздновать свой день рождения по Дхармическому календарю, я заметил глубокий сдвиг в своей энергии. Такое ощущение, что Вселенная выравнивается со мной! Это принесло в мой год невероятную удачу и мир.",
    testiAuthor0: "Раджеш К.",
    testiText1: "Я всегда праздновал не в ту дату! Григорианский календарь — это всего лишь число, но выравнивание Титхи и Накшатры приносит настоящие космические благословения. Празднование моего настоящего дхармического дня рождения открыло двери, о которых я даже не подозревал.",
    testiAuthor1: "Прия С.",
    testiText2: "Это приложение помогло мне найти мой настоящий день рождения. В первый же год, когда я отпраздновал свой дхармический день рождения, я получил долгожданное повышение. Это больше, чем просто свидание; это духовная перезагрузка.",
    testiAuthor2: "Амит П.",
    testiText3: "Наконец-то нашел свой настоящий день рождения! Григорианский календарь казался оторванным, но эта дхармическая дата приближает меня к моим корням. Празднование пуджи сделало этот год таким особенным.",
    testiAuthor3: "Снеха М.",
    testiText4: "Такой прекрасный способ воссоединиться с нашими традициями. Моя семья теперь празднует обе даты, но день рождения в Дхарме кажется гораздо более духовно наполненным.",
    testiAuthor4: "Викрам Р.",
    testiText5: "Сначала я был настроен скептически, но точность расчетов Накшатры и Титхи невероятна. Обнаружение моего космического дня рождения было поистине поучительным опытом.",
    testiAuthor5: "Адити В.",
    testiText6: "Этот инструмент — благословение! Я уже много лет пытаюсь определить свой настоящий индуистский день рождения. Праздник был глубоко личным и благословленным Богом.",
    testiAuthor6: "Каран Д.",
    testiText7: "Как преданному ИСККОН, знание моего точного дня рождения в Дхарме по Титхи позволяет мне идеально согласовать свои духовные практики. Необходимая вещь для каждого духовного искателя.",
    testiAuthor7: "Анджали Г.",
    testiText8: "Наши дедушка и бабушка всегда следовали за Панчангом, но мы потеряли связь. Это приложение вернуло эту прекрасную традицию в нашу семью. Радость Дхармического дня рождения не имеет себе равных.",
    testiAuthor8: "Рохит С.",
    testiText9: "Удивительный опыт! Расчеты точны, и празднование моего Титхи казалось невероятно благоприятным. Энергетика в тот день была просто чудесной.",
    testiAuthor9: "Мира Т.",
    heroProblemTitle: "Задача: статические солнечные даты против динамических космических ритмов",
    heroProblemDesc: <><p>При использовании стандартного григорианского (английского) календаря ваш день рождения постоянно привязан к статической солнечной дате. Однако истинное космическое расположение звезд и планет — точная небесная конфигурация, присутствующая в момент вашего рождения, — резко меняется из года в год. Именно по этой причине древние фестивали, такие как Дивали, Наваратри и Ганеш Чатуртхи, отмечаются каждый год в разные солнечные дни.</p><p>Следуя фиксированной солнечной дате, вы упускаете глубокое духовное значение вашего фактического астрологического возвращения. Традиционный календарь Дхармы чтит динамичный танец Луны и космоса, предлагая глубокую подлинную связь с вашим истинным небесным происхождением.</p></>,
    heroSolutionTitle: "Решение: точные дхармические выравнивания",
    heroSolutionDesc: <><p>Наш калькулятор Дхармического дня рождения корпоративного уровня использует высокоточные астрономические алгоритмы и точные данные планетарных эфемерид для расчета точных дат.<b>Лунный день (Титхи)</b>и<b>Звезда Рождения (Накшатра)</b>твоего воплощения. Точно отслеживая эти меняющиеся небесные ритмы, мы математически определяем подлинную традиционную дату, чтобы праздновать ваше рождение каждый год.</p><p>Этот инструмент тщательно разработан для адаптации к вашей точной долготе, широте и часовому поясу, гарантируя, что планетарные расчеты отражают истинное космическое состояние над вашим конкретным местом рождения.</p></>,
    heroWhoTitle: "Кому выгодна эта система?",
    heroWhoDesc: <><p>Это приложение тщательно разработано для духовных искателей, преданных последователей дхармических традиций и людей, стремящихся воссоединиться с универсальными ритмами, которые направляли их приход в этот мир. Это идеальный основополагающий инструмент для планирования настоящих традиционных праздников, планирования благоприятных пудж или посвящения времени глубоким личным размышлениям.</p></>,
    heroWhyTitle: "Почему наша методология превосходна",
    heroWhyDesc: <><p>Эта платформа, разработанная с использованием передовой вычислительной астрологии, сопоставляет ваше точное время и географические координаты рождения с тысячелетними устоявшимися ведическими астрономическими науками. Наш строгий математический подход обеспечивает непревзойденную точность профессионального уровня для определения самого духовно значимого дня в году.</p></>,
    heroDisclaimerTitle: "Важный отказ от юридической ответственности и ответственности",
    heroDisclaimerDesc: <><p>Информация, расчеты, даты и другой контент, предоставляемые этим приложением, предназначены<strong>исключительно в духовных, образовательных и развлекательных целях.</strong>Создатели, владельцы и операторы этого приложения предоставляют<strong>никаких гарантий – явных или подразумеваемых – относительно точности, полноты или надежности</strong>астрологических вычислений или любой другой информации, содержащейся в настоящем документе.</p><p>Это приложение<strong>не предлагает и не должен рассматриваться как предоставление профессиональных, медицинских, психологических, финансовых или юридических консультаций.</strong></p><p>Используя этот сервис, вы явно соглашаетесь с тем, что создатели, владельцы и операторы<strong>не несете ответственности за любые принятые решения, предпринятые действия или понесенные последствия</strong>на основе предоставленных дат, расчетов или информации. Вы также соглашаетесь с тем, что любое доверие, которое вы оказываете этой информации, строго<strong>на свой страх и риск.</strong></p><p>Создатели, владельцы и операторы этого приложения:<strong>полностью освобожден от ответственности</strong>в случае<strong>любые юридические претензии, убытки, обязательства или споры</strong>возникающие в результате использования этого программного обеспечения или услуги. Вы соглашаетесь с тем, что на них не будет возложена никакая юридическая ответственность.</p></>,
    followupPlaceholder: "Задайте уточняющий вопрос...",
    termsContent: <><h3>1. Принятие Условий</h3><p>Получая доступ и используя приложение «Find My Dharmic Birthday» («Приложение»), управляемое HaBER Software Solutions («мы», «нас» или «наш»), вы («Пользователь») подтверждаете, что прочитали, поняли и согласились быть юридически связанными настоящими Условиями. Если вы не согласны с этими условиями, вы должны немедленно прекратить любое использование Приложения.</p><h3>2. Характер услуги и отсутствие профессиональных консультаций</h3><p>Приложение генерирует даты, информацию и астрономические расчеты.<strong>исключительно в духовных, образовательных и развлекательных целях.</strong>Мы не предоставляем и не должны рассматривать какой-либо контент как медицинские, психологические, финансовые, юридические или другие профессиональные консультации. Любое доверие к предоставленной информации осуществляется исключительно на страх и риск Пользователя.</p><h3>3. Абсолютное ограничение ответственности и возмещение ущерба</h3><p>В максимальной степени, разрешенной действующим законодательством, компания HaBER Software Solutions, ее создатели, владельцы, должностные лица и аффилированные лица обязаны<strong>ни при каких обстоятельствах не несет ответственности за любые прямые, косвенные, случайные, косвенные, особые или показательные убытки, убытки или расходы.</strong>возникающие в результате или в связи с использованием или невозможностью использования данного Приложения. Пользователь прямо отказывается от любого права подавать в суд, предъявлять претензии или возлагать на нас ответственность за любые результаты, решения или действия, предпринятые на основе контента Приложения. Пользователь соглашается возмещать убытки, защищать и ограждать Программные решения HaBER от любых претензий третьих лиц, возникающих в результате использования им Приложения.</p><h3>4. Никаких гарантий и гарантий.</h3><p>Приложение предоставляется на условиях «КАК ЕСТЬ» и «КАК ДОСТУПНО», без каких-либо гарантий, явных или подразумеваемых, включая, помимо прочего, подразумеваемые гарантии коммерческой ценности, пригодности для определенной цели или отсутствия нарушений прав. Мы не даем никаких гарантий, что Приложение будет бесперебойным, своевременным, безопасным, безошибочным или математически безупречным.</p><h3>5. Права интеллектуальной собственности</h3><p>Весь программный код, математические генераторы, алгоритмы, пользовательские интерфейсы, брендинг и текст, содержащиеся в Приложении, являются исключительной интеллектуальной собственностью HaBER Software Solutions. Пользователю не предоставляются никакие права или лицензии, за исключением ограниченного неисключительного права использовать Приложение по назначению.</p><h3>6. Применимое право и исключительная юрисдикция</h3><p>Настоящие Условия регулируются и толкуются в соответствии с законодательством Федеративной Республики Германия. Любые юридические споры, претензии или разбирательства, вытекающие из настоящих Условий или использования Приложения или связанные с ними, подлежат рассмотрению исключительно в компетентных судах Берлина, Германия.</p></>,
    privacyContent: <><h3>1. Введение и сфера применения</h3><p>Мы серьезно относимся к вашей конфиденциальности. В настоящей Политике конфиденциальности подробно описано, как HaBER Software Solutions («мы», «нас») собирает, использует, обрабатывает и защищает ваши личные данные, когда вы используете приложение «Найти мой день рождения в Дхарме». Эта политика соответствует строгим стандартам Общего регламента защиты данных (GDPR).</p><h3>2. Методы сбора и обработки данных</h3><p><strong>Гостевые пользователи:</strong>Когда вы используете Приложение без учетной записи, данные вашего рождения (дата, время и место) кратковременно обрабатываются в браузере для проведения расчетов. Мы не передаем и не храним эти очень личные данные на наших внутренних серверах.</p><p><strong>Зарегистрированные пользователи:</strong>Если вы решите создать учетную запись для сохранения профилей, мы собираем и надежно храним ваши учетные данные для аутентификации (например, адрес электронной почты) и профили данных о рождении, которые вы явно решили сохранить. Эти данные надежно хранятся в Google Firebase.</p><h3>3. Цель обработки</h3><p>Мы обрабатываем ваши данные исключительно с целью обеспечения основных функций Приложения, аутентификации вашей личности, защиты вашей учетной записи и поддержания ваших сохраненных профилей между сеансами. Мы<strong>не продавайте, не сдавайте в аренду и не монетизируйте свои персональные данные</strong>сторонним брокерам данных или рекламодателям ни при каких обстоятельствах.</p><h3>4. Сторонняя инфраструктура</h3><p>Чтобы обеспечить высокую доступность и надежную безопасность, мы используем Google Cloud Platform и Firebase (управляемые Google) в качестве наших поставщиков инфраструктуры. Эти организации обрабатывают ваши данные строго в качестве обработчиков данных в соответствии с юридически обязательными соглашениями об обработке данных (DPA) в соответствии с GDPR. Мы можем использовать основные файлы cookie, которые строго необходимы для поддержания вашего сеанса входа в систему и защиты приложения.</p><h3>5. Ваши права на защиту данных</h3><p>Согласно GDPR, вы обладаете полными правами в отношении ваших данных. Вы имеете право запросить доступ к данным о вас, которые мы храним, право требовать исправления неточностей, право на переносимость данных и<strong>«право на забвение» (полное удаление ваших данных)</strong>. Чтобы воспользоваться любым из этих прав, вы можете управлять своими данными в настройках своей учетной записи или связаться с нами напрямую.</p><h3>6. Меры безопасности</h3><p>Мы применяем технические и организационные меры безопасности корпоративного уровня для защиты ваших данных от несанкционированного доступа, потери или изменения, включая шифрование при передаче (HTTPS/TLS) и при хранении.</p></>,
    imprintContent: <><h3>Информация, необходимая согласно § 5 TMG (Telemediengesetz)</h3><p><strong>Провайдер и Оператор:</strong><br/>Программные решения Хабер<br/>от HaBER Axis<br/>Хари из Берлина<br/>Вестенд<br/>14059 Берлин<br/>Федеративная Республика Германия</p><h3>Контактная информация</h3><p>Телефон: +49 (0) 157 3930 ХХХХ<br/>Электронная почта: info@habersoftware.example.com.</p><h3>Юридическое и коммерческое представительство</h3><p>Уполномоченный представитель: Хари из Берлина</p><h3>Разрешение споров</h3><p>Европейская комиссия предоставляет платформу для онлайн-разрешения споров (ОС), которую можно найти по адресу:<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. Мы не обязаны и не хотим участвовать в разбирательствах по урегулированию споров в потребительском арбитражном совете.</p><h3>Ответственность за контент и ссылки</h3><p>Как поставщик услуг мы несем ответственность за собственный контент на этих страницах в соответствии с общими законами согласно § 7 Abs.1 TMG. Однако согласно §§ 8–10 TMG мы не обязаны отслеживать передаваемую или хранимую информацию третьих лиц или расследовать обстоятельства, указывающие на незаконную деятельность. Наш сайт может содержать ссылки на внешние сторонние веб-сайты, содержимое которых мы не можем контролировать. Поэтому мы не можем нести никакой ответственности за этот внешний контент.</p></>,
    underConstructionBtn: "В разработке",
    guestLoginBtn: "Гостевой вход",
    underConstructionTitle: "В разработке",
    underConstructionDesc1: "Это приложение в настоящее время находится в разработке.",
    underConstructionDesc2: "Приносим искренние извинения за неудобства. Пожалуйста, зайдите позже.",
    password: "Пароль",
    loginBtn: "Авторизоваться",
    incorrectPassword: "Неправильный пароль",
    showTip: "Показать подсказку",
    hideTip: "Скрыть подсказку",
    guestTip: "Совет: пароль — hari2.",
  },
UK: {
    birthDetails: "Деталі народження",
    birthDate: "Дата народження",
    birthTime: "Час народження",
    birthPlace: "Місце народження",
    timezone: "Часовий пояс",
    tradData: "Традиційні дані",
    nakshatra: "Накшатра",
    paksha: "Пакша",
    tithi: "Тітхі",
    lunarMonth: "Місяць за місячним календарем",
    searchRange: "Діапазон пошуку та примітки",
    targetYears: "Цільовий рік(и)",
    notes: "Примітки або запитання",
    findBday: "Знайти мій дхармічний день народження",
    select: "Виберіть",
    selectTimezone: "Виберіть часовий пояс",
    footer: "Зроблено за допомогою ❤️ у Берліні компанією HaBER Software Solutions",
    cookieText: "Ми використовуємо основні файли cookie, щоб ви залишалися в системі та зберігали ваші налаштування. Ми не використовуємо файли cookie для відстеження.",
    privacyPolicy: "Політика конфіденційності",
    gotIt: "зрозумів",
    legalNotice: "Юридична інформація",
    terms: "Правила та умови",
    imprint: "Вихідні дані",
    appName: "ЗНАЙДИ МІЙ ДАНЬ НАРОДЖЕННЯ ДХАРМІЧНОГО",
    subtitle1: "Точний конвертер Panchang & Tithi",
    subtitle2: "Точний конвертер Panchang & Tithi - Астрологічна оцінка",
    welcomeTitle: "Вітаємо в Panchang Assistant",
    welcomeDesc: "Введіть дані свого народження на панелі, і я обчислю правильний день Дхармічного календаря, відповідаючи Тітхі та Накшатрі, щоб допомогти вам відсвяткувати свій традиційний день народження.",
    mapHint: "Ви можете натиснути на карту, щоб точно налаштувати своє місцезнаходження.",
    login: "Логін",
    logout: "Вийти",
    history: "історія",
    syncHistory: "Увійдіть, щоб синхронізувати історію",
    privacyNoticeTitle: "Повідомлення про конфіденційність",
    privacyNoticeDesc: "Ваші астрологічні дані обробляються лише для цього сеансу та не зберігатимуться постійно.",
    searchHistory: "Історія пошуку",
    locationPlaceholder: "напр. Нью-Делі, Індія",
    tooltipDate: "Використовується для розрахунку точного дня вашого народження за григоріанським календарем.",
    tooltipTime: "Час народження має вирішальне значення для точного обчислення тітхі та накшатри, оскільки вони змінюються протягом дня.",
    tooltipPlace: "Схід сонця та фази місяця залежать від місця розташування. Введіть назву свого міста чи селища. Виберіть параметр або введіть безпосередньо.",
    tooltipTimezone: "Зміщення місцевого часового поясу на момент вашого народження. Допомагає перевірити точний універсальний час.",
    tooltipNakshatra: "Зірка народження або місячний особняк, зайнятий Місяцем під час вашого народження.",
    tooltipPaksha: "Два тижні місячного місяця. Шукла зростає (світлий), Крішна слабшає (темний).",
    tooltipTithi: "Місячний день. Вирішальне значення для святкування традиційних дхармічних днів народження.",
    tooltipMonth: "Місяць, у якому ви народилися (наприклад, Чайтра, Вайшакха).",
    tooltipTargetYear: "Укажіть рік або діапазон років, для яких ви хочете знайти свою традиційну дату дня народження.",
    tooltipNotes: "Укажіть спеціальні методи розрахунку (наприклад, Amanta або Purnimanta) або додайте контекст до свого запиту.",
    calculating: "Розрахунок...",
    calculatingPanchang: "РОЗРАХУНОК РІВНІВ ПАНЧАНГ...",
    targetYearPlaceholder: "напр. 2026 або 2025-2030",
    notesPlaceholder: "Конкретна традиція (наприклад, Amanta) чи запитання?",
    slideTitle0: "Святкуйте своє справжнє космічне прибуття",
    slideDesc0: "Дізнайтеся свій точний дхармічний день народження на основі точної ведичної астрології.",
    slideTitle1: "Мудрість стародавніх",
    slideDesc1: "Наші високоточні моделі використовують старовинні розрахунки Panchang.",
    slideTitle2: "Небесне свято",
    slideDesc2: "Поєднайте свій особливий день зі справжніми космічними ритмами.",
    slideTitle3: "Священні астрологічні мандали",
    slideDesc3: "Глибоко зв’яжіться з енергетичними моделями Всесвіту.",
    slideTitle4: "Ваша ведична карта народження",
    slideDesc4: "Розкрийте таємниці свого справжнього життєвого шляху.",
    slideTitle5: "Радісні свята світла",
    slideDesc5: "Відчуйте духовну енергію традиційних свят.",
    slideTitle6: "Пуджі священного вогню",
    slideDesc6: "Гармонуйте з божественним за допомогою стародавніх ритуалів вогню.",
    slideTitle7: "Містична місячна подорож",
    slideDesc7: "Слідкуйте за проходженням місяця через священні накшатри.",
    slideTitle8: "Космічний Ом і Лотос",
    slideDesc8: "Пробудіть внутрішній мир і духовну мудрість всередині.",
    slideTitle9: "Традиційний панчанг",
    slideDesc9: "Відкрийте позачасові ритми індуїстського календаря.",
    slideTitle10: "Екстатична радість кіртану",
    slideDesc10: "Відчуйте чисте блаженство спільного співу.",
    slideTitle11: "Святкування Аарті",
    slideDesc11: "Освітіть свій шлях традиційним сімейним аарті.",
    slideTitle12: "Духовний спокій",
    slideDesc12: "Знайдіть внутрішній спокій у священній атмосфері храму.",
    slideTitle13: "Ведична вогняна яджна",
    slideDesc13: "Отримайте божественне благословення через стародавні вогняні церемонії.",
    slideTitle14: "Свята Джапа",
    slideDesc14: "Наспівуйте святі імена і пробуджуйте свою духовну свідомість.",
    testiText0: "Відколи я почав святкувати свій день народження за Дхармічним календарем, я помітив глибоку зміну своєї енергії. Таке відчуття, що всесвіт наближається до мене! Це принесло неймовірну удачу і спокій у мій рік.",
    testiAuthor0: "Раджеш К.",
    testiText1: "Я завжди святкувала не в ту дату! Григоріанський календар - це лише число, але вирівнювання Тіті та Накшатри приносить справжні космічні благословення. Святкування мого справжнього дхармічного дня народження відкрило двері, про які я навіть не міг уявити.",
    testiAuthor1: "Прия С.",
    testiText2: "Ця програма допомогла мені знайти мій справжній день народження. У перший же рік, коли я святкував свій Дхармічний день народження, я отримав довгоочікуване підвищення. Це більше, ніж просто побачення; це духовне перезавантаження.",
    testiAuthor2: "Аміт П.",
    testiText3: "Нарешті знайшов свій справжній день народження! Григоріанський календар здавався роз’єднаним, але ця дхармічна дата наближає мене до мого коріння. Святкування з пуджою зробило цей рік таким особливим.",
    testiAuthor3: "Снега М.",
    testiText4: "Такий прекрасний спосіб відродити наші традиції. Зараз моя сім’я святкує обидві дати, але день народження Дхарми здається набагато більш духовним.",
    testiAuthor4: "Вікрам Р.",
    testiText5: "Спочатку я був налаштований скептично, але точність розрахунків Накшатри та Тіті неймовірна. Знайти мій космічний день народження було справді захоплюючим досвідом.",
    testiAuthor5: "Адіті В.",
    testiText6: "Цей інструмент - благословення! Я роками намагався визначити мій справжній індуїстський день народження. Це свято було глибоко особистим і благословенним Богом.",
    testiAuthor6: "Каран Д.",
    testiText7: "Як відданий ISKCON, знання мого точного дхармічного дня народження на основі Тітхі дозволяє мені ідеально узгодити свої духовні практики. Обов’язкова річ для кожного духовного шукача.",
    testiAuthor7: "Анджалі Г.",
    testiText8: "Наші бабусі й дідусі завжди дотримувалися Панчанг, але ми втратили зв’язок. Ця програма повернула цю чудову традицію в нашу родину. Радість Дхармічного дня народження неперевершена.",
    testiAuthor8: "Рохіт С.",
    testiText9: "Дивовижний досвід! Розрахунки точні, і святкування мого Тітхі було неймовірно сприятливим. Енергія в той день була просто чудовою.",
    testiAuthor9: "Міра Т.",
    heroProblemTitle: "Завдання: статичні сонячні дати проти динамічних космічних ритмів",
    heroProblemDesc: <><p>Якщо покладатися на стандартний григоріанський (англійський) календар, ваш день народження постійно прив’язується до статичної сонячної дати. Однак справжнє космічне розташування зірок і планет — точна небесна конфігурація, наявна на момент вашого народження — різко змінюється з року в рік. Саме тому давні свята, такі як Дівалі, Навратрі та Ганеш Чатурті, щороку відзначаються в різні сонячні дати.</p><p>Дотримуючись фіксованої сонячної дати, ви пропускаєте глибоке духовне значення вашого фактичного астрологічного повернення. Традиційний дхармічний календар вшановує динамічний танець між Місяцем і космосом, пропонуючи глибоко автентичний зв’язок із вашим справжнім небесним походженням.</p></>,
    heroSolutionTitle: "Рішення: точні дхармічні вирівнювання",
    heroSolutionDesc: <><p>Наш Дхармічний калькулятор корпоративного рівня використовує високоточні астрономічні алгоритми та точні дані планетних ефемерид для точного розрахунку<b>Місячний день (Тітхі)</b>і<b>Зірка народження (Накшатра)</b>вашого втілення. Точно відстежуючи ці мінливі небесні ритми, ми математично визначаємо автентичну традиційну дату святкування вашого народження щороку.</p><p>Цей інструмент ретельно розроблено для адаптації до вашої точної довготи, широти та часового поясу, гарантуючи, що планетарні розрахунки відображають справжній космічний стан над вашим конкретним місцем народження.</p></>,
    heroWhoTitle: "Кому ця система вигідна?",
    heroWhoDesc: <><p>Ця програма ретельно розроблена для духовних шукачів, відданих послідовників дхармічних традицій і людей, які прагнуть відновити зв’язок із універсальними ритмами, які скеровували їх прибуття в цей світ. Це ідеальний базовий інструмент для планування автентичних традиційних свят, планування сприятливих пудж або присвячення часу глибоким особистим роздумам.</p></>,
    heroWhyTitle: "Чому наша методологія краща",
    heroWhyDesc: <><p>Розроблена з використанням передової обчислювальної астрології, ця платформа порівнює ваш точний час і географічні координати народження з тисячоліттями усталеної ведичної астрономічної науки. Наш строгий математичний підхід забезпечує неперевершену точність професійного рівня для визначення найбільш духовно значущого дня у вашому році.</p></>,
    heroDisclaimerTitle: "Важливе застереження про право та відповідальність",
    heroDisclaimerDesc: <><p>Інформація, розрахунки, дати та інший вміст, наданий цією програмою, призначений<strong>лише для духовних, освітніх і розважальних цілей.</strong>Творці, власники та оператори цієї програми надають<strong>відсутність гарантій — явних чи неявних — щодо точності, повноти чи надійності</strong>астрологічних обчислень або будь-якої іншої інформації, наведеної тут.</p><p>Ця програма<strong>не пропонує і не має тлумачитися як надання професійних, медичних, психологічних, фінансових чи юридичних порад.</strong></p><p>Користуючись цією послугою, ви однозначно погоджуєтеся з тим, що творці, власники та оператори<strong>не несе відповідальності за будь-які прийняті рішення, вжиті дії або понесені наслідки</strong>на основі дат, розрахунків або наданих уявлень. Ви також погоджуєтесь, що будь-яка довіра до цієї інформації є суворою<strong>на свій страх і ризик.</strong></p><p>Творці, власники та оператори цієї програми є<strong>повністю звільняється від відповідальності</strong>у разі виникнення<strong>будь-які юридичні претензії, збитки, відповідальність або суперечки</strong>що виникають у результаті використання цього програмного забезпечення чи послуги. Ви погоджуєтесь, що на них не буде покладено жодної юридичної відповідальності.</p></>,
    followupPlaceholder: "Задайте додаткове запитання...",
    termsContent: <><h3>1. Прийняття Умов</h3><p>Отримавши доступ до програми «Знайди мій дармічний день народження» («Додаток»), якою керує HaBER Software Solutions («ми», «нас» або «наш»), і використовуючи її, ви («Користувач») підтверджуєте, що ви прочитали, зрозуміли та погодилися бути юридично зобов’язаними цими Умовами. Якщо ви не згодні з цими умовами, ви повинні негайно припинити будь-яке використання програми.</p><h3>2. Характер послуги та відсутність професійних порад</h3><p>Додаток генерує дати, статистичні дані та астрономічні розрахунки<strong>виключно для духовних, освітніх і розважальних цілей.</strong>Ми не надаємо медичні, психологічні, фінансові, юридичні чи інші професійні консультації та не повинні розглядатися як будь-який вміст. Користувач покладається на надану інформацію виключно на власний ризик.</p><h3>3. Абсолютне обмеження відповідальності та відшкодування</h3><p>У максимальному обсязі, дозволеному чинним законодавством, HaBER Software Solutions, його творці, власники, посадові особи та афілійовані особи<strong>ні в якому разі не несе відповідальності за будь-які прямі, непрямі, випадкові, непрямі, спеціальні чи типові збитки, збитки чи витрати</strong>що виникають у зв’язку з використанням або неможливістю використання цієї програми. Користувач однозначно відмовляється від будь-якого права подавати позов, претензії або притягувати нас до відповідальності за будь-які результати, рішення чи дії, вжиті на основі вмісту Додатка. Користувач погоджується компенсувати збитки, захищати та звільняти HaBER Software Solutions від будь-яких претензій третіх сторін, що виникають у зв’язку з використанням ним Додатку.</p><h3>4. Жодних гарантій чи гарантій</h3><p>Програма надається на умовах «ЯК Є» та «ЯК ДОСТУПНА» без будь-яких гарантій, явних чи неявних, включаючи, але не обмежуючись, неявні гарантії товарної придатності, придатності для певної мети або непорушення. Ми не гарантуємо, що додаток працюватиме безперебійно, своєчасно, безпечно, без помилок або математично бездоганно.</p><h3>5. Права інтелектуальної власності</h3><p>Весь програмний код, математичні генератори, алгоритми, користувацькі інтерфейси, брендинг і текст, що містяться в Додатку, є виключною інтелектуальною власністю HaBER Software Solutions. Користувачеві не надається жодних прав чи ліцензій, за винятком обмеженого, невиключного права використовувати Додаток за призначенням.</p><h3>6. Застосовне право та виключна юрисдикція</h3><p>Ці Умови регулюються та тлумачаться відповідно до законодавства Федеративної Республіки Німеччина. Будь-які правові суперечки, претензії чи провадження, що виникають у зв’язку з цими Умовами або використанням Додатка, мають розглядатися виключно в компетентних судах Берліна, Німеччина.</p></>,
    privacyContent: <><h3>1. Вступ і сфера застосування</h3><p>Ми серйозно ставимося до вашої конфіденційності. У цій Політиці конфіденційності детально описано, як HaBER Software Solutions («ми», «нас») збирає, використовує, обробляє та захищає ваші особисті дані, коли ви використовуєте програму «Знайти мій день народження в Дармі». Ця політика відповідає суворим стандартам Загального регламенту захисту даних (GDPR).</p><h3>2. Модальності збору та обробки даних</h3><p><strong>Guest Users:</strong>Коли ви використовуєте програму без облікового запису, ваші дані про народження (дата, час і місцезнаходження) тимчасово обробляються в браузері для створення обчислень. Ми не передаємо та не зберігаємо ці дуже особисті дані на наших внутрішніх серверах.</p><p><strong>Зареєстровані користувачі:</strong>Якщо ви вирішите створити обліковий запис для збереження профілів, ми збираємо та безпечно зберігаємо ваші облікові дані для автентифікації (наприклад, адресу електронної пошти) і профілі даних про народження, які ви вирішите зберегти. Ці дані надійно зберігаються в Google Firebase.</p><h3>3. Мета обробки</h3><p>Ми обробляємо ваші дані виключно з метою надання основних функцій програми, аутентифікації вашої особи, захисту вашого облікового запису та підтримки ваших збережених профілів під час сеансів. ми<strong>не продавайте, не здавайте в оренду та не монетизуйте свої особисті дані</strong>стороннім брокерам даних або рекламодавцям за будь-яких обставин.</p><h3>4. Інфраструктура третіх сторін</h3><p>Щоб забезпечити високу доступність і надійну безпеку, ми використовуємо Google Cloud Platform і Firebase (під керуванням Google) як наших постачальників інфраструктури. Ці організації обробляють ваші дані виключно як обробники даних відповідно до юридично обов’язкових угод про обробку даних (DPA) відповідно до GDPR. Ми можемо використовувати основні файли cookie, які суворо необхідні для підтримки вашого сеансу входу та захисту програми.</p><h3>5. Ваші права на захист даних</h3><p>Відповідно до GDPR ви володієте повними правами щодо своїх даних. Ви маєте право вимагати доступу до даних, які ми зберігаємо про вас, право вимагати виправлення неточностей, право на перенесення даних і<strong>«право бути забутим» (повне видалення ваших даних)</strong>. Щоб скористатися будь-яким із цих прав, ви можете керувати своїми даними в налаштуваннях облікового запису або зв’язатися з нами напряму.</p><h3>6. Заходи безпеки</h3><p>Ми використовуємо технічні та організаційні заходи безпеки корпоративного рівня, щоб захистити ваші дані від несанкціонованого доступу, втрати або зміни, включаючи шифрування під час передавання (HTTPS/TLS) і в спокої.</p></>,
    imprintContent: <><h3>Інформація, необхідна відповідно до § 5 TMG (Telemediengesetz)</h3><p><strong>Провайдер і оператор:</strong><br/>Програмні рішення HaBER<br/>від HaBER Axis<br/>Харі з Берліна<br/>Westend<br/>14059 Берлін<br/>Федеративна Республіка Німеччина</p><h3>Контактна інформація</h3><p>Телефон: +49 (0) 157 3930 XXXX<br/>Електронна адреса: info@habersoftware.example.com</p><h3>Юридичне та комерційне представництво</h3><p>Уповноважений представник: Hari aus Berlin</p><h3>Вирішення спорів</h3><p>Європейська комісія надає платформу для онлайн-розв’язання суперечок (OS), яку можна знайти за адресою<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. Ми не зобов’язані та не бажаємо брати участь у розгляді спорів у арбітражній раді споживачів.</p><h3>Liability for Content and Links</h3><p>Як постачальник послуг, ми несемо відповідальність за власний вміст на цих сторінках відповідно до загальних законів відповідно до § 7 Abs.1 TMG. Однак, згідно з §§ 8-10 TMG, ми не зобов’язані контролювати передану або збережену інформацію третіх сторін або розслідувати обставини, які вказують на незаконну діяльність. Наш сайт може містити посилання на сторонні веб-сайти, вміст яких ми не контролюємо. Тому ми не несемо жодної відповідальності за цей зовнішній вміст.</p></>,
    underConstructionBtn: "Будується",
    guestLoginBtn: "Гість Вхід",
    underConstructionTitle: "Будується",
    underConstructionDesc1: "Ця програма зараз створюється.",
    underConstructionDesc2: "Приносимо щирі вибачення за незручності. Перевірте пізніше.",
    password: "Пароль",
    loginBtn: "Логін",
    incorrectPassword: "Невірний пароль",
    showTip: "Показати підказку",
    hideTip: "Приховати підказку",
    guestTip: "Порада: пароль hari2",
  },

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

class MapErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Map Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-[#fdfcfb]">
           <p className="text-xs font-semibold text-[#8b0000] mb-2">Google Maps Error</p>
           <p className="text-[0.65rem] text-[#5c554a]">
             Failed to load the map. There might be an issue with the API key or restrictions.
           </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode, fallbackMessage?: string }, { hasError: boolean, errorMsg: string }> {
  constructor(props: { children: React.ReactNode, fallbackMessage?: string }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by AppErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center border border-red-300 bg-red-50 rounded-[4px] min-h-[40px]">
           <p className="text-[0.75rem] font-semibold text-[#8b0000] mb-1">UI Component Error</p>
           <p className="text-[0.65rem] text-[#5c554a]">
             {this.props.fallbackMessage || "Failed to render this component."}
           </p>
        </div>
      );
    }
    return this.props.children;
  }
}



const LANG_PROMPT_MAP: Record<string, string> = {
  EN: "English",
  DE: "German",
  HI: "Hindi",
  TE: "Telugu",
  PA: "Punjabi",
  AS: "Assamese",
  FR: "French",
  IT: "Italian",
  ES: "Spanish",
  RU: "Russian",
  UK: "Ukrainian",
};

const LANGUAGE_LABELS: Record<string, string> = {
  EN: "🇬🇧 English",
  DE: "🇩🇪 Deutsch",
  HI: "🇮🇳 हिंदी",
  TE: "🇮🇳 తెలుగు",
  PA: "🇮🇳 ਪੰਜਾਬੀ",
  AS: "🇮🇳 অসমীয়া",
  FR: "🇫🇷 Français",
  IT: "🇮🇹 Italiano",
  ES: "🇪🇸 Español",
  RU: "🇷🇺 русский",
  UK: "🇺🇦 Українська",
};

export default function App() {
  const [uiLang, setUiLang] = useState<"EN" | "DE" | "HI" | "TE" | "PA" | "AS" | "FR" | "IT" | "ES" | "RU" | "UK">("EN");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isBlueprintGenerated, setIsBlueprintGenerated] = useState(false);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");


  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardConfigs, setDashboardConfigs] = useState<SearchConfig[]>([]);

  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showImprint, setShowImprint] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [showUnderConstruction, setShowUnderConstruction] = useState(false);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [guestPassword, setGuestPassword] = useState("");
  const [showPasswordTip, setShowPasswordTip] = useState(false);

  // Settings
  const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');

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
  const handleTimeChange = (date: Date | null) => {
    if (date) {
      const h = String(date.getHours()).padStart(2, "0");
      const m = String(date.getMinutes()).padStart(2, "0");
      setBirthTime(`${h}:${m}`);
    } else {
      setBirthTime("");
    }
  };
  const [birthPlace, setBirthPlace] = useState("");
  const [debouncedBirthPlace, setDebouncedBirthPlace] = useState("");
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBirthPlace(birthPlace);
    }, 1000);
    return () => clearTimeout(timer);
  }, [birthPlace]);

  const [timezone, setTimezone] = useState("");
  const [nakshatra, setNakshatra] = useState("");
  const [tithi, setTithi] = useState("");
  const [paksha, setPaksha] = useState("");
  const [lunarMonth, setLunarMonth] = useState("");
  const [targetYearRange, setTargetYearRange] = useState(new Date().getFullYear().toString());
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [notes, setNotes] = useState("");
  const [recentConfigs, setRecentConfigs] = useState<SearchConfig[]>([]);

  const parseDateString = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return null;
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      setBirthDate(`${y}-${m}-${d}`);
    } else {
      setBirthDate("");
    }
  };

  const getDatePickerFormat = (format: string) => {
    if (format === 'DD-MM-YYYY') return 'dd-MM-yyyy';
    if (format === 'MM-DD-YYYY') return 'MM-dd-yyyy';
    return 'yyyy-MM-dd';
  };

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
      if (u && u.isAnonymous) {
         setIsGuest(true);
      } else if (u && !u.isAnonymous) {
         setIsGuest(false);
      }
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
      setRecentConfigs([]);
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

     if (user && !user.isAnonymous && !isGuest) {
        const newConfigs = [config, ...recentConfigs].slice(0, 3);
        setRecentConfigs(newConfigs);
        try {
           await setDoc(doc(db, "users", user.uid, "searches", config.id), config);
        } catch(e) {
           handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/searches/${config.id}`);
        }
     } else {
        const newConfigs = [config, ...recentConfigs].slice(0, 3);
        setRecentConfigs(newConfigs);
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

  
  const generateBlueprint = async () => {
    if (!birthDate || !birthTime || !birthPlace || !timezone) return;
    setIsGeneratingBlueprint(true);
    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthTime, birthPlace, timezone })
      });
      if (res.ok) {
        const data = await res.json();
        setNakshatra(data.nakshatra || "Unknown");
        setPaksha(data.paksha || "Unknown");
        setTithi(data.tithi || "Unknown");
        setLunarMonth(data.lunarMonth || "Unknown");
        setIsBlueprintGenerated(true);
      } else {
        alert("Failed to generate blueprint. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate blueprint.");
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isFormValid) return;

    let userPrompt = "Here are my details for finding the equivalent Dharmic birthday:\n\n";
    if (birthDate) userPrompt += `- Birth Date: ${birthDate} (Please format all dates in your final generated output as ${dateFormat})\n`;
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

    const isLoggedIn = !!user || isGuest;
    userPrompt += "\n\nIMPORTANT: Start your response by summarizing the original birth details provided by the user, followed by their 4 Cosmic Blueprint parameters. Then provide the Dharmic Birthday details.";

    userPrompt += `\n\nPlease reply primarily in ${LANG_PROMPT_MAP[uiLang] || 'English'}. Additionally, provide a 5-year projection of this birthday from the target year forward. Return this 5-year projection as a JSON array inside a markdown block starting exactly with \`\`\`json. Each object MUST have exactly these keys: { "year": number, "gregorianDate": "YYYY-MM-DD", "weekday": "Monday" }.`;

    if (!isLoggedIn) {
      userPrompt += `\n\nCRITICAL INSTRUCTION: Since the user is a guest, you MUST provide only a VERY SHORT, concise summary of their Dharmic Birthday details and the 5-year projection. Do not provide detailed astrological explanations, long paragraphs, or deep analysis. Keep it extremely brief. Add a friendly note at the very end suggesting they sign up for full astrological details, saving capabilities, and downloads.`;
    } else {
      userPrompt += `\n\nProvide a comprehensive, detailed astrological assessment along with the results.`;
    }

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

  
  const generateHoroscope = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const horoscopePrompt = "Please generate a detailed horoscope for the user based on their cosmic blueprint and birth details provided earlier. Make it engaging, uplifting, and beautifully formatted.";
    const newUserMsg: MessageItem = { id: Date.now().toString(), role: "user", text: horoscopePrompt };
    setMessages(prev => [...prev, newUserMsg]);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: horoscopePrompt, history: messages.map(m => ({ role: m.role, text: m.text })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed");
      const { cleanText, extractedJson } = parseJsonBlock(data.text || data.error);
      const modelMsg: MessageItem = { id: Date.now().toString() + "_m", role: "model", text: cleanText.trim(), jsonArray: extractedJson };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      const errMs: MessageItem = { id: Date.now().toString() + "_e", role: "model", text: `**Error:** ${err.message}` };
      setMessages(prev => [...prev, errMs]);
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

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setShowAuthModal(false);
    } catch (error: any) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        alert("Login failed because this domain is not authorized.");
      } else {
        alert("Login failed: " + error.message);
      }
    }
  };

  const handleGithubLogin = async () => {
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      setShowAuthModal(false);
    } catch (error: any) {
      console.error("GitHub Login Error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error.code === 'auth/account-exists-with-different-credential') {
        alert("An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Login failed because this domain is not authorized.");
      } else {
        alert("Login failed: " + error.message);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword) {
      setAuthError("Please enter both email and password.");
      return;
    }
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthError("");
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("An account with this email already exists. Please log in instead.");
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setAuthError("Invalid email or password.");
      } else if (error.code === 'auth/weak-password') {
        setAuthError("Password should be at least 6 characters.");
      } else if (error.code === 'auth/admin-restricted-operation') {
        setAuthError("Email/Password authentication is disabled or restricted in Firebase project settings.");
      } else {
        console.error("Email Auth Error:", error);
        setAuthError(error.message || "An error occurred during authentication.");
      }
    }
  };

  const isFormValid = !!(birthDate && birthTime && birthPlace && timezone && targetYearRange && acceptedBlueprint);

  return (
    <div className="flex flex-col h-screen bg-[#f9f7f2] text-[#2d2a26] font-sans overflow-hidden">
      <header className="border-b-[4px] border-[#daa520] bg-[#8b0000] shrink-0 min-h-16 h-auto py-3 px-3 md:px-8 flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-0 print:hidden">
        <div className="flex items-center space-x-3 cursor-pointer group w-full lg:w-auto justify-center lg:justify-start" onClick={handleClear} title="Home / Reset">
          <div className="w-8 h-8 bg-[#daa520] text-[#8b0000] rounded-[4px] flex items-center justify-center font-bold text-xl leading-none group-hover:bg-[#e2d1b3] transition-colors shrink-0">
            ॐ
          </div>
          <div className="flex flex-col text-white group-hover:text-white/90 transition-colors text-center lg:text-left overflow-hidden">
            <h1 className="text-[0.85rem] sm:text-[1.1rem] font-bold tracking-[0.02em] leading-tight truncate">{t.appName}</h1>
            <span className="text-[0.65rem] sm:text-[0.8rem] opacity-90 leading-tight truncate">{t.subtitle1}</span>
          </div>
        </div>
        <div className="flex items-center justify-center w-full lg:w-auto space-x-2 md:space-x-6 flex-wrap gap-y-2">
          {!authLoading && (
            <div className="flex items-center space-x-2 mr-2">
              {(user || isGuest) ? (
                <>
                  {isGuest && (
                    <div className="hidden lg:flex flex-col items-end mr-4">
                      <span className="text-[10px] text-white/80 font-medium leading-tight text-right max-w-[200px] mb-1">
                        You are currently logged in as guest user. For best use of this app signup free account.
                      </span>
                      <button onClick={() => setShowAuthModal(true)} className="text-[10px] bg-[#daa520] text-[#8b0000] px-2 py-0.5 rounded-[2px] font-bold uppercase tracking-wider hover:bg-[#e2d1b3] transition-colors">
                        Sign Up Free
                      </button>
                    </div>
                  )}
                  {user && (
                    <button
                      onClick={() => setShowDashboard(true)}
                      className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider mr-3"
                      title={t.history}
                    >
                      <span>{t.history}</span>
                      <History className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (user) signOut(auth);
                      setIsGuest(false);
                    }}
                    className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider"
                    title={t.logout}
                  >
                    <span>{t.logout}</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
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
             {(["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"] as const).map(l => (
               <button
                 key={l}
                 onClick={() => setUiLang(l)}
                 className={`px-2 py-1 rounded-[2px] font-bold transition-colors ${uiLang === l ? "bg-[#daa520] text-[#8b0000]" : "text-white/80 hover:text-white"}`}
                 title={LANG_PROMPT_MAP[l] || l}
               >
                 {LANGUAGE_LABELS[l] || l}
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

      <main className="w-full flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden print:overflow-visible print:h-auto">
        {/* Left Side: Input Form */}
        <section className="w-full lg:w-[360px] border-r border-[#e2d1b3] bg-white flex-shrink-0 flex flex-col print:hidden lg:h-full z-10 shadow-md">
          <div className="flex-1 lg:overflow-y-auto custom-scrollbar p-6 flex flex-col space-y-4">
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
          <div className="text-[0.75rem] uppercase tracking-[0.1em] text-[#8b4513] font-bold border-b border-[#e2d1b3] pb-1 flex justify-between items-center">
             <span>{t.birthDetails}</span>
             <select 
               value={dateFormat}
               onChange={(e) => setDateFormat(e.target.value)}
               className="text-[0.65rem] bg-transparent border-none text-[#5c554a] focus:outline-none cursor-pointer"
             >
               <option value="DD-MM-YYYY">DD-MM-YYYY</option>
               <option value="MM-DD-YYYY">MM-DD-YYYY</option>
               <option value="YYYY-MM-DD">YYYY-MM-DD</option>
             </select>
          </div>

          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 h-1.5 mt-2 rounded overflow-hidden">
            <div 
              className="bg-[#daa520] h-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>


          
          <form id="main-form" onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="space-y-4 flex flex-col flex-1 relative h-full">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 1: When were you born?</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.birthDate} <span className="text-[#8b0000] ml-1">*</span>
                        <InfoTooltip content={t.tooltipDate} />
                      </label>
                      <DatePicker
                        selected={parseDateString(birthDate)}
                        onChange={handleDateChange}
                        dateFormat={getDatePickerFormat(dateFormat)}
                        maxDate={new Date()}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        popperPlacement="bottom-start"
                        portalId="root"
                        wrapperClassName="w-full"
                        className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                        placeholderText={dateFormat}
                      />
                    </div>
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.birthTime} <span className="text-[#8b0000] ml-1">*</span>
                        <InfoTooltip content={t.tooltipTime} />
                      </label>
                      <DatePicker
                        selected={birthTime ? new Date(`2000-01-01T${birthTime}`) : null}
                        onChange={handleTimeChange}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={1}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="HH:mm"
                        portalId="root"
                        wrapperClassName="w-full"
                        className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.targetYears} <span className="text-[#8b0000] ml-1">*</span>
                        <InfoTooltip content={t.tooltipTargetYear} />
                      </label>
                      <input
                        type="text"
                        value={targetYearRange}
                        onChange={(e) => setTargetYearRange(e.target.value)}
                        placeholder="e.g. 2025"
                        className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 2: Where were you born?</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                          {t.birthPlace} <span className="text-[#8b0000] ml-1">*</span>
                          <InfoTooltip content={t.tooltipPlace} />
                        </label>
                        <AppErrorBoundary fallbackMessage="Failed to load location input.">
                          <LocationInput
                            value={birthPlace}
                            onChange={setBirthPlace}
                            placeholder={t.locationPlaceholder}
                          />
                        </AppErrorBoundary>
                        {debouncedBirthPlace && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-2 flex flex-col gap-1"
                          >
                            <div className={`${isMapExpanded ? 'fixed inset-4 z-[9999] shadow-2xl rounded-lg' : 'h-72 w-full rounded-[4px] shadow-inner'} overflow-hidden border border-[#d1c4b2] relative group bg-white`}>
                              <button
                                  type="button" 
                                 onClick={() => setIsMapExpanded(!isMapExpanded)}
                                 className="absolute top-2 right-2 z-[1000] bg-white p-2 rounded shadow border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center"
                                 title={isMapExpanded ? "Minimize Map" : "Maximize Map"}
                              >
                                {isMapExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                              </button>
                              <MapErrorBoundary>
                                <LocationMap placeName={debouncedBirthPlace} onChange={setBirthPlace} />
                              </MapErrorBoundary>
                            </div>
                            {!isMapExpanded && <span className="text-[0.65rem] text-[#8e8372] text-center italic">{t.mapHint}</span>}
                          </motion.div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 relative">
                        <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                          {t.timezone} <span className="text-[#8b0000] ml-1">*</span>
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
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                        {t.notes}
                        <InfoTooltip content={t.tooltipNotes} />
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional details or questions?"
                        className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] h-20 resize-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h3 className="text-[#8b0000] font-bold text-sm mb-4">Step 3: Cosmic Blueprint</h3>
                  
                  {!isBlueprintGenerated ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-[0.85rem] text-[#5c554a]">
                        We will use our high-performance AI models to accurately calculate your Vedic Cosmic Blueprint (Nakshatra, Paksha, Tithi, Lunar Month) using your Date, Time, and Place of birth.
                      </p>
                      <button
                        type="button"
                        onClick={generateBlueprint}
                        disabled={!birthDate || !birthTime || !birthPlace || !timezone || isGeneratingBlueprint}
                        className={`p-3 text-white font-bold rounded shadow transition-colors flex items-center justify-center gap-2 ${
                          (!birthDate || !birthTime || !birthPlace || !timezone || isGeneratingBlueprint) ? "bg-gray-400 cursor-not-allowed" : "bg-[#2b6cb0] hover:bg-[#1e4e8c]"
                        }`}
                      >
                        {isGeneratingBlueprint ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="w-4 h-4" /> Generate Cosmic Blueprint</>
                        )}
                      </button>
                      {(!birthDate || !birthTime || !birthPlace || !timezone) && (
                        <p className="text-xs text-red-600">Please complete Steps 1 & 2 first.</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="p-4 bg-[#fdfcfb] border border-[#d1c4b2] rounded-[4px] space-y-3">
                        <div className="flex justify-between border-b border-[#e2d1b3] pb-2">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.nakshatra}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{nakshatra || "-"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#e2d1b3] pb-2">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.paksha}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{paksha || "-"}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#e2d1b3] pb-2">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.tithi}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{tithi || "-"}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="font-semibold text-[0.8rem] text-[#5c554a]">{t.lunarMonth}</span>
                          <span className="text-[0.85rem] text-[#8b0000] font-bold">{lunarMonth || "-"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" id="acceptBlueprint" checked={acceptedBlueprint} onChange={e => setAcceptedBlueprint(e.target.checked)} className="w-4 h-4 text-[#8b0000] rounded focus:ring-[#8b0000]" />
                        <label htmlFor="acceptBlueprint" className="text-[0.8rem] text-[#5c554a] font-medium cursor-pointer">I agree and accept these 4 Cosmic Blueprint results</label>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Wizard Navigation */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#e2d1b3]">
               {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-6 py-2 text-sm font-bold text-[#8b0000] border border-[#8b0000] rounded hover:bg-[#fff9e6] transition-colors"
                  >
                    Back
                  </button>
               ) : <div></div>}
               
               {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="px-6 py-2 text-sm font-bold text-white bg-[#8b0000] rounded shadow hover:bg-[#6b0000] transition-colors"
                  >
                    Next
                  </button>
               ) : (
                  <div></div>
               )}
            </div>
          </form>


          </div>
          
          
          <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb] flex flex-col items-center">
            {validationMessage && (
               <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-600 text-sm font-semibold mb-3 flex items-center gap-2 bg-red-50 p-2 rounded border border-red-200">
                 <Info className="w-4 h-4" /> {validationMessage}
               </motion.div>
            )}
            <button
               form="main-form"
               type="submit"
               title={!isFormValid ? "Please fill all mandatory fields to continue" : undefined}
               onClick={(e) => {
                 if (currentStep < 3) {
                   e.preventDefault();
                   setValidationMessage("Please complete all form steps first.");
                   setTimeout(() => setValidationMessage(""), 4000);
                 } else if (!acceptedBlueprint) {
                   e.preventDefault();
                   setValidationMessage("Please review and accept the Cosmic Blueprint results to proceed.");
                   setTimeout(() => setValidationMessage(""), 4000);
                 }
               }}
               className={`w-full text-white border-0 p-3 rounded-[4px] font-bold uppercase tracking-[0.05em] transition-colors flex items-center justify-center space-x-2 bg-[#8b0000] ${(currentStep < 3 || !isFormValid || !acceptedBlueprint || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#6b0000] cursor-pointer'}`}
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
          </div>


        </section>

        {/* Right Side: Results / Chat Area */}
        <section 
          className="flex-1 relative flex flex-col min-h-[800px] lg:min-h-0 lg:h-full overflow-hidden print:overflow-visible print:h-auto print:bg-white"
          style={{ backgroundImage: 'radial-gradient(#e2d1b3 0.5px, transparent 0.5px)', backgroundSize: '20px 20px', backgroundColor: '#f9f7f2' }}
        >
          {messages.length === 0 ? (
            <WelcomeHero t={t} />
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
                                <Timeline data={msg.jsonArray} dateFormat={dateFormat} />
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
                                            <td className="px-4 py-3 font-medium border-r border-[#e2d1b3]">
                                              {(() => {
                                                const parts = row.gregorianDate.split('-');
                                                if (parts.length === 3) {
                                                  if (dateFormat === 'DD-MM-YYYY') return `${parts[2]}-${parts[1]}-${parts[0]}`;
                                                  if (dateFormat === 'MM-DD-YYYY') return `${parts[1]}-${parts[2]}-${parts[0]}`;
                                                }
                                                return row.gregorianDate;
                                              })()}
                                            </td>
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
                     
                     let followupPrompt = notes + `\n\nPlease reply primarily in ${LANG_PROMPT_MAP[uiLang] || 'English'}. If your answer includes dates across years, please ALSO provide them as a JSON array in a markdown block starting with \`\`\`json. Each object MUST have { "year": number, "gregorianDate": "YYYY-MM-DD", "weekday": "Monday" }.`;

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
             <button onClick={() => setShowUnderConstruction(true)} className="hover:text-white transition-colors">{t.underConstructionBtn || "Under Construction"}</button>
             {!(user || isGuest) && <button onClick={() => setShowGuestLogin(true)} className="hover:text-white transition-colors">{t.guestLoginBtn || "Guest Login"}</button>}
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
                    {t.privacyContent}
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
                    {t.termsContent}
                 </div>
               </div>
             </motion.div>
           )}

           {showAuthModal && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
               <div className="bg-[#f9f7f2] w-full max-w-sm rounded-[4px] shadow-2xl flex flex-col border-2 border-[#e2d1b3] overflow-hidden max-h-[90vh]">
                 <div className="flex items-center justify-between p-4 border-b border-[#e2d1b3] bg-white shrink-0">
                   <h2 className="text-lg font-bold text-[#8b0000] uppercase tracking-wider ml-1">{isSignUpMode ? "Sign Up" : (t.login || "Login")}</h2>
                   <button onClick={() => setShowAuthModal(false)} className="text-[#5c554a] hover:text-[#8b0000]">
                      <X className="w-5 h-5" />
                   </button>
                 </div>
                 <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                    <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mb-2">
                      {authError && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-[4px]">
                          {authError}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-[#5c554a] mb-1 uppercase tracking-wider">Email</label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full border border-[#e2d1b3] bg-white rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#5c554a] mb-1 uppercase tracking-wider">Password</label>
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full border border-[#e2d1b3] bg-white rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#8b0000] text-white p-3 rounded-[4px] font-bold tracking-wider hover:bg-[#6b0000] flex items-center justify-center transition-colors uppercase text-sm mt-2"
                      >
                        {isSignUpMode ? "Create Account" : "Sign In with Email"}
                      </button>
                      
                      <div className="text-center text-sm text-[#5c554a] mt-1">
                        {isSignUpMode ? "Already have an account? " : "Don't have an account? "}
                        <button type="button" onClick={() => setIsSignUpMode(!isSignUpMode)} className="text-[#8b0000] font-bold hover:underline">
                          {isSignUpMode ? "Log In" : "Sign Up"}
                        </button>
                      </div>
                    </form>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-[#e2d1b3] flex-1"></div>
                      <span className="text-xs font-bold text-[#5c554a] uppercase tracking-wider">Or</span>
                      <div className="h-px bg-[#e2d1b3] flex-1"></div>
                    </div>

                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full bg-white border border-gray-300 text-gray-700 p-3 rounded-[4px] font-bold tracking-wider hover:bg-gray-50 flex items-center justify-center gap-3 transition-colors shadow-sm"
                    >
                       <svg width="20" height="20" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                       </svg>
                       Continue with Google
                    </button>
                    
                    <button 
                      onClick={handleGithubLogin}
                      className="w-full bg-[#24292e] text-white p-3 rounded-[4px] font-bold tracking-wider hover:bg-[#2f363d] flex items-center justify-center gap-3 transition-colors shadow-sm"
                    >
                       <Github className="w-5 h-5" />
                       Continue with GitHub
                    </button>
                 </div>
               </div>
             </motion.div>
           )}

           {showGuestLogin && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
               <div className="bg-[#f9f7f2] w-full max-w-sm rounded-[4px] shadow-2xl flex flex-col border-2 border-[#e2d1b3]">
                 <div className="flex items-center justify-between p-4 border-b border-[#e2d1b3] bg-white">
                   <h2 className="text-lg font-bold text-[#8b0000] uppercase tracking-wider ml-1">{t.guestLoginBtn || "Guest Login"}</h2>
                   <button onClick={() => {
                     setShowGuestLogin(false);
                     setGuestPassword("");
                     setShowPasswordTip(false);
                   }} className="text-[#5c554a] hover:text-[#8b0000]">
                      <X className="w-5 h-5" />
                   </button>
                 </div>
                 <div className="p-6">
                    <label className="block text-sm font-semibold text-[#5c554a] mb-2">{t.password || "Password"}</label>
                    <input 
                      type="password" 
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                            if (guestPassword.trim().toLowerCase() === "hari2") {
                               setIsGuest(true);
                               setShowGuestLogin(false);
                               signInAnonymously(auth).catch(() => console.log("Firebase anonymous auth fallback used."));
                            } else {
                               alert(t.incorrectPassword || "Incorrect password");
                            }
                         }
                      }}
                      className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] focus:outline-none focus:border-[#daa520] mb-3"
                    />
                    <div className="flex justify-between items-center mb-4">
                      <button 
                        onClick={() => setShowPasswordTip(!showPasswordTip)} 
                        className="text-xs text-[#8b0000] hover:underline"
                      >
                        {showPasswordTip ? (t.hideTip || "Hide Tip") : (t.showTip || "Show Tip")}
                      </button>
                    </div>
                    {showPasswordTip && (
                      <p className="text-xs text-[#5c554a] bg-[#e2d1b3]/30 p-2 rounded mb-4">
                        {t.guestTip || "Tip: domain name i.e dharmic birthday"}
                      </p>
                    )}
                    <button 
                      onClick={() => {
                         if (guestPassword.trim().toLowerCase() === "hari2") {
                            setIsGuest(true);
                            setShowGuestLogin(false);
                            signInAnonymously(auth).catch(() => console.log("Firebase anonymous auth fallback used."));
                         } else {
                            alert(t.incorrectPassword || "Incorrect password");
                         }
                      }}
                      className="w-full bg-[#8b0000] text-white p-2 rounded-[4px] font-bold uppercase tracking-wider hover:bg-[#6b0000]"
                    >
                       {t.loginBtn || "Login"}
                    </button>
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
                    {t.imprintContent}
                 </div>
               </div>
             </motion.div>
           )}

           {showUnderConstruction && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
               <div className="bg-white p-8 rounded-[8px] shadow-2xl max-w-md text-center border-t-[4px] border-[#8b0000] mx-4 relative">
                 <button onClick={() => setShowUnderConstruction(false)} className="absolute top-4 right-4 text-[#5c554a] hover:text-[#8b0000]">
                   <X className="w-5 h-5" />
                 </button>
                 <h2 className="text-2xl font-bold text-[#8b0000] mb-3">{t.underConstructionTitle || "Under Construction"}</h2>
                 <p className="text-[#2d2a26] mb-2 font-medium">
                   {t.underConstructionDesc1 || "This application is currently being built."}
                 </p>
                 <p className="text-[#5c554a] text-sm">
                   {t.underConstructionDesc2 || "We sincerely apologize for the inconvenience. Please check back later."}
                 </p>
               </div>
             </motion.div>
           )}
        </AnimatePresence>
    </div>
    );
  }


