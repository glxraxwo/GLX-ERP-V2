import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange, total }) {
    if (totalPages <= 1) return null;

    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
        <div className="flex flex-col xs:flex-row items-center justify-between px-3 sm:px-4 py-3 border-t border-gray-200 dark:border-slate-700/80 gap-2">
            {/* Record count — hidden on xs to save space */}
            <p className="text-xs text-gray-500 dark:text-slate-400 hidden xs:block">
                Page <span className="font-semibold text-gray-700 dark:text-slate-200">{page}</span> of{' '}
                <span className="font-semibold text-gray-700 dark:text-slate-200">{totalPages}</span>
                {total !== undefined && (
                    <span className="text-gray-400 dark:text-slate-500 ml-1.5">({total} total)</span>
                )}
            </p>

            {/* Mobile: show page x/y */}
            <p className="text-xs text-gray-500 dark:text-slate-400 xs:hidden font-medium">
                {page} / {totalPages}
            </p>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!canPrev}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1C2E4A] disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] justify-center transition"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={15} />
                    <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Page numbers — show on sm+ only */}
                <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (page <= 3) {
                            pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = page - 2 + i;
                        }
                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                                    pageNum === page
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1C2E4A]'
                                }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!canNext}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1C2E4A] disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px] min-w-[36px] justify-center transition"
                    aria-label="Next page"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}