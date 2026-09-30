import { CheckCircle2, AlertCircle, Clock, Info, XCircle } from 'lucide-react';

export default function Badge({ children, variant = 'default', size = 'md', showIcon = true }) {
    const variants = {
        default: { bg: 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-700', dot: 'bg-gray-500', icon: Info },
        primary: { bg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60', dot: 'bg-indigo-600', icon: Info },
        success: { bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60', dot: 'bg-emerald-600', icon: CheckCircle2 },
        warning: { bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800/60', dot: 'bg-amber-600', icon: Clock },
        danger: { bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-800/60', dot: 'bg-rose-600', icon: AlertCircle },
        info: { bg: 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-800/60', dot: 'bg-sky-600', icon: Info },
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs gap-1',
        md: 'px-2.5 py-1 text-xs gap-1.5 font-semibold',
    };

    const currentVariant = variants[variant] || variants.default;

    return (
        <span className={`inline-flex items-center rounded-full border ${currentVariant.bg} ${sizes[size]}`}>
            {showIcon && <span className={`w-1.5 h-1.5 rounded-full ${currentVariant.dot} flex-shrink-0`} aria-hidden="true" />}
            <span>{children}</span>
        </span>
    );
}