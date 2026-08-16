const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const translations = {
  PA: {
    privacyPolicy: 'ਪਰਦੇਦਾਰੀ ਨੀਤੀ',
    legalNotice: 'ਕਾਨੂੰਨੀ ਨੋਟਿਸ',
    terms: 'ਨਿਯਮ ਅਤੇ ਸ਼ਰਤਾਂ',
    imprint: 'ਛਾਪ'
  },
  AS: {
    privacyPolicy: 'গোপনীয়তা নীতি',
    legalNotice: 'আইনী জাননী',
    terms: 'নিয়ম আৰু চৰ্তাৱলী',
    imprint: 'ছাপ'
  },
  FR: {
    privacyPolicy: 'Politique de confidentialité',
    legalNotice: 'Mentions légales',
    terms: 'Conditions générales',
    imprint: 'Mentions légales (Imprint)'
  },
  IT: {
    privacyPolicy: 'Informativa sulla privacy',
    legalNotice: 'Nota legale',
    terms: 'Termini e Condizioni',
    imprint: 'Colophon (Imprint)'
  },
  ES: {
    privacyPolicy: 'Política de Privacidad',
    legalNotice: 'Aviso Legal',
    terms: 'Términos y Condiciones',
    imprint: 'Aviso Legal (Imprint)'
  },
  RU: {
    privacyPolicy: 'Политика конфиденциальности',
    legalNotice: 'Юридическое уведомление',
    terms: 'Условия и положения',
    imprint: 'Выходные данные'
  },
  UK: {
    privacyPolicy: 'Політика конфіденційності',
    legalNotice: 'Юридичне повідомлення',
    terms: 'Умови та положення',
    imprint: 'Вихідні дані'
  }
};

for (const lang of Object.keys(translations)) {
  const t = translations[lang];
  const langRegex = new RegExp(`(${lang}: \\{[\\s\\S]*?)privacyPolicy: "Privacy Policy",\\s*gotIt: "Got it",\\s*legalNotice: "Legal Notice",\\s*terms: "Terms & Conditions",\\s*imprint: "Imprint",`, 'g');
  
  content = content.replace(langRegex, `$1privacyPolicy: "${t.privacyPolicy}",\n    gotIt: "Got it",\n    legalNotice: "${t.legalNotice}",\n    terms: "${t.terms}",\n    imprint: "${t.imprint}",`);
}

fs.writeFileSync('src/App.tsx', content);
