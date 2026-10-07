const fs = require('fs');

let content = fs.readFileSync('./src/pages/FixedAssetsPage.jsx', 'utf8');

content = content.replace(
  `border border-gray-200 rounded-xl hover:bg-gray-50 transition`,
  `border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition`
);
content = content.replace(
  `className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden"`
);
content = content.replace(
  `className="p-4 border-b border-gray-100 bg-gray-50/50"`,
  `className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#132238]/60"`
);
content = content.replace(
  `className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider text-left"`,
  `className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#132238] text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-left"`
);
content = content.replace(
  `className="hover:bg-gray-50/50 transition"`,
  `className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition border-b border-gray-100 dark:border-slate-800/60"`
);
content = content.replace(
  `className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"`
);
content = content.replace(
  `className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"`,
  `className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"`
);
content = content.replace(
  `className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"`
);
content = content.replace(
  `className="border border-gray-200 rounded-xl p-4 bg-gray-50/50"`,
  `className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-900/60"`
);
content = content.replaceAll(
  `border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500`,
  `border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500`
);
content = content.replace(
  `className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white"`,
  `className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-[#111F33]"`
);
content = content.replace(
  `className="p-4 border-t bg-gray-50 flex justify-end flex-shrink-0"`,
  `className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0E1A2B] flex justify-end flex-shrink-0"`
);

fs.writeFileSync('./src/pages/FixedAssetsPage.jsx', content, 'utf8');
console.log('FixedAssetsPage updated successfully!');
