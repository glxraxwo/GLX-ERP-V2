import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Focus the dialog container itself so browser doesn't automatically jump into child input fields
            const timer = setTimeout(() => {
                dialogRef.current?.focus();
            }, 30);
            return () => {
                clearTimeout(timer);
                document.body.style.overflow = 'unset';
            };
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'sm:max-w-md',
        md: 'sm:max-w-lg',
        lg: 'sm:max-w-2xl',
        xl: 'sm:max-w-4xl',
        '2xl': 'sm:max-w-6xl',
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs select-none sm:select-auto"
            // Backdrop clicks intentionally DO NOT close modals — only explicit Close or 'X' buttons close the modal
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={title || 'Modal dialog'}
                className={`bg-white dark:bg-[#111F33] rounded-t-2xl sm:rounded-xl shadow-2xl w-full ${sizes[size] || sizes.md} max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden transform transition-all border border-gray-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 outline-none`}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-200 dark:border-slate-700/80 flex-shrink-0 bg-gray-50/50 dark:bg-[#0E1A2B]">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate pr-2">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none cursor-pointer"
                        aria-label="Close modal"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-sm text-slate-700 dark:text-slate-200">{children}</div>
            </div>
        </div>
    );
}
