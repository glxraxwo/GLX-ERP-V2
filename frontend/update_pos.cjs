const fs = require('fs');

let content = fs.readFileSync('./src/pages/PosPage.jsx', 'utf8');

// Top POS header
content = content.replace(
  `className="bg-white shadow-sm z-20 flex-shrink-0"`,
  `className="bg-white dark:bg-[#111F33] border-b border-gray-100 dark:border-slate-800 shadow-sm z-20 flex-shrink-0"`
);
content = content.replace(
  `className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 items-center text-xs text-gray-600"`,
  `className="px-3 py-2.5 bg-gray-50 dark:bg-[#132238] border-b border-gray-100 dark:border-slate-800 flex flex-wrap gap-3 items-center text-xs text-gray-600 dark:text-slate-300"`
);
content = content.replaceAll(
  `className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right bg-white"`,
  `className="w-16 px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-right bg-white dark:bg-[#111F33] text-gray-900 dark:text-white"`
);
content = content.replaceAll(
  `className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right bg-white"`,
  `className="w-14 px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-right bg-white dark:bg-[#111F33] text-gray-900 dark:text-white"`
);

// Product cards
content = content.replace(
  `relative text-left bg-white rounded-2xl p-3 transition-all duration-150 active:scale-95`,
  `relative text-left bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-800 rounded-2xl p-3 transition-all duration-150 active:scale-95`
);

// Cart Sidebar
content = content.replace(
  `className="hidden lg:flex w-[360px] xl:w-[400px] bg-white border-l border-gray-200 flex-col shadow-lg flex-shrink-0"`,
  `className="hidden lg:flex w-[360px] xl:w-[400px] bg-white dark:bg-[#111F33] border-l border-gray-200 dark:border-slate-800 flex-col shadow-lg flex-shrink-0"`
);
content = content.replace(
  `className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slideUp"`,
  `className="relative bg-white dark:bg-[#111F33] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slideUp text-gray-900 dark:text-white"`
);

// Cart items
content = content.replace(
  `className="bg-gray-50 rounded-2xl p-3"`,
  `className="bg-gray-50 dark:bg-[#132238] border border-gray-100 dark:border-slate-800 rounded-2xl p-3"`
);
content = content.replace(
  `className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl overflow-hidden"`,
  `className="flex items-center gap-1 bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden"`
);
content = content.replaceAll(
  `hover:bg-gray-50 active:bg-gray-100 transition-colors`,
  `hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition-colors`
);

// Footer & payment
content = content.replace(
  `className="border-t border-gray-100 bg-white flex-shrink-0 px-4 pt-3 pb-5 space-y-2.5"`,
  `className="border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-[#111F33] flex-shrink-0 px-4 pt-3 pb-5 space-y-2.5"`
);
content = content.replace(
  `isGoToYard ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-gray-200 text-slate-700'`,
  `isGoToYard ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200' : 'bg-slate-50 dark:bg-[#132238] border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'`
);
content = content.replaceAll(
  `className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-gray-900 font-mono focus:border-amber-500"`,
  `className="w-full px-2.5 py-1.5 border border-amber-300 dark:border-amber-700 rounded-lg text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-mono focus:border-amber-500"`
);
content = content.replace(
  `: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'`,
  `: 'border-gray-200 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'`
);
content = content.replaceAll(
  `border border-gray-200 rounded-xl text-xs bg-white focus:border-primary-500`,
  `border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:border-primary-500`
);
content = content.replace(
  `className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-800 font-bold text-xs"`,
  `className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-800 dark:text-slate-200 font-bold text-xs"`
);

fs.writeFileSync('./src/pages/PosPage.jsx', content, 'utf8');
console.log('PosPage updated successfully!');
