const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, lowercase: true, trim: true, sparse: true, default: null },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    vipStatus: {
      package: { type: String, enum: ['spotlight_name', 'spotlight_profile', null], default: null },
      purchasedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      isActive: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
