import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import SmsLog from '../models/SmsLog.js';
import Supplier from '../models/Supplier.js';
import { generateDocumentPDF } from './documentPdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_PDF_DIR = path.join(__dirname, '../../backups/pdfs');

export const formatSmsContact = (phone) => {
    if (!phone || phone === 'N/A') return null;
    let clean = phone.replace(/[^0-9]/g, ''); // keep only numbers
    if (clean.startsWith('0')) {
        clean = '94' + clean.slice(1);
    }
    if (clean.length === 9) { // e.g. 772268608
        clean = '94' + clean;
    }
    if (clean.startsWith('94') && clean.length === 11) {
        return '+' + clean;
    }
    return '+' + clean;
};

/**
 * Construct and send (simulate) a confirmation SMS to the supplier after GRN QA approval.
 * Writes a record to the database SmsLog.
 */
export const sendGrnConfirmationSms = async (grn, customMessage = null) => {
    try {
        if (!grn) return;
        
        let supplierPhone = 'N/A';
        let supplierName = grn.supplierName || 'Supplier';

        // Load the supplier to get the phone number if available
        if (grn.supplierId) {
            const supplier = await Supplier.findById(grn.supplierId);
            if (supplier && supplier.primaryContact) {
                supplierPhone = supplier.primaryContact.mobile || supplier.primaryContact.phone || 'N/A';
                supplierName = supplier.displayName || supplier.companyName || supplierName;
            }
        }

        const formattedDate = grn.receiptDate ? new Date(grn.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
        const productsList = grn.items.map(item => {
            const qty = item.acceptedQuantity || item.receivedQuantity || 0;
            const uom = item.unitOfMeasure || 'kg';
            return `${item.productName} (${qty} ${uom})`;
        }).join(', ');

        const totalVal = grn.totalAcceptedValue || grn.totalPayableLKR || 0;
        const formattedTotal = totalVal.toLocaleString('en-LK', { minimumFractionDigits: 2 });

        const paymentTermText = (grn.balanceDueLKR === 0) ? 'Paid' : `Credit (Outstanding: Rs. ${grn.balanceDueLKR?.toLocaleString('en-LK', { minimumFractionDigits: 2 })})`;

        // Construct the SMS message
        const message = customMessage || `Dear ${supplierName}, your delivery on ${formattedDate} for ${productsList} has been accepted and QA approved. Payment status: ${paymentTermText}. Total accepted value: Rs. ${formattedTotal}. Thank you.`;

        let status = 'sent';
        let formattedContact = formatSmsContact(supplierPhone);

        // Send actual SMS if credentials are set in .env
        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;

        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
            console.log(`[SMS Gateway] Dispatched via SMSlenz to: ${formattedContact}`);
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });

                const data = await response.json();
                if (response.status === 200 && data.success) {
                    console.log(`[SMS Gateway] Sent successfully. Campaign ID: ${data.data?.campaign_id}. Balance: ${data.data?.sms_credit_balance}`);
                } else {
                    console.error(`[SMS Gateway] Failed to send: ${data.message || response.statusText}`);
                    status = 'failed';
                }
            } catch (err) {
                console.error('[SMS Gateway] HTTP request failed:', err.message);
                status = 'failed';
            }
        } else {
            // Fallback simulated mode
            console.log(`[SMS Gateway Simulated Dispatch] To: ${supplierPhone} | Msg: ${message}`);
            if (supplierPhone === 'N/A') {
                status = 'failed';
            }
        }

        // Write log entry to database
        const log = await SmsLog.create({
            supplierName,
            supplierPhone: supplierPhone === 'N/A' ? '0770000000' : supplierPhone, // fallback phone for model validations
            message,
            grnId: grn._id,
            status
        });

        return log;
    } catch (error) {
        console.error('[SMS Service] Failed to send/log SMS:', error.message);
        // Attempt to create a failed log
        try {
            await SmsLog.create({
                supplierName: grn?.supplierName || 'Unknown',
                supplierPhone: '0770000000',
                message: 'Failed to construct or send SMS receipt.',
                grnId: grn?._id,
                status: 'failed'
            });
        } catch (innerError) {
            console.error('[SMS Service] Failed to create error log:', innerError.message);
        }
    }
};

