const fs = require('fs');

let content = fs.readFileSync('./src/pages/DailyPayrollPage.jsx', 'utf8');

content = content.replaceAll(
  `hover:bg-slate-50 transition`,
  `hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800/60 transition`
);
content = content.replace(
  `className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-200 text-xs"`,
  `className="flex items-center gap-1 bg-gray-50 dark:bg-[#132238] p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs"`
);
content = content.replaceAll(
  `className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold"`,
  `className="px-2 py-1 bg-white dark:bg-[#111F33] border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold"`
);
content = content.replace(
  `className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b"`,
  `className="bg-gray-50 dark:bg-[#132238] text-gray-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-800"`
);
content = content.replace(
  `className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp"`
);
content = content.replace(
  `className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold font-mono bg-white outline-none focus:border-slate-900"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-bold font-mono bg-white dark:bg-[#132238] text-gray-900 dark:text-white outline-none focus:border-slate-900"`
);
content = content.replace(
  `: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'`,
  `: 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'`
);
content = content.replaceAll(
  `className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:border-slate-900 outline-none"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:border-slate-900 outline-none"`
);
content = content.replace(
  `className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white outline-none"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white outline-none"`
);

fs.writeFileSync('./src/pages/DailyPayrollPage.jsx', content, 'utf8');
console.log('DailyPayrollPage updated successfully!');
