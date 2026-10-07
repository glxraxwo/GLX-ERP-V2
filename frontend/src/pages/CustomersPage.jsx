import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, AlertTriangle, Ban, CheckCircle } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CustomerFormModal from '../features/customers/CustomerFormModal';
import {
    useCustomers, useDeleteCustomer, useToggleCreditHold,
} from '../features/customers/useCustomers';
import { useAuthStore } from '../store/authStore';
import ExportButtons from '../components/ui/ExportButtons';
import { useExport } from '../hooks/useExport';

const statusVariant = {
    active: 'success',
    inactive: 'default',
    prospect: 'info',
    on_hold: 'warning',
    blacklisted: 'danger',
};

export default function CustomersPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'sales_manager', 'sales_rep'].includes(user?.role);
    const canDelete = ['admin', 'manager'].includes(user?.role);
    const canHoldCredit = ['admin', 'manager', 'accountant'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', status: '',
        page: 1, limit: 10,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [togglingHold, setTogglingHold] = useState(null);
    const [holdReason, setHoldReason] = useState('');

    const { data, isLoading } = useCustomers(filters);
    const deleteMutation = useDeleteCustomer();
    const holdMutation = useToggleCreditHold();

    const customers = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const exportColumns = [
        { header: 'Code', dataKey: 'customerCode' },
        { header: 'Customer Name', dataKey: 'displayName' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'WhatsApp', dataKey: 'whatsappNumber' },
        { header: 'Email', dataKey: 'email' },
        { header: 'VAT Number', dataKey: 'taxRegistrationNumber' },
        { header: 'BR Number', dataKey: 'businessRegistrationNumber' },
        { header: 'ID Number', dataKey: 'idNumber' },
        { header: 'Billing Address', dataKey: 'billingAddress' },
        { header: 'Sales Rep', dataKey: 'salesRep' },
        { header: 'Balance (LKR)', dataKey: 'balance' },
        { header: 'Status', dataKey: 'status' },
    ];

    const { handleExportExcel, handleExportCSV, handleExportPDF } = useExport({
        title: 'Customer Directory Report',
        columns: exportColumns,
        fileName: 'customers_export',
        module: 'customers'
    });

    const exportData = customers.map(c => ({
        ...c,
        phone: c.primaryContact?.phone || '—',
        email: c.primaryContact?.email || '—',
        whatsappNumber: c.whatsappNumber || c.primaryContact?.mobile || '—',
        taxRegistrationNumber: c.taxRegistrationNumber || '—',
        businessRegistrationNumber: c.businessRegistrationNumber || '—',
        idNumber: c.idNumber || '—',
        billingAddress: c.billingAddress?.line1 || (typeof c.billingAddress === 'string' ? c.billingAddress : '—'),
        salesRep: c.assignedSalesRep ? `${c.assignedSalesRep.firstName} ${c.assignedSalesRep.lastName || ''}`.trim() : '—',
        balance: c.creditStatus?.currentBalance || 0,
    }));

    const formatMoney = (n) => new Intl.NumberFormat('en-LK').format(n || 0);

    const columns = [
        {
            key: 'customerCode', label: 'Code', width: '90px',
            render: (r) => <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">{r.customerCode}</span>,
        },
        {
            key: 'displayName', label: 'Customer',
            render: (r) => (
                <div>
                    <p className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                        {r.displayName}
                        {r.creditStatus?.onCreditHold && (
                            <span title="On credit hold"><Ban size={13} className="text-red-500" /></span>
                        )}
                        {r.creditStatus?.isOverdue && (
                            <span title="Overdue"><AlertTriangle size={13} className="text-amber-500" /></span>
                        )}
                    </p>
                    {r.companyName && r.companyName !== r.displayName && (
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">{r.companyName}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'phone', label: 'Phone',
            render: (r) => (
                <span className="font-mono text-xs text-gray-800 dark:text-slate-200">
                    {r.primaryContact?.phone || '—'}
                </span>
            ),
        },
        {
            key: 'whatsapp', label: 'WhatsApp',
            render: (r) => {
                const num = r.whatsappNumber || r.primaryContact?.mobile;
                return num ? (
                    <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        {num}
                    </span>
                ) : <span className="text-gray-400 text-xs">—</span>;
            },
        },
        {
            key: 'email', label: 'Email',
            render: (r) => (
                <span className="text-xs text-gray-600 dark:text-slate-400">
                    {r.primaryContact?.email || '—'}
                </span>
            ),
        },
        {
            key: 'vatBr', label: 'VAT / BR',
            render: (r) => {
                const vat = r.taxRegistrationNumber;
                const br = r.businessRegistrationNumber;
                if (!vat && !br) return <span className="text-gray-400 text-xs">—</span>;
                return (
                    <div className="text-xs space-y-0.5 font-mono">
                        {vat && <p className="text-gray-800 dark:text-slate-200"><span className="text-gray-400 text-[10px] font-sans">VAT: </span>{vat}</p>}
                        {br && <p className="text-gray-600 dark:text-slate-400"><span className="text-gray-400 text-[10px] font-sans">BR: </span>{br}</p>}
                    </div>
                );
            },
        },
        {
            key: 'billingAddress', label: 'Address',
            render: (r) => {
                const addr = r.billingAddress?.line1 || (typeof r.billingAddress === 'string' ? r.billingAddress : '');
                return addr ? (
                    <span className="text-xs text-gray-700 dark:text-slate-300 max-w-[180px] truncate block" title={addr}>
                        {addr}
                    </span>
                ) : <span className="text-gray-400 text-xs">—</span>;
            },
        },
        {
            key: 'idNumber', label: 'ID Number',
            render: (r) => (
                <span className="font-mono text-xs text-gray-700 dark:text-slate-300">
                    {r.idNumber || '—'}
                </span>
            ),
        },
        {
            key: 'assignedSalesRep', label: 'Sales Rep',
            render: (r) => (
                <span className="text-xs font-medium text-gray-800 dark:text-slate-200">
                    {r.assignedSalesRep ? `${r.assignedSalesRep.firstName} ${r.assignedSalesRep.lastName || ''}`.trim() : '—'}
                </span>
            ),
        },
        {
            key: 'creditStatus', label: 'Outstanding', align: 'right',
            render: (r) => {
                const bal = r.creditStatus?.currentBalance || 0;
                if (bal === 0) return <span className="text-gray-400 text-xs">—</span>;
                return (
                    <span className={`font-mono text-xs ${r.creditStatus?.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900 dark:text-slate-100 font-medium'}`}>
                        LKR {formatMoney(bal)}
                    </span>
                );
            },
        },
        {
            key: 'status', label: 'Status', align: 'center',
            render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
        },
        {
            key: 'actions', label: 'Actions', width: '120px', align: 'center',
            render: (r) => (
                <div className="flex items-center justify-center gap-1">
                    {canHoldCredit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setTogglingHold(r); setHoldReason(''); }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition"
                            title={r.creditStatus?.onCreditHold ? 'Remove credit hold' : 'Place on credit hold'}
                        >
                            {r.creditStatus?.onCreditHold ? <CheckCircle size={15} className="text-green-600" /> : <Ban size={15} />}
                        </button>
                    )}
                    {canManage && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(r); setIsFormOpen(true); }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700 rounded transition"
                            title="Edit"
                        >
                            <Edit size={15} />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeleting(r); }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition"
                            title="Delete"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(deleting._id);
        setDeleting(null);
    };

    const handleToggleHold = async () => {
        await holdMutation.mutateAsync({ id: togglingHold._id, reason: holdReason });
        setTogglingHold(null);
    };

    const handleClose = () => {
        setIsFormOpen(false);
        setEditing(null);
    };

    return (
        <div>
            <PageHeader
                title="Customers"
                description="Manage your wholesale customers"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <ExportButtons
                            onExportPDF={() => handleExportPDF(exportData)}
                            onExportExcel={() => handleExportExcel(exportData)}
                            onExportCSV={() => handleExportCSV(exportData)}
                            onExportAllPDF={() => handleExportPDF(null, true, filters)}
                            onExportAllExcel={() => handleExportExcel(null, true, filters)}
                            onExportAllCSV={() => handleExportCSV(null, true, filters)}
                            isDisabled={customers.length === 0}
                        />
                        {canManage && (
                            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Add Customer
                            </Button>
                        )}
                    </div>
                }
            />

            <Card>
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                    <div className="relative flex-1 min-w-0">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name, code, phone, ID, VAT..."
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#132238] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-blue-900/40 focus:border-primary-500 text-[16px] min-h-[44px]"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-full sm:w-40">
                        <Select
                            placeholder="All Statuses"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'prospect', label: 'Prospect' },
                                { value: 'on_hold', label: 'On Hold' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'blacklisted', label: 'Blacklisted' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading customers...</div>
                ) : customers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No customers found"
                        description={filters.search || filters.status ? 'Try adjusting filters' : 'Add your first customer to get started'}
                        action={canManage && !filters.search && (
                            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Add Customer
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <Table columns={columns} data={customers} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>

            <CustomerFormModal isOpen={isFormOpen} onClose={handleClose} customer={editing} />

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Customer"
                message={`Delete "${deleting?.displayName}"? This is a soft delete.`}
                confirmText="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
            />

            <ConfirmDialog
                isOpen={!!togglingHold}
                onClose={() => setTogglingHold(null)}
                onConfirm={handleToggleHold}
                title={togglingHold?.creditStatus?.onCreditHold ? 'Remove Credit Hold' : 'Place on Credit Hold'}
                message={
                    togglingHold?.creditStatus?.onCreditHold
                        ? `Remove credit hold for "${togglingHold?.displayName}"? They will be able to place orders again.`
                        : (
                            <div>
                                <p className="mb-3">Place "{togglingHold?.displayName}" on credit hold?</p>
                                <input
                                    type="text"
                                    placeholder="Reason (required)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    value={holdReason}
                                    onChange={(e) => setHoldReason(e.target.value)}
                                />
                            </div>
                        )
                }
                confirmText={togglingHold?.creditStatus?.onCreditHold ? 'Remove Hold' : 'Place Hold'}
                variant={togglingHold?.creditStatus?.onCreditHold ? 'primary' : 'danger'}
                loading={holdMutation.isPending}
            />
        </div>
    );
}