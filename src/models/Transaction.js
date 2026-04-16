const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    package: { type: String, enum: ['spotlight_name', 'spotlight_profile'], required: true },
    packageName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['vietqr', 'momo', 'zalo', 'card'], default: 'vietqr' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
    orderId: { type: String, default: () => `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
