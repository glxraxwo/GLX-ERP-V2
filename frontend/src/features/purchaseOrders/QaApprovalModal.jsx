import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, AlertCircle, Phone, User, MessageSquare, Sparkles } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useApproveGrnQA } from './usePurchaseOrders';

export default function QaApprovalModal({ isOpen, onClose, grn, supplier = null }) {
    const approveMutation = useApproveGrnQA();
    const [items, setItems] = useState([]);
    const [paidAmountLKR, setPaidAmountLKR] = useState('0');
    const [sendSms, setSendSms] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [isCustomized, setIsCustomized] = useState(false);
    const [recipientMode, setRecipientMode] = useState('saved'); // 'saved' | 'custom'
    const [selectedPhone, setSelectedPhone] = useState('');
    const [customPhone, setCustomPhone] = useState('');

    // Available phone numbers from supplier
    const supplierContact = supplier?.primaryContact || grn?.supplierId?.primaryContact;
    const availablePhones = [
        { label: 'Primary Contact', number: supplierContact?.phone || grn?.supplierPhone },
        { label: 'Mobile Contact', number: supplierContact?.mobile }
    ].filter(p => p.number && p.number !== 'N/A');

    const supplierName = grn?.supplierName || supplier?.displayName || supplier?.companyName || 'Supplier';

    useEffect(() => {
        if (!isOpen) {
            setSendSms(false);
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
            
            // Generate product list from current items state
            const productsList = items.map(item => {
                const qty = Number(item.acceptedQuantity) || 0;
                const uom = item.unitOfMeasure || 'kg';
                return `${item.productName} (${qty} ${uom})`;
            }).join(', ');

            const totalPayable = items.reduce((sum, item) => sum + (Number(item.acceptedQuantity || 0) * (item.unitPrice || 0)), 0);
            const formattedTotal = totalPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 });

            const message = `Dear ${supplierName}, your delivery on ${formattedDate} for ${productsList} has been accepted and QA approved. Total accepted value: Rs. ${formattedTotal}. Thank you.`;
            setSmsMessage(message);
        }
    }, [isOpen, grn, items, isCustomized, supplierName]);

    useEffect(() => {
        if (isOpen && grn) {
            const grnItems = (grn.items || []).map((item) => ({
                _id: item._id,
                productId: item.productId?._id || item.productId,
                productName: item.productName,
                productCode: item.productCode,
                receivedQuantity: item.receivedQuantity,
                acceptedQuantity: item.receivedQuantity, // default to all accepted
                rejectedQuantity: 0,
                unitPrice: item.unitPrice || 0,
                batchNumber: item.batchNumber || '',
                rejectionReason: '',
                unitOfMeasure: item.unitOfMeasure || 'kg'
            }));
            setItems(grnItems);
            setPaidAmountLKR('0');
        }
    }, [isOpen, grn]);

    const updateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };

        if (field === 'rejectedQuantity') {
            const received = Number(newItems[idx].receivedQuantity) || 0;
            const rejected = Number(value) || 0;
            newItems[idx].acceptedQuantity = Math.max(0, received - rejected);
        } else if (field === 'acceptedQuantity') {
            const received = Number(newItems[idx].receivedQuantity) || 0;
            const accepted = Number(value) || 0;
            newItems[idx].rejectedQuantity = Math.max(0, received - accepted);
        }
        setItems(newItems);
    };

    const finalRecipientPhone = recipientMode === 'saved' ? selectedPhone : customPhone;

    const handleApprove = async () => {
        if (sendSms) {
            if (!finalRecipientPhone?.trim()) {
                toast.error('Please select or enter the supplier recipient phone number');
                return;
            }
            if (!smsMessage?.trim()) {
                toast.error('SMS message content cannot be empty');
                return;
            }
        }

        try {
            const payload = {
                paidAmountLKR: Number(paidAmountLKR || 0),
                items: items.map(i => ({
                    _id: i._id,
                    acceptedQuantity: Number(i.acceptedQuantity || 0),
                    rejectedQuantity: Number(i.rejectedQuantity || 0),
                    batchNumber: i.batchNumber || undefined,
                    rejectionReason: i.rejectionReason || undefined
                })),
                sendSms: sendSms,
                customMessage: sendSms ? smsMessage : undefined,
                recipientPhone: sendSms ? finalRecipientPhone : undefined
            };
            await approveMutation.mutateAsync({ id: grn._id, data: payload });
            toast.success('Supplies QA Approved successfully. Stock and Ledger updated.');
            onClose();
        } catch (err) {
            // Handled by mutation
        }
    };

    const calculateTotalPayable = () => {
        return items.reduce((sum, item) => sum + (Number(item.acceptedQuantity || 0) * (item.unitPrice || 0)), 0);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`QA Inspection & Approval — GRN ${grn?.grnNumber}`} size="lg">
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-calibri">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-3 text-emerald-950">
                    <ShieldCheck size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        Confirming QA approval will update active stock levels, increment PO received stats, update Supplier Accounts Payable balance, and generate batch codes.
                    </div>
                </div>

                {/* Items QA section */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800 text-sm">Inspected Items</h3>
                    {items.map((item, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/50">
                            <div className="flex justify-between items-center text-sm">
                                <div>
                                    <span className="font-semibold text-gray-900">{item.productName}</span>
                                    <span className="text-gray-500 font-mono text-xs ml-2">({item.productCode})</span>
                                </div>
                                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700">
                                    Received: {item.receivedQuantity} {item.unitOfMeasure}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <Input
                                    label="Accepted Qty"
                                    type="number"
                                    min="0"
                                    max={item.receivedQuantity}
                                    value={item.acceptedQuantity}
                                    onChange={(e) => updateItem(idx, 'acceptedQuantity', e.target.value)}
                                />
                                <Input
                                    label="Rejected Qty"
                                    type="number"
                                    min="0"
                                    max={item.receivedQuantity}
                                    value={item.rejectedQuantity}
                                    onChange={(e) => updateItem(idx, 'rejectedQuantity', e.target.value)}
                                />
                                <Input
                                    label="Batch / Julian Code"
                                    placeholder="Leave blank for auto"
                                    value={item.batchNumber}
                                    onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)}
                                />
                                <div className="flex flex-col justify-end">
                                    <span className="text-xs text-gray-500 mb-1">Subtotal (LKR)</span>
                                    <span className="font-semibold text-gray-800 py-2">
                                        {(item.acceptedQuantity * item.unitPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {Number(item.rejectedQuantity) > 0 && (
                                <Input
                                    label="Rejection Reason"
                                    placeholder="State reason for defect/spoilage..."
                                    value={item.rejectionReason}
                                    onChange={(e) => updateItem(idx, 'rejectionReason', e.target.value)}
                                    className="bg-red-50/50 border-red-200 text-red-950"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-100 p-4 rounded-xl space-y-2 border border-slate-200">
                    <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                        <span>Total Accepted Value:</span>
                        <span>Rs. {calculateTotalPayable().toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Instant Cash/Bank Paid Amount Input */}
                <div className="border border-indigo-100 bg-indigo-50/40 p-4 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        Initial Advance / Cash Paid Now (LKR)
                    </label>
                    <p className="text-xs text-indigo-700">
                        If an immediate payment is made to the supplier upon delivery, enter the amount here. The remainder will stay in Accounts Payable.
                    </p>
                    <Input
                        type="number"
                        placeholder="e.g. 50000"
                        value={paidAmountLKR}
                        onChange={(e) => setPaidAmountLKR(e.target.value)}
                    />
                </div>

                {/* SMS Section with Recipient Selector & Preview */}
                <div className="border-t pt-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                            checked={sendSms}
                            onChange={(e) => setSendSms(e.target.checked)}
                        />
                        <div>
                            <span className="text-sm font-bold text-gray-800 block">Send confirmation SMS to supplier</span>
                            <span className="text-xs text-gray-500">Requires explicit permission and preview verification before sending</span>
                        </div>
                    </label>

                    {sendSms && (
                        <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2.5 text-xs flex items-center gap-2">
                                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                <span>Please verify the supplier recipient person and message content before approving.</span>
                            </div>

                            {/* Recipient Selection */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <label className="font-bold text-gray-700 uppercase flex items-center gap-1">
                                        <User size={13} className="text-gray-500" /> Recipient Supplier
                                    </label>
                                    <span className="font-semibold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {supplierName}
                                    </span>
                                </div>

                                {availablePhones.length > 0 && (
                                    <div className="space-y-1">
                                        {availablePhones.map((p, idx) => (
                                            <label
                                                key={idx}
                                                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${
                                                    recipientMode === 'saved' && selectedPhone === p.number
                                                        ? 'border-blue-500 bg-blue-50/80 font-bold text-blue-900'
                                                        : 'border-gray-200 bg-white text-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="supplierPhoneChoice"
                                                        checked={recipientMode === 'saved' && selectedPhone === p.number}
                                                        onChange={() => {
                                                            setRecipientMode('saved');
                                                            setSelectedPhone(p.number);
                                                        }}
                                                        className="text-blue-600"
                                                    />
                                                    <span>{p.label}</span>
                                                </div>
                                                <span className="font-mono text-gray-600">{p.number}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer pt-1">
                                        <input
                                            type="radio"
                                            name="supplierPhoneChoice"
                                            checked={recipientMode === 'custom'}
                                            onChange={() => setRecipientMode('custom')}
                                            className="text-blue-600"
                                        />
                                        <span>Enter custom recipient phone number</span>
                                    </label>
                                    {recipientMode === 'custom' && (
                                        <input
                                            type="tel"
                                            placeholder="e.g. +94771234567 or 0771234567"
                                            className="w-full mt-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={customPhone}
                                            onChange={(e) => setCustomPhone(e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* SMS Message Preview */}
                            <div className="space-y-1 pt-1">
                                <label className="text-xs font-semibold text-gray-700 block flex items-center gap-1">
                                    <MessageSquare size={13} className="text-gray-500" /> SMS Message Preview (Editable)
                                </label>
                                <textarea
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
                                    rows={3}
                                    value={smsMessage}
                                    onChange={(e) => {
                                        setSmsMessage(e.target.value);
                                        setIsCustomized(true);
                                    }}
                                    placeholder="Type custom SMS message here..."
                                    maxLength={1000}
                                />
                                <div className="flex justify-between text-[10px] text-gray-500">
                                    <span>{isCustomized ? '✍️ Custom message' : '✨ Generated template'}</span>
                                    <span>{smsMessage.length} characters</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleApprove} loading={approveMutation.isPending}>
                    <ShieldCheck size={16} className="mr-1.5" /> Approve Supplies
                </Button>
            </div>
        </Modal>
    );
}
