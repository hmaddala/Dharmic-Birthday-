const fetch = require('node-fetch');
async function test() {
  const prompt = `Determine the precise traditional Vedic astrology (Panchang) details for someone born on:
Birth Date: 2000-01-01
Birth Time: 12:00
Birth Place: New Delhi, India
Timezone: IST

Use your Google Search tool to look up the exact Panchang (Tithi, Nakshatra, and Lunar Month) for this specific date, time, and location to ensure high accuracy. You MUST consult reliable astrological sources via search (like Drik Panchang, AstroSage, etc.) and NOT guess.
IMPORTANT: Vedic dates change at sunrise, not midnight. The Tithi and Nakshatra are the ones active at the exact time of birth.
Once you have verified the correct details via search, provide your final answer as a JSON object enclosed in \`\`\`json and \`\`\`, exactly matching this format:
{
  "nakshatra": "String",
  "paksha": "String ('Shukla Paksha (Waxing)' or 'Krishna Paksha (Waning)')",
  "tithi": "String",
  "lunarMonth": "String"
}`;
  try {
    const r = await fetch('http://localhost:3000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history: [] })
    });
    const d = await r.json();
    console.log(d.text);
  } catch(e) {
    console.error(e);
  }
}
test();
