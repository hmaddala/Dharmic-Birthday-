const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldResponseBlock = `      res.json({ text: response.text });
    } catch (error: any) {`;

const newResponseBlock = `      if (!response.text) {
        throw new Error("No text returned by the model. It might have been blocked or failed to generate.");
      }
      res.json({ text: response.text });
    } catch (error: any) {`;

content = content.replace(oldResponseBlock, newResponseBlock);
fs.writeFileSync('server.ts', content);
