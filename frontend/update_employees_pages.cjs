const fs = require('fs');

// EmployeeDetailPage
let edp = fs.readFileSync('./src/pages/EmployeeDetailPage.jsx', 'utf8');
edp = edp.replaceAll(
  `className="flex items-center justify-between p-2 bg-gray-50 rounded"`,
  `className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#132238] rounded border border-gray-100 dark:border-slate-800"`
);
edp = edp.replaceAll(
  `className="flex items-center justify-between p-2.5 bg-gray-50 rounded border"`,
  `className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-[#132238] rounded border border-gray-200 dark:border-slate-700"`
);
fs.writeFileSync('./src/pages/EmployeeDetailPage.jsx', edp, 'utf8');

// EmployeeFormPage
let efp = fs.readFileSync('./src/pages/EmployeeFormPage.jsx', 'utf8');
efp = efp.replace(
  `className="border rounded-xl p-5 bg-gray-50/50 space-y-4"`,
  `className="border border-gray-200 dark:border-slate-800 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-900/60 space-y-4"`
);
efp = efp.replaceAll(
  `className="border rounded-lg p-4 bg-gray-50/50 space-y-3"`,
  `className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 bg-gray-50/50 dark:bg-slate-900/60 space-y-3"`
);
efp = efp.replace(
  `className="flex flex-wrap justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-4 border-t bg-gray-50"`,
  `className="flex flex-wrap justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0E1A2B]"`
);
fs.writeFileSync('./src/pages/EmployeeFormPage.jsx', efp, 'utf8');

console.log('Employee pages updated successfully!');
