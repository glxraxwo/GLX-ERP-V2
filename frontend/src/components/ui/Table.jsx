import { useState, useEffect, useRef } from 'react';

export default function Table({ columns, data = [], onRowClick, maxHeight, containerClassName }) {
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const tableRef = useRef(null);

    // Reset selected index when data list changes
    useEffect(() => {
        setSelectedIdx(-1);
    }, [data]);

    // Handle keyboard arrow navigation inside table
    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            const isTyping = target && (
                target.tagName === 'INPUT' || 
                target.tagName === 'TEXTAREA' || 
                target.tagName === 'SELECT' || 
                target.isContentEditable
            );
            if (isTyping) return;
            if (!data || data.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx(prev => (prev < data.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                if (selectedIdx >= 0 && selectedIdx < data.length && onRowClick) {
                    e.preventDefault();
                    onRowClick(data[selectedIdx]);
                }
            } else if (e.key === 'Escape') {
                setSelectedIdx(-1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data, selectedIdx, onRowClick]);

    // Scroll active row into view
    useEffect(() => {
        if (selectedIdx >= 0 && tableRef.current) {
            const rowEl = tableRef.current.querySelector(`[data-row-index="${selectedIdx}"]`);
            if (rowEl) {
                rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIdx]);

    return (
        <div 
            ref={tableRef}
            className={`overflow-auto min-w-full -mx-4 sm:mx-0 shadow-xs border-b sm:border border-gray-200 dark:border-slate-700 sm:rounded-lg ${maxHeight || 'max-h-[calc(100vh-220px)] sm:max-h-[72vh]'} ${containerClassName || ''}`}
        >
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
                        const isSelected = selectedIdx === idx;

                        return (
                            <tr
                                key={row._id || idx}
                                data-row-index={idx}
                                onClick={() => {
                                    setSelectedIdx(idx);
                                    onRowClick?.(row);
                                }}
                                className={`transition-colors min-h-[44px] ${onRowClick ? 'cursor-pointer' : ''} ${
                                    isSelected
                                        ? 'bg-blue-100/90 dark:bg-sky-950/80 ring-2 ring-blue-500 dark:ring-sky-400 font-semibold z-10 relative'
                                        : isEven 
                                            ? 'bg-[#E3EEFC] dark:bg-[#182B46] hover:bg-[#CDE2FB] dark:hover:bg-[#223B60]' 
                                            : 'bg-white dark:bg-[#0F1E33] hover:bg-[#CDE2FB] dark:hover:bg-[#223B60]'
                                }`}
                            >
                                {columns.map((col, colIdx) => (
                                    <td 
                                        key={col.key} 
                                        className={`px-4 py-3.5 text-sm text-gray-900 dark:text-slate-100 whitespace-nowrap border-b border-gray-100 dark:border-slate-800/60 ${
                                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {colIdx === 0 && isSelected && onRowClick && (
                                                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-blue-600 text-white dark:bg-sky-500 font-bold flex-shrink-0 animate-pulse">
                                                    ↵
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                {col.render ? col.render(row) : (row[col.key] ?? '-')}
                                            </div>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Subtle Keyboard Navigation Hint in Table Footer */}
            {data && data.length > 0 && onRowClick && (
                <div className="sticky bottom-0 z-10 flex items-center justify-between px-3.5 py-1.5 bg-slate-50/95 dark:bg-slate-800/95 border-t border-gray-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 backdrop-blur-xs select-none">
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1 py-0.2 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-mono text-[9px] font-bold">↑</kbd>
                        <kbd className="px-1 py-0.2 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-mono text-[9px] font-bold">↓</kbd>
                        <span>Navigate rows</span>
                        <span className="mx-1 opacity-50">•</span>
                        <kbd className="px-1.5 py-0.2 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-mono text-[9px] font-bold">Enter ↵</kbd>
                        <span>Open details</span>
                    </div>
                    {selectedIdx >= 0 && (
                        <span className="font-semibold text-blue-600 dark:text-sky-400">
                            Row {selectedIdx + 1} of {data.length} selected
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
