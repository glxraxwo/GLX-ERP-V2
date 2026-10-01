import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, ArrowLeft, Save, X, Edit2, CheckCircle2, Search,
    User, Phone, Mail, MapPin, CreditCard, UserPlus, PackagePlus,
    FileText, ClipboardList, Receipt, Building, Truck, Image as ImageIcon,
    Sparkles, Calculator, Layers, ChevronDown, ChevronUp
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import { translateText, detectLanguage } from '../utils/translationService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { useCreateInvoice } from '../features/invoices/useInvoices';
import Modal from '../components/ui/Modal';
import api from '../api/axios';

const defaultItemState = {
    productId: '',
    productName: '',
    productTranslation: '',
    productCode: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRate: 18,
    taxable: true,
    unitOfMeasure: 'pcs',
};

export default function InvoiceFormPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const createMutation = useCreateInvoice();
    const [searchParams, setSearchParams] = useSearchParams();

    // Document Type: 'invoice' | 'quotation' | 'estimate'
    const initialDocType = searchParams.get('type') || 'invoice';
    const [docType, setDocType] = useState(initialDocType);

    useEffect(() => {
        const t = searchParams.get('type');
        if (t && ['invoice', 'quotation', 'estimate'].includes(t)) {
            setDocType(t);
        }
    }, [searchParams]);

    const docTypeLabel = docType === 'estimate' ? 'Estimate' : docType === 'quotation' ? 'Quotation' : 'Invoice';
    const docTypeLower = docTypeLabel.toLowerCase();

    // Invoice Customer & Item Modals state (For adding directly to this invoice)
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

    // Customer fields on invoice
    const [customerId, setCustomerId] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    // Temporary fields for Add Customer Modal
    const [custModalTab, setCustModalTab] = useState('existing'); // 'existing' | 'manual'
    const [tempCustSearch, setTempCustSearch] = useState('');
    const [tempCustName, setTempCustName] = useState('');
    const [tempCustPhone, setTempCustPhone] = useState('');
    const [tempCustEmail, setTempCustEmail] = useState('');
    const [tempCustAddress, setTempCustAddress] = useState('');
    const [modalItem, setModalItem] = useState(defaultItemState);

    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [invoiceType, setInvoiceType] = useState('standard');
    const [notes, setNotes] = useState('');
    const [paymentInstructions, setPaymentInstructions] = useState('');
    const [shippingCost, setShippingCost] = useState(0);

    // Added items list & editing state
    const [items, setItems] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);

    // Vehicle metadata (for Quotation & Estimate)
    const [quoteNumber, setQuoteNumber] = useState('');
    const [vehicleNo, setVehicleNo] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [insuranceCompany, setInsuranceCompany] = useState('');
    const [jobCaption, setJobCaption] = useState('');

    const [introducer, setIntroducer] = useState('');
    const [introducerName, setIntroducerName] = useState('');
    const [biller, setBiller] = useState('');
    const [billerName, setBillerName] = useState('');
    const [numberPlateImage, setNumberPlateImage] = useState('');
    const [lorryBodyImage, setLorryBodyImage] = useState('');
    const [photos, setPhotos] = useState([]);

    // Terms & Conditions (for Quotation & Estimate)
    const [remarks, setRemarks] = useState('');
    const [conditionOfPayments, setConditionOfPayments] = useState('a). 0% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work');
    const [completionOfWork, setCompletionOfWork] = useState('4 to 6 working Days after the Order Confirmation.');
    const [validityQuotation, setValidityQuotation] = useState('30 Working Days From the Issued Date..');
    const [warrantyCondition, setWarrantyCondition] = useState('a). Please See the Description..\nb). Warranty Will be Issued with the Invoice.');
    const [laborCost, setLaborCost] = useState(0);

    const [isVehicleInfoOpen, setIsVehicleInfoOpen] = useState(false);
    const [isPhotosOpen, setIsPhotosOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    // Optional Vehicle details toggle for Invoice
    const [includeVehicleDetails, setIncludeVehicleDetails] = useState(false);

    const [showAdvance, setShowAdvance] = useState(false);
    const [advancePercentage, setAdvancePercentage] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);

    const handleImageUpload = (field, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (field === 'numberPlateImage') setNumberPlateImage(reader.result);
            if (field === 'lorryBodyImage') setLorryBodyImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleMultiplePhotosUpload = (files) => {
        if (!files || files.length === 0) return;
        const fileList = Array.from(files);
        fileList.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    setPhotos((prev) => [...prev, reader.result]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (index) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 1000 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active'],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
    });
    const { data: employeesData } = useQuery({
        queryKey: ['employees', 'active'],
        queryFn: async () => {
            const { data } = await api.get('/hr/employees?limit=500&status=active');
            return data.data || [];
        }
    });
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data } = await api.get('/users?limit=500');
            return data.data || [];
        }
    });

    const employees = Array.isArray(employeesData) ? employeesData : [];
    const users = Array.isArray(usersData) ? usersData : [];

    const customerSuggestions = useMemo(() => {
        const all = Array.isArray(customersData?.data) ? customersData.data : (Array.isArray(customersData) ? customersData : []);
        if (!customerSearch.trim()) return all.slice(0, 8);
        const q = customerSearch.toLowerCase().trim();
        return all.filter((c) => {
            const name = String(c.displayName || c.companyName || '').toLowerCase();
            const phone = String(c.primaryContact?.phone || c.billingAddress?.phone || '').toLowerCase();
            const code = String(c.customerCode || '').toLowerCase();
            return name.includes(q) || phone.includes(q) || code.includes(q);
        }).slice(0, 10);
    }, [customerSearch, customersData]);

    const handleSelectCustomer = (cust) => {
        setSelectedCustomer(cust);
        setCustomerId(cust._id);
        setCustomerSearch(cust.displayName || cust.companyName || '');
        setCustomerPhone(cust.primaryContact?.phone || cust.billingAddress?.phone || '');
        if (cust.introducer) {
            setIntroducer(cust.introducer);
            setIntroducerName(cust.introducerName || '');
        } else {
            setIntroducer('');
            setIntroducerName('');
        }
        setIsCustomerDropdownOpen(false);
    };

    const modalCustomerSuggestions = useMemo(() => {
        const all = Array.isArray(customersData?.data) ? customersData.data : (Array.isArray(customersData) ? customersData : []);
        if (!tempCustSearch.trim()) return all.slice(0, 15);
        const q = tempCustSearch.toLowerCase().trim();
        return all.filter((c) => {
            const name = String(c.displayName || c.companyName || '').toLowerCase();
            const phone = String(c.primaryContact?.phone || c.billingAddress?.phone || '').toLowerCase();
            const code = String(c.customerCode || '').toLowerCase();
            return name.includes(q) || phone.includes(q) || code.includes(q);
        }).slice(0, 20);
    }, [tempCustSearch, customersData]);

    const handleApplyExistingCustomer = (cust) => {
        handleSelectCustomer(cust);
        setIsAddCustomerModalOpen(false);
        toast.success(`Customer "${cust.displayName || cust.companyName}" added to ${docTypeLower}!`);
    };

    const handleApplyManualCustomer = () => {
        if (!tempCustName.trim()) {
            toast.error('Customer name is required');
            return;
        }
        setSelectedCustomer(null);
        setCustomerId('');
        setCustomerSearch(tempCustName.trim());
        setCustomerPhone(tempCustPhone.trim());
        setCustomerEmail(tempCustEmail.trim());
        setCustomerAddress(tempCustAddress.trim());
        setIsAddCustomerModalOpen(false);
        toast.success(`Customer "${tempCustName.trim()}" added to ${docTypeLower}!`);
    };

    const updateModalItem = (field, value) => {
        setModalItem((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'productId') {
                if (value) {
                    const p = productsData?.data?.find((x) => x._id === value);
                    if (p) {
                        next.productName = p.name || '';
                        next.productTranslation = p.sinhalaName || '';
                        next.productCode = p.productCode || '';
                        next.description = p.description || '';
                        next.unitPrice = p.basePrice || p.costs?.lastPurchaseCost || p.costs?.averageCost || 0;
                        next.taxRate = p.tax?.taxRate ?? 18;
                        next.taxable = p.tax?.taxable ?? true;
                        next.unitOfMeasure = p.unitOfMeasure || 'pcs';
                    }
                } else {
                    next.productId = '';
                }
            }
            return next;
        });
    };

    const handleTranslateModalItem = async () => {
        const text = modalItem.productName || '';
        if (!text.trim()) {
            toast.error('Please enter an item name to translate');
            return;
        }
        try {
            const detected = detectLanguage(text);
            if (detected === 'si' || detected === 'ta') {
                const translated = await translateText(text, 'en');
                setModalItem((prev) => ({
                    ...prev,
                    productName: translated,
                    productTranslation: text,
                }));
                toast.success('Translated to English!');
            } else {
                const translated = await translateText(text, 'si');
                setModalItem((prev) => ({
                    ...prev,
                    productTranslation: translated,
                }));
                toast.success('Translated to Sinhala!');
            }
        } catch (err) {
            toast.error('Translation failed: ' + err.message);
        }
    };

    const handleAddItemFromModal = (addAnother = false) => {
        if (!modalItem.productName || !modalItem.productName.trim()) {
            toast.error('Item Name is required');
            return;
        }
        const q = +modalItem.quantity;
        if (!q || q <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        if (editingIndex !== null) {
            setItems((prev) => {
                const updated = [...prev];
                updated[editingIndex] = { ...modalItem };
                return updated;
            });
            toast.success(`Item #${editingIndex + 1} updated!`);
            setEditingIndex(null);
            setModalItem(defaultItemState);
            setIsAddItemModalOpen(false);
        } else {
            setItems((prev) => [...prev, { ...modalItem }]);
            toast.success(`Item #${items.length + 1} "${modalItem.productName}" added to ${docTypeLower}!`);
            setModalItem(defaultItemState);
            if (!addAnother) {
                setIsAddItemModalOpen(false);
            }
        }
    };

    const handleEditItem = (idx) => {
        setEditingIndex(idx);
        setModalItem({ ...items[idx] });
        setIsAddItemModalOpen(true);
    };

    const handleRemoveItem = (idx) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
        if (editingIndex === idx) {
            setEditingIndex(null);
            setModalItem(defaultItemState);
        } else if (editingIndex !== null && editingIndex > idx) {
            setEditingIndex(editingIndex - 1);
        }
        toast.success(`Item #${idx + 1} removed`);
    };

    const customerOptions = (customersData?.data || []).map((c) => ({
        value: c._id, label: `${c.displayName} (${c.customerCode})`,
    }));
    const productOptions = (productsData?.data || [])
        .filter((p) => p.canBeSold !== false)
        .map((p) => ({
            value: p._id,
            label: p.sinhalaName 
                ? `${p.name} (${p.sinhalaName})`
                : p.name,
            productCode: p.productCode,
            sinhalaName: p.sinhalaName,
            subtext: `Code: ${p.productCode} • Price: LKR ${p.basePrice || 0}`,
        }));

    const totals = useMemo(() => {
        let sub = 0, totalDisc = 0, tax = 0;
        items.forEach((i) => {
            const q = +i.quantity || 0;
            const p = +i.unitPrice || 0;
            const disc = +i.discount || 0;
            const lSub = q * p;
            const lDisc = Math.min(lSub, disc * q);
            const lTaxable = Math.max(0, lSub - lDisc);
            const lTax = i.taxable ? lTaxable * (+i.taxRate || 0) / 100 : 0;
            sub += lSub;
            totalDisc += lDisc;
            tax += lTax;
        });
        const lCost = docType !== 'invoice' ? (+laborCost || 0) : 0;
        const sCost = docType === 'invoice' ? (+shippingCost || 0) : 0;
        const grand = Math.max(0, sub - totalDisc + tax + lCost + sCost);
        return { 
            sub: +sub.toFixed(2), 
            discount: +totalDisc.toFixed(2), 
            tax: +tax.toFixed(2), 
            grand: +grand.toFixed(2) 
        };
    }, [items, shippingCost, laborCost, docType]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submit = async () => {
        const finalCustomerName = (customerSearch || selectedCustomer?.displayName || selectedCustomer?.companyName || '').trim();
        if (!customerId && !finalCustomerName) {
            toast.error('Please enter customer name or select a customer');
            return;
        }

        if (items.length === 0) {
            toast.error('Please add at least one item using "+ Add Item"');
            return;
        }

        if (items.some((i) => !i.productName || !i.quantity)) {
            toast.error('All items need a name and quantity');
            return;
        }

        setIsSubmittingDoc(true);
        try {
            if (docType === 'invoice') {
                const result = await createMutation.mutateAsync({
                    customerId: customerId || undefined,
                    customerName: finalCustomerName,
                    customerPhone: customerPhone || undefined,
                    customerEmail: customerEmail || undefined,
                    customerAddress: customerAddress || (selectedCustomer?.primaryAddress?.line1 ? `${selectedCustomer.primaryAddress.line1}${selectedCustomer.primaryAddress.city ? ', ' + selectedCustomer.primaryAddress.city : ''}` : undefined),
                    invoiceType,
                    invoiceDate,
                    items: items.map((i) => {
                        const q = +i.quantity || 1;
                        const d = +i.discount || 0;
                        return {
                            productId: i.productId || undefined,
                            productCode: i.productCode || undefined,
                            productName: i.productName,
                            productTranslation: i.productTranslation || undefined,
                            description: i.description || undefined,
                            quantity: q,
                            unitOfMeasure: i.unitOfMeasure || undefined,
                            unitPrice: +i.unitPrice || 0,
                            discount: d,
                            discountAmount: +(d * q).toFixed(2),
                            taxRate: +i.taxRate || 0,
                            taxable: i.taxable,
                        };
                    }),
                    shippingCost: +shippingCost || 0,
                    advancePercentage: showAdvance ? (+advancePercentage || 0) : 0,
                    advanceAmount: showAdvance ? (+advanceAmount || 0) : 0,
                    showAdvanceOnInvoice: showAdvance,
                    notes: notes || undefined,
                    paymentInstructions: paymentInstructions || undefined,
                    status: 'approved',
                    // Vehicle & Workshop metadata (included only when enabled)
                    vehicleNo: includeVehicleDetails ? (vehicleNo.trim() || undefined) : undefined,
                    vehicleModel: includeVehicleDetails ? (vehicleModel.trim() || undefined) : undefined,
                    vehicleOwner: includeVehicleDetails ? (finalCustomerName || undefined) : undefined,
                    jobCaption: includeVehicleDetails ? (jobCaption.trim() || undefined) : undefined,
                    numberPlateImage: includeVehicleDetails ? (numberPlateImage || undefined) : undefined,
                    lorryBodyImage: includeVehicleDetails ? (lorryBodyImage || undefined) : undefined,
                    photos: includeVehicleDetails ? photos : [],
                });
                toast.success('Invoice created successfully!');
                navigate(`/invoices/${result.data._id}`);
            } else {
                // docType === 'quotation' || docType === 'estimate'
                const quotePayload = {
                    documentType: docType,
                    quoteNumber: quoteNumber.trim() || undefined,
                    customerId: customerId || undefined,
                    customerName: finalCustomerName,
                    vehicleOwner: finalCustomerName,
                    customerPhone: customerPhone || undefined,
                    customerEmail: customerEmail || undefined,
                    customerAddress: customerAddress || (selectedCustomer?.primaryAddress?.line1
                        ? `${selectedCustomer.primaryAddress.line1}${selectedCustomer.primaryAddress.city ? ', ' + selectedCustomer.primaryAddress.city : ''}`
                        : undefined),
                    date: invoiceDate,
                    expiryDate: dueDate || undefined,
                    vehicleNo: vehicleNo || undefined,
                    vehicleModel: vehicleModel || undefined,
                    insuranceCompany: insuranceCompany || undefined,
                    jobCaption: jobCaption || undefined,
                    introducer: introducer || undefined,
                    introducerName: introducerName || undefined,
                    biller: biller || undefined,
                    billerName: billerName || undefined,
                    numberPlateImage: numberPlateImage || undefined,
                    lorryBodyImage: lorryBodyImage || undefined,
                    photos: photos.length > 0 ? photos : undefined,
                    remarks: remarks || undefined,
                    conditionOfPayments: conditionOfPayments || undefined,
                    completionOfWork: completionOfWork || undefined,
                    validityQuotation: validityQuotation || undefined,
                    warrantyCondition: warrantyCondition || undefined,
                    items: items.map((i) => {
                        const q = +i.quantity || 1;
                        const p = +i.unitPrice || 0;
                        const d = +i.discount || 0;
                        return {
                            product: i.productId || undefined,
                            productName: i.productName,
                            productTranslation: i.productTranslation || undefined,
                            description: i.description || undefined,
                            quantity: q,
                            unitPrice: p,
                            discount: d,
                            subtotal: +(q * p - q * d).toFixed(2),
                        };
                    }),
                    totalAmount: totals.sub,
                    laborCost: +laborCost || 0,
                    discount: totals.discount,
                    tax: totals.tax,
                    grandTotal: totals.grand,
                    advancePercentage: showAdvance ? (+advancePercentage || 0) : 0,
                    advanceAmount: showAdvance ? (+advanceAmount || 0) : 0,
                    balanceAmount: showAdvance ? Math.max(0, totals.grand - (+advanceAmount || 0)) : totals.grand,
                    notes: notes || undefined,
                    status: 'draft',
                };
                await api.post('/crm/quotations', quotePayload);
                const docLabel = docType === 'estimate' ? 'Estimate' : 'Quotation';
                toast.success(`${docLabel} created successfully!`);
                navigate(`/invoices?tab=${docType === 'estimate' ? 'estimates' : 'quotations'}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to create document');
        } finally {
            setIsSubmittingDoc(false);
        }
    };

    const renderItemsCard = () => (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <span>{docType === 'invoice' ? 'Invoice Items' : `${docTypeLabel} Items`}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            docType === 'estimate'
                                ? 'bg-amber-100 text-amber-800'
                                : docType === 'quotation'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-primary-100 text-primary-800'
                        }`}>
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {docType === 'invoice'
                            ? 'Items added to this invoice. Click "+ Add Item" to add items one by one.'
                            : `Parts, materials & charge items added to this ${docTypeLower}. Click "+ Add Item" to add.`}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                        setEditingIndex(null);
                        setModalItem(defaultItemState);
                        setIsAddItemModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                >
                    <Plus size={14} className="mr-1" />
                    + Add Item
                </Button>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <PackagePlus size={36} className="mx-auto text-emerald-500/60 mb-2" />
                    <p className="text-sm font-bold text-gray-700">No items added to {docTypeLower}</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Click the button below to add catalog products or custom repair work items with descriptions.
                    </p>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                            setEditingIndex(null);
                            setModalItem(defaultItemState);
                            setIsAddItemModalOpen(true);
                        }}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    >
                        <Plus size={16} className="mr-1.5" />
                        + Add Item to {docTypeLabel}
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const q = +item.quantity || 0;
                        const p = +item.unitPrice || 0;
                        const d = +item.discount || 0;
                        const lGross = q * p;
                        const lDisc = Math.min(lGross, d * q);
                        const lTaxable = Math.max(0, lGross - lDisc);
                        const lTax = item.taxable ? lTaxable * (+item.taxRate || 0) / 100 : 0;
                        const lTot = lTaxable + lTax;
                        const isBeingEdited = editingIndex === idx;

                        return (
                            <div
                                key={idx}
                                className={`border rounded-xl p-4 transition ${
                                    isBeingEdited
                                        ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <span className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                            isBeingEdited
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-primary-100 text-primary-800'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                    Item #{idx + 1}
                                                </span>
                                                <h4 className="text-sm font-bold text-gray-900 truncate">
                                                    {item.productName}
                                                </h4>
                                                {item.productTranslation && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-sans">
                                                        {item.productTranslation}
                                                    </span>
                                                )}
                                                {item.productCode && (
                                                    <span className="text-[11px] font-mono text-gray-400">
                                                        ({item.productCode})
                                                    </span>
                                                )}
                                            </div>

                                            {item.description && (
                                                <p className="text-xs text-gray-600 mt-1 whitespace-pre-line bg-gray-50 p-2 rounded border border-gray-100">
                                                    {item.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                                                <span>
                                                    Qty: <strong className="text-gray-800 font-mono">{item.quantity}</strong> {item.unitOfMeasure || 'pcs'}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Unit Price: <strong className="text-gray-800 font-mono">{fmt(item.unitPrice)}</strong>
                                                </span>
                                                {d > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-red-600 font-mono">
                                                            Disc: -{fmt(lDisc)}
                                                        </span>
                                                    </>
                                                )}
                                                {+item.taxRate > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Tax: {item.taxRate}%</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <div className="text-right">
                                            <span className="text-xs text-gray-400 block">Total</span>
                                            <span className="text-base font-bold text-gray-900 font-mono">
                                                {fmt(lTot)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleEditItem(idx)}
                                                className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition ${
                                                    isBeingEdited
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                                }`}
                                                title="Edit item"
                                            >
                                                <Edit2 size={14} />
                                                <span className="hidden sm:inline">Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs flex items-center gap-1 font-medium transition"
                                                title="Remove item"
                                            >
                                                <Trash2 size={14} />
                                                <span className="hidden sm:inline">Remove</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );

    return (
        <div>
            <PageHeader
                title={docType === 'estimate' ? 'Add Estimate' : docType === 'quotation' ? 'Add Quotation' : 'Add Invoice'}
                description={
                    docType === 'estimate'
                        ? 'Create a detailed repair/production cost estimate for vehicle body works'
                        : docType === 'quotation'
                        ? 'Create an official price quotation for client approval'
                        : 'Create an invoice directly (services, custom sales, or walk-in customers)'
                }
                actions={
                    <Button
                        variant="outline"
                        onClick={() => navigate(docType === 'invoice' ? '/invoices' : `/invoices?tab=${docType === 'estimate' ? 'estimates' : 'quotations'}`)}
                    >
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            {/* Document Type Switcher Banner & Inline Date/Type Controls */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">Type:</span>
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200/80 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => { setDocType('invoice'); setSearchParams({ type: 'invoice' }); }}
                            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                docType === 'invoice'
                                    ? 'bg-white text-primary-700 shadow-sm border border-gray-200/60'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Receipt size={14} />
                            Invoice
                        </button>
                        <button
                            type="button"
                            onClick={() => { setDocType('quotation'); setSearchParams({ type: 'quotation' }); }}
                            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                docType === 'quotation'
                                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/60'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <FileText size={14} />
                            Quotation
                        </button>
                        <button
                            type="button"
                            onClick={() => { setDocType('estimate'); setSearchParams({ type: 'estimate' }); }}
                            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                docType === 'estimate'
                                    ? 'bg-white text-amber-700 shadow-sm border border-gray-200/60'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <ClipboardList size={14} />
                            Estimate
                        </button>
                    </div>
                </div>

                {/* Inline Invoice / Quote Date & Expiry / Type Controls */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 transition-colors px-3 py-1.5 rounded-xl border border-gray-200/80">
                        <label className="text-xs font-bold text-gray-500 whitespace-nowrap">
                            {docType === 'invoice' ? 'Invoice Date:' : docType === 'quotation' ? 'Quote Date:' : 'Estimate Date:'}
                        </label>
                        <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="bg-transparent border-0 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-0 p-0 cursor-pointer"
                        />
                    </div>

                    {docType !== 'invoice' && (
                        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 transition-colors px-3 py-1.5 rounded-xl border border-gray-200/80">
                            <label className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                Valid Until:
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="bg-transparent border-0 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-0 p-0 cursor-pointer"
                            />
                        </div>
                    )}

                    {docType !== 'invoice' && (
                        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 transition-colors px-3 py-1.5 rounded-xl border border-gray-200/80">
                            <label className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                Ref / Quote No:
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. JA/QT/915 (or auto)"
                                value={quoteNumber}
                                onChange={(e) => setQuoteNumber(e.target.value)}
                                className="bg-transparent border-0 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-0 p-0 placeholder-gray-400 w-36"
                            />
                        </div>
                    )}

                    {docType === 'invoice' && (
                        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 transition-colors px-3 py-1.5 rounded-xl border border-gray-200/80">
                            <label className="text-xs font-bold text-gray-500 whitespace-nowrap">Type:</label>
                            <select
                                value={invoiceType}
                                onChange={(e) => setInvoiceType(e.target.value)}
                                className="bg-transparent border-0 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-0 p-0 cursor-pointer pr-2"
                            >
                                <option value="standard">Standard</option>
                                <option value="proforma">Proforma</option>
                                <option value="service">Service</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Form Body Grid (Left 2 cols: Document Content | Right 1 col: Customer Details & Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Left Column: Main Form & Document Cards */}
                <div className="lg:col-span-2 space-y-6">
                    {docType === 'invoice' ? (
                        <>
                            {/* Invoice Items Card */}
                            {renderItemsCard()}

                            {/* Invoice Notes & Terms Card */}
                            <Card className="p-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Notes & Terms</h3>
                                <div className="space-y-4">
                                    <Textarea
                                        label="Invoice Notes"
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional notes for this invoice..."
                                    />
                                    <Textarea
                                        label="Payment Instructions"
                                        rows={2}
                                        value={paymentInstructions}
                                        onChange={(e) => setPaymentInstructions(e.target.value)}
                                        placeholder="Bank transfer instructions or payment details..."
                                    />
                                </div>
                            </Card>
                        </>
                    ) : (
                        <>
                            {/* 1. VEHICLE & OWNER INFORMATION Card (Collapsible) */}
                            <div className="bg-slate-50 rounded-2xl border border-gray-200/90 shadow-xs transition-all overflow-hidden">
                                <div
                                    onClick={() => setIsVehicleInfoOpen(!isVehicleInfoOpen)}
                                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 select-none transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                                            <Truck size={15} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                                    Vehicle &amp; Owner Information
                                                </span>
                                                {vehicleNo && (
                                                    <span className="font-mono text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                                                        {vehicleNo}
                                                    </span>
                                                )}
                                                {selectedCustomer && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                        <CheckCircle2 size={11} /> {selectedCustomer.displayName || selectedCustomer.customerCode}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {isVehicleInfoOpen
                                                    ? 'Click header to collapse vehicle details'
                                                    : (vehicleNo || customerSearch)
                                                        ? `${customerSearch || selectedCustomer?.displayName || 'Owner'} • ${vehicleNo || 'No plate'}`
                                                        : 'Click to expand and enter vehicle number, owner, insurance & model'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-500 flex items-center justify-center">
                                            {isVehicleInfoOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </div>
                                    </div>
                                </div>

                                {isVehicleInfoOpen && (
                                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-200/60">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                    Vehicle Owner / Customer Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={customerSearch}
                                                    placeholder="e.g. Mr. UPDK Dhanasekara"
                                                    onChange={(e) => {
                                                        setCustomerSearch(e.target.value);
                                                        if (selectedCustomer) {
                                                            setSelectedCustomer(null);
                                                            setCustomerId('');
                                                        }
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                    Vehicle Number (Plate No)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-mono uppercase font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={vehicleNo}
                                                    placeholder="e.g. WP DAI-1974"
                                                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                    Insurance Company
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={insuranceCompany}
                                                    placeholder="e.g. Fairfirst Insurance Limited"
                                                    onChange={(e) => setInsuranceCompany(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                    Vehicle Model
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={vehicleModel}
                                                    placeholder="e.g. TATA / New Mahindra Bolero"
                                                    onChange={(e) => setVehicleModel(e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                    Job Caption
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={jobCaption}
                                                    placeholder="e.g. Accident Repair / Body Construction"
                                                    onChange={(e) => setJobCaption(e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                                    Contact Phone
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={customerPhone}
                                                    placeholder="e.g. 0714193455"
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. PHOTO ATTACHMENTS (DISPLAYED ON PRINT & PDF) Card (Collapsible) */}
                            <div className="bg-blue-50/50 rounded-2xl border border-blue-200/80 shadow-xs transition-all overflow-hidden">
                                <div
                                    onClick={() => setIsPhotosOpen(!isPhotosOpen)}
                                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-blue-100/50 select-none transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                                            <ImageIcon size={15} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-black text-blue-900 uppercase tracking-wide">
                                                    Photo Attachments
                                                </span>
                                                <span className="text-[11px] text-blue-600/80 font-normal hidden sm:inline">
                                                    (Displayed on Print &amp; PDF)
                                                </span>
                                                {((numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + photos.length) > 0 && (
                                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                                                        {(numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + photos.length} Photos
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {isPhotosOpen ? 'Click header to collapse photos' : 'Click to attach number plate, lorry body & inspection damage photos'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs font-bold text-blue-700 hidden sm:inline">
                                            {isPhotosOpen ? 'Hide' : '+ Add Photos'}
                                        </span>
                                        <div className="w-6 h-6 rounded-md bg-white border border-blue-200 text-blue-700 flex items-center justify-center">
                                            {isPhotosOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </div>
                                    </div>
                                </div>

                                {isPhotosOpen && (
                                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-blue-200/60">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Number Plate Photo */}
                                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase">Number Plate Photo</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="text-xs text-gray-500 w-full file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                                            onChange={(e) => handleImageUpload('numberPlateImage', e.target.files[0])}
                                        />
                                        {numberPlateImage ? (
                                            <div className="relative border rounded-lg p-1 bg-gray-50">
                                                <img src={numberPlateImage} alt="Number Plate Preview" className="h-24 object-contain mx-auto" />
                                                <button
                                                    type="button"
                                                    onClick={() => setNumberPlateImage('')}
                                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Or paste Image URL..."
                                                className="w-full text-xs px-2.5 py-1.5 border rounded bg-gray-50"
                                                value={numberPlateImage}
                                                onChange={(e) => setNumberPlateImage(e.target.value)}
                                            />
                                        )}
                                    </div>

                                    {/* Lorry Body Photo */}
                                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase">Lorry Body Photo</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="text-xs text-gray-500 w-full file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                                            onChange={(e) => handleImageUpload('lorryBodyImage', e.target.files[0])}
                                        />
                                        {lorryBodyImage ? (
                                            <div className="relative border rounded-lg p-1 bg-gray-50">
                                                <img src={lorryBodyImage} alt="Lorry Body Preview" className="h-24 object-contain mx-auto" />
                                                <button
                                                    type="button"
                                                    onClick={() => setLorryBodyImage('')}
                                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Or paste Image URL..."
                                                className="w-full text-xs px-2.5 py-1.5 border rounded bg-gray-50"
                                                value={lorryBodyImage}
                                                onChange={(e) => setLorryBodyImage(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Additional Inspection Photos (Multiple Upload Allowed) */}
                                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-800 uppercase">
                                                Additional Vehicle &amp; Damage Photos (Upload Multiple)
                                            </label>
                                            <span className="text-[11px] text-gray-500">
                                                Select multiple files at once to attach damage inspection, chassis, or repair progress photos.
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 self-start sm:self-auto">
                                            {photos.length} photo{photos.length === 1 ? '' : 's'} added
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="text-xs text-gray-600 w-full file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                                            onChange={(e) => {
                                                handleMultiplePhotosUpload(e.target.files);
                                                e.target.value = '';
                                            }}
                                        />
                                        {photos.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setPhotos([])}
                                                className="text-[11px] text-red-600 hover:text-red-800 font-bold whitespace-nowrap px-2.5 py-1.5 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                                            >
                                                Clear All ({photos.length})
                                            </button>
                                        )}
                                    </div>

                                    {/* Gallery Preview of Additional Photos */}
                                    {photos.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2 border-t border-gray-100">
                                            {photos.map((src, idx) => (
                                                <div key={idx} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-24 flex items-center justify-center shadow-xs">
                                                    <img src={src} alt={`Inspection Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(idx)}
                                                            className="bg-red-600 text-white rounded-full p-1.5 shadow hover:bg-red-700 transition"
                                                            title="Remove Photo"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                        #{idx + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. PARTS & LABOUR CHARGES (Items Card) */}
                            {renderItemsCard()}

                            {/* 4. DOCUMENT TERMS & CONDITIONS Card (Collapsible) */}
                            <div className="bg-slate-50 rounded-2xl border border-gray-200/90 shadow-xs transition-all overflow-hidden">
                                <div
                                    onClick={() => setIsTermsOpen(!isTermsOpen)}
                                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 select-none transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                                            <FileText size={15} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                                Document Terms &amp; Conditions
                                            </span>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                {isTermsOpen ? 'Click header to collapse terms' : 'Click to view & customize remarks, payment condition, validity & warranty'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                                            {isTermsOpen ? 'Hide' : '+ Edit Terms'}
                                        </span>
                                        <div className="w-6 h-6 rounded-md bg-white border border-gray-200 text-gray-500 flex items-center justify-center">
                                            {isTermsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </div>
                                    </div>
                                </div>

                                {isTermsOpen && (
                                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-200/60">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                                    Remarks
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                    placeholder="Remarks to appear under line items..."
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                                    Condition of Payments
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. a). 0% Advance Payment with the firm Order.&#10;b). Balance Payment on Completion of Work"
                                                    value={conditionOfPayments}
                                                    onChange={(e) => setConditionOfPayments(e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                                    Completion of Work
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. 4 to 6 working Days after the Order Confirmation."
                                                    value={completionOfWork}
                                                    onChange={(e) => setCompletionOfWork(e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                                    Validity ({docTypeLabel})
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. 30 Working Days From the Issued Date.."
                                                    value={validityQuotation}
                                                    onChange={(e) => setValidityQuotation(e.target.value)}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                                                    Warranty
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. a). Please See the Description..&#10;b). Warranty Will be Issued with the Invoice."
                                                    value={warrantyCondition}
                                                    onChange={(e) => setWarrantyCondition(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 5. Workshop Notes Card */}
                            <Card className="p-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Notes &amp; Internal Reference</h3>
                                <Textarea
                                    rows={4}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={`Special notes, internal references or details for this ${docTypeLower}...`}
                                />
                            </Card>
                        </>
                    )}
                </div>

                {/* Right Column: Customer Details (Top) & Summary (Bottom, Sticky) */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Customer Details Box placed directly ABOVE Summary */}
                    <Card className="p-3.5 border-blue-100 shadow-sm bg-white">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2.5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                                    <User size={13} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900 leading-tight">Customer Details</h3>
                                    <p className="text-[10px] text-gray-400">Selected client profile</p>
                                </div>
                            </div>
                            {selectedCustomer ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                                    <CheckCircle2 size={10} /> {selectedCustomer.customerCode || 'Registered'}
                                </span>
                            ) : customerSearch.trim() ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                    Manual Customer
                                </span>
                            ) : null}
                        </div>

                        {selectedCustomer || customerSearch.trim() ? (
                            <div className="space-y-1.5 text-[11px]">
                                <div>
                                    <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider">Customer Name</span>
                                    <p className="font-bold text-gray-900 text-xs truncate">
                                        {selectedCustomer?.displayName || selectedCustomer?.companyName || customerSearch}
                                    </p>
                                    {selectedCustomer?.legalName && selectedCustomer.legalName !== selectedCustomer.displayName && (
                                        <p className="text-[10px] text-gray-500 truncate">{selectedCustomer.legalName}</p>
                                    )}
                                </div>

                                {(customerPhone || selectedCustomer?.primaryContact?.phone || selectedCustomer?.billingAddress?.phone) && (
                                    <div className="flex items-center gap-1.5 text-gray-700">
                                        <Phone size={11} className="text-blue-500 shrink-0" />
                                        <span className="font-semibold font-mono text-xs">
                                            {customerPhone || selectedCustomer?.primaryContact?.phone || selectedCustomer?.billingAddress?.phone}
                                        </span>
                                    </div>
                                )}

                                {selectedCustomer?.primaryContact?.email && (
                                    <div className="flex items-center gap-1.5 text-gray-700">
                                        <Mail size={11} className="text-blue-500 shrink-0" />
                                        <span className="truncate text-[10px]">{selectedCustomer.primaryContact.email}</span>
                                    </div>
                                )}

                                {(selectedCustomer?.primaryAddress?.line1 || selectedCustomer?.billingAddress?.line1) && (
                                    <div className="flex items-start gap-1.5 text-gray-600 text-[10px]">
                                        <MapPin size={11} className="text-blue-500 shrink-0 mt-0.5" />
                                        <span className="truncate">
                                            {[
                                                selectedCustomer.primaryAddress?.line1 || selectedCustomer.billingAddress?.line1,
                                                selectedCustomer.primaryAddress?.city || selectedCustomer.billingAddress?.city
                                            ].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}

                                {selectedCustomer?.paymentTerms && (
                                    <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                                        <span className="text-gray-500">Payment Terms:</span>
                                        <span className="font-bold text-gray-800 uppercase">
                                            {selectedCustomer.paymentTerms.type || 'Cash'}
                                            {selectedCustomer.paymentTerms.creditDays ? ` (${selectedCustomer.paymentTerms.creditDays}d)` : ''}
                                        </span>
                                    </div>
                                )}

                                {selectedCustomer?.currentBalance !== undefined && (
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-500">Outstanding:</span>
                                        <span className={`font-bold ${selectedCustomer.currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {fmt(selectedCustomer.currentBalance)}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-1.5 border-t border-gray-100 flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddCustomerModalOpen(true)}
                                        className="flex-1 text-center text-[10px] text-blue-600 hover:text-blue-800 py-0.5 bg-blue-50 hover:bg-blue-100 rounded font-semibold transition"
                                    >
                                        + Change / New
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            setCustomerId('');
                                            setCustomerSearch('');
                                            setCustomerPhone('');
                                        }}
                                        className="text-center text-[10px] text-gray-500 hover:text-red-600 px-2 py-0.5 border border-dashed border-gray-200 hover:border-red-200 rounded transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-2.5 px-2 bg-gray-50/80 rounded-lg border border-dashed border-gray-200">
                                <User size={18} className="mx-auto text-gray-300 mb-0.5" />
                                <p className="text-[11px] font-semibold text-gray-600">No Customer Selected</p>
                                <button
                                    type="button"
                                    onClick={() => setIsAddCustomerModalOpen(true)}
                                    className="mt-1.5 text-[11px] font-bold text-primary-600 hover:text-primary-700 bg-white hover:bg-primary-50 px-2.5 py-1 rounded-md border border-primary-200 transition inline-flex items-center gap-1 shadow-2xs"
                                >
                                    <UserPlus size={12} /> + Add Customer
                                </button>
                            </div>
                        )}
                    </Card>

                    {/* Summary Card (Invoice or Workshop Summary) */}
                    {docType === 'invoice' ? (
                        <>
                            <Card className="p-4">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5 pb-2 border-b border-gray-100">Summary</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono text-gray-900 font-semibold">{fmt(totals.sub)}</span></div>
                                {totals.discount > 0 && (
                                    <div className="flex justify-between text-red-600 font-medium">
                                        <span>Discount</span>
                                        <span className="font-mono font-bold">-{fmt(totals.discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600"><span>Tax</span><span className="font-mono">{fmt(totals.tax)}</span></div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-600">Shipping</span>
                                    <input type="number" step="0.01" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)}
                                        className="w-24 px-2 py-0.5 border border-gray-300 rounded text-xs text-right font-mono" />
                                </div>
                                <div className="flex justify-between pt-2 border-t font-bold text-xs">
                                    <span>Total</span><span className="text-primary-600 font-extrabold text-sm font-mono">{fmt(totals.grand)}</span>
                                </div>

                                {/* Optional Advance Payment */}
                                <div className="pt-2 border-t space-y-1.5">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700">
                                        <input 
                                            type="checkbox" 
                                            checked={showAdvance} 
                                            onChange={(e) => {
                                                setShowAdvance(e.target.checked);
                                                if (!e.target.checked) {
                                                    setAdvancePercentage(0);
                                                    setAdvanceAmount(0);
                                                }
                                            }} 
                                            className="rounded text-primary-600 h-3.5 w-3.5"
                                        />
                                        <span>Add Advance Payment (Optional)</span>
                                    </label>

                                    {showAdvance && (
                                        <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 space-y-1.5 text-[11px]">
                                            <div className="flex justify-between items-center">
                                                <span>Advance %:</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="100" 
                                                    step="any" 
                                                    value={advancePercentage || ''} 
                                                    onChange={(e) => {
                                                        const pct = Number(e.target.value);
                                                        setAdvancePercentage(pct);
                                                        setAdvanceAmount(+((totals.grand * pct) / 100).toFixed(2));
                                                    }}
                                                    className="w-14 px-1.5 py-0.5 border rounded text-right font-mono font-bold bg-white text-xs" 
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Advance LKR:</span>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.01" 
                                                    value={advanceAmount || ''} 
                                                    onChange={(e) => {
                                                        const amt = Number(e.target.value);
                                                        setAdvanceAmount(amt);
                                                        setAdvancePercentage(totals.grand > 0 ? +((amt / totals.grand) * 100).toFixed(1) : 0);
                                                    }}
                                                    className="w-24 px-1.5 py-0.5 border rounded text-right font-mono font-bold bg-white text-xs" 
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center font-bold text-emerald-800 pt-1 border-t border-emerald-200">
                                                <span>Balance Due:</span>
                                                <span className="font-mono">{fmt(Math.max(0, totals.grand - (advanceAmount || 0)))}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                fullWidth
                                className="mt-3.5 py-2 text-xs"
                                onClick={submit}
                                loading={isSubmittingDoc || createMutation.isPending}
                                disabled={(!customerId && !customerSearch.trim()) || items.length === 0}
                            >
                                <Save size={14} className="mr-1.5" />
                                Create Invoice
                            </Button>
                        </Card>

                        {/* Vehicle & Workshop Details Card (Placed right below Summary Card) */}
                        <div className={`rounded-2xl border transition-all overflow-hidden ${
                            includeVehicleDetails
                                ? 'bg-slate-50 border-blue-200/90 shadow-xs'
                                : 'bg-white border-dashed border-gray-300 hover:border-blue-400 shadow-2xs'
                        }`}>
                            <div
                                onClick={() => setIncludeVehicleDetails(!includeVehicleDetails)}
                                className="p-3.5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-slate-100/70"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                        includeVehicleDetails ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        <Truck size={14} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                                Vehicle Details
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                Optional
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            {includeVehicleDetails
                                                ? (vehicleNo ? `Vehicle: ${vehicleNo}` : 'Details enabled')
                                                : 'Click to add vehicle info (විකල්ප)'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <label
                                        className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs hover:border-blue-400 transition"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={includeVehicleDetails}
                                            onChange={(e) => setIncludeVehicleDetails(e.target.checked)}
                                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-[11px] font-bold text-gray-700 select-none hidden sm:inline">
                                            {includeVehicleDetails ? 'Included' : '+ Add'}
                                        </span>
                                    </label>
                                    <div className="w-5 h-5 rounded bg-white border border-gray-200 text-gray-500 flex items-center justify-center">
                                        {includeVehicleDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </div>
                                </div>
                            </div>

                            {includeVehicleDetails && (
                                <div className="p-3.5 pt-2 space-y-3 border-t border-gray-200/60 bg-white text-xs">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                            Vehicle Number (Plate No)
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-mono uppercase font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={vehicleNo}
                                            placeholder="e.g. WP DAI-1974"
                                            onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                            Vehicle Model / Make
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={vehicleModel}
                                            placeholder="e.g. Isuzu Elf / Canter / Tata"
                                            onChange={(e) => setVehicleModel(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                            Job Caption / Scope
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={jobCaption}
                                            placeholder="e.g. Accident Repair / Body Construction"
                                            onChange={(e) => setJobCaption(e.target.value)}
                                        />
                                    </div>

                                    {/* Photo Attachments Sub-section */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <div
                                            onClick={() => setIsPhotosOpen(!isPhotosOpen)}
                                            className="flex items-center justify-between cursor-pointer py-1 text-[11px] text-blue-700 font-bold hover:underline select-none"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <ImageIcon size={13} />
                                                Photos ({(numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + photos.length})
                                            </span>
                                            <span className="text-[10px] font-normal text-gray-500">
                                                {isPhotosOpen ? 'Hide' : '+ Attach Photos'}
                                            </span>
                                        </div>

                                        {isPhotosOpen && (
                                            <div className="mt-2 space-y-2 bg-slate-50 p-2.5 rounded-lg border border-gray-200">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                        Plate Photo
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload('numberPlateImage', e.target.files[0])}
                                                        className="text-[10px] file:mr-1.5 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    />
                                                    {numberPlateImage && (
                                                        <div className="mt-1.5 relative w-20 h-14 rounded border overflow-hidden">
                                                            <img src={numberPlateImage} alt="Plate" className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setNumberPlateImage('')}
                                                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full"
                                                            >
                                                                <X size={9} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                                        Vehicle / Body Photo
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload('lorryBodyImage', e.target.files[0])}
                                                        className="text-[10px] file:mr-1.5 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    />
                                                    {lorryBodyImage && (
                                                        <div className="mt-1.5 relative w-20 h-14 rounded border overflow-hidden">
                                                            <img src={lorryBodyImage} alt="Vehicle" className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setLorryBodyImage('')}
                                                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full"
                                                            >
                                                                <X size={9} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        </>
                    ) : (
                        /* Workshop Summary Card (Quotation & Estimate - matches Image 2) */
                        <Card className="p-4 sticky top-4 shadow-sm border-gray-200">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5 pb-2 border-b border-gray-100">Summary</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center text-gray-600">
                                    <span>Items Subtotal</span>
                                    <span className="font-mono text-gray-900 font-bold">{fmt(totals.sub)}</span>
                                </div>

                                <div className="flex justify-between items-center text-gray-700">
                                    <span>Labor Cost / Workmanship</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-24 px-2 py-0.5 border border-gray-300 rounded text-right font-mono text-xs bg-white text-emerald-700 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                                        value={laborCost || ''}
                                        placeholder="0.00"
                                        onChange={(e) => setLaborCost(Number(e.target.value))}
                                    />
                                </div>

                                {totals.discount > 0 && (
                                    <div className="flex justify-between items-center text-red-600 font-medium">
                                        <span>Total Discounts</span>
                                        <span className="font-mono font-bold">-{fmt(totals.discount)}</span>
                                    </div>
                                )}

                                {totals.tax > 0 && (
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>Tax</span>
                                        <span className="font-mono font-bold">{fmt(totals.tax)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 font-bold text-gray-900 text-xs">
                                    <span>Grand Total</span>
                                    <span className="font-mono text-blue-800 text-sm font-extrabold">{fmt(totals.grand)}</span>
                                </div>

                                {/* Optional Advance Payment */}
                                <div className="pt-2 border-t border-gray-200 space-y-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700 select-none">
                                        <input
                                            type="checkbox"
                                            checked={showAdvance}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setShowAdvance(checked);
                                                if (!checked) {
                                                    setAdvancePercentage(0);
                                                    setAdvanceAmount(0);
                                                    setConditionOfPayments('a). 0% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work');
                                                }
                                            }}
                                            className="rounded text-blue-600 h-3.5 w-3.5 cursor-pointer"
                                        />
                                        <span>Add Advance Payment</span>
                                    </label>

                                    {showAdvance && (
                                        <div className="space-y-2 pt-0.5">
                                            <div className="space-y-1.5 p-2 bg-emerald-50/60 rounded-lg border border-emerald-200">
                                                <div className="flex justify-between items-center text-xs text-gray-700">
                                                    <span className="flex items-center gap-1 text-[11px]">
                                                        Advance (%) <span className="text-[10px] text-gray-400 font-normal">Auto-calc</span>
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="any"
                                                            placeholder="0"
                                                            className="w-16 px-1.5 py-0.5 border rounded text-right font-mono text-xs bg-white text-emerald-800 font-bold border-emerald-300 focus:outline-none"
                                                            value={advancePercentage || ''}
                                                            onChange={(e) => {
                                                                const pct = Number(e.target.value);
                                                                const advAmt = +((totals.grand * pct) / 100).toFixed(2);
                                                                const cond = `a). ${pct}% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work`;
                                                                setAdvancePercentage(pct);
                                                                setAdvanceAmount(advAmt);
                                                                setConditionOfPayments(cond);
                                                            }}
                                                        />
                                                        <span className="font-bold text-gray-400 text-[11px]">%</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-xs text-gray-700">
                                                    <span className="text-[11px]">Advance Amount (LKR)</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 px-1.5 py-0.5 border rounded text-right font-mono text-xs bg-white text-emerald-800 font-bold border-emerald-300 focus:outline-none"
                                                        value={advanceAmount || ''}
                                                        placeholder="0.00"
                                                        onChange={(e) => {
                                                            const amt = Number(e.target.value);
                                                            const pct = totals.grand > 0 ? +((amt / totals.grand) * 100).toFixed(1) : 0;
                                                            setAdvanceAmount(amt);
                                                            setAdvancePercentage(pct);
                                                            const cond = `a). ${pct}% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work`;
                                                            setConditionOfPayments(cond);
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center font-bold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                                                <span className="text-[11px]">Balance Due</span>
                                                <span className="font-mono text-xs font-black">
                                                    {fmt(Math.max(0, totals.grand - (advanceAmount || 0)))}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                fullWidth
                                className="mt-3.5 py-2 text-xs"
                                onClick={submit}
                                loading={isSubmittingDoc}
                                disabled={(!customerId && !customerSearch.trim()) || items.length === 0}
                            >
                                <Save size={14} className="mr-1.5" />
                                {docType === 'estimate' ? 'Create Estimate' : 'Create Quotation'}
                            </Button>
                        </Card>
                    )}
                </div>
            </div>

            {/* Modal: Add Customer */}
            <Modal
                isOpen={isAddCustomerModalOpen}
                onClose={() => setIsAddCustomerModalOpen(false)}
                title={`Add Customer to ${docTypeLabel}`}
                size="lg"
            >
                <div className="space-y-4">
                    {/* Tabs: Choose between Existing System Customer or Walk-in / Direct Customer */}
                    <div className="flex border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setCustModalTab('existing')}
                            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
                                custModalTab === 'existing'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Building size={14} />
                            Select Existing Customer
                        </button>
                        <button
                            type="button"
                            onClick={() => setCustModalTab('manual')}
                            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
                                custModalTab === 'manual'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <User size={14} />
                            Walk-in / Direct Customer
                        </button>
                    </div>

                    {custModalTab === 'existing' ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search customer by name, phone number, or code..."
                                    value={tempCustSearch}
                                    onChange={(e) => setTempCustSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/40">
                                {modalCustomerSuggestions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-xs">
                                        No matching customers found. You can switch to the &quot;Walk-in / Direct Customer&quot; tab to enter details directly.
                                    </div>
                                ) : (
                                    modalCustomerSuggestions.map((c) => {
                                        const phone = c.primaryContact?.phone || c.billingAddress?.phone || '';
                                        const isSelected = selectedCustomer?._id === c._id;
                                        return (
                                            <div
                                                key={c._id}
                                                onClick={() => handleApplyExistingCustomer(c)}
                                                className={`p-3 hover:bg-blue-50/80 cursor-pointer transition flex items-center justify-between gap-3 ${
                                                    isSelected ? 'bg-blue-50/90 border-l-4 border-blue-600' : ''
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-bold text-gray-900 truncate">
                                                            {c.displayName || c.companyName}
                                                        </h4>
                                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                                                            {c.customerCode}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded flex items-center gap-0.5">
                                                                <CheckCircle2 size={10} /> Currently Selected
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                                                        {phone && (
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Phone size={11} className="text-gray-400" /> {phone}
                                                            </span>
                                                        )}
                                                        {c.primaryContact?.email && (
                                                            <span className="flex items-center gap-1 truncate">
                                                                <Mail size={11} className="text-gray-400" /> {c.primaryContact.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {c.currentBalance !== undefined && c.currentBalance > 0 && (
                                                        <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                                            Outstanding Balance: {fmt(c.currentBalance)}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApplyExistingCustomer(c);
                                                    }}
                                                    className="bg-white hover:bg-blue-600 hover:text-white border-blue-300 text-blue-700 text-xs shrink-0"
                                                >
                                                    Select for {docTypeLabel}
                                                </Button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                                Enter the customer details for this {docTypeLower}. This will attach them directly to this {docTypeLower} without creating a permanent record in the customer database.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Customer Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Kasun Perera / ABC Logistics"
                                        value={tempCustName}
                                        onChange={(e) => setTempCustName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 0771234567"
                                        value={tempCustPhone}
                                        onChange={(e) => setTempCustPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Email Address (Optional)
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="e.g. customer@example.com"
                                        value={tempCustEmail}
                                        onChange={(e) => setTempCustEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Billing / Contact Address (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 123 Colombo Road, Kandy"
                                        value={tempCustAddress}
                                        onChange={(e) => setTempCustAddress(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddCustomerModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleApplyManualCustomer}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                >
                                    <UserPlus size={15} className="mr-1.5" />
                                    Add Customer to {docTypeLabel}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Modal: Add Item to Invoice */}
            <Modal
                isOpen={isAddItemModalOpen}
                onClose={() => {
                    setIsAddItemModalOpen(false);
                    setEditingIndex(null);
                    setModalItem(defaultItemState);
                }}
                title={editingIndex !== null ? `Edit Item #${editingIndex + 1}` : `Add Item to ${docTypeLabel}`}
                size="xl"
            >
                <div className="space-y-4">
                    {/* Catalog Product Selection - Quick Fill Card */}
                    <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/30 border border-blue-200/80 rounded-xl p-3 sm:p-3.5 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider">
                                <Layers size={14} className="text-blue-600" />
                                Select Product from Catalog
                            </span>
                            <span className="text-[11px] text-blue-600/80 font-medium hidden sm:inline">
                                Auto-fills details, description & standard pricing
                            </span>
                        </div>
                        <SearchableSelect
                            placeholder="Type to search catalog product..."
                            options={productOptions}
                            value={modalItem.productId || ''}
                            onChange={(e) => updateModalItem('productId', e.target.value)}
                        />
                    </div>

                    {/* Item Name & Translation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                Item Name / Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Repair Works / Lorry Door Reconstruction"
                                value={modalItem.productName}
                                onChange={(e) => updateModalItem('productName', e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-gray-700">
                                    Translation (Sinhala / Tamil)
                                </label>
                                <button
                                    type="button"
                                    onClick={handleTranslateModalItem}
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition cursor-pointer"
                                >
                                    <Sparkles size={11} className="text-blue-500" />
                                    Translate
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="සිංහල / தமிழ் නම"
                                value={modalItem.productTranslation || ''}
                                onChange={(e) => updateModalItem('productTranslation', e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-gray-400 font-sans"
                            />
                        </div>
                    </div>

                    {/* Detailed Specifications / Multiline Description */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-gray-700">
                                Detailed Description / Specifications
                            </label>
                            <span className="text-[11px] text-gray-400">
                                Multiline scope of work
                            </span>
                        </div>
                        <textarea
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg text-xs leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-sans placeholder:text-gray-400"
                            placeholder="Specifications or repair scope (e.g. 01. Side shutter replacement&#10;02. Waterproof rubber bead fitting...)"
                            value={modalItem.description || ''}
                            onChange={(e) => updateModalItem('description', e.target.value)}
                        />
                    </div>

                    {/* Pricing, Quantity & Calculations Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Calculator size={13} className="text-slate-600" />
                            Pricing & Calculations
                        </div>

                        {/* 4 Financial Inputs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    value={modalItem.quantity}
                                    onChange={(e) => updateModalItem('quantity', e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Unit of Measure
                                </label>
                                <input
                                    type="text"
                                    placeholder="pcs / set / kg"
                                    value={modalItem.unitOfMeasure || 'pcs'}
                                    onChange={(e) => updateModalItem('unitOfMeasure', e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Unit Price (LKR) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={modalItem.unitPrice}
                                    onChange={(e) => updateModalItem('unitPrice', e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Discount / Unit (LKR)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={modalItem.discount || ''}
                                    onChange={(e) => updateModalItem('discount', e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white font-mono font-semibold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Tax Switch & Live Line Total Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={modalItem.taxable}
                                        onChange={(e) => updateModalItem('taxable', e.target.checked)}
                                        className="rounded text-blue-600 h-4 w-4 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span>Apply Tax</span>
                                </label>

                                {modalItem.taxable && (
                                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1 shadow-2xs">
                                        <span className="text-xs text-gray-500 font-medium">Rate:</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={modalItem.taxRate}
                                            onChange={(e) => updateModalItem('taxRate', e.target.value)}
                                            className="w-12 text-xs font-mono font-bold text-right outline-none bg-transparent"
                                        />
                                        <span className="text-xs text-gray-400 font-bold">%</span>
                                    </div>
                                )}
                            </div>

                            {/* Line Total Badge */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-2xs">
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Line Total</div>
                                    <div className="text-base font-extrabold font-mono text-emerald-700">
                                        {fmt(
                                            Math.max(
                                                0,
                                                (+modalItem.quantity || 0) * (+modalItem.unitPrice || 0) -
                                                    Math.min(
                                                        (+modalItem.quantity || 0) * (+modalItem.unitPrice || 0),
                                                        (+modalItem.discount || 0) * (+modalItem.quantity || 0)
                                                    )
                                            ) * (1 + (modalItem.taxable ? (+modalItem.taxRate || 0) / 100 : 0))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                            Currently <strong>{items.length}</strong> {items.length === 1 ? 'item' : 'items'} in this {docTypeLower}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddItemModalOpen(false);
                                    setEditingIndex(null);
                                    setModalItem(defaultItemState);
                                }}
                            >
                                Close
                            </Button>
                            {editingIndex === null ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleAddItemFromModal(true)}
                                        className="bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700 font-semibold text-xs"
                                    >
                                        <Plus size={14} className="mr-1" />
                                        Add & Add Another
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => handleAddItemFromModal(false)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                                    >
                                        <CheckCircle2 size={14} className="mr-1.5" />
                                        Add to {docTypeLabel}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => handleAddItemFromModal(false)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                                >
                                    <CheckCircle2 size={14} className="mr-1.5" />
                                    Update Item #{editingIndex + 1}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}