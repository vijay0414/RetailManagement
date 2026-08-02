const mongoose = require('mongoose');

const stockAlertSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    remainingStock: {
      type: Number,
      required: [true, 'Remaining stock is required'],
      min: [0, 'Remaining stock cannot be negative'],
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
    status: {
      type: String,
      enum: {
        values: ['pending', 'informed', 'dismissed'],
        message: 'Status must be pending, informed, or dismissed',
      },
      default: 'pending',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

stockAlertSchema.index({ status: 1 });
stockAlertSchema.index({ productId: 1 });

module.exports = mongoose.model('StockAlert', stockAlertSchema);
