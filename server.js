require('dotenv').config();
const connectDB = require('./config/database');
const Scheduler = require('./services/scheduler');

// Import admin telegram service
const AdminTelegramService = require('./services/adminTelegramService');
// Import telegram service
const TelegramService = require('./services/telegramService');

// No web/API routes - removed all Express endpoints to focus only on Telegram bot functionality

let scheduler = null;
let adminTelegramService = null;
let telegramService = null;

const startService = async () => {
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
    
    // Initialize telegram services
    adminTelegramService = new AdminTelegramService();
    telegramService = new TelegramService();
    
    // Share the attendance service instance with services
    adminTelegramService.setAttendanceService(scheduler.attendanceService);
    telegramService.setAttendanceService(scheduler.attendanceService);
    
    // Connect admin telegram service with scheduler
    scheduler.setAdminTelegramService(adminTelegramService);
    
    // Ensure the attendance service has the scheduler reference
    scheduler.attendanceService.setScheduler(scheduler);
    
    // Start the scheduler
    scheduler.startDailyAttendanceCheck();
    
    // Start heartbeat monitoring for unexpected shutdown detection
    scheduler.startHeartbeat();
    
    console.log('='.repeat(60));
    console.log(`🚀 Attendance Telegram Bot Service Started`);
    console.log('='.repeat(60));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${dbConnection ? process.env.MONGODB_URI : 'Not connected (mock mode)'}`);
    console.log(`Mock Mode: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED ✅' : 'Disabled'}`);
    console.log(`User Bot: ${telegramService.isAvailable() ? 'ENABLED ✅' : 'Disabled'}`);
    console.log(`Admin Bot: ${adminTelegramService.isAvailable() ? 'ENABLED ✅' : 'Disabled'}`);
    console.log('='.repeat(60));
    
    console.log('✅ Scheduler initialized and started');
    
    // Notify admins that system is online
    if (adminTelegramService.isAvailable()) {
      adminTelegramService.sendSystemNotification(
        'System Online',
        'The Attendance Automation System has been started and is now online. Admin bot is ready to use.'
      );
    }
    
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  // Notify admins that system is shutting down
  if (adminTelegramService && adminTelegramService.isAvailable()) {
    try {
      await adminTelegramService.sendSystemNotification(
        'System Shutdown',
        'The Attendance Automation System is shutting down.'
      );
    } catch (err) {
      console.error('Error sending shutdown notification:', err);
    }
  }
  
  // Stop all tasks and record clean shutdown
  if (scheduler) {
    scheduler.stopAll(); // This also records clean shutdown
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  
  // Notify admins that system is shutting down
  if (adminTelegramService && adminTelegramService.isAvailable()) {
    try {
      await adminTelegramService.sendSystemNotification(
        'System Shutdown',
        'The Attendance Automation System is shutting down.'
      );
    } catch (err) {
      console.error('Error sending shutdown notification:', err);
    }
  }
  
  // Stop all tasks and record clean shutdown
  if (scheduler) {
    scheduler.stopAll(); // This also records clean shutdown
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  
  // Notify admins about the uncaught exception
  if (adminTelegramService && adminTelegramService.isAvailable()) {
    try {
      await adminTelegramService.sendSystemNotification(
        'System Error',
        `The Attendance Automation System encountered an error:\n\n${error.message}\n\nThe system may be unstable. Please check the server.`
      );
    } catch (err) {
      console.error('Error sending error notification:', err);
    }
  }
  
  // Record the exception but don't exit, let the process decide
  // In production environments, you might want to exit after an uncaught exception
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  
  // Notify admins about the unhandled rejection
  if (adminTelegramService && adminTelegramService.isAvailable()) {
    try {
      await adminTelegramService.sendSystemNotification(
        'System Warning',
        `The Attendance Automation System encountered an unhandled promise rejection:\n\n${reason}\n\nThe system will continue running but may be unstable.`
      );
    } catch (err) {
      console.error('Error sending warning notification:', err);
    }
  }
  
  // Log but don't exit
});

// Start the service
startService();

// Export initialized services
module.exports = {
  getScheduler: () => scheduler,
  getAdminTelegramService: () => adminTelegramService,
  getTelegramService: () => telegramService
};
