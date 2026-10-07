const fs = require('fs');

let content = fs.readFileSync('./src/pages/ExpensesPage.jsx', 'utf8');

// Top KPI stat cards
content = content.replaceAll(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"`
);

// Table wrapper and elements
content = content.replace(
  `className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"`
);
content = content.replace(
  `className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs"`,
  `className="bg-slate-50 dark:bg-[#132238] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs"`
);
content = content.replace(
  `className="hover:bg-slate-50 transition-colors"`,
  `className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800/60 transition-colors"`
);
content = content.replaceAll(
  `className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"`,
  `className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded transition-colors"`
);

// Modal
content = content.replace(
  `className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"`
);

// Inputs
content = content.replaceAll(
  `className="w-full px-3 py-2 border rounded-lg text-sm bg-white"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"`
);
content = content.replace(
  `className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:opacity-75"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white disabled:opacity-75"`
);
content = content.replace(
  `className="w-full px-3 py-2 border rounded-lg text-sm bg-white read-only:bg-gray-100"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white read-only:bg-gray-100 dark:read-only:bg-slate-800"`
);
content = content.replace(
  `className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"`,
  `className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg"`
);
content = content.replace(
  `className="space-y-3 p-3 border border-dashed rounded-lg bg-white"`,
  `className="space-y-3 p-3 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#132238]/40"`
);
content = content.replaceAll(
  `className="w-full text-xs p-1.5 border rounded bg-white"`,
  `className="w-full text-xs p-1.5 border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);
content = content.replaceAll(
  `className="w-full text-xs p-1 border rounded font-mono bg-white"`,
  `className="w-full text-xs p-1 border border-gray-300 dark:border-slate-700 rounded font-mono bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);
content = content.replace(
  `className="w-full text-xs p-1 bg-gray-50 border rounded font-mono"`,
  `className="w-full text-xs p-1 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded font-mono text-gray-900 dark:text-white"`
);
content = content.replace(
  `className="bg-white p-3 rounded-lg border border-indigo-200 space-y-2"`,
  `className="bg-white dark:bg-[#111F33] p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/50 space-y-2"`
);
content = content.replace(
  `className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"`,
  `className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"`
);

fs.writeFileSync('./src/pages/ExpensesPage.jsx', content, 'utf8');
console.log('ExpensesPage updated successfully!');
