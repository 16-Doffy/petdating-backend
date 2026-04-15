const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    fromPetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    toPetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  },
  { timestamps: true }
);

likeSchema.index({ fromPetId: 1, toPetId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
