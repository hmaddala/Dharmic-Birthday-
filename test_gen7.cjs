const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const model = "gemini-3.5-flash";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Hello"
    });
    console.log(model, "worked without search!");
  } catch (e) {
    console.log(model, "failed without search:", e.message);
  }
}
run().catch(console.error);
