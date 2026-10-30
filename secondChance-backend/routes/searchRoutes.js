const express = require('express');
const connectToDatabase = require('../models/db');
const router = express.Router();

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', async (req, res, next) => {
  try {
    const query = {};

    for (const field of ['name', 'category', 'condition']) {
      const value = req.query[field];
      if (value === undefined || value === '') continue;

      if (typeof value !== 'string' || value.length > 200) {
        return res.status(400).json({ error: 'Invalid ' + field });
      }

      const pattern = escapeRegex(value.trim());
      if (pattern) {
        query[field] = {
          $regex: field === 'name' ? pattern : '^' + pattern + '$',
          $options: 'i'
        };
      }
    }

    if (req.query.age_years !== undefined) {
      const value = req.query.age_years;
      const age = Number(value);

      if (typeof value !== 'string' || !value.trim() ||
          !Number.isFinite(age) || age < 0) {
        return res.status(400).json({ error: 'Invalid age_years' });
      }

      query.age_years = { $lte: age };
    }

    const db = await connectToDatabase();
    const items = await db.collection('secondChanceItems')
      .find(query).toArray();

    res.json(items);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
