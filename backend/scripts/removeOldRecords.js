import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanOldRecords() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ MONGO_URI missing');
        process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    const cutoff = new Date('2026-10-20T00:00:00.000Z');
    console.log(`📅 Cutoff date: ${cutoff.toISOString()} (2026-10-20 00:00:00 UTC)`);

    // 1. Find Quotations & Estimates before cutoff
    const quotesToDelete = await db.collection('quotations').find({
        $or: [
            { createdAt: { $lt: cutoff } },
            { quotationDate: { $lt: cutoff } }
        ]
    }).toArray();

    // 2. Find Invoices before cutoff
    const invoicesToDelete = await db.collection('invoices').find({
        $or: [
            { createdAt: { $lt: cutoff } },
            { invoiceDate: { $lt: cutoff } }
        ]
    }).toArray();

    console.log(`\n📋 Found ${quotesToDelete.length} Quotations/Estimates before 2026/10/20`);
    console.log(`📋 Found ${invoicesToDelete.length} Invoices before 2026/10/20`);

    // 3. Save a dedicated backup of these specific records before removing
    const archiveDir = path.join(__dirname, '../backups/database/removed_before_2026-10-20');
    await fs.ensureDir(archiveDir);
    await fs.writeJson(path.join(archiveDir, 'removed_quotations.json'), quotesToDelete, { spaces: 2 });
    await fs.writeJson(path.join(archiveDir, 'removed_invoices.json'), invoicesToDelete, { spaces: 2 });
    console.log(`💾 Saved archive copy of records to: ${archiveDir}`);

    // 4. Delete Quotations and Estimates
    const quoteIds = quotesToDelete.map(q => q._id);
    let deletedQuotesCount = 0;
    if (quoteIds.length > 0) {
        const resQuotes = await db.collection('quotations').deleteMany({ _id: { $in: quoteIds } });
        deletedQuotesCount = resQuotes.deletedCount;
    }

    // 5. Delete Invoices
    const invoiceIds = invoicesToDelete.map(i => i._id);
    let deletedInvoicesCount = 0;
    if (invoiceIds.length > 0) {
        const resInvoices = await db.collection('invoices').deleteMany({ _id: { $in: invoiceIds } });
        deletedInvoicesCount = resInvoices.deletedCount;
    }

    // 6. Remaining count
    const remainingQuotes = await db.collection('quotations').countDocuments({});
    const remainingInvoices = await db.collection('invoices').countDocuments({});

    console.log('\n========================================');
    console.log('✅ Cleanup Completed Successfully!');
    console.log(`🗑️ Deleted Quotations / Estimates: ${deletedQuotesCount}`);
    console.log(`🗑️ Deleted Invoices:               ${deletedInvoicesCount}`);
    console.log(`✨ Remaining Quotations / Estimates in DB: ${remainingQuotes}`);
    console.log(`✨ Remaining Invoices in DB:               ${remainingInvoices}`);
    console.log('========================================\n');

    await mongoose.disconnect();
}

cleanOldRecords().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
