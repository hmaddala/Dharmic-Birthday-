const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const translations = {
  PA: {
    underConstructionBtn: 'ਨਿਰਮਾਣ ਅਧੀਨ',
    guestLoginBtn: 'ਮਹਿਮਾਨ ਲੌਗਇਨ',
    underConstructionTitle: 'ਨਿਰਮਾਣ ਅਧੀਨ',
    underConstructionDesc1: 'ਇਹ ਐਪਲੀਕੇਸ਼ਨ ਵਰਤਮਾਨ ਵਿੱਚ ਬਣਾਈ ਜਾ ਰਹੀ ਹੈ।',
    underConstructionDesc2: 'ਅਸੀਂ ਅਸੁਵਿਧਾ ਲਈ ਮੁਆਫੀ ਚਾਹੁੰਦੇ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਬਾਅਦ ਵਿੱਚ ਦੁਬਾਰਾ ਜਾਂਚ ਕਰੋ।',
  },
  AS: {
    underConstructionBtn: 'নিৰ্মাণাধীন',
    guestLoginBtn: 'অতিথি লগইন',
    underConstructionTitle: 'নিৰ্মাণাধীন',
    underConstructionDesc1: 'এই এপ্লিকেচনটো বৰ্তমান নিৰ্মাণ কৰা হৈ আছে।',
    underConstructionDesc2: 'অসুবিধাৰ বাবে আমি আন্তৰিকভাৱে দুঃখিত। অনুগ্ৰহ কৰি পিছত পুনৰ পৰীক্ষা কৰক।',
  },
  FR: {
    underConstructionBtn: 'En construction',
    guestLoginBtn: 'Connexion Invité',
    underConstructionTitle: 'En construction',
    underConstructionDesc1: 'Cette application est en cours de création.',
    underConstructionDesc2: 'Nous nous excusons sincèrement pour la gêne occasionnée. Veuillez vérifier plus tard.',
  },
  IT: {
    underConstructionBtn: 'In costruzione',
    guestLoginBtn: 'Accesso Ospite',
    underConstructionTitle: 'In costruzione',
    underConstructionDesc1: 'Questa applicazione è attualmente in fase di costruzione.',
    underConstructionDesc2: 'Ci scusiamo sinceramente per il disagio. Si prega di riprovare più tardi.',
  },
  ES: {
    underConstructionBtn: 'En construcción',
    guestLoginBtn: 'Acceso de Invitado',
    underConstructionTitle: 'En construcción',
    underConstructionDesc1: 'Esta aplicación se está construyendo actualmente.',
    underConstructionDesc2: 'Nos disculpamos sinceramente por las molestias. Por favor, vuelva a consultar más tarde.',
  },
  RU: {
    underConstructionBtn: 'В разработке',
    guestLoginBtn: 'Гостевой вход',
    underConstructionTitle: 'В разработке',
    underConstructionDesc1: 'Это приложение в настоящее время создается.',
    underConstructionDesc2: 'Мы искренне приносим извинения за доставленные неудобства. Пожалуйста, зайдите позже.',
  },
  UK: {
    underConstructionBtn: 'В розробці',
    guestLoginBtn: 'Гостьовий вхід',
    underConstructionTitle: 'В розробці',
    underConstructionDesc1: 'Ця програма наразі створюється.',
    underConstructionDesc2: 'Ми щиро перепрошуємо за незручності. Будь ласка, перевірте пізніше.',
  }
};

for (const lang of Object.keys(translations)) {
  const t = translations[lang];
  const langRegex = new RegExp(`(${lang}: \\{[\\s\\S]*?)underConstructionBtn: "Under Construction",\\s*guestLoginBtn: "Guest Login",\\s*underConstructionTitle: "Under Construction",\\s*underConstructionDesc1: "This application is currently being built.",\\s*underConstructionDesc2: "We sincerely apologize for the inconvenience. Please check back later.",`, 'g');
  
  content = content.replace(langRegex, `$1underConstructionBtn: "${t.underConstructionBtn}",\n    guestLoginBtn: "${t.guestLoginBtn}",\n    underConstructionTitle: "${t.underConstructionTitle}",\n    underConstructionDesc1: "${t.underConstructionDesc1}",\n    underConstructionDesc2: "${t.underConstructionDesc2}",`);
}

fs.writeFileSync('src/App.tsx', content);
