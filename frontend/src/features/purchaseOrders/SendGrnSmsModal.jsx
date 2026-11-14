import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useSendGrnSms } from './usePurchaseOrders';
import { Mail, Phone, User, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SendGrnSmsModal({ isOpen, onClose, grn, supplier = null }) {
    const sendSmsMutation = useSendGrnSms();
    const [smsMessage, setSmsMessage] = useState('');
    const [isCustomized, setIsCustomized] = useState(false);
    const [recipientMode, setRecipientMode] = useState('saved'); // 'saved' | 'custom'
    const [selectedPhone, setSelectedPhone] = useState('');
    const [customPhone, setCustomPhone] = useState('');

    const supplierContact = supplier?.primaryContact || grn?.supplierId?.primaryContact;
    const availablePhones = [
        { label: 'Primary Contact', number: supplierContact?.phone || grn?.supplierPhone },
        { label: 'Mobile Contact', number: supplierContact?.mobile }
    ].filter(p => p.number && p.number !== 'N/A');

    const supplierName = grn?.supplierName || supplier?.displayName || supplier?.companyName || 'Supplier';

    useEffect(() => {
        if (!isOpen) {
            setSmsMessage('');
            setIsCustomized(false);
            setRecipientMode('saved');
            setSelectedPhone('');
            setCustomPhone('');
        } else {
            if (availablePhones.length > 0) {
                setRecipientMode('saved');
                setSelectedPhone(availablePhones[0].number);
            } else if (grn?.supplierPhone && grn.supplierPhone !== 'N/A') {
                setRecipientMode('custom');
                setCustomPhone(grn.supplierPhone);
            } else {
                setRecipientMode('custom');
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && grn && !isCustomized) {
            const formattedDate = grn.receiptDate ? new Date(grn.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            
            const productsList = (grn.items || []).map(item => {
                const qty = Number(item.acceptedQuantity || item.receivedQuantity || 0);
                const uom = item.unitOfMeasure || 'kg';
                return `${item.productName} (${qty} ${uom})`;
            }).join(', ');

            const totalPayable = grn.totalPayableLKR || grn.totalAcceptedValue || 0;
            const formattedTotal = totalPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 });

            const message = `Dear ${supplierName}, your delivery on ${formattedDate} for ${productsList} has been accepted and QA approved. Total accepted value: Rs. ${formattedTotal}. Thank you.`;
            setSmsMessage(message);
        }
    }, [isOpen, grn, isCustomized, supplierName]);

    const finalRecipientPhone = recipientMode === 'saved' ? selectedPhone : customPhone;

    const handleSend = async () => {
        const trimmedPhone = (finalRecipientPhone || '').trim();
        const trimmedMsg = (smsMessage || '').trim();

        if (!trimmedPhone) {
            toast.error('Please select or enter the recipient phone number');
            return;
        }

        if (!trimmedMsg) {
            toast.error('SMS message content cannot be empty');
            return;
        }

        try {
            await sendSmsMutation.mutateAsync({
                id: grn._id,
                data: {
                    customMessage: trimmedMsg,
                    recipientPhone: trimmedPhone
                }
            });
            toast.success(`GRN Confirmation SMS dispatched successfully to ${trimmedPhone}!`);
            onClose();
        } catch (err) {
            // Toast error handled by mutation
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send QA Confirmation SMS — GRN ${grn?.grnNumber}`} size="md">
            <div className="p-6 space-y-4 font-calibri">
                {/* Permission Alert */}
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-xs flex items-start gap-2.5">
                    <AlertCircle size={17} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block font-semibold">SMS Dispatch Permission</strong>
                        Please review the recipient supplier contact and SMS content before giving permission to send.
                    </div>
                </div>

                {/* 1. Recipient Person Selection */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                            <User size={14} className="text-gray-500" />
                            Recipient Supplier
                        </label>
                        <span className="text-xs text-gray-900 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200">
                            {supplierName}
                        </span>
                    </div>

                    {availablePhones.length > 0 && (
                        <div className="space-y-1.5">
                            {availablePhones.map((p, idx) => (
                                <label
                                    key={idx}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                                        recipientMode === 'saved' && selectedPhone === p.number
                                            ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-semibold'
                                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="grnSupplierPhone"
                                            checked={recipientMode === 'saved' && selectedPhone === p.number}
                                            onChange={() => {
                                                setRecipientMode('saved');
                                                setSelectedPhone(p.number);
                                            }}
                                            disabled={sendSmsMutation.isPending}
                                            className="text-blue-600"
                                        />
                                        <span>{p.label}</span>
                                    </div>
                                    <span className="font-mono text-gray-600">{p.number}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Custom Phone Option */}
                    <div className="pt-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                            <input
                                type="radio"
                                name="grnSupplierPhone"
                                checked={recipientMode === 'custom'}
                                onChange={() => setRecipientMode('custom')}
                                disabled={sendSmsMutation.isPending}
                                className="text-blue-600"
                            />
                            <span>Enter custom recipient phone number</span>
                        </label>
                        {recipientMode === 'custom' && (
                            <div className="mt-2">
                                <input
                                    type="tel"
                                    placeholder="e.g. +94771234567 or 0771234567"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={customPhone}
                                    onChange={(e) => setCustomPhone(e.target.value)}
                                    disabled={sendSmsMutation.isPending}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SMS Message Preview (Standard Template) */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                            <MessageSquare size={14} className="text-gray-500" />
                            SMS Message Preview
                        </label>
                        <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded">
                            Standard Template
                        </span>
                    </div>

                    <div className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-lg text-xs leading-relaxed text-slate-800 font-medium select-text break-words">
                        {smsMessage}
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span>GSM SMS standard (160 chars / page)</span>
                        <span>{smsMessage.length} characters • approx {Math.max(1, Math.ceil(smsMessage.length / 160))} SMS</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                <Button variant="outline" onClick={onClose} disabled={sendSmsMutation.isPending}>Cancel</Button>
                <Button variant="primary" onClick={handleSend} loading={sendSmsMutation.isPending} disabled={!finalRecipientPhone?.trim() || !smsMessage?.trim()}>
                    <Mail size={16} className="mr-1.5" /> Confirm & Send SMS
                </Button>
            </div>
        </Modal>
    );
}
