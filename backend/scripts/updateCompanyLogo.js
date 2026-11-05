import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import fs from 'fs';

async function updateSettings() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        const result = await db.collection('settings').updateOne(
            {},
            { 
                $set: { 
                    companyName: 'GLX INDUSTRIES',
                    companyAddress: 'No.14, Negambo Road, Thudella, Ja-Ela, Sri Lanka',
                    companyPhone: '071 6666 888 / 011 740 4446',
                    companyEmail: 'glx.engi@gmail.com',
                    companyWebsite: 'www.glxgroup.lk',
                    companyLogo: '/company-logo.svg'
                } 
            },
            { upsert: true }
        );

        console.log('Updated settings successfully! Result:', result.acknowledged);
        const updated = await db.collection('settings').findOne();
        console.log('Company:', updated.companyName, '| Address:', updated.companyAddress, '| Logo:', updated.companyLogo);

        await mongoose.disconnect();
        console.log('Done.');
    } catch (err) {
        console.error('Error updating company settings:', err);
        process.exit(1);
    }
}

updateSettings();
