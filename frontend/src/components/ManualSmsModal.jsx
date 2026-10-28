import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';
import {
    Mail, Send, Sparkles, User, Phone, Check, Search, Plus, Trash2,
    Edit2, RefreshCw, X, FileText, ChevronDown, BookOpen, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

export default function ManualSmsModal({
    isOpen,
    onClose,
    initialCustomer = null,
    onSuccess = null
}) {
    // Recipient state
    const [recipientMode, setRecipientMode] = useState('customer'); // 'customer' | 'custom'
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerList, setCustomerList] = useState([]);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    // Form inputs
    const [contact, setContact] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Templates state
    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
    const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateCategory, setNewTemplateCategory] = useState('general');
    const [editingTemplate, setEditingTemplate] = useState(null);

    const dropdownRef = useRef(null);

    // Load templates
    const fetchTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
            const res = await api.get('/sms/templates');
            if (res.data?.success) {
                setTemplates(res.data.data || []);
            }
        } catch {
            // Fallback: templates endpoint might not have seeded or offline
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    // Load customer search results
    const searchCustomers = async (query = '') => {
        setIsSearchingCustomers(true);
        try {
            const res = await api.get('/customers', {
                params: { search: query, limit: 25 }
            });
            const list = res.data?.data || [];
            setCustomerList(list);
        } catch {
            setCustomerList([]);
        } finally {
            setIsSearchingCustomers(false);
        }
    };

    // Initialize or reset when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            searchCustomers('');

            if (initialCustomer) {
                setRecipientMode('customer');
                setSelectedCustomer(initialCustomer);
                const name = initialCustomer.displayName || initialCustomer.name || initialCustomer.companyName || '';
                const phone = initialCustomer.primaryContact?.phone || initialCustomer.phone || initialCustomer.whatsappNumber || '';
                setRecipientName(name);
                setContact(phone);
                setCustomerSearch(name);
            } else {
                setRecipientMode('customer');
                setSelectedCustomer(null);
                setRecipientName('');
                setContact('');
                setCustomerSearch('');
            }
            setMessage('');
            setSelectedTemplateId('');
        }
    }, [isOpen, initialCustomer]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsCustomerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle customer selection
    const handleSelectCustomer = (cust) => {
        setSelectedCustomer(cust);
        const name = cust.displayName || cust.name || cust.companyName || '';
        const phone = cust.primaryContact?.phone || cust.phone || cust.whatsappNumber || '';
        setRecipientName(name);
        setContact(phone);
        setCustomerSearch(name);
        setIsCustomerDropdownOpen(false);

        // If template already selected with placeholder, update customer_name
        if (selectedTemplateId) {
            const t = templates.find(item => item._id === selectedTemplateId);
            if (t) {
                applyTemplate(t, name);
            }
        }
    };

    // Apply template content
    const applyTemplate = (tmpl, custName = recipientName) => {
        setSelectedTemplateId(tmpl._id);
        const nameToUse = custName?.trim() || 'Customer';
        const formatted = tmpl.content.replace(/\{customer_name\}/g, nameToUse);
        setMessage(formatted);
    };

    // SMS Segment Calculator (GSM 160 chars per segment)
    const smsStats = useMemo(() => {
        const len = message.length;
        if (len === 0) return { chars: 0, segments: 0 };
        const segments = len <= 160 ? 1 : Math.ceil(len / 153);
        return { chars: len, segments };
    }, [message]);

    // Send SMS Handler
    const handleSendSms = async (e) => {
        if (e) e.preventDefault();
        const cleanContact = contact.trim();
        const cleanMsg = message.trim();

        if (!cleanContact) {
            toast.error('Recipient mobile number is required');
            return;
        }

        if (!cleanMsg) {
            toast.error('Message content cannot be empty');
            return;
        }

        setSending(true);
        try {
            const res = await api.post('/sms/send-manual', {
                contact: cleanContact,
                recipientName: recipientName.trim() || undefined,
                message: cleanMsg
            });

            if (res.data?.success) {
                toast.success(`SMS dispatched successfully to ${cleanContact}!`, {
                    icon: '🚀',
                    duration: 4000
                });
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Failed to dispatch SMS through gateway';
            toast.error(errMsg);
        } finally {
            setSending(false);
        }
    };

    // Save as new template
    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        if (!newTemplateTitle.trim()) {
            toast.error('Template title is required');
            return;
        }
        if (!message.trim()) {
            toast.error('Template message content cannot be empty');
            return;
        }

        try {
            const res = await api.post('/sms/templates', {
                title: newTemplateTitle.trim(),
                content: message.trim(),
                category: newTemplateCategory
            });
            if (res.data?.success) {
                toast.success('Template saved successfully!');
                setIsSaveAsTemplateOpen(false);
                setNewTemplateTitle('');
                fetchTemplates();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save template');
        }
    };

    // Delete template
    const handleDeleteTemplate = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        try {
            await api.delete(`/sms/templates/${id}`);
            toast.success('Template deleted');
            if (selectedTemplateId === id) setSelectedTemplateId('');
            fetchTemplates();
        } catch {
            toast.error('Failed to delete template');
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={() => {
                    if (!sending) onClose();
                }}
                title="Send Manual SMS Notification"
                size="lg"
            >
                <form onSubmit={handleSendSms} className="p-4 sm:p-6 space-y-5">
                    {/* Mode Toggle: Customer vs Custom Number */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                            Recipient Type
                        </span>
                        <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setRecipientMode('customer')}
                                className={`px-3 py-1 rounded-md transition ${
                                    recipientMode === 'customer'
                                        ? 'bg-white dark:bg-[#132238] text-primary-600 dark:text-primary-400 shadow-xs'
                                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                                }`}
                            >
                                Registered Customer
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRecipientMode('custom');
                                    setSelectedCustomer(null);
                                }}
                                className={`px-3 py-1 rounded-md transition ${
                                    recipientMode === 'custom'
                                        ? 'bg-white dark:bg-[#132238] text-primary-600 dark:text-primary-400 shadow-xs'
                                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                                }`}
                            >
                                Direct Mobile Number
                            </button>
                        </div>
                    </div>

                    {/* Customer Selection or Custom Input */}
                    {recipientMode === 'customer' ? (
                        <div className="space-y-2 relative" ref={dropdownRef}>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                                Select Customer *
                            </label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        searchCustomers(e.target.value);
                                        setIsCustomerDropdownOpen(true);
                                    }}
                                    onFocus={() => {
                                        searchCustomers(customerSearch);
                                        setIsCustomerDropdownOpen(true);
                                    }}
                                    placeholder="Search by customer name, phone, or company..."
                                    className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#132238] text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                                {customerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerSearch('');
                                            setSelectedCustomer(null);
                                            setContact('');
                                            setRecipientName('');
                                            searchCustomers('');
                                        }}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown list */}
                            {isCustomerDropdownOpen && (
                                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                                    {isSearchingCustomers ? (
                                        <div className="p-3 text-center text-xs text-gray-400">Loading customers...</div>
                                    ) : customerList.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-gray-400">No customers found</div>
                                    ) : (
                                        customerList.map((cust) => {
                                            const name = cust.displayName || cust.name || cust.companyName || 'Unknown';
                                            const phone = cust.primaryContact?.phone || cust.phone || cust.whatsappNumber || 'No phone';
                                            return (
                                                <button
                                                    key={cust._id}
                                                    type="button"
                                                    onClick={() => handleSelectCustomer(cust)}
                                                    className="w-full text-left px-3.5 py-2.5 hover:bg-primary-50 dark:hover:bg-slate-800 flex items-center justify-between transition"
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">
                                                            {name}
                                                        </div>
                                                        {cust.customerCode && (
                                                            <div className="text-[10px] text-gray-400 font-mono">
                                                                {cust.customerCode}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-[11px] font-mono font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded">
                                                            {phone}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* Phone & Recipient Name Confirmation */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                                        Mobile Number (Sri Lanka) *
                                    </label>
                                    <div className="relative">
                                        <Phone size={13} className="absolute left-3 top-2.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={contact}
                                            onChange={(e) => setContact(e.target.value)}
                                            placeholder="e.g. 0712345678 or +94712345678"
                                            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono font-bold border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">
                                        Customer / Recipient Name
                                    </label>
                                    <div className="relative">
                                        <User size={13} className="absolute left-3 top-2.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            placeholder="Recipient Name"
                                            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                    Recipient Mobile Number *
                                </label>
                                <div className="relative">
                                    <Phone size={13} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                        placeholder="e.g. 0712345678 or +94712345678"
                                        className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#132238] text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                    Recipient Name (Optional)
                                </label>
                                <div className="relative">
                                    <User size={13} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        placeholder="Name / Description"
                                        className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#132238] text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preset Common Message Templates Section */}
                    <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-amber-500" />
                                Select Common Message Template:
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsManageTemplatesOpen(true)}
                                className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 hover:underline"
                            >
                                <BookOpen size={12} />
                                Manage Templates ({templates.length})
                            </button>
                        </div>

                        {/* Template Chips / Quick selector */}
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                            {templates.map((tmpl) => (
                                <button
                                    key={tmpl._id}
                                    type="button"
                                    onClick={() => applyTemplate(tmpl)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-1.5 ${
                                        selectedTemplateId === tmpl._id
                                            ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                                            : 'bg-white dark:bg-[#132238] text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>{tmpl.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Box */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                                Message Text Content *
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSaveAsTemplateOpen(true)}
                                    disabled={!message.trim()}
                                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-40 flex items-center gap-1"
                                    title="Save this message as a preset template"
                                >
                                    <Plus size={12} />
                                    Save as Template
                                </button>
                                {message && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMessage('');
                                            setSelectedTemplateId('');
                                        }}
                                        className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <textarea
                            rows={4}
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                if (selectedTemplateId) setSelectedTemplateId('');
                            }}
                            placeholder="Type your custom SMS message here or select a template above..."
                            required
                            maxLength={1500}
                            disabled={sending}
                            className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-[#132238] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none leading-relaxed"
                        />

                        {/* Character & Segment Indicator */}
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                                Characters: <strong className="text-gray-800 dark:text-slate-200">{smsStats.chars}</strong> / 1500
                            </span>
                            <span className="font-mono">
                                Standard SMS: <strong className="text-primary-600 dark:text-primary-400">{smsStats.segments}</strong> {smsStats.segments === 1 ? 'part' : 'parts'}
                            </span>
                        </div>
                    </div>

                    {/* Modal Footer Controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={sending}
                            className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>

                        <Button
                            type="submit"
                            variant="primary"
                            loading={sending}
                            disabled={sending || !contact.trim() || !message.trim()}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md px-5 py-2.5 rounded-xl flex items-center gap-2"
                        >
                            <Send size={13} />
                            Send SMS Immediately
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Sub-Modal: Save as Template */}
            <Modal
                isOpen={isSaveAsTemplateOpen}
                onClose={() => setIsSaveAsTemplateOpen(false)}
                title="Save Message as Preset Template"
                size="sm"
            >
                <form onSubmit={handleSaveTemplate} className="p-5 space-y-4">
                    <Input
                        label="Template Title / Name *"
                        placeholder="e.g. Work Completed Notification"
                        value={newTemplateTitle}
                        onChange={(e) => setNewTemplateTitle(e.target.value)}
                        required
                    />

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                            Category
                        </label>
                        <select
                            value={newTemplateCategory}
                            onChange={(e) => setNewTemplateCategory(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#132238] text-gray-900 dark:text-white"
                        >
                            <option value="general">General Notification</option>
                            <option value="delivery">Vehicle / Work Delivery</option>
                            <option value="billing">Payment / Balance Reminder</option>
                            <option value="followup">Quotation / Follow-Up</option>
                        </select>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 max-h-24 overflow-y-auto font-mono text-[11px]">
                        {message}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" type="button" onClick={() => setIsSaveAsTemplateOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" size="sm" type="submit">
                            Save Template
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Sub-Modal: Manage Templates */}
            <Modal
                isOpen={isManageTemplatesOpen}
                onClose={() => setIsManageTemplatesOpen(false)}
                title="Manage Common Message Templates"
                size="md"
            >
                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            Available Preset Templates ({templates.length})
                        </span>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                                setNewTemplateTitle('');
                                setIsSaveAsTemplateOpen(true);
                            }}
                            className="text-xs"
                        >
                            <Plus size={13} className="mr-1" /> New Template
                        </Button>
                    </div>

                    <div className="space-y-2.5">
                        {templates.map((tmpl) => (
                            <div
                                key={tmpl._id}
                                className="p-3 bg-white dark:bg-[#132238] border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xs space-y-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                            {tmpl.title}
                                        </h4>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                            {tmpl.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                applyTemplate(tmpl);
                                                setIsManageTemplatesOpen(false);
                                            }}
                                            className="px-2 py-0.5 text-[11px] font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 rounded transition"
                                        >
                                            Use
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTemplate(tmpl._id)}
                                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-slate-800 rounded transition"
                                            title="Delete template"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-slate-300 font-sans leading-relaxed">
                                    {tmpl.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </>
    );
}
