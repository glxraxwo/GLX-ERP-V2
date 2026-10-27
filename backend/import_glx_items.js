import dotenv from 'dotenv';
import mongoose from 'mongoose';
import xlsx from 'xlsx';
import path from 'path';

import Product from './src/models/Product.js';
import StockItem from './src/models/StockItem.js';
import Category from './src/models/Category.js';
import Warehouse from './src/models/Warehouse.js';
import User from './src/models/User.js';

dotenv.config();

async function run() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB Atlas\n');

        // 1. Get or setup categories
        console.log('--- 1. Checking / Setting Up Categories ---');
        const defaultCategories = [
            { code: 'LBD', name: 'Lorry Bodies & Fabrications', description: 'Complete truck bodies, cargo boxes, and custom fabrications' },
            { code: 'SRV', name: 'Labour & Services', description: 'Labour charges, repair works, painting, and workshop services' },
            { code: 'ACC', name: 'Accessories & Hardware', description: 'Locks, hinges, handles, brackets, and body hardware' },
            { code: 'CNS', name: 'Consumables & Seals', description: 'Rivets, rubber beadings, sealants, spray foam, adhesives' },
            { code: 'ALU', name: 'Aluminium Profiles', description: 'Aluminium sheets, hollow bars, profiles, and extrusions' },
            { code: 'PNT', name: 'PAINT', description: 'Automotive paints, primers, and coating materials' },
            { code: 'GEN', name: 'General', description: 'General vehicle components and materials' }
        ];

        const categoryMap = new Map();
        for (const catDef of defaultCategories) {
            let cat = await Category.findOne({ code: catDef.code }).setOptions({ includeDeleted: true });
            if (!cat) {
                cat = await Category.create({
                    code: catDef.code,
                    name: catDef.name,
                    description: catDef.description,
                    isActive: true,
                    deletedAt: null
                });
                console.log(`+ Created Category: ${cat.name} (${cat.code})`);
            } else {
                cat.deletedAt = null;
                cat.isActive = true;
                await cat.save();
                console.log(`✓ Restored/Active Category: ${cat.name} (${cat.code})`);
            }
            categoryMap.set(catDef.code, cat._id);
        }

        // 2. Fetch Active Warehouses
        console.log('\n--- 2. Fetching Warehouses ---');
        const warehouses = await Warehouse.find({ deletedAt: null });
        console.log(`Found ${warehouses.length} active warehouse(s):`, warehouses.map(w => `${w.name} (${w.warehouseCode})`));

        // 3. Admin user for createdBy
        const adminUser = await User.findOne({});
        const adminId = adminUser?._id;

        // 4. Read Excel File
        console.log('\n--- 3. Reading GLX ITEMS.xls ---');
        const excelPath = path.resolve(process.cwd(), '..', 'GLX ITEMS.xls');
        const wb = xlsx.readFile(excelPath);
        const sheet = wb.Sheets['Sheet1'];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

        console.log(`Total rows in Excel: ${rows.length}`);

        const itemsToProcess = [];
        for (let idx = 0; idx < rows.length; idx++) {
            const r = rows[idx];
            if (!r || r[0] === null || r[0] === '' || isNaN(Number(r[0]))) {
                continue; // Skip header / empty rows
            }

            const code = Number(r[0]);
            const rawContent = String(r[1] || '').trim();
            const uomRaw = r[2] ? String(r[2]).trim() : 'Pcs';
            const costRaw = r[3];
            const saleRaw = r[4];

            itemsToProcess.push({
                row: idx + 1,
                code,
                rawContent,
                uom: uomRaw,
                cost: costRaw,
                sale: saleRaw
            });
        }

        console.log(`Valid items to import: ${itemsToProcess.length}\n`);

        // 5. Import Process
        console.log('--- 4. Creating Products & Stock Records ---');
        let createdProducts = 0;
        let createdStockItems = 0;

        for (const item of itemsToProcess) {
            // Split name and description
            const lines = item.rawContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            let name = lines[0] || `Item ${item.code}`;
            if (name.length > 200) {
                name = name.substring(0, 200).trim();
            }
            const description = lines.slice(1).join('\n').substring(0, 2000).trim();
            const shortName = name.length > 50 ? name.substring(0, 50).trim() : name;

            // Classify category and productType
            const n = name.toLowerCase();
            let catCode = 'GEN';
            let productType = 'raw_material';

            if (/lorry body|cargo lorry box|cool room|refrigerator|freezer|flat bed|fat bed|insulated/.test(n)) {
                catCode = 'LBD';
                productType = 'finished_good';
            } else if (/labour|charges|service|installation|unloading|branding/.test(n) || (n.includes('works') && !n.includes('ms sheet') && !n.includes('sealant'))) {
                catCode = 'SRV';
                productType = 'service';
            } else if (/paint/.test(n)) {
                catCode = 'PNT';
                productType = 'raw_material';
            } else if (/aluminium|sheet|plywood|chequer|gi square|hollow bar/.test(n)) {
                catCode = 'ALU';
                productType = 'raw_material';
            } else if (/beading|sealant|foam|rubber|rivet/.test(n)) {
                catCode = 'CNS';
                productType = 'raw_material';
            } else if (/lock|hinge|bracket|light|guard|stopper|gutter|handle|flap/.test(n)) {
                catCode = 'ACC';
                productType = 'raw_material';
            }

            const categoryId = categoryMap.get(catCode);

            // Cost & Sale Prices
            const costPrice = Math.max(0, parseFloat(item.cost) || 0);
            const salePrice = Math.max(0, parseFloat(item.sale) || 0);

            // Unique Barcode: standard 12-digit numeric barcode
            const barcode = `2600${String(item.code).padStart(8, '0')}`;
            // SKU: ITM-<legacy code>
            const sku = `ITM-${item.code}`;
            const productShortCode = String(item.code).slice(-3);

            // Create Product doc using Mongoose Model so pre('save') hook runs and generates productCode!
            const product = new Product({
                name,
                shortName,
                description,
                categoryId,
                productType,
                productShortCode,
                sku,
                barcode,
                unitOfMeasure: item.uom || 'Pcs',
                basePrice: salePrice,
                minPrice: costPrice,
                mrp: salePrice,
                currency: 'LKR',
                costs: {
                    standardCost: costPrice,
                    averageCost: costPrice,
                    lastPurchaseCost: costPrice
                },
                stockLevels: {
                    minimumLevel: productType === 'service' ? 0 : 5,
                    reorderLevel: productType === 'service' ? 0 : 10,
                    maximumLevel: productType === 'service' ? 0 : 100
                },
                salesConfig: {
                    sellable: true,
                    minimumOrderQuantity: 1,
                    allowBackorder: false
                },
                canBeSold: true,
                canBePurchased: productType !== 'service',
                canBeManufactured: productType === 'finished_good',
                status: 'active',
                createdBy: adminId
            });

            await product.save();
            createdProducts++;

            // Create initial StockItem for each active warehouse
            for (const wh of warehouses) {
                const stockItem = new StockItem({
                    productId: product._id,
                    productCode: product.productCode,
                    productName: product.name,
                    warehouseId: wh._id,
                    quantities: {
                        onHand: 0,
                        reserved: 0,
                        available: 0,
                        openStock: 0,
                        balanceStock: 0
                    },
                    unitOfMeasure: product.unitOfMeasure,
                    costPerUnit: costPrice,
                    totalValue: 0
                });

                await stockItem.save();
                createdStockItems++;
            }

            if (createdProducts % 50 === 0 || createdProducts === itemsToProcess.length) {
                console.log(`- Progress: ${createdProducts}/${itemsToProcess.length} products imported`);
            }
        }

        // 6. Verification
        console.log('\n--- 5. Verification ---');
        const finalProductCount = await Product.countDocuments({});
        const finalStockCount = await StockItem.countDocuments({});

        console.log(`✓ Total Products in Database: ${finalProductCount}`);
        console.log(`✓ Total Stock Items in Database: ${finalStockCount}`);

        // Sample product inspection
        const sampleProducts = await Product.find({}).limit(3).populate('categoryId', 'name code').lean();
        console.log('\nSample Imported Products:');
        sampleProducts.forEach(p => {
            console.log({
                productCode: p.productCode,
                sku: p.sku,
                barcode: p.barcode,
                name: p.name,
                category: p.categoryId?.name,
                hasDescription: !!p.description,
                descriptionSnippet: p.description ? p.description.substring(0, 60) + '...' : '(None)',
                basePrice: p.basePrice,
                cost: p.costs?.standardCost
            });
        });

        // Sample Lorry body inspection
        const lorryBodySample = await Product.findOne({ productType: 'finished_good' }).lean();
        if (lorryBodySample) {
            console.log('\nSample Lorry Body with Detailed Specs & Warranty:');
            console.log(`Code: ${lorryBodySample.productCode} | SKU: ${lorryBodySample.sku} | Barcode: ${lorryBodySample.barcode}`);
            console.log(`Name: ${lorryBodySample.name}`);
            console.log(`Description preview:\n${lorryBodySample.description.substring(0, 300)}...`);
        }

        console.log('\n🎉 ALL PRODUCTS AND STOCK RECORDS IMPORTED SUCCESSFULLY!');

    } catch (err) {
        console.error('❌ Import failed:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    }
}

run();
