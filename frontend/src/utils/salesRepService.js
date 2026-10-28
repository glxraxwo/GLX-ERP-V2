/**
 * Service to manage and persist Sales Person / Sales Rep names.
 * Ensures names typed by users are saved and automatically suggested in future entries.
 */

const STORAGE_KEY = 'glx_saved_sales_persons';
const DEFAULT_REPS = ['Asanka'];

/**
 * Retrieve the list of saved sales reps from localStorage.
 */
export const getSavedSalesReps = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [...DEFAULT_REPS];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(n => typeof n === 'string' && n.trim().length > 0);
        }
    } catch (e) {
        console.warn('Failed to parse saved sales reps from localStorage:', e);
    }
    return [...DEFAULT_REPS];
};

/**
 * Save a newly typed sales person name into localStorage.
 * Deduplicates case-insensitively and dispatches a window event.
 */
export const saveSalesRep = (name) => {
    if (!name || typeof name !== 'string') return;
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
        const current = getSavedSalesReps();
        const exists = current.some(n => n.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
            const updated = [trimmed, ...current];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('glx_sales_reps_updated', { detail: updated }));
            }
            return updated;
        }
    } catch (e) {
        console.error('Failed to save sales rep:', e);
    }
};

/**
 * Build a deduplicated list of options { value, label } for dropdowns / comboboxes.
 * Merges localStorage reps with any extra sources (e.g. employees, users, existing documents).
 */
export const getSalesRepOptions = (extraSources = []) => {
    const saved = getSavedSalesReps();
    const map = new Map();

    const add = (val) => {
        if (!val || typeof val !== 'string') return;
        const str = val.trim();
        if (!str) return;
        const key = str.toLowerCase();
        if (!map.has(key)) {
            map.set(key, str);
        }
    };

    saved.forEach(add);
    (extraSources || []).forEach(add);

    return Array.from(map.values()).map(name => ({
        value: name,
        label: name
    }));
};
