const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const toClient = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
  vipStatus: user.vipStatus,
});

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    const token = signToken(user._id.toString());
    res.status(201).json({ token, user: toClient(user) });
  } catch (error) {
    res.status(500).json({ message: 'Register failed', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: toClient(user) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    return res.json({ user: toClient(user) });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// POST /auth/seed-admin — Tạo tài khoản admin để test
router.post('/seed-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = email || 'admin@petdating.app';
    const adminPass = password || 'admin123';

    const existing = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existing) {
      // Nâng cấp thành admin nếu chưa phải
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
      }
      return res.json({ message: 'Admin already exists', email: adminEmail });
    }

    const passwordHash = await bcrypt.hash(adminPass, 10);
    const user = await User.create({
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });

    res.status(201).json({
      message: 'Admin created',
      email: adminEmail,
      password: adminPass,
    });
  } catch (error) {
    res.status(500).json({ message: 'Seed admin failed', error: error.message });
  }
});

module.exports = router;
