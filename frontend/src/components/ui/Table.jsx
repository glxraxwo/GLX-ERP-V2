export default function Table({ columns, data, onRowClick }) {
    return (
        <div className="overflow-x-auto min-w-full -mx-4 sm:mx-0 shadow-xs border-b sm:border border-gray-200 dark:border-slate-700 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50/90 dark:bg-slate-800/90 backdrop-blur-xs sticky top-0 z-10">
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap"
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
                                    <td key={col.key} className="px-4 py-3.5 text-sm text-gray-900 dark:text-slate-100 whitespace-nowrap">
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