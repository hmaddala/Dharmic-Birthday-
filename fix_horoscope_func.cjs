const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

const generateHoroscopeFunc = `
  const generateHoroscope = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const horoscopePrompt = "Please generate a detailed horoscope for the user based on their cosmic blueprint and birth details provided earlier. Make it engaging, uplifting, and beautifully formatted.";
    const newUserMsg: MessageItem = { id: Date.now().toString(), role: "user", text: horoscopePrompt };
    setMessages(prev => [...prev, newUserMsg]);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: horoscopePrompt, history: messages.map(m => ({ role: m.role, text: m.text })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed");
      const { cleanText, extractedJson } = parseJsonBlock(data.text || data.error);
      const modelMsg: MessageItem = { id: Date.now().toString() + "_m", role: "model", text: cleanText.trim(), jsonArray: extractedJson };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      const errMs: MessageItem = { id: Date.now().toString() + "_e", role: "model", text: \`**Error:** \${err.message}\` };
      setMessages(prev => [...prev, errMs]);
    } finally {
      setIsLoading(false);
    }
  };
`;

app = app.replace('const handleClear = () => {', generateHoroscopeFunc + '\n  const handleClear = () => {');

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx horoscope func injected');
