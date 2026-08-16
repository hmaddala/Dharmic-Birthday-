const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldCall = `      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],

        },
      });

      if (!response.text) {
        const candidate = response.candidates && response.candidates[0];
        const finishReason = candidate ? candidate.finishReason : 'UNKNOWN';
        fs.writeFileSync('candidate-error.json', JSON.stringify(candidate, null, 2));
        throw new Error(\`No text returned by the model. Finish reason: \${finishReason}\`);
      }
      res.json({ text: response.text });`;

const newCall = `      let finalResponse = null;
      let lastError = null;
      let text = "";
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ googleSearch: {} }],
            },
          });
          
          if (response.text && response.text.trim().length > 0) {
            text = response.text;
            finalResponse = response;
            break;
          } else {
             const candidate = response.candidates && response.candidates[0];
             const finishReason = candidate ? candidate.finishReason : 'UNKNOWN';
             lastError = new Error(\`No text returned by the model. Finish reason: \${finishReason}\`);
          }
        } catch (e: any) {
          lastError = e;
        }
      }
      
      if (!text) {
        throw lastError || new Error("Failed to generate text after multiple attempts.");
      }
      
      res.json({ text });`;

content = content.replace(oldCall, newCall);
fs.writeFileSync('server.ts', content);
