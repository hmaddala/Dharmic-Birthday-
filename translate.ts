import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  const code = fs.readFileSync("src/App.tsx", "utf-8");
  
  // Extract EN object
  const enStart = code.indexOf("  EN: {");
  const enEnd = code.indexOf("  DE: {", enStart);
  
  let enObjectText = code.substring(enStart + 8, enEnd - 4);
  enObjectText = "{" + enObjectText + "}";

  // We can't just JSON parse it because it has JSX and unquoted keys.
  // Instead, we will pass it to Gemini and ask it to translate it.
  
  const langs = ["PA", "AS", "FR", "IT", "ES", "RU", "UK"];
  const langNames = ["Punjabi", "Assamese", "French", "Italian", "Spanish", "Russian", "Ukrainian"];

  for (let i=0; i<langs.length; i++) {
     console.log(`Translating to ${langNames[i]}...`);
     const prompt = `
You are a translation assistant.
Translate the following JavaScript object (which contains some JSX elements) from English to ${langNames[i]}.
Maintain the exact same keys, structure, and JSX tags. Only translate the text content (both string values and text inside JSX).
Do NOT translate terms like "Tithi", "Nakshatra", "Paksha", "Panchang" - keep them or use their exact culturally appropriate term in the target language.
Do NOT return Markdown formatting like \`\`\`javascript, just return the raw object code starting with \`{\` and ending with \`}\`.
Make sure you include ALL keys.

Object to translate:
${enObjectText}
`;

     try {
       const response = await ai.models.generateContent({
         model: "gemini-2.5-flash",
         contents: prompt,
       });

       let translatedText = response.text;
       if (translatedText.startsWith("\`\`\`")) {
          translatedText = translatedText.replace(/^\`\`\`(javascript|json|ts|tsx)?/, "").replace(/\`\`\`$/, "");
       }
       fs.writeFileSync(`translated_${langs[i]}.txt`, translatedText);
       console.log(`Saved translated_${langs[i]}.txt`);
       // add delay to avoid rate limit
       await new Promise(resolve => setTimeout(resolve, 5000));
     } catch (e) {
       console.error(`Error translating to ${langNames[i]}`, e);
     }
  }
}

run();
