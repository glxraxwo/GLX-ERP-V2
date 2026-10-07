const fs = require('fs');

let content = fs.readFileSync('./src/pages/QuotationsPage.jsx', 'utf8');

// 1. Header & KPI banner
content = content.replace(
  `bg-white p-4 rounded-xl border border-gray-200 shadow-xs mb-2`,
  `bg-white dark:bg-[#111F33] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs mb-2`
);
content = content.replace(
  `color: 'bg-slate-50 text-slate-700 border-slate-200'`,
  `color: 'bg-slate-50 dark:bg-[#132238] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'`
);
content = content.replace(
  `color: 'bg-blue-50 text-blue-700 border-blue-200'`,
  `color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'`
);
content = content.replace(
  `color: 'bg-amber-50 text-amber-700 border-amber-200'`,
  `color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'`
);
content = content.replace(
  `color: 'bg-purple-50 text-purple-700 border-purple-200'`,
  `color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50'`
);

// 2. Tabs
content = content.replace(
  `border-b border-gray-200 bg-white rounded-t-xl`,
  `border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111F33] rounded-t-xl`
);
content = content.replaceAll(
  `? 'border-primary-600 text-primary-600 bg-slate-50'`,
  `? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-slate-50 dark:bg-[#132238]'`
);
content = content.replaceAll(
  `: 'border-transparent text-gray-500 hover:text-slate-800 hover:bg-slate-50'`,
  `: 'border-transparent text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#132238]'`
);

// 3. Filter controls
content = content.replaceAll(
  `className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500"`
);
content = content.replaceAll(
  `bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 min-h-[44px]`,
  `bg-gray-50 dark:bg-[#132238] border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1 min-h-[44px]`
);
content = content.replaceAll(
  `className="bg-transparent text-xs text-gray-800 focus:outline-none"`,
  `className="bg-transparent text-xs text-gray-800 dark:text-white focus:outline-none"`
);
content = content.replace(
  `bg-gray-100 p-1 rounded-lg border border-gray-200 ml-auto`,
  `bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 ml-auto`
);
content = content.replaceAll(
  `? 'bg-white text-primary-600 shadow-xs'`,
  `? 'bg-white dark:bg-[#111F33] text-primary-600 dark:text-primary-400 shadow-xs'`
);
content = content.replaceAll(
  `: 'text-gray-500 hover:text-gray-800'`,
  `: 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'`
);

// 4. Cards View
content = content.replace(
  `className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col group h-full"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col group h-full"`
);
content = content.replace(
  `className="p-5 border-b border-gray-100"`,
  `className="p-5 border-b border-gray-100 dark:border-slate-800"`
);
content = content.replace(
  `p-3 bg-gray-50 flex gap-2 rounded-b-2xl border-t border-gray-100 flex-wrap`,
  `p-3 bg-gray-50 dark:bg-[#0E1A2B] flex gap-2 rounded-b-2xl border-t border-gray-100 dark:border-slate-800 flex-wrap`
);

// 5. Quote Form Modal
content = content.replace(
  `bg-slate-100 p-3 rounded-xl flex flex-wrap items-center justify-between gap-4`,
  `bg-slate-100 dark:bg-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-4`
);
content = content.replaceAll(
  `: 'bg-white text-gray-700 hover:bg-gray-50'`,
  `: 'bg-white dark:bg-[#132238] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'`
);
content = content.replace(
  `bg-white border border-gray-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs`,
  `bg-white dark:bg-[#132238] border border-gray-200/90 dark:border-slate-700 px-3.5 py-1.5 rounded-xl shadow-2xs`
);
content = content.replace(
  `bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-4`,
  `bg-slate-50 dark:bg-[#132238]/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-4`
);

// Form inputs
content = content.replace(
  `className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"`,
  `className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500"`
);
content = content.replace(
  `className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-mono uppercase font-bold text-blue-700"`,
  `className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] font-mono uppercase font-bold text-blue-700 dark:text-blue-400"`
);
content = content.replaceAll(
  `className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"`,
  `className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"`
);
content = content.replaceAll(
  `className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"`,
  `className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"`
);
content = content.replaceAll(
  `className="bg-white p-3 rounded-lg border border-blue-200 space-y-2"`,
  `className="bg-white dark:bg-[#111F33] p-3 rounded-lg border border-blue-200 dark:border-slate-700 space-y-2"`
);
content = content.replaceAll(
  `className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-2.5"`,
  `className="bg-white dark:bg-[#111F33] p-3.5 rounded-lg border border-blue-200 dark:border-slate-700 space-y-2.5"`
);

// Items list
content = content.replace(
  `className="grid grid-cols-12 gap-3 items-start bg-gray-50/80 p-3 rounded-xl relative"`,
  `className="grid grid-cols-12 gap-3 items-start bg-gray-50/80 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 p-3 rounded-xl relative"`
);
content = content.replace(
  `className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-calibri"`,
  `className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-calibri"`
);
content = content.replace(
  `className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-center font-semibold"`,
  `className="w-full px-2 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white text-center font-semibold"`
);
content = content.replace(
  `className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-mono"`,
  `className="w-full px-2 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-mono"`
);
content = content.replace(
  `className="w-full px-2 py-1.5 border border-red-200 rounded-lg text-sm bg-white font-mono text-red-600"`,
  `className="w-full px-2 py-1.5 border border-red-200 dark:border-red-900/50 rounded-lg text-sm bg-white dark:bg-[#132238] font-mono text-red-600 dark:text-red-400"`
);
content = content.replace(
  `className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg"`,
  `className="w-full px-2.5 py-1.5 bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 rounded-lg"`
);
content = content.replace(
  `className="w-full p-3 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-calibri"`,
  `className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-[#132238] text-gray-800 dark:text-white font-calibri"`
);

// Summary & calculations
content = content.replaceAll(
  `className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"`,
  `className="w-full px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);
content = content.replace(
  `className="w-28 px-2 py-1 border rounded text-right font-mono text-xs bg-white text-emerald-700 font-bold"`,
  `className="w-28 px-2 py-1 border border-gray-300 dark:border-slate-700 rounded text-right font-mono text-xs bg-white dark:bg-[#132238] text-emerald-700 dark:text-emerald-400 font-bold"`
);

// Preview Modal top bar
content = content.replace(
  `bg-gray-50 p-3 rounded-xl border border-gray-200 flex`,
  `bg-gray-50 dark:bg-[#111F33] p-3 rounded-xl border border-gray-200 dark:border-slate-800 flex`
);
content = content.replace(
  `bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs`,
  `bg-white dark:bg-[#132238] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-2xs`
);
content = content.replace(
  `className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"`,
  `className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800"`
);

// Action Modals
content = content.replace(
  `className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative"`
);
content = content.replaceAll(
  `className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4"`
);
content = content.replaceAll(
  `className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 animate-[slideUp_0.2s_ease-out]"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 animate-[slideUp_0.2s_ease-out]"`
);
content = content.replaceAll(
  `className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-[slideUp_0.2s_ease-out]"`,
  `className="bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-[slideUp_0.2s_ease-out]"`
);
content = content.replaceAll(
  `className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);
content = content.replaceAll(
  `className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold font-mono bg-white"`,
  `className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-bold font-mono bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);

fs.writeFileSync('./src/pages/QuotationsPage.jsx', content, 'utf8');
console.log('QuotationsPage updated successfully!');
