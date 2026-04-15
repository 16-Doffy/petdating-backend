const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const petRoutes = require('./routes/petRoutes');
const socialRoutes = require('./routes/socialRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/pets', petRoutes);
app.use('/social', socialRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/payment', paymentRoutes);

const start = async () => {
  const port = process.env.PORT || 4000;
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in .env');
  }

  await mongoose.connect(mongoUri);
  app.listen(port, () => {
    console.log(`Bossitive backend running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
