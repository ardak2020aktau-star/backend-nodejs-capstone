require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectToDatabase = require('./models/db');
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');

const app = express();
const port = process.env.PORT || 3060;

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.use('/api/secondchance/items', secondChanceItemsRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/secondchance/search', require('./routes/searchRoutes'));

const frontendBuild = path.join(__dirname, '../secondChance-frontend/build');

app.use(express.static(frontendBuild));

app.get('*', (req, res, next) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  const status = error.status || (error.name === 'MulterError' ? 400 : 500);
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : error.message
  });
});

async function start() {
  await connectToDatabase();
  app.listen(port, '0.0.0.0', () => {
    console.log(`SecondChance server running on port ${port}`);
  });
}

start().catch(() => {
  console.error('Server startup failed: check MongoDB connection');
  process.exitCode = 1;
});