/**
 * Automatically send a confirmation SMS to the supplier immediately when a GRN is created/saved.
 * SMS template requested by the user:
 * Dear (Supplier Name), thank you for your supply to Authentic Lanka Exports.
 * Date: (DD/MM/YYYY)
 * Product: (Item Name)
 * Quantity: (Qty) kg
 * Rate: (Rate) LKR/kg
 * Total Amount: (Total) LKR
 * If any discrepancy, please contact with this Contact No immediately.
 */
export const sendGrnCreationSms = async (grn) => {
    try {
        if (!grn) return;

        let supplierPhone = 'N/A';
        let supplierName = grn.supplierName || 'Supplier';

        // Load the supplier to get the phone number if available
        if (grn.supplierId) {
            const supplier = await Supplier.findById(grn.supplierId);
            if (supplier && supplier.primaryContact) {
                supplierPhone = supplier.primaryContact.mobile || supplier.primaryContact.phone || 'N/A';
                supplierName = supplier.displayName || supplier.companyName || supplierName;
            }
        }

        const dateObj = grn.receiptDate ? new Date(grn.receiptDate) : new Date();
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        // Get company contact number from settings
        let contactNo = '071 6666 888';
        try {
            const Settings = mongoose.model('Settings');
            const settings = await Settings.findOne();
            if (settings && settings.companyPhone) {
                contactNo = settings.companyPhone;
            }
        } catch (err) {
            console.warn('[SMS Service] Could not fetch settings for contact number:', err.message);
        }

        // Calculate total received value (creation time using receivedQuantity)
        const totalVal = grn.items.reduce((sum, item) => sum + ((item.receivedQuantity || 0) * (item.unitPrice || 0)), 0);
        const formattedTotal = totalVal.toLocaleString('en-LK', { minimumFractionDigits: 2 });

        // Build product details
        let productText = '';
        let quantityText = '';
        let rateText = '';

        if (grn.items.length === 1) {
            const item = grn.items[0];
            productText = item.productName;
            quantityText = `${item.receivedQuantity} ${item.unitOfMeasure || 'kg'}`;
            rateText = `${item.unitPrice} LKR/kg`;
        } else {
            productText = grn.items.map(item => item.productName).join(', ');
            quantityText = grn.items.map(item => `${item.receivedQuantity} ${item.unitOfMeasure || 'kg'}`).join(', ');
            rateText = grn.items.map(item => `${item.unitPrice} LKR/kg`).join(', ');
        }

        // Construct the SMS message using user's template
        const message = `Dear ${supplierName}, thank you for your supply to Authentic Lanka Exports.\nDate: ${formattedDate}\nProduct: ${productText}\nQuantity: ${quantityText}\nRate: ${rateText}\nTotal Amount: ${formattedTotal} LKR\nIf any discrepancy, please contact with ${contactNo} immediately.`;

        let status = 'sent';
        let formattedContact = formatSmsContact(supplierPhone);

        // Send actual SMS if credentials are set in .env
        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;

        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
            console.log(`[SMS Gateway] Dispatched Creation SMS via SMSlenz to: ${formattedContact}`);
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });

                const data = await response.json();
                if (response.status === 200 && data.success) {
                    console.log(`[SMS Gateway] Creation SMS sent successfully. Campaign ID: ${data.data?.campaign_id}`);
                } else {
                    console.error(`[SMS Gateway] Creation SMS failed to send: ${data.message || response.statusText}`);
                    status = 'failed';
                }
            } catch (err) {
                console.error('[SMS Gateway] Creation SMS HTTP request failed:', err.message);
                status = 'failed';
            }
        } else {
            // Fallback simulated mode
            console.log(`[SMS Gateway Simulated Creation SMS Dispatch] To: ${supplierPhone} | Msg: ${message}`);
            if (supplierPhone === 'N/A') {
                status = 'failed';
            }
        }

        // Write log entry to database
        const log = await SmsLog.create({
            supplierName,
            supplierPhone: supplierPhone === 'N/A' ? '0770000000' : supplierPhone,
            message,
            grnId: grn._id,
            status
        });

        return log;
    } catch (error) {
        console.error('[SMS Service] Failed to send/log GRN Creation SMS:', error.message);
    }
};

/**
 * Share a public document link via SMS and send a duplicate copy to the manager.
 */
