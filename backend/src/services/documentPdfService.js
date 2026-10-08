import PdfPrinter from 'pdfkit-table';

/**
 * Generate a professional, clean A4 PDF buffer for any Quotation, Estimate, or Invoice.
 * Uses pdfkit-table for reliable rendering across all environments.
 * 
 * @param {Object} params
 * @param {Object} params.doc - Quotation or Invoice document model/object
 * @param {string} params.docType - 'quotation' | 'estimate' | 'invoice' | 'proforma'
 * @param {Object} [params.settings] - Company settings (optional)
 * @returns {Promise<Buffer>}
 */
export const generateDocumentPDF = async ({ doc, docType = 'quotation', settings = null }) => {
    return new Promise((resolve, reject) => {
        try {
            const pdfDoc = new PdfPrinter({
                margin: 36,
                size: 'A4',
                layout: 'portrait',
                info: {
                    Title: `${docType.toUpperCase()} - ${doc.quotationCode || doc.invoiceNumber || 'Document'}`,
                    Author: 'GLX TRUCK BODY ENGINEERS',
                    Subject: `${docType.toUpperCase()}`,
                }
            });

            const buffers = [];
            pdfDoc.on('data', buffers.push.bind(buffers));
            pdfDoc.on('end', () => resolve(Buffer.concat(buffers)));
            pdfDoc.on('error', reject);

            const isInvoice = docType === 'invoice' || doc.invoiceNumber;
            const docTitle = (docType === 'estimate' ? 'ESTIMATE' : (isInvoice ? 'INVOICE' : 'QUOTATION')).toUpperCase();
            const docCode = doc.quotationCode || doc.quoteNumber || doc.invoiceNumber || 'DOC-001';
            
            const custName = doc.customerName || doc.customerSnapshot?.name || doc.customerId?.displayName || doc.customerId?.companyName || 'Valued Customer';
            const custPhone = doc.customerPhone || doc.customerSnapshot?.phone || doc.customerId?.primaryContact?.phone || doc.customerId?.primaryContact?.mobile || '—';
            const custAddress = doc.customerAddress || doc.billingAddress?.line1 || doc.customerId?.billingAddress?.line1 || '—';
            const vehicleNo = doc.vehicleNo || '—';
            const vehicleModel = doc.vehicleModel || '—';
            const insuranceCo = doc.insuranceCompany || '—';
            const jobCaption = doc.jobCaption || '—';
            const salesRep = doc.salesRep || doc.salesRepId?.name || '—';
            const branch = doc.branch || 'JA-ELA';
            const rawDate = doc.date || doc.invoiceDate || doc.createdAt || new Date();
            const docDate = new Date(rawDate).toLocaleDateString('en-GB');

            // ── 1. Header Banner & Branding ──────────────────────────────────
            pdfDoc.rect(0, 0, pdfDoc.page.width, 70).fill('#1E293B'); // Slate-800
            
            pdfDoc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18)
                .text('GLX TRUCK BODY ENGINEERS', 36, 16);
            pdfDoc.fillColor('#94A3B8').font('Helvetica').fontSize(9)
                .text('Aluminium, Steel & Freezer Box Manufacture | Ja-Ela, Sri Lanka', 36, 38);
            pdfDoc.fillColor('#38BDF8').font('Helvetica-Bold').fontSize(8)
                .text('Phone: 077 780 2000 / 011 224 4555 | Email: info@glxgroup.lk', 36, 50);

            // Document Title in Header
            pdfDoc.fillColor('#38BDF8').font('Helvetica-Bold').fontSize(16)
                .text(docTitle, 36, 16, { align: 'right' });
            pdfDoc.fillColor('#FFFFFF').font('Helvetica').fontSize(10)
                .text(docCode, 36, 36, { align: 'right' });
            pdfDoc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
                .text(`Date: ${docDate}`, 36, 50, { align: 'right' });

            pdfDoc.y = 82;

            // ── 2. Meta Info Grid (Customer & Vehicle Info) ──────────────────
            const startY = pdfDoc.y;
            const colWidth = (pdfDoc.page.width - 72 - 16) / 2;

            // Box A: Customer Details
            pdfDoc.roundedRect(36, startY, colWidth, 90, 4).strokeColor('#E2E8F0').lineWidth(1).stroke();
            pdfDoc.rect(36, startY, colWidth, 18).fill('#F8FAFC');
            pdfDoc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('CUSTOMER DETAILS', 44, startY + 5);

            pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Name:', 44, startY + 24);
            pdfDoc.fillColor('#0F172A').font('Helvetica').text(custName, 95, startY + 24, { width: colWidth - 105, lineBreak: false });

            pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Phone:', 44, startY + 38);
            pdfDoc.fillColor('#0F172A').font('Helvetica').text(custPhone, 95, startY + 38);

            pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Address:', 44, startY + 52);
            pdfDoc.fillColor('#0F172A').font('Helvetica').text(custAddress, 95, startY + 52, { width: colWidth - 105, lineBreak: false });

            if (doc.vatNumber || doc.brNumber) {
                pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('VAT/BR:', 44, startY + 66);
                pdfDoc.fillColor('#0F172A').font('Helvetica').text(`${doc.vatNumber || ''} ${doc.brNumber ? `| BR: ${doc.brNumber}` : ''}`, 95, startY + 66);
            }

            // Box B: Vehicle & Job Details
            const rightX = 36 + colWidth + 16;
            pdfDoc.roundedRect(rightX, startY, colWidth, 90, 4).strokeColor('#E2E8F0').lineWidth(1).stroke();
            pdfDoc.rect(rightX, startY, colWidth, 18).fill('#F8FAFC');
            pdfDoc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('VEHICLE & WORK DETAILS', rightX + 8, startY + 5);

            pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Vehicle No:', rightX + 8, startY + 24);
            pdfDoc.fillColor('#0F172A').font('Helvetica-Bold').text(vehicleNo, rightX + 75, startY + 24);

            pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Model:', rightX + 8, startY + 38);
            pdfDoc.fillColor('#0F172A').font('Helvetica').text(vehicleModel, rightX + 75, startY + 38);

            pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Job/Caption:', rightX + 8, startY + 52);
            pdfDoc.fillColor('#0F172A').font('Helvetica').text(jobCaption, rightX + 75, startY + 52, { width: colWidth - 85, lineBreak: false });

            pdfDoc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Branch / Rep:', rightX + 8, startY + 66);
            pdfDoc.fillColor('#0F172A').font('Helvetica').text(`${branch} / ${salesRep}`, rightX + 75, startY + 66);

            pdfDoc.y = startY + 100;

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
                    num: String(idx + 1),
                    description: `${name}${desc}`,
                    quantity: String(qty),
                    unitPrice: rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    discount: disc > 0 ? disc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
                    amount: lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                };
            });

            // If empty items, display placeholder row
            if (tableRows.length === 0) {
                tableRows.push({
                    num: '1',
                    description: doc.jobCaption || 'General Engineering / Repair Service',
                    quantity: '1',
                    unitPrice: (doc.grandTotal || doc.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    discount: '—',
                    amount: (doc.grandTotal || doc.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                });
            }

            const table = {
                title: '',
                headers: [
                    { label: '#', property: 'num', width: 25 },
                    { label: 'ITEM / DESCRIPTION', property: 'description', width: 220 },
                    { label: 'QTY', property: 'quantity', width: 45, align: 'center' },
                    { label: 'UNIT PRICE (LKR)', property: 'unitPrice', width: 85, align: 'right' },
                    { label: 'DISC (LKR)', property: 'discount', width: 65, align: 'right' },
                    { label: 'AMOUNT (LKR)', property: 'amount', width: 80, align: 'right' },
                ],
                datas: tableRows,
                options: {
                    padding: 5,
                    columnSpacing: 5,
                    divider: {
                        header: { disabled: false, width: 1.5, opacity: 0.8 },
                        horizontal: { disabled: false, width: 0.5, opacity: 0.2 }
                    }
                }
            };

            const renderSummaryAndFooter = () => {
                pdfDoc.moveDown(0.8);
                const summaryY = pdfDoc.y;
                const summaryWidth = 240;
                const summaryX = pdfDoc.page.width - 36 - summaryWidth;

                const grandTotal = Number(doc.grandTotal !== undefined ? doc.grandTotal : (doc.totalAmount || calcSubtotal - calcTotalDisc));
                const advance = Number(doc.advanceAmount || doc.amountPaid || 0);
                const balance = Number(doc.balanceAmount !== undefined ? doc.balanceAmount : Math.max(0, grandTotal - advance));

                // Summary box
                pdfDoc.roundedRect(summaryX, summaryY, summaryWidth, 80, 4).fillAndStroke('#F8FAFC', '#E2E8F0');

                pdfDoc.fillColor('#475569').font('Helvetica').fontSize(8.5).text('Subtotal:', summaryX + 12, summaryY + 8);
                pdfDoc.fillColor('#0F172A').font('Helvetica-Bold').text(`LKR ${(calcSubtotal || grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, summaryX, summaryY + 8, { width: summaryWidth - 12, align: 'right' });

                if (calcTotalDisc > 0 || doc.totalDiscount > 0) {
                    const dAmt = calcTotalDisc || doc.totalDiscount;
                    pdfDoc.fillColor('#DC2626').font('Helvetica').text('Discount:', summaryX + 12, summaryY + 22);
                    pdfDoc.font('Helvetica-Bold').text(`- LKR ${dAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, summaryX, summaryY + 22, { width: summaryWidth - 12, align: 'right' });
                }

                pdfDoc.rect(summaryX, summaryY + 36, summaryWidth, 24).fill('#2563EB'); // Blue total bar
                pdfDoc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text('GRAND TOTAL:', summaryX + 12, summaryY + 42);
                pdfDoc.text(`LKR ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, summaryX, summaryY + 42, { width: summaryWidth - 12, align: 'right' });

                pdfDoc.fillColor('#475569').font('Helvetica').fontSize(8).text(`Advance Paid: LKR ${advance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, summaryX + 12, summaryY + 65);
                pdfDoc.font('Helvetica-Bold').fillColor(balance > 0 ? '#B91C1C' : '#059669')
                    .text(`Balance Due: LKR ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, summaryX, summaryY + 65, { width: summaryWidth - 12, align: 'right' });

                // Notes / Terms
                pdfDoc.y = summaryY;
                const termsWidth = summaryX - 36 - 16;
                pdfDoc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text('TERMS & CONDITIONS:', 36, summaryY);
                pdfDoc.fillColor('#64748B').font('Helvetica').fontSize(7.5);
                
                const termsText = doc.conditionOfPayments || 
                    (isInvoice ? 'Payment is strictly due according to agreed credit terms.\nCheques payable to GLX TRUCK BODY ENGINEERS.' : 
                    '• 50% Advance with order confirmation.\n• Balance on completion before delivery.\n• Quotation valid for 30 days from date of issue.');
                
                pdfDoc.text(termsText, 36, summaryY + 12, { width: termsWidth });

                // Page numbering & Bottom signature bar
                const range = pdfDoc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    pdfDoc.switchToPage(i);
                    pdfDoc.rect(36, pdfDoc.page.height - 35, pdfDoc.page.width - 72, 0.5).fill('#CBD5E1');
                    pdfDoc.fillColor('#64748B').font('Helvetica').fontSize(7.5)
                        .text('GLX TRUCK BODY ENGINEERS - Computer Generated Official Document', 36, pdfDoc.page.height - 26);
                    pdfDoc.text(`Page ${i + 1} of ${range.count}`, 36, pdfDoc.page.height - 26, { align: 'right' });
                }

                pdfDoc.end();
            };

            try {
                const tableResult = pdfDoc.table(table, {
                    prepareHeader: () => pdfDoc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B'),
                    prepareRow: (row, index, column, rectRow, rectCell) => {
                        pdfDoc.font('Helvetica').fontSize(7.5).fillColor('#334155');
                    }
                });

                if (tableResult instanceof Promise) {
                    tableResult.then(renderSummaryAndFooter).catch(reject);
                } else {
                    renderSummaryAndFooter();
                }
            } catch (tableErr) {
                renderSummaryAndFooter();
            }

        } catch (err) {
            reject(err);
        }
    });
};
