const fs = require('fs');

let content = fs.readFileSync('./src/pages/BatchesPage.jsx', 'utf8');

content = content.replace(
  `className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm"`
);
content = content.replace(
  `className="py-12 bg-white rounded-xl border border-dashed border-gray-300 text-center text-gray-500"`,
  `className="py-12 bg-white dark:bg-[#111F33] rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-center text-gray-500 dark:text-slate-400"`
);
content = content.replace(
  `className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition flex flex-col justify-between"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition text-slate-800 dark:text-slate-100 flex flex-col justify-between"`
);
content = content.replace(
  `className="w-12 h-12 bg-slate-50 border border-gray-100 rounded-lg flex items-center justify-center text-primary-600 shrink-0"`,
  `className="w-12 h-12 bg-slate-50 dark:bg-[#132238] border border-gray-100 dark:border-slate-700 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0"`
);
content = content.replace(
  `className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-150 py-1 z-20"`,
  `className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#111F33] rounded-lg shadow-lg border border-gray-150 dark:border-slate-700 py-1 z-20"`
);
content = content.replaceAll(
  `className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"`,
  `className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"`
);
content = content.replace(
  `className="flex gap-3 items-end bg-gray-50 p-2.5 border border-gray-150 rounded-xl relative"`,
  `className="flex gap-3 items-end bg-gray-50 dark:bg-slate-900/60 p-2.5 border border-gray-150 dark:border-slate-800 rounded-xl relative"`
);
content = content.replaceAll(
  `className="w-full h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"`,
  `className="w-full h-9 px-2 bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg text-sm outline-none"`
);

fs.writeFileSync('./src/pages/BatchesPage.jsx', content, 'utf8');
console.log('BatchesPage updated successfully!');
