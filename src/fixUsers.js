/**
 * Chạy 1 lần để fix duplicate username null
 * Usage: node src/fixUsers.js
 */
const mongoose = require('mongoose');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in backend/.env first');
  process.exit(1);
}

async function fix() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // 1. Drop unique index on username (cho phép nhiều null)
  const indexes = await users.indexes();
  console.log('Current indexes:', indexes);

  try {
    await users.dropIndex('username_1');
    console.log('Dropped username_1 index ✅');
  } catch (e) {
    console.log('username_1 index not found or already dropped');
  }

  // 2. Xoá các user trùng null username (giữ lại 1)
  const nullUsers = await users.find({ username: null }).toArray();
  console.log(`Found ${nullUsers.length} users with null username`);

  if (nullUsers.length > 1) {
    // Giữ lại user đầu tiên (theo createdAt), xoá các user còn lại
    const toDelete = nullUsers.slice(1).map(u => u._id);
    const result = await users.deleteMany({ _id: { $in: toDelete } });
    console.log(`Deleted ${result.deletedCount} duplicate null-username users`);
  }

  // 3. Tạo lại sparse unique index (cho phép null duy nhất)
  await users.createIndex(
    { username: 1 },
    { unique: true, sparse: true, background: true }
  );
  console.log('Recreated sparse unique index on username ✅');

  const newIndexes = await users.indexes();
  console.log('New indexes:', newIndexes);

  await mongoose.disconnect();
  console.log('Done!');
}

fix().catch(console.error);
