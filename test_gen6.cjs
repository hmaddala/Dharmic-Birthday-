const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const model = "gemini-3.5-flash";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Hello",
      config: { tools: [{ googleSearch: {} }] }
    });
    console.log(model, "with search worked!");
  } catch (e) {
    console.log(model, "with search failed:", e.message);
  }
}
run().catch(console.error);
