const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  'const [birthTime, setBirthTime] = useState("");',
  'const [birthTime, setBirthTime] = useState("");\n  const handleTimeChange = (date: Date | null) => {\n    if (date) {\n      const h = String(date.getHours()).padStart(2, "0");\n      const m = String(date.getMinutes()).padStart(2, "0");\n      setBirthTime(`${h}:${m}`);\n    } else {\n      setBirthTime("");\n    }\n  };'
);

const timeInputStr = `
                      <input
                        type="time"
                        value={birthTime}
                        onChange={(e) => setBirthTime(e.target.value)}
                        className="p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                      />
`;

const timePickerStr = `
                      <DatePicker
                        selected={birthTime ? new Date(\`2000-01-01T\${birthTime}\`) : null}
                        onChange={handleTimeChange}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={1}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        placeholderText="HH:mm"
                        portalId="root"
                        wrapperClassName="w-full"
                        className="w-full p-2 border border-[#d1c4b2] rounded-[4px] text-[0.85rem] bg-[#fdfcfb] focus:outline-none focus:border-[#daa520]"
                      />
`;

app = app.replace(timeInputStr.trim(), timePickerStr.trim());

fs.writeFileSync('src/App.tsx', app);
console.log('Successfully replaced time input with DatePicker');