export const sendPublicDocumentSms = async (doc, clientPhone, documentType, hostOrigin) => {
    try {
        const token = doc.publicToken;
        const link = `${hostOrigin}/public/documents/${token}`;
        const docCode = doc.quoteNumber || doc.quotationCode || doc.invoiceNumber || doc._id.toString();
        const clientName = doc.customerName || doc.vehicleOwner || 'Valued Customer';
        const docTypeTitle = (documentType === 'estimate' ? 'Estimate' : (documentType === 'invoice' ? 'Invoice' : 'Quotation'));
        
        const message = `Dear ${clientName}, here is the link to view your GLX Industries ${docTypeTitle} (${docCode}): ${link}`;
        
        // Send SMS to client
        let formattedContact = formatSmsContact(clientPhone);
        let status = 'sent';
        
        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;
        
        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
            console.log(`[SMS Gateway] Dispatched Document Link SMS to: ${formattedContact}`);
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });
                const data = await response.json();
                if (response.status !== 200 || !data.success) {
                    status = 'failed';
                }
            } catch (err) {
                status = 'failed';
            }
        } else {
            console.log(`[SMS Gateway Simulated Document Link] To: ${clientPhone} | Msg: ${message}`);
        }
        
        // Log original SMS
        await SmsLog.create({
            supplierName: clientName,
            supplierPhone: clientPhone,
            message: message,
            status: status
        });

        // Send duplicate copy to Manager
        const Settings = mongoose.model('Settings');
        const settings = await Settings.findOne();
        if (settings && settings.managerSmsPhone) {
            let managerContact = formatSmsContact(settings.managerSmsPhone);
            const managerMsg = `[Manager Copy] Document link sent to ${clientPhone} (${clientName}): ${link}`;
            
            if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && managerContact) {
                console.log(`[SMS Gateway] Duplicate Copy sent to Manager: ${managerContact}`);
                await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: managerContact,
                        message: managerMsg
                    })
                }).catch(err => console.error('[SMS Service] Manager copy failed:', err.message));
            } else {
                console.log(`[SMS Gateway Simulated Manager Duplicate] To: ${settings.managerSmsPhone} | Msg: ${managerMsg}`);
            }
        }
        
    } catch (err) {
        console.error('[SMS Service] Failed to send document share SMS:', err.message);
    }
};

/**
 * Send payslip link via SMS to employee (without company name - short mode)
 */
export const sendPayslipSms = async (payslipData, employeePhone, hostOrigin) => {
    try {
        const { payslip, payrollNumber, periodMonth, periodYear } = payslipData;
        const shareToken = payslip.payslipShareToken;
        const link = `${hostOrigin}/payslip/share/${shareToken}`;
        const employeeName = payslip.employeeName || 'Employee';
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[(periodMonth || 1) - 1];
        
        const message = `Dear ${employeeName}, your payslip for ${monthName} ${periodYear} (${payrollNumber}) is ready. View your salary details (without company name): ${link}`;
        
        let formattedContact = formatSmsContact(employeePhone);
        let status = 'sent';
        
        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;
        
        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
            console.log(`[SMS Gateway] Dispatched Payslip Link SMS to: ${formattedContact}`);
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });
                const data = await response.json();
                if (response.status !== 200 || !data.success) {
                    status = 'failed';
                }
            } catch (err) {
                status = 'failed';
            }
        } else {
            console.log(`[SMS Gateway Simulated Payslip Link] To: ${employeePhone} | Msg: ${message}`);
        }
        
        // Log SMS
        await SmsLog.create({
            supplierName: employeeName,
            supplierPhone: employeePhone,
            message: message,
            status: status
        });

        // Send duplicate copy to Manager
        const Settings = mongoose.model('Settings');
        const settings = await Settings.findOne();
        if (settings && settings.managerSmsPhone) {
            let managerContact = formatSmsContact(settings.managerSmsPhone);
            const managerMsg = `[Manager Copy] Payslip link sent to ${employeePhone} (${employeeName}): ${link}`;
            
            if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && managerContact) {
                console.log(`[SMS Gateway] Duplicate Payslip Copy sent to Manager: ${managerContact}`);
                await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: managerContact,
                        message: managerMsg
                    })
                }).catch(err => console.error('[SMS Service] Manager copy failed:', err.message));
            } else {
                console.log(`[SMS Gateway Simulated Manager Duplicate] To: ${settings.managerSmsPhone} | Msg: ${managerMsg}`);
            }
        }
        
        return { success: status === 'sent', status };
    } catch (err) {
        console.error('[SMS Service] Failed to send payslip SMS:', err.message);
        return { success: false, status: 'failed' };
    }
};

/**
 * Send payment sheet link via SMS to employee
 */
