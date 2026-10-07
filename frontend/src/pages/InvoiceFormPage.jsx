import { useState, useMemo, useEffect, useRef } from 'react';
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
import CreatableCombobox from '../components/ui/CreatableCombobox';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { masterDataApi } from '../features/masterData/masterDataApi';
import { useCreateInvoice } from '../features/invoices/useInvoices';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { getDocumentEditHistory, formatEditItem } from '../utils/editHistoryUtils';

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
    const { user } = useAuthStore();
    const editInvoiceId = searchParams.get('edit');
    const [existingInvoice, setExistingInvoice] = useState(null);

    // Document Type: 'invoice' | 'quotation' | 'estimate'
    const initialDocType = searchParams.get('type') || 'invoice';
    const [docType, setDocType] = useState(initialDocType);

    useEffect(() => {
        const t = searchParams.get('type');
        if (t && ['invoice', 'quotation', 'estimate'].includes(t)) {
            setDocType(t);
        }
    }, [searchParams]);

    useEffect(() => {
        if (editInvoiceId) {
            if (user && user.role !== 'admin') {
                toast.error('Only administrators are authorized to edit invoices');
                navigate('/invoices');
                return;
            }
            api.get(`/invoices/${editInvoiceId}?_t=${Date.now()}`)
                .then(res => {
                    const inv = res.data?.data;
                    if (!inv) return;
                    setExistingInvoice(inv);
                    setDocType('invoice');
                    if (inv.invoiceType) setInvoiceType(inv.invoiceType);
                    if (inv.invoiceDate) setInvoiceDate(new Date(inv.invoiceDate).toISOString().split('T')[0]);
                    if (inv.dueDate) setDueDate(new Date(inv.dueDate).toISOString().split('T')[0]);

                    if (inv.customerId) {
                        setCustomerId(inv.customerId?._id || inv.customerId);
                        setSelectedCustomer(inv.customerId);
                    }
                    if (inv.customerSnapshot?.name) setCustomerSearch(inv.customerSnapshot.name);
                    if (inv.customerSnapshot?.contactName) setCustomerPhone(inv.customerSnapshot.contactName);
                    if (inv.customerPhone) setCustomerPhone(inv.customerPhone);
                    if (inv.customerEmail) setCustomerEmail(inv.customerEmail);
                    if (inv.customerAddress || inv.billingAddress?.line1) setCustomerAddress(inv.customerAddress || inv.billingAddress?.line1);
                    if (inv.whatsappNum || inv.customerSnapshot?.whatsappNum) setCustomerWhatsapp(inv.whatsappNum || inv.customerSnapshot?.whatsappNum);
                    if (inv.vatNumber || inv.customerSnapshot?.vatNumber || inv.customerSnapshot?.taxRegistrationNumber) setCustomerVatNumber(inv.vatNumber || inv.customerSnapshot?.vatNumber || inv.customerSnapshot?.taxRegistrationNumber);
                    if (inv.brNumber || inv.customerSnapshot?.brNumber) setCustomerBrNumber(inv.brNumber || inv.customerSnapshot?.brNumber);
                    if (inv.idNumber || inv.customerSnapshot?.idNumber) setCustomerIdNumber(inv.idNumber || inv.customerSnapshot?.idNumber);
                    if (inv.salesRep || inv.customerSnapshot?.salesRep) setCustomerSalesRep(inv.salesRep || inv.customerSnapshot?.salesRep);

                    if (inv.vehicleNo || inv.vehicleModel || inv.insuranceCompany || inv.numberPlateImage || inv.lorryBodyImage || (inv.photos && inv.photos.length > 0)) {
                        setIncludeVehicleDetails(true);
                    }
                    if (inv.vehicleNo) setVehicleNo(inv.vehicleNo);
                    if (inv.vehicleModel) setVehicleModel(inv.vehicleModel);
                    if (inv.insuranceCompany) setInsuranceCompany(inv.insuranceCompany);
                    if (inv.jobCaption) setJobCaption(inv.jobCaption);
                    if (inv.numberPlateImage) setNumberPlateImage(inv.numberPlateImage);
                    if (inv.lorryBodyImage) setLorryBodyImage(inv.lorryBodyImage);
                    if (inv.photos) setPhotos(inv.photos);

                    if (inv.remarks) setRemarks(inv.remarks);
                    if (inv.conditionOfPayments) setConditionOfPayments(inv.conditionOfPayments);
                    if (inv.completionOfWork) setCompletionOfWork(inv.completionOfWork);
                    if (inv.validityQuotation) setValidityQuotation(inv.validityQuotation);
                    if (inv.warrantyCondition) setWarrantyCondition(inv.warrantyCondition);

                    if (inv.showAdvanceOnInvoice || (inv.advanceAmount > 0)) {
                        setShowAdvance(true);
                        setAdvancePercentage(inv.advancePercentage || 0);
                        setAdvanceAmount(inv.advanceAmount || 0);
                    }
                    if (inv.shippingCost) setShippingCost(inv.shippingCost);
                    if (inv.notes) setNotes(inv.notes);
                    if (inv.paymentInstructions) setPaymentInstructions(inv.paymentInstructions);

                    if (Array.isArray(inv.items) && inv.items.length > 0) {
                        setItems(inv.items.map(it => ({
                            productId: it.productId?._id || it.productId || '',
                            productCode: it.productCode || '',
                            productName: it.productName || '',
                            productTranslation: it.productTranslation || '',
                            description: it.description || '',
                            quantity: it.quantity || 1,
                            unitOfMeasure: it.unitOfMeasure || 'pcs',
                            unitPrice: it.unitPrice || 0,
                            discount: it.discount || 0,
                            taxRate: it.taxRate || 0,
                            taxable: it.taxable !== false,
                        })));
                    }
                })
                .catch(() => {
                    toast.error('Failed to load invoice for editing');
                });
        }
    }, [editInvoiceId, user, navigate]);

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
    const [customerWhatsapp, setCustomerWhatsapp] = useState('');
    const [customerVatNumber, setCustomerVatNumber] = useState('');
    const [customerBrNumber, setCustomerBrNumber] = useState('');
    const [customerIdNumber, setCustomerIdNumber] = useState('');
    const [customerSalesRep, setCustomerSalesRep] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    // Temporary fields for Add Customer Modal
    const [custModalTab, setCustModalTab] = useState('existing'); // 'existing' | 'direct'
    const [tempCustSearch, setTempCustSearch] = useState('');
    const [tempCustName, setTempCustName] = useState('');
    const [tempCustPhone, setTempCustPhone] = useState('');
    const [tempCustEmail, setTempCustEmail] = useState('');
    const [tempCustWhatsapp, setTempCustWhatsapp] = useState('');
    const [tempCustVatNumber, setTempCustVatNumber] = useState('');
    const [tempCustBrNumber, setTempCustBrNumber] = useState('');
    const [tempCustAddress, setTempCustAddress] = useState('');
    const [tempCustIdNumber, setTempCustIdNumber] = useState('');
    const [tempCustSalesRep, setTempCustSalesRep] = useState('');
    const [modalItem, setModalItem] = useState(defaultItemState);

    // Keyboard navigation refs for Add Item modal (C# fast desktop style)
    const catalogSelectTriggerRef = useRef(null);
    const productNameInputRef = useRef(null);
    const productTranslationInputRef = useRef(null);
    const descriptionInputRef = useRef(null);
    const quantityInputRef = useRef(null);
    const unitPriceInputRef = useRef(null);
    const discountInputRef = useRef(null);
    const taxableInputRef = useRef(null);
    const taxRateInputRef = useRef(null);
    const addAnotherBtnRef = useRef(null);
    const addItemBtnRef = useRef(null);

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
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

    // Optional Vehicle details toggle for Invoice
    const [includeVehicleDetails, setIncludeVehicleDetails] = useState(false);

    const [showAdvance, setShowAdvance] = useState(false);
    const [advancePercentage, setAdvancePercentage] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);

    // Global keyboard shortcut: F2 or Insert to open Add Item modal
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.key === 'F2' || (e.key === 'Insert' && !e.shiftKey)) && !isAddItemModalOpen && !isAddCustomerModalOpen && !isVehicleModalOpen) {
                e.preventDefault();
                setEditingIndex(null);
                setModalItem(defaultItemState);
                setIsAddItemModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isAddItemModalOpen, isAddCustomerModalOpen, isVehicleModalOpen]);

    // Auto-focus first input when Add Item modal opens
    useEffect(() => {
        if (isAddItemModalOpen) {
            const timer = setTimeout(() => {
                if (editingIndex !== null) {
                    productNameInputRef.current?.focus();
                    productNameInputRef.current?.select();
                } else {
                    catalogSelectTriggerRef.current?.focus();
                }
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [isAddItemModalOpen, editingIndex]);

    // Helper to safely focus and select input element
    const focusAndSelect = (element) => {
        if (!element) return;
        element.focus();
        if (element.select && typeof element.select === 'function') {
            element.select();
        }
    };

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

    const { data: vehicleModelsData } = useQuery({
        queryKey: ['vehicle-models', 'all'],
        queryFn: () => masterDataApi.getVehicleModels(),
    });
    const { data: insuranceData } = useQuery({
        queryKey: ['insurance-companies', 'all'],
        queryFn: () => masterDataApi.getInsuranceCompanies(),
    });

    const vehicleModelOptions = useMemo(() => {
        const list = Array.isArray(vehicleModelsData?.data) ? vehicleModelsData.data : (Array.isArray(vehicleModelsData) ? vehicleModelsData : []);
        return list.map(m => ({ value: m.name, label: m.name }));
    }, [vehicleModelsData]);

    const insuranceCompanyOptions = useMemo(() => {
        const list = Array.isArray(insuranceData?.data) ? insuranceData.data : (Array.isArray(insuranceData) ? insuranceData : []);
        return list.map(c => ({ value: c.name, label: c.name }));
    }, [insuranceData]);

    const handleCreateVehicleModel = async (name) => {
        try {
            const res = await masterDataApi.createVehicleModel({ name });
            queryClient.invalidateQueries({ queryKey: ['vehicle-models'] });
            toast.success(`Vehicle model "${name}" saved to master data!`);
            return res?.data;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save vehicle model');
            throw err;
        }
    };

    const handleCreateInsuranceCompany = async (name) => {
        try {
            const res = await masterDataApi.createInsuranceCompany({ name });
            queryClient.invalidateQueries({ queryKey: ['insurance-companies'] });
            toast.success(`Insurance company "${name}" saved to master data!`);
            return res?.data;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save insurance company');
            throw err;
        }
    };

    const { data: nextNumberData } = useQuery({
        queryKey: ['next-document-number', docType, invoiceType],
        queryFn: () => masterDataApi.getNextDocumentNumber(
            docType === 'invoice' ? (invoiceType === 'proforma' ? 'proforma' : 'invoice') : docType
        ),
    });
    const autoGeneratedDocId = nextNumberData?.nextNumber || '';

    // Terms & Conditions Change Tracking
    const [initialTerms, setInitialTerms] = useState(null);
    const [isConfirmTermsModalOpen, setIsConfirmTermsModalOpen] = useState(false);

    useEffect(() => {
        if (!initialTerms) {
            setInitialTerms({
                remarks,
                conditionOfPayments,
                completionOfWork,
                validityQuotation,
                warrantyCondition,
            });
        }
    }, [initialTerms, remarks, conditionOfPayments, completionOfWork, validityQuotation, warrantyCondition]);

    const isTermsModified = useMemo(() => {
        if (!initialTerms) return false;
        return (
            remarks !== initialTerms.remarks ||
            conditionOfPayments !== initialTerms.conditionOfPayments ||
            completionOfWork !== initialTerms.completionOfWork ||
            validityQuotation !== initialTerms.validityQuotation ||
            warrantyCondition !== initialTerms.warrantyCondition
        );
    }, [initialTerms, remarks, conditionOfPayments, completionOfWork, validityQuotation, warrantyCondition]);

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
        setCustomerEmail(cust.primaryContact?.email || '');
        setCustomerAddress(cust.billingAddress?.line1 || cust.primaryAddress?.line1 || '');
        setCustomerWhatsapp(cust.primaryContact?.mobile || cust.primaryContact?.phone || cust.whatsappNumber || '');
        setCustomerVatNumber(cust.taxRegistrationNumber || '');
        setCustomerBrNumber(cust.businessRegistrationNumber || '');
        setCustomerIdNumber(cust.idNumber || '');
        setCustomerSalesRep(cust.assignedSalesRep?._id || cust.assignedSalesRep || '');
        if (cust.introducer) {
            setIntroducer(cust.introducer);
            setIntroducerName(cust.introducerName || '');
        } else {
            setIntroducer('');
            setIntroducerName('');
        }
        setIsCustomerDropdownOpen(false);
    };

    const openCustomerModal = () => {
        setTempCustSearch('');
        if (selectedCustomer) {
            setCustModalTab('existing');
        } else if (customerSearch.trim()) {
            setCustModalTab('direct');
            setTempCustName(customerSearch);
            setTempCustPhone(customerPhone);
            setTempCustEmail(customerEmail);
            setTempCustAddress(customerAddress);
            setTempCustWhatsapp(customerWhatsapp);
            setTempCustVatNumber(customerVatNumber);
            setTempCustBrNumber(customerBrNumber);
            setTempCustIdNumber(customerIdNumber);
            setTempCustSalesRep(customerSalesRep);
        } else {
            setCustModalTab('existing');
            setTempCustName('');
            setTempCustPhone('');
            setTempCustEmail('');
            setTempCustAddress('');
            setTempCustWhatsapp('');
            setTempCustVatNumber('');
            setTempCustBrNumber('');
            setTempCustIdNumber('');
            setTempCustSalesRep('');
        }
        setIsAddCustomerModalOpen(true);
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

    const handleApplyManualCustomer = async () => {
        if (!tempCustName.trim()) {
            toast.error('Customer Name is required');
            return;
        }

        let savedCustomer = null;
        try {
            const payload = {
                displayName: tempCustName.trim(),
                companyName: tempCustName.trim(),
                businessRegistrationNumber: tempCustBrNumber.trim() || undefined,
                taxRegistrationNumber: tempCustVatNumber.trim() || undefined,
                idNumber: tempCustIdNumber.trim() || undefined,
                primaryContact: {
                    name: tempCustName.trim(),
                    phone: tempCustPhone.trim() || undefined,
                    mobile: tempCustWhatsapp.trim() || undefined,
                    email: tempCustEmail.trim() || undefined,
                },
                billingAddress: {
                    line1: tempCustAddress.trim() || undefined,
                },
                assignedSalesRep: tempCustSalesRep || undefined,
            };
            const { data: res } = await api.post('/customers', payload);
            if (res?.data) {
                savedCustomer = res.data;
                await queryClient.invalidateQueries({ queryKey: ['customers'] });
            }
        } catch (err) {
            console.warn('Customer DB registration notice:', err?.response?.data?.message || err.message);
        }

        if (savedCustomer) {
            handleSelectCustomer(savedCustomer);
        } else {
            setSelectedCustomer(null);
            setCustomerId('');
            setCustomerSearch(tempCustName.trim());
            setCustomerPhone(tempCustPhone.trim());
            setCustomerEmail(tempCustEmail.trim());
            setCustomerAddress(tempCustAddress.trim());
            setCustomerWhatsapp(tempCustWhatsapp.trim());
            setCustomerVatNumber(tempCustVatNumber.trim());
            setCustomerBrNumber(tempCustBrNumber.trim());
            setCustomerIdNumber(tempCustIdNumber.trim());
            setCustomerSalesRep(tempCustSalesRep);
        }

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
            productNameInputRef.current?.focus();
            return false;
        }
        const q = +modalItem.quantity;
        if (!q || q <= 0) {
            toast.error('Quantity must be greater than 0');
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
            return false;
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
            return true;
        } else {
            setItems((prev) => [...prev, { ...modalItem }]);
            toast.success(`Item #${items.length + 1} "${modalItem.productName}" added to ${docTypeLower}!`);
            setModalItem(defaultItemState);
            if (!addAnother) {
                setIsAddItemModalOpen(false);
            } else {
                setTimeout(() => {
                    catalogSelectTriggerRef.current?.focus();
                }, 60);
            }
            return true;
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
                const invoicePayload = {
                    customerId: customerId || undefined,
                    customerName: finalCustomerName,
                    customerPhone: customerPhone || undefined,
                    customerEmail: customerEmail || undefined,
                    customerAddress: customerAddress || (selectedCustomer?.primaryAddress?.line1 ? `${selectedCustomer.primaryAddress.line1}${selectedCustomer.primaryAddress.city ? ', ' + selectedCustomer.primaryAddress.city : ''}` : undefined),
                    whatsappNum: customerWhatsapp || undefined,
                    vatNumber: customerVatNumber || undefined,
                    brNumber: customerBrNumber || undefined,
                    idNumber: customerIdNumber || undefined,
                    salesRep: customerSalesRep || undefined,
                    customerSnapshot: {
                        name: finalCustomerName,
                        code: selectedCustomer?.customerCode,
                        taxRegistrationNumber: customerVatNumber || selectedCustomer?.taxRegistrationNumber,
                        contactName: finalCustomerName,
                        vatNumber: customerVatNumber || undefined,
                        brNumber: customerBrNumber || undefined,
                        idNumber: customerIdNumber || undefined,
                        whatsappNum: customerWhatsapp || undefined,
                        salesRep: customerSalesRep || undefined,
                    },
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
                    remarks: remarks || undefined,
                    conditionOfPayments: conditionOfPayments || undefined,
                    completionOfWork: completionOfWork || undefined,
                    validityQuotation: validityQuotation || undefined,
                    warrantyCondition: warrantyCondition || undefined,
                    paymentInstructions: paymentInstructions || undefined,
                    status: existingInvoice?.status || 'approved',
                    // Vehicle & Workshop metadata (included only when enabled)
                    vehicleNo: includeVehicleDetails ? (vehicleNo.trim() || undefined) : undefined,
                    vehicleModel: includeVehicleDetails ? (vehicleModel.trim() || undefined) : undefined,
                    vehicleOwner: includeVehicleDetails ? (finalCustomerName || undefined) : undefined,
                    insuranceCompany: includeVehicleDetails ? (insuranceCompany.trim() || undefined) : undefined,
                    jobCaption: includeVehicleDetails ? (jobCaption.trim() || undefined) : undefined,
                    numberPlateImage: includeVehicleDetails ? (numberPlateImage || undefined) : undefined,
                    lorryBodyImage: includeVehicleDetails ? (lorryBodyImage || undefined) : undefined,
                    photos: includeVehicleDetails ? photos : [],
                };

                if (editInvoiceId) {
                    if (user?.role !== 'admin') {
                        toast.error('Only administrators are authorized to edit invoices');
                        return;
                    }
                    const { data: res } = await api.put(`/invoices/${editInvoiceId}`, invoicePayload);
                    if (res?.data) {
                        queryClient.setQueryData(['invoice', editInvoiceId], res);
                    }
                    await queryClient.invalidateQueries({ queryKey: ['invoice'] });
                    await queryClient.invalidateQueries({ queryKey: ['invoices'] });
                    await queryClient.invalidateQueries({ queryKey: ['invoicesAging'] });
                    toast.success(`Invoice ${existingInvoice?.invoiceNumber || ''} updated successfully!`);
                    navigate(`/invoices/${editInvoiceId}`);
                } else {
                    const result = await createMutation.mutateAsync(invoicePayload);
                    toast.success('Invoice created successfully!');
                    navigate(`/invoices/${result.data._id}`);
                }
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
                    whatsappNum: customerWhatsapp || undefined,
                    vatNumber: customerVatNumber || undefined,
                    brNumber: customerBrNumber || undefined,
                    idNumber: customerIdNumber || undefined,
                    salesRep: customerSalesRep || undefined,
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
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-700/60">
                <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span>{docType === 'invoice' ? 'Invoice Items' : `${docTypeLabel} Items`}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            docType === 'estimate'
                                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/70'
                                : docType === 'quotation'
                                ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-700/70'
                                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-700/70'
                        }`}>
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
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
                    title="Press F2 anywhere to quickly add item"
                >
                    <Plus size={14} className="mr-1" />
                    <span>Add Item</span>
                    <kbd className="ml-1.5 px-1.5 py-0.5 bg-emerald-800/40 rounded text-[10px] font-mono border border-emerald-400/40 font-bold">
                        F2
                    </kbd>
                </Button>
            </div>

            {items.length === 0 ? null : (
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
                                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                                        : 'border-gray-200 dark:border-slate-700/80 bg-white dark:bg-[#16253b] hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-xs'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <span className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                                            isBeingEdited
                                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700/70'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                                                    Item #{idx + 1}
                                                </span>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                    {item.productName}
                                                </h4>
                                                {item.productTranslation && (
                                                    <span className="text-xs text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded font-sans">
                                                        {item.productTranslation}
                                                    </span>
                                                )}
                                                {item.productCode && (
                                                    <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500">
                                                        ({item.productCode})
                                                    </span>
                                                )}
                                            </div>

                                            {item.description && (
                                                <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 whitespace-pre-wrap break-words bg-gray-50 dark:bg-slate-900/60 p-2 rounded border border-gray-100 dark:border-slate-800 max-h-[22.5em] overflow-y-auto">
                                                    {item.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                                                <span>
                                                    Qty: <strong className="text-gray-800 dark:text-slate-200 font-mono">{item.quantity}</strong> {item.unitOfMeasure || 'pcs'}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Unit Price: <strong className="text-gray-800 dark:text-slate-200 font-mono">{fmt(item.unitPrice)}</strong>
                                                </span>
                                                {d > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-red-600 dark:text-red-400 font-mono">
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
                                            <span className="text-xs text-gray-400 dark:text-slate-500 block">Total</span>
                                            <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
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
                                                        : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                                                }`}
                                                title="Edit item"
                                            >
                                                <Edit2 size={14} />
                                                <span className="hidden sm:inline">Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 rounded text-xs flex items-center gap-1 font-medium transition"
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
            <div className="bg-white dark:bg-[#111F33] p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 dark:border-slate-700/80 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">Type:</span>
                    <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl border border-gray-200/80 dark:border-slate-700 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => { setDocType('invoice'); setSearchParams({ type: 'invoice' }); }}
                            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                docType === 'invoice'
                                    ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white'
                                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
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
                                    ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white'
                                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
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
                                    ? 'bg-amber-600 text-white shadow-sm dark:bg-amber-600 dark:text-white'
                                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <ClipboardList size={14} />
                            Estimate
                        </button>
                    </div>

                    {/* Auto-Generated or Existing Document ID Display */}
                    <div className="flex flex-wrap items-center gap-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-800/60 px-3.5 py-1.5 rounded-xl shadow-2xs">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider leading-none">
                                {existingInvoice ? (existingInvoice.invoiceType === 'proforma' ? 'Editing Proforma' : 'Editing Invoice') : docType === 'invoice' ? (invoiceType === 'proforma' ? 'Proforma ID' : 'Invoice ID') : docType === 'estimate' ? 'Estimate ID' : 'Quotation ID'}
                            </span>
                            <span className="font-mono font-bold text-xs text-blue-950 dark:text-blue-100 mt-0.5">
                                {existingInvoice ? existingInvoice.invoiceNumber : (docType !== 'invoice' && quoteNumber.trim() ? quoteNumber : (autoGeneratedDocId || 'Generating...'))}
                            </span>
                        </div>
                        {existingInvoice && (() => {
                            const h = getDocumentEditHistory(existingInvoice);
                            return h.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1 border-l border-blue-200 dark:border-blue-800 pl-2">
                                    <span className="text-[10px] font-black text-red-600 dark:text-red-400 bg-red-100/90 dark:bg-red-950/60 border border-red-300 dark:border-red-800 px-1.5 py-0.5 rounded font-mono">
                                        {formatEditItem(h[h.length - 1], h.length)}
                                    </span>
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>

                {/* Inline Invoice / Quote Date & Expiry / Type Controls */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                    {/* Vehicle & Photo details button (placed to the LEFT side of Date, highly visible) */}
                    <button
                        type="button"
                        onClick={() => setIsVehicleModalOpen(true)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs select-none active:scale-95 ${
                            vehicleNo || vehicleModel || insuranceCompany || jobCaption || numberPlateImage || lorryBodyImage || (photos && photos.length > 0)
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 border border-blue-700'
                                : 'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-2 border-blue-400 dark:border-blue-700 shadow-2xs'
                        }`}
                        title="Add or Edit Vehicle & Photo Details"
                    >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            vehicleNo || vehicleModel || insuranceCompany || jobCaption || numberPlateImage || lorryBodyImage || (photos && photos.length > 0)
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-600 text-white shadow-2xs'
                        }`}>
                            <Truck size={12} />
                        </div>
                        <span className="whitespace-nowrap font-semibold">
                            {vehicleNo ? vehicleNo : '+ Vehicle & Photos'}
                        </span>
                        {((numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + (photos?.length || 0)) > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                vehicleNo
                                    ? 'bg-amber-400 text-slate-900'
                                    : 'bg-blue-600 text-white'
                            }`}>
                                {(numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + (photos?.length || 0)}
                            </span>
                        )}
                    </button>

                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100/80 dark:hover:bg-slate-700/80 transition-colors px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-slate-700">
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">
                            {docType === 'invoice' ? 'Invoice Date:' : docType === 'quotation' ? 'Quote Date:' : 'Estimate Date:'}
                        </label>
                        <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            className="bg-transparent border-0 text-xs font-semibold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-0 p-0 cursor-pointer"
                        />
                    </div>

                    {docType !== 'invoice' && (
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100/80 dark:hover:bg-slate-700/80 transition-colors px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-slate-700">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                Valid Until:
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="bg-transparent border-0 text-xs font-semibold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-0 p-0 cursor-pointer"
                            />
                        </div>
                    )}

                    {docType === 'invoice' && (
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100/80 dark:hover:bg-slate-700/80 transition-colors px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-slate-700">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">Type:</label>
                            <select
                                value={invoiceType}
                                onChange={(e) => setInvoiceType(e.target.value)}
                                className="bg-transparent border-0 text-xs font-semibold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-0 p-0 cursor-pointer pr-2 [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-gray-900 [&>option]:dark:text-white"
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
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Notes & Terms</h3>
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
                            {/* PARTS & LABOUR CHARGES (Items Card) */}
                            {renderItemsCard()}

                            {/* DOCUMENT TERMS & CONDITIONS Card (Always Visible) */}
                            <div className="bg-slate-50 dark:bg-[#111F33] rounded-2xl border border-gray-200/90 dark:border-slate-700/80 shadow-xs transition-all overflow-hidden">
                                <div className="p-4 sm:p-5 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/60 dark:border-slate-700/60">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0">
                                            <FileText size={15} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                                                Document Terms &amp; Conditions
                                            </span>
                                            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                                Customize remarks, payment condition, validity &amp; warranty
                                            </p>
                                        </div>
                                    </div>

                                    {/* Appears ONLY when Terms & Conditions are modified */}
                                    {isTermsModified && (
                                        <div className="flex items-center gap-2 animate-in fade-in">
                                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                                Modified
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRemarks(initialTerms.remarks);
                                                    setConditionOfPayments(initialTerms.conditionOfPayments);
                                                    setCompletionOfWork(initialTerms.completionOfWork);
                                                    setValidityQuotation(initialTerms.validityQuotation);
                                                    setWarrantyCondition(initialTerms.warrantyCondition);
                                                    toast('Terms changes reverted', { icon: '↩️' });
                                                }}
                                                className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-slate-800 rounded-lg transition"
                                            >
                                                Cancel
                                            </button>
                                            <Button
                                                type="button"
                                                variant="primary"
                                                size="sm"
                                                onClick={() => setIsConfirmTermsModalOpen(true)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs px-3 py-1.5"
                                            >
                                                <Save size={13} className="mr-1" />
                                                Save Terms &amp; Conditions
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 sm:p-5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                                                Remarks
                                            </label>
                                            <textarea
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                placeholder="Remarks to appear under line items..."
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                                                Condition of Payments
                                            </label>
                                            <textarea
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                placeholder="e.g. a). 0% Advance Payment with the firm Order.&#10;b). Balance Payment on Completion of Work"
                                                value={conditionOfPayments}
                                                onChange={(e) => setConditionOfPayments(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                                                Completion of Work
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                placeholder="e.g. 4 to 6 working Days after the Order Confirmation."
                                                value={completionOfWork}
                                                onChange={(e) => setCompletionOfWork(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                                                Validity ({docTypeLabel})
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                placeholder="e.g. 30 Working Days From the Issued Date.."
                                                value={validityQuotation}
                                                onChange={(e) => setValidityQuotation(e.target.value)}
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                                                Warranty
                                            </label>
                                            <textarea
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                                placeholder="e.g. a). Please See the Description..&#10;b). Warranty Will be Issued with the Invoice."
                                                value={warrantyCondition}
                                                onChange={(e) => setWarrantyCondition(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Workshop Notes Card */}
                            <Card className="p-6">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Notes &amp; Internal Reference</h3>
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
                    <Card className="p-3.5 border-blue-100 dark:border-slate-700/80 shadow-sm">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700/60 mb-2.5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                                    <User size={13} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Customer Details</h3>
                                    <p className="text-[10px] text-gray-400 dark:text-slate-400">Selected client profile</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {selectedCustomer ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                                        <CheckCircle2 size={10} /> {selectedCustomer.customerCode || 'Registered'}
                                    </span>
                                ) : customerSearch.trim() ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        Manual Customer
                                    </span>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={openCustomerModal}
                                    className="text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Add / Select Customer"
                                >
                                    <UserPlus size={12} className="text-white" />
                                    <span>+ Add Customer</span>
                                </button>
                            </div>
                        </div>

                        {selectedCustomer || customerSearch.trim() ? (
                            <div className="space-y-1.5 text-[11px]">
                                <div>
                                    <span className="text-gray-400 dark:text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Customer Name</span>
                                    <p className="font-bold text-gray-900 dark:text-white text-xs truncate">
                                        {selectedCustomer?.displayName || selectedCustomer?.companyName || customerSearch}
                                    </p>
                                    {selectedCustomer?.legalName && selectedCustomer.legalName !== selectedCustomer.displayName && (
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{selectedCustomer.legalName}</p>
                                    )}
                                </div>

                                {(customerPhone || selectedCustomer?.primaryContact?.phone || selectedCustomer?.billingAddress?.phone) && (
                                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                                        <Phone size={11} className="text-blue-500 shrink-0" />
                                        <span className="font-semibold font-mono text-xs">
                                            {customerPhone || selectedCustomer?.primaryContact?.phone || selectedCustomer?.billingAddress?.phone}
                                        </span>
                                    </div>
                                )}

                                {(customerWhatsapp || selectedCustomer?.primaryContact?.mobile) && (
                                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">WA:</span>
                                        <span className="font-semibold font-mono text-xs">
                                            {customerWhatsapp || selectedCustomer?.primaryContact?.mobile}
                                        </span>
                                    </div>
                                )}

                                {(customerEmail || selectedCustomer?.primaryContact?.email) && (
                                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                                        <Mail size={11} className="text-blue-500 shrink-0" />
                                        <span className="truncate text-[10px]">{customerEmail || selectedCustomer?.primaryContact?.email}</span>
                                    </div>
                                )}

                                {(customerVatNumber || selectedCustomer?.taxRegistrationNumber || customerBrNumber || selectedCustomer?.businessRegistrationNumber) && (
                                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-600 dark:text-slate-400 pt-0.5">
                                        {(customerVatNumber || selectedCustomer?.taxRegistrationNumber) && (
                                            <span>VAT: <strong className="font-mono text-gray-800 dark:text-slate-200">{customerVatNumber || selectedCustomer?.taxRegistrationNumber}</strong></span>
                                        )}
                                        {(customerBrNumber || selectedCustomer?.businessRegistrationNumber) && (
                                            <span>BR: <strong className="font-mono text-gray-800 dark:text-slate-200">{customerBrNumber || selectedCustomer?.businessRegistrationNumber}</strong></span>
                                        )}
                                    </div>
                                )}

                                {(customerIdNumber || selectedCustomer?.idNumber) && (
                                    <div className="text-[10px] text-gray-600 dark:text-slate-400">
                                        ID: <strong className="font-mono text-gray-800 dark:text-slate-200">{customerIdNumber || selectedCustomer?.idNumber}</strong>
                                    </div>
                                )}

                                {(customerAddress || selectedCustomer?.primaryAddress?.line1 || selectedCustomer?.billingAddress?.line1) && (
                                    <div className="flex items-start gap-1.5 text-gray-600 dark:text-slate-400 text-[10px]">
                                        <MapPin size={11} className="text-blue-500 shrink-0 mt-0.5" />
                                        <span className="truncate">
                                            {customerAddress || [
                                                selectedCustomer?.primaryAddress?.line1 || selectedCustomer?.billingAddress?.line1,
                                                selectedCustomer?.primaryAddress?.city || selectedCustomer?.billingAddress?.city
                                            ].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}

                                {selectedCustomer?.paymentTerms && (
                                    <div className="pt-1.5 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                                        <span className="text-gray-500 dark:text-slate-400">Payment Terms:</span>
                                        <span className="font-bold text-gray-800 dark:text-slate-200 uppercase">
                                            {selectedCustomer.paymentTerms.type || 'Cash'}
                                            {selectedCustomer.paymentTerms.creditDays ? ` (${selectedCustomer.paymentTerms.creditDays}d)` : ''}
                                        </span>
                                    </div>
                                )}

                                {selectedCustomer?.currentBalance !== undefined && (
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-500 dark:text-slate-400">Outstanding:</span>
                                        <span className={`font-bold ${selectedCustomer.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {fmt(selectedCustomer.currentBalance)}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-1.5 border-t border-gray-100 dark:border-slate-700/60 flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={openCustomerModal}
                                        className="flex-1 text-center text-[10px] text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 py-0.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded font-semibold transition"
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
                                            setCustomerEmail('');
                                            setCustomerAddress('');
                                            setCustomerWhatsapp('');
                                            setCustomerVatNumber('');
                                            setCustomerBrNumber('');
                                            setCustomerIdNumber('');
                                            setCustomerSalesRep('');
                                        }}
                                        className="text-center text-[10px] text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-0.5 border border-dashed border-gray-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 rounded transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={openCustomerModal}
                                className="text-center py-3 px-2 bg-gray-50/80 dark:bg-slate-800/40 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-slate-800/70 transition"
                                title="Click to select or create customer"
                            >
                                <User size={18} className="mx-auto text-gray-400 dark:text-slate-500 mb-0.5" />
                                <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">No Customer Selected</p>
                            </div>
                        )}
                    </Card>

                    {/* Vehicle & Photo Information Card (Right column) */}
                    {(vehicleNo || vehicleModel || insuranceCompany || jobCaption || numberPlateImage || lorryBodyImage || (photos && photos.length > 0)) ? (
                        <Card className="p-3.5 border-blue-100 dark:border-slate-700/80 shadow-sm">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700/60 mb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                                        <Truck size={13} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Vehicle Details</h3>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-400">Attached vehicle &amp; photos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsVehicleModalOpen(true)}
                                        className="text-[10px] font-bold text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition"
                                    >
                                        <Edit2 size={10} /> Edit
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-[11px]">
                                {vehicleNo && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 dark:text-slate-400 text-[10px] uppercase font-bold">Plate No:</span>
                                        <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60 text-xs">
                                            {vehicleNo}
                                        </span>
                                    </div>
                                )}
                                {vehicleModel && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 dark:text-slate-400 text-[10px] uppercase font-bold">Model:</span>
                                        <span className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[170px] text-right">{vehicleModel}</span>
                                    </div>
                                )}
                                {insuranceCompany && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 dark:text-slate-400 text-[10px] uppercase font-bold">Insurance:</span>
                                        <span className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[170px] text-right">{insuranceCompany}</span>
                                    </div>
                                )}
                                {jobCaption && (
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-gray-400 dark:text-slate-400 text-[10px] uppercase font-bold shrink-0">Job Caption:</span>
                                        <span className="font-semibold text-gray-800 dark:text-slate-200 text-right line-clamp-2">{jobCaption}</span>
                                    </div>
                                )}

                                {/* Photo Previews */}
                                {((numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + (photos?.length || 0)) > 0 && (
                                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700/60 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase flex items-center gap-1">
                                                <ImageIcon size={11} /> Photos
                                            </span>
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                                                {(numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + (photos?.length || 0)} attached
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                                            {numberPlateImage && (
                                                <div 
                                                    onClick={() => setIsVehicleModalOpen(true)}
                                                    className="relative group h-12 rounded border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 cursor-pointer"
                                                >
                                                    <img src={numberPlateImage} alt="Plate" className="w-full h-full object-cover" />
                                                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center font-bold">Plate</span>
                                                </div>
                                            )}
                                            {lorryBodyImage && (
                                                <div 
                                                    onClick={() => setIsVehicleModalOpen(true)}
                                                    className="relative group h-12 rounded border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 cursor-pointer"
                                                >
                                                    <img src={lorryBodyImage} alt="Body" className="w-full h-full object-cover" />
                                                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center font-bold">Body</span>
                                                </div>
                                            )}
                                            {photos?.slice(0, numberPlateImage && lorryBodyImage ? 2 : 3).map((p, i) => (
                                                <div 
                                                    key={i} 
                                                    onClick={() => setIsVehicleModalOpen(true)}
                                                    className="relative group h-12 rounded border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 cursor-pointer"
                                                >
                                                    <img src={p} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                                                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center font-bold">#{i+1}</span>
                                                </div>
                                            ))}
                                            {(photos?.length || 0) > (numberPlateImage && lorryBodyImage ? 2 : 3) && (
                                                <div 
                                                    onClick={() => setIsVehicleModalOpen(true)}
                                                    className="h-12 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 flex flex-col items-center justify-center text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                                                >
                                                    <span className="text-xs font-black">+{(photos?.length || 0) - (numberPlateImage && lorryBodyImage ? 2 : 3)}</span>
                                                    <span className="text-[8px] font-bold">more</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-3 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/40 shadow-2xs">
                            <div className="flex items-center gap-2 text-left">
                                <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center">
                                    <Truck size={13} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-700 dark:text-slate-300">Vehicle Details</p>
                                    <p className="text-[9px] text-gray-400 dark:text-slate-500">No vehicle/photos added</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Summary Card (Invoice or Workshop Summary) */}
                    {docType === 'invoice' ? (
                        <Card className="p-4">
                            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2.5 pb-2 border-b border-gray-100 dark:border-slate-700/60">Summary</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Subtotal</span><span className="font-mono text-gray-900 dark:text-white font-semibold">{fmt(totals.sub)}</span></div>
                                {totals.discount > 0 && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400 font-medium">
                                        <span>Discount</span>
                                        <span className="font-mono font-bold">-{fmt(totals.discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600 dark:text-slate-300"><span>Tax</span><span className="font-mono text-gray-900 dark:text-white">{fmt(totals.tax)}</span></div>
                                <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-slate-700/60 font-bold text-xs text-gray-900 dark:text-white">
                                    <span>Total</span><span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm font-mono">{fmt(totals.grand)}</span>
                                </div>

                                {/* Optional Advance Payment */}
                                <div className="pt-2 border-t border-gray-100 dark:border-slate-700/60 space-y-1.5">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700 dark:text-slate-300">
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
                                            className="rounded text-blue-600 h-3.5 w-3.5"
                                        />
                                        <span>Add Advance Payment (Optional)</span>
                                    </label>

                                    {showAdvance && (
                                        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 space-y-1.5 text-[11px]">
                                            <div className="flex justify-between items-center text-gray-700 dark:text-slate-300">
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
                                                    className="w-14 px-1.5 py-0.5 border border-emerald-300 dark:border-emerald-700 rounded text-right font-mono font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs" 
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-gray-700 dark:text-slate-300">
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
                                                    className="w-24 px-1.5 py-0.5 border border-emerald-300 dark:border-emerald-700 rounded text-right font-mono font-bold bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-xs" 
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center font-bold text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
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
                    ) : (
                        /* Workshop Summary Card (Quotation & Estimate - matches Image 2) */
                        <Card className="p-4 sticky top-4 shadow-sm border-gray-200 dark:border-slate-700/80">
                            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-2.5 pb-2 border-b border-gray-100 dark:border-slate-700/60">Summary</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
                                    <span>Items Subtotal</span>
                                    <span className="font-mono text-gray-900 dark:text-white font-bold">{fmt(totals.sub)}</span>
                                </div>

                                <div className="flex justify-between items-center text-gray-700 dark:text-slate-300">
                                    <span>Labor Cost / Workmanship</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-24 px-2 py-0.5 border border-gray-300 dark:border-slate-600 rounded text-right font-mono text-xs bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                                        value={laborCost || ''}
                                        placeholder="0.00"
                                        onChange={(e) => setLaborCost(Number(e.target.value))}
                                    />
                                </div>

                                {totals.discount > 0 && (
                                    <div className="flex justify-between items-center text-red-600 dark:text-red-400 font-medium">
                                        <span>Total Discounts</span>
                                        <span className="font-mono font-bold">-{fmt(totals.discount)}</span>
                                    </div>
                                )}

                                {totals.tax > 0 && (
                                    <div className="flex justify-between items-center text-gray-600 dark:text-slate-300">
                                        <span>Tax</span>
                                        <span className="font-mono font-bold text-gray-900 dark:text-white">{fmt(totals.tax)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-slate-700/60 font-bold text-gray-900 dark:text-white text-xs">
                                    <span>Grand Total</span>
                                    <span className="font-mono text-blue-800 dark:text-blue-300 text-sm font-extrabold">{fmt(totals.grand)}</span>
                                </div>

                                {/* Optional Advance Payment */}
                                <div className="pt-2 border-t border-gray-200 dark:border-slate-700/60 space-y-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700 dark:text-slate-300 select-none">
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
                                            <div className="space-y-1.5 p-2 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                                                <div className="flex justify-between items-center text-xs text-gray-700 dark:text-slate-300">
                                                    <span className="flex items-center gap-1 text-[11px]">
                                                        Advance (%) <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">Auto-calc</span>
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="any"
                                                            placeholder="0"
                                                            className="w-16 px-1.5 py-0.5 border rounded text-right font-mono text-xs bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-bold border-emerald-300 dark:border-emerald-700 focus:outline-none"
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
                                                        <span className="font-bold text-gray-400 dark:text-slate-500 text-[11px]">%</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-xs text-gray-700 dark:text-slate-300">
                                                    <span className="text-[11px]">Advance Amount (LKR)</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 px-1.5 py-0.5 border rounded text-right font-mono text-xs bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-bold border-emerald-300 dark:border-emerald-700 focus:outline-none"
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

                                            <div className="flex justify-between items-center font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
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
                    {/* Radios: Select Ex Customer vs Direct Customer */}
                    <div className="flex items-center gap-6 py-2 px-1 border-b border-gray-200 dark:border-slate-700">
                        <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200 cursor-pointer select-none">
                            <input
                                type="radio"
                                name="customerModalSource"
                                value="existing"
                                checked={custModalTab === 'existing'}
                                onChange={() => setCustModalTab('existing')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Select Ex Customer</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200 cursor-pointer select-none">
                            <input
                                type="radio"
                                name="customerModalSource"
                                value="direct"
                                checked={custModalTab === 'direct'}
                                onChange={() => setCustModalTab('direct')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>Direct Customer</span>
                        </label>
                    </div>

                    {custModalTab === 'existing' ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search customer by name, phone number, or code..."
                                    value={tempCustSearch}
                                    onChange={(e) => setTempCustSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-xl divide-y divide-gray-100 dark:divide-slate-800 bg-gray-50/40 dark:bg-slate-800/40">
                                {modalCustomerSuggestions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-slate-400 text-xs">
                                        No matching customers found. You can switch to &quot;Direct Customer&quot; above to enter details directly.
                                    </div>
                                ) : (
                                    modalCustomerSuggestions.map((c) => {
                                        const phone = c.primaryContact?.phone || c.billingAddress?.phone || '';
                                        const isSelected = selectedCustomer?._id === c._id;
                                        return (
                                            <div
                                                key={c._id}
                                                onClick={() => handleApplyExistingCustomer(c)}
                                                className={`p-3 hover:bg-blue-50/80 dark:hover:bg-slate-800/80 cursor-pointer transition flex items-center justify-between gap-3 ${
                                                    isSelected ? 'bg-blue-50/90 dark:bg-blue-950/70 border-l-4 border-blue-600' : ''
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                            {c.displayName || c.companyName}
                                                        </h4>
                                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded">
                                                            {c.customerCode}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 rounded flex items-center gap-0.5">
                                                                <CheckCircle2 size={10} /> Currently Selected
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                                                        {phone && (
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Phone size={11} className="text-gray-400 dark:text-slate-400" /> {phone}
                                                            </span>
                                                        )}
                                                        {c.primaryContact?.email && (
                                                            <span className="flex items-center gap-1 truncate">
                                                                <Mail size={11} className="text-gray-400 dark:text-slate-400" /> {c.primaryContact.email}
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
                                                    className="bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs shrink-0"
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
                        <div className="space-y-3.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* Row 1: Customer Name & Phone Num */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Customer Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Customer Name"
                                        value={tempCustName}
                                        onChange={(e) => setTempCustName(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Phone Num
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Phone Num"
                                        value={tempCustPhone}
                                        onChange={(e) => setTempCustPhone(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                {/* Row 2: Email & WhatsApp Num */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={tempCustEmail}
                                        onChange={(e) => setTempCustEmail(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        WhatsApp Num
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="WhatsApp Num"
                                        value={tempCustWhatsapp}
                                        onChange={(e) => setTempCustWhatsapp(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                {/* Row 3: VAT Number & BR Number */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        VAT Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="VAT Number"
                                        value={tempCustVatNumber}
                                        onChange={(e) => setTempCustVatNumber(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        BR Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="BR Number"
                                        value={tempCustBrNumber}
                                        onChange={(e) => setTempCustBrNumber(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                {/* Row 4: Billing Address (Wide - Full width across 2 columns) */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Billing Address
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Billing Address"
                                        value={tempCustAddress}
                                        onChange={(e) => setTempCustAddress(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                {/* Row 5: ID Number & Sales Rep */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        ID Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ID Number (NIC / Passport)"
                                        value={tempCustIdNumber}
                                        onChange={(e) => setTempCustIdNumber(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Sales Rep
                                    </label>
                                    <select
                                        value={tempCustSalesRep}
                                        onChange={(e) => setTempCustSalesRep(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors [&>option]:bg-white [&>option]:dark:bg-slate-900 [&>option]:text-gray-900 [&>option]:dark:text-white"
                                    >
                                        <option value="">-- Select Sales Rep (Optional) --</option>
                                        {users.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.firstName} {u.lastName || ''} {u.role ? `(${u.role})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
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
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
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
                size="2xl"
            >
                <div
                    className="space-y-4"
                    onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItemFromModal(editingIndex === null);
                        }
                    }}
                >
                    {/* Catalog Product Selection - Quick Fill Card */}
                    <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/30 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-3 sm:p-3.5 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                                <Layers size={14} className="text-blue-600 dark:text-blue-400" />
                                Select Product from Catalog
                            </span>
                            <span className="text-[11px] text-blue-600/80 dark:text-blue-400 font-medium hidden sm:inline">
                                Auto-fills details, description &amp; standard pricing (Press <kbd className="bg-white/80 dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-slate-800 dark:text-slate-200 px-1 py-0.2 rounded font-mono text-[10px]">↵ Enter</kbd> to search)
                            </span>
                        </div>
                        <SearchableSelect
                            triggerRef={catalogSelectTriggerRef}
                            placeholder="Type to search catalog product..."
                            options={productOptions}
                            value={modalItem.productId || ''}
                            onChange={(e) => updateModalItem('productId', e.target.value)}
                            onSelect={() => {
                                setTimeout(() => {
                                    quantityInputRef.current?.focus();
                                    quantityInputRef.current?.select();
                                }, 60);
                            }}
                        />
                    </div>

                    {/* Item Name & Translation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                                Item Name / Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={productNameInputRef}
                                type="text"
                                required
                                placeholder="e.g. Repair Works / Lorry Door Reconstruction"
                                value={modalItem.productName}
                                onChange={(e) => updateModalItem('productName', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        focusAndSelect(quantityInputRef.current);
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        catalogSelectTriggerRef.current?.focus();
                                    }
                                }}
                                className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                                    Translation (Sinhala / Tamil)
                                </label>
                                <button
                                    type="button"
                                    onClick={handleTranslateModalItem}
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-0.5 rounded transition cursor-pointer"
                                >
                                    <Sparkles size={11} className="text-blue-500 dark:text-blue-400" />
                                    Translate
                                </button>
                            </div>
                            <input
                                ref={productTranslationInputRef}
                                type="text"
                                placeholder="සිංහල / தமிழ் නම"
                                value={modalItem.productTranslation || ''}
                                onChange={(e) => updateModalItem('productTranslation', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        focusAndSelect(quantityInputRef.current);
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        focusAndSelect(productNameInputRef.current);
                                    }
                                }}
                                className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500 font-sans"
                            />
                        </div>
                    </div>

                    {/* Side-by-side Grid: Description (Left) & Pricing Panel (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Left Column: Detailed Specifications / Multiline Description */}
                        <div className="lg:col-span-7 flex flex-col">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                                    Detailed Description / Specifications
                                </label>
                                <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                    Multiline scope of work (15 lines visible)
                                </span>
                            </div>
                            <textarea
                                ref={descriptionInputRef}
                                rows={15}
                                className="w-full p-3.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs leading-relaxed bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-sans placeholder:text-gray-400 dark:placeholder:text-slate-500 min-h-[280px] resize-y"
                                placeholder="Specifications or repair scope (e.g.&#10;01. Side shutter replacement&#10;02. Waterproof rubber bead fitting&#10;03. Aluminium corrugated sheet fitting&#10;04. Subframe reinforcement...)"
                                value={modalItem.description || ''}
                                onChange={(e) => updateModalItem('description', e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddItemFromModal(editingIndex === null);
                                    }
                                }}
                            />
                        </div>

                        {/* Right Column: Pricing, Quantity & Calculations Card */}
                        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 sm:p-4 space-y-3">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Calculator size={13} className="text-slate-600 dark:text-slate-400" />
                                Pricing &amp; Calculations
                            </div>

                            {/* Financial Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        ref={quantityInputRef}
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        value={modalItem.quantity}
                                        onChange={(e) => updateModalItem('quantity', e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                focusAndSelect(unitPriceInputRef.current);
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                focusAndSelect(productNameInputRef.current);
                                            }
                                        }}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Unit Price (LKR) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        ref={unitPriceInputRef}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={modalItem.unitPrice}
                                        onChange={(e) => updateModalItem('unitPrice', e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                focusAndSelect(discountInputRef.current);
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                focusAndSelect(quantityInputRef.current);
                                            }
                                        }}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                                        Discount / Unit (LKR)
                                    </label>
                                    <input
                                        ref={discountInputRef}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={modalItem.discount || ''}
                                        onChange={(e) => updateModalItem('discount', e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                if (modalItem.taxable && taxRateInputRef.current) {
                                                    focusAndSelect(taxRateInputRef.current);
                                                } else if (editingIndex === null && addAnotherBtnRef.current) {
                                                    addAnotherBtnRef.current.focus();
                                                } else if (addItemBtnRef.current) {
                                                    addItemBtnRef.current.focus();
                                                }
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                focusAndSelect(unitPriceInputRef.current);
                                            }
                                        }}
                                        className="w-full h-10 px-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-mono font-semibold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Tax Switch */}
                            <div
                                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                    modalItem.taxable
                                        ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 shadow-xs'
                                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                                }`}
                            >
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        ref={taxableInputRef}
                                        type="checkbox"
                                        checked={modalItem.taxable}
                                        onChange={(e) => updateModalItem('taxable', e.target.checked)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                if (modalItem.taxable && taxRateInputRef.current) {
                                                    focusAndSelect(taxRateInputRef.current);
                                                } else if (editingIndex === null && addAnotherBtnRef.current) {
                                                    addAnotherBtnRef.current.focus();
                                                } else if (addItemBtnRef.current) {
                                                    addItemBtnRef.current.focus();
                                                }
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                focusAndSelect(discountInputRef.current);
                                            }
                                        }}
                                        className="h-4.5 w-4.5 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span
                                        className={`text-xs font-bold tracking-wide ${
                                            modalItem.taxable ? 'text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        Apply Tax
                                    </span>
                                </label>

                                {modalItem.taxable && (
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg px-2.5 py-1 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Rate:</span>
                                        <input
                                            ref={taxRateInputRef}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={modalItem.taxRate}
                                            onChange={(e) => updateModalItem('taxRate', e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    if (editingIndex === null && addAnotherBtnRef.current) {
                                                        addAnotherBtnRef.current.focus();
                                                    } else if (addItemBtnRef.current) {
                                                        addItemBtnRef.current.focus();
                                                    }
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    focusAndSelect(discountInputRef.current);
                                                }
                                            }}
                                            className="w-14 text-sm font-mono font-bold text-blue-900 dark:text-blue-200 text-right outline-none bg-transparent"
                                        />
                                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">%</span>
                                    </div>
                                )}
                            </div>

                            {/* Line Total Badge */}
                            <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                <div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Line Total</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Calculated amount</div>
                                </div>
                                <div className="text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
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

                            {/* Action buttons directly below Line Total */}
                            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddItemModalOpen(false);
                                            setEditingIndex(null);
                                            setModalItem(defaultItemState);
                                        }}
                                        className="px-3 py-2 text-xs"
                                    >
                                        Close
                                    </Button>
                                    {editingIndex === null ? (
                                        <>
                                            <Button
                                                ref={addAnotherBtnRef}
                                                type="button"
                                                variant="outline"
                                                onClick={() => handleAddItemFromModal(true)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'ArrowRight' && addItemBtnRef.current) {
                                                        e.preventDefault();
                                                        addItemBtnRef.current.focus();
                                                    } else if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        discountInputRef.current?.focus();
                                                        discountInputRef.current?.select();
                                                    }
                                                }}
                                                className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold text-xs whitespace-nowrap px-2.5 py-2 focus:ring-2 focus:ring-emerald-400"
                                            >
                                                <Plus size={14} className="mr-1" />
                                                <span>Add &amp; Add Another</span>
                                                <kbd className="ml-1.5 px-1 py-0.2 bg-emerald-200/70 dark:bg-emerald-900 border border-emerald-400/60 dark:border-emerald-700 rounded text-[9px] font-mono text-emerald-900 dark:text-emerald-200 font-bold">
                                                    ↵
                                                </kbd>
                                            </Button>
                                            <Button
                                                ref={addItemBtnRef}
                                                type="button"
                                                variant="primary"
                                                onClick={() => handleAddItemFromModal(false)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'ArrowLeft' && addAnotherBtnRef.current) {
                                                        e.preventDefault();
                                                        addAnotherBtnRef.current.focus();
                                                    } else if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        discountInputRef.current?.focus();
                                                        discountInputRef.current?.select();
                                                    }
                                                }}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs px-3 py-2 whitespace-nowrap focus:ring-2 focus:ring-emerald-400"
                                            >
                                                <CheckCircle2 size={14} className="mr-1.5" />
                                                <span>Add to {docTypeLabel}</span>
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            ref={addItemBtnRef}
                                            type="button"
                                            variant="primary"
                                            onClick={() => handleAddItemFromModal(false)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs py-2 focus:ring-2 focus:ring-emerald-400"
                                        >
                                            <CheckCircle2 size={14} className="mr-1.5" />
                                            Update Item #{editingIndex + 1}
                                        </Button>
                                    )}
                                </div>
                                <div className="text-[11px] text-gray-500 dark:text-slate-400 text-right">
                                    Currently <strong>{items.length}</strong> {items.length === 1 ? 'item' : 'items'} in this {docTypeLower}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal: Vehicle & Photo Information */}
            <Modal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                title="Vehicle & Photo Details"
                size="xl"
            >
                <div className="space-y-5 max-h-[78vh] overflow-y-auto px-1 pr-2">
                    {/* Section 1: Vehicle Information */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                                <Truck size={14} />
                            </div>
                            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                                Vehicle Information
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                                    Vehicle Number (Plate No)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 font-mono uppercase font-bold text-blue-700 dark:text-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={vehicleNo}
                                    placeholder="e.g. WP DAI-1974"
                                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                                />
                            </div>

                            <div>
                                <CreatableCombobox
                                    label="Vehicle Model"
                                    allowFreeText={true}
                                    options={vehicleModelOptions}
                                    value={vehicleModel}
                                    placeholder="e.g. TATA / New Mahindra Bolero"
                                    onChange={(val) => setVehicleModel(val)}
                                    onCreate={handleCreateVehicleModel}
                                    createLabel="+ Save New Vehicle Model"
                                />
                            </div>

                            <div>
                                <CreatableCombobox
                                    label="Insurance Company"
                                    allowFreeText={true}
                                    options={insuranceCompanyOptions}
                                    value={insuranceCompany}
                                    placeholder="e.g. Fairfirst Insurance Limited"
                                    onChange={(val) => setInsuranceCompany(val)}
                                    onCreate={handleCreateInsuranceCompany}
                                    createLabel="+ Save New Insurance Company"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                                    Job Caption
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={jobCaption}
                                    placeholder="e.g. Accident Repair / Body Construction"
                                    onChange={(e) => setJobCaption(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Photo Attachments */}
                    <div className="bg-blue-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-blue-200/80 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                                    <ImageIcon size={14} />
                                </div>
                                <span className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                                    Photo Attachments (Displayed on Print &amp; PDF)
                                </span>
                            </div>
                            {((numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + (photos?.length || 0)) > 0 && (
                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {(numberPlateImage ? 1 : 0) + (lorryBodyImage ? 1 : 0) + (photos?.length || 0)} Photos Added
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Number Plate Photo */}
                            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-200 dark:border-slate-700 space-y-2">
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Number Plate Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="text-xs text-gray-500 dark:text-slate-400 w-full file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-100 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 cursor-pointer"
                                    onChange={(e) => handleImageUpload('numberPlateImage', e.target.files[0])}
                                />
                                {numberPlateImage ? (
                                    <div className="relative border border-gray-200 dark:border-slate-700 rounded-lg p-1 bg-gray-50 dark:bg-slate-800">
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
                                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                                        value={numberPlateImage}
                                        onChange={(e) => setNumberPlateImage(e.target.value)}
                                    />
                                )}
                            </div>

                            {/* Lorry Body Photo */}
                            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-200 dark:border-slate-700 space-y-2">
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">Lorry Body Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="text-xs text-gray-500 dark:text-slate-400 w-full file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-100 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 cursor-pointer"
                                    onChange={(e) => handleImageUpload('lorryBodyImage', e.target.files[0])}
                                />
                                {lorryBodyImage ? (
                                    <div className="relative border border-gray-200 dark:border-slate-700 rounded-lg p-1 bg-gray-50 dark:bg-slate-800">
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
                                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white"
                                        value={lorryBodyImage}
                                        onChange={(e) => setLorryBodyImage(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Additional Inspection Photos (Multiple Upload Allowed) */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-200 dark:border-slate-700 space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 dark:text-slate-200 uppercase">
                                        Additional Vehicle &amp; Damage Photos (Upload Multiple)
                                    </label>
                                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                                        Select multiple files at once to attach damage inspection, chassis, or repair progress photos.
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded border border-blue-100 dark:border-blue-800 self-start sm:self-auto">
                                    {(photos?.length || 0)} photo{(photos?.length || 0) === 1 ? '' : 's'} added
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="text-xs text-gray-600 dark:text-slate-400 w-full file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                                    onChange={(e) => {
                                        handleMultiplePhotosUpload(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                {(photos?.length || 0) > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPhotos([])}
                                        className="text-[11px] text-red-600 dark:text-red-400 hover:text-red-800 font-bold whitespace-nowrap px-2.5 py-1.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded border border-red-200 dark:border-red-800"
                                    >
                                        Clear All ({photos.length})
                                    </button>
                                )}
                            </div>

                            {/* Gallery Preview of Additional Photos */}
                            {(photos?.length || 0) > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-700">
                                    {photos.map((src, idx) => (
                                        <div key={idx} className="relative group border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-800 h-24 flex items-center justify-center shadow-xs">
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

                    {/* Modal Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => {
                                setVehicleNo('');
                                setVehicleModel('');
                                setInsuranceCompany('');
                                setJobCaption('');
                                setNumberPlateImage('');
                                setLorryBodyImage('');
                                setPhotos([]);
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition"
                        >
                            Reset / Clear All
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsVehicleModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsVehicleModalOpen(false);
                                    toast.success('Vehicle details saved!');
                                }}
                                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm flex items-center gap-1.5"
                            >
                                <CheckCircle2 size={14} />
                                Done &amp; Save Details
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmTermsModalOpen}
                title="Save Terms & Conditions Changes?"
                message="Are you sure you want to apply and save these updated Terms and Conditions for this document?"
                confirmLabel="Yes, Save"
                cancelLabel="Cancel"
                confirmVariant="primary"
                onConfirm={() => {
                    setInitialTerms({
                        remarks,
                        conditionOfPayments,
                        completionOfWork,
                        validityQuotation,
                        warrantyCondition,
                    });
                    setIsConfirmTermsModalOpen(false);
                    toast.success('Terms & Conditions confirmed and updated successfully!');
                }}
                onClose={() => setIsConfirmTermsModalOpen(false)}
            />
        </div>
    );
}