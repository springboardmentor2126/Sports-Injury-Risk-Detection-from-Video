require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athletes');
const sessionRoutes = require('./routes/sessions');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/sessions', sessionRoutes);

// Simple Status Check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Sports Biomechanics API'
  });
});

// Serve frontend static assets in production if desired (optional)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Initialize Database then Start Server
async function startServer() {
  try {
    console.log('Initializing SQLite database...');
    await initDb();
    
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`  Sports Biomechanics Server running on Port ${PORT}`);
      console.log(`  API Status Check: http://localhost:${PORT}/api/status`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to initialize and start server:', error);
    process.exit(1);
  }
}

startServer();
