const fs = require('fs');

let content = fs.readFileSync('./src/pages/AttendancePoliciesPage.jsx', 'utf8');

content = content.replace(
  `className="col-span-full p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500"`,
  `className="col-span-full p-8 text-center bg-white dark:bg-[#111F33] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"`
);
content = content.replace(
  `className={\`bg-white rounded-xl border p-5 shadow-sm space-y-4 relative \${`,
  `className={\`bg-white dark:bg-[#111F33] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 relative \${`
);
content = content.replace(
  `className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs"`,
  `className="bg-slate-50 dark:bg-[#132238] rounded-lg p-3 space-y-2 text-xs border border-slate-100 dark:border-slate-700"`
);
content = content.replace(
  `className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"`,
  `className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"`
);
content = content.replace(
  `className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"`
);
content = content.replace(
  `className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg"`,
  `className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg"`
);
content = content.replaceAll(
  `className="w-full px-3 py-2 border rounded-lg text-sm bg-white"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);
content = content.replaceAll(
  `className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white"`,
  `className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);
content = content.replace(
  `className="w-full px-3 py-2 border rounded-lg text-sm bg-white h-32"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white h-32"`
);
content = content.replace(
  `className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"`,
  `className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"`
);

fs.writeFileSync('./src/pages/AttendancePoliciesPage.jsx', content, 'utf8');
console.log('AttendancePoliciesPage updated successfully!');
