import PdfPrinter from 'pdfkit-table';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '../assets/logo.jpg');

/* ─── Helpers ────────────────────────────────────────────────────────── */
const fmtNum = (num, min = 2, max = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(d.getDate()).padStart(2,'0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
    } catch { return String(dateStr); }
};

const fmtTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) return '';
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Colombo'
        });
    } catch { return ''; }
};

const fmtPrintTs = (d = new Date()) => {
    try {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const day   = String(d.getDate()).padStart(2,'0');
        const mon   = months[d.getMonth()];
        const yr    = d.getFullYear();
        let h       = d.getHours();
        const mi    = String(d.getMinutes()).padStart(2,'0');
        const se    = String(d.getSeconds()).padStart(2,'0');
        const ampm  = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${day}/${mon}/${yr}    ${h}:${mi}:${se}${ampm}`;
    } catch { return new Date().toLocaleString(); }
};

const convertNumberToWords = (amount) => {
    const num = Math.floor(Math.abs(amount || 0));
    if (num === 0) return 'Zero Rupees';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return inWords(Math.floor(n / 100)) + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
    };

    const cents = Math.round(((amount || 0) - num) * 100);
    let words = `Sri Lankan Rupees ${inWords(num)}`;
    if (cents > 0) {
        words += ` and ${inWords(cents)} Cents`;
    }
    return words + ' Only';
};

/**
 * Renders the official GLX company letterhead matching media_1793119480998_7033f283.png
 */
const drawOfficialHeader = (pdfDoc) => {
    // 1. Logo
    if (fs.existsSync(LOGO_PATH)) {
        try {
            pdfDoc.image(LOGO_PATH, 36, 24, { width: 54, height: 54, fit: [54, 54] });
        } catch (e) {
            // fallback if image fail
        }
    }

    // 2. Company Title & Subtitle
    const textX = 100;
    pdfDoc.fillColor('#000000').font('Helvetica-Bold').fontSize(14)
        .text('GLX TRUCK BODY ENGINEERS', textX, 24, { characterSpacing: 0.3 });
    pdfDoc.fillColor('#333333').font('Helvetica-Bold').fontSize(7.5)
        .text('ALUMINIUM , STEEL & FREEZER BOX MANUFACTURE', textX, 40, { characterSpacing: 0.5 });

    // 3. 3-Column Address Block
    const colY = 54;
    const col1X = textX;
    const col2X = 248;
    const col3X = 398;

    pdfDoc.fillColor('#222222').font('Helvetica').fontSize(7).lineGap(1.5);

    pdfDoc.text('No.14,Negambo Road,\nThudella,Ja-Ela,\nSri Lanka.\n(11350)', col1X, colY, { width: 140 });
    pdfDoc.text('No.2020/3L,2,Seeduwa Road,\nKotugoda,Ja-Ela.\nSri Lanka.\n(11390)', col2X, colY, { width: 140 });
    pdfDoc.text('Mobile : 071 6666 888\nTel        : 011 740 4446\nEmail   : glx.engi@gmail.com\nWeb     : www.glx.lk', col3X, colY, { width: 160 });

    pdfDoc.lineGap(0);

    // 4. Horizontal Divider Line
    const dividerY = 102;
    pdfDoc.moveTo(36, dividerY).lineTo(pdfDoc.page.width - 36, dividerY).lineWidth(1.2).strokeColor('#333333').stroke();
};

/**
 * Generate a professional, clean A4 PDF buffer for any Quotation, Estimate, or Invoice.
 * 100% Matches GLX Physical Print Letterhead.
 */
export const generateDocumentPDF = async ({ doc, docType = 'quotation', settings = null }) => {
    return new Promise((resolve, reject) => {
        try {
            const pdfDoc = new PdfPrinter({
                margin: 36,
                size: 'A4',
                layout: 'portrait',
                info: {
                    Title: `${docType.toUpperCase()} - ${doc.quotationCode || doc.quoteNumber || doc.invoiceNumber || 'Document'}`,
                    Author: 'GLX TRUCK BODY ENGINEERS',
                    Subject: `${docType.toUpperCase()}`,
                }
            });

            const buffers = [];
            pdfDoc.on('data', buffers.push.bind(buffers));
            pdfDoc.on('end', () => resolve(Buffer.concat(buffers)));
            pdfDoc.on('error', reject);

            const isProforma = docType === 'proforma' || doc.invoiceType === 'proforma' || (doc.invoiceNumber && doc.invoiceNumber.startsWith('PI'));
            const isEstimate = !isProforma && (docType === 'estimate' || (doc.quoteNumber && doc.quoteNumber.startsWith('EST')));
            const isInvoice = !isProforma && !isEstimate && (docType === 'invoice' || !!doc.invoiceNumber);

            const docNumberLabel = isInvoice ? 'Invoice No.' : (isEstimate ? 'Estimate No.' : (isProforma ? 'Proforma No.' : 'Quotation No.'));
            const docCode = doc.quotationCode || doc.quoteNumber || doc.invoiceNumber || doc.proformaNumber || 'DOC-001';

            const custName = doc.customerName || doc.customerSnapshot?.name || doc.customerId?.displayName || doc.customerId?.companyName || 'Valued Customer';
            const custPhone = doc.customerPhone || doc.customerSnapshot?.phone || doc.customerId?.primaryContact?.phone || doc.customerId?.primaryContact?.mobile || '—';
            const custAddress = doc.customerAddress || doc.billingAddress?.line1 || doc.customerId?.billingAddress?.line1 || '—';
            const vehicleNo = doc.vehicleNo || '—';
            const vehicleModel = doc.vehicleModel || '—';
            const jobCaption = doc.jobCaption || '—';
            const salesRep = doc.salesRep || doc.salesRepId?.name || 'Asanka';
            const branch = doc.branch || 'JA-ELA';
            const rawDate = doc.date || doc.invoiceDate || doc.createdAt || new Date();
            const docDateStr = fmtDate(rawDate);
            const docTimeStr = fmtTime(rawDate);
            const printTimestamp = fmtPrintTs();

            // ── 1. Official Header ───────────────────────────────────────────
            drawOfficialHeader(pdfDoc);

            // ── 2. Meta Info (Customer Left vs Document Details Right) ────────
            const metaY = 112;

            // Left Column: Customer details
            pdfDoc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text('BILL TO / CUSTOMER', 36, metaY);
            pdfDoc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(custName, 36, metaY + 14, { width: 280 });
            
            let curY = pdfDoc.y + 2;
            if (custAddress && custAddress !== '—') {
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#222222').text(custAddress, 36, curY, { width: 280 });
                curY = pdfDoc.y + 2;
            }
            if (custPhone && custPhone !== '—') {
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#222222').text(custPhone, 36, curY);
                curY = pdfDoc.y + 2;
            }
            if (vehicleNo && vehicleNo !== '—') {
                pdfDoc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text(vehicleNo, 36, curY);
                curY = pdfDoc.y + 2;
            }
            if (jobCaption && jobCaption !== '—') {
                pdfDoc.font('Helvetica').fontSize(8).fillColor('#444444').text(`Job: ${jobCaption}`, 36, curY, { width: 280 });
                curY = pdfDoc.y + 2;
            }

            // Right Column: Document Details
            const rightX = 350;
            const rightWidth = pdfDoc.page.width - 36 - rightX;
            let metaRightY = metaY;

            const renderMetaRow = (label, val, subVal = '') => {
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text(label, rightX, metaRightY, { width: 85 });
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#000000').text(val, rightX + 85, metaRightY, { width: rightWidth - 85 });
                metaRightY += 14;
                if (subVal) {
                    pdfDoc.font('Helvetica').fontSize(7.5).fillColor('#333333').text(subVal, rightX + 85, metaRightY - 1, { width: rightWidth - 85 });
                    metaRightY += 12;
                }
            };

            renderMetaRow(docNumberLabel, docCode);
            renderMetaRow('Sales', salesRep);
            renderMetaRow('Branch', branch);
            renderMetaRow('Date', docDateStr, docTimeStr);

            pdfDoc.y = Math.max(curY + 10, metaRightY + 8, 195);

            // ── 3. Line Items Table ──────────────────────────────────────────
            const items = Array.isArray(doc.items) ? doc.items : [];
            let calcSubtotal = 0;
            let calcTotalDisc = 0;

            const tableRows = items.map((item, idx) => {
                const qty = Number(item.quantity || item.qty || 1);
                const rate = Number(item.unitPrice || item.rate || 0);
                const gross = qty * rate;
                const disc = Number(item.discount || item.discountAmount || 0);
                const lineTotal = item.subtotal !== undefined ? Number(item.subtotal) : (gross - disc);
                calcSubtotal += gross;
                calcTotalDisc += disc;

                const name = item.productName || item.product?.name || item.productId?.name || item.description || `Item #${idx + 1}`;
                const desc = item.description && item.description !== name ? `\n${item.description}` : '';

                return {
                    description: `${name}${desc}`,
                    rate: fmtNum(rate),
                    qty: String(qty),
                    amount: fmtNum(lineTotal)
                };
            });

            if (tableRows.length === 0) {
                tableRows.push({
                    description: doc.jobCaption || 'General Engineering / Repair Service',
                    rate: fmtNum(doc.grandTotal || doc.totalAmount || 0),
                    qty: '1',
                    amount: fmtNum(doc.grandTotal || doc.totalAmount || 0)
                });
            }

            const table = {
                headers: [
                    { label: 'DESCRIPTION', property: 'description', width: 263, align: 'left', headerColor: '#FFFFFF', headerAlign: 'left' },
                    { label: 'RATE', property: 'rate', width: 85, align: 'right', headerColor: '#FFFFFF', headerAlign: 'right' },
                    { label: 'QTY', property: 'qty', width: 55, align: 'center', headerColor: '#FFFFFF', headerAlign: 'center' },
                    { label: 'AMOUNT', property: 'amount', width: 120, align: 'right', headerColor: '#FFFFFF', headerAlign: 'right' },
                ],
                datas: tableRows,
                options: {
                    padding: 5,
                    columnSpacing: 4,
                    divider: {
                        header: { disabled: false, width: 1.2, opacity: 1 },
                        horizontal: { disabled: false, width: 0.5, opacity: 0.15 }
                    }
                }
            };

            const renderDocSummaryAndFooter = () => {
                pdfDoc.moveDown(0.5);
                const summaryY = Math.max(pdfDoc.y + 10, 420);
                const summaryWidth = 220;
                const summaryX = pdfDoc.page.width - 36 - summaryWidth;

                const grandTotal = Number(doc.grandTotal !== undefined ? doc.grandTotal : (doc.totalAmount || calcSubtotal - calcTotalDisc));
                const advance = Number(doc.advanceAmount || doc.amountPaid || 0);
                const balance = Number(doc.balanceAmount !== undefined ? doc.balanceAmount : Math.max(0, grandTotal - advance));
                const totalDisc = calcTotalDisc || Number(doc.totalDiscount || 0);

                // Left: Remarks, Terms & Conditions
                const leftWidth = summaryX - 36 - 20;
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('Remarks        :', 36, summaryY);
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#111111').text(doc.remarks || doc.jobCaption || 'Thank you for your business.', 105, summaryY, { width: leftWidth - 70 });

                const termsY = pdfDoc.y + 10;
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('TERMS & CONDITIONS:', 36, termsY);
                pdfDoc.font('Helvetica').fontSize(7.5).fillColor('#444444');
                const defaultTerms = isInvoice
                    ? '1. Cheques payable to "GLX TRUCK BODY ENGINEERS".\n2. Goods received in good condition.\n3. Warranty covers manufacturing defects only.'
                    : '1. 50% Advance with order confirmation.\n2. Balance on completion before delivery.\n3. Quotation valid for 30 days from date of issue.';
                pdfDoc.text(doc.conditionOfPayments || defaultTerms, 36, termsY + 12, { width: leftWidth });

                // Right: Totals
                let rY = summaryY;
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('SUB TOTAL', summaryX, rY);
                pdfDoc.text(fmtNum(calcSubtotal || grandTotal), summaryX, rY, { width: summaryWidth, align: 'right' });

                if (totalDisc > 0) {
                    rY += 15;
                    pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#DC2626').text('DISCOUNT', summaryX, rY);
                    pdfDoc.text(`-${fmtNum(totalDisc)}`, summaryX, rY, { width: summaryWidth, align: 'right' });
                }

                rY += 15;
                pdfDoc.moveTo(summaryX, rY).lineTo(summaryX + summaryWidth, rY).lineWidth(0.8).strokeColor('#000000').stroke();
                rY += 5;

                pdfDoc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text('GRAND TOTAL', summaryX, rY);
                pdfDoc.text(fmtNum(grandTotal), summaryX, rY, { width: summaryWidth, align: 'right' });

                if (advance > 0) {
                    rY += 16;
                    pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534').text('ADVANCE PAID', summaryX, rY);
                    pdfDoc.text(`-${fmtNum(advance)}`, summaryX, rY, { width: summaryWidth, align: 'right' });

                    rY += 15;
                    pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor(balance > 0 ? '#B91C1C' : '#059669').text('BALANCE DUE', summaryX, rY);
                    pdfDoc.text(fmtNum(balance), summaryX, rY, { width: summaryWidth, align: 'right' });
                }

                // Bottom: Signatures and red print timestamp
                const bottomY = Math.max(pdfDoc.y + 40, pdfDoc.page.height - 110);
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#000000').text('Yours Faithfully,', 36, bottomY);
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text(`GLX INDUSTRIES - ${branch}`, 36, bottomY + 12);

                pdfDoc.fillColor('#444444').font('Helvetica').fontSize(10).text('............................................................', 36, bottomY + 40);
                pdfDoc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(`Authorized Signature (${salesRep})`, 36, bottomY + 52);

                pdfDoc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(8).text(`Printed at    ${printTimestamp}`, 36, bottomY + 68);

                // Multi-page bottom disclaimer
                const range = pdfDoc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    pdfDoc.switchToPage(i);
                    pdfDoc.page.margins.bottom = 0;
                    const footerY = pdfDoc.page.height - 22;
                    pdfDoc.moveTo(36, footerY - 4).lineTo(pdfDoc.page.width - 36, footerY - 4).lineWidth(0.5).strokeColor('#E2E8F0').stroke();
                    pdfDoc.fillColor('#64748B').font('Helvetica').fontSize(7)
                        .text('GLX TRUCK BODY ENGINEERS - Computer Generated Official Document', 36, footerY, { lineBreak: false });
                    pdfDoc.text(`Page ${i + 1} of ${range.count}`, 36, footerY, { align: 'right', lineBreak: false });
                }

                pdfDoc.end();
            };

            try {
                const tableResult = pdfDoc.table(table, {
                    prepareHeader: () => pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000'),
                    prepareRow: () => pdfDoc.font('Helvetica').fontSize(8).fillColor('#111111')
                });

                if (tableResult instanceof Promise) {
                    tableResult.then(renderDocSummaryAndFooter).catch(reject);
                } else {
                    renderDocSummaryAndFooter();
                }
            } catch (tableErr) {
                renderDocSummaryAndFooter();
            }

        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Generate a professional, clean A4 PDF buffer for any Payment Receipt or Voucher.
 * 100% Matches GLX Physical Print Letterhead.
 */
