const fs = require('fs');

let content = fs.readFileSync('./src/pages/ProjectDetailPage.jsx', 'utf8');

content = content.replace(
  `className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold flex-1 sm:flex-none"`,
  `className="bg-white dark:bg-[#132238] border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold flex-1 sm:flex-none"`
);
content = content.replaceAll(
  `Card className="p-4 bg-slate-50 border flex flex-col justify-between"`,
  `Card className="p-4 bg-slate-50 dark:bg-[#132238] border border-slate-200 dark:border-slate-700 flex flex-col justify-between"`
);
content = content.replace(
  `className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto"`,
  `className="flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111F33] rounded-t-xl overflow-x-auto"`
);
content = content.replace(
  `activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'`,
  `activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-slate-50/50 dark:bg-[#132238]/40'
                                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-700'`
);
content = content.replace(
  `className="text-sm text-slate-700 whitespace-pre-wrap mt-1 bg-slate-50 p-4 rounded-xl border border-slate-100"`,
  `className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap mt-1 bg-slate-50 dark:bg-[#132238]/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700"`
);
content = content.replaceAll(
  `className="bg-slate-50 p-3 rounded-xl border"`,
  `className="bg-slate-50 dark:bg-[#132238]/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700"`
);
content = content.replace(
  `className="border rounded-xl p-3 bg-slate-50 divide-y space-y-2"`,
  `className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-[#132238]/60 divide-y divide-slate-200 dark:divide-slate-700 space-y-2"`
);
content = content.replace(
  `className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 border rounded-lg"`,
  `className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#132238] px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg"`
);
content = content.replaceAll(
  `Card className="w-full max-w-md shadow-2xl p-6 bg-white"`,
  `Card className="w-full max-w-md shadow-2xl p-6 bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white"`
);
content = content.replace(
  `hover:bg-slate-50 rounded-lg`,
  `hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg`
);

fs.writeFileSync('./src/pages/ProjectDetailPage.jsx', content, 'utf8');
console.log('ProjectDetailPage updated successfully!');
