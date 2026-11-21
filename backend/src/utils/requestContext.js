import { AsyncLocalStorage } from 'async_hooks';

/**
 * Keeps small per-request values available to deeper code (for example the SMS
 * service) without passing them through every function call.
 *
 * Currently used for the "Also send this SMS to the manager?" answer that the
 * frontend sends in the `X-Manager-Sms` header ("yes" or "no").
 */
const requestStore = new AsyncLocalStorage();

export const requestContextMiddleware = (req, res, next) => {
    const raw = String(req.headers['x-manager-sms'] || '').trim().toLowerCase();
    const managerSms = raw === 'yes' ? 'yes' : (raw === 'no' ? 'no' : null);
    requestStore.run({ managerSms }, () => next());
};

/**
 * @returns {'yes' | 'no' | null} the user's answer for this request, or null when it was not asked
 */
export const getManagerSmsPreference = () => requestStore.getStore()?.managerSms ?? null;
