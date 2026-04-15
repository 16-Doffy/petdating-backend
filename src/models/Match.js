const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    pet1: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    pet2: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  },
  { timestamps: true }
);

matchSchema.index({ pet1: 1, pet2: 1 }, { unique: true });

module.exports = mongoose.model('Match', matchSchema);