export const sendPaymentSheetSms = async (employeeData, employeePhone, startDate, endDate, hostOrigin) => {
    try {
        const { employeeName, employeeCode, totalSalary, totalAdvances, netSalary } = employeeData;
        
        const message = `Dear ${employeeName}, your payment sheet from ${startDate} to ${endDate} is ready. Total Salary: LKR ${totalSalary}, Advances: LKR ${totalAdvances}, Net Salary: LKR ${netSalary}. Contact HR for details.`;
        
        let formattedContact = formatSmsContact(employeePhone);
        let status = 'sent';
        
        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;
        
        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
            console.log(`[SMS Gateway] Dispatched Payment Sheet SMS to: ${formattedContact}`);
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });
                const data = await response.json();
                if (response.status !== 200 || !data.success) {
                    status = 'failed';
                }
            } catch (err) {
                status = 'failed';
            }
        } else {
            console.log(`[SMS Gateway Simulated Payment Sheet] To: ${employeePhone} | Msg: ${message}`);
        }
        
        // Log SMS
        await SmsLog.create({
            supplierName: employeeName,
            supplierPhone: employeePhone,
            message: message,
            status: status
        });

        // Send duplicate copy to Manager
        const Settings = mongoose.model('Settings');
        const settings = await Settings.findOne();
        if (settings && settings.managerSmsPhone) {
            let managerContact = formatSmsContact(settings.managerSmsPhone);
            const managerMsg = `[Manager Copy] Payment sheet summary sent to ${employeePhone} (${employeeName}): ${message}`;
            
            if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && managerContact) {
                console.log(`[SMS Gateway] Duplicate Payment Sheet Copy sent to Manager: ${managerContact}`);
                await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: managerContact,
                        message: managerMsg
                    })
                }).catch(err => console.error('[SMS Service] Manager copy failed:', err.message));
            } else {
                console.log(`[SMS Gateway Simulated Manager Duplicate] To: ${settings.managerSmsPhone} | Msg: ${managerMsg}`);
            }
        }
        
        return { success: status === 'sent', status };
    } catch (err) {
        console.error('[SMS Service] Failed to send payment sheet SMS:', err.message);
        return { success: false, status: 'failed' };
    }
};

/**
 * PDF Auto-backup: Generates a high-quality PDF copy and saves it to backups folder.
 */
