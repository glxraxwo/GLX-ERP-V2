export default function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white dark:bg-[#111F33] rounded-xl shadow-sm border border-gray-200 dark:border-slate-700/80 overflow-hidden text-slate-800 dark:text-slate-100 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}