import api from '../../api/axios';

export const masterDataApi = {
    // Categories
    getCategories: async (params = {}) => {
        const response = await api.get('/categories', { params });
        return response.data;
    },
    createCategory: async (data) => {
        const response = await api.post('/categories', typeof data === 'string' ? { name: data } : data);
        return response.data;
    },
    deleteCategory: async (id) => {
        const response = await api.delete(`/categories/${id}`);
        return response.data;
    },

    // Brands
    getBrands: async (params = {}) => {
        const response = await api.get('/brands', { params });
        return response.data;
    },
    createBrand: async (data) => {
        const response = await api.post('/brands', typeof data === 'string' ? { name: data } : data);
        return response.data;
    },
    deleteBrand: async (id) => {
        const response = await api.delete(`/brands/${id}`);
        return response.data;
    },

    // Vehicle Models
    getVehicleModels: async (params = {}) => {
        const response = await api.get('/vehicle-models', { params });
        return response.data;
    },
    createVehicleModel: async (data) => {
        const response = await api.post('/vehicle-models', typeof data === 'string' ? { name: data } : data);
        return response.data;
    },
    deleteVehicleModel: async (id) => {
        const response = await api.delete(`/vehicle-models/${id}`);
        return response.data;
    },

    // Insurance Companies
    getInsuranceCompanies: async (params = {}) => {
        const response = await api.get('/insurance-companies', { params });
        return response.data;
    },
    createInsuranceCompany: async (data) => {
        const response = await api.post('/insurance-companies', typeof data === 'string' ? { name: data } : data);
        return response.data;
    },
    deleteInsuranceCompany: async (id) => {
        const response = await api.delete(`/insurance-companies/${id}`);
        return response.data;
    },

    // Next Document ID Preview
    getNextDocumentNumber: async (type) => {
        const response = await api.get('/documents/next-number', { params: { type } });
        return response.data;
    },
};
