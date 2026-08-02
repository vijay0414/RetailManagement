const mongoose = require('mongoose');

const reorderRequestSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Reorder quantity is required'],
      min: [1, 'Reorder quantity must be at least 1'],
    },
    // Snapshot of supplier details at time of reorder
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    supplierEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    expectedDeliveryDate: {
      type: Date,
      required: [true, 'Expected delivery date is required'],
    },
    // Optional manager note included in the reorder email
    managerFeedback: {
      type: String,
      trim: true,
      default: '',
    },
    // Manager identity snapshot — shown in reorder email instead of supplier contact
    managerName: {
      type: String,
      trim: true,
      default: '',
    },
    managerContact: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['placed', 'received'],
        message: 'Status must be either placed or received',
      },
      default: 'placed',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

reorderRequestSchema.index({ productId: 1 });
reorderRequestSchema.index({ status: 1 });

module.exports = mongoose.model('ReorderRequest', reorderRequestSchema);
