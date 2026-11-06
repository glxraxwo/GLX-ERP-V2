import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useSettings } from '../features/settings/useSettings';
import { 
    Send, Phone, User, MessageSquare, AlertCircle, Sparkles, 
    CheckCircle2, Plus, ShieldCheck, UserCheck, X
} from 'lucide-react';

export default function ShareDocumentSmsModal({
    isOpen,
    onClose,
    documentId,
    documentType = 'quotation',
    defaultPhone = '',
    document = null,
    isPostAction = false,
    actionTitle = '',
    initialCustomMessage = ''
}) {
    const [fetchedDoc, setFetchedDoc] = useState(null);
    const [recipientMode, setRecipientMode] = useState('saved'); // 'saved' | 'custom'
    const [selectedPhone, setSelectedPhone] = useState(defaultPhone);
    const [customPhone, setCustomPhone] = useState('');
    const [saveToCustomer, setSaveToCustomer] = useState(true);

    // Multi-recipient selection (Customer, Manager, or Both)
    const [sendToCustomer, setSendToCustomer] = useState(true);
    const [sendToManager, setSendToManager] = useState(false);
    const [managerPhoneInput, setManagerPhoneInput] = useState('');

    const [customMessage, setCustomMessage] = useState('');
    const [isCustomized, setIsCustomized] = useState(false);
    const [sending, setSending] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);

    const { data: settingsData } = useSettings();
    const settings = settingsData?.data || {};
    const defaultManagerPhone = settings.managerSmsPhone || '+94716666888';

    // Fetch document if not provided directly or if missing token
    useEffect(() => {
        if (!isOpen) return;

        if (document && document.publicToken) {
            setFetchedDoc(document);
        } else if (documentId || document?._id) {
            const actualId = documentId || document?._id;
            setLoadingDoc(true);
            const endpoint = documentType === 'invoice' ? `/invoices/${actualId}` : `/crm/quotations/${actualId}`;
            api.get(endpoint)
                .then(res => {
                    const data = res.data?.data || res.data;
                    setFetchedDoc(data);
                })
                .catch(() => {
                    if (document) setFetchedDoc(document);
                })
                .finally(() => {
                    setLoadingDoc(false);
                });
        }
    }, [isOpen, documentId, documentType, document]);

    const activeDoc = fetchedDoc || document;

    // Extract customer and phone numbers
    const clientName = useMemo(() => {
        if (!activeDoc) return 'Valued Customer';
        return activeDoc.customerName ||
            activeDoc.customerId?.displayName ||
            activeDoc.customerId?.companyName ||
            activeDoc.vehicleOwner ||
            'Valued Customer';
    }, [activeDoc]);

    const availablePhones = useMemo(() => {
        const phones = [];
        const seen = new Set();

        const addPhone = (label, number) => {
            if (!number || typeof number !== 'string') return;
            const cleaned = number.trim();
            if (cleaned && cleaned !== 'N/A' && !seen.has(cleaned)) {
                seen.add(cleaned);
                phones.push({ label, number: cleaned });
            }
        };

        if (defaultPhone) addPhone('Provided Contact', defaultPhone);
        if (activeDoc?.customerPhone) addPhone('Customer Phone', activeDoc.customerPhone);
        if (activeDoc?.whatsappNum) addPhone('WhatsApp Number', activeDoc.whatsappNum);
        if (activeDoc?.customerId?.primaryContact?.phone) addPhone('Primary Contact', activeDoc.customerId.primaryContact.phone);
        if (activeDoc?.customerId?.primaryContact?.mobile) addPhone('Mobile Contact', activeDoc.customerId.primaryContact.mobile);
        if (activeDoc?.customerId?.phone) addPhone('Office Phone', activeDoc.customerId.phone);
        if (activeDoc?.customerSnapshot?.contactName && /^[0-9+ ]{7,15}$/.test(activeDoc.customerSnapshot.contactName.trim())) {
            addPhone('Contact Person Number', activeDoc.customerSnapshot.contactName.trim());
        }
        if (activeDoc?.phone) addPhone('Saved Phone', activeDoc.phone);

        return phones;
    }, [activeDoc, defaultPhone]);

    const docCode = useMemo(() => {
        if (!activeDoc) return documentId?.slice(-6) || 'Document';
        return activeDoc.quoteNumber || activeDoc.quotationCode || activeDoc.invoiceNumber || activeDoc._id?.toString()?.slice(-6) || 'Document';
    }, [activeDoc, documentId]);

    const docTypeTitle = useMemo(() => {
        if (documentType === 'estimate') return 'Estimate';
        if (documentType === 'invoice') return 'Invoice';
        return 'Quotation';
    }, [documentType]);

    // Live public document URL
    const publicLink = useMemo(() => {
        const origin = window.location.origin;
        const token = activeDoc?.publicToken || '[link]';
        return activeDoc?.publicToken ? `${origin}/public/documents/${token}` : `${origin}/public/documents/...`;
    }, [activeDoc]);

    // Build default SMS template message
    const defaultMessage = useMemo(() => {
        return `Dear ${clientName}, here is the link to view your GLX Industries ${docTypeTitle} (${docCode}): ${publicLink}`;
    }, [clientName, docTypeTitle, docCode, publicLink]);

    // Reset / initialize state on open
    useEffect(() => {
        if (isOpen) {
            setCustomPhone('');
            setSaveToCustomer(true);
            setSendToCustomer(true);
            setSendToManager(false);
            setManagerPhoneInput(defaultManagerPhone);

            if (initialCustomMessage && initialCustomMessage.trim()) {
                let msg = initialCustomMessage.trim();
                if (!msg.includes('/public/documents/') && publicLink && !publicLink.includes('...')) {
                    msg = `${msg} ${publicLink}`;
                }
                setCustomMessage(msg);
                setIsCustomized(true);
            } else {
                setIsCustomized(false);
                setCustomMessage(defaultMessage);
            }

            if (defaultPhone) {
                setRecipientMode('saved');
                setSelectedPhone(defaultPhone);
            } else if (availablePhones.length > 0) {
                setRecipientMode('saved');
                setSelectedPhone(availablePhones[0].number);
            } else {
                setRecipientMode('custom');
            }
        }
    }, [isOpen, availablePhones, defaultPhone, initialCustomMessage, defaultMessage, publicLink, defaultManagerPhone]);

    // Keep message in sync with template if user hasn't typed a custom one
    useEffect(() => {
        if (!isCustomized && !initialCustomMessage) {
            setCustomMessage(defaultMessage);
        }
    }, [defaultMessage, isCustomized, initialCustomMessage]);

    const finalCustomerPhone = recipientMode === 'saved' ? selectedPhone : customPhone;

    const handleSend = async (e) => {
        if (e) e.preventDefault();

        if (!sendToCustomer && !sendToManager) {
            toast.error('Please select at least one recipient (Customer or Manager), or click Skip if you do not want to send.');
            return;
        }

        const trimmedCustomerPhone = (finalCustomerPhone || '').trim();
        const trimmedManagerPhone = (managerPhoneInput || '').trim();
        const trimmedMsg = (customMessage || '').trim();

        if (sendToCustomer && !trimmedCustomerPhone) {
            toast.error('Please select or enter a valid customer phone number');
            return;
        }

        if (sendToManager && !trimmedManagerPhone) {
            toast.error('Please enter a valid manager phone number');
            return;
        }

        if (!trimmedMsg) {
            toast.error('SMS message content cannot be empty');
            return;
        }

        setSending(true);
        try {
            const actualDocId = documentId || activeDoc?._id;
            const res = await api.post(`/documents/${actualDocId}/share-sms`, {
                sendToCustomer,
                customerPhone: trimmedCustomerPhone,
                phone: trimmedCustomerPhone,
                sendToManager,
                managerPhone: trimmedManagerPhone,
                documentType,
                customMessage: trimmedMsg,
                saveToCustomer: recipientMode === 'custom' && saveToCustomer
            });

            if (res.data && res.data.success) {
                toast.success(res.data.message || 'SMS dispatched successfully!');
                onClose(true); // pass true indicating SMS was handled
            } else {
                toast.error(res.data?.message || 'Failed to dispatch SMS');
            }
        } catch (err) {
            toast.error('SMS sending failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSending(false);
        }
    };

    const modalTitle = isPostAction 
        ? `${actionTitle || `${docTypeTitle} Saved`} — Select Recipients & Send SMS`
        : `Send ${docTypeTitle} via SMS`;

    // Dynamic submit button label based on recipient selection
    const getSubmitButtonLabel = () => {
        if (!sendToCustomer && !sendToManager) {
            return 'Select Recipient or Skip';
        }
        if (sendToCustomer && sendToManager) {
            return 'Confirm & Send to Both (Customer & Manager) / දෙදෙනාටම යවන්න';
        }
        if (sendToCustomer) {
            return `Confirm & Send to Customer (${finalCustomerPhone || 'Selected'}) / පාරිභෝගිකයාට`;
        }
        if (sendToManager) {
            return `Confirm & Send to Manager (${managerPhoneInput || 'Manager'}) / කළමනාකරුට`;
        }
        return 'Confirm & Send SMS';
    };

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(false)} title={modalTitle} size="lg">
            <form onSubmit={handleSend} className="p-4 sm:p-5 space-y-4 font-calibri">
                {/* 1. Post Action / Status Notification Banner */}
                {isPostAction ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl p-3 text-xs flex items-start gap-2.5 shadow-2xs">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <strong className="font-bold text-sm text-emerald-950">
                                    {docTypeTitle} {docCode} successfully saved!
                                </strong>
                                <span className="bg-emerald-200/70 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px]">
                                    SMS Prompt
                                </span>
                            </div>
                            <p className="text-emerald-800 mt-0.5">
                                You can choose to send this SMS to the <strong>Customer</strong>, to the <strong>Manager</strong>, to <strong>Both</strong>, or click <strong>Skip</strong> to close without sending.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs flex items-start gap-2.5 shadow-2xs">
                        <AlertCircle size={17} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-semibold">SMS Recipient Selection</strong>
                            Choose whether to send this document link to the Customer, to the Manager, or to Both. You can also skip sending completely.
                        </div>
                    </div>
                )}

                {/* 2. RECIPIENT SELECTION BOXES (Customer & Manager) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <UserCheck size={15} className="text-blue-600" />
                            1. Select Recipients / පණිවිඩය ලැබිය යුතු පාර්ශව තෝරන්න:
                        </label>
                        <span className="text-[11px] text-slate-500 font-medium">
                            Choose Customer, Manager, or Both
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {/* Option A: Customer Box */}
                        <div className={`border rounded-xl p-3.5 transition ${
                            sendToCustomer 
                                ? 'bg-blue-50/40 border-blue-300 shadow-2xs ring-1 ring-blue-300' 
                                : 'bg-slate-50/70 border-slate-200 opacity-70'
                        }`}>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={sendToCustomer}
                                        onChange={(e) => setSendToCustomer(e.target.checked)}
                                        disabled={sending}
                                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                                        <User size={14} className="text-blue-600" />
                                        Send to Customer (පාරිභෝගිකයාට යවන්න)
                                    </span>
                                </label>
                                <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                                    {clientName}
                                </span>
                            </div>

                            {sendToCustomer && (
                                <div className="mt-3 pt-3 border-t border-blue-200/60 space-y-2.5 animate-in fade-in duration-150">
                                    {availablePhones.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                                Saved Customer Numbers ({availablePhones.length}):
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {availablePhones.map((p, idx) => (
                                                    <label
                                                        key={idx}
                                                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                                                            recipientMode === 'saved' && selectedPhone === p.number
                                                                ? 'border-blue-500 bg-blue-100/70 text-blue-950 font-bold shadow-2xs ring-1 ring-blue-400'
                                                                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name="customerPhoneChoice"
                                                                checked={recipientMode === 'saved' && selectedPhone === p.number}
                                                                onChange={() => {
                                                                    setRecipientMode('saved');
                                                                    setSelectedPhone(p.number);
                                                                }}
                                                                disabled={sending}
                                                                className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                                            />
                                                            <span className="truncate max-w-[120px] text-[11px]">{p.label}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                                                            {p.number}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Enter other customer number */}
                                    <div className="pt-1">
                                        <label className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                                            recipientMode === 'custom'
                                                ? 'border-blue-500 bg-blue-100/70 text-blue-950 font-bold shadow-2xs ring-1 ring-blue-400'
                                                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="customerPhoneChoice"
                                                    checked={recipientMode === 'custom'}
                                                    onChange={() => setRecipientMode('custom')}
                                                    disabled={sending}
                                                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                                />
                                                <span className="flex items-center gap-1 font-semibold text-[11px]">
                                                    <Plus size={12} className="text-blue-600 font-bold" />
                                                    Enter other / additional customer number (වෙනත් අංකයක්)
                                                </span>
                                            </div>
                                        </label>

                                        {recipientMode === 'custom' && (
                                            <div className="mt-2 p-2.5 bg-white border border-blue-200 rounded-lg space-y-1.5">
                                                <div className="relative">
                                                    <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="tel"
                                                        placeholder="e.g. 0771234567 or +94771234567"
                                                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                                                        value={customPhone}
                                                        onChange={(e) => setCustomPhone(e.target.value)}
                                                        disabled={sending}
                                                        autoFocus
                                                    />
                                                </div>
                                                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pt-0.5 select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveToCustomer}
                                                        onChange={(e) => setSaveToCustomer(e.target.checked)}
                                                        className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
                                                    />
                                                    <span>Save this phone number to customer profile</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Option B: Manager Box */}
                        <div className={`border rounded-xl p-3.5 transition ${
                            sendToManager 
                                ? 'bg-amber-50/50 border-amber-300 shadow-2xs ring-1 ring-amber-300' 
                                : 'bg-slate-50/70 border-slate-200 opacity-70'
                        }`}>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={sendToManager}
                                        onChange={(e) => setSendToManager(e.target.checked)}
                                        disabled={sending}
                                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                                        <ShieldCheck size={14} className="text-amber-600" />
                                        Send to Manager (කළමනාකරුට යවන්න)
                                    </span>
                                </label>
                                <span className="text-[11px] font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                                    Company Settings
                                </span>
                            </div>

                            {sendToManager && (
                                <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-2 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase">
                                            Manager Mobile / SMS Number:
                                        </label>
                                        <span className="text-[10px] text-slate-500">
                                            (Can be updated in System Settings)
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            placeholder="e.g. 0716666888 or +94716666888"
                                            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-slate-900"
                                            value={managerPhoneInput}
                                            onChange={(e) => setManagerPhoneInput(e.target.value)}
                                            disabled={sending}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. SMS Message Preview & Editable Area */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                            <MessageSquare size={15} className="text-blue-600" />
                            2. Message Content to Send / යැවෙන පණිවිඩය (Editable):
                        </label>
                        <div className="flex items-center gap-2">
                            {isCustomized && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomized(false);
                                        setCustomMessage(defaultMessage);
                                    }}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                    <Sparkles size={11} /> Reset to Template
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Styled Phone Preview Bubble */}
                    <div className="bg-white border-2 border-blue-200/90 rounded-xl p-3 shadow-inner space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-1.5 flex-wrap gap-1">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="font-semibold text-slate-700">Dispatches to:</span>
                                {sendToCustomer && (
                                    <span className="bg-blue-100 text-blue-900 font-mono font-bold px-1.5 py-0.5 rounded text-[11px]">
                                        Customer: {finalCustomerPhone || 'Not Set'}
                                    </span>
                                )}
                                {sendToManager && (
                                    <span className="bg-amber-100 text-amber-900 font-mono font-bold px-1.5 py-0.5 rounded text-[11px]">
                                        Manager: {managerPhoneInput || 'Not Set'}
                                    </span>
                                )}
                                {!sendToCustomer && !sendToManager && (
                                    <span className="text-rose-600 font-bold text-[11px]">
                                        (None selected — SMS will NOT be sent)
                                    </span>
                                )}
                            </div>
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">
                                {isCustomized ? '✏️ Custom Edited' : 'Standard Template'}
                            </span>
                        </div>

                        <textarea
                            rows={4}
                            className="w-full p-2.5 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-900 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"
                            value={customMessage}
                            onChange={(e) => {
                                setCustomMessage(e.target.value);
                                setIsCustomized(true);
                            }}
                            placeholder="Type or edit SMS message here before dispatching..."
                            maxLength={1000}
                            disabled={sending}
                        />

                        {/* Quick Insert Helpers */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Insert Helper:</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setCustomMessage(prev => prev + ` ${clientName}`);
                                    setIsCustomized(true);
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition cursor-pointer"
                            >
                                + Client Name
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCustomMessage(prev => prev + ` (${docCode})`);
                                    setIsCustomized(true);
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition cursor-pointer"
                            >
                                + Doc Code
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!customMessage.includes(publicLink) && !publicLink.includes('...')) {
                                        setCustomMessage(prev => prev + ` ${publicLink}`);
                                        setIsCustomized(true);
                                    }
                                }}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-semibold transition cursor-pointer"
                            >
                                + Public Link
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCustomMessage(prev => prev + ' Thank you for your business!');
                                    setIsCustomized(true);
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition cursor-pointer"
                            >
                                + "Thank You"
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-500 px-1">
                        <span>GSM SMS standard (160 chars / page)</span>
                        <span className="font-mono font-bold text-slate-700">
                            {customMessage.length} characters • approx {Math.max(1, Math.ceil(customMessage.length / 160))} SMS
                        </span>
                    </div>
                </div>

                {/* 4. Action Buttons & Confirmation */}
                <div className="flex justify-between items-center gap-2 pt-3 border-t border-gray-200 flex-wrap">
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onClose(false)} 
                        disabled={sending}
                        className="text-slate-600 font-semibold cursor-pointer"
                    >
                        Skip / Cancel (අවශ්‍ය නැත)
                    </Button>

                    <Button 
                        type="submit" 
                        variant="primary" 
                        size="sm" 
                        loading={sending} 
                        disabled={(!sendToCustomer && !sendToManager) || !customMessage?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs px-4 cursor-pointer"
                    >
                        <Send size={14} className="mr-1.5" /> 
                        {getSubmitButtonLabel()}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
