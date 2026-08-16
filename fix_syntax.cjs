const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// There are duplicate properties in translations, let's fix that
// We'll use a regex to find all the object blocks and make sure they don't have duplicate keys
// Actually it's probably guestTip, iAcceptThe, etc which I inserted at the end but maybe they were already there? No, I overwrote the whole end block but maybe I didn't clean up well. Let's look at the errors.

