const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Like = require('../models/Like');
const Match = require('../models/Match');
const Message = require('../models/Message');

const router = express.Router();

const inferPetType = (payload = {}) => {
  if (payload.type === 'Dog' || payload.type === 'Cat') return payload.type;

  const source = [
    payload.breed,
    payload.name,
    payload.bio,
    Array.isArray(payload.tags) ? payload.tags.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const catKeywords = ['cat', 'meo', 'mèo', 'anh', 'mun', 'mướp', 'scottish', 'persian'];
  const dogKeywords = ['dog', 'cho', 'chó', 'corgi', 'poodle', 'husky', 'retriever', 'becgie'];

  if (catKeywords.some((keyword) => source.includes(keyword))) return 'Cat';
  if (dogKeywords.some((keyword) => source.includes(keyword))) return 'Dog';
  return 'Dog';
};

const toClientPet = (pet) => ({
  ...pet,
  id: pet._id.toString(),
  ownerId: pet.ownerId?.toString?.() ?? pet.ownerId,
  type: inferPetType(pet),
});

router.post('/me', auth, async (req, res) => {
  try {
    const payload = { ...req.body, type: inferPetType(req.body) };
    const pet = await Pet.findOneAndUpdate(
      { ownerId: req.userId },
      { ...payload, ownerId: req.userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.status(201).json({ pet: toClientPet(pet) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save pet profile', error: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const pet = await Pet.findOne({ ownerId: req.userId }).lean();
    if (!pet) return res.json({ pet: null });
    res.json({ pet: toClientPet(pet) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load pet profile', error: error.message });
  }
});

router.get('/explore', auth, async (req, res) => {
  try {
    const myPet = await Pet.findOne({ ownerId: req.userId }).lean();
    const query = myPet ? { _id: { $ne: myPet._id } } : {};
    const pets = await Pet.find(query).lean();
    res.json({ pets: pets.map(toClientPet) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load explore pets', error: error.message });
  }
});

router.get('/:petId', auth, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.petId).lean();
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    res.json({ pet: toClientPet(pet) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load pet detail', error: error.message });
  }
});

// SEED DATA: 6 TÀI KHOẢN + 6 PET ĐA DẠNG
router.post('/seed/demo', async (_req, res) => {
  try {
    // KHÔNG xóa dữ liệu cũ — chỉ tạo thêm nếu chưa có
    const existingPets = await Pet.countDocuments();
    if (existingPets > 0) {
      return res.json({ ok: true, message: `Đã có ${existingPets} pet trong DB, bỏ qua seed.` });
    }

    const passwordHash = await bcrypt.hash('123456', 10);

    const owners = await User.insertMany([
      { email: 'minh@bossitive.app', passwordHash },
      { email: 'lan@bossitive.app', passwordHash },
      { email: 'thao@bossitive.app', passwordHash },
      { email: 'khoa@bossitive.app', passwordHash },
      { email: 'mai@bossitive.app', passwordHash },
      { email: 'hung@bossitive.app', passwordHash },
    ]);

    const pets = await Pet.insertMany([
      {
        ownerId: owners[0]._id, name: 'Milo', age: '2 tuổi', breed: 'Corgi',
        type: 'Dog', gender: 'Male', location: 'Quận 1, HCM',
        bio: 'Milo thích đi dạo công viên và chơi đùa với các bé khác!',
        image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600',
        ownerContact: '0901234567',
      },
      {
        ownerId: owners[1]._id, name: 'Luna', age: '1.5 tuổi', breed: 'Poodle',
        type: 'Dog', gender: 'Female', location: 'Quận 7, HCM',
        bio: 'Luna rất thông minh, biết ngồi và bắt bóng.',
        image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600',
        ownerContact: '0902345678',
      },
      {
        ownerId: owners[2]._id, name: 'Buddy', age: '3 tuổi', breed: 'Golden Retriever',
        type: 'Dog', gender: 'Male', location: 'Đống Đa, HN',
        bio: 'Buddy thân thiện, yêu trẻ em và rất trung thành.',
        image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600',
        ownerContact: '0903456789',
      },
      {
        ownerId: owners[3]._id, name: 'Mimi', age: '2 tuổi', breed: 'Mèo Anh',
        type: 'Cat', gender: 'Female', location: 'Bình Thạnh, HCM',
        bio: 'Mimi điệu đà, thích nằm cạnh cửa sổ ngắm mây.',
        image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
        ownerContact: '0904567890',
      },
      {
        ownerId: owners[4]._id, name: 'Mít', age: '1 tuổi', breed: 'Mèo Mướp',
        type: 'Cat', gender: 'Male', location: 'Thủ Đức, HCM',
        bio: 'Mít nghịch ngợm, leo trèo tốt và rất hiếu động.',
        image: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=600',
        ownerContact: '0905678901',
      },
      {
        ownerId: owners[5]._id, name: 'Mochi', age: '2.5 tuổi', breed: 'Scottish Fold',
        type: 'Cat', gender: 'Female', location: 'Ba Đình, HN',
        bio: 'Mochi dễ thương với đôi tai cụp, thích ôm ấm.',
        image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600',
        ownerContact: '0906789012',
      },
    ]);

    res.json({ ok: true, message: `Đã tạo ${pets.length} pet mẫu thành công! Đăng nhập: email bất kỳ + pass 123456` });
  } catch (error) {
    res.status(500).json({ message: 'Seed failed', error: error.message });
  }
});

module.exports = router;
