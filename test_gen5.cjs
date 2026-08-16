const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = ["gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: "Hello",
        config: { tools: [{ googleSearch: {} }] }
      });
      console.log(model, "with search worked!");
    } catch (e) {
      console.log(model, "with search failed:", e.message.substring(0, 50));
    }
  }
}
run().catch(console.error);
