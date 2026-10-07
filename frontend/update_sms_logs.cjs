const fs = require('fs');

let content = fs.readFileSync('./src/pages/SmsLogsPage.jsx', 'utf8');

content = content.replace(
  `className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition"`,
  `className="p-2 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition"`
);
content = content.replace(
  `className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden"`
);
content = content.replace(
  `className="bg-gray-50 border-b border-gray-200"`,
  `className="bg-gray-50 dark:bg-[#132238] border-b border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200"`
);
content = content.replace(
  `className="hover:bg-gray-50/50 transition"`,
  `className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800/60 transition"`
);
content = content.replaceAll(
  `className="px-3 py-1.5 border rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50"`,
  `className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"`
);
content = content.replace(
  `className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"`,
  `className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition"`
);

fs.writeFileSync('./src/pages/SmsLogsPage.jsx', content, 'utf8');
console.log('SmsLogsPage updated successfully!');
