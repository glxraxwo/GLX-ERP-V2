import axios from 'axios';
import { getApiUrl } from './config';
import { isManagerSmsRequest, getManagerPhone, askSendToManager, clearManagerPhoneCache } from '../utils/managerSmsPrompt';

const api = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token and global date filter to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Apply global date filter if enabled
        const dateFilterEnabled = localStorage.getItem('dateFilterEnabled') === 'true';
        if (dateFilterEnabled && config.method === 'get') {
            const filterMonth = localStorage.getItem('filterMonth');
            const filterYear = localStorage.getItem('filterYear');

            if (filterMonth && filterYear && filterMonth !== 'ALL') {
                const year = parseInt(filterYear);
                const month = parseInt(filterMonth); // 1-indexed (Jan = 1)

                // Calculate start and end dates in UTC
                const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
                const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

                // Paths that support date-range filtering
                const filterablePaths = [
                    '/sales-orders', '/purchase-orders', '/invoices', '/bills', 
                    '/payments', '/petty-cash', '/production-batches', '/grns', 
                    '/farm-harvests', '/damages', '/repairs', '/crm/inquiries', 
                    '/crm/quotations', '/attendance', '/payroll', '/audit-logs'
                ];

                const isFilterable = filterablePaths.some(path => config.url.includes(path));

                if (isFilterable) {
                    config.params = config.params || {};
                    // Only apply global filter if the specific request hasn't set custom date parameters
                    if (!config.params.startDate) config.params.startDate = startDate;
                    if (!config.params.endDate) config.params.endDate = endDate;
                }
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Ask "Also send this SMS to the manager?" for every request that records a
// received payment or sends an SMS. Skipped when no manager number is saved
// in Settings. The answer goes to the backend in the X-Manager-Sms header.
api.interceptors.request.use(async (config) => {
    if (config.skipManagerSmsPrompt || config.headers?.['X-Manager-Sms']) return config;
    if (!isManagerSmsRequest(config)) return config;
    const managerPhone = await getManagerPhone(api);
    if (!managerPhone) {
        config.headers['X-Manager-Sms'] = 'no';
        return config;
    }
    const yes = await askSendToManager(managerPhone);
    config.headers['X-Manager-Sms'] = yes ? 'yes' : 'no';
    return config;
});

// Handle API error responses globally
api.interceptors.response.use(
    (response) => {
        // Settings saved -> reload the manager number next time it is needed
        if (String(response.config?.method).toLowerCase() === 'put' && /\/settings\/?$/.test(String(response.config?.url || '').split('?')[0])) {
            clearManagerPhoneCache();
        }
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message || 'An unexpected error occurred';

        if (status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('auth-storage'); // Reset Zustand persisted auth state
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        } else if (status === 403) {
            import('react-hot-toast').then(({ default: toast }) => {
                toast.error(message || 'You do not have permission to perform this action.');
            }).catch(() => {});
        } else if (status >= 500) {
            import('react-hot-toast').then(({ default: toast }) => {
                toast.error(message || 'Server error. Please try again or contact support.');
            }).catch(() => {});
        }
        return Promise.reject(error);
    }
);

export default api;