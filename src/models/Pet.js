const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true },
    age: { type: String, required: true },
    breed: { type: String, required: true },
    type: { type: String, enum: ['Dog', 'Cat'], default: 'Dog' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    location: { type: String, required: true },
    bio: { type: String, default: '' },
    image: { type: String, required: true },
    ownerContact: { type: String, required: true },
    weight: { type: String, default: '' },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pet', petSchema);
