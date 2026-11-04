import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Save, FileText, CheckCircle, ShieldCheck,
    Upload, X, User, DollarSign, Phone, Building2, Landmark, Lock, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import CreatableCombobox from '../components/ui/CreatableCombobox';
import {
    useEmployee, useCreateEmployee, useUpdateEmployee,
    useDepartments, useCreateDepartment, useDesignations, useCreateDesignation,
    useSalaryStructures, useLeaveStructures,
    useUploadEmployeeDocument, useDeleteEmployeeDocument,
} from '../features/hr/useHr';

export default function EmployeeFormPage() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();

    // 2-Step Page State: 1 = General & Employment, 2 = Salary, Bank & Credentials
    const [step, setStep] = useState(1);

    const firstNameInputRef = useRef(null);
    const compensationRef = useRef(null);

    const createMutation = useCreateEmployee();
    const updateMutation = useUpdateEmployee();
    const createDepartmentMutation = useCreateDepartment();
    const createDesignationMutation = useCreateDesignation();
    const uploadDocumentMutation = useUploadEmployeeDocument();
    const deleteDocumentMutation = useDeleteEmployeeDocument();

    const { data: existingData } = useEmployee(id);
    const { data: deptsData } = useDepartments();
    const { data: designationsData } = useDesignations();
    const { data: structuresData } = useSalaryStructures({ isActive: 'true' });
    const { data: leavesData } = useLeaveStructures({ isActive: 'true' });

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        dateOfBirth: '',
        nationalIdNumber: '',
        maritalStatus: '',
        nationality: 'Sri Lankan',
        email: '',
        phone: '',
        secondaryPhone: '',
        tertiaryPhone: '',
        mobile: '',
        permanentAddress: { line1: '', city: '' },
        currentAddress: { line1: '', city: '' },
        emergencyContact: { name: '', relationship: '', phone: '' },
        departmentId: '',
        designationId: '',
        reportsToId: '',
        employmentType: 'permanent',
        dateOfJoining: '',
        probationEndDate: '',
        paymentType: 'monthly',
        labourRate: 0,
        hourlyRate: 0,
        epfNumber: '',
        etfNumber: '',
        taxRegistrationNumber: '',
        bankDetails: { bankName: '', branchName: '', accountNumber: '', accountName: '' },
        salaryStructureId: '',
        leaveStructureId: '',
        basicSalary: 0,
        monthlySalary: 0,
        minimumSalary: 0,
        status: 'active',
        notes: '',
        employeeCategory: 'Permanent',
        epfRate: 8,
        etfRate: 3,
        basicWageRate: 0,
        otCutoffHours: 45,
        gsCertificate: { status: 'pending', certificateNo: '', issueDate: '', url: '', notes: '' },
        educationCertificates: { status: 'pending', summary: '', url: '', notes: '' },
        policeReport: { status: 'pending', reportNo: '', issueDate: '', expiryDate: '', url: '', notes: '' },
        createLogin: false,
        loginEmail: '',
        loginPassword: '',
        loginRole: 'employee',
    });

    useEffect(() => {
        if (isEdit && existingData?.data) {
            const e = existingData.data;
            setForm({
                ...form,
                firstName: e.firstName || '',
                lastName: e.lastName || '',
                gender: e.gender || '',
                dateOfBirth: e.dateOfBirth ? e.dateOfBirth.slice(0, 10) : '',
                nationalIdNumber: e.nationalIdNumber || '',
                maritalStatus: e.maritalStatus || '',
                nationality: e.nationality || 'Sri Lankan',
                email: e.email || '',
                phone: e.phone || '',
                secondaryPhone: e.secondaryPhone || '',
                tertiaryPhone: e.tertiaryPhone || '',
                mobile: e.mobile || '',
                permanentAddress: {
                    line1: e.permanentAddress?.line1 || '',
                    city: e.permanentAddress?.city || ''
                },
                currentAddress: {
                    line1: e.currentAddress?.line1 || '',
                    city: e.currentAddress?.city || ''
                },
                emergencyContact: e.emergencyContact || { name: '', relationship: '', phone: '' },
                departmentId: e.departmentId?._id || '',
                designationId: e.designationId?._id || '',
                reportsToId: e.reportsToId?._id || '',
                employmentType: e.employmentType || 'permanent',
                dateOfJoining: e.dateOfJoining ? e.dateOfJoining.slice(0, 10) : '',
                probationEndDate: e.probationEndDate ? e.probationEndDate.slice(0, 10) : '',
                paymentType: e.paymentType || 'monthly',
                labourRate: e.labourRate || 0,
                hourlyRate: e.hourlyRate || e.labourRate || 0,
                epfNumber: e.epfNumber || '',
                etfNumber: e.etfNumber || '',
                taxRegistrationNumber: e.taxRegistrationNumber || '',
                bankDetails: e.bankDetails || { bankName: '', branchName: '', accountNumber: '', accountName: '' },
                salaryStructureId: e.salaryStructureId?._id || '',
                leaveStructureId: e.leaveStructureId?._id || '',
                basicSalary: e.basicSalary || 0,
                monthlySalary: e.monthlySalary || (e.paymentType === 'monthly' ? e.basicSalary : 0) || 0,
                minimumSalary: e.minimumSalary !== undefined ? e.minimumSalary : (e.basicSalary || 0),
                status: e.status || 'active',
                notes: e.notes || '',
                employeeCategory: e.employeeCategory || 'Permanent',
                epfRate: e.epfRate !== undefined ? e.epfRate : 8,
                etfRate: e.etfRate !== undefined ? e.etfRate : 3,
                basicWageRate: e.basicWageRate || 0,
                otCutoffHours: e.otCutoffHours !== undefined ? e.otCutoffHours : 45,
                gsCertificate: {
                    status: e.gsCertificate?.status || 'pending',
                    certificateNo: e.gsCertificate?.certificateNo || '',
                    issueDate: e.gsCertificate?.issueDate ? e.gsCertificate.issueDate.slice(0, 10) : '',
                    url: e.gsCertificate?.url || '',
                    notes: e.gsCertificate?.notes || '',
                },
                educationCertificates: {
                    status: e.educationCertificates?.status || 'pending',
                    summary: e.educationCertificates?.summary || '',
                    url: e.educationCertificates?.url || '',
                    notes: e.educationCertificates?.notes || '',
                },
                policeReport: {
                    status: e.policeReport?.status || 'pending',
                    reportNo: e.policeReport?.reportNo || '',
                    issueDate: e.policeReport?.issueDate ? e.policeReport.issueDate.slice(0, 10) : '',
                    expiryDate: e.policeReport?.expiryDate ? e.policeReport.expiryDate.slice(0, 10) : '',
                    url: e.policeReport?.url || '',
                    notes: e.policeReport?.notes || '',
                },
                createLogin: !!e.userId,
                loginEmail: e.userId?.email || e.email || '',
                loginRole: e.userId?.role || 'employee',
            });
        }
    }, [isEdit, existingData]);

    // Auto-focus on step change
    useEffect(() => {
        if (step === 1) {
            setTimeout(() => firstNameInputRef.current?.focus(), 50);
        } else if (step === 2) {
            setTimeout(() => compensationRef.current?.focus(), 50);
        }
    }, [step]);

    // Keyboard Shortcuts (Ctrl+Enter to Save, Alt+N for Next, Alt+P for Back)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                submit();
            } else if (e.altKey && (e.key.toLowerCase() === 'n' || e.key === 'ArrowRight')) {
                e.preventDefault();
                setStep(2);
            } else if (e.altKey && (e.key.toLowerCase() === 'p' || e.key === 'ArrowLeft')) {
                e.preventDefault();
                setStep(1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [form, isEdit, existingData]);

    const update = (path, value) => {
        setForm((prev) => {
            const copy = { ...prev };
            const parts = path.split('.');
            if (parts.length === 1) copy[parts[0]] = value;
            else if (parts.length === 2) {
                copy[parts[0]] = { ...copy[parts[0]], [parts[1]]: value };
            } else if (parts.length === 3) {
                copy[parts[0]] = {
                    ...copy[parts[0]],
                    [parts[1]]: { ...copy[parts[0]][parts[1]], [parts[2]]: value }
                };
            }
            return copy;
        });
    };

    const handleCreateDepartment = async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const cleanCode = trimmed.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + Math.floor(100 + Math.random() * 900);
        try {
            const res = await createDepartmentMutation.mutateAsync({
                name: trimmed,
                code: cleanCode
            });
            const created = res?.data || res;
            toast.success(`Department "${trimmed}" auto-saved!`);
            return created;
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to auto-save department');
            throw err;
        }
    };

    const handleCreateDesignation = async (name) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const cleanCode = trimmed.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + Math.floor(100 + Math.random() * 900);
        try {
            const res = await createDesignationMutation.mutateAsync({
                name: trimmed,
                code: cleanCode,
                departmentId: form.departmentId || undefined
            });
            const created = res?.data || res;
            toast.success(`Designation "${trimmed}" auto-saved!`);
            return created;
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to auto-save designation');
            throw err;
        }
    };

    const submit = async () => {
        if (!form.firstName || !form.lastName || !form.dateOfJoining) {
            toast.error('First name, last name and date of joining are required');
            setStep(1);
            return;
        }
        if (!form.phone || !form.secondaryPhone || !form.tertiaryPhone) {
            toast.error('සෑම සේවකයෙකුගෙන්ම දුරකථන අංක 3ක් (Contact 1, Contact 2 & Contact 3) ඇතුළත් කිරීම අනිවාර්ය වේ!');
            setStep(1);
            return;
        }
        if (form.createLogin && (!isEdit || !existingData?.data?.userId)) {
            const emailToUse = form.loginEmail || form.email;
            if (!emailToUse) {
                toast.error('User login email address is required!');
                setStep(2);
                return;
            }
            if (!form.loginPassword || form.loginPassword.length < 6) {
                toast.error('Password for system user login must be at least 6 characters!');
                setStep(2);
                return;
            }
        }
        try {
            let finalDeptId = form.departmentId;
            let finalDesigId = form.designationId;

            if (finalDeptId && !deptOptions.some(d => String(d.value) === String(finalDeptId))) {
                try {
                    const created = await handleCreateDepartment(finalDeptId);
                    if (created?._id) finalDeptId = created._id;
                } catch { }
            }

            if (finalDesigId && !designationOptions.some(d => String(d.value) === String(finalDesigId))) {
                try {
                    const created = await handleCreateDesignation(finalDesigId);
                    if (created?._id) finalDesigId = created._id;
                } catch { }
            }

            const isMonthly = form.paymentType === 'monthly';
            const mSalary = isMonthly ? (+form.monthlySalary || +form.basicSalary || 0) : 0;
            const minSalary = +(form.minimumSalary || form.basicSalary || 0);
            const baseSalaryNum = minSalary > 0 ? minSalary : (isMonthly ? mSalary : 0);
            const computedHourly = isMonthly && mSalary > 0 ? Number((mSalary / 200).toFixed(2)) : +(form.hourlyRate || form.labourRate || 0);

            const payload = {
                ...form,
                monthlySalary: mSalary,
                minimumSalary: minSalary,
                basicSalary: baseSalaryNum,
                labourRate: isMonthly ? 0 : (+form.labourRate || 0),
                hourlyRate: computedHourly,
                departmentId: finalDeptId || undefined,
                designationId: finalDesigId || undefined,
                reportsToId: form.reportsToId || undefined,
                salaryStructureId: form.salaryStructureId || undefined,
                leaveStructureId: form.leaveStructureId || undefined,
            };
            if (isEdit) {
                await updateMutation.mutateAsync({ id, data: payload });
                navigate(`/employees/${id}`);
            } else {
                const result = await createMutation.mutateAsync(payload);
                navigate(`/employees/${result.data._id}`);
            }
        } catch { }
    };

    const handleFileUpload = async (documentType, file) => {
        if (!isEdit || !id) {
            toast.error('Please save the employee first before uploading documents');
            return;
        }

        try {
            await uploadDocumentMutation.mutateAsync({
                employeeId: id,
                file,
                documentType,
                title: file.name
            });

            update(`${documentType}.url`, `/uploads/employee-documents/${
                documentType === 'gsCertificate' ? 'gs-certificates' :
                documentType === 'educationCertificates' ? 'education-certificates' :
                documentType === 'policeReport' ? 'police-reports' : 'general'
            }/${file.name}`);
            update(`${documentType}.status`, 'submitted');
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    const handleDeleteDocument = async (documentType, documentId) => {
        if (!isEdit || !id) return;

        try {
            await deleteDocumentMutation.mutateAsync({
                employeeId: id,
                documentType,
                documentId
            });

            update(`${documentType}.url`, '');
            update(`${documentType}.status`, 'pending');
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const deptOptions = (deptsData?.data || []).map((d) => ({ value: d._id, label: d.name }));
    const designationOptions = (designationsData?.data || []).map((d) => ({ value: d._id, label: d.name }));
    const structureOptions = (structuresData?.data || []).map((s) => ({ value: s._id, label: s.name }));
    const leaveStructureOptions = (leavesData?.data || []).map((l) => ({ value: l._id, label: l.name }));

    return (
        <div className="w-full space-y-4 pb-16">
            <PageHeader
                title={isEdit ? 'Edit Employee / Labour Details' : 'New Employee / Labour Registration'}
                subtitle="Complete registration in 2 simple, keyboard-friendly steps"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => navigate('/employees')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {step === 1 ? (
                            <Button variant="secondary" onClick={() => setStep(2)}>
                                Next: Step 2 <ArrowRight size={16} className="ml-1.5" />
                            </Button>
                        ) : (
                            <Button variant="secondary" onClick={() => setStep(1)}>
                                <ArrowLeft size={16} className="mr-1.5" /> Back to Step 1
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            onClick={submit}
                            loading={createMutation.isPending || updateMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold"
                        >
                            <Save size={16} className="mr-1.5" /> {isEdit ? 'Update Employee' : 'Save Employee (Ctrl + Enter)'}
                        </Button>
                    </div>
                }
            />

            {/* Keyboard Shortcuts Hint Bar */}
            <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-2 shadow-2xs">
                <div className="flex items-center gap-2 font-medium">
                    <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">⌨️ Keyboard Navigation:</span>
                    <span>Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-[11px] font-mono font-bold shadow-2xs">Tab</kbd> to move between fields</span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="hidden sm:inline"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-[11px] font-mono font-bold shadow-2xs">Alt + N</kbd> Next Page</span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="hidden sm:inline"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-[11px] font-mono font-bold shadow-2xs">Alt + P</kbd> Previous Page</span>
                </div>
                <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-[11px] font-mono font-bold shadow-2xs">Ctrl + Enter</kbd> to Save
                    </span>
                </div>
            </div>

            <Card className="w-full shadow-sm border border-slate-200 dark:border-slate-800">
                {/* 2-Step Modern Segmented Tab Bar */}
                <div className="border-b border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-2 sm:p-3">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
                        {/* Step 1 Button */}
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border ${
                                step === 1
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                step === 1 ? 'bg-white text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                                1
                            </div>
                            <div className="text-left leading-tight">
                                <span className="block font-bold">General & Employment</span>
                                <span className={`text-[10px] block font-normal ${step === 1 ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    මූලික සහ රැකියා තොරතුරු
                                </span>
                            </div>
                        </button>

                        {/* Step 2 Button */}
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border ${
                                step === 2
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                step === 2 ? 'bg-white text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                                2
                            </div>
                            <div className="text-left leading-tight">
                                <span className="block font-bold">Salary, Bank & Credentials</span>
                                <span className={`text-[10px] block font-normal ${step === 2 ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    වැටුප්, බැංකු සහ ලේඛන
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-7 space-y-7">
                    {/* ================= PAGE 1: GENERAL & EMPLOYMENT INFO ================= */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Section 1: Personal Details */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                                    <User size={18} className="text-indigo-600" />
                                    <h3 className="font-bold text-sm sm:text-base">1. Personal Information (පුද්ගලික තොරතුරු)</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <Input
                                        ref={firstNameInputRef}
                                        label="First Name"
                                        required
                                        value={form.firstName}
                                        onChange={(e) => update('firstName', e.target.value)}
                                        placeholder="First Name (මුල් නම)"
                                    />
                                    <Input
                                        label="Last Name"
                                        required
                                        value={form.lastName}
                                        onChange={(e) => update('lastName', e.target.value)}
                                        placeholder="Last Name (වාසගම)"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                    <Select
                                        label="Gender"
                                        placeholder="Select gender..."
                                        options={[
                                            { value: 'male', label: 'Male (පුරුෂ)' },
                                            { value: 'female', label: 'Female (ස්ත්‍රී)' },
                                            { value: 'other', label: 'Other' },
                                            { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                                        ]}
                                        value={form.gender}
                                        onChange={(e) => update('gender', e.target.value)}
                                    />
                                    <Input
                                        label="Date of Birth"
                                        type="date"
                                        value={form.dateOfBirth}
                                        onChange={(e) => update('dateOfBirth', e.target.value)}
                                    />
                                    <Input
                                        label="NIC Number (ජාතික හැඳුනුම්පත් අංකය)"
                                        value={form.nationalIdNumber}
                                        onChange={(e) => update('nationalIdNumber', e.target.value)}
                                        placeholder="e.g. 199012345678 or 901234567V"
                                    />
                                    <Select
                                        label="Marital Status"
                                        placeholder="Select..."
                                        options={[
                                            { value: 'single', label: 'Single (අවිවාහක)' },
                                            { value: 'married', label: 'Married (විවාහක)' },
                                            { value: 'divorced', label: 'Divorced' },
                                            { value: 'widowed', label: 'Widowed' },
                                            { value: 'separated', label: 'Separated' },
                                        ]}
                                        value={form.maritalStatus}
                                        onChange={(e) => update('maritalStatus', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Contact Details */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                        <Phone size={18} className="text-emerald-600" />
                                        <h3 className="font-bold text-sm sm:text-base">2. Contact Numbers & Address (සම්බන්ධතා සහ ලිපිනය)</h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                                        දුරකථන අංක 3ක් අනිවාර්යයි
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <Input
                                        label="Primary Phone (සම්බන්ධ කරගන්නා අංකය 1)"
                                        required
                                        placeholder="e.g. 0771234567"
                                        value={form.phone}
                                        onChange={(e) => update('phone', e.target.value)}
                                    />
                                    <Input
                                        label="Secondary Phone (සම්බන්ධ කරගන්නා අංකය 2)"
                                        required
                                        placeholder="e.g. 0719876543"
                                        value={form.secondaryPhone}
                                        onChange={(e) => update('secondaryPhone', e.target.value)}
                                    />
                                    <Input
                                        label="Third Phone (සම්බන්ධ කරගන්නා අංකය 3)"
                                        required
                                        placeholder="e.g. 0764567890"
                                        value={form.tertiaryPhone}
                                        onChange={(e) => update('tertiaryPhone', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
                                    <div className="sm:col-span-1">
                                        <Input
                                            label="Email Address (ඉමේල් ලිපිනය)"
                                            type="email"
                                            placeholder="employee@example.com"
                                            value={form.email}
                                            onChange={(e) => update('email', e.target.value)}
                                        />
                                    </div>
                                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <Input
                                            label="Permanent Address Line 1 (ලිපිනය)"
                                            placeholder="No. 12, Main Street"
                                            value={form.permanentAddress.line1}
                                            onChange={(e) => update('permanentAddress.line1', e.target.value)}
                                        />
                                        <Input
                                            label="City / Town (නගරය)"
                                            placeholder="e.g. Negombo / Colombo"
                                            value={form.permanentAddress.city}
                                            onChange={(e) => update('permanentAddress.city', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Emergency Contact sub-box */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                                        Emergency Contact (හදිසි අවස්ථාවකදී දැනුම් දිය යුතු පුද්ගලයා)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <Input
                                            label="Contact Name"
                                            placeholder="Relative / Guardian Name"
                                            value={form.emergencyContact.name}
                                            onChange={(e) => update('emergencyContact.name', e.target.value)}
                                        />
                                        <Input
                                            label="Relationship"
                                            placeholder="e.g. Spouse / Mother / Brother"
                                            value={form.emergencyContact.relationship}
                                            onChange={(e) => update('emergencyContact.relationship', e.target.value)}
                                        />
                                        <Input
                                            label="Emergency Phone"
                                            placeholder="e.g. 0770000000"
                                            value={form.emergencyContact.phone}
                                            onChange={(e) => update('emergencyContact.phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Employment Details */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                                    <Building2 size={18} className="text-blue-600" />
                                    <h3 className="font-bold text-sm sm:text-base">3. Employment Details (රැකියා විස්තර)</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <CreatableCombobox
                                        label="Department (දෙපාර්තමේන්තුව)"
                                        placeholder="Search or type department name..."
                                        createLabel="Create & auto-save new department"
                                        options={deptOptions}
                                        value={form.departmentId}
                                        onChange={(val) => update('departmentId', val)}
                                        onCreate={handleCreateDepartment}
                                        helperText="Select from saved or type to auto-save a new department"
                                    />
                                    <CreatableCombobox
                                        label="Designation (තනතුර)"
                                        placeholder="Search or type designation title..."
                                        createLabel="Create & auto-save new designation"
                                        options={designationOptions}
                                        value={form.designationId}
                                        onChange={(val) => update('designationId', val)}
                                        onCreate={handleCreateDesignation}
                                        helperText="Select from saved or type to auto-save a new designation"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <Select
                                        label="Employment Type"
                                        options={[
                                            { value: 'permanent', label: 'Permanent' },
                                            { value: 'contract', label: 'Contract / Labour' },
                                            { value: 'probation', label: 'Probation' },
                                            { value: 'intern', label: 'Intern' },
                                            { value: 'part_time', label: 'Part-time' },
                                        ]}
                                        value={form.employmentType}
                                        onChange={(e) => update('employmentType', e.target.value)}
                                    />
                                    <Input
                                        label="Date of Joining (සේවයට එක්වූ දිනය)"
                                        required
                                        type="date"
                                        value={form.dateOfJoining}
                                        onChange={(e) => update('dateOfJoining', e.target.value)}
                                    />
                                    <Select
                                        label="Employee Status (සේවක තත්ත්වය)"
                                        options={[
                                            { value: 'active', label: 'Active (ක්‍රියාකාරී)' },
                                            { value: 'probation', label: 'Probation' },
                                            { value: 'on_leave', label: 'On Leave' },
                                            { value: 'suspended', label: 'Suspended' },
                                            { value: 'terminated', label: 'Terminated' },
                                        ]}
                                        value={form.status}
                                        onChange={(e) => update('status', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Page 1 Bottom Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                                <Button variant="outline" onClick={() => navigate('/employees')}>
                                    Cancel
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={submit}
                                        loading={createMutation.isPending || updateMutation.isPending}
                                    >
                                        <Save size={16} className="mr-1.5" /> Quick Save
                                    </Button>
                                    <Button
                                        variant="primary"
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="px-6 py-2.5 font-bold shadow-md shadow-indigo-600/20"
                                    >
                                        Next: Salary, Bank & Credentials <ArrowRight size={16} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ================= PAGE 2: SALARY, BANK & CREDENTIALS ================= */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Section 4: Compensation & Labour Rate */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                        <DollarSign size={18} className="text-emerald-600" />
                                        <h3 className="font-bold text-sm sm:text-base">1. Compensation & Labour Rate (වැටුප් සහ අනුපාත)</h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                                        Monthly / Hourly Configuration
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <Select
                                        ref={compensationRef}
                                        label="Labour Payment Type (ගෙවීම් ක්‍රමය)"
                                        required
                                        options={[
                                            { value: 'monthly', label: 'Monthly (මාසික වැටුප්)' },
                                            { value: 'per_day', label: 'Per Day (දිනකට ගෙවන ගාස්තුව)' },
                                            { value: 'per_hour', label: 'Per Hour (පැයකට ගෙවන ගාස්තුව)' },
                                        ]}
                                        value={form.paymentType}
                                        onChange={(e) => update('paymentType', e.target.value)}
                                    />

                                    {form.paymentType !== 'monthly' ? (
                                        <Input
                                            label={`Labour Rate Amount (LKR per ${form.paymentType === 'per_hour' ? 'hour' : 'day'})`}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={form.labourRate || ''}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                update('labourRate', val);
                                                if (!form.hourlyRate || form.paymentType === 'per_hour') {
                                                    update('hourlyRate', val);
                                                }
                                            }}
                                            placeholder="e.g. 250"
                                        />
                                    ) : (
                                        <Input
                                            label="Monthly Salary (මාසික සම්පූර්ණ වැටුප - LKR)"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={form.monthlySalary || ''}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                update('monthlySalary', val);
                                            }}
                                            placeholder="e.g. 50000"
                                            helperText="The total monthly fixed salary (e.g. 50,000)"
                                        />
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <Select
                                        label="Employee Category"
                                        required
                                        options={[
                                            { value: 'Permanent', label: 'Permanent' },
                                            { value: 'Trainee', label: 'Trainee' }
                                        ]}
                                        value={form.employeeCategory}
                                        onChange={(e) => update('employeeCategory', e.target.value)}
                                    />
                                    <Input
                                        label="Minimum Salary / Basic Salary (අවම මූලික වැටුප - LKR)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.minimumSalary || ''}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            update('minimumSalary', val);
                                            if (form.paymentType !== 'monthly') {
                                                update('basicSalary', val);
                                            }
                                        }}
                                        placeholder="e.g. 25000"
                                        helperText="Shown as Basic Salary on payslip (e.g. 25,000). Remaining balance is shown as OT / Commission"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <Input
                                        label="EPF Rate (%)"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={form.epfRate}
                                        onChange={(e) => update('epfRate', Number(e.target.value))}
                                    />
                                    <Input
                                        label="ETF Rate (%)"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={form.etfRate}
                                        onChange={(e) => update('etfRate', Number(e.target.value))}
                                    />
                                    <Input
                                        label="Automated OT Cutoff (Hours/month)"
                                        type="number"
                                        min="0"
                                        value={form.otCutoffHours}
                                        onChange={(e) => update('otCutoffHours', Number(e.target.value))}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <Select
                                        label="Salary Structure"
                                        placeholder="None (use basic only)"
                                        options={structureOptions}
                                        value={form.salaryStructureId}
                                        onChange={(e) => update('salaryStructureId', e.target.value)}
                                    />
                                    <Select
                                        label="Leave Structure"
                                        placeholder="None (use default standard balances)"
                                        options={leaveStructureOptions}
                                        value={form.leaveStructureId}
                                        onChange={(e) => update('leaveStructureId', e.target.value)}
                                    />
                                </div>
                                <Textarea
                                    label="Notes & Remarks (සටහන්)"
                                    rows={2}
                                    value={form.notes}
                                    onChange={(e) => update('notes', e.target.value)}
                                    placeholder="Any additional employment or salary remarks..."
                                />
                            </div>

                            {/* Section 5: Statutory & Bank Details */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                                    <Landmark size={18} className="text-amber-600" />
                                    <h3 className="font-bold text-sm sm:text-base">2. Statutory & Bank Details (බැංකු සහ ව්‍යවස්ථාපිත තොරතුරු)</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <Input
                                        label="EPF Number (සේ.අ.අංකය)"
                                        value={form.epfNumber}
                                        onChange={(e) => update('epfNumber', e.target.value)}
                                        placeholder="e.g. EPF-1024"
                                    />
                                    <Input
                                        label="ETF Number"
                                        value={form.etfNumber}
                                        onChange={(e) => update('etfNumber', e.target.value)}
                                        placeholder="e.g. ETF-1024"
                                    />
                                    <Input
                                        label="Tax Registration (TIN)"
                                        value={form.taxRegistrationNumber}
                                        onChange={(e) => update('taxRegistrationNumber', e.target.value)}
                                        placeholder="TIN Number"
                                    />
                                </div>

                                <div className="pt-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                                        Bank Account Details (වැටුප් තැන්පත් කිරීම සඳහා බැංකු විස්තර)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                        <Input
                                            label="Bank Name"
                                            placeholder="e.g. Commercial Bank / BOC"
                                            value={form.bankDetails.bankName}
                                            onChange={(e) => update('bankDetails.bankName', e.target.value)}
                                        />
                                        <Input
                                            label="Branch Name"
                                            placeholder="e.g. Negombo Branch"
                                            value={form.bankDetails.branchName}
                                            onChange={(e) => update('bankDetails.branchName', e.target.value)}
                                        />
                                        <Input
                                            label="Account Number"
                                            placeholder="e.g. 1002345678"
                                            value={form.bankDetails.accountNumber}
                                            onChange={(e) => update('bankDetails.accountNumber', e.target.value)}
                                        />
                                        <Input
                                            label="Account Holder Name"
                                            placeholder="Name as in passbook"
                                            value={form.bankDetails.accountName}
                                            onChange={(e) => update('bankDetails.accountName', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 6: System User Login */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                                    <Lock size={18} className="text-indigo-600" />
                                    <h3 className="font-bold text-sm sm:text-base">3. System User Account (පරිශීලක ලොගින් ගිණුම)</h3>
                                </div>

                                {isEdit && existingData?.data?.userId ? (
                                    <div className="bg-emerald-50 border border-emerald-200 dark:border-emerald-900/60 dark:bg-emerald-950/30 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                                            <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
                                            <h4 className="font-bold text-xs sm:text-sm">Active System User Login Linked (ලොගින් ගිණුම සක්‍රීයයි)</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                                            <div>
                                                <span className="text-emerald-700 dark:text-emerald-400 font-medium block">Login Email:</span>
                                                <span className="font-bold text-emerald-950 dark:text-white font-mono">{existingData.data.userId.email}</span>
                                            </div>
                                            <div>
                                                <span className="text-emerald-700 dark:text-emerald-400 font-medium block">Role:</span>
                                                <span className="font-bold text-emerald-950 dark:text-white capitalize">{existingData.data.userId.role}</span>
                                            </div>
                                            <div>
                                                <span className="text-emerald-700 dark:text-emerald-400 font-medium block">Account Status:</span>
                                                <span className="font-bold text-emerald-950 dark:text-white">{existingData.data.userId.isActive ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={form.createLogin}
                                                onChange={(e) => update('createLogin', e.target.checked)}
                                            />
                                            <div>
                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                                                    Create System User Login for this Employee (මෙම සේවකයාට System Login එකක් සාදන්න)
                                                </span>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                                    Check this to create credentials for Employee Portal & ERP access
                                                </span>
                                            </div>
                                        </label>

                                        {form.createLogin && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                                <Input
                                                    label="Login Email"
                                                    type="email"
                                                    required
                                                    placeholder={form.email || "employee@company.com"}
                                                    value={form.loginEmail || form.email}
                                                    onChange={(e) => update('loginEmail', e.target.value)}
                                                />
                                                <Input
                                                    label="Login Password"
                                                    type="password"
                                                    required
                                                    placeholder="Set password (min 6 chars)"
                                                    value={form.loginPassword}
                                                    onChange={(e) => update('loginPassword', e.target.value)}
                                                />
                                                <Select
                                                    label="User Role"
                                                    required
                                                    options={[
                                                        { value: 'employee', label: 'Employee (සේවක Portal අනුමතිය)' },
                                                        { value: 'staff', label: 'Staff (සාමාන්‍ය පරිශීලක)' },
                                                        { value: 'hr_manager', label: 'HR Manager' },
                                                        { value: 'accountant', label: 'Accountant' },
                                                        { value: 'admin', label: 'Administrator' },
                                                    ]}
                                                    value={form.loginRole}
                                                    onChange={(e) => update('loginRole', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Section 7: Required Documents */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 shadow-2xs space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                                    <FileText size={18} className="text-blue-600" />
                                    <h3 className="font-bold text-sm sm:text-base">4. Required Documents (අවශ්‍ය ලේඛන)</h3>
                                </div>

                                <div className="space-y-4">
                                    {/* 1. Grama Niladhari Certificate */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                            1. Grama Niladhari Certificate (GS Certificate / ග්‍රාම නිලධාරී සහතිකය)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <Select
                                                label="Status"
                                                options={[
                                                    { value: 'pending', label: 'Pending (තවම ලබාදී නැත)' },
                                                    { value: 'submitted', label: 'Submitted (ලබාදී ඇත)' },
                                                    { value: 'verified', label: 'Verified (තහවුරු කර ඇත)' },
                                                    { value: 'rejected', label: 'Rejected' },
                                                ]}
                                                value={form.gsCertificate.status}
                                                onChange={(e) => update('gsCertificate.status', e.target.value)}
                                            />
                                            <Input
                                                label="Certificate No"
                                                placeholder="e.g. GS/2026/89"
                                                value={form.gsCertificate.certificateNo}
                                                onChange={(e) => update('gsCertificate.certificateNo', e.target.value)}
                                            />
                                            <Input
                                                label="Issue Date"
                                                type="date"
                                                value={form.gsCertificate.issueDate}
                                                onChange={(e) => update('gsCertificate.issueDate', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-2">
                                            {form.gsCertificate.url ? (
                                                <div className="flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg">
                                                    <span className="text-xs text-green-800 font-bold flex items-center gap-1.5">
                                                        <CheckCircle size={14} className="text-green-600" /> GS Certificate Uploaded
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteDocument('gsCertificate')}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id="gs-cert-upload"
                                                        className="hidden"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={(e) => {
                                                            if (e.target.files[0]) handleFileUpload('gsCertificate', e.target.files[0]);
                                                        }}
                                                        disabled={!isEdit}
                                                    />
                                                    <label
                                                        htmlFor="gs-cert-upload"
                                                        className={`flex items-center justify-center gap-2 p-2.5 border border-dashed rounded-lg text-xs font-semibold cursor-pointer ${
                                                            !isEdit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        <Upload size={14} /> Upload GS Certificate {!isEdit && '(Save employee first)'}
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Education Certificates */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                            2. Education Certificates (අධ්‍යාපන සහතික)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Select
                                                label="Status"
                                                options={[
                                                    { value: 'pending', label: 'Pending (තවම ලබාදී නැත)' },
                                                    { value: 'submitted', label: 'Submitted (ලබාදී ඇත)' },
                                                    { value: 'verified', label: 'Verified (තහවුරු කර ඇත)' },
                                                ]}
                                                value={form.educationCertificates.status}
                                                onChange={(e) => update('educationCertificates.status', e.target.value)}
                                            />
                                            <Input
                                                label="Qualifications Summary"
                                                placeholder="e.g. O/L, A/L, NVQ, Diploma"
                                                value={form.educationCertificates.summary}
                                                onChange={(e) => update('educationCertificates.summary', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-2">
                                            {form.educationCertificates.url ? (
                                                <div className="flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg">
                                                    <span className="text-xs text-green-800 font-bold flex items-center gap-1.5">
                                                        <CheckCircle size={14} className="text-green-600" /> Education Cert Uploaded
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteDocument('educationCertificates')}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id="edu-cert-upload"
                                                        className="hidden"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={(e) => {
                                                            if (e.target.files[0]) handleFileUpload('educationCertificates', e.target.files[0]);
                                                        }}
                                                        disabled={!isEdit}
                                                    />
                                                    <label
                                                        htmlFor="edu-cert-upload"
                                                        className={`flex items-center justify-center gap-2 p-2.5 border border-dashed rounded-lg text-xs font-semibold cursor-pointer ${
                                                            !isEdit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        <Upload size={14} /> Upload Education Certificates {!isEdit && '(Save employee first)'}
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Police Report */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                            3. Police Report (පොලිස් වාර්තාව)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <Select
                                                label="Status"
                                                options={[
                                                    { value: 'pending', label: 'Pending (තවම ලබාදී නැත)' },
                                                    { value: 'submitted', label: 'Submitted (ලබාදී ඇත)' },
                                                    { value: 'verified', label: 'Verified (තහවුරු කර ඇත)' },
                                                    { value: 'expired', label: 'Expired' },
                                                ]}
                                                value={form.policeReport.status}
                                                onChange={(e) => update('policeReport.status', e.target.value)}
                                            />
                                            <Input
                                                label="Report Reference No"
                                                placeholder="e.g. POL/NEG/2026/410"
                                                value={form.policeReport.reportNo}
                                                onChange={(e) => update('policeReport.reportNo', e.target.value)}
                                            />
                                            <Input
                                                label="Issue Date"
                                                type="date"
                                                value={form.policeReport.issueDate}
                                                onChange={(e) => update('policeReport.issueDate', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-2">
                                            {form.policeReport.url ? (
                                                <div className="flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg">
                                                    <span className="text-xs text-green-800 font-bold flex items-center gap-1.5">
                                                        <CheckCircle size={14} className="text-green-600" /> Police Report Uploaded
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteDocument('policeReport')}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id="police-report-upload"
                                                        className="hidden"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={(e) => {
                                                            if (e.target.files[0]) handleFileUpload('policeReport', e.target.files[0]);
                                                        }}
                                                        disabled={!isEdit}
                                                    />
                                                    <label
                                                        htmlFor="police-report-upload"
                                                        className={`flex items-center justify-center gap-2 p-2.5 border border-dashed rounded-lg text-xs font-semibold cursor-pointer ${
                                                            !isEdit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        <Upload size={14} /> Upload Police Report {!isEdit && '(Save employee first)'}
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Page 2 Bottom Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-5 py-2"
                                >
                                    <ArrowLeft size={16} className="mr-2" /> Back to Step 1
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={() => navigate('/employees')}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={submit}
                                        loading={createMutation.isPending || updateMutation.isPending}
                                        className="px-6 py-2.5 font-bold shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <Save size={16} className="mr-2" /> {isEdit ? 'Update Employee' : 'Save Employee (Ctrl + Enter)'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
