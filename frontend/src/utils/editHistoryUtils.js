/**
 * Helpers for tracking and displaying document revisions / edit history.
 * Formats: "Edit 1: 02/Oct/2026 03:45 PM", "Edit 2: 02/Oct/2026 04:15 PM"
 */

export const formatEditItem = (item, fallbackIndex = 1) => {
    if (!item) return '';
    const num = item.editNumber || fallbackIndex;
    const dateVal = item.editedAt || item.date || item.createdAt || item.updatedAt;
    if (!dateVal) return `Edit ${num}`;

    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return `Edit ${num}`;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(d.getDate()).padStart(2, '0');
        const mon = months[d.getMonth()];
        const yr = d.getFullYear();

        let h = d.getHours();
        const mi = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        const timeStr = `${String(h).padStart(2, '0')}:${mi} ${ampm}`;

        return `Edit ${num}: ${day}/${mon}/${yr} ${timeStr}`;
    } catch {
        return `Edit ${num}`;
    }
};

export const getDocumentEditHistory = (doc) => {
    if (!doc) return [];
    if (Array.isArray(doc.editHistory) && doc.editHistory.length > 0) {
        return [...doc.editHistory].sort((a, b) => (a.editNumber || 0) - (b.editNumber || 0));
    }
    const count = Number(doc.editCount) || 0;
    if (count > 0 && (doc.updatedAt || doc.createdAt)) {
        return [{
            editNumber: count,
            editedAt: doc.updatedAt || doc.createdAt,
            editedByName: doc.updatedBy?.firstName ? `${doc.updatedBy.firstName} ${doc.updatedBy.lastName || ''}`.trim() : 'Admin'
        }];
    }
    return [];
};
