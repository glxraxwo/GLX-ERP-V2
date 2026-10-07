const fs = require('fs');

let content = fs.readFileSync('./src/pages/AppHubPage.jsx', 'utf8');

content = content.replace(
  `: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs active:scale-95'`,
  `: 'bg-white dark:bg-[#132238] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white shadow-2xs active:scale-95'`
);
content = content.replace(
  `: 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200')`,
  `: 'bg-white dark:bg-[#132238] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700')`
);
content = content.replace(
  `: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs active:scale-95'`,
  `: 'bg-white dark:bg-[#132238] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white shadow-2xs active:scale-95'`
);
content = content.replace(
  `? \`bg-white border-slate-200 \${themeStyles.cardBorder} hover:shadow-slate-300/40\`
                                                            : \`bg-white border-slate-200 \${themeStyles.cardBorder} hover:shadow-slate-200\``,
  `? \`bg-white dark:bg-[#152338] border-slate-200 dark:border-slate-700 \${themeStyles.cardBorder} hover:shadow-slate-300/40\`
                                                            : \`bg-white dark:bg-[#152338] border-slate-200 dark:border-slate-700 \${themeStyles.cardBorder} hover:shadow-slate-200\``
);

fs.writeFileSync('./src/pages/AppHubPage.jsx', content, 'utf8');
console.log('AppHubPage updated successfully!');
