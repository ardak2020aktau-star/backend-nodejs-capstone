const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const connectToDatabase = require('../models/db');

function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  };
}

function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : req.get('x-auth-token');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName = '', lastName = '' } = req.body;

    if (typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' ||
        password.length < 8 || Buffer.byteLength(password) > 72 ||
        typeof firstName !== 'string' ||
        typeof lastName !== 'string' ||
        firstName.length > 80 || lastName.length > 80) {
      return res.status(400).json({ error: 'Invalid registration details' });
    }

    const db = await connectToDatabase();
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });

    const user = {
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      createdAt: new Date()
    };

    const result = await users.insertOne(user);
    user._id = result.insertedId;

    res.status(201).json({
      message: 'User registered successfully',
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.put('/update', authenticate, async (req, res, next) => {
  try {
    const changes = {};

    for (const field of ['firstName', 'lastName']) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string' ||
            req.body[field].length > 80) {
          return res.status(400).json({ error: 'Invalid ' + field });
        }
        changes[field] = req.body[field].trim();
      }
    }

    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: 'Provide firstName or lastName' });
    }

    changes.updatedAt = new Date();
    const db = await connectToDatabase();
    const user = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.user.id) },
      { $set: changes },
      { returnDocument: 'after' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated', user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
