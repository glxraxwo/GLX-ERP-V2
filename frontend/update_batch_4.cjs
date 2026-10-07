const fs = require('fs');

// 1. FuturePredictionsPage
let fp = fs.readFileSync('./src/pages/reports/FuturePredictionsPage.jsx', 'utf8');
fp = fp.replace(
  `className="py-20 text-center text-gray-500 border border-red-200 rounded-xl bg-white max-w-xl mx-auto space-y-3 shadow-xs"`,
  `className="py-20 text-center text-gray-500 dark:text-slate-400 border border-red-200 dark:border-red-900/50 rounded-xl bg-white dark:bg-[#111F33] max-w-xl mx-auto space-y-3 shadow-xs"`
);
fp = fp.replace(
  `className="flex border-b border-gray-200 bg-white p-1.5 rounded-xl shadow-sm gap-2"`,
  `className="flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#111F33] p-1.5 rounded-xl shadow-sm gap-2"`
);
fp = fp.replaceAll(
  `className="p-3 bg-white border border-indigo-100 rounded-xl shadow-sm"`,
  `className="p-3 bg-white dark:bg-[#111F33] border border-indigo-100 dark:border-slate-700 rounded-xl shadow-sm"`
);
fp = fp.replace(
  `Card className="p-4 bg-slate-50 border border-slate-100 flex items-start gap-3"`,
  `Card className="p-4 bg-slate-50 dark:bg-[#132238] border border-slate-100 dark:border-slate-700 flex items-start gap-3"`
);
fp = fp.replace(
  `? 'bg-white text-gray-900 shadow-sm'`,
  `? 'bg-white dark:bg-[#111F33] text-gray-900 dark:text-white shadow-sm'`
);
fp = fp.replace(
  `className="hover:bg-slate-50 transition-colors"`,
  `className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-800/60"`
);
fp = fp.replace(
  `className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5"`,
  `className="p-3.5 bg-slate-50 dark:bg-[#132238] border border-slate-100 dark:border-slate-700 rounded-xl flex items-start gap-2.5"`
);
fp = fp.replace(
  `className="p-3 bg-white border border-pink-100 rounded-xl shadow-sm"`,
  `className="p-3 bg-white dark:bg-[#111F33] border border-pink-100 dark:border-slate-700 rounded-xl shadow-sm"`
);
fs.writeFileSync('./src/pages/reports/FuturePredictionsPage.jsx', fp, 'utf8');

// 2. ProcessTemplatesPage
let pt = fs.readFileSync('./src/pages/ProcessTemplatesPage.jsx', 'utf8');
pt = pt.replace(
  `className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100/50 text-xs font-semibold text-gray-700 border-t border-gray-100 transition-colors"`,
  `className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/50 dark:bg-[#0E1A2B] hover:bg-gray-100/50 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-300 border-t border-gray-100 dark:border-slate-800 transition-colors"`
);
pt = pt.replace(
  `required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"`,
  `required className="w-full px-4 py-2 bg-gray-50 dark:bg-[#132238] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"`
);
pt = pt.replace(
  `className="flex justify-between items-center bg-gray-50 p-2 rounded-lg"`,
  `className="flex justify-between items-center bg-gray-50 dark:bg-[#132238] border border-gray-200 dark:border-slate-700 p-2 rounded-lg"`
);
pt = pt.replace(
  `className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm space-y-3 relative"`,
  `className="p-4 border border-gray-100 dark:border-slate-700 rounded-xl bg-white dark:bg-[#132238]/60 shadow-sm space-y-3 relative"`
);
pt = pt.replace(
  `className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 font-medium"`,
  `className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white font-medium"`
);
pt = pt.replace(
  `className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50" value={stage.machineRequired || ''}`,
  `className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white" value={stage.machineRequired || ''}`
);
pt = pt.replace(
  `className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50"`,
  `className="w-24 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white"`
);
pt = pt.replace(
  `className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50"`,
  `className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white"`
);
fs.writeFileSync('./src/pages/ProcessTemplatesPage.jsx', pt, 'utf8');

// 3. ReturnFormPage
let rf = fs.readFileSync('./src/pages/ReturnFormPage.jsx', 'utf8');
rf = rf.replace(
  `className="flex flex-wrap items-center gap-0 mb-6 bg-white border border-gray-200 rounded-xl p-1 shadow-xs"`,
  `className="flex flex-wrap items-center gap-0 mb-6 bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 rounded-xl p-1 shadow-xs"`
);
rf = rf.replaceAll(
  `className="flex items-center gap-3 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl mb-4"`,
  `className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-900/60 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl mb-4"`
);
rf = rf.replace(
  `className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600"`,
  `className="p-4 bg-slate-50 dark:bg-[#132238]/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"`
);
rf = rf.replace(
  `: 'border-gray-200 hover:bg-gray-50'`,
  `: 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'`
);
rf = rf.replace(
  `className="flex items-center justify-between gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50"`,
  `className="flex items-center justify-between gap-3 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-[#132238] text-gray-900 dark:text-white"`
);
rf = rf.replace(
  `className="border border-gray-200 rounded-xl p-4 bg-gray-50"`,
  `className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50 dark:bg-slate-900/60"`
);
fs.writeFileSync('./src/pages/ReturnFormPage.jsx', rf, 'utf8');

// 4. SettingsPage
let st = fs.readFileSync('./src/pages/SettingsPage.jsx', 'utf8');
st = st.replace(
  `className="min-h-screen flex items-center justify-center bg-gray-50"`,
  `className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"`
);
st = st.replaceAll(
  `className="h-32 w-full border border-dashed border-gray-300 rounded-xl bg-white flex items-center justify-center overflow-hidden relative shadow-2xs"`,
  `className="h-32 w-full border border-dashed border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#132238] flex items-center justify-center overflow-hidden relative shadow-2xs"`
);
st = st.replaceAll(
  `className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-medium outline-none"`,
  `className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-sm font-medium outline-none"`
);
fs.writeFileSync('./src/pages/SettingsPage.jsx', st, 'utf8');

console.log('4 pages batch updated successfully!');
