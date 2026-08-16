const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldCall = `      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ googleSearch: {} }],
            },
          });
          
          if (response.text && response.text.trim().length > 0) {`;

const newCall = `      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Try with Google Search first, then fallback to without it
          const configTools = attempt <= 2 ? [{ googleSearch: {} }] : undefined;
          
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              ...(configTools ? { tools: configTools } : {})
            },
          });
          
          if (response.text && response.text.trim().length > 0) {`;

content = content.replace(oldCall, newCall);

const oldIf = `      if (!text) {
        throw lastError || new Error("Failed to generate text after multiple attempts.");
      }`;

const newIf = `      if (!text) {
        // If all attempts failed to get text but we have a response, maybe the model is refusing or returning empty on purpose.
        if (finalResponse && finalResponse.candidates && finalResponse.candidates.length > 0) {
           text = "I'm sorry, but I was unable to generate a response for that query. Please try rephrasing your request or provide more details.";
        } else {
           throw lastError || new Error("Failed to generate text after multiple attempts.");
        }
      }`;

content = content.replace(oldIf, newIf);

fs.writeFileSync('server.ts', content);
