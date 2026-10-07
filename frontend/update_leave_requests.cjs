const fs = require('fs');

let content = fs.readFileSync('./src/pages/LeaveRequestsPage.jsx', 'utf8');

content = content.replace(
  `className="border-b flex gap-2 px-4 overflow-x-auto bg-gray-50/50"`,
  `className="border-b border-gray-200 dark:border-slate-800 flex gap-2 px-4 overflow-x-auto bg-gray-50/50 dark:bg-[#132238]/60"`
);
content = content.replaceAll(
  `className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50"`,
  `className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-[#0E1A2B]"`
);

fs.writeFileSync('./src/pages/LeaveRequestsPage.jsx', content, 'utf8');
console.log('LeaveRequestsPage updated successfully!');
