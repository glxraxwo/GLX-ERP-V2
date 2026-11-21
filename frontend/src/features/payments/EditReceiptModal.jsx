import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import AddBankAccountButton from '../../components/finance/AddBankAccountButton';

const toDateInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString().split('T')[0];
};

const METHOD_OPTIONS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' },
    { value: 'online', label: 'Online' },
    { value: 'mobile_wallet', label: 'Mobile Wallet' },
    { value: 'other', label: 'Other' },
];

const LINKED_PARTY_VOUCHERS = ['customer_advance_refund', 'supplier_payment', 'labor_advance', 'salary_advance'];

/**
 * Edit an existing customer payment receipt or payment voucher.
 * The backend recalculates invoice / quotation / bill, bank and customer balances and writes an Audit Log entry.
 */
export default function EditReceiptModal({ isOpen, onClose, payment, onSaved }) {
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});

    const { data: bankAccounts = [] } = useQuery({
        queryKey: ['bankAccounts'],
        queryFn: async () => {
            const { data } = await api.get('/finance/bank-accounts');
            return data.data || [];
        },
        enabled: Boolean(isOpen),
    });

    useEffect(() => {
        if (!isOpen || !payment) return;
        setForm({
            amount: payment.amount ?? '',
            paymentDate: toDateInput(payment.paymentDate),
            method: payment.method || 'cash',
            bankAccountId: payment.bankAccountId?._id || payment.bankAccountId || '',
            transactionReference: payment.transactionReference || '',
            chequeNumber: payment.chequeNumber || '',
            chequeDate: toDateInput(payment.chequeDate),
            bankName: payment.bankName || '',
            customerPhone: payment.customerPhone || '',
            vehicleNo: payment.vehicleNo || '',
            notes: payment.notes || '',
            partyName: payment.partyName || '',
            hireNoteNumber: payment.hireNoteNumber || '',
            transportDriver: payment.transportDriver || '',
            signatureNote: payment.signatureNote || '',
            editReason: '',
        });
    }, [isOpen, payment]);

    if (!payment) return null;

    const isVoucher = payment.direction === 'paid' || Boolean(payment.voucherType);
    const docLabel = isVoucher ? 'voucher' : 'receipt';
    const partyEditable = isVoucher && !LINKED_PARTY_VOUCHERS.includes(payment.voucherType);
    const isAdvance = payment.voucherType === 'labor_advance' || payment.voucherType === 'salary_advance';

    // Same rule as the server: amount can change only when the whole receipt sits on one document (or none)
    const allocations = Array.isArray(payment.allocations) ? payment.allocations : [];
    const allocatedTotal = allocations.reduce((s, a) => s + Number(a.amount || 0), 0);
    const amountEditable = allocations.length === 0
        || (allocations.length === 1 && Math.abs(allocatedTotal - Number(payment.amount || 0)) <= 0.01);

    const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));
    const needsBank = form.method && form.method !== 'cash';
    const isCheque = form.method === 'cheque';

    const handleSave = async () => {
        if (!String(form.editReason || '').trim()) {
            toast.error('Please enter the reason for this edit');
            return;
        }
        if (!(Number(form.amount) > 0)) {
            toast.error('Amount must be greater than zero');
            return;
        }
        if (!isVoucher && needsBank && !isCheque && !form.bankAccountId) {
            toast.error('Select the company bank account');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                amount: Number(form.amount),
                bankAccountId: needsBank ? (form.bankAccountId || null) : null,
            };
            if (!amountEditable) delete payload.amount;
            if (isVoucher) {
                delete payload.customerPhone;
                if (!partyEditable) delete payload.partyName;
            } else {
                ['partyName', 'hireNoteNumber', 'transportDriver', 'signatureNote'].forEach((k) => delete payload[k]);
            }
            const { data } = await api.put(`/payments/${payment._id}`, payload);
            toast.success(data?.message || (isVoucher ? 'Voucher updated' : 'Receipt updated'));
            queryClient.invalidateQueries({ queryKey: ['payment'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            if (onSaved) onSaved(data?.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to update ${docLabel}`);
        } finally {
            setSaving(false);
        }
    };

    const allocText = allocations.map((a) => `${a.documentNumber || a.documentType} (Rs. ${Number(a.amount || 0).toLocaleString('en-LK')})`).join(', ');

    return (
        <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={`Edit ${isVoucher ? 'Voucher' : 'Receipt'} ${payment.paymentNumber || ''}`} size="lg">
            <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    {isVoucher ? 'Paid to' : 'Customer'}: <strong>{payment.partyName || payment.customerId?.displayName || payment.supplierId?.displayName || '-'}</strong>
                    {allocText && <> · Applied to: <strong>{allocText}</strong></>}
                    <br />
                    {isVoucher
                        ? 'Bill / invoice balances, bank balances and the customer or salary advance are recalculated automatically. The change is saved in the Audit Log.'
                        : 'Invoice / quotation balances, bank balances and the customer balance are recalculated automatically. The change is saved in the Audit Log.'}
                    {isAdvance && <><br />The salary advance amount can be changed only if nothing has been deducted from salary yet.</>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Amount (LKR)"
                        type="number"
                        step="0.01"
                        required
                        value={form.amount ?? ''}
                        onChange={set('amount')}
                        disabled={!amountEditable}
                        helperText={amountEditable ? '' : `This ${docLabel} is split across documents, so the amount is locked. Cancel and re-create it to change the amount.`}
                    />
                    <Input label="Payment Date" type="date" required value={form.paymentDate || ''} onChange={set('paymentDate')} />
                    <Select label="Method" value={form.method || 'cash'} onChange={set('method')} options={METHOD_OPTIONS} />
                    {needsBank && (
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                                    Company Bank Account{!isCheque && !isVoucher && <span className="text-red-500 ml-0.5">*</span>}
                                </label>
                                <AddBankAccountButton onCreated={(acc) => setForm((prev) => ({ ...prev, bankAccountId: acc._id }))} />
                            </div>
                            <Select
                                value={form.bankAccountId || ''}
                                onChange={set('bankAccountId')}
                                placeholder="Select bank account..."
                                options={bankAccounts.map((acc) => ({ value: acc._id, label: `${acc.bankName} - ${acc.accountNumber}` }))}
                            />
                        </div>
                    )}
                </div>

                {isCheque && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input label="Cheque No." value={form.chequeNumber || ''} onChange={set('chequeNumber')} />
                        <Input label="Cheque Date" type="date" value={form.chequeDate || ''} onChange={set('chequeDate')} />
                        <Input label="Cheque Bank" value={form.bankName || ''} onChange={set('bankName')} />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Reference" value={form.transactionReference || ''} onChange={set('transactionReference')} />
                    {!isVoucher && <Input label="Customer Phone" value={form.customerPhone || ''} onChange={set('customerPhone')} />}
                    {partyEditable && <Input label="Paid To (Name)" value={form.partyName || ''} onChange={set('partyName')} />}
                    <Input label="Vehicle No." value={form.vehicleNo || ''} onChange={set('vehicleNo')} />
                    {isVoucher && <Input label="Hire Note No." value={form.hireNoteNumber || ''} onChange={set('hireNoteNumber')} />}
                    {isVoucher && <Input label="Driver" value={form.transportDriver || ''} onChange={set('transportDriver')} />}
                    {isVoucher && <Input label="Signature Note" value={form.signatureNote || ''} onChange={set('signatureNote')} />}
                    <Input label="Notes" value={form.notes || ''} onChange={set('notes')} />
                </div>

                <Input
                    label="Reason for edit"
                    required
                    value={form.editReason || ''}
                    onChange={set('editReason')}
                    placeholder="e.g. Wrong amount entered"
                />

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} loading={saving}>Save Changes</Button>
                </div>
            </div>
        </Modal>
    );
}
