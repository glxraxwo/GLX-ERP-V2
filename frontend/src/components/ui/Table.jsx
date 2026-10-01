export default function Table({ columns, data, onRowClick, maxHeight, containerClassName }) {
    return (
        <div className={`overflow-auto min-w-full -mx-4 sm:mx-0 shadow-xs border-b sm:border border-gray-200 dark:border-slate-700 sm:rounded-lg ${maxHeight || 'max-h-[calc(100vh-220px)] sm:max-h-[72vh]'} ${containerClassName || ''}`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 border-separate border-spacing-0">
                <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-20">
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`sticky top-0 z-20 px-4 py-3 text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-xs ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                style={{ width: col.width }}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-blue-100/60 dark:divide-slate-700/60 text-sm">
                    {data.map((row, idx) => {
                        const isEven = idx % 2 === 1;
                        return (
                            <tr
                                key={row._id || idx}
                                onClick={() => onRowClick?.(row)}
                                className={`${isEven ? 'bg-[#E3EEFC] dark:bg-[#182B46]' : 'bg-white dark:bg-[#0F1E33]'} ${onRowClick ? 'cursor-pointer' : ''} hover:bg-[#CDE2FB] dark:hover:bg-[#223B60] transition-colors min-h-[44px]`}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={`px-4 py-3.5 text-sm text-gray-900 dark:text-slate-100 whitespace-nowrap border-b border-gray-100 dark:border-slate-800/60 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                        {col.render ? col.render(row) : (row[col.key] ?? '-')}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}