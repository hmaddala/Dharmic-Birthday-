const fs = require('fs');

let contentApp = fs.readFileSync('src/App.tsx', 'utf8');

// The logic inside the table in App.tsx:
const oldLogic = `                                                const parts = row.gregorianDate.split('-');
                                                if (parts.length === 3) {
                                                  if (dateFormat === 'DD-MM-YYYY') return \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
                                                  if (dateFormat === 'MM-DD-YYYY') return \`\${parts[1]}-\${parts[2]}-\${parts[0]}\`;
                                                }
                                                return row.gregorianDate;`;

const newLogic = `                                                const parts = row.gregorianDate.split('-');
                                                if (parts.length === 3) {
                                                  let year, month, day;
                                                  if (parts[0].length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
                                                  else { year = parts[2]; month = parts[1]; day = parts[0]; }
                                                  if (dateFormat === 'DD-MM-YYYY') return \`\${day}-\${month}-\${year}\`;
                                                  if (dateFormat === 'MM-DD-YYYY') return \`\${month}-\${day}-\${year}\`;
                                                  return \`\${year}-\${month}-\${day}\`;
                                                }
                                                return row.gregorianDate;`;

contentApp = contentApp.replace(oldLogic, newLogic);
fs.writeFileSync('src/App.tsx', contentApp);

let contentTimeline = fs.readFileSync('src/components/Timeline.tsx', 'utf8');

const oldTimelineLogic = `           const parts = d.gregorianDate.split('-');
           if(parts.length === 3) {
             if (dateFormat === 'DD-MM-YYYY') return \`\${parts[2]}-\${parts[1]}\`;
             return \`\${parts[1]}-\${parts[2]}\`; // MM-DD
           }
           return d.gregorianDate;`;

const newTimelineLogic = `           const parts = d.gregorianDate.split('-');
           if(parts.length === 3) {
             let month, day;
             if (parts[0].length === 4) { month = parts[1]; day = parts[2]; }
             else { month = parts[1]; day = parts[0]; }
             if (dateFormat === 'DD-MM-YYYY') return \`\${day}-\${month}\`;
             if (dateFormat === 'MM-DD-YYYY') return \`\${month}-\${day}\`;
             return \`\${month}-\${day}\`;
           }
           return d.gregorianDate;`;

contentTimeline = contentTimeline.replace(oldTimelineLogic, newTimelineLogic);
fs.writeFileSync('src/components/Timeline.tsx', contentTimeline);

