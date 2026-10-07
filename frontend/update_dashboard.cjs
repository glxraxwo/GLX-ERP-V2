const fs = require('fs');

let content = fs.readFileSync('./src/pages/DashboardPage.jsx', 'utf8');

content = content.replace(
  `className="bg-white text-red-700 border-red-200 hover:bg-red-50 font-bold text-xs"`,
  `className="bg-white dark:bg-[#132238] text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs"`
);
content = content.replaceAll(
  `bg-gray-50/25`,
  `bg-gray-50/25 dark:bg-[#132238]/40`
);
content = content.replace(
  `className="divide-y border border-gray-100 rounded-xl overflow-hidden bg-white text-xs"`,
  `className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#111F33] text-xs"`
);
content = content.replaceAll(
  `hover:bg-gray-50 transition`,
  `hover:bg-gray-50 dark:hover:bg-slate-800/50 transition`
);
content = content.replace(
  `className="bg-gray-50 p-3 rounded-lg border"`,
  `className="bg-gray-50 dark:bg-[#132238] p-3 rounded-lg border border-gray-200 dark:border-slate-800"`
);
content = content.replace(
  `className="bg-slate-50 border border-slate-200 p-4 rounded-2xl"`,
  `className="bg-slate-50 dark:bg-[#132238] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl"`
);
content = content.replace(
  `className="mt-4 py-3 bg-gray-50 border border-gray-100 rounded-xl px-4 flex justify-between text-xs"`,
  `className="mt-4 py-3 bg-gray-50 dark:bg-[#132238] border border-gray-100 dark:border-slate-800 rounded-xl px-4 flex justify-between text-xs"`
);
content = content.replaceAll(
  `bg-gray-50/50`,
  `bg-gray-50/50 dark:bg-slate-900/50`
);
content = content.replaceAll(
  `hover:bg-gray-50/80 transition`,
  `hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition`
);
content = content.replaceAll(
  `className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50"`,
  `className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0E1A2B]"`
);

fs.writeFileSync('./src/pages/DashboardPage.jsx', content, 'utf8');
console.log('DashboardPage updated successfully!');
