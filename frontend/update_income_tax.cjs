const fs = require('fs');

let content = fs.readFileSync('./src/pages/IncomeTaxPage.jsx', 'utf8');

content = content.replaceAll(
  `className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"`,
  `className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-[#132238] text-slate-700 dark:text-white outline-none"`
);
content = content.replaceAll(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"`
);
content = content.replace(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"`
);
content = content.replaceAll(
  `className="flex justify-between p-2 bg-slate-50 rounded-lg"`,
  `className="flex justify-between p-2 bg-slate-50 dark:bg-[#132238] border border-slate-200/60 dark:border-slate-700/60 rounded-lg"`
);

fs.writeFileSync('./src/pages/IncomeTaxPage.jsx', content, 'utf8');
console.log('IncomeTaxPage updated successfully!');
