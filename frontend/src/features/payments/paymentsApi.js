import api from '../../api/axios';

export const paymentsApi = {
    list: async (params = {}) => (await api.get('/payments', { params })).data,
    getById: async (id) => (await api.get(`/payments/${id}`)).data,
    create: async (data) => (await api.post('/payments', data)).data,
    createVoucher: async (data) => (await api.post('/payments/voucher', data)).data,
    getLinkableDocuments: async (params = {}) => (await api.get('/payments/linkable-documents', { params })).data,
    getDocumentSummary: async (documentId) => (await api.get(`/payments/document-summary/${documentId}`)).data,
    cancel: async (id, data = {}) => (await api.put(`/payments/${id}/cancel`, data)).data,
    update: async (id, data = {}) => (await api.put(`/payments/${id}`, data)).data,
};