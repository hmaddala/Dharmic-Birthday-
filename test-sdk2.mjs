import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "What is the latest news in Paris?",
    config: {
       tools: [{ googleSearch: {} }]
    }
  });
  console.log("type of response.text:", typeof response.text);
  console.log("response.text:", response.text);
  console.log("candidates:", JSON.stringify(response.candidates, null, 2));
}
test().catch(console.error);
