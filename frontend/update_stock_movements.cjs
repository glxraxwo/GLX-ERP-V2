const fs = require('fs');

let content = fs.readFileSync('./src/pages/StockMovementsPage.jsx', 'utf8');

content = content.replace(
  `className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200"`,
  `className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#132238] rounded-xl border border-slate-200 dark:border-slate-800"`
);
content = content.replaceAll(
  `className="bg-white p-2.5 rounded-lg border border-indigo-100"`,
  `className="bg-white dark:bg-[#111F33] p-2.5 rounded-lg border border-indigo-100 dark:border-slate-700"`
);
content = content.replaceAll(
  `className="p-3 bg-white border border-gray-200 rounded-xl space-y-1"`,
  `className="p-3 bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 rounded-xl space-y-1"`
);
content = content.replace(
  `className="p-3 bg-white border border-gray-200 rounded-xl space-y-2"`,
  `className="p-3 bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 rounded-xl space-y-2"`
);

fs.writeFileSync('./src/pages/StockMovementsPage.jsx', content, 'utf8');
console.log('StockMovementsPage updated successfully!');
