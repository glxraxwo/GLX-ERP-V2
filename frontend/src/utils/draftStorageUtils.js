/**
 * Universal Form Draft Storage Utility
 * Provides safe, persistent localStorage caching for Invoices, Quotations, and Estimates.
 * Protects user work across page navigations, tab switches, and accidental reloads.
 */

const DRAFT_PREFIX = 'glx_erp_draft_';

/**
 * Safely stringify and store form draft in localStorage with quota error fallback.
 */
export const saveFormDraft = (key, data) => {
    if (!key || !data) return false;
    try {
        const storageKey = `${DRAFT_PREFIX}${key}`;
        const payload = {
            savedAt: Date.now(),
            data
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return true;
    } catch (e) {
        // Handle QuotaExceededError (e.g. large base64 images in draft)
        console.warn(`[DraftStorage] Storage quota reached for ${key}, attempting stripped save:`, e);
        try {
            const strippedData = { ...data };
            // Strip out large image data URLs if any
            if (strippedData.numberPlateImage && String(strippedData.numberPlateImage).startsWith('data:')) {
                delete strippedData.numberPlateImage;
            }
            if (strippedData.lorryBodyImage && String(strippedData.lorryBodyImage).startsWith('data:')) {
                delete strippedData.lorryBodyImage;
            }
            if (Array.isArray(strippedData.photos)) {
                strippedData.photos = strippedData.photos.filter(p => !String(p).startsWith('data:') && !String(p?.url || p?.src).startsWith('data:'));
            }
            localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify({
                savedAt: Date.now(),
                data: strippedData
            }));
            return true;
        } catch (innerErr) {
            console.error(`[DraftStorage] Failed to save draft for ${key}:`, innerErr);
            return false;
        }
    }
};

/**
 * Retrieve saved draft from localStorage. Returns null if missing or invalid.
 */
export const getFormDraft = (key) => {
    if (!key) return null;
    try {
        const storageKey = `${DRAFT_PREFIX}${key}`;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) {
            return {
                savedAt: parsed.savedAt,
                data: parsed.data
            };
        }
        return null;
    } catch (e) {
        console.error(`[DraftStorage] Failed to read draft for ${key}:`, e);
        return null;
    }
};

/**
 * Clear a specific form draft.
 */
export const clearFormDraft = (key) => {
    if (!key) return;
    try {
        localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
    } catch (e) {
        console.error(`[DraftStorage] Failed to clear draft for ${key}:`, e);
    }
};

/**
 * Format relative or time string for the draft banner.
 */
export const formatDraftTime = (timestamp) => {
    if (!timestamp) return 'recently';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
        return `today at ${timeStr}`;
    }
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
};
