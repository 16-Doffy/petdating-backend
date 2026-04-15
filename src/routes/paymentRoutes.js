const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const PACKAGES = {
  spotlight_name: { price: 29000, durationDays: 7 },
  spotlight_profile: { price: 49000, durationDays: 7 },
};

// POST /payment/activate — Kích hoạt VIP (sau khi thanh toán thành công)
router.post('/activate', auth, async (req, res) => {
  try {
    const { package: pkg } = req.body;

    if (!pkg || !PACKAGES[pkg]) {
      return res.status(400).json({ message: 'Invalid package' });
    }

    const pkgInfo = PACKAGES[pkg];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkgInfo.durationDays * 86400000);

    const user = await User.findByIdAndUpdate(
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

    res.json({
      success: true,
      vipStatus: {
        package: user.vipStatus.package,
        purchasedAt: user.vipStatus.purchasedAt,
        expiresAt: user.vipStatus.expiresAt,
        isActive: user.vipStatus.isActive,
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

module.exports = router;