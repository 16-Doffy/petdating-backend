const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const normalizeEmail = (value = '') => value.toLowerCase().trim();
const buildUsername = (email = '') => {
  const base = normalizeEmail(email)
    .replace(/@.*/, '')
    .replace(/[^a-z0-9._-]/g, '_')
    .slice(0, 32);
  if (!base) return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return base;
};


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

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      username: buildUsername(normalizedEmail),
      passwordHash,
    });

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
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'Email chưa được đăng ký' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
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

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and newPassword are required' });
    }

    if (String(newPassword).trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Reset password failed', error: error.message });
  }
});

// POST /auth/seed-admin — Tạo tài khoản admin để test
router.post('/seed-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = email || 'admin@petdating.app';
    const adminPass = password || 'admin123';

    const existing = await User.findOne({ email: normalizeEmail(adminEmail) });
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
      email: normalizeEmail(adminEmail),
      username: buildUsername(adminEmail),
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
