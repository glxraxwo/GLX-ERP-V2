const fs = require('fs');

let content = fs.readFileSync('./src/pages/PayslipDetailPage.jsx', 'utf8');

content = content.replace(
  `className="no-print bg-white p-4 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-4"`,
  `className="no-print bg-white dark:bg-[#111F33] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4"`
);
content = content.replace(
  `className="inline-flex rounded-lg border p-1 bg-gray-50"`,
  `className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-1 bg-gray-50 dark:bg-[#132238]"`
);
content = content.replace(
  `className="flex items-center gap-2 cursor-pointer select-none font-semibold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border text-xs"`,
  `className="flex items-center gap-2 cursor-pointer select-none font-semibold text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-[#132238] border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs"`
);
content = content.replace(
  `Card className={\`p-8 max-w-3xl mx-auto relative overflow-hidden card-print bg-white\`}`,
  `Card className={\`p-8 max-w-3xl mx-auto relative overflow-hidden card-print bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800\`}`
);
content = content.replace(
  `className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50/70 rounded-xl border text-sm"`,
  `className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50/70 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-800 text-sm"`
);
content = content.replace(
  `className="mb-6 border rounded-lg p-3 bg-gray-50/40"`,
  `className="mb-6 border border-gray-200 dark:border-slate-800 rounded-lg p-3 bg-gray-50/40 dark:bg-slate-900/40"`
);
content = content.replaceAll(
  `className="p-1 bg-white rounded border"`,
  `className="p-1 bg-white dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"`
);

fs.writeFileSync('./src/pages/PayslipDetailPage.jsx', content, 'utf8');
console.log('PayslipDetailPage updated successfully!');
