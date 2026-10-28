/**
 * Service to manage and persist Terms and Conditions for Quotations and Estimates.
 * Ensures that when a user customizes and saves Terms and Conditions,
 * subsequent Quotations and Estimates automatically load those edited values by default.
 */

export const DEFAULT_TERMS = {
    conditionOfPayments: 'a). 0% Advance Payment with the firm Order.\nb). Balance Payment on Completion of Work',
    completionOfWork: '4 to 6 working Days after the Order Confirmation.',
    validityQuotation: '30 Working Days From the Issued Date..',
    warrantyCondition: 'a). Please See the Description..\nb). Warranty Will be Issued with the Invoice.',
    remarks: '',
};

const COMMON_STORAGE_KEY = 'glx_default_terms';

/**
 * Retrieve saved default terms for a given document type ('quotation', 'estimate', etc.)
 * Falls back to common saved terms, and then to default terms if nothing is stored.
 */
export const getSavedTerms = (docType) => {
    try {
        const typeKey = docType ? `glx_default_terms_${docType.toLowerCase()}` : null;
        let stored = null;

        if (typeKey) {
            const rawType = localStorage.getItem(typeKey);
            if (rawType) {
                try {
                    stored = JSON.parse(rawType);
                } catch {
                    stored = null;
                }
            }
        }

        if (!stored) {
            const rawCommon = localStorage.getItem(COMMON_STORAGE_KEY);
            if (rawCommon) {
                try {
                    stored = JSON.parse(rawCommon);
                } catch {
                    stored = null;
                }
            }
        }

        if (stored && typeof stored === 'object') {
            return {
                conditionOfPayments: typeof stored.conditionOfPayments === 'string' ? stored.conditionOfPayments : DEFAULT_TERMS.conditionOfPayments,
                completionOfWork: typeof stored.completionOfWork === 'string' ? stored.completionOfWork : DEFAULT_TERMS.completionOfWork,
                validityQuotation: typeof stored.validityQuotation === 'string' ? stored.validityQuotation : DEFAULT_TERMS.validityQuotation,
                warrantyCondition: typeof stored.warrantyCondition === 'string' ? stored.warrantyCondition : DEFAULT_TERMS.warrantyCondition,
                remarks: typeof stored.remarks === 'string' ? stored.remarks : DEFAULT_TERMS.remarks,
            };
        }
    } catch (e) {
        console.warn('Failed to load saved terms from localStorage:', e);
    }

    return { ...DEFAULT_TERMS };
};

/**
 * Save default terms to localStorage.
 * Updates both the specific document type and the common fallback.
 */
export const saveDefaultTerms = (terms, docType) => {
    if (!terms || typeof terms !== 'object') return;

    try {
        const payload = {
            conditionOfPayments: typeof terms.conditionOfPayments === 'string' ? terms.conditionOfPayments : DEFAULT_TERMS.conditionOfPayments,
            completionOfWork: typeof terms.completionOfWork === 'string' ? terms.completionOfWork : DEFAULT_TERMS.completionOfWork,
            validityQuotation: typeof terms.validityQuotation === 'string' ? terms.validityQuotation : DEFAULT_TERMS.validityQuotation,
            warrantyCondition: typeof terms.warrantyCondition === 'string' ? terms.warrantyCondition : DEFAULT_TERMS.warrantyCondition,
            remarks: typeof terms.remarks === 'string' ? terms.remarks : '',
        };

        // Always save as common fallback
        localStorage.setItem(COMMON_STORAGE_KEY, JSON.stringify(payload));

        // Also save for the specific docType
        if (docType) {
            const typeKey = `glx_default_terms_${docType.toLowerCase()}`;
            localStorage.setItem(typeKey, JSON.stringify(payload));
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('glx_terms_updated', {
                detail: { docType, terms: payload }
            }));
        }

        return payload;
    } catch (e) {
        console.error('Failed to save default terms to localStorage:', e);
    }
};
