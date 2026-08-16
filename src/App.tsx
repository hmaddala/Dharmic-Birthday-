import React, { useState, useRef, useEffect } from "react";
import { Send, MapPin, Calendar, Clock, Star, Moon, CalendarDays, Loader2, Info, Printer, Globe, Share2, Download, LogIn, LogOut, History, X, Trash2, Maximize2, Minimize2, Github, LayoutDashboard, Bookmark, AlertTriangle, CheckCircle2, Sparkles, ShieldAlert, Search, FileText, Check } from "lucide-react";
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
  resultText?: string;
  isSavedPermanently?: boolean;
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
    tradData: "Traditional Data (cosmic blueprint)",
    tradDataHint: "Helpful Hint: If you know these 4 details below (Nakshatra, Paksha, Tithi, and Lunar Month), you can select them. Otherwise, leave them as 'Let HariGPT Calculate' (the default option), and our high-performance AI models will accurately calculate these details for you using your Birth Date, Time, and Place!",
    letHariGptCalculate: "Let HariGPT Calculate",
    nakshatra: "Nakshatra",
    paksha: "Paksha",
    tithi: "Tithi",
    lunarMonth: "Lunar Month",
    searchRange: "Search Range & Notes",
    targetYears: "Find Dharmic Birthday for Year",
    notes: "Notes or Questions",
    findBday: "Find My Dharmic Birthday",
    select: "Select",
    selectTimezone: "Select Timezone",
    footer: "Made with ❤️ in Berlin by HaBER Software Solutions",
    cookieText: "We use essential cookies to keep you logged in and save your preferences. We do not use tracking cookies.",
    privacyPolicy: "Privacy Policy",
    gotIt: "Got it",
    legalNotice: "Legal Notice",
    dashboardBtn: "Dashboard",
    dashboardTitle: "User Dashboard",
    saveDashboard: "Save to Dashboard",
    savedPermanently: "Saved Permanently",
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
    slideTitle_req1: "1. The Date of Incarnation",
    slideDesc_req1: "Your Birth Date pinpoints your arrival within the solar year, setting the baseline for your cosmic journey.",
    slideTitle_req2: "2. The Exact Moment",
    slideDesc_req2: "Your Birth Time determines the specific lunar phase and the precise position of celestial bodies at your first breath.",
    slideTitle_req3: "3. The Earthly Coordinates",
    slideDesc_req3: "Your Birth Place provides the geographical anchor, aligning the celestial map to your exact location on Earth.",
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
    heroCoreTitle: "Only 3 Details Required",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
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
    authPrompt: "Please sign up or log in to access these features. <br/><br/>Alternatively, contact <b>Hari</b> for the password to enter <b>Guest login</b> to access all features.",
    emailLabel: "Email",
    passwordLabel: "Password",
    createAccountBtn: "Create Account",
    signInEmailBtn: "Sign In with Email",
    alreadyHaveAccount: "Already have an account? ",
    dontHaveAccount: "Don't have an account? ",
    logInToggle: "Log In",
    signUpToggle: "Sign Up",
    orText: "Or",
    continueGithub: "Continue with GitHub",
    contactHari: "Please contact <b>Hari</b> for the password to enter Guest login.",
    password: "Password",
    loginBtn: "Login",
    incorrectPassword: "Incorrect password",
    showTip: "Show Tip",
    hideTip: "Hide Tip",

    guestTip: "Tip: password is hari2",
    iAcceptThe: "I accept the",
    and: "and",
    fillMandatory: "Please fill all mandatory fields and accept terms and conditions",
    gender: "Gender",
    male: "Male",
    female: "Female",
    unspecified: "Unspecified",
    targetYearsPlaceholder2: "Select a year to get a 5-Year Projection",
  },
  DE: {
    birthDetails: "Geburtsdaten",
    birthDate: "Geburtsdatum",
    birthTime: "Geburtszeit",
    birthPlace: "Geburtsort",
    timezone: "Zeitzone",
    tradData: "Traditionelle Daten (kosmische Blaupause)",
    tradDataHint: "Hilfreicher Hinweis: Wenn Sie die folgenden vier Details kennen (Nakshatra, Paksha, Tithi und Mondmonat), können Sie sie auswählen. Andernfalls belassen Sie sie auf „HariGPT berechnen lassen“ (die Standardoption), und unsere leistungsstarken KI-Modelle berechnen diese Details anhand Ihres Geburtsdatums, Ihrer Geburtszeit und Ihres Geburtsorts genau für Sie!",
    letHariGptCalculate: "Lassen Sie HariGPT berechnen",
    nakshatra: "Nakshatra",
    paksha: "Paksha",
    tithi: "Tithi",
    lunarMonth: "Mondmonat",
    searchRange: "Suchbereich und Notizen",
    targetYears: "Finden Sie den dharmischen Geburtstag für das Jahr",
    notes: "Notizen oder Fragen",
    findBday: "Finde meinen dharmischen Geburtstag",
    select: "Wählen",
    selectTimezone: "Wählen Sie Zeitzone",
    footer: "Hergestellt mit ❤️ in Berlin von HaBER Software Solutions",
    cookieText: "Wir verwenden unbedingt erforderliche Cookies, um Sie angemeldet zu halten und Ihre Präferenzen zu speichern. Wir verwenden keine Tracking-Cookies.",
    privacyPolicy: "Datenschutzrichtlinie",
    gotIt: "Habe es",
    legalNotice: "Rechtlicher Hinweis",
    dashboardBtn: "Armaturenbrett",
    dashboardTitle: "Benutzer-Dashboard",
    saveDashboard: "Im Dashboard speichern",
    savedPermanently: "Dauerhaft gespeichert",
    terms: "Allgemeine Geschäftsbedingungen",
    imprint: "Impressum",
    appName: "FINDE MEINEN DHARMISCHEN GEBURTSTAG",
    subtitle1: "Präzisions-Panchang- und Tithi-Konverter",
    subtitle2: "Präzisions-Panchang- und Tithi-Konverter – Astrologische Bewertung",
    welcomeTitle: "Willkommen beim Panchang-Assistenten",
    welcomeDesc: "Geben Sie Ihre Geburtsdaten in das Feld ein und ich berechne den richtigen Dharma-Kalendertag, passend zu Tithi und Nakshatra, um Ihnen bei der Feier Ihres traditionellen Geburtstags zu helfen.",
    mapHint: "Sie können auf die Karte klicken, um Ihren Standort zu optimieren.",
    login: "Login",
    logout: "Abmelden",
    history: "Geschichte",
    syncHistory: "Melden Sie sich an, um den Verlauf zu synchronisieren",
    privacyNoticeTitle: "Datenschutzhinweis",
    privacyNoticeDesc: "Ihre astrologischen Daten werden nur für diese Sitzung verarbeitet und nicht dauerhaft gespeichert.",
    searchHistory: "Suchverlauf",
    locationPlaceholder: "z.B. Neu-Delhi, Indien",
    tooltipDate: "Wird verwendet, um den genauen Tag Ihrer Geburt im Gregorianischen Kalender zu berechnen.",
    tooltipTime: "Der Geburtszeitpunkt ist für die genaue Berechnung von Tithi und Nakshatra von entscheidender Bedeutung, da er sich im Laufe des Tages ändert.",
    tooltipPlace: "Sonnenaufgang und Mondphasen variieren je nach Standort. Geben Sie den Namen Ihrer Stadt oder Ihres Ortes ein. Wählen Sie eine Option aus oder geben Sie sie direkt ein.",
    tooltipTimezone: "Der lokale Zeitzonenversatz zum Zeitpunkt Ihrer Geburt. Hilft bei der Überprüfung der genauen Weltzeit.",
    tooltipNakshatra: "Der Geburtsstern oder die Mondvilla, die bei Ihrer Geburt vom Mond bewohnt wird.",
    tooltipPaksha: "Die zwei Wochen des Mondmonats. Shukla nimmt zu (hell), Krishna nimmt ab (dunkel).",
    tooltipTithi: "Der Mondtag. Entscheidend für die Feier traditioneller dharmischer Geburtstage.",
    tooltipMonth: "Der Mondmonat, in dem Sie geboren wurden (z. B. Chaitra, Vaishakha).",
    tooltipTargetYear: "Geben Sie das Jahr oder den Jahresbereich an, für den Sie Ihr traditionelles Geburtstagsdatum ermitteln möchten.",
    tooltipNotes: "Geben Sie spezielle Berechnungsmethoden (wie Amanta oder Purnimanta) an oder fügen Sie Kontext zu Ihrer Anfrage hinzu.",
    calculating: "Berechnen...",
    calculatingPanchang: "BERECHNUNG VON PANCHANG-AUSRICHTUNGEN...",
    targetYearPlaceholder: "z.B. 2026 oder 2025-2030",
    notesPlaceholder: "Spezifische Tradition (z. B. Amanta) oder Fragen?",
    slideTitle_req1: "1. Das Datum der Inkarnation",
    slideDesc_req1: "Ihr Geburtsdatum bestimmt Ihre Ankunft im Sonnenjahr und legt die Grundlage für Ihre kosmische Reise fest.",
    slideTitle_req2: "2. Der genaue Moment",
    slideDesc_req2: "Ihre Geburtszeit bestimmt die spezifische Mondphase und die genaue Position der Himmelskörper bei Ihrem ersten Atemzug.",
    slideTitle_req3: "3. Die irdischen Koordinaten",
    slideDesc_req3: "Ihr Geburtsort stellt den geografischen Anker dar und richtet die Himmelskarte auf Ihren genauen Standort auf der Erde aus.",
    slideTitle0: "Feiern Sie Ihre wahre kosmische Ankunft",
    slideDesc0: "Entdecken Sie Ihren genauen dharmischen Geburtstag basierend auf präziser vedischer Astrologie.",
    slideTitle1: "Die Weisheit der Alten",
    slideDesc1: "Unsere hochpräzisen Modelle nutzen alte Panchang-Berechnungen.",
    slideTitle2: "Eine himmlische Feier",
    slideDesc2: "Richten Sie Ihren besonderen Tag auf die authentischen kosmischen Rhythmen aus.",
    slideTitle3: "Heilige astrologische Mandalas",
    slideDesc3: "Verbinde dich tief mit den energetischen Mustern des Universums.",
    slideTitle4: "Ihr vedisches Geburtshoroskop",
    slideDesc4: "Entdecken Sie die Geheimnisse der wahren Reise Ihres Lebens.",
    slideTitle5: "Fröhliche Feste des Lichts",
    slideDesc5: "Genießen Sie die spirituelle Energie traditioneller Feste.",
    slideTitle6: "Heilige Feuer-Pujas",
    slideDesc6: "Harmonisieren Sie mit dem Göttlichen durch alte Feuerrituale.",
    slideTitle7: "Die mystische Mondreise",
    slideDesc7: "Folgen Sie dem Monddurchgang durch die heiligen Nakshatras.",
    slideTitle8: "Kosmisches Om und Lotus",
    slideDesc8: "Erwecke den inneren Frieden und die spirituelle Weisheit in dir.",
    slideTitle9: "Der traditionelle Panchang",
    slideDesc9: "Entdecken Sie die zeitlosen Rhythmen des hinduistischen Kalenders.",
    slideTitle10: "Ekstatische Kirtan-Freude",
    slideDesc10: "Erleben Sie die pure Glückseligkeit des Gemeindegesangs.",
    slideTitle11: "Aarti-Feierlichkeiten",
    slideDesc11: "Erhellen Sie Ihren Weg mit traditionellem Familien-Aarti.",
    slideTitle12: "Spirituelle Gelassenheit",
    slideDesc12: "Finden Sie inneren Frieden in der heiligen Atmosphäre des Tempels.",
    slideTitle13: "Vedisches Feuer-Yajna",
    slideDesc13: "Erhalten Sie göttlichen Segen durch uralte Feuerzeremonien.",
    slideTitle14: "Das Heilige Japa",
    slideDesc14: "Singen Sie die heiligen Namen und erwecken Sie Ihr spirituelles Bewusstsein.",
    testiText0: "Seitdem ich angefangen habe, meinen Geburtstag nach dem Dharma-Kalender zu feiern, habe ich eine tiefgreifende Veränderung in meiner Energie bemerkt. Es fühlt sich an, als ob sich das Universum auf mich ausrichtet! Es hat meinem Jahr unglaubliches Glück und Frieden gebracht.",
    testiAuthor0: "Rajesh K.",
    testiText1: "Ich habe immer am falschen Datum gefeiert! Der Gregorianische Kalender ist nur eine Zahl, aber die Ausrichtung von Tithi und Nakshatra bringt echte kosmische Segnungen. Die Feier meines wahren Dharma-Geburtstags öffnete Türen, die ich mir nie hätte vorstellen können.",
    testiAuthor1: "Priya S.",
    testiText2: "Diese App hat mir geholfen, meinen authentischen Geburtstag zu finden. Gleich im ersten Jahr, in dem ich meinen Dharma-Geburtstag feierte, erhielt ich eine lang erwartete Beförderung. Es ist mehr als nur ein Date; Es ist ein spiritueller Neustart.",
    testiAuthor2: "Amit P.",
    testiText3: "Endlich meinen richtigen Geburtstag gefunden! Der gregorianische Kalender kam mir unzusammenhängend vor, aber dieses dharmische Datum bringt mich meinen Wurzeln näher. Das Feiern mit einer Puja machte dieses Jahr etwas ganz Besonderes.",
    testiAuthor3: "Sneha M.",
    testiText4: "Was für eine schöne Art, sich wieder mit unseren Traditionen zu verbinden. Meine Familie feiert jetzt beide Termine, aber der dharmische Geburtstag fühlt sich spirituell viel erfüllender an.",
    testiAuthor4: "Vikram R.",
    testiText5: "Anfangs war ich skeptisch, aber die Genauigkeit der Nakshatra- und Tithi-Berechnungen ist unglaublich. Die Entdeckung meines kosmischen Geburtstages war eine wirklich augenöffnende Erfahrung.",
    testiAuthor5: "Aditi V.",
    testiText6: "Dieses Tool ist ein Segen! Ich versuche seit Jahren, meinen authentischen Hindu-Geburtstag herauszufinden. Die Feier fühlte sich zutiefst persönlich und vom Göttlichen gesegnet an.",
    testiAuthor6: "Karan D.",
    testiText7: "Als ISKCON-Anhänger kann ich meine spirituellen Praktiken perfekt aufeinander abstimmen, wenn ich meinen genauen dharmischen Geburtstag auf der Grundlage des Tithi kenne. Ein Muss für jeden spirituellen Suchenden.",
    testiAuthor7: "Anjali G.",
    testiText8: "Unsere Großeltern folgten immer dem Panchang, aber wir verloren den Kontakt. Diese App brachte diese schöne Tradition zu unserer Familie zurück. Die Freude an einem dharmischen Geburtstag ist unübertroffen.",
    testiAuthor8: "Rohit S.",
    testiText9: "Erstaunliche Erfahrung! Die Berechnungen sind präzise und das Feiern auf meinem Tithi fühlte sich unglaublich verheißungsvoll an. Die Energie an diesem Tag war einfach wunderbar.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "Die Herausforderung: Statische Sonnendaten vs. dynamische kosmische Rhythmen",
    heroCoreTitle: "Nur 3 Angaben erforderlich",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "Die Lösung: Präzise dharmische Ausrichtungen",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "Wer profitiert von diesem System?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "Warum unsere Methodik überlegen ist",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "Wichtiger Haftungsausschluss und Haftungsausschluss",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "Stellen Sie eine Folgefrage ...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
    underConstructionBtn: "Im Bau",
    guestLoginBtn: "Gast-Login",
    underConstructionTitle: "Im Bau",
    underConstructionDesc1: "Diese Anwendung wird derzeit erstellt.",
    underConstructionDesc2: "Wir entschuldigen uns aufrichtig für die Unannehmlichkeiten. Bitte schauen Sie später noch einmal vorbei.",
    password: "Passwort",
    loginBtn: "Login",
    incorrectPassword: "Falsches Passwort",
    showTip: "Tipp anzeigen",
    hideTip: "Tipp ausblenden",
    guestTip: "Tipp: Das Passwort lautet hari2",
    iAcceptThe: "Ich akzeptiere das",
    and: "Und",
    fillMandatory: "Bitte füllen Sie alle Pflichtfelder aus und akzeptieren Sie die Allgemeinen Geschäftsbedingungen",
    gender: "Geschlecht",
    male: "Männlich",
    female: "Weiblich",
    unspecified: "Nicht spezifiziert",
    targetYearsPlaceholder2: "Wählen Sie ein Jahr aus, um eine 5-Jahres-Prognose zu erhalten",
    authPrompt: "Bitte registrieren Sie sich oder melden Sie sich an, um auf diese Funktionen zuzugreifen. <br/><br/>Alternativ können Sie <b>Hari</b> kontaktieren, um das Passwort für den <b>Gast-Login</b> zu erhalten und auf alle Funktionen zuzugreifen.",
    emailLabel: "E-Mail",
    passwordLabel: "Passwort",
    createAccountBtn: "Benutzerkonto erstellen",
    signInEmailBtn: "Melden Sie sich mit E-Mail an",
    alreadyHaveAccount: "Sie haben bereits ein Konto?",
    dontHaveAccount: "Sie haben noch kein Konto?",
    logInToggle: "Einloggen",
    signUpToggle: "Melden Sie sich an",
    orText: "Oder",
    continueGithub: "Fahren Sie mit GitHub fort",
    contactHari: "Bitte wenden Sie sich an <b>Hari</b>, um das Passwort für die Gastanmeldung zu erhalten.",
  },
  HI: {
    birthDetails: "जन्म विवरण",
    birthDate: "जन्म तिथि",
    birthTime: "जन्म समय",
    birthPlace: "जन्म स्थान",
    timezone: "समयक्षेत्र",
    tradData: "पारंपरिक डेटा (ब्रह्मांडीय खाका)",
    tradDataHint: "सहायक संकेत: यदि आप नीचे दिए गए इन 4 विवरणों (नक्षत्र, पक्ष, तिथि और चंद्र माह) को जानते हैं, तो आप उनका चयन कर सकते हैं। अन्यथा, उन्हें 'लेट हैरीजीपीटी कैलकुलेट' (डिफ़ॉल्ट विकल्प) के रूप में छोड़ दें, और हमारे उच्च-प्रदर्शन वाले एआई मॉडल आपकी जन्म तिथि, समय और स्थान का उपयोग करके आपके लिए इन विवरणों की सटीक गणना करेंगे!",
    letHariGptCalculate: "हरीजीपीटी को गणना करने दें",
    nakshatra: "नक्षत्र",
    paksha: "Paksha",
    tithi: "तिथि",
    lunarMonth: "चंद्र मास",
    searchRange: "खोज रेंज और नोट्स",
    targetYears: "वर्ष के लिए धार्मिक जन्मदिन खोजें",
    notes: "नोट्स या प्रश्न",
    findBday: "मेरा धार्मिक जन्मदिन ढूंढें",
    select: "चुनना",
    selectTimezone: "समयक्षेत्र चुनें",
    footer: "HaBER सॉफ्टवेयर सॉल्यूशंस द्वारा बर्लिन में ❤️ के साथ बनाया गया",
    cookieText: "हम आपको लॉग इन रखने और आपकी प्राथमिकताओं को सहेजने के लिए आवश्यक कुकीज़ का उपयोग करते हैं। हम ट्रैकिंग कुकीज़ का उपयोग नहीं करते.",
    privacyPolicy: "गोपनीयता नीति",
    gotIt: "समझ गया",
    legalNotice: "कानूनी नोटिस",
    dashboardBtn: "डैशबोर्ड",
    dashboardTitle: "उपयोगकर्ता डैशबोर्ड",
    saveDashboard: "डैशबोर्ड में सहेजें",
    savedPermanently: "स्थायी रूप से सहेजा गया",
    terms: "नियम एवं शर्तें",
    imprint: "छाप",
    appName: "मेरा धार्मिक जन्मदिन ढूंढें",
    subtitle1: "सटीक पंचांग और तिथि परिवर्तक",
    subtitle2: "सटीक पंचांग और तिथि परिवर्तक - ज्योतिषीय मूल्यांकन",
    welcomeTitle: "पंचांग सहायक में आपका स्वागत है",
    welcomeDesc: "पैनल में अपना जन्म विवरण दर्ज करें और मैं आपका पारंपरिक जन्मदिन मनाने में मदद करने के लिए तिथि और नक्षत्र से मेल खाते हुए सही धार्मिक कैलेंडर दिन की गणना करूंगा।",
    mapHint: "आप अपने स्थान को बेहतर बनाने के लिए मानचित्र पर क्लिक कर सकते हैं।",
    login: "लॉग इन करें",
    logout: "लॉग आउट",
    history: "इतिहास",
    syncHistory: "इतिहास सिंक करने के लिए लॉगिन करें",
    privacyNoticeTitle: "गोपनीयता सूचना",
    privacyNoticeDesc: "आपका ज्योतिषीय डेटा केवल इस सत्र के लिए संसाधित किया गया है और स्थायी रूप से संग्रहीत नहीं किया जाएगा।",
    searchHistory: "खोज इतिहास",
    locationPlaceholder: "जैसे नई दिल्ली, भारत",
    tooltipDate: "ग्रेगोरियन कैलेंडर में आपके जन्म के सटीक दिन की गणना करने के लिए उपयोग किया जाता है।",
    tooltipTime: "सटीक तिथि और नक्षत्र गणना के लिए जन्म का समय महत्वपूर्ण है, क्योंकि वे पूरे दिन बदलते रहते हैं।",
    tooltipPlace: "सूर्योदय और चंद्रमा के चरण स्थान के अनुसार भिन्न-भिन्न होते हैं। अपने शहर या कस्बे का नाम दर्ज करें. कोई विकल्प चुनें या सीधे टाइप करें.",
    tooltipTimezone: "आपके जन्म के समय स्थानीय समयक्षेत्र ऑफसेट होता है। सटीक सार्वभौमिक समय को सत्यापित करने में मदद करता है।",
    tooltipNakshatra: "आपके जन्म के समय चंद्रमा द्वारा कब्जा किया गया जन्म तारा या चंद्र हवेली।",
    tooltipPaksha: "चन्द्र मास का पखवाड़ा। शुक्ल बढ़ रहे हैं (उज्ज्वल), कृष्ण क्षीण (काले) हो रहे हैं।",
    tooltipTithi: "चंद्र दिवस. पारंपरिक धार्मिक जन्मदिन मनाने के लिए महत्वपूर्ण।",
    tooltipMonth: "वह चंद्र महीना जिसमें आपका जन्म हुआ (जैसे, चैत्र, वैशाख)।",
    tooltipTargetYear: "वह वर्ष या वर्षों की सीमा निर्दिष्ट करें जिसके लिए आप अपनी पारंपरिक जन्मदिन की तारीख खोजना चाहते हैं।",
    tooltipNotes: "विशेष गणना पद्धतियाँ निर्दिष्ट करें (जैसे अमान्त या पूर्णिमान्त) या अपनी पूछताछ में संदर्भ जोड़ें।",
    calculating: "हिसाब लगाया जा रहा है...",
    calculatingPanchang: "पंचांग संरेखण की गणना...",
    targetYearPlaceholder: "जैसे 2026 या 2025-2030",
    notesPlaceholder: "विशिष्ट परंपरा (जैसे अमंता) या प्रश्न?",
    slideTitle_req1: "1. अवतार की तिथि",
    slideDesc_req1: "आपकी जन्मतिथि सौर वर्ष के भीतर आपके आगमन को इंगित करती है, जो आपकी ब्रह्मांडीय यात्रा के लिए आधार रेखा निर्धारित करती है।",
    slideTitle_req2: "2. सटीक क्षण",
    slideDesc_req2: "आपका जन्म समय विशिष्ट चंद्र चरण और आपकी पहली सांस में आकाशीय पिंडों की सटीक स्थिति निर्धारित करता है।",
    slideTitle_req3: "3. सांसारिक निर्देशांक",
    slideDesc_req3: "आपका जन्म स्थान भौगोलिक आधार प्रदान करता है, जो आकाशीय मानचित्र को पृथ्वी पर आपके सटीक स्थान के साथ संरेखित करता है।",
    slideTitle0: "अपने सच्चे ब्रह्मांडीय आगमन का जश्न मनाएं",
    slideDesc0: "सटीक वैदिक ज्योतिष के आधार पर अपना सटीक धार्मिक जन्मदिन खोजें।",
    slideTitle1: "पूर्वजों की बुद्धि",
    slideDesc1: "हमारे उच्च परिशुद्धता मॉडल प्राचीन पंचांग गणनाओं का उपयोग करते हैं।",
    slideTitle2: "एक दिव्य उत्सव",
    slideDesc2: "अपने विशेष दिन को प्रामाणिक ब्रह्मांडीय लय के साथ संरेखित करें।",
    slideTitle3: "पवित्र ज्योतिष मंडल",
    slideDesc3: "ब्रह्मांड के ऊर्जावान पैटर्न के साथ गहराई से जुड़ें।",
    slideTitle4: "आपकी वैदिक जन्म कुंडली",
    slideDesc4: "अपने जीवन की सच्ची यात्रा के रहस्यों को खोलें।",
    slideTitle5: "प्रकाश के आनंदमय त्यौहार",
    slideDesc5: "पारंपरिक उत्सवों की आध्यात्मिक ऊर्जा को अपनाएं।",
    slideTitle6: "पवित्र अग्नि पूजा",
    slideDesc6: "प्राचीन अग्नि अनुष्ठानों के माध्यम से परमात्मा के साथ सामंजस्य स्थापित करें।",
    slideTitle7: "रहस्यमय चंद्र यात्रा",
    slideDesc7: "पवित्र नक्षत्रों के माध्यम से चंद्रमा के पारगमन का पालन करें।",
    slideTitle8: "लौकिक ओम और कमल",
    slideDesc8: "भीतर की शांति और आध्यात्मिक ज्ञान को जागृत करें।",
    slideTitle9: "पारंपरिक पंचांग",
    slideDesc9: "हिंदू कैलेंडर की शाश्वत लय को उजागर करें।",
    slideTitle10: "परमानंद कीर्तन आनंद",
    slideDesc10: "सामूहिक जप के शुद्ध आनंद का अनुभव करें।",
    slideTitle11: "आरती उत्सव",
    slideDesc11: "पारंपरिक पारिवारिक आरती से अपना मार्ग रोशन करें।",
    slideTitle12: "आध्यात्मिक शांति",
    slideDesc12: "मंदिर के पवित्र वातावरण में आंतरिक शांति पाएं।",
    slideTitle13: "वैदिक अग्नि यज्ञ",
    slideDesc13: "प्राचीन अग्नि अनुष्ठानों के माध्यम से दिव्य आशीर्वाद प्राप्त करें।",
    slideTitle14: "पवित्र जप",
    slideDesc14: "पवित्र नामों का जाप करें और अपनी आध्यात्मिक चेतना जागृत करें।",
    testiText0: "जब से मैंने अपना जन्मदिन धार्मिक कैलेंडर के अनुसार मनाना शुरू किया है, मैंने अपनी ऊर्जा में गहरा बदलाव देखा है। ऐसा महसूस होता है जैसे ब्रह्मांड मेरे साथ संरेखित हो रहा है! यह मेरे वर्ष में अविश्वसनीय भाग्य और शांति लेकर आया।",
    testiAuthor0: "Rajesh K.",
    testiText1: "मैं हमेशा गलत तारीख पर जश्न मना रहा था! ग्रेगोरियन कैलेंडर सिर्फ एक संख्या है, लेकिन तिथि और नक्षत्र का संरेखण वास्तविक लौकिक आशीर्वाद लाता है। मेरे सच्चे धार्मिक जन्मदिन का जश्न मनाने से ऐसे दरवाजे खुल गए जिनकी मैंने कभी कल्पना भी नहीं की थी।",
    testiAuthor1: "Priya S.",
    testiText2: "इस ऐप ने मुझे अपना प्रामाणिक जन्मदिन ढूंढने में मदद की। पहले ही वर्ष जब मैंने अपना धार्मिक जन्मदिन मनाया, मुझे लंबे समय से प्रतीक्षित पदोन्नति मिल गई। यह सिर्फ एक तारीख से कहीं अधिक है; यह एक आध्यात्मिक रीसेट है.",
    testiAuthor2: "Amit P.",
    testiText3: "आख़िरकार मेरा असली जन्मदिन मिल गया! ग्रेगोरियन कैलेंडर से जुड़ाव महसूस नहीं हुआ, लेकिन यह धार्मिक तिथि मुझे अपनी जड़ों के करीब लाती है। पूजा के साथ जश्न मनाना इस साल को बहुत खास बना देता है।",
    testiAuthor3: "Sneha M.",
    testiText4: "हमारी परंपराओं के साथ फिर से जुड़ने का यह एक सुंदर तरीका है। मेरा परिवार अब दोनों तिथियों को मनाता है, लेकिन धार्मिक जन्मदिन आध्यात्मिक रूप से बहुत अधिक संतुष्टिदायक लगता है।",
    testiAuthor4: "Vikram R.",
    testiText5: "पहले तो मुझे संदेह हुआ, लेकिन नक्षत्र और तिथि गणना की सटीकता अविश्वसनीय है। मेरा लौकिक जन्मदिन ढूँढ़ना सचमुच आँखें खोल देने वाला अनुभव था।",
    testiAuthor5: "Aditi V.",
    testiText6: "यह उपकरण एक वरदान है! मैं वर्षों से अपने प्रामाणिक हिंदू जन्मदिन का पता लगाने की कोशिश कर रहा हूं। यह उत्सव अत्यंत व्यक्तिगत और दैवीय आशीर्वाद वाला लगा।",
    testiAuthor6: "Karan D.",
    testiText7: "एक इस्कॉन भक्त के रूप में, तिथि के आधार पर मेरा सटीक धार्मिक जन्मदिन जानने से मुझे अपनी आध्यात्मिक प्रथाओं को पूरी तरह से संरेखित करने की अनुमति मिलती है। प्रत्येक आध्यात्मिक साधक के लिए यह अवश्य होना चाहिए।",
    testiAuthor7: "Anjali G.",
    testiText8: "हमारे दादा-दादी हमेशा पंचांग का पालन करते थे, लेकिन हमारा संपर्क टूट गया। यह ऐप उस खूबसूरत परंपरा को हमारे परिवार में वापस ले आया। धार्मिक जन्मदिन का आनंद अद्वितीय है।",
    testiAuthor8: "Rohit S.",
    testiText9: "अद्भुत अनुभव! गणनाएँ सटीक हैं, और मेरी तिथि पर उत्सव मनाना अविश्वसनीय रूप से शुभ लगा। उस दिन की ऊर्जा बिल्कुल अद्भुत थी।",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "चुनौती: स्थैतिक सौर तिथियाँ बनाम गतिशील ब्रह्मांडीय लय",
    heroCoreTitle: "केवल 3 विवरण आवश्यक हैं",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "समाधान: सटीक धार्मिक संरेखण",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "इस प्रणाली से किसे लाभ होता है?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "हमारी कार्यप्रणाली श्रेष्ठ क्यों है?",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "महत्वपूर्ण कानूनी एवं दायित्व अस्वीकरण",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "एक अनुवर्ती प्रश्न पूछें...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
    underConstructionBtn: "निर्माणाधीन",
    guestLoginBtn: "मेहमान लॉगइन करें",
    underConstructionTitle: "निर्माणाधीन",
    underConstructionDesc1: "यह एप्लिकेशन अभी बनाया जा रहा है.",
    underConstructionDesc2: "असुविधा के लिए हम ईमानदारी से क्षमा मांगते हैं। कृपया फिर से बाद में जाँच करें।",
    password: "पासवर्ड",
    loginBtn: "लॉग इन करें",
    incorrectPassword: "गलत पासवर्ड",
    showTip: "टिप दिखाएँ",
    hideTip: "टिप छिपाएँ",
    guestTip: "युक्ति: पासवर्ड hari2 है",
    iAcceptThe: "मुझे स्वीकार है",
    and: "और",
    fillMandatory: "कृपया सभी अनिवार्य फ़ील्ड भरें और नियम एवं शर्तें स्वीकार करें",
    gender: "लिंग",
    male: "पुरुष",
    female: "महिला",
    unspecified: "अनिर्दिष्ट",
    targetYearsPlaceholder2: "5-वर्षीय प्रोजेक्शन प्राप्त करने के लिए एक वर्ष का चयन करें",
    authPrompt: "इन सुविधाओं तक पहुंचने के लिए कृपया साइन अप करें या लॉग इन करें। <br/><br/>वैकल्पिक रूप से, सभी सुविधाओं तक पहुंचने के लिए <b>अतिथि लॉगिन</b> दर्ज करने के लिए पासवर्ड के लिए <b>हरि</b> से संपर्क करें।",
    emailLabel: "ईमेल",
    passwordLabel: "पासवर्ड",
    createAccountBtn: "खाता बनाएं",
    signInEmailBtn: "ईमेल से साइन इन करें",
    alreadyHaveAccount: "क्या आपके पास पहले से एक खाता मौजूद है?",
    dontHaveAccount: "कोई खाता नहीं है?",
    logInToggle: "लॉग इन करें",
    signUpToggle: "साइन अप करें",
    orText: "या",
    continueGithub: "GitHub के साथ जारी रखें",
    contactHari: "अतिथि लॉगिन दर्ज करने के लिए पासवर्ड के लिए कृपया <b>हरि</b> से संपर्क करें।",
  },
  TE: {
    birthDetails: "జనన వివరాలు",
    birthDate: "పుట్టిన తేదీ",
    birthTime: "పుట్టిన సమయం",
    birthPlace: "పుట్టిన ప్రదేశం",
    timezone: "సమయమండలి",
    tradData: "సాంప్రదాయ డేటా (కాస్మిక్ బ్లూప్రింట్)",
    tradDataHint: "సహాయకరమైన సూచన: దిగువన ఉన్న ఈ 4 వివరాలు (నక్షత్రం, పక్షం, తిథి మరియు చంద్ర మాసం) మీకు తెలిస్తే, మీరు వాటిని ఎంచుకోవచ్చు. లేకపోతే, వాటిని 'Let HariGPT లెక్కింపు' (డిఫాల్ట్ ఎంపిక)గా వదిలివేయండి మరియు మా అధిక-పనితీరు గల AI మోడల్‌లు మీ పుట్టిన తేదీ, సమయం మరియు స్థలాన్ని ఉపయోగించి మీ కోసం ఈ వివరాలను ఖచ్చితంగా గణిస్తాయి!",
    letHariGptCalculate: "హరిజిపిటిని లెక్కించనివ్వండి",
    nakshatra: "నక్షత్రం",
    paksha: "పక్ష",
    tithi: "తిథి",
    lunarMonth: "చంద్ర మాసం",
    searchRange: "శోధన పరిధి & గమనికలు",
    targetYears: "సంవత్సరానికి ధార్మిక పుట్టినరోజును కనుగొనండి",
    notes: "గమనికలు లేదా ప్రశ్నలు",
    findBday: "నా ధార్మిక పుట్టినరోజును కనుగొనండి",
    select: "ఎంచుకోండి",
    selectTimezone: "టైమ్‌జోన్‌ని ఎంచుకోండి",
    footer: "HaBER సాఫ్ట్‌వేర్ సొల్యూషన్స్ ద్వారా బెర్లిన్‌లో ❤️తో తయారు చేయబడింది",
    cookieText: "మిమ్మల్ని లాగిన్ చేయడానికి మరియు మీ ప్రాధాన్యతలను సేవ్ చేయడానికి మేము అవసరమైన కుక్కీలను ఉపయోగిస్తాము. మేము ట్రాకింగ్ కుక్కీలను ఉపయోగించము.",
    privacyPolicy: "గోప్యతా విధానం",
    gotIt: "అర్థమైంది",
    legalNotice: "లీగల్ నోటీసు",
    dashboardBtn: "డాష్‌బోర్డ్",
    dashboardTitle: "వినియోగదారు డాష్‌బోర్డ్",
    saveDashboard: "డాష్‌బోర్డ్‌లో సేవ్ చేయండి",
    savedPermanently: "శాశ్వతంగా సేవ్ చేయబడింది",
    terms: "నిబంధనలు & షరతులు",
    imprint: "ముద్రించు",
    appName: "నా ధార్మిక పుట్టినరోజును కనుగొనండి",
    subtitle1: "ఖచ్చితమైన పంచాంగ్ & తిథి కన్వర్టర్",
    subtitle2: "ఖచ్చితమైన పంచాంగ్ & తిథి కన్వర్టర్ - జ్యోతిషశాస్త్ర అంచనా",
    welcomeTitle: "పంచాంగ్ అసిస్టెంట్‌కి స్వాగతం",
    welcomeDesc: "ప్యానెల్‌లో మీ జన్మ వివరాలను నమోదు చేయండి మరియు మీ సాంప్రదాయ పుట్టినరోజును జరుపుకోవడంలో మీకు సహాయపడటానికి నేను సరైన ధార్మిక క్యాలెండర్ రోజును, తిథి మరియు నక్షత్రానికి సరిపోలే రోజుని గణిస్తాను.",
    mapHint: "మీరు మీ స్థానాన్ని చక్కగా ట్యూన్ చేయడానికి మ్యాప్‌పై క్లిక్ చేయవచ్చు.",
    login: "లాగిన్ చేయండి",
    logout: "లాగ్అవుట్",
    history: "చరిత్ర",
    syncHistory: "సమకాలీకరణ చరిత్రకు లాగిన్ చేయండి",
    privacyNoticeTitle: "గోప్యతా నోటీసు",
    privacyNoticeDesc: "మీ జ్యోతిష్య డేటా ఈ సెషన్ కోసం మాత్రమే ప్రాసెస్ చేయబడుతుంది మరియు శాశ్వతంగా నిల్వ చేయబడదు.",
    searchHistory: "శోధన చరిత్ర",
    locationPlaceholder: "ఉదా న్యూఢిల్లీ, భారతదేశం",
    tooltipDate: "గ్రెగోరియన్ క్యాలెండర్‌లో మీ పుట్టిన తేదీని గణించడానికి ఉపయోగించబడుతుంది.",
    tooltipTime: "ఖచ్చితమైన తిథి మరియు నక్షత్ర గణనకు పుట్టిన సమయం చాలా కీలకం, ఎందుకంటే అవి రోజంతా మారుతూ ఉంటాయి.",
    tooltipPlace: "సూర్యోదయం మరియు చంద్రుని దశలు స్థానాన్ని బట్టి మారుతూ ఉంటాయి. మీ నగరం లేదా పట్టణం పేరును నమోదు చేయండి. ఎంపికను ఎంచుకోండి లేదా నేరుగా టైప్ చేయండి.",
    tooltipTimezone: "మీరు పుట్టిన సమయంలో స్థానిక సమయమండలి ఆఫ్‌సెట్. ఖచ్చితమైన సార్వత్రిక సమయాన్ని ధృవీకరించడంలో సహాయపడుతుంది.",
    tooltipNakshatra: "మీ జన్మలో చంద్రుడు ఆక్రమించిన జన్మ నక్షత్రం లేదా చంద్ర భవనం.",
    tooltipPaksha: "చాంద్రమానం యొక్క పక్షం. శుక్ల వాక్సింగ్ (ప్రకాశం), కృష్ణుడు క్షీణిస్తున్నాడు (చీకటి).",
    tooltipTithi: "చంద్రుని రోజు. సాంప్రదాయ ధార్మిక పుట్టినరోజులను జరుపుకోవడానికి కీలకం.",
    tooltipMonth: "మీరు పుట్టిన చంద్ర మాసం (ఉదా. చైత్ర, వైశాఖ).",
    tooltipTargetYear: "మీరు మీ సాంప్రదాయ పుట్టినరోజు తేదీని కనుగొనాలనుకుంటున్న సంవత్సరం లేదా సంవత్సరాల పరిధిని పేర్కొనండి.",
    tooltipNotes: "ప్రత్యేక గణన పద్ధతులను పేర్కొనండి (అమంత లేదా పూర్ణిమంత వంటివి) లేదా మీ విచారణకు సందర్భాన్ని జోడించండి.",
    calculating: "లెక్కిస్తోంది...",
    calculatingPanchang: "పంచాంగ అమరికలను గణిస్తోంది...",
    targetYearPlaceholder: "ఉదా 2026 లేదా 2025-2030",
    notesPlaceholder: "నిర్దిష్ట సంప్రదాయం (ఉదా. అమంటా) లేదా ప్రశ్నలు?",
    slideTitle_req1: "1. అవతారం యొక్క తేదీ",
    slideDesc_req1: "మీ పుట్టిన తేదీ సౌర సంవత్సరంలో మీ రాకను సూచిస్తుంది, మీ విశ్వ ప్రయాణానికి ఆధారాన్ని సెట్ చేస్తుంది.",
    slideTitle_req2: "2. ఖచ్చితమైన క్షణం",
    slideDesc_req2: "మీ పుట్టిన సమయం నిర్దిష్ట చంద్ర దశను మరియు మీ మొదటి శ్వాస సమయంలో ఖగోళ వస్తువుల యొక్క ఖచ్చితమైన స్థానాన్ని నిర్ణయిస్తుంది.",
    slideTitle_req3: "3. ఎర్త్లీ కోఆర్డినేట్స్",
    slideDesc_req3: "మీ జన్మస్థలం భౌగోళిక యాంకర్‌ను అందిస్తుంది, ఖగోళ మ్యాప్‌ను భూమిపై మీ ఖచ్చితమైన స్థానానికి సమలేఖనం చేస్తుంది.",
    slideTitle0: "మీ నిజమైన కాస్మిక్ రాకను జరుపుకోండి",
    slideDesc0: "ఖచ్చితమైన వేద జ్యోతిష్యం ఆధారంగా మీ ఖచ్చితమైన ధార్మిక పుట్టినరోజును కనుగొనండి.",
    slideTitle1: "ప్రాచీనుల జ్ఞానం",
    slideDesc1: "మా హై-ప్రెసిషన్ మోడల్‌లు పురాతన పంచాంగ్ లెక్కలను ఉపయోగిస్తాయి.",
    slideTitle2: "ఒక ఖగోళ వేడుక",
    slideDesc2: "మీ ప్రత్యేక రోజును ప్రామాణికమైన కాస్మిక్ రిథమ్‌లతో సమలేఖనం చేయండి.",
    slideTitle3: "పవిత్ర జ్యోతిష్య మండలాలు",
    slideDesc3: "విశ్వం యొక్క శక్తివంతమైన నమూనాలతో లోతుగా కనెక్ట్ అవ్వండి.",
    slideTitle4: "మీ వేద బర్త్ చార్ట్",
    slideDesc4: "మీ జీవితపు నిజమైన ప్రయాణం యొక్క రహస్యాలను అన్‌లాక్ చేయండి.",
    slideTitle5: "కాంతి యొక్క సంతోషకరమైన పండుగలు",
    slideDesc5: "సాంప్రదాయ వేడుకల ఆధ్యాత్మిక శక్తిని స్వీకరించండి.",
    slideTitle6: "పవిత్ర అగ్ని పూజలు",
    slideDesc6: "పురాతన అగ్ని ఆచారాల ద్వారా దైవంతో సమన్వయం చేసుకోండి.",
    slideTitle7: "ది మిస్టికల్ లూనార్ జర్నీ",
    slideDesc7: "పవిత్ర నక్షత్రాల ద్వారా చంద్రుని రవాణాను అనుసరించండి.",
    slideTitle8: "కాస్మిక్ ఓం & కమలం",
    slideDesc8: "అంతర్గత శాంతి మరియు ఆధ్యాత్మిక జ్ఞానాన్ని మేల్కొల్పండి.",
    slideTitle9: "సాంప్రదాయ పంచాంగ్",
    slideDesc9: "హిందూ క్యాలెండర్ యొక్క టైమ్లెస్ లయలను వెలికితీయండి.",
    slideTitle10: "పారవశ్య కీర్తన జాయ్",
    slideDesc10: "సమ్మేళన జపం యొక్క స్వచ్ఛమైన ఆనందాన్ని అనుభవించండి.",
    slideTitle11: "ఆరతి వేడుకలు",
    slideDesc11: "సాంప్రదాయ కుటుంబ ఆర్తితో మీ మార్గాన్ని ప్రకాశవంతం చేయండి.",
    slideTitle12: "ఆధ్యాత్మిక ప్రశాంతత",
    slideDesc12: "ఆలయ పవిత్ర వాతావరణంలో అంతర్గత శాంతిని కనుగొనండి.",
    slideTitle13: "వైదిక అగ్ని యజ్ఞం",
    slideDesc13: "పురాతన అగ్ని వేడుకల ద్వారా దైవిక ఆశీర్వాదాలు పొందండి.",
    slideTitle14: "పవిత్ర జపం",
    slideDesc14: "పవిత్ర నామాలను జపించండి మరియు మీ ఆధ్యాత్మిక స్పృహను మేల్కొల్పండి.",
    testiText0: "నేను ధార్మిక క్యాలెండర్ ప్రకారం నా పుట్టినరోజును జరుపుకోవడం ప్రారంభించినప్పటి నుండి, నా శక్తిలో తీవ్ర మార్పును గమనించాను. విశ్వం నాతో కలిసిపోతున్నట్లు అనిపిస్తుంది! ఇది నా సంవత్సరానికి అద్భుతమైన అదృష్టాన్ని మరియు శాంతిని తెచ్చిపెట్టింది.",
    testiAuthor0: "Rajesh K.",
    testiText1: "నేను ఎప్పుడూ తప్పు తేదీలో జరుపుకుంటాను! గ్రెగోరియన్ క్యాలెండర్ కేవలం ఒక సంఖ్య, కానీ తిథి మరియు నక్షత్రాల అమరిక నిజమైన విశ్వ ఆశీర్వాదాలను తెస్తుంది. నా నిజమైన ధార్మిక పుట్టినరోజును జరుపుకోవడం నేను ఊహించని తలుపులు తెరిచింది.",
    testiAuthor1: "Priya S.",
    testiText2: "ఈ యాప్ నా నిజమైన పుట్టినరోజును కనుగొనడంలో నాకు సహాయపడింది. నేను నా ధార్మిక పుట్టినరోజు జరుపుకున్న మొదటి సంవత్సరం, నేను చాలా కాలంగా ఎదురుచూస్తున్న ప్రమోషన్ పొందాను. ఇది కేవలం తేదీ కంటే ఎక్కువ; ఇది ఆధ్యాత్మిక రీసెట్.",
    testiAuthor2: "Amit P.",
    testiText3: "చివరకు నా నిజమైన పుట్టినరోజు దొరికింది! గ్రెగోరియన్ క్యాలెండర్ డిస్‌కనెక్ట్ అయినట్లు అనిపించింది, కానీ ఈ ధార్మిక తేదీ నన్ను నా మూలాలకు దగ్గరగా తీసుకువస్తుంది. ఈ సంవత్సరం చాలా ప్రత్యేకమైన పూజతో జరుపుకుంటారు.",
    testiAuthor3: "Sneha M.",
    testiText4: "మన సంప్రదాయాలతో తిరిగి కనెక్ట్ కావడానికి చాలా అందమైన మార్గం. నా కుటుంబం ఇప్పుడు రెండు తేదీలను జరుపుకుంటుంది, కానీ ధార్మిక పుట్టినరోజు చాలా ఆధ్యాత్మికంగా సంతృప్తికరంగా ఉంది.",
    testiAuthor4: "Vikram R.",
    testiText5: "నాకు మొదట సందేహం కలిగింది, కానీ నక్షత్రం మరియు తిథి లెక్కల ఖచ్చితత్వం నమ్మశక్యం కాదు. నా విశ్వ జన్మదినాన్ని కనుగొనడం నిజంగా కళ్లు తెరిచే అనుభవం.",
    testiAuthor5: "Aditi V.",
    testiText6: "ఈ సాధనం ఒక ఆశీర్వాదం! నేను చాలా సంవత్సరాలుగా నా నిజమైన హిందూ పుట్టినరోజును గుర్తించడానికి ప్రయత్నిస్తున్నాను. వేడుక చాలా వ్యక్తిగతమైనది మరియు దైవిక ఆశీర్వాదం పొందింది.",
    testiAuthor6: "Karan D.",
    testiText7: "ఇస్కాన్ భక్తుడిగా, తిథి ఆధారంగా నా ఖచ్చితమైన ధార్మిక పుట్టినరోజును తెలుసుకోవడం నా ఆధ్యాత్మిక అభ్యాసాలను సంపూర్ణంగా సమలేఖనం చేయడానికి అనుమతిస్తుంది. ప్రతి ఆధ్యాత్మిక అన్వేషకుడికి తప్పనిసరిగా ఉండవలసినది.",
    testiAuthor7: "Anjali G.",
    testiText8: "మా తాతలు ఎప్పుడూ పంచాంగ్‌ని అనుసరిస్తారు, కానీ మేము సంబంధాన్ని కోల్పోయాము. ఈ యాప్ ఆ అందమైన సంప్రదాయాన్ని మా కుటుంబానికి తిరిగి తీసుకొచ్చింది. ధార్మిక జన్మదినం యొక్క ఆనందం సాటిలేనిది.",
    testiAuthor8: "Rohit S.",
    testiText9: "అద్భుతమైన అనుభవం! లెక్కలు ఖచ్చితంగా ఉన్నాయి మరియు నా తిథిని జరుపుకోవడం చాలా శుభప్రదంగా అనిపించింది. ఆ రోజు శక్తి కేవలం అద్భుతమైనది.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "ఛాలెంజ్: స్టాటిక్ సోలార్ డేట్స్ vs. డైనమిక్ కాస్మిక్ రిథమ్స్",
    heroCoreTitle: "కేవలం 3 వివరాలు మాత్రమే అవసరం",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "పరిష్కారం: ఖచ్చితమైన ధార్మిక అమరికలు",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "ఈ వ్యవస్థ నుండి ఎవరు ప్రయోజనం పొందుతారు?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "మన పద్దతి ఎందుకు ఉన్నతమైనది",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "ముఖ్యమైన చట్టపరమైన & బాధ్యత నిరాకరణ",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "తదుపరి ప్రశ్న అడగండి...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
    underConstructionBtn: "నిర్మాణంలో ఉంది",
    guestLoginBtn: "అతిథి లాగిన్",
    underConstructionTitle: "నిర్మాణంలో ఉంది",
    underConstructionDesc1: "ఈ అప్లికేషన్ ప్రస్తుతం నిర్మించబడుతోంది.",
    underConstructionDesc2: "అసౌకర్యానికి మేము హృదయపూర్వకంగా క్షమాపణలు కోరుతున్నాము. దయచేసి తర్వాత తిరిగి తనిఖీ చేయండి.",
    password: "పాస్వర్డ్",
    loginBtn: "లాగిన్ చేయండి",
    incorrectPassword: "పాస్‌వర్డ్ తప్పు",
    showTip: "చిట్కా చూపించు",
    hideTip: "చిట్కాను దాచండి",
    guestTip: "చిట్కా: పాస్‌వర్డ్ హరి2",
    iAcceptThe: "నేను అంగీకరిస్తున్నాను",
    and: "మరియు",
    fillMandatory: "దయచేసి అన్ని తప్పనిసరి ఫీల్డ్‌లను పూరించండి మరియు నిబంధనలు మరియు షరతులను అంగీకరించండి",
    gender: "లింగం",
    male: "పురుషుడు",
    female: "స్త్రీ",
    unspecified: "పేర్కొనబడలేదు",
    targetYearsPlaceholder2: "5 సంవత్సరాల ప్రొజెక్షన్ పొందడానికి ఒక సంవత్సరాన్ని ఎంచుకోండి",
    authPrompt: "దయచేసి ఈ లక్షణాలను యాక్సెస్ చేయడానికి సైన్ అప్ చేయండి లేదా లాగిన్ చేయండి. <br/><br/>ప్రత్యామ్నాయంగా, అన్ని లక్షణాలను యాక్సెస్ చేయడానికి <b>అతిథి లాగిన్</b>ని నమోదు చేయడానికి పాస్‌వర్డ్ కోసం <b>హరి</b>ని సంప్రదించండి.",
    emailLabel: "ఇమెయిల్",
    passwordLabel: "పాస్వర్డ్",
    createAccountBtn: "ఖాతాను సృష్టించండి",
    signInEmailBtn: "ఇమెయిల్‌తో సైన్ ఇన్ చేయండి",
    alreadyHaveAccount: "ఇప్పటికే ఖాతా ఉందా?",
    dontHaveAccount: "ఖాతా లేదా?",
    logInToggle: "లాగిన్ చేయండి",
    signUpToggle: "సైన్ అప్ చేయండి",
    orText: "లేదా",
    continueGithub: "GitHubతో కొనసాగించండి",
    contactHari: "దయచేసి అతిథి లాగిన్‌ని నమోదు చేయడానికి పాస్‌వర్డ్ కోసం <b>హరి</b>ని సంప్రదించండి.",
  },
  PA: {
    birthDetails: "ਜਨਮ ਵੇਰਵੇ",
    birthDate: "ਜਨਮ ਮਿਤੀ",
    birthTime: "ਜਨਮ ਦਾ ਸਮਾਂ",
    birthPlace: "ਜਨਮ ਸਥਾਨ",
    timezone: "ਸਮਾਂ ਖੇਤਰ",
    tradData: "ਰਵਾਇਤੀ ਡੇਟਾ (ਬ੍ਰਹਿਮੰਡੀ ਬਲੂਪ੍ਰਿੰਟ)",
    tradDataHint: "ਮਦਦਗਾਰ ਸੰਕੇਤ: ਜੇਕਰ ਤੁਸੀਂ ਹੇਠਾਂ ਦਿੱਤੇ ਇਹਨਾਂ 4 ਵੇਰਵਿਆਂ ਨੂੰ ਜਾਣਦੇ ਹੋ (ਨਕਸ਼ਤਰ, ਪੱਖ, ਤਿਥੀ, ਅਤੇ ਚੰਦਰ ਮਹੀਨਾ), ਤਾਂ ਤੁਸੀਂ ਉਹਨਾਂ ਨੂੰ ਚੁਣ ਸਕਦੇ ਹੋ। ਨਹੀਂ ਤਾਂ, ਉਹਨਾਂ ਨੂੰ 'Let HariGPT Calculate' (ਡਿਫੌਲਟ ਵਿਕਲਪ) ਵਜੋਂ ਛੱਡੋ, ਅਤੇ ਸਾਡੇ ਉੱਚ-ਪ੍ਰਦਰਸ਼ਨ ਵਾਲੇ AI ਮਾਡਲ ਤੁਹਾਡੀ ਜਨਮ ਮਿਤੀ, ਸਮਾਂ ਅਤੇ ਸਥਾਨ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਤੁਹਾਡੇ ਲਈ ਇਹਨਾਂ ਵੇਰਵਿਆਂ ਦੀ ਸਹੀ ਗਣਨਾ ਕਰਨਗੇ!",
    letHariGptCalculate: "ਹਰੀਜੀਪੀਟੀ ਦੀ ਗਣਨਾ ਕਰਨ ਦਿਓ",
    nakshatra: "ਨਕਸ਼ਤਰ",
    paksha: "ਪਕਸ਼",
    tithi: "ਤਿਥੀ",
    lunarMonth: "ਚੰਦਰ ਮਹੀਨਾ",
    searchRange: "ਖੋਜ ਰੇਂਜ ਅਤੇ ਨੋਟਸ",
    targetYears: "ਸਾਲ ਲਈ ਧਰਮਿਕ ਜਨਮਦਿਨ ਲੱਭੋ",
    notes: "ਨੋਟਸ ਜਾਂ ਸਵਾਲ",
    findBday: "ਮੇਰਾ ਧਰਮੀ ਜਨਮਦਿਨ ਲੱਭੋ",
    select: "ਚੁਣੋ",
    selectTimezone: "ਸਮਾਂ ਖੇਤਰ ਚੁਣੋ",
    footer: "HaBER Software Solutions ਦੁਆਰਾ ਬਰਲਿਨ ਵਿੱਚ ❤️ ਨਾਲ ਬਣਾਇਆ ਗਿਆ",
    cookieText: "ਅਸੀਂ ਤੁਹਾਨੂੰ ਲੌਗ ਇਨ ਰੱਖਣ ਅਤੇ ਤੁਹਾਡੀਆਂ ਤਰਜੀਹਾਂ ਨੂੰ ਸੁਰੱਖਿਅਤ ਰੱਖਣ ਲਈ ਜ਼ਰੂਰੀ ਕੂਕੀਜ਼ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਾਂ। ਅਸੀਂ ਟਰੈਕਿੰਗ ਕੂਕੀਜ਼ ਦੀ ਵਰਤੋਂ ਨਹੀਂ ਕਰਦੇ ਹਾਂ।",
    privacyPolicy: "ਪਰਾਈਵੇਟ ਨੀਤੀ",
    gotIt: "ਮਿਲ ਗਿਆ",
    legalNotice: "ਕਾਨੂੰਨੀ ਨੋਟਿਸ",
    dashboardBtn: "ਡੈਸ਼ਬੋਰਡ",
    dashboardTitle: "ਉਪਭੋਗਤਾ ਡੈਸ਼ਬੋਰਡ",
    saveDashboard: "ਡੈਸ਼ਬੋਰਡ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਕਰੋ",
    savedPermanently: "ਪੱਕੇ ਤੌਰ 'ਤੇ ਸੁਰੱਖਿਅਤ ਕੀਤਾ ਗਿਆ",
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
    slideTitle_req1: "1. ਅਵਤਾਰ ਦੀ ਮਿਤੀ",
    slideDesc_req1: "ਤੁਹਾਡੀ ਜਨਮ ਮਿਤੀ ਸੂਰਜੀ ਸਾਲ ਦੇ ਅੰਦਰ ਤੁਹਾਡੀ ਆਮਦ ਨੂੰ ਦਰਸਾਉਂਦੀ ਹੈ, ਤੁਹਾਡੀ ਬ੍ਰਹਿਮੰਡੀ ਯਾਤਰਾ ਲਈ ਬੇਸਲਾਈਨ ਸੈੱਟ ਕਰਦੀ ਹੈ।",
    slideTitle_req2: "2. ਸਹੀ ਪਲ",
    slideDesc_req2: "ਤੁਹਾਡਾ ਜਨਮ ਸਮਾਂ ਤੁਹਾਡੇ ਪਹਿਲੇ ਸਾਹ 'ਤੇ ਖਾਸ ਚੰਦਰ ਪੜਾਅ ਅਤੇ ਆਕਾਸ਼ੀ ਪਦਾਰਥਾਂ ਦੀ ਸਹੀ ਸਥਿਤੀ ਨੂੰ ਨਿਰਧਾਰਤ ਕਰਦਾ ਹੈ।",
    slideTitle_req3: "3. ਧਰਤੀ ਦੇ ਕੋਆਰਡੀਨੇਟਸ",
    slideDesc_req3: "ਤੁਹਾਡਾ ਜਨਮ ਸਥਾਨ ਭੂਗੋਲਿਕ ਐਂਕਰ ਪ੍ਰਦਾਨ ਕਰਦਾ ਹੈ, ਆਕਾਸ਼ੀ ਨਕਸ਼ੇ ਨੂੰ ਧਰਤੀ 'ਤੇ ਤੁਹਾਡੇ ਸਹੀ ਸਥਾਨ ਨਾਲ ਇਕਸਾਰ ਕਰਦਾ ਹੈ।",
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
    testiAuthor0: "Rajesh K.",
    testiText1: "ਮੈਂ ਹਮੇਸ਼ਾ ਗਲਤ ਤਰੀਕ 'ਤੇ ਜਸ਼ਨ ਮਨਾ ਰਿਹਾ ਸੀ! ਗ੍ਰੈਗੋਰੀਅਨ ਕੈਲੰਡਰ ਸਿਰਫ ਇੱਕ ਸੰਖਿਆ ਹੈ, ਪਰ ਤਿਥੀ ਅਤੇ ਨਕਸ਼ਤਰ ਦੀ ਸੰਰਚਨਾ ਅਸਲ ਬ੍ਰਹਿਮੰਡੀ ਅਸੀਸਾਂ ਲਿਆਉਂਦੀ ਹੈ। ਮੇਰੇ ਸੱਚੇ ਧਰਮੀ ਜਨਮਦਿਨ 'ਤੇ ਜਸ਼ਨ ਮਨਾਉਣ ਨਾਲ ਉਹ ਦਰਵਾਜ਼ੇ ਖੁੱਲ੍ਹ ਗਏ ਜਿਨ੍ਹਾਂ ਦੀ ਮੈਂ ਕਦੇ ਕਲਪਨਾ ਵੀ ਨਹੀਂ ਕੀਤੀ ਸੀ।",
    testiAuthor1: "Priya S.",
    testiText2: "ਇਸ ਐਪ ਨੇ ਮੇਰਾ ਪ੍ਰਮਾਣਿਕ ​​ਜਨਮਦਿਨ ਲੱਭਣ ਵਿੱਚ ਮੇਰੀ ਮਦਦ ਕੀਤੀ। ਪਹਿਲੇ ਹੀ ਸਾਲ ਜਦੋਂ ਮੈਂ ਆਪਣਾ ਧਾਰਮਿਕ ਜਨਮਦਿਨ ਮਨਾਇਆ, ਮੈਨੂੰ ਲੰਬੇ ਸਮੇਂ ਤੋਂ ਉਡੀਕੀ ਜਾ ਰਹੀ ਤਰੱਕੀ ਮਿਲੀ। ਇਹ ਸਿਰਫ਼ ਇੱਕ ਤਾਰੀਖ ਤੋਂ ਵੱਧ ਹੈ; ਇਹ ਇੱਕ ਅਧਿਆਤਮਿਕ ਰੀਸੈਟ ਹੈ।",
    testiAuthor2: "Amit P.",
    testiText3: "ਆਖਰਕਾਰ ਮੇਰਾ ਅਸਲ ਜਨਮਦਿਨ ਮਿਲਿਆ! ਗ੍ਰੈਗੋਰੀਅਨ ਕੈਲੰਡਰ ਟੁੱਟਿਆ ਹੋਇਆ ਮਹਿਸੂਸ ਹੋਇਆ, ਪਰ ਇਹ ਧਾਰਮਿਕ ਤਾਰੀਖ ਮੈਨੂੰ ਆਪਣੀਆਂ ਜੜ੍ਹਾਂ ਦੇ ਨੇੜੇ ਲੈ ਜਾਂਦੀ ਹੈ। ਇਸ ਸਾਲ ਨੂੰ ਬਹੁਤ ਖਾਸ ਬਣਾਇਆ ਗਿਆ ਇੱਕ ਪੂਜਾ ਨਾਲ ਮਨਾਉਣਾ।",
    testiAuthor3: "Sneha M.",
    testiText4: "ਸਾਡੀਆਂ ਪਰੰਪਰਾਵਾਂ ਨਾਲ ਮੁੜ ਜੁੜਨ ਦਾ ਅਜਿਹਾ ਸੁੰਦਰ ਤਰੀਕਾ। ਮੇਰਾ ਪਰਿਵਾਰ ਹੁਣ ਦੋਵੇਂ ਤਾਰੀਖਾਂ ਮਨਾਉਂਦਾ ਹੈ, ਪਰ ਧਾਰਮਿਕ ਜਨਮਦਿਨ ਅਧਿਆਤਮਿਕ ਤੌਰ 'ਤੇ ਬਹੁਤ ਜ਼ਿਆਦਾ ਸੰਪੂਰਨ ਮਹਿਸੂਸ ਕਰਦਾ ਹੈ।",
    testiAuthor4: "Vikram R.",
    testiText5: "ਮੈਂ ਪਹਿਲਾਂ ਤਾਂ ਸ਼ੱਕੀ ਸੀ, ਪਰ ਨਕਸ਼ਤਰ ਅਤੇ ਤਿਥੀ ਦੀ ਗਣਨਾ ਦੀ ਸ਼ੁੱਧਤਾ ਸ਼ਾਨਦਾਰ ਹੈ। ਮੇਰਾ ਬ੍ਰਹਿਮੰਡੀ ਜਨਮਦਿਨ ਲੱਭਣਾ ਸੱਚਮੁੱਚ ਅੱਖਾਂ ਖੋਲ੍ਹਣ ਵਾਲਾ ਅਨੁਭਵ ਸੀ।",
    testiAuthor5: "Aditi V.",
    testiText6: "ਇਹ ਸਾਧਨ ਇੱਕ ਬਰਕਤ ਹੈ! ਮੈਂ ਸਾਲਾਂ ਤੋਂ ਆਪਣੇ ਪ੍ਰਮਾਣਿਕ ​​ਹਿੰਦੂ ਜਨਮਦਿਨ ਦਾ ਪਤਾ ਲਗਾਉਣ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰ ਰਿਹਾ ਹਾਂ। ਜਸ਼ਨ ਡੂੰਘੇ ਨਿੱਜੀ ਅਤੇ ਬ੍ਰਹਮ ਦੁਆਰਾ ਬਖਸ਼ਿਸ਼ ਮਹਿਸੂਸ ਕੀਤਾ.",
    testiAuthor6: "Karan D.",
    testiText7: "ਇੱਕ ਇਸਕੋਨ ਸ਼ਰਧਾਲੂ ਹੋਣ ਦੇ ਨਾਤੇ, ਤਿਥੀ ਦੇ ਆਧਾਰ 'ਤੇ ਮੇਰਾ ਸਹੀ ਧਾਰਮਿਕ ਜਨਮਦਿਨ ਜਾਣਨਾ ਮੈਨੂੰ ਆਪਣੇ ਅਧਿਆਤਮਿਕ ਅਭਿਆਸਾਂ ਨੂੰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਨਾਲ ਇਕਸਾਰ ਕਰਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿੰਦਾ ਹੈ। ਹਰ ਅਧਿਆਤਮਿਕ ਖੋਜੀ ਲਈ ਲਾਜ਼ਮੀ ਹੈ।",
    testiAuthor7: "Anjali G.",
    testiText8: "ਸਾਡੇ ਦਾਦਾ-ਦਾਦੀ ਹਮੇਸ਼ਾ ਪੰਚਾਂਗ ਦਾ ਪਾਲਣ ਕਰਦੇ ਸਨ, ਪਰ ਅਸੀਂ ਸੰਪਰਕ ਗੁਆ ਦਿੱਤਾ। ਇਸ ਐਪ ਨੇ ਉਸ ਸੁੰਦਰ ਪਰੰਪਰਾ ਨੂੰ ਸਾਡੇ ਪਰਿਵਾਰ ਵਿੱਚ ਵਾਪਸ ਲਿਆਂਦਾ ਹੈ। ਧਰਮ ਦੇ ਜਨਮ ਦਿਨ ਦੀ ਖੁਸ਼ੀ ਬੇਮਿਸਾਲ ਹੈ।",
    testiAuthor8: "Rohit S.",
    testiText9: "ਸ਼ਾਨਦਾਰ ਅਨੁਭਵ! ਗਣਨਾਵਾਂ ਸਹੀ ਹਨ, ਅਤੇ ਮੇਰੀ ਤਿਥੀ ਨੂੰ ਮਨਾਉਣਾ ਬਹੁਤ ਹੀ ਸ਼ੁਭ ਮਹਿਸੂਸ ਹੋਇਆ। ਉਸ ਦਿਨ ਊਰਜਾ ਸਿਰਫ਼ ਸ਼ਾਨਦਾਰ ਸੀ.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "ਚੁਣੌਤੀ: ਸਥਿਰ ਸੂਰਜੀ ਤਾਰੀਖਾਂ ਬਨਾਮ ਗਤੀਸ਼ੀਲ ਬ੍ਰਹਿਮੰਡੀ ਤਾਲਾਂ",
    heroCoreTitle: "ਸਿਰਫ਼ 3 ਵੇਰਵਿਆਂ ਦੀ ਲੋੜ ਹੈ",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "ਹੱਲ: ਸ਼ੁੱਧਤਾ ਧਰਮਿਕ ਅਲਾਈਨਮੈਂਟਸ",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "ਇਸ ਸਿਸਟਮ ਤੋਂ ਕੌਣ ਲਾਭ ਉਠਾਉਂਦਾ ਹੈ?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "ਸਾਡੀ ਵਿਧੀ ਉੱਤਮ ਕਿਉਂ ਹੈ",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "ਮਹੱਤਵਪੂਰਨ ਕਾਨੂੰਨੀ ਅਤੇ ਦੇਣਦਾਰੀ ਬੇਦਾਅਵਾ",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "ਇੱਕ ਫਾਲੋ-ਅੱਪ ਸਵਾਲ ਪੁੱਛੋ...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
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
    iAcceptThe: "ਮੈਂ ਸਵੀਕਾਰ ਕਰਦਾ ਹਾਂ",
    and: "ਅਤੇ",
    fillMandatory: "ਕਿਰਪਾ ਕਰਕੇ ਸਾਰੇ ਲਾਜ਼ਮੀ ਖੇਤਰ ਭਰੋ ਅਤੇ ਨਿਯਮਾਂ ਅਤੇ ਸ਼ਰਤਾਂ ਨੂੰ ਸਵੀਕਾਰ ਕਰੋ",
    gender: "ਲਿੰਗ",
    male: "ਨਰ",
    female: "ਔਰਤ",
    unspecified: "ਨਿਰਦਿਸ਼ਟ",
    targetYearsPlaceholder2: "5-ਸਾਲ ਦਾ ਪ੍ਰੋਜੈਕਸ਼ਨ ਪ੍ਰਾਪਤ ਕਰਨ ਲਈ ਇੱਕ ਸਾਲ ਚੁਣੋ",
    authPrompt: "ਕਿਰਪਾ ਕਰਕੇ ਇਹਨਾਂ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਨੂੰ ਐਕਸੈਸ ਕਰਨ ਲਈ ਸਾਈਨ ਅੱਪ ਕਰੋ ਜਾਂ ਲੌਗ ਇਨ ਕਰੋ। <br/><br/>ਵਿਕਲਪਿਕ ਤੌਰ 'ਤੇ, ਸਾਰੀਆਂ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਤੱਕ ਪਹੁੰਚ ਕਰਨ ਲਈ <b>ਗੈਸਟ ਲੌਗਇਨ</b> ਵਿੱਚ ਦਾਖਲ ਹੋਣ ਲਈ ਪਾਸਵਰਡ ਲਈ <b>ਹਰੀ</b> ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
    emailLabel: "ਈਮੇਲ",
    passwordLabel: "ਪਾਸਵਰਡ",
    createAccountBtn: "ਖਾਤਾ ਬਣਾਉ",
    signInEmailBtn: "ਈਮੇਲ ਨਾਲ ਸਾਈਨ ਇਨ ਕਰੋ",
    alreadyHaveAccount: "ਕੀ ਪਹਿਲਾਂ ਤੋਂ ਹੀ ਖਾਤਾ ਹੈ?",
    dontHaveAccount: "ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਖਾਤਾ ਨਹੀਂ ਹੈ?",
    logInToggle: "ਲਾਗਿਨ",
    signUpToggle: "ਸਾਇਨ ਅਪ",
    orText: "ਜਾਂ",
    continueGithub: "GitHub ਨਾਲ ਜਾਰੀ ਰੱਖੋ",
    contactHari: "ਮਹਿਮਾਨ ਲੌਗਇਨ ਦਾਖਲ ਕਰਨ ਲਈ ਪਾਸਵਰਡ ਲਈ ਕਿਰਪਾ ਕਰਕੇ <b>ਹਰੀ</b> ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
  },
  AS: {
    birthDetails: "জন্মৰ বিৱৰণ",
    birthDate: "জন্ম তাৰিখ",
    birthTime: "জন্মৰ সময়",
    birthPlace: "জন্মস্থান",
    timezone: "সময়মণ্ডল",
    tradData: "পৰম্পৰাগত তথ্য ( মহাজাগতিক ব্লুপ্ৰিণ্ট)",
    tradDataHint: "সহায়ক ইংগিত: যদি আপুনি তলৰ এই ৪টা বিৱৰণ (নক্ষত্ৰ, পক্ষ, তিথি, আৰু চন্দ্ৰ মাহ) জানে তেন্তে আপুনি সেইবোৰ নিৰ্বাচন কৰিব পাৰে। অন্যথা, সিহতক 'HariGPT গণনা কৰক' (অবিকল্পিত বিকল্প) হিচাপে এৰি দিয়ক, আৰু আমাৰ উচ্চ-কাৰ্য্যক্ষম AI মডেলসমূহে আপোনাৰ জন্ম তাৰিখ, সময়, আৰু স্থান ব্যৱহাৰ কৰি আপোনাৰ বাবে এই বিৱৰণসমূহ সঠিকভাৱে গণনা কৰিব!",
    letHariGptCalculate: "HariGPT গণনা কৰক",
    nakshatra: "নক্ষত্ৰ",
    paksha: "পক্ষ",
    tithi: "তিথি",
    lunarMonth: "চন্দ্ৰ মাহ",
    searchRange: "সন্ধান পৰিসৰ আৰু টোকাসমূহ",
    targetYears: "বছৰৰ বাবে ধৰ্মীয় জন্মদিন বিচাৰি পাওক",
    notes: "টোকা বা প্ৰশ্ন",
    findBday: "মোৰ ধৰ্মীয় জন্মদিন বিচাৰি পাওক",
    select: "চয়ন কৰা",
    selectTimezone: "সময়মণ্ডল নিৰ্ব্বাচন কৰক",
    footer: "HaBER Software Solutions দ্বাৰা বাৰ্লিনত ❤️ ৰ সৈতে নিৰ্মিত",
    cookieText: "আমি আপোনাক লগ ইন কৰি ৰাখিবলৈ আৰু আপোনাৰ পছন্দসমূহ সংৰক্ষণ কৰিবলৈ প্ৰয়োজনীয় কুকীজ ব্যৱহাৰ কৰো। আমি ট্ৰেকিং কুকীজ ব্যৱহাৰ নকৰো।",
    privacyPolicy: "গোপনীয়তা নীতি",
    gotIt: "এইটো পাইছো",
    legalNotice: "আইনী জাননী",
    dashboardBtn: "ডেচব'ৰ্ড",
    dashboardTitle: "ব্যৱহাৰকাৰী ডেচব'ৰ্ড",
    saveDashboard: "ডেচব'ৰ্ডত সংৰক্ষণ কৰক",
    savedPermanently: "স্থায়ীভাৱে সংৰক্ষণ কৰা হৈছে",
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
    tooltipTimezone: "আপোনাৰ জন্মৰ সময়ত স্থানীয় সময় মণ্ডল অফছেট কৰা হয়। সঠিক সাৰ্বজনীন সময় পৰীক্ষা কৰাত সহায় কৰে।",
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
    slideTitle_req1: "১/ অৱতাৰৰ তাৰিখ",
    slideDesc_req1: "আপোনাৰ জন্ম তাৰিখে সৌৰ বছৰৰ ভিতৰত আপোনাৰ আগমনৰ কথা নিৰ্ণয় কৰে, আপোনাৰ মহাজাগতিক যাত্ৰাৰ বাবে ভিত্তি ৰেখা নিৰ্ধাৰণ কৰে।",
    slideTitle_req2: "২/ সঠিক মুহূৰ্ত",
    slideDesc_req2: "আপোনাৰ জন্ম সময়ে আপোনাৰ প্ৰথম উশাহ লোৱাৰ সময়ত আকাশী পদাৰ্থৰ নিৰ্দিষ্ট চন্দ্ৰ পৰ্যায় আৰু নিৰ্দিষ্ট অৱস্থান নিৰ্ধাৰণ কৰে।",
    slideTitle_req3: "৩/ পাৰ্থিৱ স্থানাংক",
    slideDesc_req3: "আপোনাৰ জন্মস্থানে ভৌগোলিক লংঘন প্ৰদান কৰে, আকাশী মানচিত্ৰখনক পৃথিৱীত আপোনাৰ সঠিক অৱস্থানৰ সৈতে প্ৰান্তিককৰণ কৰে।",
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
    testiText0: "ধৰ্মীয় পঞ্জিকা অনুসৰি জন্মদিন উদযাপন কৰিবলৈ আৰম্ভ কৰাৰ পৰাই মোৰ শক্তিৰ গভীৰ পৰিৱৰ্তন লক্ষ্য কৰিছো। মোৰ লগত বিশ্বব্ৰহ্মাণ্ডখন যেন একাকাৰ হৈ পৰিছে! ই মোৰ বছৰটোলৈ অবিশ্বাস্য ভাগ্য আৰু শান্তি কঢ়িয়াই আনিলে।",
    testiAuthor0: "Rajesh K.",
    testiText1: "মই সদায় ভুল তাৰিখত উদযাপন কৰি আছিলো! গ্ৰেগৰিয়ান কেলেণ্ডাৰ মাত্ৰ এটা সংখ্যা, কিন্তু তিথি আৰু নক্ষত্ৰৰ প্ৰান্তিককৰণে প্ৰকৃত মহাজাগতিক আশীৰ্বাদ কঢ়িয়াই আনে। মোৰ প্ৰকৃত ধৰ্মীয় জন্মদিনত উদযাপন কৰি মই কেতিয়াও কল্পনা নকৰা দুৱাৰ মুকলি কৰি দিলে।",
    testiAuthor1: "Priya S.",
    testiText2: "এই এপটোৱে মোক মোৰ প্ৰামাণিক জন্মদিনটো বিচাৰি উলিয়াবলৈ সহায় কৰিলে। ধৰ্মীয় জন্মদিন উদযাপন কৰাৰ প্ৰথম বছৰতে বহু প্ৰত্যাশিত প্ৰমোচন এটা পাইছিলোঁ। ই কেৱল ডেটতকৈও বেছি; ই এটা আধ্যাত্মিক ৰিছেট।",
    testiAuthor2: "Amit P.",
    testiText3: "অৱশেষত মোৰ প্ৰকৃত জন্মদিনটো বিচাৰি পালোঁ! গ্ৰেগৰিয়ান কেলেণ্ডাৰৰ সংযোগ বিচ্ছিন্ন যেন লাগিল, কিন্তু এই ধৰ্মীয় তাৰিখে মোক মোৰ শিপাৰ ওচৰলৈ লৈ যায়। পূজাৰে উদযাপন কৰি এই বছৰটো ইমান বিশেষ কৰি তুলিলে।",
    testiAuthor3: "Sneha M.",
    testiText4: "আমাৰ পৰম্পৰাৰ সৈতে পুনৰ সংযোগ স্থাপনৰ ইমান সুন্দৰ উপায়। মোৰ পৰিয়ালে এতিয়া দুয়োটা তাৰিখ উদযাপন কৰে, কিন্তু ধৰ্মীয় জন্মদিনটো আধ্যাত্মিকভাৱে বহুত বেছি পূৰ্ণতাপূৰ্ণ অনুভৱ হয়।",
    testiAuthor4: "Vikram R.",
    testiText5: "প্ৰথমতে মোৰ সন্দেহ আছিল যদিও নক্ষত্ৰ আৰু তিথি হিচাপৰ সঠিকতা অবিশ্বাস্য। মোৰ মহাজাগতিক জন্মদিনটো বিচাৰি পোৱাটো সঁচাকৈয়ে চকু মুদা কুলিৰ ভাও ধৰা অভিজ্ঞতা আছিল।",
    testiAuthor5: "Aditi V.",
    testiText6: "এই সঁজুলিটো আশীৰ্বাদ! বছৰ বছৰ ধৰি মোৰ প্ৰামাণিক হিন্দু জন্মদিনটো বুজিবলৈ চেষ্টা কৰি আহিছো। উদযাপনটো গভীৰভাৱে ব্যক্তিগত আৰু ঐশ্বৰিকতাৰ আশীৰ্বাদ অনুভৱ কৰা হৈছিল।",
    testiAuthor6: "Karan D.",
    testiText7: "এজন ইস্কন ভক্ত হিচাপে তিথিৰ ওপৰত ভিত্তি কৰি মোৰ সঠিক ধৰ্মীয় জন্মদিনটো জানিলে মোৰ আধ্যাত্মিক অনুশীলনসমূহ নিখুঁতভাৱে প্ৰান্তিককৰণ কৰিব পৰা যায়। প্ৰতিজন আধ্যাত্মিক সাধকৰ বাবে এটা আৱশ্যকীয় বস্তু।",
    testiAuthor7: "Anjali G.",
    testiText8: "আমাৰ ককা-আইতাহঁতে সদায় পাঞ্চাঙৰ পিছে পিছে গৈছিল, কিন্তু আমাৰ সংস্পৰ্শ হেৰাই গ’ল। এই এপটোৱে সেই সুন্দৰ পৰম্পৰা আমাৰ পৰিয়াললৈ ঘূৰাই আনিলে। ধৰ্মীয় জন্মদিনৰ আনন্দৰ অতুলনীয়।",
    testiAuthor8: "Rohit S.",
    testiText9: "আচৰিত অভিজ্ঞতা! হিচাপবোৰ নিখুঁত, আৰু মোৰ তিথিৰ দিনা উদযাপন কৰাটো অবিশ্বাস্যভাৱে শুভ অনুভৱ হৈছিল। সেইদিনা শক্তি আছিল সৰলভাৱে আচৰিত।",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "প্ৰত্যাহ্বান: ষ্টেটিক সৌৰ তাৰিখ বনাম গতিশীল মহাজাগতিক ছন্দ",
    heroCoreTitle: "মাত্ৰ ৩ টা বিৱৰণৰ প্ৰয়োজন",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "সমাধান: নিখুঁত ধৰ্মীয় প্ৰান্তিককৰণ",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "এই ব্যৱস্থাৰ পৰা কোনে লাভৱান হয়?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "আমাৰ পদ্ধতি কিয় উচ্চমানৰ",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "গুৰুত্বপূৰ্ণ আইনী আৰু দায়বদ্ধতা অস্বীকাৰ",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "ফ'ল' আপ প্রশ্ন সোধক...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
    underConstructionBtn: "নিৰ্মাণৰ কাম চলি আছে",
    guestLoginBtn: "অতিথি লগইন",
    underConstructionTitle: "নিৰ্মাণৰ কাম চলি আছে",
    underConstructionDesc1: "এই এপ্লিকেচনটো বৰ্তমান নিৰ্মাণ কৰা হৈছে।",
    underConstructionDesc2: "অসুবিধাৰ বাবে আমি আন্তৰিকতাৰে ক্ষমা বিচাৰিছো। পিছত পুনৰ পৰীক্ষা কৰক।",
    password: "পাছৱৰ্ড",
    loginBtn: "লগইন কৰক",
    incorrectPassword: "ভুল পাছৱৰ্ড",
    showTip: "টিপচ্ দেখুৱাওক",
    hideTip: "টিপ লুকুৱাওক",
    guestTip: "টিপচ্: পাছৱৰ্ড হৈছে hari2",
    iAcceptThe: "মই মানি লওঁ",
    and: "আৰু",
    fillMandatory: "অনুগ্ৰহ কৰি সকলো বাধ্যতামূলক ক্ষেত্ৰ পূৰণ কৰক আৰু চৰ্ত আৰু নিয়ম গ্ৰহণ কৰক",
    gender: "লিংগ",
    male: "পুৰুষ",
    female: "মহিলা",
    unspecified: "অনিৰ্দিষ্ট",
    targetYearsPlaceholder2: "৫ বছৰৰ প্ৰজেকচন পাবলৈ এটা বছৰ বাছি লওক",
    authPrompt: "এই বৈশিষ্ট্যসমূহ অভিগম কৰিবলৈ অনুগ্ৰহ কৰি চাইন আপ বা লগ ইন কৰক। <br/><br/>বিকল্পিতভাৱে, সকলো বৈশিষ্ট্য অভিগম কৰিবলে <b>অতিথি প্ৰৱেশ</b> প্ৰৱেশ কৰিবলৈ পাছৱৰ্ডৰ বাবে <b>Hari</b> ৰ সৈতে যোগাযোগ কৰক।",
    emailLabel: "ইমেইল",
    passwordLabel: "পাছৱৰ্ড",
    createAccountBtn: "একাউণ্ট সৃষ্টি কৰক",
    signInEmailBtn: "ইমেইলৰ সৈতে চাইন ইন কৰক",
    alreadyHaveAccount: "ইতিমধ্যে একাউণ্ট আছেনে?",
    dontHaveAccount: "একাউণ্ট নাই নেকি?",
    logInToggle: "লগ ইন কৰক",
    signUpToggle: "চাইন আপ কৰক",
    orText: "অথবা",
    continueGithub: "GitHub ৰ সৈতে আগবাঢ়ি যাওক",
    contactHari: "অতিথি প্ৰৱেশ প্ৰৱেশ কৰিবলৈ গুপ্তশব্দৰ বাবে অনুগ্ৰহ কৰি <b>Hari</b> ৰ সৈতে যোগাযোগ কৰক।",
  },
  FR: {
    birthDetails: "Détails de la naissance",
    birthDate: "Date de naissance",
    birthTime: "Heure de naissance",
    birthPlace: "Lieu de naissance",
    timezone: "Fuseau horaire",
    tradData: "Données traditionnelles (plan cosmique)",
    tradDataHint: "Conseil utile : si vous connaissez ces 4 détails ci-dessous (Nakshatra, Paksha, Tithi et mois lunaire), vous pouvez les sélectionner. Sinon, laissez-les comme « Laisser HariGPT calculer » (l'option par défaut), et nos modèles d'IA hautes performances calculeront avec précision ces détails pour vous en utilisant votre date, heure et lieu de naissance !",
    letHariGptCalculate: "Laissez HariGPT calculer",
    nakshatra: "Nakshatra",
    paksha: "Paksa",
    tithi: "Tithi",
    lunarMonth: "Mois lunaire",
    searchRange: "Plage de recherche et notes",
    targetYears: "Trouver l'anniversaire dharmique pour l'année",
    notes: "Remarques ou questions",
    findBday: "Trouver mon anniversaire dharmique",
    select: "Sélectionner",
    selectTimezone: "Sélectionnez le fuseau horaire",
    footer: "Réalisé avec ❤️ à Berlin par HaBER Software Solutions",
    cookieText: "Nous utilisons des cookies essentiels pour vous garder connecté et enregistrer vos préférences. Nous n'utilisons pas de cookies de suivi.",
    privacyPolicy: "politique de confidentialité",
    gotIt: "J'ai compris",
    legalNotice: "Mentions légales",
    dashboardBtn: "Tableau de bord",
    dashboardTitle: "Tableau de bord utilisateur",
    saveDashboard: "Enregistrer dans le tableau de bord",
    savedPermanently: "Enregistré définitivement",
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
    calculating: "Calculatrice...",
    calculatingPanchang: "CALCUL DES ALIGNEMENTS DE PANCHANG...",
    targetYearPlaceholder: "par ex. 2026 ou 2025-2030",
    notesPlaceholder: "Tradition spécifique (par exemple Amanta) ou questions ?",
    slideTitle_req1: "1. La date de l'incarnation",
    slideDesc_req1: "Votre date de naissance indique votre arrivée au cours de l’année solaire, établissant ainsi la base de votre voyage cosmique.",
    slideTitle_req2: "2. Le moment exact",
    slideDesc_req2: "Votre heure de naissance détermine la phase lunaire spécifique et la position précise des corps célestes lors de votre première respiration.",
    slideTitle_req3: "3. Les coordonnées terrestres",
    slideDesc_req3: "Votre lieu de naissance fournit l'ancrage géographique, alignant la carte céleste sur votre emplacement exact sur Terre.",
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
    heroCoreTitle: "Seulement 3 détails requis",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "La solution : des alignements dharmiques de précision",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "À qui profite ce système ?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "Pourquoi notre méthodologie est supérieure",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "Avis de non-responsabilité juridique et de responsabilité important",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "Posez une question complémentaire...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
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
    iAcceptThe: "J'accepte le",
    and: "et",
    fillMandatory: "Veuillez remplir tous les champs obligatoires et accepter les termes et conditions",
    gender: "Genre",
    male: "Femelle",
    female: "Femelle",
    unspecified: "Indéterminée",
    targetYearsPlaceholder2: "Sélectionnez une année pour obtenir une projection sur 5 ans",
    authPrompt: "Veuillez vous inscrire ou vous connecter pour accéder à ces fonctionnalités. <br/><br/>Vous pouvez également contacter <b>Hari</b> pour obtenir le mot de passe permettant de saisir la <b>Connexion invité</b> pour accéder à toutes les fonctionnalités.",
    emailLabel: "E-mail",
    passwordLabel: "Mot de passe",
    createAccountBtn: "Créer un compte",
    signInEmailBtn: "Connectez-vous avec e-mail",
    alreadyHaveAccount: "Vous avez déjà un compte ?",
    dontHaveAccount: "Vous n'avez pas de compte ?",
    logInToggle: "Se connecter",
    signUpToggle: "S'inscrire",
    orText: "Ou",
    continueGithub: "Continuer avec GitHub",
    contactHari: "Veuillez contacter <b>Hari</b> pour obtenir le mot de passe permettant d'accéder à la connexion invité.",
  },
  IT: {
    birthDetails: "Dettagli di nascita",
    birthDate: "Data di nascita",
    birthTime: "Ora di nascita",
    birthPlace: "Luogo di nascita",
    timezone: "Fuso orario",
    tradData: "Dati tradizionali (progetto cosmico)",
    tradDataHint: "Suggerimento utile: se conosci questi 4 dettagli di seguito (Nakshatra, Paksha, Tithi e mese lunare), puoi selezionarli. Altrimenti, lasciali come \"Lascia che HariGPT calcoli\" (l'opzione predefinita) e i nostri modelli di intelligenza artificiale ad alte prestazioni calcoleranno accuratamente questi dettagli per te utilizzando la data, l'ora e il luogo di nascita!",
    letHariGptCalculate: "Lascia che HariGPT calcoli",
    nakshatra: "Nakshatra",
    paksha: "Paksha",
    tithi: "Tithi",
    lunarMonth: "Mese lunare",
    searchRange: "Intervallo di ricerca e note",
    targetYears: "Trova il compleanno dharmico per l'anno",
    notes: "Note o domande",
    findBday: "Trova il mio compleanno dharmico",
    select: "Selezionare",
    selectTimezone: "Seleziona Fuso orario",
    footer: "Realizzato con ❤️ a Berlino da HaBER Software Solutions",
    cookieText: "Utilizziamo cookie essenziali per mantenerti connesso e salvare le tue preferenze. Non utilizziamo cookie di tracciamento.",
    privacyPolicy: "politica sulla riservatezza",
    gotIt: "Fatto",
    legalNotice: "Avviso legale",
    dashboardBtn: "Pannello di controllo",
    dashboardTitle: "Pannello di controllo dell'utente",
    saveDashboard: "Salva nella dashboard",
    savedPermanently: "Salvato in modo permanente",
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
    slideTitle_req1: "1. La data dell'incarnazione",
    slideDesc_req1: "La tua data di nascita individua il tuo arrivo entro l'anno solare, stabilendo la linea di base per il tuo viaggio cosmico.",
    slideTitle_req2: "2. Il momento esatto",
    slideDesc_req2: "La tua ora di nascita determina la fase lunare specifica e la posizione precisa dei corpi celesti al tuo primo respiro.",
    slideTitle_req3: "3. Le Coordinate Terrestri",
    slideDesc_req3: "Il tuo luogo di nascita fornisce l'ancora geografica, allineando la mappa celeste alla tua esatta posizione sulla Terra.",
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
    heroCoreTitle: "Sono richiesti solo 3 dettagli",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "La soluzione: allineamenti dharmici di precisione",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "Chi trae vantaggio da questo sistema?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "Perché la nostra metodologia è superiore",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "Importante dichiarazione di non responsabilità legale e di responsabilità",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "Fai una domanda di follow-up...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
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
    iAcceptThe: "Accetto il",
    and: "E",
    fillMandatory: "Compila tutti i campi obbligatori e accetta termini e condizioni",
    gender: "Genere",
    male: "Maschia",
    female: "Femmina",
    unspecified: "Non specificato",
    targetYearsPlaceholder2: "Seleziona un anno per ottenere una proiezione di 5 anni",
    authPrompt: "Registrati o accedi per accedere a queste funzionalità. <br/><br/>In alternativa, contatta <b>Hari</b> per la password per accedere al <b>login ospite</b> per accedere a tutte le funzionalità.",
    emailLabel: "E-mail",
    passwordLabel: "Password",
    createAccountBtn: "Creare un account",
    signInEmailBtn: "Accedi con l'e-mail",
    alreadyHaveAccount: "Hai già un account?",
    dontHaveAccount: "Non hai un account?",
    logInToggle: "Login",
    signUpToggle: "Iscrizione",
    orText: "O",
    continueGithub: "Continua con GitHub",
    contactHari: "Contatta <b>Hari</b> per la password per accedere all'accesso ospite.",
  },
  ES: {
    birthDetails: "Detalles de nacimiento",
    birthDate: "Fecha de nacimiento",
    birthTime: "hora de nacimiento",
    birthPlace: "Lugar de nacimiento",
    timezone: "Zona horaria",
    tradData: "Datos tradicionales (modelo cósmico)",
    tradDataHint: "Consejo útil: si conoce estos 4 detalles a continuación (Nakshatra, Paksha, Tithi y mes lunar), puede seleccionarlos. De lo contrario, déjelos como 'Dejar que HariGPT calcule' (la opción predeterminada) y nuestros modelos de IA de alto rendimiento calcularán con precisión estos detalles utilizando su fecha, hora y lugar de nacimiento.",
    letHariGptCalculate: "Deje que HariGPT calcule",
    nakshatra: "Nakshatra",
    paksha: "Paksha",
    tithi: "tithi",
    lunarMonth: "Mes Lunar",
    searchRange: "Rango de búsqueda y notas",
    targetYears: "Encuentra cumpleaños dhármico para el año",
    notes: "Notas o preguntas",
    findBday: "Encuentra mi cumpleaños dhármico",
    select: "Seleccionar",
    selectTimezone: "Seleccionar zona horaria",
    footer: "Hecho con ❤️ en Berlín por HaBER Software Solutions",
    cookieText: "Utilizamos cookies esenciales para mantener su sesión iniciada y guardar sus preferencias. No utilizamos cookies de seguimiento.",
    privacyPolicy: "política de privacidad",
    gotIt: "Entiendo",
    legalNotice: "Aviso Legal",
    dashboardBtn: "Panel",
    dashboardTitle: "Panel de usuario",
    saveDashboard: "Guardar en el panel",
    savedPermanently: "Guardado permanentemente",
    terms: "Términos y condiciones",
    imprint: "Imprimir",
    appName: "ENCUENTRA MI CUMPLEAÑOS DHARMICO",
    subtitle1: "Convertidor de precisión Panchang y Tithi",
    subtitle2: "Convertidor de precisión Panchang y Tithi - Evaluación astrológica",
    welcomeTitle: "Bienvenido a la asistente de panchang",
    welcomeDesc: "Ingresa los datos de tu nacimiento en el panel y calcularé el día del calendario dhármico correcto, que coincida con Tithi y Nakshatra, para ayudarte a celebrar tu cumpleaños tradicional.",
    mapHint: "Puede hacer clic en el mapa para ajustar su ubicación.",
    login: "Acceso",
    logout: "Cerrar sesión",
    history: "Historia",
    syncHistory: "Inicie sesión para sincronizar el historial",
    privacyNoticeTitle: "Aviso de Privacidad",
    privacyNoticeDesc: "Sus datos astrológicos sólo se procesan para esta sesión y no se almacenarán de forma permanente.",
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
    calculating: "Calculadora...",
    calculatingPanchang: "CÁLCULO DE ALINEACIONES DE PANCHANG...",
    targetYearPlaceholder: "p.ej. 2026 o 2025-2030",
    notesPlaceholder: "¿Tradición específica (por ejemplo, Amanta) o preguntas?",
    slideTitle_req1: "1. La fecha de la encarnación",
    slideDesc_req1: "Tu fecha de nacimiento señala tu llegada dentro del año solar, estableciendo la línea de base para tu viaje cósmico.",
    slideTitle_req2: "2. El momento exacto",
    slideDesc_req2: "Tu hora de nacimiento determina la fase lunar específica y la posición precisa de los cuerpos celestes en tu primera respiración.",
    slideTitle_req3: "3. Las coordenadas terrestres",
    slideDesc_req3: "Su lugar de nacimiento proporciona el ancla geográfica, alineando el mapa celeste con su ubicación exacta en la Tierra.",
    slideTitle0: "Celebre su verdadera llegada cósmica",
    slideDesc0: "Descubra su cumpleaños dhármico exacto según la astrología védica precisa.",
    slideTitle1: "La Sabiduría de las Antiguas",
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
    testiAuthor2: "Amit P.",
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
    heroCoreTitle: "Sólo se requieren 3 detalles",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "La solución: alineaciones dhármicas de precisión",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "¿Quién se beneficia de este sistema?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "Por qué nuestra metodología es superior",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "Importante descargo de responsabilidad legal y de responsabilidad",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "Haga una pregunta de seguimiento...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
    underConstructionBtn: "Bajo construcción",
    guestLoginBtn: "Inicio de sesión de invitado",
    underConstructionTitle: "Bajo construcción",
    underConstructionDesc1: "Esta aplicación se está construyendo actualmente.",
    underConstructionDesc2: "Nos disculpamos sinceramente por las molestias. Vuelve a consultar más tarde.",
    password: "Contraseña",
    loginBtn: "Acceso",
    incorrectPassword: "Contraseña incorrecta",
    showTip: "Mostrar consejo",
    hideTip: "Ocultar sugerencia",
    guestTip: "Consejo: la contraseña es hari2",
    iAcceptThe: "Acepto el",
    and: "y",
    fillMandatory: "Por favor complete todos los campos obligatorios y acepte los términos y condiciones.",
    gender: "Género",
    male: "Masculina",
    female: "Femenina",
    unspecified: "No especificado",
    targetYearsPlaceholder2: "Seleccione un año para obtener una proyección de 5 años",
    authPrompt: "Regístrese o inicie sesión para acceder a estas funciones. <br/><br/>Como alternativa, comuníquese con <b>Hari</b> para obtener la contraseña para ingresar al <b>Inicio de sesión de invitado</b> para acceder a todas las funciones.",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    createAccountBtn: "Crear una cuenta",
    signInEmailBtn: "Iniciar sesión con correo electrónico",
    alreadyHaveAccount: "¿Ya tienes una cuenta?",
    dontHaveAccount: "¿No tienes una cuenta?",
    logInToggle: "Acceso",
    signUpToggle: "Inscribirse",
    orText: "O",
    continueGithub: "Continuar con GitHub",
    contactHari: "Comuníquese con <b>Hari</b> para obtener la contraseña para ingresar al inicio de sesión de invitado.",
  },
  RU: {
    birthDetails: "Детали рождения",
    birthDate: "Дата рождения",
    birthTime: "Время рождения",
    birthPlace: "Место рождения",
    timezone: "Часовой пояс",
    tradData: "Традиционные данные (космический проект)",
    tradDataHint: "Полезный совет: если вы знаете эти 4 детали ниже (Накшатра, Пакша, Титхи и лунный месяц), вы можете выбрать их. В противном случае оставьте для них значение «Разрешить HariGPT рассчитать» (вариант по умолчанию), и наши высокопроизводительные модели искусственного интеллекта точно рассчитают эти данные для вас, используя вашу дату рождения, время и место!",
    letHariGptCalculate: "Пусть HariGPT рассчитает",
    nakshatra: "Накшатра",
    paksha: "Пакша",
    tithi: "Титхи",
    lunarMonth: "Лунный месяц",
    searchRange: "Диапазон поиска и примечания",
    targetYears: "Найдите дхармический день рождения по году",
    notes: "Примечания или вопросы",
    findBday: "Найди мой дхармический день рождения",
    select: "Выбирать",
    selectTimezone: "Выберите часовой пояс",
    footer: "Сделано с ❤️ в Берлине компанией HaBER Software Solutions",
    cookieText: "Мы используем необходимые файлы cookie, чтобы вы оставались в системе и сохраняли ваши настройки. Мы не используем файлы cookie для отслеживания.",
    privacyPolicy: "политика конфиденциальности",
    gotIt: "Понятно",
    legalNotice: "Официальное уведомление",
    dashboardBtn: "Панель управления",
    dashboardTitle: "Панель пользователя",
    saveDashboard: "Сохранить на панели управления",
    savedPermanently: "Сохранено навсегда",
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
    slideTitle_req1: "1. Дата воплощения",
    slideDesc_req1: "Дата вашего рождения указывает на ваше прибытие в солнечный год, устанавливая отправную точку вашего космического путешествия.",
    slideTitle_req2: "2. Точный момент",
    slideDesc_req2: "Время вашего рождения определяет конкретную лунную фазу и точное положение небесных тел при вашем первом вдохе.",
    slideTitle_req3: "3. Земные координаты",
    slideDesc_req3: "Место вашего рождения обеспечивает географическую привязку, выравнивая небесную карту с вашим точным местоположением на Земле.",
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
    testiAuthor0: "Rajesh K.",
    testiText1: "Я всегда праздновал не в ту дату! Григорианский календарь — это всего лишь число, но выравнивание Титхи и Накшатры приносит настоящие космические благословения. Празднование моего настоящего дхармического дня рождения открыло двери, о которых я даже не подозревал.",
    testiAuthor1: "Priya S.",
    testiText2: "Это приложение помогло мне найти мой настоящий день рождения. В первый же год, когда я отпраздновал свой дхармический день рождения, я получил долгожданное повышение. Это больше, чем просто свидание; это духовная перезагрузка.",
    testiAuthor2: "Amit P.",
    testiText3: "Наконец-то нашел свой настоящий день рождения! Григорианский календарь казался оторванным, но эта дхармическая дата приближает меня к моим корням. Празднование пуджи сделало этот год таким особенным.",
    testiAuthor3: "Sneha M.",
    testiText4: "Такой прекрасный способ воссоединиться с нашими традициями. Моя семья теперь празднует обе даты, но день рождения в Дхарме кажется гораздо более духовно наполненным.",
    testiAuthor4: "Vikram R.",
    testiText5: "Сначала я был настроен скептически, но точность расчетов Накшатры и Титхи невероятна. Обнаружение моего космического дня рождения было поистине поучительным опытом.",
    testiAuthor5: "Aditi V.",
    testiText6: "Этот инструмент — благословение! Я уже много лет пытаюсь определить свой настоящий индуистский день рождения. Праздник был глубоко личным и благословленным Богом.",
    testiAuthor6: "Karan D.",
    testiText7: "Как преданному ИСККОН, знание моего точного дхармического дня рождения по Титхи позволяет мне идеально согласовать свои духовные практики. Необходимая вещь для каждого духовного искателя.",
    testiAuthor7: "Anjali G.",
    testiText8: "Наши дедушка и бабушка всегда следовали за Панчангом, но мы потеряли связь. Это приложение вернуло эту прекрасную традицию в нашу семью. Радость Дхармического дня рождения не имеет себе равных.",
    testiAuthor8: "Rohit S.",
    testiText9: "Удивительный опыт! Расчеты точны, и празднование моего Титхи казалось невероятно благоприятным. Энергетика в тот день была просто чудесной.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "Задача: статические солнечные даты против динамических космических ритмов",
    heroCoreTitle: "Требуется всего 3 детали",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "Решение: точные дхармические выравнивания",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "Кому выгодна эта система?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "Почему наша методология превосходна",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "Важный отказ от юридической ответственности и ответственности",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "Задайте уточняющий вопрос...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
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
    iAcceptThe: "Я принимаю",
    and: "и",
    fillMandatory: "Пожалуйста, заполните все обязательные поля и примите условия использования.",
    gender: "Пол",
    male: "Мужской",
    female: "Женский",
    unspecified: "Не указано",
    targetYearsPlaceholder2: "Выберите год, чтобы получить прогноз на 5 лет",
    authPrompt: "Пожалуйста, зарегистрируйтесь или войдите, чтобы получить доступ к этим функциям. <br/><br/>Альтернативно свяжитесь с <b>Хари</b>, чтобы получить пароль для входа в <b>Гостевой вход</b> для доступа ко всем функциям.",
    emailLabel: "Электронная почта",
    passwordLabel: "Пароль",
    createAccountBtn: "Зарегистрироваться",
    signInEmailBtn: "Войти с помощью электронной почты",
    alreadyHaveAccount: "У вас уже есть аккаунт?",
    dontHaveAccount: "У вас нет учетной записи?",
    logInToggle: "Авторизоваться",
    signUpToggle: "Зарегистрироваться",
    orText: "Или",
    continueGithub: "Продолжить с GitHub",
    contactHari: "Пожалуйста, свяжитесь с <b>Хари</b>, чтобы получить пароль для входа в гостевой логин.",
  },
  UK: {
    birthDetails: "Деталі народження",
    birthDate: "Дата народження",
    birthTime: "Час народження",
    birthPlace: "Місце народження",
    timezone: "Часовий пояс",
    tradData: "Традиційні дані (космічний план)",
    tradDataHint: "Корисна порада: якщо ви знаєте ці 4 деталі нижче (накшатра, пакша, тітхі та місячний місяць), ви можете вибрати їх. В іншому випадку залиште їх як «Let HariGPT Calculate» (параметр за замовчуванням), і наші високопродуктивні моделі штучного інтелекту точно розрахують ці деталі за вас, використовуючи вашу дату народження, час і місце!",
    letHariGptCalculate: "Нехай HariGPT обчислює",
    nakshatra: "Накшатра",
    paksha: "Пакша",
    tithi: "Тітхі",
    lunarMonth: "Місяць за місячним календарем",
    searchRange: "Діапазон пошуку та примітки",
    targetYears: "Знайдіть Дхармічний день народження для року",
    notes: "Примітки або запитання",
    findBday: "Знайти мій дхармічний день народження",
    select: "Виберіть",
    selectTimezone: "Виберіть часовий пояс",
    footer: "Зроблено за допомогою ❤️ у Берліні компанією HaBER Software Solutions",
    cookieText: "Ми використовуємо основні файли cookie, щоб ви залишалися в системі та зберігали ваші налаштування. Ми не використовуємо файли cookie для відстеження.",
    privacyPolicy: "Політика конфіденційності",
    gotIt: "зрозумів",
    legalNotice: "Юридична інформація",
    dashboardBtn: "Приладова панель",
    dashboardTitle: "Інформаційна панель користувача",
    saveDashboard: "Зберегти на інформаційній панелі",
    savedPermanently: "Збережено назавжди",
    terms: "Правила та умови",
    imprint: "Вихідні дані",
    appName: "ЗНАЙДИ МІЙ ДАРМІЧНИЙ ДЕНЬ НАРОДЖЕННЯ",
    subtitle1: "Точний конвертер Panchang & Tithi",
    subtitle2: "Точний конвертер Panchang & Tithi - Астрологічна оцінка",
    welcomeTitle: "Ласкаво просимо в Panchang Assistant",
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
    tooltipTithi: "Місячна доба. Вирішальне значення для святкування традиційних дхармічних днів народження.",
    tooltipMonth: "Місяць, у якому ви народилися (наприклад, Чайтра, Вайшакха).",
    tooltipTargetYear: "Укажіть рік або діапазон років, для яких ви хочете знайти свою традиційну дату дня народження.",
    tooltipNotes: "Укажіть спеціальні методи розрахунку (наприклад, Amanta або Purnimanta) або додайте контекст до свого запиту.",
    calculating: "Розрахунок...",
    calculatingPanchang: "РОЗРАХУНОК РІВНІВ ПАНЧАНГ...",
    targetYearPlaceholder: "напр. 2026 або 2025-2030",
    notesPlaceholder: "Конкретна традиція (наприклад, Аманта) чи запитання?",
    slideTitle_req1: "1. Дата Втілення",
    slideDesc_req1: "Ваша дата народження точно визначає ваше прибуття протягом сонячного року, встановлюючи базову лінію для вашої космічної подорожі.",
    slideTitle_req2: "2. Точний момент",
    slideDesc_req2: "Час вашого народження визначає конкретну місячну фазу та точне положення небесних тіл під час вашого першого вдиху.",
    slideTitle_req3: "3. Земні координати",
    slideDesc_req3: "Ваше місце народження забезпечує географічний якір, вирівнюючи небесну карту з вашим точним місцем розташування на Землі.",
    slideTitle0: "Святкуйте своє справжнє космічне прибуття",
    slideDesc0: "Дізнайтеся свій точний дхармічний день народження на основі точної ведичної астрології.",
    slideTitle1: "Мудрість Стародавніх",
    slideDesc1: "Наші високоточні моделі використовують старовинні розрахунки Panchang.",
    slideTitle2: "Небесне свято",
    slideDesc2: "Поєднайте свій особливий день зі справжніми космічними ритмами.",
    slideTitle3: "Священні астрологічні мандали",
    slideDesc3: "Глибоко зв’яжіться з енергетичними моделями Всесвіту.",
    slideTitle4: "Ваша ведична карта народження",
    slideDesc4: "Розкрийте таємниці свого життєвого шляху.",
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
    testiText0: "З того часу, як я почав святкувати свій день народження за Дхармічним календарем, я помітив глибоку зміну своєї енергії. Таке відчуття, що всесвіт наближається до мене! Це принесло неймовірну удачу і спокій у мій рік.",
    testiAuthor0: "Rajesh K.",
    testiText1: "Я завжди святкувала не в ту дату! Григоріанський календар - це лише число, але вирівнювання Тіті та Накшатри приносить справжні космічні благословення. Святкування мого справжнього дхармічного дня народження відкрило двері, про які я навіть не міг уявити.",
    testiAuthor1: "Priya S.",
    testiText2: "Ця програма допомогла мені знайти мій справжній день народження. У перший же рік, коли я святкував свій Дхармічний день народження, я отримав довгоочікуване підвищення. Це більше, ніж просто побачення; це духовне перезавантаження.",
    testiAuthor2: "Amit P.",
    testiText3: "Нарешті знайшов свій справжній день народження! Григоріанський календар здавався роз’єднаним, але ця дхармічна дата наближає мене до мого коріння. Святкування з пуджою зробило цей рік таким особливим.",
    testiAuthor3: "Sneha M.",
    testiText4: "Такий прекрасний спосіб відродити наші традиції. Зараз моя сім’я святкує обидві дати, але день народження Дхарми здається набагато більш духовним.",
    testiAuthor4: "Vikram R.",
    testiText5: "Спочатку я був налаштований скептично, але точність розрахунків Накшатри та Тітхі неймовірна. Знайти мій космічний день народження було справді захоплюючим досвідом.",
    testiAuthor5: "Aditi V.",
    testiText6: "Цей інструмент - благословення! Я роками намагався визначити мій справжній індуїстський день народження. Це свято було глибоко особистим і благословенним Богом.",
    testiAuthor6: "Karan D.",
    testiText7: "Як відданий ISKCON, знання мого точного дхармічного дня народження на основі Тітхі дозволяє мені ідеально узгодити свої духовні практики. Обов’язкова річ для кожного духовного шукача.",
    testiAuthor7: "Anjali G.",
    testiText8: "Наші бабусі й дідусі завжди дотримувалися Панчанг, але ми втратили зв’язок. Ця програма повернула цю чудову традицію в нашу родину. Радість Дхармічного дня народження неперевершена.",
    testiAuthor8: "Rohit S.",
    testiText9: "Дивовижний досвід! Розрахунки точні, і святкування мого Тітхі було неймовірно сприятливим. Енергія в той день була просто чудовою.",
    testiAuthor9: "Meera T.",
    heroProblemTitle: "Завдання: статичні сонячні дати проти динамічних космічних ритмів",
    heroCoreTitle: "Потрібно лише 3 деталі",
    heroCoreDesc: "No complex astrological knowledge is needed. Simply provide your Date of Birth, Time of Birth, and Place of Birth. Our AI will precisely calculate your cosmic blueprint.",
    heroProblemDesc: <><p>When relying on the standard Gregorian (English) calendar, your birthday is permanently tethered to a static solar date. However, the true cosmic alignment of stars and planets—the exact celestial configuration present at the moment you were born—shifts dramatically from year to year. This is the very reason why ancient festivals such as Diwali, Navratri, and Ganesh Chaturthi are celebrated on different solar dates each year.</p><p>By following a fixed solar date, you miss the profound spiritual significance of your actual astrological return. The traditional Dharmic calendar honors the dynamic dance between the Moon and the cosmos, offering a deeply authentic connection to your true celestial origins.</p></>,
    heroSolutionTitle: "Рішення: точні дхармічні вирівнювання",
    heroSolutionDesc: <><p>Our Enterprise-Grade Dharmic Birthday Calculator leverages high-precision astronomical algorithms and rigorous planetary ephemeris data to calculate the exact <b>Lunar Day (Tithi)</b> and <b>Birth Star (Nakshatra)</b> of your incarnation. By precisely tracking these shifting celestial rhythms, we mathematically pinpoint the authentic, traditional date to celebrate your birth every single year.</p><p>This tool is meticulously engineered to adapt to your exact longitude, latitude, and timezone, ensuring that the planetary calculations reflect the true cosmic state above your specific birthplace.</p></>,
    heroWhoTitle: "Кому ця система вигідна?",
    heroWhoDesc: <><p>This application is meticulously designed for spiritual seekers, devout followers of Dharmic traditions, and individuals striving to reconnect with the universal rhythms that guided their arrival into this world. It is the perfect foundational tool for planning authentic traditional celebrations, scheduling auspicious Pujas, or dedicating time to deep personal reflection.</p></>,
    heroWhyTitle: "Чому наша методологія краща",
    heroWhyDesc: <><p>Engineered using advanced computational astrology, this platform cross-references your exact time and geographical coordinates of birth against thousands of years of established Vedic astronomical science. Our rigorous mathematical approach delivers unmatched, professional-grade accuracy for determining the most spiritually significant day of your year.</p></>,
    heroDisclaimerTitle: "Важливе застереження про право та відповідальність",
    heroDisclaimerDesc: <><p>The information, calculations, dates, and other content provided by this application are intended <strong>strictly for spiritual, educational, and entertainment purposes only.</strong> The creators, owners, and operators of this app provide <strong>no warranties—express or implied—regarding the accuracy, completeness, or reliability</strong> of the astrological computations or any other information herein.</p><p>This application <strong>does not offer and should not be construed as providing professional, medical, psychological, financial, or legal advice.</strong></p><p>By using this service, you explicitly agree that the creators, owners, and operators <strong>assume no liability for any decisions made, actions taken, or consequences incurred</strong> based upon the dates, calculations, or insights provided. You also agree that any reliance you place on this information is strictly <strong>at your own risk.</strong></p><p>The creators, owners, and operators of this application are <strong>completely released from liability</strong> in the event of <strong>any legal claims, damages, liabilities, or disputes</strong> arising from the use of this software or service. You agree that no legal liability will be imposed on them.</p></>,
    followupPlaceholder: "Задайте додаткове запитання...",
    termsContent: <><h3>1. Acceptance of Terms</h3><p>By accessing and using the "Find My Dharmic Birthday" application ("the App") operated by HaBER Software Solutions ("we," "us," or "our"), you ("the User") acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, you must immediately cease all use of the App.</p><h3>2. Nature of the Service and No Professional Advice</h3><p>The App generates dates, insights, and astronomical calculations <strong>exclusively for spiritual, educational, and entertainment purposes.</strong> We do not provide, nor should any content be construed as, medical, psychological, financial, legal, or other professional advice. Any reliance on the information provided is solely at the User's own risk.</p><h3>3. Absolute Limitation of Liability and Indemnification</h3><p>To the maximum extent permitted by applicable law, HaBER Software Solutions, its creators, owners, officers, and affiliates shall <strong>in no event be held liable for any direct, indirect, incidental, consequential, special, or exemplary damages, losses, or expenses</strong> arising out of or in connection with the use of, or inability to use, this App. The User expressly waives any right to sue, make claims against, or hold us responsible for any outcomes, decisions, or actions taken based on the App's content. The User agrees to indemnify, defend, and hold harmless HaBER Software Solutions against any third-party claims arising from their use of the App.</p><h3>4. No Warranties or Guarantees</h3><p>The App is provided on an "AS IS" and "AS AVAILABLE" basis, without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We make no warranty that the App will be uninterrupted, timely, secure, error-free, or mathematically flawless.</p><h3>5. Intellectual Property Rights</h3><p>All software code, mathematical generators, algorithms, user interfaces, branding, and text contained within the App are the exclusive intellectual property of HaBER Software Solutions. No rights or licenses are granted to the User, except for the limited, non-exclusive right to use the App as intended.</p><h3>6. Governing Law and Exclusive Jurisdiction</h3><p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany. Any legal disputes, claims, or proceedings arising out of or related to these Terms or the use of the App shall be brought exclusively in the competent courts of Berlin, Germany.</p></>,
    privacyContent: <><h3>1. Introduction and Scope</h3><p>We take your privacy seriously. This Privacy Policy details how HaBER Software Solutions ("we," "us") collects, uses, processes, and protects your personal data when you use the "Find My Dharmic Birthday" application. This policy complies with the strict standards of the General Data Protection Regulation (GDPR).</p><h3>2. Data Collection and Processing Modalities</h3><p><strong>Guest Users:</strong> When you use the App without an account, your birth data (date, time, and location) is processed ephemerally within the browser to generate calculations. We do not transmit or store this highly personal data on our backend servers.</p><p><strong>Registered Users:</strong> If you choose to create an account to save profiles, we collect and securely store your authentication credentials (such as email address) and the birth data profiles you explicitly choose to save. This data is securely stored in Google Firebase.</p><h3>3. Purpose of Processing</h3><p>We process your data exclusively for the purpose of providing the App's core functionality, authenticating your identity, securing your account, and maintaining your saved profiles across sessions. We <strong>do not sell, rent, or monetize your personal data</strong> to third-party data brokers or advertisers under any circumstances.</p><h3>4. Third-Party Infrastructure</h3><p>To ensure high availability and robust security, we utilize Google Cloud Platform and Firebase (operated by Google) as our infrastructure providers. These entities process your data strictly as data processors under legally binding Data Processing Agreements (DPAs) in compliance with the GDPR. We may use essential cookies that are strictly necessary to maintain your login session and secure the application.</p><h3>5. Your Data Protection Rights</h3><p>Under the GDPR, you possess comprehensive rights regarding your data. You have the right to request access to the data we hold about you, the right to demand rectification of inaccuracies, the right to data portability, and the <strong>"right to be forgotten" (complete deletion of your data)</strong>. To exercise any of these rights, you may manage your data within your account settings or contact us directly.</p><h3>6. Security Measures</h3><p>We employ enterprise-grade technical and organizational security measures to protect your data against unauthorized access, loss, or alteration, including encryption in transit (HTTPS/TLS) and at rest.</p></>,
    imprintContent: <><h3>Information Required According to § 5 TMG (Telemediengesetz)</h3><p><strong>Provider and Operator:</strong><br/>HaBER Software Solutions<br/>by HaBER Axis<br/>Hari aus Berlin<br/>Westend<br/>14059 Berlin<br/>Federal Republic of Germany</p><h3>Contact Information</h3><p>Phone: +49 (0) 157 3930 XXXX<br/>Email: info@habersoftware.example.com</p><h3>Legal and Commercial Representation</h3><p>Authorized Representative: Hari aus Berlin</p><h3>Dispute Resolution</h3><p>The European Commission provides a platform for online dispute resolution (OS), which can be found at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#daa520] hover:underline">https://ec.europa.eu/consumers/odr</a>. We are neither obligated nor willing to participate in dispute settlement proceedings before a consumer arbitration board.</p><h3>Liability for Content and Links</h3><p>As a service provider, we are responsible for our own content on these pages in accordance with general laws pursuant to § 7 Abs.1 TMG. However, according to §§ 8 to 10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity. Our site may contain links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this external content.</p></>,
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
    iAcceptThe: "Я приймаю",
    and: "і",
    fillMandatory: "Будь ласка, заповніть усі обов’язкові поля та прийміть положення та умови",
    gender: "Стать",
    male: "Чоловік",
    female: "Жінка",
    unspecified: "Невизначений",
    targetYearsPlaceholder2: "Виберіть рік, щоб отримати прогноз на 5 років",
    authPrompt: "Будь ласка, зареєструйтеся або увійдіть, щоб отримати доступ до цих функцій. <br/><br/>Альтернативно, зв’яжіться з <b>Hari</b> для отримання пароля для введення <b>Вхід гостя</b> для доступу до всіх функцій.",
    emailLabel: "Електронна пошта",
    passwordLabel: "Пароль",
    createAccountBtn: "Створити акаунт",
    signInEmailBtn: "Увійдіть за допомогою електронної пошти",
    alreadyHaveAccount: "Вже маєте акаунт?",
    dontHaveAccount: "Немає облікового запису?",
    logInToggle: "Увійти",
    signUpToggle: "Зареєструватися",
    orText: "Або",
    continueGithub: "Продовжити з GitHub",
    contactHari: "Будь ласка, зв’яжіться з <b>Hari</b> для отримання пароля для входу в систему Гість.",
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


const LANGUAGE_LABELS: Record<string, string> = {
  EN: "���� English",
  DE: "���� Deutsch",
  HI: "���� हिंदी",
  TE: "���� తెలుగు",
  PA: "���� ਪੰਜਾਬੀ",
  AS: "���� অসমীয়া",
  FR: "���� Français",
  IT: "���� Italiano",
  ES: "���� Español",
  RU: "���� русский",
  UK: "���� Українська",
};

const LANGUAGE_ENGLISH_NAMES: Record<string, string> = {
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

export default function App() {
  const [uiLang, setUiLang] = useState<"EN" | "DE" | "HI" | "TE" | "PA" | "AS" | "FR" | "IT" | "ES" | "RU" | "UK">("EN");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculatingBlueprint, setIsCalculatingBlueprint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(360, Math.round(window.innerWidth / 3));
    }
    return 360;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [activeConfig, setActiveConfig] = useState<SearchConfig | null>(null);
  const [dashboardFilter, setDashboardFilter] = useState("");
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

  // Horoscope Modal State
  const [showHoroscopeModal, setShowHoroscopeModal] = useState(false);
  const [horoscopeName, setHoroscopeName] = useState("");
  const [horoscopeGender, setHoroscopeGender] = useState("Unspecified");
  const [horoscopeBirthDate, setHoroscopeBirthDate] = useState("");
  const [horoscopeBirthTime, setHoroscopeBirthTime] = useState("");
  const [horoscopeBirthPlace, setHoroscopeBirthPlace] = useState("");
  const [horoscopeTimezone, setHoroscopeTimezone] = useState("");
  const [horoscopeFocus, setHoroscopeFocus] = useState("General Life & Kundali Overview");

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
  const [gender, setGender] = useState("Male");
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
  const [lunarSystem, setLunarSystem] = useState<"Amanta" | "Purnimanta" | "">("");
  const [chatInput, setChatInput] = useState("");
  const [acceptedBlueprint, setAcceptedBlueprint] = useState(false);
  const [isAiCalculated, setIsAiCalculated] = useState(false);
  const [showCosmicBlueprintCheckbox, setShowCosmicBlueprintCheckbox] = useState(false);
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

  const getDatePickerFormatList = (format: string) => {
    if (format === 'DD-MM-YYYY') return ['dd-MM-yyyy', 'dd.MM.yyyy', 'ddMMyyyy', 'dMyyyy', 'dMMyyyy', 'ddMyyyy', 'd.M.yyyy', 'd.M.yy', 'dd.MM.yy', 'dd-MM-yy', 'd-M-yy', 'dd/MM/yyyy', 'd/M/yyyy', 'd/M/yy', 'dd/MM/yy'];
    if (format === 'MM-DD-YYYY') return ['MM-dd-yyyy', 'MM.dd.yyyy', 'MMddyyyy', 'Mdyyyy', 'Mddyyyy', 'MMdyyyy', 'M.d.yyyy', 'M.d.yy', 'MM.dd.yy', 'MM-dd-yy', 'M-d-yy', 'MM/dd/yyyy', 'M/d/yyyy', 'M/d/yy', 'MM/dd/yy'];
    return ['yyyy-MM-dd', 'yy-MM-dd', 'yyyy/MM/dd', 'yyyy.MM.dd'];
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

  const calculateDaysRemaining = (createdAt?: number) => {
     if (!createdAt) return 15;
     const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
     const diffMs = (createdAt + fifteenDaysMs) - Date.now();
     const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
     return days > 0 ? days : 0;
  };

  const getTraditionalDetailsFromText = (text: string, config?: SearchConfig | null) => {
    const nakshatraMatch = text.match(/\*\*Nakshatra:\*\*\s*\*?([^\n\*#\,-]+)/i) || text.match(/Nakshatra:\s*\*?([^\n\*#\,-]+)/i);
    const pakshaMatch = text.match(/\*\*Paksha:\*\*\s*\*?([^\n\*#\,-]+)/i) || text.match(/Paksha:\s*\*?([^\n\*#\,-]+)/i);
    const tithiMatch = text.match(/\*\*Tithi:\*\*\s*\*?([^\n\*#\,-]+)/i) || text.match(/Tithi:\s*\*?([^\n\*#\,-]+)/i);
    const monthMatch = text.match(/\*\*Lunar Month:\*\*\s*\*?([^\n\*#\,-]+)/i) || text.match(/Lunar Month:\s*\*?([^\n\*#\,-]+)/i) || text.match(/Masa:\s*\*?([^\n\*#\,-]+)/i);

    return {
      nakshatra: nakshatraMatch ? nakshatraMatch[1].trim() : (config?.nakshatra || nakshatra || "Panchang Calculated"),
      paksha: pakshaMatch ? pakshaMatch[1].trim() : (config?.paksha || paksha || "Panchang Calculated"),
      tithi: tithiMatch ? tithiMatch[1].trim() : (config?.tithi || tithi || "Panchang Calculated"),
      lunarMonth: monthMatch ? monthMatch[1].trim() : (config?.lunarMonth || lunarMonth || "Panchang Calculated")
    };
  };

  const saveConfig = async (resultText?: string) => {
     if (!birthDate && !birthPlace) return;
     const config: SearchConfig = {
        resultText,
        id: Date.now().toString(),
        userId: user ? user.uid : "local",
        createdAt: Date.now(),
        label: `${birthDate || 'No Date'} (${birthPlace || 'No Place'})`,
        birthDate, birthTime, birthPlace, timezone, nakshatra, paksha, tithi, lunarMonth, targetYearRange,
        isSavedPermanently: false
     };
     setActiveConfig(config);

     if (user && !user.isAnonymous && !isGuest) {
        const newConfigs = [config, ...recentConfigs.filter(r => r.id !== config.id)].slice(0, 5);
        setRecentConfigs(newConfigs);
        try {
           await setDoc(doc(db, "users", user.uid, "searches", config.id), config);
        } catch(e) {
           handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/searches/${config.id}`);
        }
     } else {
        const newConfigs = [config, ...recentConfigs.filter(r => r.id !== config.id)].slice(0, 5);
        setRecentConfigs(newConfigs);
     }
  };

  const toggleSavePermanently = async (configToUpdate: SearchConfig, e?: React.MouseEvent) => {
     if (e) e.stopPropagation();
     const updated: SearchConfig = {
       ...configToUpdate,
       isSavedPermanently: !configToUpdate.isSavedPermanently
     };
     if (activeConfig && activeConfig.id === configToUpdate.id) {
       setActiveConfig(updated);
     }
     if (user && !user.isAnonymous && !isGuest) {
       try {
         await setDoc(doc(db, "users", user.uid, "searches", configToUpdate.id), updated);
         setDashboardConfigs(prev => prev.map(c => c.id === configToUpdate.id ? updated : c));
         setRecentConfigs(prev => prev.map(c => c.id === configToUpdate.id ? updated : c));
       } catch (err) {
         handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/searches/${configToUpdate.id}`);
       }
     } else {
       setRecentConfigs(prev => prev.map(c => c.id === configToUpdate.id ? updated : c));
     }
  };

  const restoreConfigToView = (c: SearchConfig) => {
     setBirthDate(c.birthDate);
     setBirthTime(c.birthTime);
     setBirthPlace(c.birthPlace);
     setTimezone(c.timezone);
     setNakshatra(c.nakshatra);
     setPaksha(c.paksha);
     setTithi(c.tithi);
     setLunarMonth(c.lunarMonth);
     setTargetYearRange(c.targetYearRange);
     setActiveConfig(c);
     if (c.resultText) {
        setMessages([
           { id: 'u_' + c.id, role: 'user', text: `**Birth Details:** Date: ${c.birthDate}, Time: ${c.birthTime}, Location: ${c.birthPlace}` },
           { id: 'b_' + c.id, role: 'model', text: c.resultText }
        ]);
     } else {
        setMessages([]);
     }
     setShowDashboard(false);
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

  const openHoroscopeModal = () => {
    setHoroscopeBirthDate(birthDate || horoscopeBirthDate);
    setHoroscopeBirthTime(birthTime || horoscopeBirthTime);
    setHoroscopeBirthPlace(birthPlace || horoscopeBirthPlace);
    setHoroscopeTimezone(timezone || horoscopeTimezone);
    setHoroscopeGender(gender !== "Unspecified" ? gender : horoscopeGender);
    setShowHoroscopeModal(true);
  };

  const handleGenerateHoroscopeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!horoscopeBirthDate || !horoscopeBirthTime || !horoscopeBirthPlace) {
      alert("Please provide all mandatory birth details (Date, Time, and Place) to generate your horoscope.");
      return;
    }
    
    setShowHoroscopeModal(false);
    if (isLoading) return;

    if (horoscopeBirthDate) setBirthDate(horoscopeBirthDate);
    if (horoscopeBirthTime) setBirthTime(horoscopeBirthTime);
    if (horoscopeBirthPlace) setBirthPlace(horoscopeBirthPlace);
    if (horoscopeTimezone) setTimezone(horoscopeTimezone);

    let formattedDate = horoscopeBirthDate;
    if (horoscopeBirthDate) {
      const parts = horoscopeBirthDate.split('-');
      if (parts.length === 3) {
         if (dateFormat === 'DD-MM-YYYY') formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
         else if (dateFormat === 'MM-DD-YYYY') formattedDate = `${parts[1]}-${parts[2]}-${parts[0]}`;
      }
    }

    const displayPrompt = `Here are my birth details for generating my Vedic Horoscope (Janam Kundali):

**Birth Details:**
${horoscopeName ? `- Full Name: ${horoscopeName}\n` : ''}${horoscopeGender !== 'Unspecified' ? `- Gender: ${horoscopeGender}\n` : ''}- Birth Date: ${formattedDate || 'Not specified'}
- Birth Time: ${horoscopeBirthTime || 'Not specified'}
- Birth Place: ${horoscopeBirthPlace || 'Not specified'}
- Timezone: ${horoscopeTimezone || 'Not specified'}
- Focus Area: ${horoscopeFocus}`;

    const newUserMsg: MessageItem = { id: Date.now().toString(), role: "user", text: displayPrompt };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let apiPrompt = displayPrompt + `\n\nCRITICAL MANDATE FOR VEDIC HOROSCOPE (JANAM KUNDALI):
Please reply primarily in ${LANGUAGE_ENGLISH_NAMES[uiLang]}.
Calculate and provide an authentic, detailed Vedic Horoscope (Janam Kundali) analysis:
1. **Kundali Overview**:
   - Ascendant (Lagna)
   - Moon Sign (Rashi) & Sun Sign
   - Nakshatra & Pada
   - Tithi, Paksha & Deities
2. **Planetary Positions & House Placements**:
   - Positions of Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu.
3. **Key Yogas & Strengths**:
   - Notable auspicious yogas (e.g. Raj Yoga, Dhan Yoga, Gajakesari Yoga, etc.).
4. **Detailed Life Predictions**:
   - Primary Focus: ${horoscopeFocus}
   - Career, Business & Wealth
   - Health, Energy & Vitality
   - Relationships, Marriage & Family
5. **Dasha Period Overview**:
   - Current Vimshottari Mahadasha / Antardasha insights.
6. **Vedic Remedies & Upayas**:
   - Recommended mantras, beneficial gemstones, or charitable deeds for peace and prosperity.`;

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: apiPrompt,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          structuredData: { birthDate, birthTime, birthPlace }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      const { cleanText, extractedJson } = parseJsonBlock(data.text);
      const modelMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: cleanText,
        jsonArray: extractedJson,
      };
      setMessages([...newMessages, modelMsg]);
    } catch (error: any) {
      console.error(error);
      const errorMsg: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: `Sorry, I couldn't generate the Vedic horoscope at this time (${error.message || 'Server error'}). Please check that exact birth date, birth time, and birth place are provided and try again.`,
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isSubmitReady) return;

    let formattedBirthDate = birthDate;
    if (birthDate) {
      const parts = birthDate.split('-');
      if (parts.length === 3) {
         if (dateFormat === 'DD-MM-YYYY') formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
         else if (dateFormat === 'MM-DD-YYYY') formattedBirthDate = `${parts[1]}-${parts[2]}-${parts[0]}`;
      }
    }
    
    let displayPrompt = "Here are my birth details for finding my equivalent Dharmic birthday:\n\n";
    displayPrompt += "**Birth Details:**\n";
    if (gender && gender !== "Unspecified") displayPrompt += `- Gender: ${gender}\n`;
    if (birthDate) displayPrompt += `- Birth Date: ${formattedBirthDate}\n`;
    if (birthTime) displayPrompt += `- Birth Time: ${birthTime}\n`;
    if (birthPlace) displayPrompt += `- Birth Place: ${birthPlace}\n`;
    if (timezone) displayPrompt += `- Timezone: ${timezone}\n`;

    if (nakshatra) displayPrompt += `- Selected Nakshatra: ${nakshatra}\n`;
    if (paksha) displayPrompt += `- Selected Paksha: ${paksha}\n`;
    if (tithi) displayPrompt += `- Selected Tithi: ${tithi}\n`;
    if (lunarMonth) displayPrompt += `- Selected Lunar Month: ${lunarMonth}\n`;
    if (targetYearRange) displayPrompt += `- Target Year / Range: ${targetYearRange}\n`;
    if (lunarSystem) displayPrompt += `- Lunar Month System: ${lunarSystem}\n`;

    let apiPrompt = displayPrompt + `\n\nCRITICAL MANDATE FOR RESPONSE FORMAT:
You MUST start your response with a dedicated section titled "**Calculated Traditional Details**" that explicitly lists the 4 core Panchang parameters:
- **Nakshatra:** [Calculated Nakshatra Name]
- **Paksha:** [Calculated Paksha, e.g. Shukla or Krishna]
- **Tithi:** [Calculated Tithi Name]
- **Lunar Month:** [Calculated Lunar Month Name]

Followed immediately by the "**Dharmic Birthday Details**" section. All Gregorian dates in your text response MUST be formatted as ${dateFormat}.`;

    const isLoggedIn = !!user || isGuest;

    apiPrompt += `\n\nPlease reply primarily in ${LANGUAGE_ENGLISH_NAMES[uiLang]}. Additionally, provide a 5-year projection of this birthday from the target year forward. Return this 5-year projection as a JSON array inside a markdown block starting exactly with \`\`\`json. Each object MUST have exactly these keys: { "year": number, "gregorianDate": "YYYY-MM-DD", "weekday": "Monday" }.`;

    if (!isLoggedIn) {
      apiPrompt += `\n\nCRITICAL INSTRUCTION: Since the user is a guest, you MUST provide only a VERY SHORT, concise summary of their Dharmic Birthday details and the 5-year projection. Do not provide detailed astrological explanations, long paragraphs, or deep analysis. Keep it extremely brief. Add a friendly note at the very end suggesting they sign up for full astrological details, saving capabilities, and downloads.`;
    } else {
      apiPrompt += `\n\nProvide a comprehensive, detailed astrological assessment along with the results.`;
    }

    const newUserMsg: MessageItem = { id: Date.now().toString(), role: "user", text: displayPrompt.trim() };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsLoading(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: apiPrompt,
          history: messages.map(m => ({ role: m.role, text: m.text })),
          structuredData: { birthDate, birthTime, birthPlace }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      const { cleanText, extractedJson } = parseJsonBlock(data.text);
      const modelMsg: MessageItem = { id: Date.now().toString() + "_m", role: "model", text: cleanText.trim(), jsonArray: extractedJson };
      setMessages([...newMessages, modelMsg]);
      saveConfig(cleanText.trim());
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

  ;

  const handleClear = () => {
    setShowDashboard(false);
    setMessages([]);
    setBirthDate("");
    setBirthTime("");
    setBirthPlace("");
    setTimezone("");
    setNakshatra("");
    setTithi("");
    setPaksha("");
    setLunarMonth("");
    setLunarSystem("");
    setChatInput("");
    setTargetYearRange("");
    setAcceptedBlueprint(false);
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
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error("Google Login Error:", error);
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

  const isFormValid = !!(birthDate && birthTime && birthPlace && timezone && lunarSystem);
  
  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      let newWidth = e.clientX;
      if (newWidth < 360) newWidth = 360;
      const maxWidth = Math.round(window.innerWidth / 3);
      if (newWidth > maxWidth) newWidth = maxWidth;
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const isSubmitReady = isFormValid && acceptTerms;

  return (
    <div className="flex flex-col h-screen bg-[#f9f7f2] text-[#2d2a26] font-sans overflow-hidden">
      
      <header className="border-b-[4px] border-[#daa520] bg-[#8b0000] shrink-0 min-h-16 h-auto py-3 px-3 md:px-8 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-3 cursor-pointer group w-auto justify-start" onClick={() => { handleClear(); window.scrollTo(0,0); }} title="Home / Reset">
          <div className="w-8 h-8 bg-[#daa520] text-[#8b0000] rounded-[4px] flex items-center justify-center font-bold text-xl leading-none group-hover:bg-[#e2d1b3] transition-colors shrink-0">
            ॐ
          </div>
          <div className="flex flex-col text-white group-hover:text-white/90 transition-colors text-left overflow-hidden">
            <h1 className="text-[0.85rem] sm:text-[1.1rem] font-bold tracking-[0.02em] leading-tight truncate">{t.appName}</h1>
            <span className="text-[0.65rem] sm:text-[0.8rem] opacity-90 leading-tight truncate">{t.subtitle1}</span>
          </div>
        </div>

        <div className="flex items-center justify-end w-auto flex-1 space-x-2 sm:space-x-4 flex-wrap sm:flex-nowrap gap-y-2 ml-auto">
          {messages.length > 0 && (
            <>
              <button 
                 onClick={handleShare}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Share Result"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                 onClick={() => window.print()}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Print Result"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button 
                 onClick={exportToCsv}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                title="Download JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="flex items-center bg-[#6b0000] rounded-[4px] p-1 text-xs shrink-0 max-w-[150px] sm:max-w-none overflow-x-auto hide-scrollbar">
             <Globe className="w-3.5 h-3.5 text-white/70 mx-2 shrink-0" />
             {(["EN", "DE", "HI", "TE", "PA", "AS", "FR", "IT", "ES", "RU", "UK"] as const).map(l => (
               <button
                 key={l}
                 onClick={() => setUiLang(l)}
                 title={LANGUAGE_ENGLISH_NAMES[l] || l}
                 className={`px-2 py-1 rounded-[2px] font-bold transition-colors shrink-0 ${uiLang === l ? "bg-[#daa520] text-[#8b0000]" : "text-white/80 hover:text-white"}`}
               >
                 {LANGUAGE_LABELS[l] || l}
               </button>
             ))}
          </div>

          {!authLoading && (
            <div className="flex items-center space-x-2 shrink-0">
              {(user || isGuest) ? (
                <>
                  {user && (
                    <button
                      onClick={() => setShowDashboard(true)}
                      className="flex items-center space-x-1.5 text-xs font-bold text-[#8b0000] bg-[#daa520] hover:bg-[#e2d1b3] px-3 py-1.5 rounded-[4px] transition-colors uppercase tracking-wider shadow-sm"
                      title={t.dashboardBtn || "Dashboard"}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>{t.dashboardBtn || "Dashboard"}</span>
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      await signOut(auth);
                      setMessages([]);
                      setRecentConfigs([]);
                    }}
                    className="flex items-center space-x-1 text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider bg-black/20 px-3 py-1.5 rounded-[4px]"
                  >
                    <span className="hidden sm:inline">{user ? "Logout" : "End Guest Session"}</span>
                    <LogOut className="w-3.5 h-3.5 sm:hidden" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-[#8b0000] bg-[#daa520] hover:bg-[#e2d1b3] px-3 py-1.5 rounded-[4px] transition-colors uppercase tracking-wider"
                >
                  <span>{t.login}</span>
                  <LogIn className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
        <section 
          className="w-full border-r border-[#e2d1b3] bg-white flex-shrink-0 flex flex-col print:hidden lg:h-full z-10 shadow-md relative"
          style={{ width: window.innerWidth >= 1024 ? `${panelWidth}px` : '100%' }}
        >
          {/* Resize Handle */}
          <div 
            className="hidden lg:block absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-[#daa520]/50 z-20"
            onMouseDown={startResizing}
          />
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

          <form id="main-form" onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} className="space-y-4 flex flex-col">
            <div className="space-y-4">
              {/* Gender, Date & Time */}
              <div className="flex flex-col space-y-4 xl:flex-row xl:space-y-0 xl:space-x-4">
                <div className="flex flex-col gap-1 relative xl:w-1/3">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                  >
                    <option value="Male">{t.male || "Male"}</option>
                    <option value="Female">{t.female || "Female"}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 relative xl:w-1/3">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.birthDate} <span className="text-[#8b0000] ml-1">*</span>
                    <InfoTooltip content={t.tooltipDate} />
                  </label>
                  <DatePicker
                    selected={parseDateString(birthDate)}
                    onChange={handleDateChange}
                    dateFormat={getDatePickerFormatList(dateFormat)}
                    maxDate={new Date()}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    popperPlacement="bottom-start"
                    popperModifiers={[
                      {
                        name: "preventOverflow",
                        options: { rootBoundary: "viewport", tether: false, altAxis: true },
                        fn: (state) => state,
                      },
                    ]}
                    portalId="root"
                    wrapperClassName="w-full"
                    className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                    placeholderText={dateFormat}
                  />
                </div>
                <div className="flex flex-col gap-1 relative xl:w-1/3">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.birthTime} <span className="text-[#8b0000] ml-1">*</span>
                    <InfoTooltip content={t.tooltipTime} />
                  </label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={birthTime ? birthTime.split(':')[0] : ""}
                      onChange={(e) => {
                        const mins = birthTime ? birthTime.split(':')[1] || "00" : "00";
                        setBirthTime(`${e.target.value}:${mins}`);
                      }}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] flex-1"
                    >
                      <option value="" disabled>HH</option>
                      {Array.from({length: 24}).map((_, i) => (
                        <option key={`hr-${i}`} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="font-bold text-[#8b4513]">:</span>
                    <select
                      value={birthTime ? birthTime.split(':')[1] || "" : ""}
                      onChange={(e) => {
                        const hrs = birthTime ? birthTime.split(':')[0] || "00" : "00";
                        setBirthTime(`${hrs}:${e.target.value}`);
                      }}
                      className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] flex-1"
                    >
                      <option value="" disabled>MM</option>
                      {Array.from({length: 60}).map((_, i) => (
                        <option key={`min-${i}`} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Place & Timezone */}
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
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.75rem] sm:text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] truncate w-full"
                  >
                    <option value="">{t.selectTimezone}</option>
                    {TIMEZONES.map((tz, idx) => (
                      <option key={idx} value={tz}>{tz}</option>
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
                  <p className="text-[0.65rem] text-[#8b4513] italic mb-1">{t.targetYearsPlaceholder2 || "Select a year to get a 5-Year Projection"}</p>
                  <select
                    value={targetYearRange}
                    onChange={(e) => setTargetYearRange(e.target.value)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.75rem] sm:text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] w-full"
                  >
                    {Array.from({ length: 50 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
              </div>

              <div className="flex flex-col gap-1 relative">
                  <label className="text-[0.7rem] font-semibold text-[#5c554a] flex items-center">
                    {t.lunarSystemTitle || "Lunar Month System"} <span className="text-[#8b0000] ml-1">*</span>
                    <InfoTooltip content={t.lunarSystemInfo || "Purnimanta ends the month on the full moon (common in North India). Amanta ends on the new moon (common in South India, Maharashtra, Gujarat). This affects the month name your tithi falls in."} />
                  </label>
                  <select
                    value={lunarSystem}
                    onChange={(e) => setLunarSystem(e.target.value as any)}
                    className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520] text-[#2d2a26]"
                  >
                    <option value="" disabled>{t.lunarSystemPlaceholder || "Select Lunar System"}</option>
                    <option value="Purnimanta">Purnimanta</option>
                    <option value="Amanta">Amanta</option>
                  </select>
              </div>

          </form>
          </div>
          <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">
            
            
            <div className="flex items-start space-x-2 mb-4">
               <input
                 type="checkbox"
                 id="accept-terms"
                 checked={acceptTerms}
                 onChange={(e) => setAcceptTerms(e.target.checked)}
                 className="mt-1 w-4 h-4 text-[#8b0000] focus:ring-[#daa520] border-[#d1c4b2] rounded cursor-pointer shrink-0"
               />
               <label htmlFor="accept-terms" className="text-[0.75rem] text-[#5c554a] cursor-pointer leading-tight">
                 {t.iAcceptThe || "I accept the "} <button type="button" onClick={() => setShowTerms(true)} className="text-[#8b0000] hover:underline">{t.terms}</button> {t.and || "and"} <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="text-[#8b0000] hover:underline">{t.privacyPolicy}</button>.
               </label>
             </div>
             
             <button
               form="main-form"
               type="submit"
               title={!isSubmitReady ? "Please fill all mandatory fields and accept terms to continue" : undefined}
               className={`w-full text-white border-0 p-3 rounded-[4px] font-bold uppercase tracking-[0.05em] transition-colors flex items-center justify-center space-x-2 bg-[#8b0000] ${(!isSubmitReady || isLoading) ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#6b0000] cursor-pointer'}`}
             >
               {isLoading ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span>{t.calculating || "Calculating..."}</span>
                 </>
               ) : (
                 <>
                   <span>{t.findBday || "Find My Dharmic Birthday"}</span>
                   <Send className="w-4 h-4" />
                 </>
               )}
             </button>
             {!isSubmitReady && (
               <p className="text-[#8b0000] text-xs text-center mt-2 font-medium">* {t.fillMandatory || "Please fill all mandatory fields and accept terms and conditions"}</p>
             )}
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
                          {user && !isGuest && (
                            <div className="mb-4 bg-amber-50/90 border border-amber-300 p-3 rounded-[4px] text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  <strong>Dashboard Retention Warning:</strong> Unsaved search results are automatically deleted after 15 days. Click <strong>"Save Permanently"</strong> to preserve this result in your dashboard.
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  if (activeConfig) {
                                    toggleSavePermanently(activeConfig);
                                  } else {
                                    saveConfig(msg.text);
                                  }
                                }}
                                className={`ml-auto shrink-0 font-bold px-3 py-1 rounded-[3px] text-xs transition-colors flex items-center space-x-1 ${
                                  activeConfig?.isSavedPermanently
                                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                                    : "bg-[#daa520] text-[#8b0000] hover:bg-[#e2d1b3]"
                                }`}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${activeConfig?.isSavedPermanently ? "fill-current" : ""}`} />
                                <span>{activeConfig?.isSavedPermanently ? (t.savedPermanently || "Saved Permanently") : (t.saveDashboard || "Save to Dashboard")}</span>
                              </button>
                            </div>
                          )}

                          {(() => {
                            const details = getTraditionalDetailsFromText(msg.text, activeConfig);
                            return (
                              <div className="bg-[#fcf8f2] border-2 border-[#daa520]/60 rounded-[6px] p-4 mb-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#e2d1b3] pb-2 mb-3">
                                  <div className="flex items-center space-x-2 text-[#8b0000] font-bold text-sm sm:text-base">
                                    <Sparkles className="w-5 h-5 text-[#daa520]" />
                                    <span>Calculated Traditional Details</span>
                                  </div>
                                  <span className="text-[0.65rem] bg-[#8b0000] text-white px-2 py-0.5 rounded-[3px] font-bold uppercase tracking-wider">
                                    Panchang Alignment
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="bg-white border border-[#e2d1b3] p-2.5 rounded-[4px] flex flex-col">
                                    <span className="text-[0.65rem] uppercase tracking-wider text-[#8e8372] font-bold flex items-center">
                                      <Star className="w-3 h-3 text-[#daa520] mr-1 shrink-0" /> Nakshatra
                                    </span>
                                    <span className="font-bold text-[#8b0000] text-xs sm:text-sm mt-0.5 truncate" title={details.nakshatra}>
                                      {details.nakshatra}
                                    </span>
                                  </div>
                                  <div className="bg-white border border-[#e2d1b3] p-2.5 rounded-[4px] flex flex-col">
                                    <span className="text-[0.65rem] uppercase tracking-wider text-[#8e8372] font-bold flex items-center">
                                      <Moon className="w-3 h-3 text-[#8b4513] mr-1 shrink-0" /> Paksha
                                    </span>
                                    <span className="font-bold text-[#2d2a26] text-xs sm:text-sm mt-0.5 truncate" title={details.paksha}>
                                      {details.paksha}
                                    </span>
                                  </div>
                                  <div className="bg-white border border-[#e2d1b3] p-2.5 rounded-[4px] flex flex-col">
                                    <span className="text-[0.65rem] uppercase tracking-wider text-[#8e8372] font-bold flex items-center">
                                      <CalendarDays className="w-3 h-3 text-[#8b0000] mr-1 shrink-0" /> Tithi
                                    </span>
                                    <span className="font-bold text-[#8b0000] text-xs sm:text-sm mt-0.5 truncate" title={details.tithi}>
                                      {details.tithi}
                                    </span>
                                  </div>
                                  <div className="bg-white border border-[#e2d1b3] p-2.5 rounded-[4px] flex flex-col">
                                    <span className="text-[0.65rem] uppercase tracking-wider text-[#8e8372] font-bold flex items-center">
                                      <Calendar className="w-3 h-3 text-[#daa520] mr-1 shrink-0" /> Lunar Month
                                    </span>
                                    <span className="font-bold text-[#2d2a26] text-xs sm:text-sm mt-0.5 truncate" title={details.lunarMonth}>
                                      {details.lunarMonth}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

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
                                                  let year, month, day;
                                                  if (parts[0].length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
                                                  else { year = parts[2]; month = parts[1]; day = parts[0]; }
                                                  if (dateFormat === 'DD-MM-YYYY') return `${day}-${month}-${year}`;
                                                  if (dateFormat === 'MM-DD-YYYY') return `${month}-${day}-${year}`;
                                                  return `${year}-${month}-${day}`;
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

              {messages.some(m => m.role === 'model') && !isLoading && (
                 <motion.div
                   initial={{ scale: 0.5, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                   className="flex justify-center mt-8 pb-4 print:hidden"
                 >
                   <button
                     onClick={openHoroscopeModal}
                     className="px-8 py-3 bg-[#daa520] text-[#8b0000] font-bold rounded-[4px] shadow-[0_4px_14px_0_rgba(218,165,32,0.39)] hover:shadow-[0_6px_20px_rgba(218,165,32,0.23)] hover:bg-[#e2d1b3] transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
                   >
                     <Star className="w-4 h-4 fill-current" />
                     <span>Generate Horoscope</span>
                     <Star className="w-4 h-4 fill-current" />
                   </button>
                 </motion.div>
              )}

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
                     if (!chatInput.trim() || isLoading) return;
                     const newUserMsg: MessageItem = { id: Date.now().toString(), role: "user", text: chatInput };
                     setMessages(prev => [...prev, newUserMsg]);
                     setChatInput("");
                     setIsLoading(true);
                     
                     let followupPrompt = chatInput + `\n\nPlease reply primarily in ${LANGUAGE_ENGLISH_NAMES[uiLang]}. If your answer includes dates across years, please ALSO provide them as a JSON array in a markdown block starting with \`\`\`json. Each object MUST have { "year": number, "gregorianDate": "YYYY-MM-DD", "weekday": "Monday" }.`;

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
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={t.followupPlaceholder}
                    className="flex-1 bg-white border border-[#d1c4b2] rounded-[4px] px-5 py-3 text-[0.85rem] focus:outline-none focus:border-[#daa520] focus:ring-1 focus:ring-[#daa520]"
                  />
                  <button 
                   type="submit" 
                   disabled={isLoading || !chatInput.trim()}
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
             <div className="bg-[#f9f7f2] w-full max-w-3xl rounded-[6px] shadow-2xl flex flex-col max-h-[85vh] border-2 border-[#e2d1b3] overflow-hidden">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#e2d1b3] bg-white">
                   <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-[4px] bg-[#8b0000] text-[#daa520] flex items-center justify-center shadow-sm">
                         <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div>
                         <h2 className="text-base sm:text-lg font-bold text-[#8b0000] uppercase tracking-wider">{t.dashboardTitle || "User Dashboard"}</h2>
                         <p className="text-[0.7rem] text-[#5c554a] font-medium">Logged in as: {user.email || "Registered User"}</p>
                      </div>
                   </div>
                   <button onClick={() => setShowDashboard(false)} className="text-[#5c554a] hover:text-[#8b0000] p-1 rounded-[4px] hover:bg-gray-100 transition-colors">
                      <X className="w-5 h-5" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                   {/* 15-Day Data Retention Warning Banner */}
                   <div className="bg-amber-50/90 border-2 border-amber-300 rounded-[6px] p-4 text-xs text-amber-950 flex items-start space-x-3 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                         <h3 className="font-bold text-amber-950 text-sm mb-0.5">
                            ⚠️ Important Notice on Data Retention (15-Day Policy)
                         </h3>
                         <p className="leading-relaxed text-amber-900 text-[0.78rem]">
                            Calculated results and search logs are automatically deleted after <strong>15 days</strong>.
                            Click <strong className="text-[#8b0000]">"Save Permanently"</strong> on any calculation below to preserve it indefinitely in your account.
                         </p>
                      </div>
                   </div>

                   {/* Overview Stats */}
                   <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white border border-[#d1c4b2] p-3 rounded-[4px] flex flex-col items-center text-center shadow-sm">
                         <span className="text-[0.65rem] uppercase tracking-wider font-bold text-[#8e8372]">Total Searches</span>
                         <span className="text-xl font-bold text-[#8b0000] mt-0.5">{dashboardConfigs.length}</span>
                      </div>
                      <div className="bg-white border border-[#d1c4b2] p-3 rounded-[4px] flex flex-col items-center text-center shadow-sm">
                         <span className="text-[0.65rem] uppercase tracking-wider font-bold text-[#8e8372]">(t.savedPermanently || "Saved Permanently")</span>
                         <span className="text-xl font-bold text-emerald-700 mt-0.5">{dashboardConfigs.filter(c => c.isSavedPermanently).length}</span>
                      </div>
                      <div className="bg-white border border-[#d1c4b2] p-3 rounded-[4px] flex flex-col items-center text-center shadow-sm">
                         <span className="text-[0.65rem] uppercase tracking-wider font-bold text-[#8e8372]">Auto-Deleting Soon</span>
                         <span className="text-xl font-bold text-amber-700 mt-0.5">{dashboardConfigs.filter(c => !c.isSavedPermanently).length}</span>
                      </div>
                   </div>

                   {/* Search/Filter Bar */}
                   <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8e8372]" />
                      <input
                         type="text"
                         placeholder="Filter searches by date, location, or parameters..."
                         value={dashboardFilter}
                         onChange={e => setDashboardFilter(e.target.value)}
                         className="w-full bg-white border border-[#d1c4b2] rounded-[4px] pl-9 pr-3 py-1.5 text-xs text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                      />
                   </div>

                   {/* Searches & Generated Results List */}
                   <div className="space-y-3 pt-1">
                      <h3 className="text-xs uppercase font-bold tracking-widest text-[#8b4513] border-b border-[#e2d1b3] pb-1">
                         Searches & Generated Results
                      </h3>
                      {dashboardConfigs.length === 0 ? (
                         <div className="text-center text-[#5c554a] py-8 text-sm font-medium bg-white rounded-[4px] border border-[#d1c4b2]">
                            No previous searches found. Perform a search to see results here!
                         </div>
                      ) : (
                         dashboardConfigs
                            .filter(c => {
                               if (!dashboardFilter.trim()) return true;
                               const q = dashboardFilter.toLowerCase();
                               return c.label.toLowerCase().includes(q) ||
                                      (c.birthPlace && c.birthPlace.toLowerCase().includes(q)) ||
                                      (c.nakshatra && c.nakshatra.toLowerCase().includes(q));
                            })
                            .map(c => {
                               const daysRemaining = calculateDaysRemaining(c.createdAt);
                               const details = getTraditionalDetailsFromText(c.resultText || "", c);
                               return (
                                  <div key={c.id} className="bg-white border border-[#d1c4b2] hover:border-[#daa520] p-4 rounded-[6px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                                     <div className="flex-1 space-y-2 cursor-pointer" onClick={() => restoreConfigToView(c)}>
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                           <span className="font-bold text-[#2d2a26] text-sm">{c.label}</span>
                                           {c.isSavedPermanently ? (
                                              <span className="text-[0.65rem] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold flex items-center space-x-1">
                                                 <Bookmark className="w-3 h-3 fill-current text-emerald-700" />
                                                 <span>(t.savedPermanently || "Saved Permanently")</span>
                                              </span>
                                           ) : (
                                              <span className="text-[0.65rem] px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-bold flex items-center space-x-1">
                                                 <Clock className="w-3 h-3 text-amber-700" />
                                                 <span>Deletes in {daysRemaining} days</span>
                                              </span>
                                           )}
                                        </div>

                                        {/* Calculated Panchang Badges */}
                                        <div className="flex flex-wrap gap-1.5 text-[0.7rem]">
                                           <span className="bg-[#f9f7f2] border border-[#e2d1b3] px-2 py-0.5 rounded-[3px] text-[#8b0000] font-semibold">
                                              ⭐ Nakshatra: <strong>{c.nakshatra || details.nakshatra}</strong>
                                           </span>
                                           <span className="bg-[#f9f7f2] border border-[#e2d1b3] px-2 py-0.5 rounded-[3px] text-[#5c554a] font-semibold">
                                              �� Paksha: <strong>{c.paksha || details.paksha}</strong>
                                           </span>
                                           <span className="bg-[#f9f7f2] border border-[#e2d1b3] px-2 py-0.5 rounded-[3px] text-[#8b0000] font-semibold">
                                              �� Tithi: <strong>{c.tithi || details.tithi}</strong>
                                           </span>
                                           <span className="bg-[#f9f7f2] border border-[#e2d1b3] px-2 py-0.5 rounded-[3px] text-[#5c554a] font-semibold">
                                              �� Month: <strong>{c.lunarMonth || details.lunarMonth}</strong>
                                           </span>
                                        </div>

                                        <div className="text-[0.68rem] text-[#8e8372]">
                                           Calculated on {new Date(c.createdAt || Date.now()).toLocaleDateString()}
                                        </div>
                                     </div>

                                     <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                        <button
                                           onClick={(e) => toggleSavePermanently(c, e)}
                                           className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition-all flex items-center space-x-1 ${
                                              c.isSavedPermanently
                                                 ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                                                 : "bg-[#daa520] hover:bg-[#e2d1b3] text-[#8b0000]"
                                           }`}
                                           title={c.isSavedPermanently ? "Saved permanently in database" : "Protect from 15-day auto-deletion"}
                                        >
                                           <Bookmark className={`w-3.5 h-3.5 ${c.isSavedPermanently ? "fill-current" : ""}`} />
                                           <span>{c.isSavedPermanently ? "Saved" : "Save Permanently"}</span>
                                        </button>

                                        <button
                                           onClick={() => restoreConfigToView(c)}
                                           className="px-3 py-1.5 bg-[#8b0000] hover:bg-[#6b0000] text-white rounded-[4px] text-xs font-bold transition-colors"
                                        >
                                           View Result
                                        </button>

                                        <button
                                           onClick={(e) => handleDeleteConfig(c.id, e)}
                                           className="p-1.5 text-red-700 hover:bg-red-50 rounded-[4px] transition-colors"
                                           title="Delete this search"
                                        >
                                           <Trash2 className="w-4 h-4" />
                                        </button>
                                     </div>
                                  </div>
                               );
                            })
                      )}
                   </div>
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

        {/* Vedic Horoscope (Janam Kundali) Setup Modal */}
        <AnimatePresence>
          {showHoroscopeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#fcf8f2] border-2 border-[#daa520] rounded-[8px] max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-[#2d2a26]"
              >
                <div className="flex items-center justify-between border-b border-[#e2d1b3] pb-3 mb-4">
                  <div className="flex items-center space-x-2 text-[#8b0000]">
                    <Sparkles className="w-6 h-6 text-[#daa520]" />
                    <h3 className="text-xl font-bold font-serif">Vedic Horoscope (Janam Kundali) Setup</h3>
                  </div>
                  <button
                    onClick={() => setShowHoroscopeModal(false)}
                    className="text-[#8e8372] hover:text-[#8b0000] p-1 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-[#5c554a] mb-4 leading-relaxed bg-[#f9f5ed] p-3 rounded-[4px] border border-[#e2d1b3]">
                  ✨ Generating an authentic Vedic Janam Kundali requires precise birth details to calculate Lagna (Ascendant), Moon Sign (Rashi), Nakshatra, and planetary houses. Please confirm or input your birth parameters below.
                </p>

                <form onSubmit={handleGenerateHoroscopeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8b0000] mb-1">
                      Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={horoscopeName}
                      onChange={(e) => setHoroscopeName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full bg-white border border-[#e2d1b3] rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8b0000] mb-1">
                        Gender
                      </label>
                      <select
                        value={horoscopeGender}
                        onChange={(e) => setHoroscopeGender(e.target.value)}
                        className="w-full bg-white border border-[#e2d1b3] rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                      >
                        <option value="Unspecified">{t.unspecified || "Unspecified"}</option>
                        <option value="Male">{t.male || "Male"}</option>
                        <option value="Female">{t.female || "Female"}</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8b0000] mb-1">
                        Birth Date *
                      </label>
                      <input
                        type="date"
                        value={horoscopeBirthDate}
                        onChange={(e) => setHoroscopeBirthDate(e.target.value)}
                        className="w-full bg-white border border-[#e2d1b3] rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8b0000] mb-1">
                        Birth Time *
                      </label>
                      <input
                        type="time"
                        value={horoscopeBirthTime}
                        onChange={(e) => setHoroscopeBirthTime(e.target.value)}
                        className="w-full bg-white border border-[#e2d1b3] rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8b0000] mb-1">
                        Timezone
                      </label>
                      <input
                        type="text"
                        value={horoscopeTimezone}
                        onChange={(e) => setHoroscopeTimezone(e.target.value)}
                        placeholder="e.g. IST (UTC+5:30)"
                        className="w-full bg-white border border-[#e2d1b3] rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8b0000] mb-1">
                      Birth Place / City *
                    </label>
                    <input
                      type="text"
                      value={horoscopeBirthPlace}
                      onChange={(e) => setHoroscopeBirthPlace(e.target.value)}
                      placeholder="e.g. Daggupadu, Andhra Pradesh, India"
                      className="w-full bg-white border border-[#e2d1b3] rounded-[4px] px-3 py-2 text-sm text-[#2d2a26] focus:outline-none focus:border-[#daa520]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8b0000] mb-2">
                      Primary Horoscope Focus Area
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: "General Life & Kundali Overview", label: "General Life & Kundali Overview" },
                        { id: "Career, Business & Professional Growth", label: "Career & Business" },
                        { id: "Wealth, Finances & Prosperity", label: "Wealth & Finances" },
                        { id: "Health, Longevity & Vitality", label: "Health & Vitality" },
                        { id: "Relationships, Marriage & Family", label: "Relationships & Family" },
                        { id: "Current Dasha & Astrological Remedies", label: "Current Dasha & Remedies" }
                      ].map(({ id, label }) => (
                        <label
                          key={id}
                          className={`flex items-center space-x-2 p-2 rounded-[4px] border cursor-pointer transition-all ${
                            horoscopeFocus === id
                              ? "bg-[#daa520]/10 border-[#daa520] text-[#8b0000] font-semibold"
                              : "bg-white border-[#e2d1b3] text-[#5c554a] hover:bg-[#f9f5ed]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="horoscopeFocus"
                            value={id}
                            checked={horoscopeFocus === id}
                            onChange={(e) => setHoroscopeFocus(e.target.value)}
                            className="text-[#daa520] focus:ring-[#daa520] focus:ring-offset-[#fcf8f2] w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs leading-tight">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(!horoscopeBirthDate || !horoscopeBirthTime || !horoscopeBirthPlace) && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-[4px] text-xs text-amber-800">
                      ⚠️ Exact Birth Date, Birth Time, and Birth Place are required for accurate Vedic Kundali planetary calculations.
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#e2d1b3]">
                    <button
                      type="button"
                      onClick={() => setShowHoroscopeModal(false)}
                      className="px-4 py-2 border border-[#e2d1b3] rounded-[4px] text-xs font-bold text-[#5c554a] hover:bg-white transition-colors uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2 bg-[#8b0000] text-white rounded-[4px] text-xs font-bold hover:bg-[#a00000] disabled:opacity-50 transition-colors uppercase tracking-wider flex items-center space-x-1.5 shadow-md"
                    >
                      <Star className="w-4 h-4 text-[#daa520] fill-current" />
                      <span>Generate Vedic Horoscope</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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


