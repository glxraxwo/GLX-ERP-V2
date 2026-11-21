import Invoice from '../models/Invoice.js';
import Quotation from '../models/Quotation.js';
import Bill from '../models/Bill.js';

/**
 * Enriches a Payment object with linked document totals and remaining balance dues.
 * Works with both plain JS objects (.lean()) and Mongoose documents.
 */
export async function enrichPaymentWithDocumentDetails(payment) {
    if (!payment) return payment;

    const allocations = Array.isArray(payment.allocations) ? payment.allocations : [];
    if (allocations.length === 0) return payment;

    let totalDocAmount = 0;
    let totalBalanceDue = 0;
    let hasDocBalance = false;

    for (const alloc of allocations) {
        if (!alloc) continue;

        if (alloc.documentType === 'invoice') {
            const query = alloc.documentId ? { _id: alloc.documentId } : (alloc.documentNumber ? { invoiceNumber: alloc.documentNumber } : null);
            if (query) {
                const inv = await Invoice.findOne(query)
                    .select('grandTotal totalAmount balanceDue balanceAmount amountPaid invoiceNumber vehicleNo customerName')
                    .lean();
                if (inv) {
                    alloc.docTotal = Number(inv.grandTotal !== undefined ? inv.grandTotal : (inv.totalAmount || 0));
                    alloc.balanceDue = Number(
                        inv.balanceDue !== undefined
                            ? inv.balanceDue
                            : (inv.balanceAmount !== undefined
                                ? inv.balanceAmount
                                : Math.max(0, alloc.docTotal - (inv.amountPaid || 0)))
                    );
                    alloc.vehicleNo = inv.vehicleNo || '';
                    if (!payment.vehicleNo && inv.vehicleNo) payment.vehicleNo = inv.vehicleNo;
                    totalDocAmount += alloc.docTotal;
                    totalBalanceDue += alloc.balanceDue;
                    hasDocBalance = true;
                }
            }
        } else if (alloc.documentType === 'quotation' || alloc.documentType === 'estimate') {
            const query = alloc.documentId ? { _id: alloc.documentId } : (alloc.documentNumber ? { quoteNumber: alloc.documentNumber } : null);
            if (query) {
                const quote = await Quotation.findOne(query)
                    .select('grandTotal totalAmount balanceAmount advanceAmount quoteNumber vehicleNo customerName')
                    .lean();
                if (quote) {
                    alloc.docTotal = Number(quote.grandTotal !== undefined ? quote.grandTotal : (quote.totalAmount || 0));
                    alloc.balanceDue = Number(
                        quote.balanceAmount !== undefined
                            ? quote.balanceAmount
                            : Math.max(0, alloc.docTotal - (quote.advanceAmount || 0))
                    );
                    alloc.vehicleNo = quote.vehicleNo || '';
                    if (!payment.vehicleNo && quote.vehicleNo) payment.vehicleNo = quote.vehicleNo;
                    totalDocAmount += alloc.docTotal;
                    totalBalanceDue += alloc.balanceDue;
                    hasDocBalance = true;
                }
            }
        } else if (alloc.documentType === 'bill') {
            const query = alloc.documentId ? { _id: alloc.documentId } : (alloc.documentNumber ? { billNumber: alloc.documentNumber } : null);
            if (query) {
                const bill = await Bill.findOne(query)
                    .select('grandTotal subtotal balanceDue amountPaid billNumber')
                    .lean();
                if (bill) {
                    alloc.docTotal = Number(bill.grandTotal !== undefined ? bill.grandTotal : (bill.subtotal || 0));
                    alloc.balanceDue = Number(
                        bill.balanceDue !== undefined
                            ? bill.balanceDue
                            : Math.max(0, alloc.docTotal - (bill.amountPaid || 0))
                    );
                    totalDocAmount += alloc.docTotal;
                    totalBalanceDue += alloc.balanceDue;
                    hasDocBalance = true;
                }
            }
        }
    }

    if (hasDocBalance) {
        payment.totalDocAmount = totalDocAmount;
        payment.totalBalanceDue = totalBalanceDue;
    }

    return payment;
}

export default enrichPaymentWithDocumentDetails;
