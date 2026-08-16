const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = await ai.models.list();
  for await (const m of models) {
    if (m.name.includes("flash") || m.name.includes("pro")) {
      console.log(m.name);
    }
  }
}
run().catch(console.error);
