import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    FolderTree, Award, Truck, ShieldCheck, Plus, Trash2, Search,
    Layers, RefreshCw, CheckCircle2, AlertCircle, Database
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { masterDataApi } from '../features/masterData/masterDataApi';
import { useAuthStore } from '../store/authStore';

const TABS = [
    { id: 'categories', label: 'Categories', icon: FolderTree, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { id: 'brands', label: 'Brands', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { id: 'vehicle-models', label: 'Vehicle Models', icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { id: 'insurance-companies', label: 'Insurance Companies', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
];

export default function DataEntryManagerPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);
    const qc = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = searchParams.get('tab') || 'categories';
    const setActiveTab = (tabId) => {
        setSearchParams({ tab: tabId });
        setSearchText('');
        setNameInput('');
        setExtraInput('');
    };

    const [nameInput, setNameInput] = useState('');
    const [extraInput, setExtraInput] = useState(''); // Code or contact phone if needed
    const [searchText, setSearchText] = useState('');
    const [deletingItem, setDeletingItem] = useState(null);

    // Queries
    const { data: categoriesData, isLoading: loadingCat } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: () => masterDataApi.getCategories(),
    });

    const { data: brandsData, isLoading: loadingBrands } = useQuery({
        queryKey: ['brands', 'all'],
        queryFn: () => masterDataApi.getBrands(),
    });

    const { data: vehicleModelsData, isLoading: loadingModels } = useQuery({
        queryKey: ['vehicle-models', 'all'],
        queryFn: () => masterDataApi.getVehicleModels(),
    });

    const { data: insuranceData, isLoading: loadingInsurance } = useQuery({
        queryKey: ['insurance-companies', 'all'],
        queryFn: () => masterDataApi.getInsuranceCompanies(),
    });

    // Mutations
    const createCategoryMutation = useMutation({
        mutationFn: (data) => masterDataApi.createCategory(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category saved successfully!');
            setNameInput('');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to save category'),
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: (id) => masterDataApi.deleteCategory(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category deleted');
            setDeletingItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    const createBrandMutation = useMutation({
        mutationFn: (data) => masterDataApi.createBrand(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['brands'] });
            toast.success('Brand saved successfully!');
            setNameInput('');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to save brand'),
    });

    const deleteBrandMutation = useMutation({
        mutationFn: (id) => masterDataApi.deleteBrand(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['brands'] });
            toast.success('Brand deleted');
            setDeletingItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    const createModelMutation = useMutation({
        mutationFn: (data) => masterDataApi.createVehicleModel(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vehicle-models'] });
            toast.success('Vehicle model saved successfully!');
            setNameInput('');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to save vehicle model'),
    });

    const deleteModelMutation = useMutation({
        mutationFn: (id) => masterDataApi.deleteVehicleModel(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['vehicle-models'] });
            toast.success('Vehicle model deleted');
            setDeletingItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    const createInsuranceMutation = useMutation({
        mutationFn: (data) => masterDataApi.createInsuranceCompany(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['insurance-companies'] });
            toast.success('Insurance company saved successfully!');
            setNameInput('');
            setExtraInput('');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to save insurance company'),
    });

    const deleteInsuranceMutation = useMutation({
        mutationFn: (id) => masterDataApi.deleteInsuranceCompany(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['insurance-companies'] });
            toast.success('Insurance company deleted');
            setDeletingItem(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    // Active dataset
    const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : (Array.isArray(categoriesData) ? categoriesData : []);
    const brands = Array.isArray(brandsData?.data) ? brandsData.data : (Array.isArray(brandsData) ? brandsData : []);
    const vehicleModels = Array.isArray(vehicleModelsData?.data) ? vehicleModelsData.data : (Array.isArray(vehicleModelsData) ? vehicleModelsData : []);
    const insuranceCompanies = Array.isArray(insuranceData?.data) ? insuranceData.data : (Array.isArray(insuranceData) ? insuranceData : []);

    const isSubmitting = createCategoryMutation.isPending || createBrandMutation.isPending || createModelMutation.isPending || createInsuranceMutation.isPending;

    const handleQuickAdd = async (e) => {
        if (e) e.preventDefault();
        const trimmed = nameInput.trim();
        if (!trimmed) {
            toast.error('Please enter a name');
            return;
        }

        if (activeTab === 'categories') {
            await createCategoryMutation.mutateAsync({ name: trimmed });
        } else if (activeTab === 'brands') {
            await createBrandMutation.mutateAsync({ name: trimmed });
        } else if (activeTab === 'vehicle-models') {
            await createModelMutation.mutateAsync({ name: trimmed });
        } else if (activeTab === 'insurance-companies') {
            await createInsuranceMutation.mutateAsync({
                name: trimmed,
                contactPhone: extraInput.trim() || undefined
            });
        }
    };

    const confirmDelete = async () => {
        if (!deletingItem) return;
        if (activeTab === 'categories') {
            await deleteCategoryMutation.mutateAsync(deletingItem._id);
        } else if (activeTab === 'brands') {
            await deleteBrandMutation.mutateAsync(deletingItem._id);
        } else if (activeTab === 'vehicle-models') {
            await deleteModelMutation.mutateAsync(deletingItem._id);
        } else if (activeTab === 'insurance-companies') {
            await deleteInsuranceMutation.mutateAsync(deletingItem._id);
        }
    };

    const currentList = useMemo(() => {
        let list = [];
        if (activeTab === 'categories') list = categories;
        else if (activeTab === 'brands') list = brands;
        else if (activeTab === 'vehicle-models') list = vehicleModels;
        else if (activeTab === 'insurance-companies') list = insuranceCompanies;

        if (!searchText.trim()) return list;
        const q = searchText.toLowerCase().trim();
        return list.filter(item => {
            const name = (item.name || '').toLowerCase();
            const code = (item.code || '').toLowerCase();
            const phone = (item.contactPhone || '').toLowerCase();
            return name.includes(q) || code.includes(q) || phone.includes(q);
        });
    }, [activeTab, categories, brands, vehicleModels, insuranceCompanies, searchText]);

    const activeMeta = TABS.find(t => t.id === activeTab) || TABS[0];
    const ActiveIcon = activeMeta.icon;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Data Entry Manager"
                subtitle="Easily manage master lookup data by simply typing the name. Saved records will automatically suggest across Invoices, Quotations, and Products."
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div
                    onClick={() => setActiveTab('categories')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all shadow-xs ${activeTab === 'categories' ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Categories</span>
                        <FolderTree size={18} className="text-blue-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-800">{categories.length}</div>
                </div>

                <div
                    onClick={() => setActiveTab('brands')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all shadow-xs ${activeTab === 'brands' ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Brands</span>
                        <Award size={18} className="text-amber-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-800">{brands.length}</div>
                </div>

                <div
                    onClick={() => setActiveTab('vehicle-models')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all shadow-xs ${activeTab === 'vehicle-models' ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Vehicle Models</span>
                        <Truck size={18} className="text-emerald-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-800">{vehicleModels.length}</div>
                </div>

                <div
                    onClick={() => setActiveTab('insurance-companies')}
                    className={`cursor-pointer p-4 rounded-xl border transition-all shadow-xs ${activeTab === 'insurance-companies' ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Insurance Cos</span>
                        <ShieldCheck size={18} className="text-purple-600" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-800">{insuranceCompanies.length}</div>
                </div>
            </div>

            {/* Main Workspace Card */}
            <Card className="p-0 overflow-hidden border border-gray-200/90 shadow-sm">
                {/* Tab Navigation Header */}
                <div className="flex items-center border-b border-gray-200 bg-gray-50/60 px-4 pt-2 gap-2 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs font-semibold'
                                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 rounded-t-lg'
                                }`}
                            >
                                <Icon size={16} className={isActive ? tab.color : 'text-gray-400'} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 1-Click Fast Entry Box */}
                <div className="p-5 border-b border-gray-100 bg-linear-to-r from-blue-50/30 via-white to-gray-50/30">
                    <form onSubmit={handleQuickAdd} className="max-w-3xl space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                            <ActiveIcon size={16} className={activeMeta.color} />
                            <h3 className="text-sm font-bold text-gray-800">
                                Quick Add New {activeMeta.label.replace(/s$/, '')}
                            </h3>
                            <span className="text-xs text-gray-400">
                                (Just enter the name and press Enter or Save)
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    placeholder={`Enter ${activeMeta.label.replace(/s$/, '')} name (e.g. ${
                                        activeTab === 'categories'
                                            ? 'Aluminium Profiles, Hardware, Electrical'
                                            : activeTab === 'brands'
                                            ? 'Alumex, Tata, Toyota, Nippon'
                                            : activeTab === 'vehicle-models'
                                            ? 'Tata LPT 1109, Isuzu NKR, Mahindra Bolero'
                                            : 'Sri Lanka Insurance, Ceylinco, Fairfirst'
                                    })...`}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition"
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </div>

                            {activeTab === 'insurance-companies' && (
                                <div className="sm:w-52">
                                    <input
                                        type="text"
                                        value={extraInput}
                                        onChange={(e) => setExtraInput(e.target.value)}
                                        placeholder="Contact Phone (Optional)"
                                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs transition"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isSubmitting || !nameInput.trim()}
                                className="shrink-0 flex items-center justify-center gap-1.5 px-5 py-2.5 shadow-xs"
                            >
                                <Plus size={16} />
                                <span>Save {activeMeta.label.replace(/s$/, '')}</span>
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Filter and Table List */}
                <div className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                        <div className="text-xs text-gray-500 font-medium">
                            Total {activeMeta.label}: <span className="font-bold text-gray-800">{currentList.length}</span>
                        </div>
                        <div className="w-full sm:w-64 relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder={`Search ${activeMeta.label}...`}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {currentList.length === 0 ? (
                        <EmptyState
                            title={`No ${activeMeta.label} Found`}
                            description={searchText ? 'No items match your search.' : `Type a name above and click Save to add the first ${activeMeta.label.replace(/s$/, '')}.`}
                        />
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/80 text-gray-600 font-semibold text-xs border-b border-gray-200 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-4 py-3">Name</th>
                                        {activeTab === 'categories' && <th className="px-4 py-3">Code</th>}
                                        {activeTab === 'insurance-companies' && <th className="px-4 py-3">Phone</th>}
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Added Date</th>
                                        {canManage && <th className="px-4 py-3 w-20 text-center">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {currentList.map((item, idx) => (
                                        <tr key={item._id || idx} className="hover:bg-blue-50/30 transition">
                                            <td className="px-4 py-3 text-center text-xs text-gray-400 font-medium">
                                                {idx + 1}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-800">
                                                {item.name}
                                            </td>
                                            {activeTab === 'categories' && (
                                                <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                                                    {item.code || '—'}
                                                </td>
                                            )}
                                            {activeTab === 'insurance-companies' && (
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {item.contactPhone || '—'}
                                                </td>
                                            )}
                                            <td className="px-4 py-3">
                                                <Badge variant={item.isActive !== false ? 'success' : 'default'}>
                                                    {item.isActive !== false ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">
                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                                            </td>
                                            {canManage && (
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingItem(item)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Delete item"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Card>

            <ConfirmDialog
                isOpen={!!deletingItem}
                title={`Delete ${activeMeta.label.replace(/s$/, '')}`}
                message={`Are you sure you want to delete "${deletingItem?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={confirmDelete}
                onClose={() => setDeletingItem(null)}
            />
        </div>
    );
}
