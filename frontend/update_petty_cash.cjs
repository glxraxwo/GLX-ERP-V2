const fs = require('fs');

let content = fs.readFileSync('./src/pages/PettyCashPage.jsx', 'utf8');

content = content.replace(
  `border border-gray-200 rounded-xl hover:bg-gray-50 transition`,
  `border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition`
);
content = content.replace(
  `className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 transition shadow-xs"`,
  `className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition shadow-xs"`
);
content = content.replace(
  `className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"`,
  `className="col-span-1 md:col-span-2 bg-white dark:bg-[#111F33] rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm"`
);
content = content.replace(
  `className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden"`
);
content = content.replace(
  `className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-gray-50/50"`,
  `className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-gray-50/50 dark:bg-[#132238]/60"`
);
content = content.replace(
  `className="p-2 border border-gray-200 rounded-lg hover:bg-white bg-white shadow-2xs"`,
  `className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 bg-white dark:bg-[#132238] shadow-2xs"`
);
content = content.replace(
  `className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"`,
  `className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800/60 transition-colors"`
);
content = content.replace(
  `className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"`
);
content = content.replace(
  `className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"`,
  `className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"`
);

fs.writeFileSync('./src/pages/PettyCashPage.jsx', content, 'utf8');
console.log('PettyCashPage updated successfully!');
