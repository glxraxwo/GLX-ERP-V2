const fs = require('fs');

let content = fs.readFileSync('./src/pages/BankAccountsPage.jsx', 'utf8');

content = content.replaceAll(
  `className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4"`
);
content = content.replace(
  `className="p-8 bg-white border border-dashed border-gray-300 rounded-2xl text-center text-gray-400"`,
  `className="p-8 bg-white dark:bg-[#111F33] border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl text-center text-gray-400 dark:text-slate-500"`
);
content = content.replace(
  `: 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'`,
  `: 'border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111F33] hover:border-gray-300 dark:hover:border-slate-700 hover:shadow-sm text-slate-800 dark:text-slate-100'`
);
content = content.replace(
  `className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition flex items-center gap-1 text-xs text-gray-600 font-medium"`,
  `className="p-1.5 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition flex items-center gap-1 text-xs text-gray-600 dark:text-slate-300 font-medium"`
);
content = content.replace(
  `className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400"`,
  `className="bg-white dark:bg-[#111F33] rounded-2xl border border-gray-200 dark:border-slate-800 p-16 text-center text-gray-400 dark:text-slate-500"`
);
content = content.replace(
  `className="p-5 border-b border-gray-200 bg-slate-50 flex justify-between items-center"`,
  `className="p-5 border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-[#132238] flex justify-between items-center"`
);

fs.writeFileSync('./src/pages/BankAccountsPage.jsx', content, 'utf8');
console.log('BankAccountsPage updated successfully!');
