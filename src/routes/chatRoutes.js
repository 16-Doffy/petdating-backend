const express = require('express');
const auth = require('../middleware/auth');
const Pet = require('../models/Pet');
const Match = require('../models/Match');
const Message = require('../models/Message');

const router = express.Router();

router.get('/:matchId/messages', auth, async (req, res) => {
  try {
    const myPet = await Pet.findOne({ ownerId: req.userId });
    if (!myPet) return res.status(400).json({ message: 'Create pet profile first' });

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const belongs =
      match.pet1.toString() === myPet._id.toString() ||
      match.pet2.toString() === myPet._id.toString();

    if (!belongs) return res.status(403).json({ message: 'Forbidden' });

    const messages = await Message.find({ matchId: req.params.matchId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages: messages.map((msg) => ({ ...msg, id: msg._id.toString() })) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load messages', error: error.message });
  }
});

router.post('/:matchId/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message text is required' });

    const myPet = await Pet.findOne({ ownerId: req.userId });
    if (!myPet) return res.status(400).json({ message: 'Create pet profile first' });

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const belongs =
      match.pet1.toString() === myPet._id.toString() ||
      match.pet2.toString() === myPet._id.toString();

    if (!belongs) return res.status(403).json({ message: 'Forbidden' });

    const message = await Message.create({
      matchId: req.params.matchId,
      senderPetId: myPet._id,
      text: text.trim(),
    });

    res.status(201).json({ message: { ...message.toObject(), id: message._id.toString() } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

module.exports = router;
