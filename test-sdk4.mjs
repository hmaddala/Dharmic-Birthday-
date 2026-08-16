import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const contents = [
    { role: 'user', parts: [{ text: 'Can you look up the current tithi for today?' }] }
  ];
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  console.log("type of response.text:", typeof response.text);
  console.log("response.text:", response.text);
  console.log("candidates:", JSON.stringify(response.candidates, null, 2));
}
test().catch(console.error);
