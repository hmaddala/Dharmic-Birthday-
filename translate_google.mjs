import translate from "translate";
import * as fs from "fs";

translate.engine = "google";

const langs = [
  { code: "PA", googleCode: "pa" }, // Punjabi
  { code: "AS", googleCode: "as" }, // Assamese
  { code: "FR", googleCode: "fr" }, // French
  { code: "IT", googleCode: "it" }, // Italian
  { code: "ES", googleCode: "es" }, // Spanish
  { code: "RU", googleCode: "ru" }, // Russian
  { code: "UK", googleCode: "uk" }, // Ukrainian
];

// Read EN translations from App.tsx
const codeContent = fs.readFileSync("src/App.tsx", "utf-8");
const enStart = codeContent.indexOf("  EN: {");
const enEnd = codeContent.indexOf("  DE: {", enStart);
let enObjectText = codeContent.substring(enStart + 8, enEnd - 4).trim();

// To avoid parsing JSX, let's extract strings with a simple regex
// or just use eval? No, there is JSX inside like heroProblemDesc: <><p>...</p></>
// Let's create a map of keys to text.

// I'll parse it manually.
const keys = [];
const values = [];
const lines = enObjectText.split('\n');
let currentKey = "";
let currentValue = "";
let inJSX = false;

for (let line of lines) {
  if (!inJSX) {
    const match = line.match(/^\s*([a-zA-Z0-9]+):\s*(.*)/);
    if (match) {
      if (currentKey) {
        keys.push(currentKey);
        values.push(currentValue);
      }
      currentKey = match[1];
      currentValue = match[2];
      if (currentValue.includes("<>") && !currentValue.includes("</>")) {
         inJSX = true;
      }
    }
  } else {
    currentValue += "\n" + line;
    if (line.includes("</>")) {
      inJSX = false;
    }
  }
}
if (currentKey) {
  keys.push(currentKey);
  values.push(currentValue);
}

// Function to translate a single string (including JSX)
async function translateValue(val, lang) {
   if (val.startsWith("\"")) {
      let str = val.replace(/^"/, "").replace(/",?$/, "");
      try {
        let t = await translate(str, { to: lang });
        return '"' + t.replace(/"/g, '\\"') + '",';
      } catch (e) {
        return val;
      }
   } else if (val.startsWith("<>")) {
      // It's JSX, we need to translate text inside tags.
      // A simple regex to replace text between tags
      let parts = val.split(/(<[^>]+>)/g);
      for (let i = 0; i < parts.length; i++) {
         if (!parts[i].startsWith("<") && parts[i].trim() !== "") {
            try {
               let t = await translate(parts[i], { to: lang });
               parts[i] = t;
            } catch (e) {}
         }
      }
      return parts.join("") + ",";
   }
   return val;
}

async function run() {
  for (let l of langs) {
    console.log("Translating to " + l.code);
    let result = `  ${l.code}: {\n`;
    for (let i = 0; i < keys.length; i++) {
       let translated = await translateValue(values[i], l.googleCode);
       result += `    ${keys[i]}: ${translated}\n`;
    }
    result += `  },\n`;
    fs.writeFileSync(`translated_${l.code}.txt`, result);
    console.log("Saved " + l.code);
  }
}

run();
