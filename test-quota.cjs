const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: "Hello"
    });
    console.log("2.5-pro SUCCESS:", response.text);
  } catch(e) {
    console.error("2.5-pro ERROR:", e.message);
  }
}
run();
