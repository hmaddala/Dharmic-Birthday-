const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// For other languages, let's just make sure they have fallbacks or add translations
content = content.replace(`    guestTip: "Tip: password is hari2",\n  },\n  IT: {`, `    guestTip: "Tip: password is hari2",\n    iAcceptThe: "J'accepte les",\n    and: "et",\n    fillMandatory: "Veuillez remplir tous les champs obligatoires et accepter les conditions",\n    calculating: "Calcul...",\n  },\n  IT: {`);

content = content.replace(`    guestTip: "Tip: password is hari2",\n  },\n  ES: {`, `    guestTip: "Tip: password is hari2",\n    iAcceptThe: "Accetto i",\n    and: "e la",\n    fillMandatory: "Compila tutti i campi obbligatori e accetta i termini",\n    calculating: "Calcolo...",\n  },\n  ES: {`);

content = content.replace(`    guestTip: "Tip: password is hari2",\n  },\n  RU: {`, `    guestTip: "Tip: password is hari2",\n    iAcceptThe: "Acepto los",\n    and: "y la",\n    fillMandatory: "Complete todos los campos obligatorios y acepte los términos",\n    calculating: "Calculando...",\n  },\n  RU: {`);

content = content.replace(`    guestTip: "Tip: password is hari2",\n  },\n  UK: {`, `    guestTip: "Tip: password is hari2",\n    iAcceptThe: "Я принимаю",\n    and: "и",\n    fillMandatory: "Пожалуйста, заполните все обязательные поля и примите условия",\n    calculating: "Вычисление...",\n  },\n  UK: {`);

content = content.replace(`    guestTip: "Tip: password is hari2",\n  },\n};`, `    guestTip: "Tip: password is hari2",\n    iAcceptThe: "Я приймаю",\n    and: "та",\n    fillMandatory: "Будь ласка, заповніть усі обов'язкові поля та прийміть умови",\n    calculating: "Обчислення...",\n  },\n};`);


// German
content = content.replace(`    tooltipNotes: "Geben Sie spezielle Berechnungsmethoden an (wie Amanta oder Purnimanta) oder fügen Sie Ihrer Anfrage Kontext hinzu.",`, `    tooltipNotes: "Geben Sie spezielle Berechnungsmethoden an (wie Amanta oder Purnimanta) oder fügen Sie Ihrer Anfrage Kontext hinzu.",\n    iAcceptThe: "Ich akzeptiere die",\n    and: "und die",\n    fillMandatory: "Bitte füllen Sie alle Pflichtfelder aus und akzeptieren Sie die Bedingungen",\n    calculating: "Berechne...",`);

// Hindi
content = content.replace(`    tooltipNotes: "विशिष्ट गणना विधियां (जैसे अमांत या पूर्णिमांत) निर्दिष्ट करें या अपने अनुरोध में संदर्भ जोड़ें।",`, `    tooltipNotes: "विशिष्ट गणना विधियां (जैसे अमांत या पूर्णिमांत) निर्दिष्ट करें या अपने अनुरोध में संदर्भ जोड़ें।",\n    iAcceptThe: "मैं स्वीकार करता हूँ",\n    and: "और",\n    fillMandatory: "कृपया सभी अनिवार्य फ़ील्ड भरें और नियम व शर्तें स्वीकार करें",\n    calculating: "गणना हो रही है...",`);

fs.writeFileSync('src/App.tsx', content);
console.log("Translations modified");
