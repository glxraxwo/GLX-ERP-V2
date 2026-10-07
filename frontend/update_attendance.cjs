const fs = require('fs');

let content = fs.readFileSync('./src/pages/AttendancePage.jsx', 'utf8');

content = content.replace(
  `className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"`,
  `className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"`
);
content = content.replace(
  `className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none"`,
  `className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-[#132238] text-slate-800 dark:text-white focus:outline-none"`
);
content = content.replace(
  `className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider"`,
  `className="bg-slate-100/80 dark:bg-[#132238] sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider"`
);
content = content.replace(
  `className="divide-y divide-slate-100 bg-white"`,
  `className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#111F33]"`
);
content = content.replace(
  `hover:bg-slate-50 transition`,
  `hover:bg-slate-50 dark:hover:bg-slate-800/50 transition`
);
content = content.replace(
  `'border-slate-200 text-slate-700 bg-white'`,
  `'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-[#132238]'`
);
content = content.replaceAll(
  `className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold disabled:bg-slate-100 disabled:text-slate-400"`,
  `className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold bg-white dark:bg-[#132238] text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"`
);
content = content.replace(
  `className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t bg-slate-50"`,
  `className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1A2B]"`
);
content = content.replace(
  `className="p-4 bg-gray-50 rounded-lg text-xs space-y-2"`,
  `className="p-4 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg text-xs space-y-2"`
);
content = content.replace(
  `className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50"`,
  `className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0E1A2B]"`
);

fs.writeFileSync('./src/pages/AttendancePage.jsx', content, 'utf8');
console.log('AttendancePage updated successfully!');
