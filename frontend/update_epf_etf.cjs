const fs = require('fs');

let content = fs.readFileSync('./src/pages/EpfEtfPage.jsx', 'utf8');

content = content.replaceAll(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"`
);
content = content.replace(
  `className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"`
);
content = content.replace(
  `className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider text-left"`,
  `className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#132238] text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider text-left"`
);
content = content.replace(
  `className="hover:bg-slate-50/50 text-slate-700"`,
  `className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/60"`
);
content = content.replace(
  `className="bg-slate-50 text-xs font-bold text-slate-800 border-t border-slate-300"`,
  `className="bg-slate-50 dark:bg-[#132238] text-xs font-bold text-slate-800 dark:text-white border-t border-slate-300 dark:border-slate-700"`
);

fs.writeFileSync('./src/pages/EpfEtfPage.jsx', content, 'utf8');
console.log('EpfEtfPage updated successfully!');
