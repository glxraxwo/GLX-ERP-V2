const fs = require('fs');

// EmployeeOfMonthPage
let empContent = fs.readFileSync('./src/pages/EmployeeOfMonthPage.jsx', 'utf8');
empContent = empContent.replaceAll(
  `className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 font-semibold"`,
  `className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-semibold"`
);
empContent = empContent.replace(
  `className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"`,
  `className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition"`
);
empContent = empContent.replace(
  `className="bg-white rounded-2xl border border-gray-200 p-16 text-center"`,
  `className="bg-white dark:bg-[#111F33] rounded-2xl border border-gray-200 dark:border-slate-800 p-16 text-center text-gray-500 dark:text-slate-400"`
);
empContent = empContent.replace(
  `className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden"`
);
empContent = empContent.replace(
  `className="p-4 border-b border-gray-100 bg-gray-50/50"`,
  `className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#132238]/60"`
);
empContent = empContent.replace(
  `className="hover:bg-gray-50 transition-colors"`,
  `className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-800/60"`
);
fs.writeFileSync('./src/pages/EmployeeOfMonthPage.jsx', empContent, 'utf8');

// AIAnalyzerPage
let aiContent = fs.readFileSync('./src/pages/AIAnalyzerPage.jsx', 'utf8');
aiContent = aiContent.replaceAll(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm`
);
aiContent = aiContent.replace(
  `: 'border-slate-200 hover:bg-slate-50'`,
  `: 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'`
);
aiContent = aiContent.replace(
  `className="h-64 overflow-y-auto bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 flex flex-col"`,
  `className="h-64 overflow-y-auto bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3 flex flex-col"`
);
aiContent = aiContent.replace(
  `className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"`,
  `className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-[#132238] text-slate-700 dark:text-white outline-none"`
);
fs.writeFileSync('./src/pages/AIAnalyzerPage.jsx', aiContent, 'utf8');

console.log('EmployeeOfMonth & AIAnalyzer updated successfully!');
