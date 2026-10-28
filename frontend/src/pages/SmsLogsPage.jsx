import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import { Mail, CheckCircle2, XCircle, Search, RefreshCw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import DateRangeFilter from '../components/ui/DateRangeFilter';
import ManualSmsModal from '../components/ManualSmsModal';

export default function SmsLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    // Manual SMS State
    const [isModalOpen, setIsModalOpen] = useState(false);

    const formatDateSafely = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '—';
            return format(d, 'yyyy-MM-dd HH:mm:ss');
        } catch {
            return '—';
        }
    };

    const fetchLogs = useCallback(async () => {
        Promise.resolve().then(() => setLoading(true));
        try {
            const params = { page, limit: 20 };
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const res = await api.get('/audit/sms', { params });
            setLogs(res.data.data || []);
            setPages(res.data.pages || 1);
        } catch {
            toast.error('Failed to load SMS logs');
        } finally {
            setLoading(false);
        }
    }, [page, startDate, endDate]);

    useEffect(() => {
        Promise.resolve().then(() => fetchLogs());
    }, [fetchLogs]);



    const filtered = logs.filter(log =>
        [log.supplierName, log.supplierPhone, log.message, log.grnId?.grnNumber].some(
            field => (field || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Centre &amp; Dispatch Logs</h2>
                    <p className="text-sm text-gray-500">Send manual customer &amp; supplier SMS, manage message templates, and view live gateway delivery logs</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition shadow-sm"
                    >
                        <Mail size={16} />
                        Send Custom SMS
                    </button>
                    <button onClick={fetchLogs} className="p-2 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition" title="Refresh logs">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#111F33] p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search supplier, mobile, message, GRN..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#132238] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => { setStartDate(''); setEndDate(''); }}
                />
            </div>

            {/* Table / List */}
            <div className="bg-white dark:bg-[#111F33] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-[#132238] border-b border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200">
                        <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="px-5 py-3">Timestamp</th>
                            <th className="px-5 py-3">Supplier Name</th>
                            <th className="px-5 py-3">Mobile No.</th>
                            <th className="px-5 py-3">SMS Message Content</th>
                            <th className="px-5 py-3">Related GRN</th>
                            <th className="px-5 py-3 text-center">Gateway Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 text-sm">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="6" className="px-5 py-5">
                                        <div className="h-4 bg-gray-100 rounded w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-5 py-12 text-center text-gray-400 italic">
                                    No SMS logs found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((log) => (
                                <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800/60 transition">
                                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                                        {formatDateSafely(log.date)}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">
                                        {log.supplierName}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs">
                                        {log.supplierPhone}
                                    </td>
                                    <td className="px-5 py-4 max-w-xs truncate" title={log.message}>
                                        {log.message}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {log.grnId ? (
                                            <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded">
                                                {log.grnId.grnNumber}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            log.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                        }`}>
                                            {log.status === 'sent' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                            {log.status === 'sent' ? 'Sent' : 'Failed'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex justify-end items-center gap-2 pt-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500 font-medium">Page {page} of {pages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(pages, p + 1))}
                        disabled={page === pages}
                        className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Manual SMS Modal with Customer Selection & Preset Templates */}
            <ManualSmsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchLogs}
            />
        </div>
    );
}
