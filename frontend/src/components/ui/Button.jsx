export default function Button({
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    onClick,
    className = '',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[40px] sm:min-h-[44px]';

    const variants = {
        primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs',
        secondary: 'bg-gray-100 dark:bg-[#182B46] text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-[#203656] active:bg-gray-300 dark:active:bg-[#28436a] border border-gray-200 dark:border-slate-700',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs',
        outline: 'border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1C2E4A] active:bg-gray-100 dark:active:bg-[#233857]',
        ghost: 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#182B46] active:bg-gray-200 dark:active:bg-[#203656]',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs min-h-[36px]',
        md: 'px-4 py-2 text-sm min-h-[44px]',
        lg: 'px-6 py-3 text-base min-h-[48px]',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
            ) : null}
            {children}
        </button>
    );
}