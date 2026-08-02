/**
 * seed.js — Demo data seeder for StockSense
 *
 * Creates:
 *   - 1 Manager user   (EMP001 / manager123)
 *   - 1 Biller user    (EMP002 / biller123)
 *   - 8 sample products across various categories
 *
 * Usage:  npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const { generateUniqueBarcode } = require('./src/services/barcodeService');

const SEED_USERS = [
  {
    username: 'Rajesh Kumar',
    employeeId: 'EMP001',
    password: 'manager123',
    role: 'manager',
  },
  {
    username: 'Priya Sharma',
    employeeId: 'EMP002',
    password: 'biller123',
    role: 'biller',
  },
];

const SEED_PRODUCTS = [
  {
    name: 'Basmati Rice 5kg',
    category: 'Grains',
    price: 350,
    quantity: 50,
    supplierName: 'AgroFarm Supplies',
    supplierContact: '+91-9876543210',
    reorderThreshold: 10,
  },
  {
    name: 'Toor Dal 1kg',
    category: 'Pulses',
    price: 120,
    quantity: 4,              // below threshold — will trigger alert on first bill
    supplierName: 'PulsePro Traders',
    supplierContact: '+91-9123456780',
    reorderThreshold: 8,
  },
  {
    name: 'Sunflower Oil 1L',
    category: 'Oils',
    price: 140,
    quantity: 30,
    supplierName: 'GoldDrop Oils',
    supplierContact: '+91-9988776655',
    reorderThreshold: 5,
  },
  {
    name: 'Full Cream Milk 500ml',
    category: 'Dairy',
    price: 28,
    quantity: 3,              // low stock
    supplierName: 'FreshDairy Co.',
    supplierContact: '+91-9000112233',
    reorderThreshold: 10,
  },
  {
    name: 'Whole Wheat Bread',
    category: 'Bakery',
    price: 45,
    quantity: 20,
    supplierName: 'BreadWorks Bakery',
    supplierContact: '+91-9456789012',
    reorderThreshold: 5,
  },
  {
    name: 'Lay\'s Classic Chips 26g',
    category: 'Snacks',
    price: 20,
    quantity: 100,
    supplierName: 'SnackHub Distributors',
    supplierContact: '+91-9112233445',
    reorderThreshold: 20,
  },
  {
    name: 'Colgate Toothpaste 100g',
    category: 'Personal Care',
    price: 65,
    quantity: 40,
    supplierName: 'CarePro Distributors',
    supplierContact: '+91-9223344556',
    reorderThreshold: 10,
  },
  {
    name: 'Surf Excel 1kg',
    category: 'Household',
    price: 195,
    quantity: 25,
    supplierName: 'CleanMart Supplies',
    supplierContact: '+91-9334455667',
    reorderThreshold: 5,
  },
];

const seed = async () => {
  try {
    await connectDB();

    console.log('\n🌱 Starting seed...\n');

    // ── Users ──────────────────────────────────────────────────────────────────
    console.log('👤 Seeding users...');
    for (const userData of SEED_USERS) {
      const existing = await User.findOne({ employeeId: userData.employeeId });
      if (existing) {
        console.log(`   ⏭  User ${userData.employeeId} already exists — skipping.`);
        continue;
      }

      await User.create(userData); // password hashed via pre-save hook
      console.log(`   ✅ Created ${userData.role}: ${userData.username} (${userData.employeeId})`);
    }

    // ── Products ───────────────────────────────────────────────────────────────
    console.log('\n📦 Seeding products...');
    for (const productData of SEED_PRODUCTS) {
      const existing = await Product.findOne({ name: productData.name });
      if (existing) {
        console.log(`   ⏭  Product "${productData.name}" already exists — skipping.`);
        continue;
      }

      const barcode = await generateUniqueBarcode();
      await Product.create({ ...productData, barcode });
      console.log(`   ✅ "${productData.name}" — barcode: ${barcode}`);
    }

    console.log('\n─────────────────────────────────────────────');
    console.log('✅ Seed complete!\n');
    console.log('Demo credentials:');
    console.log('  Manager → employeeId: EMP001  |  password: manager123');
    console.log('  Biller  → employeeId: EMP002  |  password: biller123');
    console.log('─────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
