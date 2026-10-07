const fs = require('fs');

let content = fs.readFileSync('./src/pages/AuditLogPage.jsx', 'utf8');

content = content.replace(
  `className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"`,
  `className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#132238] rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"`
);
content = content.replace(
  `className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center"`,
  `className="bg-white dark:bg-[#111F33] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center"`
);
content = content.replaceAll(
  `className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 font-medium"`,
  `className="w-full h-10 px-3 bg-slate-50 dark:bg-[#132238] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-800 dark:text-white"`
);
content = content.replace(
  `className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"`
);
content = content.replace(
  `className="bg-slate-50 border-b border-slate-200"`,
  `className="bg-slate-50 dark:bg-[#132238] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"`
);
content = content.replace(
  `className="hover:bg-slate-50/60 transition-colors"`,
  `className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60 transition-colors"`
);
content = content.replace(
  `className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50"`,
  `className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0E1A2B]"`
);
content = content.replaceAll(
  `className="p-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"`,
  `className="p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#132238] text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"`
);

fs.writeFileSync('./src/pages/AuditLogPage.jsx', content, 'utf8');
console.log('AuditLogPage updated successfully!');
