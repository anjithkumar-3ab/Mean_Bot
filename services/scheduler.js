const cron = require('node-cron');
const AttendanceService = require('./attendanceService');
const TelegramService = require('./telegramService');

class Scheduler {
  constructor() {
    // Create a single telegram service instance
    this.telegramService = new TelegramService();
    // Pass it to attendance service to avoid duplicate bot instances
    this.attendanceService = new AttendanceService(this.telegramService);
    // Set scheduler reference in attendance service
    this.attendanceService.setScheduler(this);
    this.adminTelegramService = null; // Will be set from server
    this.tasks = [];
    this.lastRunTime = null;
    this.currentCheckTime = process.env.ATTENDANCE_CHECK_TIME || '07:00';
    this.heartbeatTask = null;
    this.lastHeartbeat = null;
  }
  
  /**
   * Set the admin telegram service
   */
  setAdminTelegramService(adminTelegramService) {
    this.adminTelegramService = adminTelegramService;
  }

  /**
   * Parse time string (HH:MM) to cron format
   */
  parseToCron(timeString) {
    const [hours, minutes] = timeString.split(':');
    return `${minutes} ${hours} * * *`; // Run every day at specified time
  }

  /**
   * Start daily attendance check scheduler
   */
  startDailyAttendanceCheck() {
    const checkTime = this.currentCheckTime || process.env.ATTENDANCE_CHECK_TIME || '07:00';
    const cronExpression = this.parseToCron(checkTime);

    console.log(`Scheduling daily attendance check at ${checkTime} (cron: ${cronExpression})`);

    const task = cron.schedule(cronExpression, async () => {
      console.log('='.repeat(50));
      console.log(`Daily attendance check started at ${new Date().toLocaleString()}`);
      console.log('='.repeat(50));
      
      // Update last run time
      this.lastRunTime = new Date();

      try {
        // Notify admins of scheduled check start if admin bot is available
        if (this.adminTelegramService && this.adminTelegramService.isAvailable()) {
          await this.adminTelegramService.sendSystemNotification(
            'Scheduled Check Started', 
            'Daily attendance check has started. Results will be reported when complete.'
          );
        }
        
        const result = await this.attendanceService.checkAllStudentsAttendance();
        
        console.log('='.repeat(50));
        console.log('Daily attendance check completed');
        console.log(`Total: ${result.total}, Success: ${result.successCount}, Failed: ${result.failCount}`);
        console.log('='.repeat(50));
        
        // Notify admins of completion if admin bot is available
        if (this.adminTelegramService && this.adminTelegramService.isAvailable()) {
          await this.adminTelegramService.sendSystemNotification(
            'Scheduled Check Completed', 
            `Daily attendance check completed.\n\nTotal: ${result.total}\nSuccess: ${result.successCount}\nFailed: ${result.failCount}`
          );
        }

      } catch (error) {
        console.error('Error in scheduled attendance check:', error);
        
        // Notify admins of error if admin bot is available
        if (this.adminTelegramService && this.adminTelegramService.isAvailable()) {
          await this.adminTelegramService.sendSystemNotification(
            'Scheduled Check Error', 
            `Error occurred during daily attendance check: ${error.message}`
          );
        }
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata" // IST timezone
    });

    this.tasks.push(task);
    this.currentCheckTime = checkTime;
    console.log('Daily attendance scheduler started successfully');

    return task;
  }

  /**
   * Start manual test scheduler (runs every minute for testing)
   */
  startTestScheduler() {
    console.log('Starting test scheduler (runs every minute)...');

    const task = cron.schedule('* * * * *', async () => {
      console.log(`Test check at ${new Date().toLocaleString()}`);
    });

    this.tasks.push(task);
    return task;
  }

  /**
   * Start weekly summary scheduler (Sunday 8 PM)
   */
  startWeeklySummary() {
    // Run every Sunday at 8 PM
    const cronExpression = '0 20 * * 0';

    console.log('Scheduling weekly summary (Sunday 8 PM)');

    const task = cron.schedule(cronExpression, async () => {
      console.log('Weekly summary generation started');
      // TODO: Implement weekly summary logic
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    this.tasks.push(task);
    return task;
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll() {
    console.log('Stopping all scheduled tasks...');
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    
    // Record clean shutdown in heartbeat file
    this.recordCleanShutdown();
  }

  /**
   * Update scheduler time
   * @param {string} timeString - New time in "HH:MM" format
   * @returns {object} - Status after update
   */
  updateScheduleTime(timeString) {
    // Validate time format
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
      throw new Error('Invalid time format. Please use HH:MM (24-hour format)');
    }

    // Store the new time
    this.currentCheckTime = timeString;
    console.log(`Setting schedule time to: ${timeString}`);

    // Stop existing scheduled tasks
    this.stopAll();

    // Restart scheduler with new time
    this.startDailyAttendanceCheck();

    return this.getStatus();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const checkTime = this.currentCheckTime || process.env.ATTENDANCE_CHECK_TIME || '07:00';
    const [hours, minutes] = checkTime.split(':');
    
    // Calculate next run time
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // If the time has already passed today, set it for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return {
      activeTasks: this.tasks.length,
      checkTime: checkTime,
      timezone: 'Asia/Kolkata',
      nextRun: nextRun.toISOString(),
      lastRun: this.lastRunTime ? this.lastRunTime.toISOString() : null,
      running: this.tasks.length > 0,
      isRunning: this.tasks.length > 0,
      lastHeartbeat: this.lastHeartbeat ? this.lastHeartbeat.toISOString() : null
    };
  }
  
  /**
   * Start server heartbeat to detect unexpected shutdowns
   */
  startHeartbeat() {
    const fs = require('fs');
    const path = require('path');
    const heartbeatFile = path.join(__dirname, '../', 'server-heartbeat.json');
    
    console.log('Starting server heartbeat monitoring...');
    
    // Record a clean startup
    const heartbeatData = {
      lastStartup: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      cleanShutdown: true
    };
    
    // Check if there was a previous heartbeat file
    try {
      if (fs.existsSync(heartbeatFile)) {
        const previousData = JSON.parse(fs.readFileSync(heartbeatFile, 'utf8'));
        
        // If the previous shutdown wasn't clean, notify admins
        if (!previousData.cleanShutdown && this.adminTelegramService && this.adminTelegramService.isAvailable()) {
          const downTime = new Date(heartbeatData.lastStartup) - new Date(previousData.lastHeartbeat);
          const minutesDown = Math.round(downTime / (1000 * 60));
          
          // Notify admins about the unexpected shutdown
          this.adminTelegramService.sendSystemNotification(
            'System Recovery After Crash',
            `⚠️ The Attendance Automation System has recovered after an unexpected shutdown.\n\n` +
            `Last recorded activity: ${new Date(previousData.lastHeartbeat).toLocaleString()}\n` +
            `System was down for approximately: ${minutesDown} minute(s)\n\n` +
            `The system has been restarted successfully.`
          ).catch(err => console.error('Error sending shutdown notification:', err));
          
          console.warn('⚠️ Detected recovery from unexpected shutdown. Admin notification sent.');
        }
      }
    } catch (error) {
      console.error('Error reading previous heartbeat data:', error);
    }
    
    // Write the initial heartbeat
    try {
      fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeatData, null, 2));
    } catch (error) {
      console.error('Error writing heartbeat file:', error);
    }
    
    // Set up heartbeat interval (every 30 seconds)
    this.heartbeatTask = setInterval(() => {
      try {
        // Update the last heartbeat time
        this.lastHeartbeat = new Date();
        
        // Read the current data
        const currentData = JSON.parse(fs.readFileSync(heartbeatFile, 'utf8'));
        
        // Update heartbeat time and keep other values
        currentData.lastHeartbeat = this.lastHeartbeat.toISOString();
        currentData.cleanShutdown = false; // Will be set to true on graceful shutdown
        
        // Write updated data
        fs.writeFileSync(heartbeatFile, JSON.stringify(currentData, null, 2));
      } catch (error) {
        console.error('Error updating heartbeat:', error);
      }
    }, 30000); // Every 30 seconds
    
    console.log('Server heartbeat monitoring started successfully');
  }
  
  /**
   * Record clean shutdown in heartbeat file
   */
  recordCleanShutdown() {
    const fs = require('fs');
    const path = require('path');
    const heartbeatFile = path.join(__dirname, '../', 'server-heartbeat.json');
    
    try {
      if (fs.existsSync(heartbeatFile)) {
        // Read current data
        const currentData = JSON.parse(fs.readFileSync(heartbeatFile, 'utf8'));
        
        // Mark shutdown as clean
        currentData.cleanShutdown = true;
        
        // Write updated data
        fs.writeFileSync(heartbeatFile, JSON.stringify(currentData, null, 2));
        console.log('Recorded clean shutdown in heartbeat file');
      }
    } catch (error) {
      console.error('Error recording clean shutdown:', error);
    }
    
    // Clear the heartbeat interval if it exists
    if (this.heartbeatTask) {
      clearInterval(this.heartbeatTask);
      this.heartbeatTask = null;
    }
  }
}

module.exports = Scheduler;
