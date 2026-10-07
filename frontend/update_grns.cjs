const fs = require('fs');

let content = fs.readFileSync('./src/pages/GrnsPage.jsx', 'utf8');

content = content.replace(
  `hover:bg-gray-50 rounded`,
  `hover:bg-gray-50 dark:hover:bg-slate-800 rounded`
);
content = content.replace(
  `border border-gray-200 rounded-xl hover:bg-gray-50 transition`,
  `border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition`
);
content = content.replace(
  `className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl text-sm"`,
  `className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-[#132238]/60 p-4 rounded-xl border border-gray-200 dark:border-slate-800 text-sm"`
);
content = content.replace(
  `className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase"`,
  `className="bg-gray-50 dark:bg-[#132238] text-gray-500 dark:text-slate-400 font-semibold text-xs uppercase border-b border-gray-200 dark:border-slate-800"`
);
content = content.replace(
  `className="hover:bg-gray-50"`,
  `className="hover:bg-gray-50 dark:hover:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800/60"`
);
content = content.replace(
  `className="bg-gray-50 p-4 rounded-xl border border-gray-150 text-sm grid grid-cols-1 sm:grid-cols-3 gap-3"`,
  `className="bg-gray-50 dark:bg-[#132238]/60 p-4 rounded-xl border border-gray-150 dark:border-slate-800 text-sm grid grid-cols-1 sm:grid-cols-3 gap-3"`
);
content = content.replace(
  `className="border border-gray-200 p-4 rounded-xl space-y-3 bg-white shadow-sm"`,
  `className="border border-gray-200 dark:border-slate-700 p-4 rounded-xl space-y-3 bg-white dark:bg-[#111F33] shadow-sm"`
);
content = content.replace(
  `className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-4"`,
  `className="bg-gray-50 dark:bg-[#132238]/60 p-4 rounded-xl border border-gray-150 dark:border-slate-800 space-y-4"`
);
content = content.replaceAll(
  `border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500`,
  `border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500`
);
content = content.replace(
  `className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border"`,
  `className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-700 p-3 rounded-lg"`
);

fs.writeFileSync('./src/pages/GrnsPage.jsx', content, 'utf8');
console.log('GrnsPage updated successfully!');
