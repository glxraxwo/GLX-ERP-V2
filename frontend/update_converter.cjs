const fs = require('fs');

let content = fs.readFileSync('./src/pages/InventoryConverterPage.jsx', 'utf8');

content = content.replaceAll(
  `? 'bg-white text-gray-800 shadow-sm'`,
  `? 'bg-white dark:bg-[#111F33] text-gray-800 dark:text-white shadow-sm'`
);
content = content.replace(
  `className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"`,
  `className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-medium"`
);
content = content.replace(
  `className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium disabled:bg-gray-50"`,
  `className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-medium disabled:bg-gray-50 dark:disabled:bg-slate-800"`
);
content = content.replace(
  `className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col justify-center"`,
  `className="bg-gray-50 dark:bg-[#132238]/60 border border-gray-100 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-center"`
);
content = content.replace(
  `className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium placeholder-gray-400"`,
  `className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-medium placeholder-gray-400 dark:placeholder-slate-500"`
);
content = content.replace(
  `className="absolute z-30 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-gray-100"`,
  `className="absolute z-30 w-full bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800"`
);
content = content.replace(
  `className="absolute z-35 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 p-4 text-center text-sm text-gray-500"`,
  `className="absolute z-35 w-full bg-white dark:bg-[#111F33] border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg mt-1 p-4 text-center text-sm text-gray-500 dark:text-slate-400"`
);
content = content.replace(
  `className="w-full px-3 py-2 border border-gray-200 bg-white focus:border-primary-500 rounded-xl text-sm outline-none font-semibold"`,
  `className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:border-primary-500 rounded-xl text-sm outline-none font-semibold"`
);
content = content.replaceAll(
  `className="flex-1 text-center bg-white p-2.5 rounded-lg border border-emerald-100/50"`,
  `className="flex-1 text-center bg-white dark:bg-[#111F33] p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/50"`
);
content = content.replace(
  `className="w-full px-3 py-2 border border-emerald-200 focus:border-emerald-500 rounded-xl text-sm outline-none font-semibold bg-emerald-50/20"`,
  `className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 rounded-xl text-sm outline-none font-semibold bg-emerald-50/20 dark:bg-emerald-950/20 text-gray-900 dark:text-white"`
);
content = content.replace(
  `className="w-full px-3 py-2 border border-emerald-200 focus:border-emerald-500 rounded-xl text-sm outline-none font-semibold bg-white"`,
  `className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 rounded-xl text-sm outline-none font-semibold bg-white dark:bg-[#132238] text-gray-900 dark:text-white"`
);
content = content.replace(
  `className="border border-gray-200 bg-white rounded-xl p-4 space-y-4"`,
  `className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111F33] rounded-xl p-4 space-y-4"`
);
content = content.replaceAll(
  `className="w-full px-3 py-2 border border-gray-200 focus:border-primary-500 rounded-xl text-sm outline-none"`,
  `className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:border-primary-500 rounded-xl text-sm outline-none"`
);
content = content.replace(
  `className="flex gap-3 items-end bg-gray-50 p-2.5 border border-gray-150 rounded-xl relative"`,
  `className="flex gap-3 items-end bg-gray-50 dark:bg-slate-900/60 p-2.5 border border-gray-150 dark:border-slate-800 rounded-xl relative"`
);
content = content.replaceAll(
  `className="w-full h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"`,
  `className="w-full h-9 px-2 bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg text-sm outline-none"`
);

fs.writeFileSync('./src/pages/InventoryConverterPage.jsx', content, 'utf8');
console.log('InventoryConverterPage updated successfully!');
