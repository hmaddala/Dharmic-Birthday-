import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Say 'yes' and nothing else."
  });
  console.log("type of response.text:", typeof response.text);
  console.log("response.text:", response.text);
  console.log("candidate text:", response.candidates?.[0]?.content?.parts?.[0]?.text);
  console.log("candidate text 2:", response.candidates?.[0]?.content?.parts?.[0]?.text());
}
test().catch(console.error);
