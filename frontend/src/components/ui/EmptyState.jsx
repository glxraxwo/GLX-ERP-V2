import React, { isValidElement } from 'react';
import { Package } from 'lucide-react';

export default function EmptyState({
    icon: Icon = Package,
    title = 'No data',
    description,
    action,
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-slate-500">
                {isValidElement(Icon) ? (
                    Icon
                ) : (
                    <Icon size={28} className="text-gray-400 dark:text-slate-500" />
                )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md">{description}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}