export default function PageHeader({ title, description, actions }) {
    return (
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4 gap-2">
                <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight break-words">{title}</h1>
                    {description && (
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">{description}</div>
                    )}
                </div>
                {actions && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center w-full sm:w-auto sm:flex-shrink-0 sm:justify-end">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}