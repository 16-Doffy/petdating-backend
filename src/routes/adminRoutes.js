const express = require('express');
const adminAuth = require('../middleware/admin');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const router = express.Router();
const normalizeEmail = (value = '') => value.toLowerCase().trim();
const buildUsername = (email = '') =>
  normalizeEmail(email)
    .replace(/@.*/, '')
    .replace(/[^a-z0-9._-]/g, '_')
    .slice(0, 32) || `admin_${Date.now()}`;

// GET /admin/dashboard — Thống kê tổng quan
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [totalUsers, vipUsers, recentSignups, vipPackages] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'vipStatus.isActive': true }),
      User.find({ role: 'user' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('email createdAt vipStatus')
        .lean(),
      User.aggregate([
        { $match: { 'vipStatus.isActive': true } },
        { $group: { _id: '$vipStatus.package', count: { $sum: 1 } } },
      ]),
    ]);

    const packageStats = {
      spotlight_name: 0,
      spotlight_profile: 0,
    };
    for (const p of vipPackages) {
      if (p._id && packageStats[p._id] !== undefined) {
        packageStats[p._id] = p.count;
      }
    }

    res.json({
      totalUsers,
      vipUsers,
      freeUsers: totalUsers - vipUsers,
      totalRevenue: packageStats.spotlight_name * 29000 + packageStats.spotlight_profile * 49000,
      packageStats,
      recentSignups: recentSignups.map((u) => ({
        email: u.email,
        joinedAt: u.createdAt,
        isVip: u.vipStatus?.isActive || false,
        vipPackage: u.vipStatus?.package || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Dashboard error', error: error.message });
  }
});

// GET /admin/users — Danh sách tất cả user (phân trang)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('email role vipStatus createdAt')
        .lean(),
      User.countDocuments(),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        role: u.role,
        vipActive: u.vipStatus?.isActive || false,
        vipPackage: u.vipStatus?.package || null,
        vipExpiresAt: u.vipStatus?.expiresAt || null,
        joinedAt: u.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Users list error', error: error.message });
  }
});

// GET /admin/vip-users — Danh sách user đang có VIP
router.get('/vip-users', adminAuth, async (req, res) => {
  try {
    const vipUsers = await User.find({ 'vipStatus.isActive': true })
      .sort({ 'vipStatus.expiresAt': 1 })
      .select('email vipStatus')
      .lean();

    res.json({
      vipUsers: vipUsers.map((u) => ({
        email: u.email,
        package: u.vipStatus.package,
        purchasedAt: u.vipStatus.purchasedAt,
        expiresAt: u.vipStatus.expiresAt,
        daysLeft: Math.ceil((new Date(u.vipStatus.expiresAt) - new Date()) / 86400000),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'VIP users error', error: error.message });
  }
});

// POST /admin/create-admin — Tạo tài khoản admin (chỉ admin mới làm được)
router.post('/create-admin', adminAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email và password là bắt buộc' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      username: buildUsername(normalizedEmail),
      passwordHash,
      role: 'admin',
    });

    res.status(201).json({ message: 'Admin created', userId: user._id.toString() });
  } catch (error) {
    res.status(500).json({ message: 'Create admin failed', error: error.message });
  }
});

module.exports = router;
