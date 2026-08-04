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

app = app.replace('const handleSignOut = async () => {', generateHoroscopeFunc + '\n  const handleSignOut = async () => {');

const horoscopeBtn = `
              <div className="p-4 lg:p-6 bg-[#fdfcfb] border-t border-[#e2d1b3] sticky bottom-0 space-y-4">
                 {messages.length > 0 && messages.some(m => m.role === 'model') && (
                   <div className="max-w-4xl mx-auto flex justify-center mb-4">
                     <button
                       onClick={generateHoroscope}
                       disabled={isLoading}
                       className="relative overflow-hidden group bg-gradient-to-r from-[#daa520] to-[#b8860b] text-white px-8 py-3 rounded-full shadow-[0_0_15px_rgba(218,165,32,0.5)] hover:shadow-[0_0_25px_rgba(218,165,32,0.8)] transition-all duration-300 transform hover:-translate-y-1"
                     >
                       <span className="absolute inset-0 w-full h-full bg-white/20 group-hover:animate-ping rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                       <span className="relative font-bold tracking-wider text-sm flex items-center justify-center gap-2">
                         <Sparkles className="w-5 h-5" /> Generate Horoscope
                       </span>
                     </button>
                   </div>
                 )}
                <form 
`;
// Replace the start of the chat form area
app = app.replace(/<div className="p-4 lg:p-6 bg-\[#fdfcfb\] border-t border-\[#e2d1b3\] sticky bottom-0">\s*<form/g, horoscopeBtn);

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx horoscope btn added');
