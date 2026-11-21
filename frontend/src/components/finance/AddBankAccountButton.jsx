import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

const EMPTY_FORM = {
    bankName: '',
    accountName: '',
    accountNumber: '',
    branchName: '',
    accountType: 'current',
    balance: 0,
};

/**
 * "+ Add Bank Account" button for payment forms.
 * Opens a small popup, saves the new account to the system (same API as the
 * Bank Accounts page) and gives the saved account back through onCreated so
 * the form can show it in its dropdown and select it straight away.
 */
export default function AddBankAccountButton({ onCreated, className = '', label = 'Add Bank Account', onDark = false }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);

    const setField = (name) => (e) => setFormData((prev) => ({ ...prev, [name]: e.target.value }));

    const close = () => {
        if (saving) return;
        setIsOpen(false);
        setFormData(EMPTY_FORM);
    };

    const handleSave = async () => {
        if (!formData.bankName.trim() || !formData.accountName.trim() || !formData.accountNumber.trim()) {
            toast.error('Bank name, account holder name and account number are required');
            return;
        }
        setSaving(true);
        try {
            const { data } = await api.post('/finance/bank-accounts', {
                ...formData,
                bankName: formData.bankName.trim(),
                accountName: formData.accountName.trim(),
                accountNumber: formData.accountNumber.trim(),
                branchName: formData.branchName.trim(),
                balance: Number(formData.balance) || 0,
            });
            const account = data?.data;
            toast.success('Bank account saved');
            // Show the new account in every bank dropdown right away, then refresh from the server
            if (account) {
                queryClient.setQueryData(['bankAccounts'], (old) => (Array.isArray(old) ? [account, ...old] : old));
            }
            queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
            if (account && onCreated) onCreated(account);
            setIsOpen(false);
            setFormData(EMPTY_FORM);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save bank account');
        } finally {
            setSaving(false);
        }
    };

    // Enter key saves this popup only (never submits the payment form behind it)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
                className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap hover:underline cursor-pointer ${onDark
                    ? 'text-emerald-300 hover:text-emerald-200'
                    : 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300'} ${className}`}
                title="Add a new bank account"
            >
                <Plus size={14} /> {label}
            </button>

            {isOpen && createPortal(
                <Modal isOpen={isOpen} onClose={close} title="Add New Bank Account" size="md" zIndex="z-[200]">
                    <div className="space-y-3" onKeyDown={handleKeyDown}>
                        <Input label="Bank Name" required value={formData.bankName} onChange={setField('bankName')} placeholder="e.g. Commercial Bank" autoFocus />
                        <Input label="Account Holder Name" required value={formData.accountName} onChange={setField('accountName')} placeholder="e.g. GLX Truck Body Engineers" />
                        <Input label="Account Number" required value={formData.accountNumber} onChange={setField('accountNumber')} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input label="Branch Name" value={formData.branchName} onChange={setField('branchName')} />
                            <Select
                                label="Account Type"
                                value={formData.accountType}
                                onChange={setField('accountType')}
                                options={[
                                    { value: 'current', label: 'Current Account' },
                                    { value: 'savings', label: 'Savings Account' },
                                ]}
                            />
                        </div>
                        <Input label="Starting Balance (LKR)" type="number" value={formData.balance} onChange={setField('balance')} />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
                            <Button variant="primary" onClick={handleSave} loading={saving}>Save Bank Account</Button>
                        </div>
                    </div>
                </Modal>,
                document.body
            )}
        </>
    );
}
