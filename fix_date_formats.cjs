const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /if \(format === 'DD-MM-YYYY'\) return \['dd-MM-yyyy'.*?\];/,
  `if (format === 'DD-MM-YYYY') return ['dd-MM-yyyy', 'dd.MM.yyyy', 'ddMMyyyy', 'dMyyyy', 'dMMyyyy', 'ddMyyyy', 'd.M.yyyy', 'd.M.yy', 'dd.MM.yy', 'dd-MM-yy', 'd-M-yy', 'dd/MM/yyyy', 'd/M/yyyy', 'd/M/yy', 'dd/MM/yy'];`
);

content = content.replace(
  /if \(format === 'MM-DD-YYYY'\) return \['MM-dd-yyyy'.*?\];/,
  `if (format === 'MM-DD-YYYY') return ['MM-dd-yyyy', 'MM.dd.yyyy', 'MMddyyyy', 'Mdyyyy', 'Mddyyyy', 'MMdyyyy', 'M.d.yyyy', 'M.d.yy', 'MM.dd.yy', 'MM-dd-yy', 'M-d-yy', 'MM/dd/yyyy', 'M/d/yyyy', 'M/d/yy', 'MM/dd/yy'];`
);

fs.writeFileSync('src/App.tsx', content);
