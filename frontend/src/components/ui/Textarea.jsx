import { forwardRef } from 'react';

const Textarea = forwardRef(({
    label,
    error,
    required = false,
    rows = 3,
    className = '',
    helperText,
    ...props
}, ref) => {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            <textarea
                ref={ref}
                rows={rows}
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-y
                    text-[16px] leading-snug min-h-[88px] bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500
                    ${error
                        ? 'border-red-400 dark:border-red-500 focus:ring-red-200 focus:border-red-500 bg-red-50/30 dark:bg-red-950/20'
                        : 'border-gray-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-900/40'
                    }`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
            {helperText && !error && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{helperText}</p>}
        </div>
    );
});

Textarea.displayName = 'Textarea';
export default Textarea;