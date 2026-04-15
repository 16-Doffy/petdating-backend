const express = require('express');
const auth = require('../middleware/auth');
const Like = require('../models/Like');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Pet = require('../models/Pet');

const router = express.Router();

router.post('/like', auth, async (req, res) => {
  try {
    const { toPetId } = req.body;
    if (!toPetId) return res.status(400).json({ message: 'toPetId is required' });

    const myPet = await Pet.findOne({ ownerId: req.userId });
    if (!myPet) return res.status(400).json({ message: 'Create pet profile first' });

    await Like.findOneAndUpdate(
      { fromPetId: myPet._id, toPetId },
      { fromPetId: myPet._id, toPetId },
      { upsert: true }
    );

    const reciprocal = await Like.findOne({ fromPetId: toPetId, toPetId: myPet._id });
    let matched = false;
    let matchId = null;

    if (reciprocal) {
      const pair = [myPet._id.toString(), toPetId].sort();
      const match = await Match.findOneAndUpdate(
        { pet1: pair[0], pet2: pair[1] },
        { pet1: pair[0], pet2: pair[1] },
        { new: true, upsert: true }
      );
      matched = true;
      matchId = match._id.toString();
    }

    res.json({ matched, matchId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to like pet', error: error.message });
  }
});

router.post('/unlike', auth, async (req, res) => {
  try {
    const { toPetId } = req.body;
    if (!toPetId) return res.status(400).json({ message: 'toPetId is required' });

    const myPet = await Pet.findOne({ ownerId: req.userId });
    if (!myPet) return res.status(400).json({ message: 'Create pet profile first' });

    await Like.findOneAndDelete({ fromPetId: myPet._id, toPetId });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unlike pet', error: error.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const myPet = await Pet.findOne({ ownerId: req.userId });
    if (!myPet) return res.json({ matches: 0, likes: 0, pets: 1 });

    const [matchCount, likeSentCount, likeReceivedCount] = await Promise.all([
      Match.countDocuments({ $or: [{ pet1: myPet._id }, { pet2: myPet._id }] }),
      Like.countDocuments({ fromPetId: myPet._id }),
      Like.countDocuments({ toPetId: myPet._id }),
    ]);

    res.json({
      matches: matchCount,
      likes: likeSentCount + likeReceivedCount,
      pets: 1,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load stats', error: error.message });
  }
});

router.delete('/matches/:matchId', auth, async (req, res) => {
  try {
    const myPet = await Pet.findOne({ ownerId: req.userId });
    if (!myPet) return res.status(400).json({ message: 'Create pet profile first' });

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const belongs =
      match.pet1.toString() === myPet._id.toString() ||
      match.pet2.toString() === myPet._id.toString();

    if (!belongs) return res.status(403).json({ message: 'Forbidden' });

    await Match.deleteOne({ _id: match._id });
    await Message.deleteMany({ matchId: match._id });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unmatch', error: error.message });
  }
});

router.get('/matches', auth, async (req, res) => {
  try {
    const myPet = await Pet.findOne({ ownerId: req.userId });
    if (!myPet) return res.json({ matches: [] });

    const matches = await Match.find({
      $or: [{ pet1: myPet._id }, { pet2: myPet._id }],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ matches: matches.map((m) => ({ ...m, id: m._id.toString() })) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load matches', error: error.message });
  }
});

module.exports = router;
