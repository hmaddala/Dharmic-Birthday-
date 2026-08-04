const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(
  'import { Send, MapPin, Calendar, Clock, Star, Moon, CalendarDays, Loader2, Info, Printer, Globe, Share2, Download, LogIn, LogOut, History, X, Trash2, Maximize2, Minimize2, Github } from "lucide-react";',
  'import { Send, MapPin, Calendar, Clock, Star, Moon, CalendarDays, Loader2, Info, Printer, Globe, Share2, Download, LogIn, LogOut, History, X, Trash2, Maximize2, Minimize2, Github, Sparkles } from "lucide-react";'
);
fs.writeFileSync('src/App.tsx', app);
