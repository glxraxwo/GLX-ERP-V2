import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBackup() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ MONGO_URI is not defined in environment or .env file');
        process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB for database backup...');
    try {
        await mongoose.connect(mongoUri);
        const db = mongoose.connection.db;
        const dbName = mongoose.connection.name;
        console.log(`✅ Connected successfully to database: "${dbName}"`);

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

        const baseBackupDir = path.join(__dirname, '../backups/database');
        const backupTargetDir = path.join(baseBackupDir, `backup-${timestamp}`);
        const latestDir = path.join(baseBackupDir, 'latest');

        await fs.ensureDir(backupTargetDir);
        await fs.ensureDir(latestDir);

        const collections = await db.listCollections().toArray();
        console.log(`📦 Found ${collections.length} collections to backup.\n`);

        const summary = {
            databaseName: dbName,
            backupDate: now.toISOString(),
            formattedDate: now.toLocaleString('en-LK', { timeZone: 'Asia/Colombo' }),
            totalCollections: collections.length,
            collections: {},
            totalDocuments: 0
        };

        for (const col of collections) {
            const colName = col.name;
            const collectionObj = db.collection(colName);
            const count = await collectionObj.countDocuments();
            const docs = await collectionObj.find({}).toArray();

            summary.collections[colName] = count;
            summary.totalDocuments += count;

            const filePath = path.join(backupTargetDir, `${colName}.json`);
            await fs.writeJson(filePath, docs, { spaces: 2 });

            const latestFilePath = path.join(latestDir, `${colName}.json`);
            await fs.writeJson(latestFilePath, docs, { spaces: 2 });

            console.log(`  ✓ Exported [${colName}]: ${count} documents`);
        }

        // Write summary file
        const summaryPath = path.join(backupTargetDir, 'backup_summary.json');
        await fs.writeJson(summaryPath, summary, { spaces: 2 });
        await fs.writeJson(path.join(latestDir, 'backup_summary.json'), summary, { spaces: 2 });

        console.log('\n========================================');
        console.log('🎉 Database Backup Completed Successfully!');
        console.log(`📁 Destination Folder: ${backupTargetDir}`);
        console.log(`📁 Latest Snapshot:    ${latestDir}`);
        console.log(`📊 Total Collections:  ${summary.totalCollections}`);
        console.log(`📄 Total Documents:    ${summary.totalDocuments}`);
        console.log('========================================\n');

    } catch (err) {
        console.error('❌ Database Backup Failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
    }
}

runBackup();
