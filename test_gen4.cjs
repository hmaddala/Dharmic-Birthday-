const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: "Hello",
      });
      console.log(model, "worked!");
    } catch (e) {
      console.log(model, "failed:", e.message.substring(0, 50));
    }
  }
}
run().catch(console.error);