export const backupDocumentAsPdf = async (doc, docType) => {
    try {
        await fs.ensureDir(BACKUPS_PDF_DIR);
        const docCode = doc.quotationCode || doc.invoiceNumber || doc.quoteNumber || doc._id.toString();
        const filename = `${docType}_${String(docCode).replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
        const dest = path.join(BACKUPS_PDF_DIR, filename);
        
        const buffer = await generateDocumentPDF({ doc, docType });
        await fs.writeFile(dest, buffer);
        console.log(`✓ Backup PDF successfully saved: ${dest}`);
        return dest;
    } catch (err) {
        console.error('[Backup Service] Failed to create PDF backup:', err.message);
        return null;
    }
};

/**
 * Send project completion/delivery notification SMS alert to customer
 */
export const sendProjectDeliveredSms = async (project, clientPhone) => {
    try {
        if (!clientPhone) return;
        const formattedContact = formatSmsContact(clientPhone);
        if (!formattedContact) return;

        const projectName = project.name || 'Vehicle Project';
        const projectNum = project.projectNumber || '';
        const message = `Dear Customer, your vehicle manufacturing/repair project (${projectName} - ${projectNum}) at GLX Industries has been completed & is ready for delivery. Thank you for your business!`;

        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;
        let status = 'sent';

        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL) {
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });
                const data = await response.json();
                if (response.status !== 200 || !data.success) status = 'failed';
            } catch (err) {
                status = 'failed';
            }
        } else {
            console.log(`[SMS Gateway Simulated Delivery Alert] To: ${clientPhone} | Msg: ${message}`);
        }

        const SmsLog = mongoose.model('SmsLog');
        await SmsLog.create({
            supplierName: project.customerName || 'Project Client',
            supplierPhone: clientPhone,
            message,
            status
        });
    } catch (err) {
        console.error('[SMS Service] Failed to send project delivery SMS:', err.message);
    }
};

/**
 * Dispatch SMS helper with gateway call, database logging, and manager duplicate copy
 */
export const dispatchSmsNotification = async ({ contactPhone, recipientName, message }) => {
    let formattedContact = formatSmsContact(contactPhone);
    let status = 'sent';
    const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;

    if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
        console.log(`[SMS Gateway] Dispatched SMS to: ${formattedContact}`);
        try {
            const response = await fetch(SMS_GATEWAY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: SMS_USER_ID,
                    api_key: SMS_API_KEY,
                    sender_id: SMS_SENDER_ID,
                    contact: formattedContact,
                    message: message
                })
            });
            const data = await response.json();
            if (response.status !== 200 || !data.success) {
                status = 'failed';
            }
        } catch (err) {
            console.error('[SMS Gateway] Failed request:', err.message);
            status = 'failed';
        }
    } else {
        console.log(`[SMS Gateway Simulated] To: ${contactPhone || 'N/A'} | Msg: ${message}`);
        if (!contactPhone) status = 'failed';
    }

    try {
        await SmsLog.create({
            supplierName: recipientName || 'Valued Party',
            supplierPhone: contactPhone || '0770000000',
            message: message,
            status: status
        });
    } catch (err) {
        console.error('[SMS Service] Failed to save SmsLog:', err.message);
    }

    // Manager duplicate copy
    try {
        const Settings = mongoose.model('Settings');
        const settings = await Settings.findOne();
        if (settings && settings.managerSmsPhone) {
            let managerContact = formatSmsContact(settings.managerSmsPhone);
            const managerMsg = `[Manager Copy] Alert sent to ${contactPhone || 'client'} (${recipientName}): ${message}`;
            if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && managerContact) {
                fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: managerContact,
                        message: managerMsg
                    })
                }).catch(e => console.error('[SMS Service] Manager copy failed:', e.message));
            } else {
                console.log(`[SMS Gateway Simulated Manager Duplicate] To: ${settings.managerSmsPhone} | Msg: ${managerMsg}`);
            }
        }
    } catch (err) {
        // ignore manager copy errors
    }

    return status;
};

/**
 * Automatically send invoice notification SMS to customer when invoice is created or converted
 */
export const sendInvoiceCreationSms = async (invoice, hostOrigin = '') => {
    try {
        if (!invoice) return;
        let clientPhone = invoice.customerSnapshot?.phone || invoice.customerSnapshot?.mobile || invoice.customerPhone || invoice.contactNumber;
        let clientName = invoice.customerSnapshot?.name || invoice.customerName || invoice.vehicleOwner || 'Valued Customer';

        if (!clientPhone && invoice.customerId) {
            const Customer = mongoose.model('Customer');
            const cust = await Customer.findById(invoice.customerId);
            if (cust) {
                clientPhone = cust.primaryContact?.mobile || cust.primaryContact?.phone;
                clientName = cust.displayName || cust.companyName || clientName;
            }
        }

        if (!clientPhone) {
            console.log('[SMS Service] No phone number available for invoice SMS:', invoice.invoiceNumber);
            return;
        }

        const origin = hostOrigin || process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = invoice.publicToken ? `${origin}/public/documents/${invoice.publicToken}` : '';
        const total = (invoice.total || invoice.grandTotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Immediate';

        const message = `Dear ${clientName}, your Invoice (${invoice.invoiceNumber}) for Rs. ${total} has been generated. Due Date: ${dueDate}.${link ? ' View invoice: ' + link : ''} Thank you for choosing GLX Industries!`;

        await dispatchSmsNotification({
            contactPhone: clientPhone,
            recipientName: clientName,
            message
        });
    } catch (error) {
        console.error('[SMS Service] Failed in sendInvoiceCreationSms:', error.message);
    }
};

/**
 * Automatically send payment receipt SMS to customer with public view link when payment is received
 */
export const sendPaymentReceiptSms = async (payment, hostOrigin = '') => {
    try {
        if (!payment) return;
        let clientPhone = payment.customerPhone || payment.contactNumber;
        let clientName = payment.partyName || 'Valued Customer';

        if (!clientPhone && payment.customerId) {
            const Customer = mongoose.model('Customer');
            const cust = await Customer.findById(payment.customerId);
            if (cust) {
                clientPhone = cust.primaryContact?.mobile || cust.primaryContact?.phone;
                clientName = cust.displayName || cust.companyName || clientName;
            }
        }

        if (!clientPhone) {
            console.log('[SMS Service] No phone number available for payment receipt SMS:', payment.paymentNumber);
            return;
        }

        const origin = hostOrigin || process.env.FRONTEND_URL || 'http://localhost:5173';
        const link = payment.publicToken ? `${origin}/public/documents/${payment.publicToken}` : '';
        const amount = (payment.amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

        let methodText = 'Cash';
        if (payment.method === 'cheque') {
            const chqDate = payment.chequeDate ? ` dated ${new Date(payment.chequeDate).toLocaleDateString('en-GB')}` : '';
            methodText = `Cheque (#${payment.chequeNumber || 'N/A'}${chqDate})`;
        } else if (payment.method === 'bank_transfer') {
            const refText = payment.transactionReference ? ` (Ref: ${payment.transactionReference})` : '';
            methodText = `Bank Transfer${refText}`;
        } else if (payment.method === 'online') {
            methodText = 'Online Transfer';
        }

        const allocDocs = (payment.allocations || [])
            .map(a => a.documentNumber)
            .filter(Boolean)
            .join(', ');
        const allocText = allocDocs ? ` (Applied to ${allocDocs})` : '';

        const message = `Dear ${clientName}, payment of Rs. ${amount} received via ${methodText}. Receipt: ${payment.paymentNumber}.${allocText}${link ? ' View official receipt: ' + link : ''} Thank you for your business!`;

        await dispatchSmsNotification({
            contactPhone: clientPhone,
            recipientName: clientName,
            message
        });
    } catch (error) {
        console.error('[SMS Service] Failed in sendPaymentReceiptSms:', error.message);
    }
};