export const generatePaymentReceiptPDF = async ({ payment, settings = null }) => {
    return new Promise((resolve, reject) => {
        try {
            const pdfDoc = new PdfPrinter({
                margin: 36,
                size: 'A4',
                layout: 'portrait',
                info: {
                    Title: `RECEIPT - ${payment.paymentNumber || 'REC'}`,
                    Author: 'GLX TRUCK BODY ENGINEERS',
                    Subject: 'Official Payment Receipt',
                }
            });

            const buffers = [];
            pdfDoc.on('data', buffers.push.bind(buffers));
            pdfDoc.on('end', () => resolve(Buffer.concat(buffers)));
            pdfDoc.on('error', reject);

            const isVoucher = payment.direction === 'paid' || !!payment.voucherType;
            const docTitle = isVoucher ? 'PAYMENT VOUCHER' : 'PAYMENT RECEIPT';
            const docCode = payment.paymentNumber || (isVoucher ? 'VOU-001' : 'REC-001');

            const partyName = payment.partyName || 
                payment.customerId?.displayName || payment.customerId?.companyName || 
                payment.supplierId?.displayName || payment.supplierId?.companyName || 
                payment.employeeId?.callingName || `${payment.employeeId?.firstName || ''} ${payment.employeeId?.lastName || ''}`.trim() || 
                'Valued Customer';

            const partyPhone = payment.customerPhone || 
                payment.customerId?.primaryContact?.phone || payment.customerId?.primaryContact?.mobile || 
                payment.supplierId?.primaryContact?.phone || payment.supplierId?.primaryContact?.mobile || '—';

            const partyAddress = payment.customerId?.billingAddress?.line1 || payment.customerId?.billingAddress?.city || 
                payment.supplierId?.address?.line1 || '—';

            const vehicleNo = payment.vehicleNo || payment.vehicleNumber || '';
            const rawDate = payment.paymentDate || payment.createdAt || new Date();
            const docDateStr = fmtDate(rawDate);
            const docTimeStr = fmtTime(rawDate);
            const printTimestamp = fmtPrintTs();

            const allocations = payment.allocations || [];
            const totalPaid = Number(payment.amount || 0);
            const totalAlloc = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
            const unalloc = Number(payment.unallocatedAmount !== undefined ? payment.unallocatedAmount : Math.max(0, totalPaid - totalAlloc));

            let methodLabel = (payment.method || 'cash').toUpperCase().replace('_', ' ');
            let methodDetails = '';
            if (payment.method === 'cheque') {
                const chqDate = payment.chequeDate ? ` dated ${fmtDate(payment.chequeDate)}` : '';
                methodDetails = `Cheque #${payment.chequeNumber || 'N/A'}${chqDate}${payment.bankName ? ` (${payment.bankName})` : ''}`;
            } else if (payment.method === 'bank_transfer') {
                methodDetails = `Txn Ref: ${payment.transactionReference || 'N/A'}${payment.bankName ? ` (${payment.bankName})` : ''}`;
            }

            const handledBy = (payment.receivedBy?.firstName ? `${payment.receivedBy.firstName} ${payment.receivedBy.lastName || ''}`.trim() : null) || 
                (payment.createdBy?.firstName ? `${payment.createdBy.firstName} ${payment.createdBy.lastName || ''}`.trim() : null) || 
                payment.receivedBy?.name || 
                payment.createdBy?.name || 
                'Cashier Desk';

            const branchVal = payment.branch || 'JA-ELA';

            // ── 1. Official Header ───────────────────────────────────────────
            drawOfficialHeader(pdfDoc);

            // ── 2. Meta Info (Customer Left vs Document Details Right) ────────
            const metaY = 112;

            // Left Column: Customer / Beneficiary
            pdfDoc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
                .text(isVoucher ? 'PAID TO / BENEFICIARY' : 'BILL TO / CUSTOMER', 36, metaY);
            pdfDoc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
                .text(partyName, 36, metaY + 14, { width: 280 });

            let curY = pdfDoc.y + 2;
            if (partyAddress && partyAddress !== '—') {
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#222222').text(partyAddress, 36, curY, { width: 280 });
                curY = pdfDoc.y + 2;
            }
            if (partyPhone && partyPhone !== '—') {
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#222222').text(partyPhone, 36, curY);
                curY = pdfDoc.y + 2;
            }
            if (vehicleNo) {
                pdfDoc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text(vehicleNo, 36, curY);
                curY = pdfDoc.y + 2;
            }

            // Right Column: Receipt No, Sales, Branch, Date, Method
            const rightX = 350;
            const rightWidth = pdfDoc.page.width - 36 - rightX;
            let metaRightY = metaY;

            const renderMetaRow = (label, val, subVal = '') => {
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text(label, rightX, metaRightY, { width: 85 });
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#000000').text(val, rightX + 85, metaRightY, { width: rightWidth - 85 });
                metaRightY += 14;
                if (subVal) {
                    pdfDoc.font('Helvetica').fontSize(7.5).fillColor('#333333').text(subVal, rightX + 85, metaRightY - 1, { width: rightWidth - 85 });
                    metaRightY += 12;
                }
            };

            renderMetaRow(isVoucher ? 'Voucher No.' : 'Receipt No.', docCode);
            renderMetaRow('Sales', handledBy);
            renderMetaRow('Branch', branchVal);
            renderMetaRow('Date', docDateStr, docTimeStr);

            // Method line
            pdfDoc.font('Helvetica-Bold').fontSize(8).fillColor('#059669')
                .text(`• Method: ${methodLabel} (CONFIRMED)`, rightX, metaRightY + 2);
            metaRightY += 14;

            pdfDoc.y = Math.max(curY + 10, metaRightY + 8, 195);

            // ── 3. Table of Allocations (Exact Columns: DESCRIPTION, RATE, QTY, AMOUNT) ──
            const tableRows = [];
            if (allocations.length > 0) {
                allocations.forEach(alloc => {
                    const docTypeStr = (alloc.documentType || 'Invoice').toUpperCase();
                    const docNum = alloc.documentNumber || `ID: ${String(alloc.documentId).slice(-6)}`;
                    const amt = Number(alloc.amount || 0);

                    tableRows.push({
                        description: `Payment Received — Settlement for ${docTypeStr} ${docNum}\nPayment Method: ${methodLabel}${methodDetails ? ` (${methodDetails})` : ''}`,
                        rate: fmtNum(amt),
                        qty: '1',
                        amount: fmtNum(amt)
                    });
                });
            } else {
                tableRows.push({
                    description: `${isVoucher ? 'Expense / Voucher Payment' : 'Customer Advance Payment Deposit / Credit on Account'}\nPayment Method: ${methodLabel}${methodDetails ? ` (${methodDetails})` : ''}${payment.notes ? ` · ${payment.notes}` : ''}`,
                    rate: fmtNum(totalPaid),
                    qty: '1',
                    amount: fmtNum(totalPaid)
                });
            }

            if (allocations.length > 0 && unalloc > 0) {
                tableRows.push({
                    description: `Unallocated Payment Balance / Available Account Credit\nRetained on customer account for future invoices`,
                    rate: fmtNum(unalloc),
                    qty: '1',
                    amount: fmtNum(unalloc)
                });
            }

            const table = {
                headers: [
                    { label: 'DESCRIPTION', property: 'description', width: 263, align: 'left', headerColor: '#FFFFFF', headerAlign: 'left' },
                    { label: 'RATE', property: 'rate', width: 85, align: 'right', headerColor: '#FFFFFF', headerAlign: 'right' },
                    { label: 'QTY', property: 'qty', width: 55, align: 'center', headerColor: '#FFFFFF', headerAlign: 'center' },
                    { label: 'AMOUNT', property: 'amount', width: 120, align: 'right', headerColor: '#FFFFFF', headerAlign: 'right' },
                ],
                datas: tableRows,
                options: {
                    padding: 5,
                    columnSpacing: 4,
                    divider: {
                        header: { disabled: false, width: 1.2, opacity: 1 },
                        horizontal: { disabled: false, width: 0.5, opacity: 0.15 }
                    }
                }
            };

            const renderReceiptSummaryAndFooter = () => {
                pdfDoc.moveDown(0.5);
                const summaryY = pdfDoc.y + 12;
                const summaryWidth = 220;
                const summaryX = pdfDoc.page.width - 36 - summaryWidth;

                // Left: Remarks & Amount in Words
                const leftWidth = summaryX - 36 - 20;
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('Remarks        :', 36, summaryY);
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#111111').text(
                    payment.notes || (allocations.length > 0 ? `Settlement for ${allocations.map(a => a.documentNumber).filter(Boolean).join(', ')}` : 'Payment received with thanks'),
                    105, summaryY, { width: leftWidth - 70 }
                );

                const wordsY = pdfDoc.y + 8;
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('Amount in Words:', 36, wordsY);
                pdfDoc.font('Helvetica-Oblique').fontSize(8).fillColor('#222222').text(convertNumberToWords(totalPaid), 36, wordsY + 12, { width: leftWidth });

                if (payment.bankAccountId) {
                    const bName = payment.bankAccountId.bankName || 'GLX Account';
                    const bAcc = payment.bankAccountId.accountNumber || '';
                    pdfDoc.font('Helvetica').fontSize(7.5).fillColor('#444444').text(`Deposited To: ${bName} (${bAcc})`, 36, pdfDoc.y + 6, { width: leftWidth });
                }

                // Right: Totals
                let rY = summaryY;

                if (payment.totalDocAmount > 0) {
                    pdfDoc.font('Helvetica').fontSize(8).fillColor('#475569').text('INVOICE TOTAL', summaryX, rY);
                    pdfDoc.text(fmtNum(payment.totalDocAmount), summaryX, rY, { width: summaryWidth, align: 'right' });
                    rY += 14;
                }

                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text('SUB TOTAL', summaryX, rY);
                pdfDoc.text(fmtNum(totalPaid), summaryX, rY, { width: summaryWidth, align: 'right' });

                rY += 15;
                pdfDoc.moveTo(summaryX, rY).lineTo(summaryX + summaryWidth, rY).lineWidth(0.8).strokeColor('#000000').stroke();
                rY += 5;

                pdfDoc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text(isVoucher ? 'TOTAL PAID' : 'AMOUNT RECEIVED', summaryX, rY);
                pdfDoc.text(fmtNum(totalPaid), summaryX, rY, { width: summaryWidth, align: 'right' });

                if (payment.totalBalanceDue !== undefined && payment.totalBalanceDue >= 0) {
                    rY += 16;
                    pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor(payment.totalBalanceDue > 0 ? '#B91C1C' : '#059669')
                        .text('BALANCE DUE', summaryX, rY);
                    pdfDoc.text(fmtNum(payment.totalBalanceDue), summaryX, rY, { width: summaryWidth, align: 'right' });
                } else if (allocations.length > 0 && totalAlloc > 0) {
                    rY += 16;
                    pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#166534').text('ADVANCE APPLIED', summaryX, rY);
                    pdfDoc.text(`-${fmtNum(totalAlloc)}`, summaryX, rY, { width: summaryWidth, align: 'right' });

                    rY += 15;
                    pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400E').text('BALANCE CREDIT', summaryX, rY);
                    pdfDoc.text(fmtNum(unalloc), summaryX, rY, { width: summaryWidth, align: 'right' });
                }

                // Bottom: Signatures and red print timestamp (Placed at end of content)
                const bottomY = Math.max(pdfDoc.y + 16, rY + 16);
                pdfDoc.font('Helvetica').fontSize(8.5).fillColor('#000000').text('Yours Faithfully,', 36, bottomY);
                pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text(`GLX INDUSTRIES - ${branchVal}`, 36, bottomY + 12);

                // Embed official seal image if available
                const sealData = settings?.companySeal;
                if (sealData && sealData.includes('base64,')) {
                    try {
                        const sealBuffer = Buffer.from(sealData.split('base64,')[1], 'base64');
                        pdfDoc.image(sealBuffer, 120, bottomY + 8, { width: 55, height: 55 });
                    } catch (e) {}
                }

                // Embed signature image if available
                const sigData = payment.receivedBy?.signature || payment.createdBy?.signature || settings?.bossSignature;
                if (sigData && sigData.includes('base64,')) {
                    try {
                        const sigBuffer = Buffer.from(sigData.split('base64,')[1], 'base64');
                        pdfDoc.image(sigBuffer, 36, bottomY + 14, { width: 120, height: 38 });
                    } catch (e) {}
                }

                pdfDoc.fillColor('#444444').font('Helvetica').fontSize(10).text('............................................................', 36, bottomY + 38);
                const signerTitle = payment.receivedBy?.firstName ? handledBy : (settings?.bossName || handledBy);
                pdfDoc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(`Authorized Signature (${signerTitle})`, 36, bottomY + 50);

                pdfDoc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(8).text(`Printed at    ${printTimestamp}`, 36, bottomY + 64);

                // Multi-page bottom disclaimer
                const range = pdfDoc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    pdfDoc.switchToPage(i);
                    pdfDoc.page.margins.bottom = 0;
                    const footerY = pdfDoc.page.height - 22;
                    pdfDoc.moveTo(36, footerY - 4).lineTo(pdfDoc.page.width - 36, footerY - 4).lineWidth(0.5).strokeColor('#E2E8F0').stroke();
                    pdfDoc.fillColor('#64748B').font('Helvetica').fontSize(7)
                        .text('GLX TRUCK BODY ENGINEERS - Computer Generated Official Receipt', 36, footerY, { lineBreak: false });
                    pdfDoc.text(`Page ${i + 1} of ${range.count}`, 36, footerY, { align: 'right', lineBreak: false });
                }

                pdfDoc.end();
            };

            try {
                const tableResult = pdfDoc.table(table, {
                    prepareHeader: () => pdfDoc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000'),
                    prepareRow: () => pdfDoc.font('Helvetica').fontSize(8).fillColor('#111111')
                });

                if (tableResult instanceof Promise) {
                    tableResult.then(renderReceiptSummaryAndFooter).catch(reject);
                } else {
                    renderReceiptSummaryAndFooter();
                }
            } catch (tableErr) {
                renderReceiptSummaryAndFooter();
            }

        } catch (err) {
            reject(err);
        }
    });
};
