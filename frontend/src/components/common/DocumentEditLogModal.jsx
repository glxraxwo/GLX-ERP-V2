import React from 'react';
import { History, User, Calendar, Clock, CheckCircle2, FileText, Shield, ArrowRight } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getDocumentEditHistory, formatEditItem } from '../../utils/editHistoryUtils';

const formatFullDateTime = (dateVal) => {
    if (!dateVal) return '—';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(d.getDate()).padStart(2, '0');
        const mon = months[d.getMonth()];
        const yr = d.getFullYear();

        let h = d.getHours();
        const mi = String(d.getMinutes()).padStart(2, '0');
        const se = String(d.getSeconds()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;

        return `${day}/${mon}/${yr} at ${String(h).padStart(2, '0')}:${mi}:${se} ${ampm}`;
    } catch {
        return String(dateVal);
    }
};

const getRelativeTime = (dateVal) => {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        const diffMs = Date.now() - d.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return 'Just now';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const diffDays = Math.floor(diffHr / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays}d ago`;
        return '';
    } catch {
        return '';
    }
};

export default function DocumentEditLogModal({ isOpen, onClose, document: doc }) {
    if (!doc) return null;

    const docNumber = doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || doc.proformaNumber || 'Document';
    const isEstimate = doc.documentType === 'estimate' || (doc.quoteNumber && (doc.quoteNumber.startsWith('EST') || doc.quoteNumber.includes('/EST/')));
    const isInvoice = !!doc.invoiceNumber || doc.documentType === 'invoice';
    const docTypeLabel = isInvoice ? 'Invoice' : isEstimate ? 'Estimate' : 'Quotation';

    const history = getDocumentEditHistory(doc);
    const creatorName = doc.createdBy?.firstName
        ? `${doc.createdBy.firstName} ${doc.createdBy.lastName || ''}`.trim()
        : (doc.createdByName || 'System / Staff');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <History size={18} />
                    </div>
                    <div>
                        <div className="text-base font-bold text-gray-900 leading-tight">
                            Document Revision &amp; Edit Log
                        </div>
                        <div className="text-xs font-normal text-gray-500">
                            {docTypeLabel}: <span className="font-mono font-bold text-gray-700">{docNumber}</span>
                        </div>
                    </div>
                </div>
            }
            size="lg"
        >
            <div className="space-y-5 p-1">
                {/* Document Creation & Meta Header Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                            <span className="text-gray-400 block font-medium uppercase text-[10px] tracking-wider">
                                Originally Created
                            </span>
                            <div className="font-bold text-gray-800 mt-0.5">
                                {formatFullDateTime(doc.createdAt)}
                            </div>
                            <div className="text-gray-500 flex items-center gap-1 mt-0.5 text-[11px]">
                                <User size={12} className="text-gray-400" /> By {creatorName}
                            </div>
                        </div>

                        <div>
                            <span className="text-gray-400 block font-medium uppercase text-[10px] tracking-wider">
                                Total Edits / Revisions
                            </span>
                            <div className="mt-0.5">
                                {history.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-mono">
                                        {history.length} {history.length === 1 ? 'Revision' : 'Revisions'} Recorded
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                        <CheckCircle2 size={12} /> Original (0 Edits)
                                    </span>
                                )}
                            </div>
                            <div className="text-gray-500 mt-1 text-[11px]">
                                Customer: <span className="font-semibold text-gray-700">{doc.customerName || doc.customerSnapshot?.name || doc.vehicleOwner || '—'}</span>
                            </div>
                        </div>

                        <div>
                            <span className="text-gray-400 block font-medium uppercase text-[10px] tracking-wider">
                                Vehicle / Reference
                            </span>
                            <div className="font-mono font-bold text-gray-800 mt-0.5">
                                {doc.vehicleNo || 'N/A'}
                            </div>
                            <div className="text-gray-500 mt-0.5 text-[11px]">
                                Branch: <span className="font-semibold text-gray-700">{doc.branch || 'JA-ELA'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Timeline */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-500" />
                            Detailed Audit Timeline ({history.length})
                        </h4>
                        <span className="text-[11px] text-gray-400">
                            Chronological history of all modifications
                        </span>
                    </div>

                    {history.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                            <div className="text-sm font-bold text-gray-800">Original Version</div>
                            <div className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                No modifications or edits have been recorded for this {docTypeLabel.toLowerCase()}. It remains identical to when it was originally created.
                            </div>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-red-200 ml-4 pl-5 space-y-4 py-1">
                            {history.map((item, idx) => {
                                const editNum = item.editNumber || idx + 1;
                                const isLatest = idx === history.length - 1;
                                const dateVal = item.editedAt || item.date || item.createdAt || item.updatedAt;
                                const editorName = item.editedByName ||
                                    (item.editedBy?.firstName ? `${item.editedBy.firstName} ${item.editedBy.lastName || ''}`.trim() : null) ||
                                    (doc.updatedBy?.firstName ? `${doc.updatedBy.firstName} ${doc.updatedBy.lastName || ''}`.trim() : 'Admin');
                                const editorRole = item.userRole || item.editedBy?.role || 'Admin';
                                const relative = getRelativeTime(dateVal);

                                return (
                                    <div key={idx} className="relative group">
                                        {/* Dot indicator */}
                                        <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                                            isLatest ? 'bg-red-600 border-white ring-4 ring-red-100' : 'bg-red-400 border-white'
                                        }`} />

                                        <div className={`p-3.5 rounded-xl border transition-all ${
                                            isLatest
                                                ? 'bg-red-50/40 border-red-200 shadow-xs'
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-red-600 text-white shadow-2xs">
                                                        Edit #{editNum}
                                                    </span>
                                                    {isLatest && (
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                            ★ Latest Revision
                                                        </span>
                                                    )}
                                                    <span className="font-mono text-xs font-bold text-gray-900">
                                                        {formatFullDateTime(dateVal)}
                                                    </span>
                                                </div>
                                                {relative && (
                                                    <span className="text-[11px] text-gray-500 font-medium">
                                                        {relative}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                                                        {editorName ? editorName.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-gray-900">{editorName}</span>
                                                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                            {editorRole}
                                                        </span>
                                                        {item.editedBy?.email && (
                                                            <span className="text-gray-400 text-[11px] ml-2">
                                                                ({item.editedBy.email})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {item.notes && (
                                                    <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-100 italic">
                                                        "{item.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
