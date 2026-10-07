const fs = require('fs');

let content = fs.readFileSync('./src/pages/EmployeePaymentSheetPage.jsx', 'utf8');

content = content.replace(
  `className="no-print bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4"`,
  `className="no-print bg-white dark:bg-[#111F33] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4"`
);
content = content.replaceAll(
  `border rounded px-2 py-1 bg-gray-50 text-xs`,
  `border border-gray-300 dark:border-slate-700 rounded px-2 py-1 bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white text-xs`
);
content = content.replace(
  `className="flex items-center rounded-lg border border-gray-300 bg-white p-0.5 font-semibold shadow-xs"`,
  `className="flex items-center rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] p-0.5 font-semibold shadow-xs"`
);
content = content.replace(
  `className="inline-flex border border-gray-300 rounded-lg bg-white overflow-hidden text-xs font-semibold"`,
  `className="inline-flex border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#132238] overflow-hidden text-xs font-semibold"`
);
content = content.replace(
  `: 'text-gray-700 hover:bg-gray-50'`,
  `: 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'`
);
content = content.replace(
  `className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"`,
  `className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"`
);
content = content.replace(
  `className="hover:bg-slate-50"`,
  `className="hover:bg-slate-50 dark:hover:bg-slate-800/50"`
);

fs.writeFileSync('./src/pages/EmployeePaymentSheetPage.jsx', content, 'utf8');
console.log('EmployeePaymentSheetPage updated successfully!');
