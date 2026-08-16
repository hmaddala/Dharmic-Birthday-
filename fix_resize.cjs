const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /const \[isGuest, setIsGuest\] = useState\(false\);/,
  `const [isGuest, setIsGuest] = useState(false);
  const [panelWidth, setPanelWidth] = useState(360);
  const [isDragging, setIsDragging] = useState(false);`
);

// We need to add the mouse handlers
content = content.replace(
  /const hasAllFourDetails =/,
  `
  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      let newWidth = e.clientX;
      if (newWidth < 280) newWidth = 280;
      if (newWidth > 800) newWidth = 800;
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const hasAllFourDetails =`
);

content = content.replace(
  /<section className="w-full lg:w-\[360px\] border-r border-\[#e2d1b3\] bg-white flex-shrink-0 flex flex-col print:hidden lg:h-full z-10 shadow-md">/,
  `<section 
          className="w-full border-r border-[#e2d1b3] bg-white flex-shrink-0 flex flex-col print:hidden lg:h-full z-10 shadow-md relative"
          style={{ width: window.innerWidth >= 1024 ? \`\${panelWidth}px\` : '100%' }}
        >
          {/* Resize Handle */}
          <div 
            className="hidden lg:block absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-[#daa520]/50 z-20"
            onMouseDown={startResizing}
          />`
);

fs.writeFileSync('src/App.tsx', content);
