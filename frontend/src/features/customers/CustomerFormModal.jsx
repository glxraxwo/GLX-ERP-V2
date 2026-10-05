import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateCustomer, useUpdateCustomer } from './useCustomers';
import { usersApi } from '../users/usersApi';

const customerSimpleSchema = z.object({
    displayName: z.string().trim().min(1, 'Customer name is required').max(100),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().trim().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email address',
    }).optional().or(z.literal('')),
    whatsappNumber: z.string().optional().or(z.literal('')),
    taxRegistrationNumber: z.string().optional().or(z.literal('')),
    businessRegistrationNumber: z.string().optional().or(z.literal('')),
    billingAddress: z.string().optional().or(z.literal('')),
    idNumber: z.string().optional().or(z.literal('')),
    assignedSalesRep: z.string().optional().or(z.literal('')),
});

export default function CustomerFormModal({ isOpen, onClose, customer = null }) {
    const isEdit = !!customer;

    const { data: usersData } = useQuery({
        queryKey: ['users', 'active'],
        queryFn: () => usersApi.list({ isActive: true, limit: 500 }),
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useCreateCustomer();
    const updateMutation = useUpdateCustomer();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(customerSimpleSchema),
        defaultValues: {
            displayName: '',
            phone: '',
            email: '',
            whatsappNumber: '',
            taxRegistrationNumber: '',
            businessRegistrationNumber: '',
            billingAddress: '',
            idNumber: '',
            assignedSalesRep: '',
        },
    });

    useEffect(() => {
        if (isOpen && customer) {
            reset({
                displayName: customer.displayName || customer.companyName || '',
                phone: customer.primaryContact?.phone || '',
                email: customer.primaryContact?.email || '',
                whatsappNumber: customer.whatsappNumber || customer.primaryContact?.mobile || '',
                taxRegistrationNumber: customer.taxRegistrationNumber || '',
                businessRegistrationNumber: customer.businessRegistrationNumber || '',
                billingAddress: customer.billingAddress?.line1 || (typeof customer.billingAddress === 'string' ? customer.billingAddress : ''),
                idNumber: customer.idNumber || '',
                assignedSalesRep: customer.assignedSalesRep?._id || customer.assignedSalesRep || '',
            });
        } else if (isOpen && !customer) {
            reset({
                displayName: '',
                phone: '',
                email: '',
                whatsappNumber: '',
                taxRegistrationNumber: '',
                businessRegistrationNumber: '',
                billingAddress: '',
                idNumber: '',
                assignedSalesRep: '',
            });
        }
    }, [isOpen, customer, reset]);

    const onSubmit = async (data) => {
        const trimmedName = data.displayName.trim();
        const payload = {
            displayName: trimmedName,
            companyName: isEdit ? (customer?.companyName || trimmedName) : trimmedName,
            taxRegistrationNumber: data.taxRegistrationNumber?.trim() || undefined,
            businessRegistrationNumber: data.businessRegistrationNumber?.trim() || undefined,
            idNumber: data.idNumber?.trim() || undefined,
            whatsappNumber: data.whatsappNumber?.trim() || undefined,
            assignedSalesRep: data.assignedSalesRep || (isEdit ? null : undefined),
            primaryContact: {
                ...(customer?.primaryContact || {}),
                name: trimmedName,
                phone: data.phone?.trim() || undefined,
                email: data.email?.trim() || undefined,
                mobile: data.whatsappNumber?.trim() || undefined,
            },
            billingAddress: data.billingAddress?.trim() ? {
                ...(customer?.billingAddress || {}),
                line1: data.billingAddress.trim(),
                country: customer?.billingAddress?.country || 'Sri Lanka',
                isDefault: true,
            } : (isEdit ? { ...(customer?.billingAddress || {}), line1: '' } : undefined),
        };

        if (!isEdit) {
            payload.customerType = 'company';
            payload.businessType = 'retailer';
            payload.status = 'active';
            payload.paymentTerms = { type: 'cod', creditDays: 0, creditLimit: 0 };
        }

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ id: customer._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            onClose();
        } catch { }
    };

    const userList = Array.isArray(usersData?.data) ? usersData.data : (Array.isArray(usersData) ? usersData : []);
    const repOptions = userList.map((u) => ({
        value: u._id,
        label: `${u.firstName} ${u.lastName || ''} ${u.role ? `(${u.role})` : ''}`.trim(),
    }));

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Customer — ${customer?.customerCode || customer?.displayName}` : 'Add Customer'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Row 1: Customer Name & Phone Num */}
                        <div>
                            <Input
                                label="Customer Name"
                                required
                                placeholder="Customer Name"
                                error={errors.displayName?.message}
                                {...register('displayName')}
                                autoFocus
                            />
                        </div>

                        <div>
                            <Input
                                label="Phone Num"
                                placeholder="Phone Num"
                                error={errors.phone?.message}
                                {...register('phone')}
                            />
                        </div>

                        {/* Row 2: Email & WhatsApp Num */}
                        <div>
                            <Input
                                label="Email"
                                type="email"
                                placeholder="Email Address"
                                error={errors.email?.message}
                                {...register('email')}
                            />
                        </div>

                        <div>
                            <Input
                                label="WhatsApp Num"
                                placeholder="WhatsApp Num"
                                error={errors.whatsappNumber?.message}
                                {...register('whatsappNumber')}
                            />
                        </div>

                        {/* Row 3: VAT Number & BR Number */}
                        <div>
                            <Input
                                label="VAT Number"
                                placeholder="VAT Number"
                                error={errors.taxRegistrationNumber?.message}
                                {...register('taxRegistrationNumber')}
                            />
                        </div>

                        <div>
                            <Input
                                label="BR Number"
                                placeholder="BR Number"
                                error={errors.businessRegistrationNumber?.message}
                                {...register('businessRegistrationNumber')}
                            />
                        </div>

                        {/* Row 4: Billing Address (Wide - Full width across 2 columns) */}
                        <div className="sm:col-span-2">
                            <Input
                                label="Billing Address"
                                placeholder="Billing Address"
                                error={errors.billingAddress?.message}
                                {...register('billingAddress')}
                            />
                        </div>

                        {/* Row 5: ID Number & Sales Rep */}
                        <div>
                            <Input
                                label="ID Number"
                                placeholder="ID Number (NIC / Passport)"
                                error={errors.idNumber?.message}
                                {...register('idNumber')}
                            />
                        </div>

                        <div>
                            <Select
                                label="Sales Rep"
                                placeholder="-- Select Sales Rep (Optional) --"
                                options={repOptions}
                                error={errors.assignedSalesRep?.message}
                                {...register('assignedSalesRep')}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-b-lg">
                    <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        {isEdit ? 'Update Customer' : 'Add Customer'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}