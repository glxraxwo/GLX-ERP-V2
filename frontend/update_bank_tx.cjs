const fs = require('fs');

let content = fs.readFileSync('./src/pages/BankTransactionsPage.jsx', 'utf8');

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
  `className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] border border-slate-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"`
);
content = content.replaceAll(
  `className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"`,
  `className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-[#132238] text-slate-700 dark:text-white outline-none"`
);
content = content.replace(
  `className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"`,
  `className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"`
);

fs.writeFileSync('./src/pages/BankTransactionsPage.jsx', content, 'utf8');
console.log('BankTransactionsPage updated successfully!');
