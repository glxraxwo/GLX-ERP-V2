const fs = require('fs');
const content = fs.readFileSync('./src/pages/QuotationsPage.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (
    (l.includes('bg-white') || l.includes('bg-gray-50') || l.includes('bg-slate-50')) &&
    !l.includes('dark:bg') &&
    !l.includes('print:') && // skip print-only styling like print:bg-white
    !l.trim().startsWith('//')
  ) {
    console.log(`L${idx+1}: ${l.trim().substring(0, 100)}`);
  }
});
