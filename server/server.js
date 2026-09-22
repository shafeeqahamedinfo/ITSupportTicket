/**
 * SmartCampus ITCare – Smart Campus IT Support & Ticket Management System
 * Backend Server Entry Point
 * 
 * Author: CSE Final Year Project Team
 * Version: 1.0.0
 */

// Force Google DNS BEFORE any other module loads
// (fixes MongoDB Atlas SRV lookup failures on restricted networks)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
require('express-async-errors');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ─── Initialize Express App ───────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Initialize Socket.IO ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  // Production Render URL
  'https://it-support-ticket-management-system.onrender.com',
  process.env.CLIENT_URL,
].filter(Boolean);

// ─── Initialize Socket.IO ─────────────────────────────────────────────────────
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Make io accessible to route handlers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── Connect to Database ──────────────────────────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS Configuration
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// HTTP Request Logger (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploaded Files Statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global Rate Limiter – protect all API endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 6 * 1000,
  max: 100000,
  skip: () => true, // Disabled to prevent rate limiting during development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes.',
  },
});
app.use('/api', globalLimiter);

// Rate Limiter for Auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 6 * 1000,
  max: 100000,
  skip: () => true, // Disabled to allow unlimited login attempts
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.',
  },
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/sla', require('./routes/slaRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/knowledge-base', require('./routes/knowledgeRoutes'));
// app.use('/api/categories',      require('./routes/categoryRoutes'));
// app.use('/api/notifications',   require('./routes/notificationRoutes'));
// app.use('/api/feedback',        require('./routes/feedbackRoutes'));
// app.use('/api/admin',           require('./routes/adminRoutes'));
// app.use('/api/knowledge-base',  require('./routes/knowledgeBaseRoutes'));

// Provide a simple API root so requests to `/api` return useful info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '🎓 SmartCampus ITCare API',
    docs: `${req.protocol}://${req.get('host')}/api/health`,
  });
});

// Serve static client assets if client/dist exists
const clientDist = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // Root API route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: '🎓 SmartCampus ITCare API Server',
      docs: `${req.protocol}://${req.get('host')}/api/health`,
    });
  });
}

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ─ Join personal user room (targeted notifications) ─
  socket.on('join:user', (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    console.log(`   → User ${userId} joined personal room`);
  });

  // ─ Join role room (e.g. 'admin', 'it_staff') ─
  socket.on('join:role', (role) => {
    if (!role) return;
    socket.join(`role:${role}`);
    console.log(`   → Socket joined role room: ${role}`);
  });

  // ─ Join a specific ticket room (for live ticket detail updates) ─
  socket.on('join:room', (room) => {
    if (!room) return;
    socket.join(room);
    console.log(`   → Socket joined room: ${room}`);
  });

  // ─ Leave a room ─
  socket.on('leave:room', (room) => {
    if (!room) return;
    socket.leave(room);
  });

  // ─ Legacy room join (backward compat) ─
  socket.on('join', (userId) => {
    if (!userId) return;
    socket.join(userId);
    socket.join(`user:${userId}`);
  });

  socket.on('joinAdmin', () => {
    socket.join('adminRoom');
    socket.join('role:admin');
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});


// Export app and io for Vercel Serverless Function & controller imports
module.exports = app;
module.exports.io = io;

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// Import SLA monitor
const { startSlaMonitor } = require('./services/slaMonitor');

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎓 SmartCampus ITCare – IT Support Management System');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  🚀 Server running on  : http://localhost:${PORT}`);
    console.log(`  🌍 Environment        : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  📡 Health check       : http://localhost:${PORT}/api/health`);
    console.log(`  🔌 Socket.IO          : Active`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Start SLA Monitoring background job
    startSlaMonitor(io);
  });
}
