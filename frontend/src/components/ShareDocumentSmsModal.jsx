import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Send, Phone, User, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';

export default function ShareDocumentSmsModal({
    isOpen,
    onClose,
    documentId,
    documentType = 'quotation',
    defaultPhone = '',
    document = null
}) {
    const [fetchedDoc, setFetchedDoc] = useState(null);
    const [recipientMode, setRecipientMode] = useState('saved'); // 'saved' | 'custom'
    const [selectedPhone, setSelectedPhone] = useState(defaultPhone);
    const [customPhone, setCustomPhone] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [isCustomized, setIsCustomized] = useState(false);
    const [sending, setSending] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);

    // Fetch document if not provided directly
    useEffect(() => {
        if (!isOpen) return;

        if (document) {
            setFetchedDoc(document);
        } else if (documentId) {
            setLoadingDoc(true);
            const endpoint = documentType === 'invoice' ? `/invoices/${documentId}` : `/crm/quotations/${documentId}`;
            api.get(endpoint)
                .then(res => {
                    const data = res.data?.data || res.data;
                    setFetchedDoc(data);
                })
                .catch(() => {
                    // Fallback to basic info
                })
                .finally(() => {
                    setLoadingDoc(false);
                });
        }
    }, [isOpen, documentId, documentType, document]);

    const activeDoc = document || fetchedDoc;

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
            if (number && number !== 'N/A' && !seen.has(number.trim())) {
                seen.add(number.trim());
                phones.push({ label, number: number.trim() });
            }
        };

        if (defaultPhone) addPhone('Provided Contact', defaultPhone);
        if (activeDoc?.customerPhone) addPhone('Customer Phone', activeDoc.customerPhone);
        if (activeDoc?.customerId?.primaryContact?.phone) addPhone('Primary Contact', activeDoc.customerId.primaryContact.phone);
        if (activeDoc?.customerId?.primaryContact?.mobile) addPhone('Mobile Contact', activeDoc.customerId.primaryContact.mobile);
        if (activeDoc?.customerId?.phone) addPhone('Office Phone', activeDoc.customerId.phone);

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

    // Build default SMS template message
    const defaultMessage = useMemo(() => {
        const origin = window.location.origin;
        const token = activeDoc?.publicToken || '[link]';
        const link = activeDoc?.publicToken ? `${origin}/public/documents/${token}` : `${origin}/public/documents/...`;
        return `Dear ${clientName}, here is the link to view your GLX Industries ${docTypeTitle} (${docCode}): ${link}`;
    }, [clientName, docTypeTitle, docCode, activeDoc]);

    // Reset / initialize state on open
    useEffect(() => {
        if (isOpen) {
            setIsCustomized(false);
            setCustomPhone('');
            if (availablePhones.length > 0) {
                setRecipientMode('saved');
                setSelectedPhone(availablePhones[0].number);
            } else if (defaultPhone) {
                setRecipientMode('custom');
                setCustomPhone(defaultPhone);
            } else {
                setRecipientMode('custom');
            }
        }
    }, [isOpen, availablePhones, defaultPhone]);

    // Keep message in sync with template if not customized
    useEffect(() => {
        if (!isCustomized) {
            setCustomMessage(defaultMessage);
        }
    }, [defaultMessage, isCustomized]);

    const finalPhone = recipientMode === 'saved' ? selectedPhone : customPhone;

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const trimmedPhone = (finalPhone || '').trim();
        const trimmedMsg = (customMessage || '').trim();

        if (!trimmedPhone) {
            toast.error('Please select or enter a recipient phone number');
            return;
        }

        if (!trimmedMsg) {
            toast.error('SMS message content cannot be empty');
            return;
        }

        setSending(true);
        try {
            const res = await api.post(`/documents/${documentId}/share-sms`, {
                phone: trimmedPhone,
                documentType,
                customMessage: trimmedMsg
            });

            if (res.data && res.data.success) {
                toast.success(`SMS dispatched successfully to ${trimmedPhone}!`);
                onClose();
            } else {
                toast.error(res.data?.message || 'Failed to dispatch SMS');
            }
        } catch (err) {
            toast.error('SMS sending failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send ${docTypeTitle} via SMS`} size="md">
            <form onSubmit={handleSend} className="p-5 space-y-4 font-calibri">
                {/* Permission & Review Alert */}
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-xs flex items-start gap-2.5">
                    <AlertCircle size={17} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block font-semibold">SMS Permission Required</strong>
                        Please review the recipient and SMS message preview below. The SMS will only be dispatched upon your confirmation.
                    </div>
                </div>

                {/* 1. Recipient Person Selection */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                            <User size={14} className="text-gray-500" />
                            Recipient Person / Contact
                        </label>
                        <span className="text-xs text-gray-600 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                            {clientName}
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
                                            name="recipientPhoneChoice"
                                            checked={recipientMode === 'saved' && selectedPhone === p.number}
                                            onChange={() => {
                                                setRecipientMode('saved');
                                                setSelectedPhone(p.number);
                                            }}
                                            disabled={sending}
                                            className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
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
                                name="recipientPhoneChoice"
                                checked={recipientMode === 'custom'}
                                onChange={() => setRecipientMode('custom')}
                                disabled={sending}
                                className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <span>Enter custom recipient phone number</span>
                        </label>
                        {recipientMode === 'custom' && (
                            <div className="mt-2">
                                <input
                                    type="tel"
                                    required={recipientMode === 'custom'}
                                    placeholder="e.g. +94771234567 or 0771234567"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={customPhone}
                                    onChange={(e) => setCustomPhone(e.target.value)}
                                    disabled={sending}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SMS Message Preview & Editable Area */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                            <MessageSquare size={14} className="text-gray-500" />
                            SMS Message Preview (Editable)
                        </label>
                        {isCustomized && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomized(false);
                                    setCustomMessage(defaultMessage);
                                }}
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <Sparkles size={11} /> Reset to template
                            </button>
                        )}
                    </div>

                    <textarea
                        rows={4}
                        className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-lg text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        value={customMessage}
                        onChange={(e) => {
                            setCustomMessage(e.target.value);
                            setIsCustomized(true);
                        }}
                        placeholder="Type SMS message..."
                        maxLength={1000}
                        disabled={sending}
                    />

                    <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span>{isCustomized ? '✍️ Custom message' : '✨ Standard template'}</span>
                        <span>
                            {customMessage.length} characters • approx {Math.max(1, Math.ceil(customMessage.length / 160))} SMS
                        </span>
                    </div>
                </div>

                {/* 3. Action Buttons & Confirmation */}
                <div className="flex justify-end items-center gap-2 pt-3 border-t border-gray-200">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={sending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" loading={sending} disabled={!finalPhone?.trim() || !customMessage?.trim()}>
                        <Send size={14} className="mr-1.5" /> Confirm & Send SMS
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
