require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/database');
const Scheduler = require('./services/scheduler');

// Import routes
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Note: Routes will be registered after scheduler initialization to share service instance

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.json({
    success: true,
    message: 'Attendance Automation System is running',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusText[dbStatus] || 'unknown',
      readyState: dbStatus
    },
    scheduler: scheduler ? scheduler.getStatus() : null
  });
});

// Scheduler status endpoint
app.get('/api/scheduler/status', (req, res) => {
  if (!scheduler) {
    return res.status(500).json({
      success: false,
      message: 'Scheduler not initialized'
    });
  }

  res.json({
    success: true,
    status: scheduler.getStatus()
  });
});

// Get system statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const Student = require('./models/Student');
    
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    const inactiveStudents = await Student.countDocuments({ isActive: false });
    const telegramEnabled = await Student.countDocuments({ 'notifications.telegram': true });

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        telegramEnabled
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Update scheduler settings endpoint
app.post('/api/scheduler/update', (req, res) => {
  if (!scheduler) {
    return res.status(500).json({
      success: false,
      message: 'Scheduler not initialized'
    });
  }

  const { checkTime, enabled } = req.body;

  if (!checkTime) {
    return res.status(400).json({
      success: false,
      message: 'Check time is required'
    });
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(checkTime)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid time format. Use HH:MM (24-hour format)'
    });
  }

  try {
    // Update environment variable
    process.env.ATTENDANCE_CHECK_TIME = checkTime;

    // Restart the scheduler with new time
    scheduler.stopAll();
    
    if (enabled !== false) {
      scheduler.startDailyAttendanceCheck();
    }

    res.json({
      success: true,
      message: 'Scheduler settings updated successfully',
      status: scheduler.getStatus()
    });
  } catch (error) {
    console.error('Error updating scheduler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduler settings',
      error: error.message
    });
  }
});

// Manual test endpoint
app.post('/api/scheduler/test', async (req, res) => {
  if (!scheduler) {
    return res.status(500).json({
      success: false,
      message: 'Scheduler not initialized'
    });
  }

  try {
    console.log('Manual test check triggered via API');
    const result = await scheduler.attendanceService.checkAllStudentsAttendance();
    
    res.json({
      success: true,
      message: 'Test completed successfully',
      result: {
        total: result.total,
        successCount: result.successCount,
        failCount: result.failCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error running test:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize server
const PORT = process.env.PORT || 3000;
let scheduler = null;

const startServer = async () => {
  try {
    // Connect to database
    const dbConnection = await connectDB();
    
    if (dbConnection) {
      console.log('Database connected successfully');
    } else {
      console.log('Running without database (mock mode)');
    }

    // Initialize and start scheduler
    scheduler = new Scheduler();
    
    // Share the attendance service instance with routes
    attendanceRoutes.setAttendanceService(scheduler.attendanceService);
    
    // Register the routes with the shared service BEFORE the wildcard route
    app.use('/api/students', studentRoutes);
    app.use('/api/attendance', attendanceRoutes);
    
    // Serve frontend - MUST be after API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Start Express server
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log('='.repeat(60));
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${dbConnection ? process.env.MONGODB_URI : 'Not connected (mock mode)'}`);
      console.log(`Mock Mode: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED ✅' : 'Disabled'}`);
      console.log('='.repeat(60));
    });
    
    scheduler.startDailyAttendanceCheck();
    
    console.log('✅ Scheduler initialized and started');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (scheduler) {
    scheduler.stopAll();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  if (scheduler) {
    scheduler.stopAll();
  }
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
