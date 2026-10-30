const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const connectToDatabase = require('../models/db');

const router = express.Router();
const directory = path.join(__dirname, '../public/images/uploads');
fs.mkdirSync(directory, { recursive: true });

const types = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: directory,
    filename: (req, file, cb) => {
      cb(null, randomUUID() + types[file.mimetype]);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (types[file.mimetype]) return cb(null, true);
    cb(Object.assign(new Error('Use a JPG, PNG or WebP image'), {
      status: 400
    }));
  }
});

function getFields(body) {
  const item = {};
  for (const field of ['name', 'description', 'category', 'condition']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
        throw Object.assign(new Error('Invalid ' + field), { status: 400 });
      }
      item[field] = body[field].trim();
    }
  }

  if (body.age_days !== undefined) {
    const days = Number(body.age_days);
    if (!Number.isFinite(days) || days < 0) {
      throw Object.assign(new Error('Invalid age_days'), { status: 400 });
    }
    item.age_days = days;
    item.age_years = Number((days / 365).toFixed(1));
  }
  return item;
}

// GET /api/secondchance/items
router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const items = await db.collection('secondChanceItems').find({}).toArray();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// POST /api/secondchance/items — optional image in the "file" field
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const item = getFields(req.body);
    if (!item.name || !item.description || !item.category || !item.condition) {
      throw Object.assign(new Error(
        'name, description, category and condition are required'
      ), { status: 400 });
    }

    item.id = randomUUID();
    item.date_added = Math.floor(Date.now() / 1000);
    item.age_days = item.age_days ?? 0;
    item.age_years = item.age_years ?? 0;
    if (req.file) item.image = '/images/uploads/' + req.file.filename;

    const db = await connectToDatabase();
    const result = await db.collection('secondChanceItems').insertOne(item);
    res.status(201).json({ ...item, _id: result.insertedId });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(error);
  }
});

// GET /api/secondchance/items/:id
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const item = await db.collection('secondChanceItems')
      .findOne({ id: req.params.id });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// PUT /api/secondchance/items/:id
router.put('/:id', async (req, res, next) => {
  try {
    const changes = getFields(req.body);
    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: 'No editable fields supplied' });
    }
    changes.updatedAt = new Date();

    const db = await connectToDatabase();
    const item = await db.collection('secondChanceItems').findOneAndUpdate(
      { id: req.params.id },
      { $set: changes },
      { returnDocument: 'after' }
    );

    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ uploaded: 'success', item });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/secondchance/items/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const result = await db.collection('secondChanceItems')
      .deleteOne({ id: req.params.id });

    if (!result.deletedCount) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ deleted: 'success' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
