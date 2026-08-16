const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `guestTip: "Tip: password is hari2",\n  },\n  ES: {`,
  `guestTip: "Suggerimento: la password è hari2",
    iAcceptThe: "Accetto i",
    and: "e la",
    fillMandatory: "Compila tutti i campi obbligatori e accetta i termini",
    calculating: "Calcolo...",
  },
  ES: {`
);

content = content.replace(
  `    guestTip: "Tip: password is hari2",\n  },\n  RU: {`,
  `    guestTip: "Consejo: la contraseña es hari2",
    iAcceptThe: "Acepto los",
    and: "y la",
    fillMandatory: "Complete todos los campos obligatorios y acepte los términos",
    calculating: "Calculando...",
  },
  RU: {`
);

content = content.replace(
  `    guestTip: "Tip: password is hari2",\n  },\n  UK: {`,
  `    guestTip: "Подсказка: пароль hari2",
    iAcceptThe: "Я принимаю",
    and: "и",
    fillMandatory: "Пожалуйста, заполните все обязательные поля и примите условия",
    calculating: "Вычисление...",
  },
  UK: {`
);

content = content.replace(
  `    guestTip: "Tip: password is hari2",\n  },\n};`,
  `    guestTip: "Підказка: пароль hari2",
    iAcceptThe: "Я приймаю",
    and: "та",
    fillMandatory: "Будь ласка, заповніть усі обов'язкові поля та прийміть умови",
    calculating: "Обчислення...",
  },
};`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Translations modified pt3");
