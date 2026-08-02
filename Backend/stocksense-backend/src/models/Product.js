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
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
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
