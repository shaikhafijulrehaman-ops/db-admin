require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const noticeRoutes = require('./routes/notices');

// Initialize express app
const app = express();

// Connect to MongoDB Database
connectDB();

// Global Middleware
app.use(cors());
app.use(express.json());

// Log HTTP requests in dev environment
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Database connection verification middleware
app.use(async (req, res, next) => {
  // Allow health check endpoint without DB connection
  if (req.path === '/api/health') {
    return next();
  }

  try {
    await connectDB();
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState < 1) {
      const dbUri = process.env.MONGODB_URI;
      return res.status(500).json({
        success: false,
        message: dbUri 
          ? "Database connection is not ready. Please check if your MongoDB server is running and accessible."
          : "Database connection is not ready. MONGODB_URI environment variable is missing in project settings."
      });
    }
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Database connection failed: " + err.message
    });
  }
});

// Map REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/notices', noticeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'School Management ERP Server is healthy.' });
});

// Start Server listening (only if not running in a serverless environment like Vercel)
if (process.env.VERCEL !== '1' && !process.env.NOW_REGION) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[ERP Server] running in active mode on port ${PORT}`);
    console.log(`[ERP Server] connected to MongoDB: donbosco-admin`);
  });
}

module.exports = app;
