import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm action',
    message,
    confirmText,
    confirmLabel = 'Confirm',
    cancelText,
    cancelLabel = 'Cancel',
    variant,
    confirmVariant = 'danger',
    loading = false,
}) {
    const finalConfirmText = confirmText || confirmLabel;
    const finalCancelText = cancelText || cancelLabel;
    const finalVariant = variant || confirmVariant;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="p-4 sm:p-6">
                <div className="flex gap-3 sm:gap-4">
                    <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        finalVariant === 'danger' ? 'bg-red-100' : finalVariant === 'primary' ? 'bg-indigo-100' : 'bg-amber-100'
                    }`}>
                        <AlertTriangle size={18} className={finalVariant === 'danger' ? 'text-red-600' : finalVariant === 'primary' ? 'text-indigo-600' : 'text-amber-600'} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{message}</p>
                    </div>
                </div>
                {/* Full-width buttons stacked on mobile, side-by-side on sm+ */}
                <div className="flex flex-col-reverse xs:flex-row xs:justify-end gap-2 mt-5 sm:mt-6">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="w-full xs:w-auto">
                        {finalCancelText}
                    </Button>
                    <Button variant={finalVariant} onClick={onConfirm} loading={loading} className="w-full xs:w-auto">
                        {finalConfirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}