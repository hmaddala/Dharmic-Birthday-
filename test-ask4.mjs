import fetch from 'node-fetch';
async function test() {
  const prompt = `Determine the precise traditional Vedic astrology (Panchang) details for someone born on:
Birth Date: 1985-05-15
Birth Time: 14:30
Birth Place: Mumbai, India
Timezone: IST

Use your Google Search tool to look up the exact Panchang (Tithi, Nakshatra, and Lunar Month) for this specific date, time, and location to ensure high accuracy. You MUST consult reliable astrological sources via search (like Drik Panchang, AstroSage, etc.) and NOT guess.
CRITICAL FOR ACCURACY: Tithis and Nakshatras change at highly specific times during the day. You MUST verify the exact transition times (end times) for the Tithi and Nakshatra on the birth date. Then, compare the given Birth Time against those transition times to determine which Tithi and Nakshatra were actually active at that exact moment.
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
    console.log(d);
  } catch(e) {
    console.error(e);
  }
}
test();
