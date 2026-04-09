const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initializeDatabase } = require('./db/schema');

const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const vaultRoutes = require('./routes/vault');
const memberRoutes = require('./routes/members');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files through authenticated endpoint (handled in vault routes)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/members', memberRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', '..', 'client', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Signal server running on port ${PORT}`);
});
