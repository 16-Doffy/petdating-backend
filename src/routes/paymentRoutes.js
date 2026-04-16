const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/admin');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

const PACKAGES = {
  spotlight_name: { name: 'Nổi bật tên', price: 29000, durationDays: 7 },
  spotlight_profile: { name: 'Trang Profile nổi bật', price: 49000, durationDays: 7 },
};

// POST /payment/activate — Kích hoạt VIP (sau khi thanh toán thành công)
router.post('/activate', auth, async (req, res) => {
  try {
    const { package: pkg, paymentMethod = 'vietqr' } = req.body;

    if (!pkg || !PACKAGES[pkg]) {
      return res.status(400).json({ message: 'Invalid package' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const pkgInfo = PACKAGES[pkg];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkgInfo.durationDays * 86400000);

    await User.findByIdAndUpdate(
      req.userId,
      {
        vipStatus: {
          package: pkg,
          purchasedAt: now,
          expiresAt,
          isActive: true,
        },
      },
      { new: true }
    );

    // Lưu transaction
    await Transaction.create({
      userId: user._id,
      userEmail: user.email,
      package: pkg,
      packageName: pkgInfo.name,
      amount: pkgInfo.price,
      paymentMethod,
      status: 'completed',
    });

    res.json({
      success: true,
      vipStatus: {
        package: pkg,
        purchasedAt: now,
        expiresAt,
        isActive: true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Activate VIP failed', error: error.message });
  }
});

// GET /payment/status — Lấy trạng thái VIP hiện tại
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('vipStatus').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const vip = user.vipStatus || {};
    const isActive = vip.isActive && vip.expiresAt && new Date(vip.expiresAt) > new Date();

    res.json({
      isActive,
      package: isActive ? vip.package : null,
      purchasedAt: isActive ? vip.purchasedAt : null,
      expiresAt: isActive ? vip.expiresAt : null,
      daysLeft: isActive
        ? Math.ceil((new Date(vip.expiresAt) - new Date()) / 86400000)
        : 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Get VIP status failed', error: error.message });
  }
});

// GET /payment/history — Lịch sử giao dịch của user hiện tại
router.get('/history', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: 'Get transaction history failed', error: error.message });
  }
});

// GET /payment/admin/stats — Admin: thống kê doanh thu (chỉ admin mới được)
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'completed' }).lean();

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOrders = transactions.length;

    // Doanh thu theo package
    const byPackage = {};
    for (const t of transactions) {
      byPackage[t.packageName] = (byPackage[t.packageName] || 0) + t.amount;
    }

    // Doanh thu 7 ngày gần đây
    const now = new Date();
    const last7Days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7Days[key] = 0;
    }
    for (const t of transactions) {
      const key = new Date(t.createdAt).toISOString().slice(0, 10);
      if (last7Days[key] !== undefined) last7Days[key] += t.amount;
    }

    // Top买家
    const byUser = {};
    for (const t of transactions) {
      byUser[t.userEmail] = (byUser[t.userEmail] || 0) + t.amount;
    }
    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, total]) => ({ email, total }));

    res.json({
      totalRevenue,
      totalOrders,
      byPackage,
      last7Days,
      topUsers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Get admin stats failed', error: error.message });
  }
});

// GET /payment/admin/transactions — Admin: list all transactions
router.get('/admin/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Transaction.countDocuments({ status: 'completed' }),
    ]);

    res.json({ transactions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Get transactions failed', error: error.message });
  }
});

module.exports = router;