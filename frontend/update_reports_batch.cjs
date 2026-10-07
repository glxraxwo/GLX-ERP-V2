const fs = require('fs');

// 1. AnalyticsPage
let ana = fs.readFileSync('./src/pages/AnalyticsPage.jsx', 'utf8');
ana = ana.replace(
  `className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none"`,
  `className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-slate-700 dark:text-white focus:outline-none"`
);
ana = ana.replaceAll(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"`
);
ana = ana.replace(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2"`
);
ana = ana.replaceAll(
  `className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"`
);
ana = ana.replaceAll(
  `className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"`,
  `className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#132238] border border-slate-100 dark:border-slate-700/60 rounded-lg"`
);
fs.writeFileSync('./src/pages/AnalyticsPage.jsx', ana, 'utf8');

// 2. VarianceComparisonPage
let varComp = fs.readFileSync('./src/pages/reports/VarianceComparisonPage.jsx', 'utf8');
varComp = varComp.replace(
  `className="border-b border-gray-200 bg-white px-4 py-2 rounded-xl flex gap-4"`,
  `className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111F33] px-4 py-2 rounded-xl flex gap-4"`
);
varComp = varComp.replace(
  `className="border border-gray-100 rounded-xl p-5 bg-slate-50/50"`,
  `className="border border-gray-100 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/60"`
);
varComp = varComp.replaceAll(
  `className="bg-gray-50 text-gray-700"`,
  `className="bg-gray-50 dark:bg-[#132238] text-gray-700 dark:text-slate-300"`
);
varComp = varComp.replaceAll(
  `className="divide-y divide-gray-100 bg-white text-gray-700"`,
  `className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-[#111F33] text-gray-700 dark:text-slate-200"`
);
varComp = varComp.replaceAll(
  `hover:bg-slate-50/50`,
  `hover:bg-slate-50/50 dark:hover:bg-slate-800/50`
);
varComp = varComp.replace(
  `className="bg-slate-50 font-bold text-gray-900 border-t border-gray-200"`,
  `className="bg-slate-50 dark:bg-[#132238] font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-slate-700"`
);
varComp = varComp.replace(
  `className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center text-sm"`,
  `className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#132238] flex justify-between items-center text-sm"`
);
varComp = varComp.replace(
  `className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 border rounded-xl mb-6"`,
  `className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-xl mb-6"`
);
varComp = varComp.replaceAll(
  `Card className="p-4 border border-gray-100 bg-slate-50/50"`,
  `Card className="p-4 border border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60"`
);
varComp = varComp.replaceAll(
  `className="flex justify-between items-center p-2.5 bg-white border border-gray-100 rounded-lg"`,
  `className="flex justify-between items-center p-2.5 bg-white dark:bg-[#132238] border border-gray-100 dark:border-slate-700 rounded-lg"`
);
fs.writeFileSync('./src/pages/reports/VarianceComparisonPage.jsx', varComp, 'utf8');

// 3. ShiftReportingPage
let shift = fs.readFileSync('./src/pages/reports/ShiftReportingPage.jsx', 'utf8');
shift = shift.replaceAll(
  `className="bg-white p-3 rounded-lg border border-purple-100"`,
  `className="bg-white dark:bg-[#111F33] p-3 rounded-lg border border-purple-100 dark:border-purple-900/50"`
);
shift = shift.replaceAll(
  `className="bg-white p-3 rounded-lg border border-pink-100"`,
  `className="bg-white dark:bg-[#111F33] p-3 rounded-lg border border-pink-100 dark:border-pink-900/50"`
);
shift = shift.replace(
  `className="bg-white p-4 rounded-xl border border-pink-100 flex justify-between items-center text-xs"`,
  `className="bg-white dark:bg-[#111F33] p-4 rounded-xl border border-pink-100 dark:border-pink-900/50 flex justify-between items-center text-xs"`
);
shift = shift.replaceAll(
  `className="bg-white p-3 rounded-lg border border-sky-100"`,
  `className="bg-white dark:bg-[#111F33] p-3 rounded-lg border border-sky-100 dark:border-sky-900/50"`
);
shift = shift.replace(
  `className="bg-white rounded-lg border border-sky-100 p-4"`,
  `className="bg-white dark:bg-[#111F33] rounded-lg border border-sky-100 dark:border-sky-900/50 p-4"`
);
shift = shift.replaceAll(
  `className="py-12 text-center text-gray-500 bg-white rounded-xl border"`,
  `className="py-12 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-[#111F33] rounded-xl border border-gray-200 dark:border-slate-800"`
);
fs.writeFileSync('./src/pages/reports/ShiftReportingPage.jsx', shift, 'utf8');

// 4. LowStockReportPage
let low = fs.readFileSync('./src/pages/reports/LowStockReportPage.jsx', 'utf8');
low = low.replace(
  `className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs"`,
  `className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-[#111F33] p-6 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs"`
);
low = low.replace(
  `className="flex items-center gap-1.5 text-xs font-semibold bg-white"`,
  `className="flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200"`
);
low = low.replace(
  `className="flex items-center gap-1.5 text-xs font-semibold bg-white text-gray-700"`,
  `className="flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200"`
);
low = low.replaceAll(
  `className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between"`,
  `className="bg-white dark:bg-[#111F33] p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between"`
);
low = low.replace(
  `statusFilter === 'all' ? 'bg-white text-blue-900 shadow-2xs font-extrabold'`,
  `statusFilter === 'all' ? 'bg-white dark:bg-[#132238] text-blue-900 dark:text-white shadow-2xs font-extrabold'`
);
low = low.replace(
  `className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"`,
  `className="px-3 py-2 text-xs font-semibold bg-gray-50 dark:bg-[#132238] border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"`
);
low = low.replace(
  `className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden"`,
  `className="bg-white dark:bg-[#111F33] rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs overflow-hidden"`
);
low = low.replace(
  `className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider"`,
  `className="bg-gray-50/80 dark:bg-[#132238] border-b border-gray-200 dark:border-slate-800 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider"`
);
low = low.replace(
  `className="bg-white divide-y divide-blue-100/50 text-sm"`,
  `className="bg-white dark:bg-[#111F33] divide-y divide-blue-100/50 dark:divide-slate-800 text-sm"`
);
low = low.replace(
  `className={\`\${isEven ? 'bg-blue-50/40' : 'bg-white'} hover:bg-blue-50/80 transition-colors\``,
  `className={\`\${isEven ? 'bg-blue-50/40 dark:bg-slate-900/40' : 'bg-white dark:bg-[#111F33]'} hover:bg-blue-50/80 dark:hover:bg-slate-800/60 transition-colors\``
);
fs.writeFileSync('./src/pages/reports/LowStockReportPage.jsx', low, 'utf8');

console.log('Analytics & Reports batch updated successfully!');
