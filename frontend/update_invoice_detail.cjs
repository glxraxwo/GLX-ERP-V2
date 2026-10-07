const fs = require('fs');

let content = fs.readFileSync('./src/pages/InvoiceDetailPage.jsx', 'utf8');

content = content.replace(
  `className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold"`,
  `className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-[#132238] hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"`
);
content = content.replace(
  `className="flex items-center rounded-lg border border-gray-300 bg-white p-0.5 text-xs font-semibold"`,
  `className="flex items-center rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] p-0.5 text-xs font-semibold"`
);
content = content.replace(
  `className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"`,
  `className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition"`
);
content = content.replaceAll(
  `className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-[slideUp_0.2s_ease-out]"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-[slideUp_0.2s_ease-out]"`
);
content = content.replace(
  `className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp"`
);
content = content.replaceAll(
  `border border-gray-300 rounded-lg text-sm font-bold font-mono bg-white`,
  `border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-bold font-mono bg-white dark:bg-[#132238] text-gray-900 dark:text-white`
);
content = content.replaceAll(
  `border border-gray-300 rounded-lg text-sm bg-white font-mono`,
  `border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-mono`
);
content = content.replaceAll(
  `border border-gray-300 rounded-lg text-sm bg-white`,
  `border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white`
);
content = content.replaceAll(
  `border border-gray-300 rounded-xl text-xs bg-white outline-none focus:border-primary-500`,
  `border border-gray-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white outline-none focus:border-primary-500`
);
content = content.replaceAll(
  `border border-gray-300 rounded-xl text-xs font-bold font-mono bg-white outline-none focus:border-primary-500`,
  `border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold font-mono bg-white dark:bg-[#132238] text-gray-900 dark:text-white outline-none focus:border-primary-500`
);

fs.writeFileSync('./src/pages/InvoiceDetailPage.jsx', content, 'utf8');
console.log('InvoiceDetailPage updated successfully!');