/**
 * Automatically send SMS to customer when an invoice, quotation, or estimate is edited/updated
 */
export const sendDocumentUpdateSms = async (doc, documentType = 'quotation', hostOrigin = '') => {
    try {
        if (!doc) return;

        // Ensure publicToken exists
        if (!doc.publicToken) {
            doc.publicToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            try {
                if (typeof doc.save === 'function') {
                    await doc.save();
                } else {
                    const isInv = documentType === 'invoice' || !!doc.invoiceNumber;
                    const Model = isInv ? mongoose.model('Invoice') : mongoose.model('Quotation');
                    await Model.updateOne({ _id: doc._id }, { $set: { publicToken: doc.publicToken } });
                }
            } catch (saveErr) {
                console.warn('[SMS Service] Could not persist generated publicToken on update:', saveErr.message);
            }
        }

        // Determine client phone & name
        let clientPhone = doc.customerSnapshot?.phone || doc.customerSnapshot?.mobile || doc.customerPhone || doc.contactNumber || doc.whatsappNum;
        let clientName = doc.customerSnapshot?.name || doc.customerName || doc.vehicleOwner || 'Valued Customer';

        if (!clientPhone && doc.customerId) {
            try {
                const Customer = mongoose.model('Customer');
                const cust = await Customer.findById(doc.customerId);
                if (cust) {
                    clientPhone = cust.primaryContact?.mobile || cust.primaryContact?.phone;
                    clientName = cust.displayName || cust.companyName || clientName;
                }
            } catch (custErr) {
                console.warn('[SMS Service] Could not fetch customer details:', custErr.message);
            }
        }

        if (!clientPhone) {
            console.log('[SMS Service] No phone number available for document update SMS:', doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || doc._id);
            return;
        }

        const origin = hostOrigin || (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'http://localhost:5173');
        const link = doc.publicToken ? `${origin}/public/documents/${doc.publicToken}` : '';

        const isInvoice = documentType === 'invoice' || !!doc.invoiceNumber;
        const isEstimate = (documentType === 'estimate' || doc.documentType === 'estimate') && !isInvoice;
        const docTypeTitle = isInvoice ? 'Invoice' : (isEstimate ? 'Estimate' : 'Quotation');
        const docCode = doc.invoiceNumber || doc.quoteNumber || doc.quotationCode || 'document';

        let message = '';
        if (isInvoice) {
            const total = (doc.total || doc.grandTotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
            message = `Dear ${clientName}, your Invoice (${docCode}) has been updated. Total: Rs. ${total}.${link ? ' View updated invoice: ' + link : ''} - GLX Industries`;
        } else {
            const grandTotal = (doc.grandTotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
            message = `Dear ${clientName}, your ${docTypeTitle} (${docCode}) has been updated. Total: Rs. ${grandTotal}.${link ? ' View updated ' + docTypeTitle.toLowerCase() + ': ' + link : ''} - GLX Industries`;
        }

        await dispatchSmsNotification({
            contactPhone: clientPhone,
            recipientName: clientName,
            message
        });
    } catch (error) {
        console.error('[SMS Service] Failed in sendDocumentUpdateSms:', error.message);
    }
};
