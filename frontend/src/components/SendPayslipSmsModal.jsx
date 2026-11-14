import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Send, Phone, User, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';

export default function SendPayslipSmsModal({
    isOpen,
    onClose,
    payslipId,
    phoneNumbers = {},
    defaultPhone = '',
    employeeName = 'Employee'
}) {
    const [phone, setPhone] = useState('');
    const [customPhone, setCustomPhone] = useState('');
    const [useCustom, setUseCustom] = useState(false);
    const [sending, setSending] = useState(false);
    const [customMessage, setCustomMessage] = useState('');
    const [isCustomized, setIsCustomized] = useState(false);

    // Available phone numbers from employee registration
    const availablePhones = useMemo(() => {
        const list = [
            { key: 'default', label: 'Primary Contact', number: defaultPhone },
            { key: 'phone', label: 'Contact 1 (Primary)', number: phoneNumbers.phone },
            { key: 'secondaryPhone', label: 'Contact 2 (Secondary)', number: phoneNumbers.secondaryPhone },
            { key: 'tertiaryPhone', label: 'Contact 3', number: phoneNumbers.tertiaryPhone }
        ].filter(p => p.number && p.number !== 'N/A');

        // Deduplicate
        const seen = new Set();
        return list.filter(p => {
            if (seen.has(p.number)) return false;
            seen.add(p.number);
            return true;
        });
    }, [phoneNumbers, defaultPhone]);

    // Build default message preview
    const defaultTemplateMessage = useMemo(() => {
        const origin = window.location.origin;
        return `Dear ${employeeName}, your payslip is ready. View your salary details (without company name): ${origin}/payslip/share/...`;
    }, [employeeName]);

    // Auto-select first available phone and reset message when modal opens
    useEffect(() => {
        if (isOpen) {
            setUseCustom(false);
            setCustomPhone('');
            setIsCustomized(false);
            setCustomMessage(defaultTemplateMessage);

            if (availablePhones.length > 0) {
                setPhone(availablePhones[0].number);
            } else if (defaultPhone) {
                setUseCustom(true);
                setCustomPhone(defaultPhone);
            }
        }
    }, [isOpen, availablePhones, defaultPhone, defaultTemplateMessage]);

    const finalPhone = useCustom ? customPhone : phone;

    const handleShare = async (e) => {
        if (e) e.preventDefault();
        const trimmedPhone = (finalPhone || '').trim();
        const trimmedMsg = (defaultTemplateMessage || '').trim();
        
        if (!trimmedPhone) {
            toast.error('Please select or enter a valid phone number');
            return;
        }

        if (!trimmedMsg) {
            toast.error('SMS message content cannot be empty');
            return;
        }

        setSending(true);
        try {
            const res = await api.post(`/payroll/payslips/${payslipId}/send-sms`, {
                phone: trimmedPhone,
                customMessage: trimmedMsg
            });
            if (res.data && res.data.success) {
                toast.success(`Payslip link successfully dispatched to ${trimmedPhone}!`);
                onClose();
            } else {
                toast.error(res.data?.message || 'Failed to send payslip link.');
            }
        } catch (err) {
            toast.error('Sending failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Send Payslip Link via SMS" size="md">
            <form onSubmit={handleShare} className="p-5 space-y-4 font-calibri">
                {/* Permission Alert */}
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-xs flex items-start gap-2.5">
                    <AlertCircle size={17} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block font-semibold">SMS Dispatch Permission</strong>
                        Please verify the employee recipient contact and preview the message below before giving permission to send.
                    </div>
                </div>

                {/* 1. Recipient Selection */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                            <User size={14} className="text-gray-500" />
                            Recipient Employee
                        </label>
                        <span className="text-xs text-gray-900 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200">
                            {employeeName}
                        </span>
                    </div>

                    {availablePhones.length > 0 && !useCustom && (
                        <div className="space-y-1.5">
                            {availablePhones.map((phoneOption) => (
                                <label 
                                    key={phoneOption.key}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                                        phone === phoneOption.number 
                                            ? 'border-blue-500 bg-blue-50/80 font-bold text-blue-900' 
                                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="payslipPhoneSelect"
                                            value={phoneOption.number}
                                            checked={phone === phoneOption.number}
                                            onChange={(e) => setPhone(e.target.value)}
                                            disabled={sending}
                                            className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                        />
                                        <span>{phoneOption.label}</span>
                                    </div>
                                    <span className="font-mono text-gray-600">{phoneOption.number}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                checked={useCustom}
                                onChange={(e) => setUseCustom(e.target.checked)}
                                disabled={sending}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span>Enter custom phone number</span>
                        </label>
                        
                        {useCustom && (
                            <div className="mt-2">
                                <input 
                                    type="tel" 
                                    required={useCustom}
                                    placeholder="e.g. +94771234567 or 0771234567"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={customPhone}
                                    onChange={e => setCustomPhone(e.target.value)}
                                    disabled={sending}
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
                        {defaultTemplateMessage}
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span>GSM SMS standard (160 chars / page)</span>
                        <span>{defaultTemplateMessage.length} characters • approx {Math.max(1, Math.ceil(defaultTemplateMessage.length / 160))} SMS</span>
                    </div>
                </div>

                {/* 3. Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={sending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" loading={sending} disabled={!finalPhone?.trim() || !defaultTemplateMessage?.trim()}>
                        <Send size={14} className="mr-1.5" /> Confirm & Send SMS
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
