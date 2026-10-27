import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from './src/models/Product.js';
import StockItem from './src/models/StockItem.js';
import StockMovement from './src/models/StockMovement.js';
import StockReservation from './src/models/StockReservation.js';
import Counter from './src/models/Counter.js';

dotenv.config();

async function run() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        // Initial counts
        const productCountBefore = await Product.countDocuments({}).setOptions({ includeDeleted: true });
        const stockItemCountBefore = await StockItem.countDocuments({});
        const stockMovementCountBefore = await StockMovement.countDocuments({});
        const stockReservationCountBefore = await StockReservation.countDocuments({});

        console.log('--- Initial Document Counts ---');
        console.log(`- Products (including soft-deleted): ${productCountBefore}`);
        console.log(`- Stock Items: ${stockItemCountBefore}`);
        console.log(`- Stock Movements: ${stockMovementCountBefore}`);
        console.log(`- Stock Reservations: ${stockReservationCountBefore}`);

        console.log('\n--- Deleting Products and Stock Records ---');

        const deletedStockItems = await StockItem.deleteMany({});
        console.log(`✓ Deleted ${deletedStockItems.deletedCount} StockItem document(s)`);

        const deletedStockMovements = await StockMovement.deleteMany({});
        console.log(`✓ Deleted ${deletedStockMovements.deletedCount} StockMovement document(s)`);

        const deletedStockReservations = await StockReservation.deleteMany({});
        console.log(`✓ Deleted ${deletedStockReservations.deletedCount} StockReservation document(s)`);

        const deletedProducts = await Product.deleteMany({});
        console.log(`✓ Deleted ${deletedProducts.deletedCount} Product document(s)`);

        // Reset product counter sequence if exists
        await Counter.findByIdAndUpdate('product', { sequence: 1000 }).exec();
        console.log('✓ Reset product sequence counter to 1000');

        console.log('\n--- Verification Post-Deletion ---');
        const productCountAfter = await Product.countDocuments({}).setOptions({ includeDeleted: true });
        const stockItemCountAfter = await StockItem.countDocuments({});
        const stockMovementCountAfter = await StockMovement.countDocuments({});
        const stockReservationCountAfter = await StockReservation.countDocuments({});

        console.log(`- Products: ${productCountAfter} documents remaining`);
        console.log(`- Stock Items: ${stockItemCountAfter} documents remaining`);
        console.log(`- Stock Movements: ${stockMovementCountAfter} documents remaining`);
        console.log(`- Stock Reservations: ${stockReservationCountAfter} documents remaining`);

        console.log('\n🎉 Successfully removed all products and stock records from the database.');
    } catch (err) {
        console.error('❌ Error during deletion:', err);
    } finally {
        await mongoose.connection.close();
        console.log('DB connection closed.');
        process.exit(0);
    }
}

run();
