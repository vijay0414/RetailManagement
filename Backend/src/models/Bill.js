const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    // Selling price snapshot at time of sale
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    // Cost price snapshot at time of sale — used for profit calculation
    costPrice: {
      type: Number,
      required: true,
      min: [0, 'Cost price cannot be negative'],
      default: 0,
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: [billItemSchema],
      validate: {
        validator: (items) => items && items.length > 0,
        message: 'Bill must have at least one item',
      },
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
    billedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: email a copy of the invoice to the customer
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// invoiceNumber already indexed via unique:true; add billedBy for query perf
billSchema.index({ billedBy: 1 });
billSchema.index({ createdAt: 1 });  // used by daily revenue / profit queries

module.exports = mongoose.model('Bill', billSchema);
