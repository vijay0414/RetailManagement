const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      required: [true, 'Barcode is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    // Selling price — what the customer pays
    price: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Price cannot be negative'],
    },
    // Cost price — what the store pays to acquire the product (used for profit calculation)
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    supplierContact: {
      type: String,
      required: [true, 'Supplier contact is required'],
      trim: true,
    },
    // Supplier email for automated notifications
    supplierEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    reorderThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Reorder threshold cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// category index for filtered queries (barcode already indexed via unique:true)
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);
