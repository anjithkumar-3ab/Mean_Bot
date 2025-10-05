const TelegramBot = require('node-telegram-bot-api');
const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');

class AdminTelegramService {
  constructor() {
    this.botToken = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
    this.authorizedAdmins = process.env.ADMIN_TELEGRAM_CHAT_IDS ? 
      process.env.ADMIN_TELEGRAM_CHAT_IDS.split(',') : [];
    
    this.attendanceService = null; // Will be set by server
    this.userState = {}; // For storing user interaction states
    
    // Log admin configuration for debugging
    console.log('Admin Bot Configuration:');
    console.log(`Admin Bot Token: ${this.botToken ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`Authorized Admins: ${this.authorizedAdmins.length > 0 ? this.authorizedAdmins.join(', ') : 'None configured ❌'}`);
    
    if (this.botToken) {
      this.bot = new TelegramBot(this.botToken, { polling: true });
      this.setupCommands();
      console.log('✅ Admin Telegram Bot Service initialized with polling');
    } else {
      console.warn('⚠️  Admin Telegram Bot token not configured');
      console.log('💡 Set ADMIN_TELEGRAM_BOT_TOKEN in .env to enable Admin Telegram bot');
      this.bot = null;
    }
  }

  /**
   * Set the attendance service instance
   */
  setAttendanceService(attendanceService) {
    this.attendanceService = attendanceService;
  }

  /**
   * Check if a chat ID is authorized as admin
   */
  isAuthorizedAdmin(chatId) {
    const chatIdStr = chatId.toString();
    
    // Force refresh authorized admins from environment variable
    this.authorizedAdmins = process.env.ADMIN_TELEGRAM_CHAT_IDS ? 
      process.env.ADMIN_TELEGRAM_CHAT_IDS.split(',') : [];
    
    const isAuthorized = this.authorizedAdmins.includes(chatIdStr);
    console.log(`User ${chatIdStr} is in authorized list: ${isAuthorized ? 'YES ✅' : 'NO ❌'}`);
    
    return isAuthorized;
  }
  
  // No authentication methods needed - using only chat ID

  /**
   * Setup bot commands
   */
  setupCommands() {
    if (!this.bot) return;
    
    // We've removed password authentication - no need to handle text messages

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const chatIdStr = chatId.toString();
      
      // Check if user is in the authorized admins list
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }

      const welcomeMessage = `👋 *Welcome to Attendance Admin Bot!*

🔹 Your Chat ID: \`${chatId}\`

🔒 *Admin Access Granted*

📝 *Quick Start:*
Click the buttons below to access admin functions!

Use the menu to:
• View system stats
• Manage students
• Check attendance records
• Configure system settings

━━━━━━━━━━━━━━━━━━━━━
_Attendance Automation System_`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 System Stats', callback_data: 'admin_stats' },
            { text: '👥 Manage Students', callback_data: 'admin_students' }
          ],
          [
            { text: '📅 Attendance Records', callback_data: 'admin_attendance' },
            { text: '⚙️ System Settings', callback_data: 'admin_settings' }
          ],
          [
            { text: '🔄 Run Manual Check', callback_data: 'admin_manual_check' },
            { text: '❓ Help', callback_data: 'admin_help' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, welcomeMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      await this.sendAdminHelpMessage(chatId);
    });

    // Handle /stats command
    this.bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      await this.handleStatsCommand(chatId);
    });

    // Handle /students command
    this.bot.onText(/\/students/, async (msg) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      await this.handleStudentsCommand(chatId);
    });

    // Handle /findstudent command
    this.bot.onText(/\/findstudent (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      const query = match[1];
      await this.handleFindStudentCommand(chatId, query);
    });

    // Handle /check command
    this.bot.onText(/\/check (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      const studentId = match[1].toUpperCase();
      await this.handleCheckStudentCommand(chatId, studentId);
    });

    // Handle /manualcheck command
    this.bot.onText(/\/manualcheck/, async (msg) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      await this.handleManualCheckCommand(chatId);
    });

    // Handle /addadmin command
    this.bot.onText(/\/addadmin (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      const newAdminChatId = match[1].trim();
      await this.handleAddAdminCommand(chatId, newAdminChatId);
    });

    // Handle /schedulerstatus command
    this.bot.onText(/\/schedulerstatus/, async (msg) => {
      const chatId = msg.chat.id;
      
      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }
      
      await this.handleSchedulerStatusCommand(chatId);
    });

    // Handle callback queries (button clicks)
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      const messageId = query.message.message_id;

      // Check if user is authorized
      if (!this.isAuthorizedAdmin(chatId)) {
        await this.sendUnauthorizedMessage(chatId);
        return;
      }

      try {
        // Answer the callback query to remove loading state
        await this.bot.answerCallbackQuery(query.id);

        // Handle different button actions
        switch (data) {
          case 'admin_stats':
            await this.handleStatsCommand(chatId);
            break;
          
          case 'admin_students':
            await this.handleStudentsCommand(chatId);
            break;
          
          case 'admin_attendance':
            await this.handleAttendanceCommand(chatId);
            break;
          
          case 'admin_settings':
            await this.handleSettingsCommand(chatId);
            break;
          
          case 'admin_manual_check':
            await this.handleManualCheckCommand(chatId);
            break;
          
          case 'admin_help':
            await this.sendAdminHelpMessage(chatId);
            break;
          
          case 'admin_back_main':
            // Return to main menu
            await this.sendMainMenu(chatId);
            break;

          default:
            // Handle dynamic callbacks 
            if (data.startsWith('admin_student_')) {
              const studentId = data.replace('admin_student_', '');
              await this.handleStudentDetailCommand(chatId, studentId);
            } else if (data.startsWith('admin_toggle_')) {
              const studentId = data.replace('admin_toggle_', '');
              await this.handleToggleStudentStatusCommand(chatId, studentId);
            } else if (data.startsWith('admin_remove_')) {
              const studentId = data.replace('admin_remove_', '');
              await this.handleRemoveStudentCommand(chatId, studentId);
            } else if (data.startsWith('admin_check_')) {
              const studentId = data.replace('admin_check_', '');
              await this.handleCheckStudentCommand(chatId, studentId);
            } else if (data.startsWith('admin_attendance_page_')) {
              const page = parseInt(data.replace('admin_attendance_page_', ''));
              await this.handleAttendanceCommand(chatId, page);
            } else if (data.startsWith('admin_students_page_')) {
              const page = parseInt(data.replace('admin_students_page_', ''));
              await this.handleStudentsCommand(chatId, page);
            } else if (data.startsWith('admin_scheduler_')) {
              const action = data.replace('admin_scheduler_', '');
              
              if (action === 'change_time') {
                await this.handleSchedulerChangeTimeCommand(chatId);
              } else if (action === 'custom_time') {
                await this.handleCustomTimeInput(chatId);
              } else if (action.startsWith('set_time_')) {
                const timeValue = action.replace('set_time_', '');
                await this.handleSetSchedulerTime(chatId, timeValue);
              } else {
                await this.handleSchedulerActionCommand(chatId, action);
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error handling admin callback query:', error);
        await this.bot.sendMessage(chatId, 
          `❌ *Error*\n\nAn error occurred: ${error.message}`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    console.log('✅ Admin Telegram bot commands registered');
  }

  /**
   * Send unauthorized message to non-admin users
   */
  async sendUnauthorizedMessage(chatId) {
    await this.bot.sendMessage(chatId,
      `⛔ *Access Denied*\n\n` +
      `Your Chat ID (\`${chatId}\`) is not authorized to access the Admin Bot.\n\n` +
      `To gain access:\n` +
      `Have an administrator add your Chat ID to the authorized list\n\n` +
      `_This access attempt has been logged._`,
      { parse_mode: 'Markdown' }
    );
    
    // Log unauthorized access attempt
    console.warn(`⚠️ Unauthorized admin access attempt from Chat ID: ${chatId}`);
  }

  /**
   * Send main menu
   */
  async sendMainMenu(chatId) {
    const menuMessage = `🔐 *Admin Control Panel*\n\n` +
      `Select an option from the menu below:\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Attendance Automation System_`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 System Stats', callback_data: 'admin_stats' },
          { text: '👥 Manage Students', callback_data: 'admin_students' }
        ],
        [
          { text: '📅 Attendance Records', callback_data: 'admin_attendance' },
          { text: '⚙️ System Settings', callback_data: 'admin_settings' }
        ],
        [
          { text: '🔄 Run Manual Check', callback_data: 'admin_manual_check' },
          { text: '❓ Help', callback_data: 'admin_help' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, menuMessage, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Send admin help message
   */
  async sendAdminHelpMessage(chatId) {
    const helpMessage = `📖 *Admin Bot Help*

*Available Admin Commands:*

*📊 System Information:*
• \`/stats\` - Get system statistics
• \`/schedulerstatus\` - Check scheduler status

*👥 Student Management:*
• \`/students\` - List all students
• \`/findstudent <query>\` - Search for students
• \`/check <studentId>\` - Check student attendance

*🔄 System Operations:*
• \`/manualcheck\` - Run manual attendance check
• \`/addadmin <chatId>\` - Add new admin

*📚 General Commands:*
• \`/start\` - Show main menu
• \`/help\` - Show this help message

*⚙️ Interactive Menu:*
Use the buttons in the main menu to access all admin functions quickly and easily.

*🔐 Security:*
Only users with authorized Chat IDs can use this bot. Current admins: ${this.authorizedAdmins.length}

━━━━━━━━━━━━━━━━━━━━━
_Admin Telegram Bot v1.0_`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '◀️ Back to Main Menu', callback_data: 'admin_back_main' }]
      ]
    };

    await this.bot.sendMessage(chatId, helpMessage, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Handle stats command
   */
  async handleStatsCommand(chatId) {
    try {
      await this.bot.sendMessage(chatId, '⏳ *Fetching System Statistics...*', { parse_mode: 'Markdown' });

      // Get system statistics
      const totalStudents = await Student.countDocuments();
      const activeStudents = await Student.countDocuments({ isActive: true });
      const inactiveStudents = await Student.countDocuments({ isActive: false });
      const telegramEnabled = await Student.countDocuments({ 'notifications.telegram': true });
      
      // Get attendance statistics
      const totalAttendanceRecords = await AttendanceRecord.countDocuments();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRecords = await AttendanceRecord.countDocuments({ createdAt: { $gte: today } });
      
      // Get latest attendance check
      const latestRecord = await AttendanceRecord.findOne().sort({ createdAt: -1 });
      const latestCheckTime = latestRecord ? new Date(latestRecord.createdAt).toLocaleString() : 'No records';

      // Get average attendance
      const aggregateResult = await AttendanceRecord.aggregate([
        {
          $group: {
            _id: null,
            avgPercentage: { $avg: '$overallPercentage' }
          }
        }
      ]);
      
      const averageAttendance = aggregateResult.length > 0 
        ? aggregateResult[0].avgPercentage.toFixed(2) + '%'
        : 'No data';

      const statsMessage = `📊 *System Statistics*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 *Student Statistics:*\n` +
        `• Total Students: ${totalStudents}\n` +
        `• Active: ${activeStudents}\n` +
        `• Inactive: ${inactiveStudents}\n` +
        `• Telegram Enabled: ${telegramEnabled}\n\n` +
        
        `📅 *Attendance Statistics:*\n` +
        `• Total Records: ${totalAttendanceRecords}\n` +
        `• Today's Checks: ${todayRecords}\n` +
        `• Average Attendance: ${averageAttendance}\n` +
        `• Latest Check: ${latestCheckTime}\n\n` +
        
        `⚙️ *System Status:*\n` +
        `• Database: Connected\n` +
        `• Scheduler: ${this.attendanceService?.scheduler?.isRunning ? 'Active' : 'Inactive'}\n` +
        `• Telegram Bot: Active\n` +
        `• Admin Access: ${this.authorizedAdmins.length} users\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Generated: ${new Date().toLocaleString()}_`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Refresh', callback_data: 'admin_stats' },
            { text: '📊 Scheduler Status', callback_data: 'admin_scheduler_status' }
          ],
          [
            { text: '◀️ Back to Main Menu', callback_data: 'admin_back_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, statsMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting stats:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to retrieve system statistics: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle students command - list all students
   */
  async handleStudentsCommand(chatId, page = 1) {
    try {
      await this.bot.sendMessage(chatId, '⏳ *Loading Student List...*', { parse_mode: 'Markdown' });

      const PAGE_SIZE = 5;
      const skip = (page - 1) * PAGE_SIZE;
      
      // Get paginated student list
      const totalStudents = await Student.countDocuments();
      const totalPages = Math.ceil(totalStudents / PAGE_SIZE);
      
      const students = await Student.find()
        .sort({ studentId: 1 })
        .skip(skip)
        .limit(PAGE_SIZE);

      if (students.length === 0) {
        await this.bot.sendMessage(chatId,
          `❌ *No Students Found*\n\n` +
          `There are no students registered in the system.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      let message = `👥 *Student List (${page}/${totalPages})*\n\n`;
      message += `Total Students: ${totalStudents}\n\n`;
      
      students.forEach((student, index) => {
        const status = student.isActive ? '✅ Active' : '❌ Inactive';
        message += `${skip + index + 1}. *${student.studentId}*\n`;
        message += `   Name: ${student.name}\n`;
        message += `   Status: ${status}\n`;
        if (student.lastAttendanceCheck) {
          const lastCheck = new Date(student.lastAttendanceCheck).toLocaleDateString();
          message += `   Last Check: ${lastCheck}\n`;
        }
        message += `\n`;
      });

      // Create pagination buttons
      const paginationButtons = [];
      
      // Previous page button
      if (page > 1) {
        paginationButtons.push({ text: '◀️ Previous', callback_data: `admin_students_page_${page - 1}` });
      }
      
      // Page indicator
      paginationButtons.push({ text: `${page}/${totalPages}`, callback_data: 'admin_students' });
      
      // Next page button
      if (page < totalPages) {
        paginationButtons.push({ text: 'Next ▶️', callback_data: `admin_students_page_${page + 1}` });
      }

      // Create student action buttons for each student
      const studentButtons = students.map(student => [
        { text: `📊 ${student.studentId}`, callback_data: `admin_student_${student.studentId}` }
      ]);

      const keyboard = {
        inline_keyboard: [
          ...studentButtons,
          paginationButtons,
          [
            { text: '🔍 Find Student', callback_data: 'admin_find_student' },
            { text: '◀️ Back', callback_data: 'admin_back_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting students:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to retrieve student list: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle find student command - search for students
   */
  async handleFindStudentCommand(chatId, query) {
    try {
      await this.bot.sendMessage(chatId, `🔍 *Searching for "${query}"...*`, { parse_mode: 'Markdown' });

      // Create a case-insensitive regex for the search query
      const searchRegex = new RegExp(query, 'i');

      // Search for students matching the query in studentId or name
      const students = await Student.find({
        $or: [
          { studentId: searchRegex },
          { name: searchRegex }
        ]
      }).limit(10);

      if (students.length === 0) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '👥 View All Students', callback_data: 'admin_students' }],
            [{ text: '◀️ Back to Main Menu', callback_data: 'admin_back_main' }]
          ]
        };

        await this.bot.sendMessage(chatId,
          `❌ *No Matches Found*\n\n` +
          `No students found matching "${query}".\n\n` +
          `Try a different search term or view all students.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }
        );
        return;
      }

      let message = `🔍 *Search Results*\n\n`;
      message += `Found ${students.length} student(s) matching "${query}":\n\n`;
      
      students.forEach((student, index) => {
        const status = student.isActive ? '✅ Active' : '❌ Inactive';
        message += `${index + 1}. *${student.studentId}*\n`;
        message += `   Name: ${student.name}\n`;
        message += `   Status: ${status}\n`;
        if (student.lastAttendanceCheck) {
          const lastCheck = new Date(student.lastAttendanceCheck).toLocaleDateString();
          message += `   Last Check: ${lastCheck}\n`;
        }
        message += `\n`;
      });

      // Create buttons for each student
      const studentButtons = students.map(student => [
        { text: `📊 ${student.studentId}`, callback_data: `admin_student_${student.studentId}` }
      ]);

      const keyboard = {
        inline_keyboard: [
          ...studentButtons,
          [
            { text: '👥 View All Students', callback_data: 'admin_students' },
            { text: '◀️ Back', callback_data: 'admin_back_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error finding students:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to search for students: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle student detail command - show detailed info about a student
   */
  async handleStudentDetailCommand(chatId, studentId) {
    try {
      await this.bot.sendMessage(chatId, `⏳ *Loading Student Details...*`, { parse_mode: 'Markdown' });

      // Find the student
      const student = await Student.findOne({ studentId });

      if (!student) {
        await this.bot.sendMessage(chatId,
          `❌ *Student Not Found*\n\n` +
          `No student found with ID: ${studentId}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Get attendance records
      const attendanceRecords = await AttendanceRecord.find({ studentId })
        .sort({ createdAt: -1 })
        .limit(1);

      const latestAttendance = attendanceRecords.length > 0 ? attendanceRecords[0] : null;

      let message = `👤 *Student Details*\n\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Student ID: \`${student.studentId}\`\n`;
      message += `Name: ${student.name}\n`;
      message += `Status: ${student.isActive ? '✅ Active' : '❌ Inactive'}\n\n`;
      
      message += `*Notifications:*\n`;
      message += `• Telegram: ${student.notifications?.telegram ? '✅ Enabled' : '❌ Disabled'}\n`;
      if (student.telegramChatIds && student.telegramChatIds.length > 0) {
        message += `• Telegram Chat IDs: ${student.telegramChatIds.length}\n`;
      }
      
      message += `\n*Latest Attendance:*\n`;
      if (latestAttendance) {
        const date = new Date(latestAttendance.createdAt).toLocaleDateString();
        const percentage = latestAttendance.overallPercentage?.toFixed(2) + '%' || 'N/A';
        message += `• Date: ${date}\n`;
        message += `• Overall: ${percentage}\n`;
      } else {
        message += `• No attendance records found\n`;
      }
      
      if (student.lastAttendanceCheck) {
        message += `• Last Check: ${new Date(student.lastAttendanceCheck).toLocaleDateString()}\n`;
      }
      
      message += `━━━━━━━━━━━━━━━━━━━━━\n`;

      const keyboard = {
        inline_keyboard: [
          [
            { 
              text: student.isActive ? '❌ Deactivate' : '✅ Activate', 
              callback_data: `admin_toggle_${student.studentId}` 
            },
            { text: '🔄 Check Attendance', callback_data: `admin_check_${student.studentId}` }
          ],
          [
            { text: '🗑️ Remove Student', callback_data: `admin_remove_${student.studentId}` },
            { text: '◀️ Back to List', callback_data: 'admin_students' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting student details:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to retrieve student details: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle toggle student status command - activate/deactivate student
   */
  async handleToggleStudentStatusCommand(chatId, studentId) {
    try {
      await this.bot.sendMessage(chatId, `⏳ *Updating Student Status...*`, { parse_mode: 'Markdown' });

      // Find the student
      const student = await Student.findOne({ studentId });

      if (!student) {
        await this.bot.sendMessage(chatId,
          `❌ *Student Not Found*\n\n` +
          `No student found with ID: ${studentId}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Toggle status
      student.isActive = !student.isActive;
      await student.save();

      const statusMessage = student.isActive ?
        `✅ *Student Activated*\n\n` +
        `Student ${studentId} has been activated. They will now receive attendance notifications.` :
        `❌ *Student Deactivated*\n\n` +
        `Student ${studentId} has been deactivated. They will no longer receive attendance notifications.`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👤 View Details', callback_data: `admin_student_${studentId}` },
            { text: '◀️ Back to List', callback_data: 'admin_students' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, statusMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error toggling student status:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to update student status: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle remove student command
   */
  async handleRemoveStudentCommand(chatId, studentId) {
    try {
      await this.bot.sendMessage(chatId, `⏳ *Removing Student...*`, { parse_mode: 'Markdown' });

      // Find the student
      const student = await Student.findOne({ studentId });

      if (!student) {
        await this.bot.sendMessage(chatId,
          `❌ *Student Not Found*\n\n` +
          `No student found with ID: ${studentId}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Delete student
      await Student.deleteOne({ studentId });

      const message = `✅ *Student Removed*\n\n` +
        `Student ${studentId} (${student.name}) has been permanently removed from the system.\n\n` +
        `This action cannot be undone.`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👥 Back to Student List', callback_data: 'admin_students' },
            { text: '🏠 Main Menu', callback_data: 'admin_back_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error removing student:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to remove student: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle check student command - check attendance for a specific student
   */
  async handleCheckStudentCommand(chatId, studentId) {
    try {
      await this.bot.sendMessage(chatId, `⏳ *Checking Attendance for ${studentId}...*`, { parse_mode: 'Markdown' });

      // Find the student
      const student = await Student.findOne({ studentId });

      if (!student) {
        await this.bot.sendMessage(chatId,
          `❌ *Student Not Found*\n\n` +
          `No student found with ID: ${studentId}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      if (!student.isActive) {
        await this.bot.sendMessage(chatId,
          `⚠️ *Inactive Student*\n\n` +
          `Student ${studentId} is currently inactive. Would you like to activate them first?`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Activate & Check', callback_data: `admin_toggle_${studentId}` },
                  { text: '❌ Cancel', callback_data: `admin_student_${studentId}` }
                ]
              ]
            }
          }
        );
        return;
      }

      // Check if attendanceService is available
      if (!this.attendanceService) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nAttendance service is not available. Please try again later.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Check attendance
      const result = await this.attendanceService.checkStudentAttendance(studentId);

      if (!result.success) {
        await this.bot.sendMessage(chatId, 
          `❌ *Error Checking Attendance*\n\n${result.error || 'An error occurred while fetching attendance data.'}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Get the latest attendance record
      const latestRecord = await AttendanceRecord.findOne({ studentId })
        .sort({ createdAt: -1 });

      if (!latestRecord) {
        await this.bot.sendMessage(chatId,
          `⚠️ *No Attendance Record*\n\n` +
          `The attendance check completed but no record was saved.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Format attendance data
      const currentDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Status emoji
      const statusEmoji = latestRecord.overallPercentage >= 75 ? '✅' : 
                         latestRecord.overallPercentage >= 70 ? '⚠️' : '❌';

      let subjectsText = '';
      if (latestRecord.subjects && latestRecord.subjects.length > 0) {
        subjectsText = `\n\n*Subject Details:*\n`;
        latestRecord.subjects.forEach(subject => {
          const subjectEmoji = subject.percentage >= 75 ? '✅' : 
                              subject.percentage >= 70 ? '⚠️' : '❌';
          subjectsText += `${subjectEmoji} ${subject.subjectName || 'Unknown'}: ${subject.percentage}% (${subject.attendedClasses}/${subject.totalClasses})\n`;
        });
      }

      const message = `📊 *ATTENDANCE REPORT*
${currentDate}

Student: *${student.name}* (${student.studentId})

━━━━━━━━━━━━━━━━━━━━━
📈 *OVERALL ATTENDANCE*
${statusEmoji} *${latestRecord.overallPercentage.toFixed(2)}%*

Attended: ${latestRecord.totalAttended} classes
Total: ${latestRecord.totalClasses} classes
━━━━━━━━━━━━━━━━━━━━━

_Admin Report by Attendance Automation System_`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '👤 Student Details', callback_data: `admin_student_${studentId}` },
            { text: '👥 All Students', callback_data: 'admin_students' }
          ],
          [{ text: '◀️ Back to Main Menu', callback_data: 'admin_back_main' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log(`✅ Admin checked attendance for ${studentId}`);

    } catch (error) {
      console.error('Error checking student attendance:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nAn unexpected error occurred: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle attendance command - list recent attendance records
   */
  async handleAttendanceCommand(chatId, page = 1) {
    try {
      await this.bot.sendMessage(chatId, '⏳ *Loading Attendance Records...*', { parse_mode: 'Markdown' });

      const PAGE_SIZE = 5;
      const skip = (page - 1) * PAGE_SIZE;
      
      // Get paginated attendance records
      const totalRecords = await AttendanceRecord.countDocuments();
      const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
      
      const records = await AttendanceRecord.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate('student', 'name');

      if (records.length === 0) {
        await this.bot.sendMessage(chatId,
          `❌ *No Attendance Records Found*\n\n` +
          `There are no attendance records in the system.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      let message = `📅 *Recent Attendance Records (${page}/${totalPages})*\n\n`;
      message += `Total Records: ${totalRecords}\n\n`;
      
      for (const record of records) {
        const student = await Student.findOne({ studentId: record.studentId });
        const studentName = student ? student.name : 'Unknown';
        const date = new Date(record.createdAt).toLocaleDateString();
        const time = new Date(record.createdAt).toLocaleTimeString();
        const percentage = record.overallPercentage?.toFixed(2) + '%' || 'N/A';
        
        const statusEmoji = record.overallPercentage >= 75 ? '✅' : 
                           record.overallPercentage >= 70 ? '⚠️' : '❌';
        
        message += `${statusEmoji} *${record.studentId}*\n`;
        message += `   Name: ${studentName}\n`;
        message += `   Date: ${date} ${time}\n`;
        message += `   Attendance: ${percentage}\n`;
        message += `   Classes: ${record.totalAttended}/${record.totalClasses}\n`;
        message += `\n`;
      }

      // Create pagination buttons
      const paginationButtons = [];
      
      // Previous page button
      if (page > 1) {
        paginationButtons.push({ text: '◀️ Previous', callback_data: `admin_attendance_page_${page - 1}` });
      }
      
      // Page indicator
      paginationButtons.push({ text: `${page}/${totalPages}`, callback_data: 'admin_attendance' });
      
      // Next page button
      if (page < totalPages) {
        paginationButtons.push({ text: 'Next ▶️', callback_data: `admin_attendance_page_${page + 1}` });
      }

      const keyboard = {
        inline_keyboard: [
          paginationButtons,
          [
            { text: '🔄 Refresh', callback_data: `admin_attendance_page_${page}` },
            { text: '◀️ Back', callback_data: 'admin_back_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting attendance records:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to retrieve attendance records: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle settings command - system settings
   */
  async handleSettingsCommand(chatId) {
    try {
      // Get scheduler status
      const schedulerStatus = this.attendanceService?.scheduler ? 
        this.attendanceService.scheduler.getStatus() : 
        { running: false, nextRun: null, checkTime: 'Not Set' };
      
      const isSchedulerRunning = schedulerStatus.running || false;
      const nextRun = schedulerStatus.nextRun ? 
        new Date(schedulerStatus.nextRun).toLocaleString() : 
        'Not Scheduled';
      
      const checkTime = schedulerStatus.checkTime || 
        process.env.ATTENDANCE_CHECK_TIME || 
        'Not Set';

      const message = `⚙️ *System Settings*\n\n` +
        `*Scheduler Settings:*\n` +
        `• Status: ${isSchedulerRunning ? '✅ Running' : '❌ Stopped'}\n` +
        `• Check Time: *${checkTime}* _(Daily)_\n` +
        `• Next Run: ${nextRun}\n\n` +
        
        `*Admin Access:*\n` +
        `• Authorized Admins: ${this.authorizedAdmins.length}\n` +
        `• Your Chat ID: ${chatId}\n\n` +
        
        `*Environment:*\n` +
        `• Node Environment: ${process.env.NODE_ENV || 'development'}\n` +
        `• Mock Mode: ${process.env.USE_MOCK_DATA === 'true' ? 'Enabled' : 'Disabled'}\n` +
        `• Database: Connected\n` +
        `━━━━━━━━━━━━━━━━━━━━━`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 Scheduler Status', callback_data: 'admin_scheduler_status' }
          ],
          [
            { 
              text: isSchedulerRunning ? '⏹️ Stop Scheduler' : '▶️ Start Scheduler', 
              callback_data: isSchedulerRunning ? 'admin_scheduler_stop' : 'admin_scheduler_start' 
            },
            { text: '⏰ Change Check Time', callback_data: 'admin_scheduler_change_time' }
          ],
          [
            { text: '➕ Add Admin', callback_data: 'admin_add_admin' },
            { text: '📋 View Admins', callback_data: 'admin_view_admins' }
          ],
          [{ text: '◀️ Back to Main Menu', callback_data: 'admin_back_main' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting settings:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to retrieve system settings: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle manual check command - run manual attendance check for all students
   */
  async handleManualCheckCommand(chatId) {
    try {
      await this.bot.sendMessage(chatId, 
        `⏳ *Initializing Manual Check*\n\n` +
        `Starting attendance check for all active students...\n\n` +
        `This may take a few minutes. You'll receive a notification when complete.`,
        { parse_mode: 'Markdown' }
      );

      // Check if attendanceService is available
      if (!this.attendanceService) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nAttendance service is not available. Please try again later.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Run attendance check for all students
      const result = await this.attendanceService.checkAllStudentsAttendance();

      const successMessage = `✅ *Manual Check Complete*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Results:\n` +
        `• Total Students: ${result.total}\n` +
        `• Successful: ${result.successCount}\n` +
        `• Failed: ${result.failCount}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `Use the buttons below to view details.`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 View Stats', callback_data: 'admin_stats' },
            { text: '📅 View Records', callback_data: 'admin_attendance' }
          ],
          [{ text: '◀️ Back to Main Menu', callback_data: 'admin_back_main' }]
        ]
      };

      await this.bot.sendMessage(chatId, successMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log(`✅ Admin triggered manual attendance check`);

    } catch (error) {
      console.error('Error running manual check:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to run manual attendance check: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle add admin command
   */
  async handleAddAdminCommand(chatId, newAdminChatId) {
    try {
      // Validate the chat ID
      if (!newAdminChatId || !/^\d+$/.test(newAdminChatId)) {
        await this.bot.sendMessage(chatId,
          `❌ *Invalid Chat ID*\n\n` +
          `"${newAdminChatId}" is not a valid Telegram Chat ID.\n\n` +
          `Chat IDs should be numeric. Example: 123456789`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Check if already an admin
      if (this.authorizedAdmins.includes(newAdminChatId)) {
        await this.bot.sendMessage(chatId,
          `ℹ️ *Already Admin*\n\n` +
          `Chat ID ${newAdminChatId} is already authorized as an admin.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Add to authorized admins list
      this.authorizedAdmins.push(newAdminChatId);

      // Send success message
      await this.bot.sendMessage(chatId,
        `✅ *Admin Added*\n\n` +
        `Chat ID ${newAdminChatId} has been added as an administrator.\n\n` +
        `Total Admins: ${this.authorizedAdmins.length}\n\n` +
        `Note: This change is temporary and will be lost on server restart unless you update your .env file with the new ADMIN_TELEGRAM_CHAT_IDS value.`,
        { parse_mode: 'Markdown' }
      );

      // Try to notify the new admin
      try {
        await this.bot.sendMessage(newAdminChatId,
          `🎉 *Admin Access Granted*\n\n` +
          `You have been granted administrator access to the Attendance Admin Bot!\n\n` +
          `Send /start to begin using your admin powers.`,
          { parse_mode: 'Markdown' }
        );
      } catch (notifyError) {
        console.log(`Could not notify new admin: ${notifyError.message}`);
        // This is expected if the bot hasn't been started by the user yet
      }

    } catch (error) {
      console.error('Error adding admin:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to add admin: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle scheduler status command
   */
  async handleSchedulerStatusCommand(chatId) {
    try {
      // Get scheduler status
      const schedulerStatus = this.attendanceService?.scheduler ? 
        this.attendanceService.scheduler.getStatus() : 
        { running: false, nextRun: null, checkTime: 'Not Set' };
      
      const isSchedulerRunning = schedulerStatus.running || false;
      const nextRun = schedulerStatus.nextRun ? 
        new Date(schedulerStatus.nextRun).toLocaleString() : 
        'Not Scheduled';
      
      const checkTime = schedulerStatus.checkTime || 
        process.env.ATTENDANCE_CHECK_TIME || 
        'Not Set';

      const message = `⏰ *Scheduler Status*\n\n` +
        `Status: ${isSchedulerRunning ? '✅ Running' : '❌ Stopped'}\n` +
        `Check Time: *${checkTime}* _(Daily)_\n` +
        `Next Run: ${nextRun}\n\n` +
        `Last Attendance Check: ${schedulerStatus.lastRun ? new Date(schedulerStatus.lastRun).toLocaleString() : 'Never'}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `${isSchedulerRunning ? 
          'The scheduler is active and will check attendance automatically at the configured time.' : 
          'The scheduler is currently stopped. No automatic attendance checks will be performed.'}\n\n` +
        `Use the buttons below to control the scheduler.`;

      const keyboard = {
        inline_keyboard: [
          [
            { 
              text: isSchedulerRunning ? '⏹️ Stop Scheduler' : '▶️ Start Scheduler', 
              callback_data: isSchedulerRunning ? 'admin_scheduler_stop' : 'admin_scheduler_start' 
            }
          ],
          [
            { text: '⏰ Change Check Time', callback_data: 'admin_scheduler_change_time' }
          ],
          [
            { text: '🔄 Manual Check Now', callback_data: 'admin_manual_check' },
            { text: '◀️ Back', callback_data: 'admin_back_main' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting scheduler status:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to retrieve scheduler status: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle scheduler action command - start/stop
   */
  async handleSchedulerActionCommand(chatId, action) {
    try {
      if (!this.attendanceService?.scheduler) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nScheduler service is not available.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      let message = '';

      if (action === 'start') {
        // Start the scheduler
        this.attendanceService.scheduler.startDailyAttendanceCheck();
        message = `✅ *Scheduler Started*\n\n` +
          `The attendance check scheduler has been started.\n\n` +
          `Next Run: ${
            this.attendanceService.scheduler.getStatus().nextRun ? 
            new Date(this.attendanceService.scheduler.getStatus().nextRun).toLocaleString() : 
            'Calculating...'
          }`;
      } else if (action === 'stop') {
        // Stop the scheduler
        this.attendanceService.scheduler.stopAll();
        message = `⏹️ *Scheduler Stopped*\n\n` +
          `The attendance check scheduler has been stopped.\n\n` +
          `No automatic attendance checks will be performed until the scheduler is started again.`;
      } else if (action === 'status') {
        await this.handleSchedulerStatusCommand(chatId);
        return;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 View Status', callback_data: 'admin_scheduler_status' },
            { text: '◀️ Back', callback_data: 'admin_settings' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error handling scheduler action:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to perform scheduler action: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle scheduler time change command
   */
  async handleSchedulerChangeTimeCommand(chatId) {
    try {
      if (!this.attendanceService?.scheduler) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nScheduler service is not available.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const currentTime = this.attendanceService.scheduler.currentCheckTime || 
        process.env.ATTENDANCE_CHECK_TIME || '07:00';

      // Create preset time buttons for common check times
      const presetTimes = [
        ['06:00', '07:00', '08:00'],
        ['09:00', '10:00', '12:00'],
        ['14:00', '16:00', '18:00']
      ];

      const timeButtons = presetTimes.map(row => 
        row.map(time => ({
          text: time,
          callback_data: `admin_scheduler_set_time_${time}`
        }))
      );

      // Add custom time button
      const keyboard = {
        inline_keyboard: [
          ...timeButtons,
          [{ 
            text: '⌨️ Custom Time',
            callback_data: 'admin_scheduler_custom_time' 
          }],
          [{ 
            text: '◀️ Back',
            callback_data: 'admin_scheduler_status' 
          }]
        ]
      };

      // Ask user to select or enter a time
      await this.bot.sendMessage(chatId, 
        `⏰ *Change Scheduler Time*\n\n` +
        `Current check time is set to: *${currentTime}*\n\n` +
        `Select a preset time or choose "Custom Time" to enter a specific time.`,
        { 
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      );

      // We'll handle the custom time input in the callback query handler

    } catch (error) {
      console.error('Error handling scheduler time change:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to change scheduler time: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle custom time input for scheduler
   */
  async handleCustomTimeInput(chatId) {
    try {
      if (!this.attendanceService?.scheduler) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nScheduler service is not available.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const currentTime = this.attendanceService.scheduler.currentCheckTime || 
        process.env.ATTENDANCE_CHECK_TIME || '07:00';

      // Ask user for new time
      await this.bot.sendMessage(chatId, 
        `⏰ *Enter Custom Check Time*\n\n` +
        `Current check time is set to: *${currentTime}*\n\n` +
        `Please enter the new time in 24-hour format (HH:MM).\n` +
        `Examples: 07:00, 14:30, 23:45\n\n` +
        `_Reply to this message with the new time._`,
        { parse_mode: 'Markdown' }
      );

      // Store in active command state that we're waiting for time input
      this.userState = this.userState || {};
      this.userState[chatId] = {
        waitingFor: 'scheduler_time',
        currentCommand: 'change_scheduler_time'
      };

      // Register one-time message handler for the next message from this user
      const onTimeResponse = async (msg) => {
        const responseChatId = msg.chat.id;
        
        // Only process if it's from the same user and we're waiting for scheduler time
        if (responseChatId !== chatId || 
            !this.userState[chatId] || 
            this.userState[chatId].waitingFor !== 'scheduler_time') {
          return;
        }

        // Remove the listener after processing
        this.bot.removeListener('message', onTimeResponse);
        
        // Reset user state
        delete this.userState[chatId];
        
        const timeInput = msg.text.trim();
        
        try {
          await this.handleSetSchedulerTime(chatId, timeInput);
        } catch (error) {
          await this.bot.sendMessage(chatId, 
            `❌ *Error*\n\nFailed to update scheduler time: ${error.message}\n\n` +
            `Please try again with a valid time format (HH:MM).`,
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '⏰ Try Again', callback_data: 'admin_scheduler_custom_time' },
                    { text: '◀️ Back', callback_data: 'admin_scheduler_change_time' }
                  ]
                ]
              }
            }
          );
        }
      };

      // Add listener for the time response
      this.bot.on('message', onTimeResponse);
    } catch (error) {
      console.error('Error handling custom time input:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to process custom time: ${error.message}`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Set scheduler time with validation
   */
  async handleSetSchedulerTime(chatId, timeInput) {
    try {
      if (!this.attendanceService?.scheduler) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nScheduler service is not available.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Validate time format using regex for HH:MM in 24-hour format
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeInput)) {
        throw new Error('Invalid time format. Please use HH:MM format (e.g., 07:00)');
      }
      
      // Update scheduler time
      const result = this.attendanceService.scheduler.updateScheduleTime(timeInput);
      
      await this.bot.sendMessage(chatId, 
        `✅ *Scheduler Time Updated*\n\n` +
        `The attendance check time has been set to: *${timeInput}*\n\n` +
        `Next scheduled check: ${new Date(result.nextRun).toLocaleString()}\n\n` +
        `The scheduler will automatically check attendance daily at ${timeInput}.`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📊 View Scheduler Status', callback_data: 'admin_scheduler_status' },
                { text: '⏰ Change Time Again', callback_data: 'admin_scheduler_change_time' }
              ],
              [
                { text: '◀️ Back to Settings', callback_data: 'admin_settings' }
              ]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Error setting scheduler time:', error);
      throw error; // Rethrow for the calling function to handle
    }
  }

  /**
   * Send simple Telegram message to admin
   */
  async sendAdminMessage(message) {
    try {
      if (!this.bot) {
        throw new Error('Admin Telegram Bot not configured');
      }

      // Send to all admins
      const sendPromises = this.authorizedAdmins.map(adminChatId => 
        this.bot.sendMessage(adminChatId, message, { parse_mode: 'Markdown' })
      );

      await Promise.all(sendPromises);
      
      return {
        success: true,
        message: 'Notifications sent to all admins'
      };

    } catch (error) {
      console.error('Error sending admin message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send system notification to all admins
   */
  async sendSystemNotification(title, message) {
    try {
      if (!this.bot) {
        throw new Error('Admin Telegram Bot not configured');
      }

      const notificationMessage = `🔔 *${title}*\n\n${message}\n\n_${new Date().toLocaleString()}_`;

      // Send to all admins
      const sendPromises = this.authorizedAdmins.map(adminChatId => 
        this.bot.sendMessage(adminChatId, notificationMessage, { parse_mode: 'Markdown' })
      );

      await Promise.all(sendPromises);
      
      return {
        success: true,
        message: 'Notifications sent to all admins'
      };

    } catch (error) {
      console.error('Error sending system notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if Admin Telegram service is available
   */
  isAvailable() {
    return this.bot !== null;
  }
}

module.exports = AdminTelegramService;