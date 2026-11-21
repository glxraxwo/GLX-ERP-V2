/**
 * Helpers for naming downloaded PDF files.
 * Every customer document PDF gets the customer / party name in its file name,
 * e.g. receipt_REC-0012_Kamal_Perera.pdf or invoice_INV-0045_ABC_Traders.pdf
 */

export const getDocumentPartyName = (doc) => {
    if (!doc) return '';
    const employeeName = doc.employeeId
        ? (doc.employeeId.callingName || `${doc.employeeId.firstName || ''} ${doc.employeeId.lastName || ''}`.trim())
        : '';
    const name = doc.customerSnapshot?.name
        || doc.customerName
        || doc.partyName
        || doc.vehicleOwner
        || doc.customer?.displayName || doc.customer?.companyName
        || doc.customerId?.displayName || doc.customerId?.companyName || doc.customerId?.name
        || doc.supplierId?.displayName || doc.supplierId?.companyName
        || employeeName
        || '';
    return typeof name === 'string' ? name : '';
};

export const buildDocumentFileName = (docType, docNumber, customerName, suffix = '') => {
    const cleanType = String(docType || 'document').toLowerCase().replace(/[\/\\:]/g, '_');
    const cleanNum = String(docNumber || 'document').replace(/[\\/:*?"<>|]/g, '_');

    let custPart = '';
    if (customerName && typeof customerName === 'string') {
        // Keep letters and numbers from any language, drop characters Windows does not allow
        const words = customerName
            .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 4)
            .join('_');
        if (words) custPart = `_${words}`;
    }
    const cleanSuffix = suffix ? ('_' + String(suffix).replace(/^_+/, '')) : '';
    return `${cleanType}_${cleanNum}${custPart}${cleanSuffix}.pdf`;
};

/**
 * Content-Disposition header value that also works for non-English (e.g. Sinhala) names.
 */
export const pdfContentDisposition = (filename) => {
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};
