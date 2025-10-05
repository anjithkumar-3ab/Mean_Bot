const cron = require('node-cron');
const AttendanceService = require('./attendanceService');
const TelegramService = require('./telegramService');

class Scheduler {
  constructor() {
    // Create a single telegram service instance
    this.telegramService = new TelegramService();
    // Pass it to attendance service to avoid duplicate bot instances
    this.attendanceService = new AttendanceService(this.telegramService);
    this.tasks = [];
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
    const checkTime = process.env.ATTENDANCE_CHECK_TIME || '08:00';
    const cronExpression = this.parseToCron(checkTime);

    console.log(`Scheduling daily attendance check at ${checkTime} (cron: ${cronExpression})`);

    const task = cron.schedule(cronExpression, async () => {
      console.log('='.repeat(50));
      console.log(`Daily attendance check started at ${new Date().toLocaleString()}`);
      console.log('='.repeat(50));

      try {
        const result = await this.attendanceService.checkAllStudentsAttendance();
        
        console.log('='.repeat(50));
        console.log('Daily attendance check completed');
        console.log(`Total: ${result.total}, Success: ${result.successCount}, Failed: ${result.failCount}`);
        console.log('='.repeat(50));

      } catch (error) {
        console.error('Error in scheduled attendance check:', error);
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
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const checkTime = process.env.ATTENDANCE_CHECK_TIME || '08:00';
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
      isRunning: this.tasks.length > 0
    };
  }
}

module.exports = Scheduler;
