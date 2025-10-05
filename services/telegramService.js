const TelegramBot = require('node-telegram-bot-api');
const { getSubjectName } = require('../utils/subjectNameMapper');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.attendanceService = null; // Will be set by server
    this.registrationSessions = new Map(); // Store user registration sessions
    this.passwordChangeSessions = new Map(); // Store password change sessions
    
    if (this.botToken) {
      this.bot = new TelegramBot(this.botToken, { polling: true });
      this.setupCommands();
      console.log('✅ Telegram Bot Service initialized with polling');
    } else {
      console.warn('⚠️  Telegram Bot token not configured');
      console.log('💡 Set TELEGRAM_BOT_TOKEN in .env to enable Telegram notifications');
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
   * Setup bot commands
   */
  setupCommands() {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `👋 *Welcome to Attendance Automation Bot!*

🔹 Your Chat ID: \`${chatId}\`

📝 *Quick Start:*
Click the buttons below to get started!

Use the menu to:
• Register your account
• Check your attendance
• View registered accounts
• Get help

━━━━━━━━━━━━━━━━━━━━━
_Attendance Automation System_`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📝 Register Account', callback_data: 'register' },
            { text: '📊 Check Attendance', callback_data: 'check' }
          ],
          [
            { text: '👥 My Accounts', callback_data: 'myaccounts' },
            { text: '🔐 Change Password', callback_data: 'changepassword' }
          ],
          [
            { text: '❓ Help', callback_data: 'help' }
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
      await this.sendHelpMessage(chatId);
    });

    // Handle /register command - Interactive registration
    this.bot.onText(/\/register/, async (msg) => {
      const chatId = msg.chat.id;
      await this.startRegistration(chatId);
    });

    // Handle callback queries (button clicks)
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      const messageId = query.message.message_id;

      try {
        // Answer the callback query to remove loading state
        await this.bot.answerCallbackQuery(query.id);

        // Handle different button actions
        switch (data) {
          case 'register':
            await this.startRegistration(chatId);
            break;
          
          case 'check':
            await this.handleCheckCommand(chatId);
            break;
          
          case 'myaccounts':
            await this.handleMyAccountsCommand(chatId);
            break;
          
          case 'help':
            await this.sendHelpMessage(chatId);
            break;
          
          case 'changepassword':
            await this.handleChangePasswordCommand(chatId);
            break;
          
          case 'cancel_registration':
            this.registrationSessions.delete(chatId);
            await this.bot.sendMessage(chatId, 
              `❌ *Registration Cancelled*\n\nYou can start again anytime!`,
              { 
                parse_mode: 'Markdown',
                reply_markup: this.getMainMenuKeyboard()
              }
            );
            break;

          case 'cancel_password_change':
            this.passwordChangeSessions.delete(chatId);
            await this.bot.sendMessage(chatId, 
              `❌ *Password Change Cancelled*\n\nYour password remains unchanged.`,
              { 
                parse_mode: 'Markdown',
                reply_markup: this.getMainMenuKeyboard()
              }
            );
            break;

          default:
            // Handle dynamic callbacks like checkid_STUDENTID
            if (data.startsWith('checkid_')) {
              const studentId = data.replace('checkid_', '');
              await this.handleCheckIdCommand(chatId, studentId);
            } else if (data.startsWith('changepass_')) {
              const studentId = data.replace('changepass_', '');
              await this.startPasswordChange(chatId, studentId);
            }
            break;
        }
      } catch (error) {
        console.error('Error handling callback query:', error);
        await this.bot.sendMessage(chatId, 
          `❌ *Error*\n\nAn error occurred: ${error.message}`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // Handle text messages for step-by-step registration and password change
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      // Skip if message is a command
      if (!text || text.startsWith('/')) {
        return;
      }

      // Check if user is in registration session
      if (this.registrationSessions.has(chatId)) {
        await this.handleRegistrationStep(chatId, text);
        return;
      }

      // Check if user is in password change session
      if (this.passwordChangeSessions.has(chatId)) {
        await this.handlePasswordChangeStep(chatId, text);
        return;
      }
    });

    // Handle /reg command - Actual registration (Quick method for advanced users)
    this.bot.onText(/\/reg\s+(\S+)\s+(\S+)(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const studentId = match[1].toUpperCase();
      const password = match[2];
      const name = match[3] || studentId;

      try {
        await this.bot.sendMessage(chatId, '⏳ Registering your account... Please wait.', { parse_mode: 'Markdown' });

        await this.performRegistration(chatId, { studentId, password, name });

      } catch (error) {
        console.error('Error during quick registration:', error);
        await this.bot.sendMessage(chatId, 
          `❌ *Registration Failed*\n\n${error.message}\n\n` +
          `Please try the step-by-step method with /register or contact support.`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // Handle /myaccounts command - Show all registered accounts
    this.bot.onText(/\/myaccounts/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleMyAccountsCommand(chatId);
    });

    // Handle /check command
    this.bot.onText(/\/check/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleCheckCommand(chatId);
    });

    // Handle /changepass command
    this.bot.onText(/\/changepass/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleChangePasswordCommand(chatId);
    });

    // Handle /checkid command - Check specific student ID
    this.bot.onText(/\/checkid\s+(\S+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const studentId = match[1].toUpperCase();
      
      try {
        await this.bot.sendMessage(chatId, `⏳ Checking attendance for ${studentId}... Please wait.`, { parse_mode: 'Markdown' });

        const Student = require('../models/Student');
        
        // Find student and verify this chat ID has access
        const student = await Student.findOne({ 
          studentId,
          telegramChatIds: chatId.toString() 
        });

        if (!student) {
          await this.bot.sendMessage(chatId, 
            `❌ *Access Denied*\n\nStudent ID \`${studentId}\` is not linked to your Telegram account.\n\n` +
            `Use /myaccounts to see your registered accounts.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        if (!student.isActive) {
          await this.bot.sendMessage(chatId, 
            `❌ *Account Inactive*\n\nStudent account ${studentId} is currently inactive.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        if (!this.attendanceService) {
          await this.bot.sendMessage(chatId, 
            '❌ *Service Unavailable*\n\nAttendance service is not available. Please try again later.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Fetch attendance
        const result = await this.attendanceService.checkStudentAttendance(student.studentId);

        if (!result.success) {
          await this.bot.sendMessage(chatId, 
            `❌ *Error Checking Attendance*\n\n${result.error || 'An error occurred while fetching attendance data.'}`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        console.log(`✅ Attendance checked via /checkid command for ${student.studentId}`);

      } catch (error) {
        console.error('Error handling /checkid command:', error);
        await this.bot.sendMessage(chatId, 
          `❌ *Error*\n\nAn unexpected error occurred: ${error.message}`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    console.log('✅ Telegram bot commands registered');
  }

  /**
   * Perform student registration
   */
  async performRegistration(chatId, data) {
    try {
      const Student = require('../models/Student');
      const { encryptPassword } = require('../utils/encryption');

      const { studentId, password, name } = data;

      // Check if student already exists
      let student = await Student.findOne({ studentId });

      if (student) {
        // Student exists - add this chat ID if not already added
        if (!student.telegramChatIds) {
          student.telegramChatIds = [];
        }
        
        if (student.telegramChatIds.includes(chatId.toString())) {
          await this.bot.sendMessage(chatId, 
            `ℹ️ *Already Registered*\n\n` +
            `This student ID (\`${studentId}\`) is already linked to your Telegram account.\n\n` +
            `Use /check to view attendance or /myaccounts to see all your accounts.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Add this chat ID to the student's list
        student.telegramChatIds.push(chatId.toString());
        student.telegramChatId = chatId.toString(); // Update legacy field
        await student.save();

        await this.bot.sendMessage(chatId, 
          `✅ *Account Linked Successfully!*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 Student ID: \`${studentId}\`\n` +
          `📝 Name: ${student.name}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `This account has been added to your Telegram!\n\n` +
          `*What's next?*\n` +
          `• Use /check to view attendance\n` +
          `• Use /myaccounts to see all your accounts`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Create new student
        const encryptedPassword = encryptPassword(password);
        
        student = await Student.create({
          studentId,
          name,
          encryptedPassword,
          telegramChatIds: [chatId.toString()],
          telegramChatId: chatId.toString(),
          telegramUsername: '', // Will be updated if available
          notifications: { telegram: true },
          isActive: true
        });

        await this.bot.sendMessage(chatId, 
          `🎉 *Registration Successful!*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 Student ID: \`${studentId}\`\n` +
          `📝 Name: ${name}\n` +
          `🔔 Notifications: Enabled\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Your account is now registered and active!\n\n` +
          `*What's next?*\n` +
          `• Use /check to view your attendance\n` +
          `• Use /help to see all commands\n` +
          `• You'll receive daily attendance reports automatically`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  }

  /**
   * Send attendance report via Telegram
   */
  async sendAttendanceReport(chatId, studentName, attendanceData) {
    try {
      if (!this.bot) {
        throw new Error('Telegram Bot not configured');
      }

      // Create message content
      const currentDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Status emoji
      const statusEmoji = attendanceData.overallPercentage >= 75 ? '✅' : 
                         attendanceData.overallPercentage >= 70 ? '⚠️' : '❌';

      // Calculate how many classes needed to reach 75%
      let suggestion = '';
      const currentPercentage = parseFloat(attendanceData.overallPercentage);
      
      if (currentPercentage < 75) {
        // Calculate classes needed to reach 75%
        const currentAttended = attendanceData.totalAttended;
        const currentTotal = attendanceData.totalClasses;
        
        // We need: (currentAttended + x) / (currentTotal + x) >= 0.75
        // Solving: currentAttended + x >= 0.75 * (currentTotal + x)
        // currentAttended + x >= 0.75 * currentTotal + 0.75x
        // x - 0.75x >= 0.75 * currentTotal - currentAttended
        // 0.25x >= 0.75 * currentTotal - currentAttended
        // x >= (0.75 * currentTotal - currentAttended) / 0.25
        
        const classesNeeded = Math.ceil((0.75 * currentTotal - currentAttended) / 0.25);
        
        if (classesNeeded > 0) {
          suggestion = `\n\n💡 *SUGGESTION:*\nAttend next *${classesNeeded} classes continuously* to reach 75%`;
        } else {
          suggestion = `\n\n✅ You're already above 75%! Keep attending classes.`;
        }
      } else {
        // Calculate how many classes can be missed while staying above 75%
        const currentAttended = attendanceData.totalAttended;
        const currentTotal = attendanceData.totalClasses;
        
        // We need: currentAttended / (currentTotal + x) >= 0.75
        // Solving: currentAttended >= 0.75 * (currentTotal + x)
        // currentAttended >= 0.75 * currentTotal + 0.75x
        // currentAttended - 0.75 * currentTotal >= 0.75x
        // x <= (currentAttended - 0.75 * currentTotal) / 0.75
        
        const canMiss = Math.floor((currentAttended - 0.75 * currentTotal) / 0.75);
        
        if (canMiss > 0) {
          suggestion = `\n\n💡 *SUGGESTION:*\nYou can miss up to *${canMiss} classes* and still stay above 75%`;
        } else {
          suggestion = `\n\n⚠️ You're just above 75%. Don't miss any classes!`;
        }
      }

      const message = `📊 *ATTENDANCE REPORT*
${currentDate}

Hello *${studentName || 'Student'}*! 👋

━━━━━━━━━━━━━━━━━━━━━
📈 *OVERALL ATTENDANCE*
${statusEmoji} *${currentPercentage.toFixed(2)}%*

Attended: ${attendanceData.totalAttended} classes
Total: ${attendanceData.totalClasses} classes
━━━━━━━━━━━━━━━━━━━━━
${suggestion}

━━━━━━━━━━━━━━━━━━━━━
_Attendance Automation System_`;

      // Create keyboard with quick actions
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Refresh Attendance', callback_data: 'check' },
            { text: '👥 My Accounts', callback_data: 'myaccounts' }
          ],
          [
            { text: '🏠 Main Menu', callback_data: 'help' }
          ]
        ]
      };

      // Send message with Markdown formatting and keyboard
      const result = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log(`✅ Telegram message sent to chat ID: ${chatId}`);
      
      return {
        success: true,
        messageId: result.message_id,
        service: 'telegram'
      };

    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send simple Telegram message
   */
  async sendMessage(chatId, message) {
    try {
      if (!this.bot) {
        throw new Error('Telegram Bot not configured');
      }

      const result = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown'
      });

      console.log(`✅ Telegram message sent to chat ID: ${chatId}`);
      
      return {
        success: true,
        messageId: result.message_id,
        service: 'telegram'
      };

    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo() {
    try {
      if (!this.bot) {
        throw new Error('Telegram Bot not configured');
      }

      const info = await this.bot.getMe();
      return {
        success: true,
        info
      };

    } catch (error) {
      console.error('Error getting bot info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if Telegram service is available
   */
  isAvailable() {
    return this.bot !== null;
  }

  /**
   * Get updates (for webhook setup)
   */
  async getUpdates() {
    try {
      if (!this.bot) {
        throw new Error('Telegram Bot not configured');
      }

      const updates = await this.bot.getUpdates();
      return {
        success: true,
        updates
      };

    } catch (error) {
      console.error('Error getting updates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get main menu keyboard
   */
  getMainMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '📝 Register Account', callback_data: 'register' },
          { text: '📊 Check Attendance', callback_data: 'check' }
        ],
        [
          { text: '👥 My Accounts', callback_data: 'myaccounts' },
          { text: '🔐 Change Password', callback_data: 'changepassword' }
        ],
        [
          { text: '❓ Help', callback_data: 'help' }
        ]
      ]
    };
  }

  /**
   * Start registration process
   */
  async startRegistration(chatId) {
    // Initialize registration session
    this.registrationSessions.set(chatId, {
      step: 'name',
      data: {}
    });

    const keyboard = {
      inline_keyboard: [
        [{ text: '❌ Cancel Registration', callback_data: 'cancel_registration' }]
      ]
    };
    
    await this.bot.sendMessage(chatId, 
      `📝 *Student Registration - Step 1 of 3*\n\n` +
      `Let's register your student account step by step.\n\n` +
      `*Step 1: Your Name*\n` +
      `Please enter your full name:\n\n` +
      `_Click Cancel anytime to stop registration._`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Send help message
   */
  async sendHelpMessage(chatId) {
    const helpMessage = `📖 *Help - Attendance Bot*

*How to Use This Bot:*
Simply click the buttons below or use commands:

*📝 Register Account*
• Click "Register Account" button or send /register
• Follow the step-by-step process
• Enter Student ID, Password, and Name

*📊 Check Attendance*
• Click "Check Attendance" button or send /check
• View your current attendance status
• Get suggestions to maintain 75%

*👥 My Accounts*
• Click "My Accounts" button or send /myaccounts
• View all registered student accounts
• See last check dates and status

*🔐 Change Password*
• Click "Change Password" button or send /changepass
• Update your MITS IMS password
• Password is encrypted and stored securely

*Quick Commands (Advanced):*
• \`/reg ID PASS NAME\` - Quick registration
• \`/checkid STUDENTID\` - Check specific account

*Features:*
✅ Multiple account support
✅ Daily automatic updates
✅ Attendance suggestions
✅ Secure password encryption
✅ Easy password updates

━━━━━━━━━━━━━━━━━━━━━
Need more help? Contact your administrator.`;

    await this.bot.sendMessage(chatId, helpMessage, { 
      parse_mode: 'Markdown',
      reply_markup: this.getMainMenuKeyboard()
    });
  }

  /**
   * Handle check command
   */
  async handleCheckCommand(chatId) {
    try {
      // Send "processing" message
      await this.bot.sendMessage(chatId, '⏳ Checking your attendance... Please wait.', { parse_mode: 'Markdown' });

      // Find all students linked to this chat ID
      const Student = require('../models/Student');
      const students = await Student.find({ 
        telegramChatIds: chatId.toString() 
      });

      if (students.length === 0) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '📝 Register Now', callback_data: 'register' }],
            [{ text: '🏠 Main Menu', callback_data: 'help' }]
          ]
        };

        await this.bot.sendMessage(chatId, 
          `❌ *Student Not Found*\n\nYour Chat ID (\`${chatId}\`) is not registered in the system.\n\n` +
          `*To register:*\nClick the "Register Now" button below!`,
          { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }
        );
        return;
      }

      // If multiple accounts, let user choose with buttons
      if (students.length > 1) {
        let message = `📚 *Multiple Accounts Found*\n\n`;
        message += `You have ${students.length} registered accounts.\nSelect one to check attendance:\n\n`;
        
        students.forEach((student, index) => {
          const status = student.isActive ? '✅' : '❌';
          message += `${index + 1}. ${status} *${student.studentId}* - ${student.name}\n`;
        });
        
        message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Click a button below to check attendance:`;

        // Create buttons for each student
        const buttons = students.map(student => [{
          text: `${student.isActive ? '✅' : '❌'} ${student.studentId} - ${student.name}`,
          callback_data: `checkid_${student.studentId}`
        }]);
        
        // Add main menu button
        buttons.push([{ text: '🏠 Main Menu', callback_data: 'help' }]);

        await this.bot.sendMessage(chatId, message, { 
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
        return;
      }

      // Single account - check it
      const student = students[0];

      if (!student.isActive) {
        await this.bot.sendMessage(chatId, 
          '❌ *Account Inactive*\n\nYour student account is currently inactive. Please contact the administrator.',
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getMainMenuKeyboard()
          }
        );
        return;
      }

      // Check if attendanceService is available
      if (!this.attendanceService) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nAttendance service is not available. Please try again later.',
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getMainMenuKeyboard()
          }
        );
        return;
      }

      // Fetch attendance
      const result = await this.attendanceService.checkStudentAttendance(student.studentId);

      if (!result.success) {
        await this.bot.sendMessage(chatId, 
          `❌ *Error Checking Attendance*\n\n${result.error || 'An error occurred while fetching attendance data.'}`,
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getMainMenuKeyboard()
          }
        );
        return;
      }

      // Attendance report is already sent by the checkStudentAttendance method
      console.log(`✅ Attendance checked via button/command for ${student.studentId}`);

    } catch (error) {
      console.error('Error handling check command:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nAn unexpected error occurred: ${error.message}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: this.getMainMenuKeyboard()
        }
      );
    }
  }

  /**
   * Handle my accounts command
   */
  async handleMyAccountsCommand(chatId) {
    try {
      const Student = require('../models/Student');
      
      // Find all students linked to this chat ID
      const students = await Student.find({ 
        telegramChatIds: chatId.toString() 
      });

      if (students.length === 0) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '📝 Register First Account', callback_data: 'register' }],
            [{ text: '🏠 Main Menu', callback_data: 'help' }]
          ]
        };

        await this.bot.sendMessage(chatId, 
          `📋 *No Accounts Found*\n\n` +
          `You haven't registered any student accounts yet.\n\n` +
          `Click the button below to register your first account!`,
          { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }
        );
        return;
      }

      let message = `📋 *Your Registered Accounts*\n\n`;
      message += `Total: ${students.length} account(s)\n\n`;
      
      students.forEach((student, index) => {
        const status = student.isActive ? '✅ Active' : '❌ Inactive';
        message += `${index + 1}. *${student.studentId}*\n`;
        message += `   Name: ${student.name}\n`;
        message += `   Status: ${status}\n`;
        if (student.lastAttendanceCheck) {
          const lastCheck = new Date(student.lastAttendanceCheck).toLocaleDateString('en-IN');
          message += `   Last Check: ${lastCheck}\n`;
        }
        message += `\n`;
      });

      message += `━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Click below to check attendance or register more accounts:`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📊 Check Attendance', callback_data: 'check' }],
          [{ text: '➕ Add Another Account', callback_data: 'register' }],
          [{ text: '🏠 Main Menu', callback_data: 'help' }]
        ]
      };

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Error getting accounts:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nFailed to retrieve your accounts: ${error.message}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: this.getMainMenuKeyboard()
        }
      );
    }
  }

  /**
   * Handle check ID command for specific student
   */
  async handleCheckIdCommand(chatId, studentId) {
    try {
      await this.bot.sendMessage(chatId, `⏳ Checking attendance for ${studentId}... Please wait.`, { parse_mode: 'Markdown' });

      const Student = require('../models/Student');
      
      // Find student and verify this chat ID has access
      const student = await Student.findOne({ 
        studentId,
        telegramChatIds: chatId.toString() 
      });

      if (!student) {
        await this.bot.sendMessage(chatId, 
          `❌ *Access Denied*\n\nStudent ID \`${studentId}\` is not linked to your Telegram account.\n\n` +
          `Use the button below to see your registered accounts.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '👥 My Accounts', callback_data: 'myaccounts' }],
                [{ text: '🏠 Main Menu', callback_data: 'help' }]
              ]
            }
          }
        );
        return;
      }

      if (!student.isActive) {
        await this.bot.sendMessage(chatId, 
          `❌ *Account Inactive*\n\nStudent account ${studentId} is currently inactive.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getMainMenuKeyboard()
          }
        );
        return;
      }

      if (!this.attendanceService) {
        await this.bot.sendMessage(chatId, 
          '❌ *Service Unavailable*\n\nAttendance service is not available. Please try again later.',
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getMainMenuKeyboard()
          }
        );
        return;
      }

      // Fetch attendance
      const result = await this.attendanceService.checkStudentAttendance(student.studentId);

      if (!result.success) {
        await this.bot.sendMessage(chatId, 
          `❌ *Error Checking Attendance*\n\n${result.error || 'An error occurred while fetching attendance data.'}`,
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getMainMenuKeyboard()
          }
        );
        return;
      }

      console.log(`✅ Attendance checked for ${student.studentId}`);

    } catch (error) {
      console.error('Error handling checkid command:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nAn unexpected error occurred: ${error.message}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: this.getMainMenuKeyboard()
        }
      );
    }
  }

  /**
   * Handle change password command
   */
  async handleChangePasswordCommand(chatId) {
    try {
      const Student = require('../models/Student');
      
      // Find all students linked to this chat ID
      const students = await Student.find({ 
        telegramChatIds: chatId.toString() 
      });

      if (students.length === 0) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '📝 Register Account First', callback_data: 'register' }],
            [{ text: '🏠 Main Menu', callback_data: 'help' }]
          ]
        };

        await this.bot.sendMessage(chatId, 
          `❌ *No Accounts Found*\n\n` +
          `You need to register an account before changing password.\n\n` +
          `Click the button below to register!`,
          { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }
        );
        return;
      }

      // If multiple accounts, let user choose with buttons
      if (students.length > 1) {
        let message = `🔐 *Change Password*\n\n`;
        message += `You have ${students.length} registered accounts.\nSelect one to change password:\n\n`;
        
        students.forEach((student, index) => {
          const status = student.isActive ? '✅' : '❌';
          message += `${index + 1}. ${status} *${student.studentId}* - ${student.name}\n`;
        });
        
        message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Click a button below:`;

        // Create buttons for each student
        const buttons = students.map(student => [{
          text: `${student.isActive ? '✅' : '❌'} ${student.studentId} - ${student.name}`,
          callback_data: `changepass_${student.studentId}`
        }]);
        
        // Add cancel button
        buttons.push([{ text: '❌ Cancel', callback_data: 'cancel_password_change' }]);
        buttons.push([{ text: '🏠 Main Menu', callback_data: 'help' }]);

        await this.bot.sendMessage(chatId, message, { 
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        });
        return;
      }

      // Single account - start password change
      await this.startPasswordChange(chatId, students[0].studentId);

    } catch (error) {
      console.error('Error handling change password command:', error);
      await this.bot.sendMessage(chatId, 
        `❌ *Error*\n\nAn unexpected error occurred: ${error.message}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: this.getMainMenuKeyboard()
        }
      );
    }
  }

  /**
   * Start password change process
   */
  async startPasswordChange(chatId, studentId) {
    // Initialize password change session
    this.passwordChangeSessions.set(chatId, {
      studentId: studentId,
      step: 'new_password'
    });

    const keyboard = {
      inline_keyboard: [
        [{ text: '❌ Cancel', callback_data: 'cancel_password_change' }]
      ]
    };
    
    await this.bot.sendMessage(chatId, 
      `🔐 *Change Password*\n\n` +
      `Student ID: \`${studentId}\`\n\n` +
      `*Enter New Password:*\n` +
      `Please type your new MITS IMS password:\n\n` +
      `_Note: Your password will be encrypted and stored securely._\n` +
      `_Click Cancel to stop._`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Handle password change step
   */
  async handlePasswordChangeStep(chatId, text) {
    const session = this.passwordChangeSessions.get(chatId);

    if (!session) {
      return;
    }

    try {
      if (session.step === 'new_password') {
        // Validate password
        const newPassword = text.trim();
        if (newPassword.length < 3) {
          await this.bot.sendMessage(chatId, 
            `⚠️ *Password too short*\n\nPlease enter a valid password (at least 3 characters):`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Show confirmation
        await this.bot.sendMessage(chatId, 
          `⏳ *Updating Password...*\n\n` +
          `Student ID: \`${session.studentId}\`\n\n` +
          `Please wait while we update your password...`,
          { parse_mode: 'Markdown' }
        );

        // Update password
        const Student = require('../models/Student');
        const { encryptPassword } = require('../utils/encryption');

        const student = await Student.findOne({ 
          studentId: session.studentId,
          telegramChatIds: chatId.toString()
        });

        if (!student) {
          await this.bot.sendMessage(chatId, 
            `❌ *Error*\n\nStudent account not found or access denied.`,
            { 
              parse_mode: 'Markdown',
              reply_markup: this.getMainMenuKeyboard()
            }
          );
          this.passwordChangeSessions.delete(chatId);
          return;
        }

        // Encrypt and update password
        student.encryptedPassword = encryptPassword(newPassword);
        await student.save();

        // Clear session
        this.passwordChangeSessions.delete(chatId);

        await this.bot.sendMessage(chatId, 
          `✅ *Password Updated Successfully!*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 Student ID: \`${session.studentId}\`\n` +
          `🔐 Password: Updated\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Your password has been changed and encrypted.\n\n` +
          `*What's next?*\n` +
          `• Use the new password for attendance checks\n` +
          `• Password is securely stored\n` +
          `• You'll receive attendance updates as usual`,
          { 
            parse_mode: 'Markdown',
            reply_markup: this.getMainMenuKeyboard()
          }
        );

        console.log(`✅ Password changed for ${session.studentId}`);
      }

    } catch (error) {
      console.error('Error in password change flow:', error);
      this.passwordChangeSessions.delete(chatId);
      await this.bot.sendMessage(chatId, 
        `❌ *Password Change Error*\n\n${error.message}\n\n` +
        `Please try again.`,
        { 
          parse_mode: 'Markdown',
          reply_markup: this.getMainMenuKeyboard()
        }
      );
    }
  }

  /**
   * Handle registration step
   */
  async handleRegistrationStep(chatId, text) {
    const session = this.registrationSessions.get(chatId);

    if (!session) {
      return;
    }

    // Handle cancel
    if (text.toLowerCase() === 'cancel') {
      this.registrationSessions.delete(chatId);
      await this.bot.sendMessage(chatId, 
        `❌ *Registration Cancelled*\n\nYou can start again anytime!`,
        { 
          parse_mode: 'Markdown',
          reply_markup: this.getMainMenuKeyboard()
        }
      );
      return;
    }

    try {
      switch (session.step) {
        case 'name':
          // Validate name
          const name = text.trim();
          if (name.length < 2) {
            await this.bot.sendMessage(chatId, 
              `⚠️ *Name too short*\n\nPlease enter a valid name (at least 2 characters):`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
          
          session.data.name = name;
          session.step = 'student_id';
          
          await this.bot.sendMessage(chatId, 
            `✅ Name: ${name}\n\n` +
            `📝 *Step 2 of 3*\n\n` +
            `*Step 2: Student ID*\n` +
            `Please enter your Student ID (e.g., 23691A3305):`,
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel_registration' }]]
              }
            }
          );
          break;

        case 'student_id':
          // Validate student ID
          const studentId = text.trim().toUpperCase();
          if (studentId.length < 5) {
            await this.bot.sendMessage(chatId, 
              `⚠️ *Invalid Student ID*\n\nPlease enter a valid Student ID (at least 5 characters):`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
          
          session.data.studentId = studentId;
          session.step = 'password';
          
          await this.bot.sendMessage(chatId, 
            `✅ Student ID: \`${studentId}\`\n\n` +
            `📝 *Step 3 of 3*\n\n` +
            `*Step 3: Password*\n` +
            `Please enter your MITS IMS password:\n\n` +
            `_Note: Your password will be encrypted and stored securely._`,
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel_registration' }]]
              }
            }
          );
          break;

        case 'password':
          // Validate password
          const password = text.trim();
          if (password.length < 3) {
            await this.bot.sendMessage(chatId, 
              `⚠️ *Password too short*\n\nPlease enter a valid password (at least 3 characters):`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
          
          session.data.password = password;
          
          // Show confirmation
          await this.bot.sendMessage(chatId, 
            `⏳ *Processing Registration...*\n\n` +
            `Name: ${session.data.name}\n` +
            `Student ID: \`${session.data.studentId}\`\n\n` +
            `Please wait while we register your account...`,
            { parse_mode: 'Markdown' }
          );

          // Perform registration
          await this.performRegistration(chatId, session.data);
          
          // Clear session
          this.registrationSessions.delete(chatId);
          break;
      }
    } catch (error) {
      console.error('Error in registration flow:', error);
      this.registrationSessions.delete(chatId);
      await this.bot.sendMessage(chatId, 
        `❌ *Registration Error*\n\n${error.message}\n\n` +
        `Please try again.`,
        { 
          parse_mode: 'Markdown',
          reply_markup: this.getMainMenuKeyboard()
        }
      );
    }
  }
}

module.exports = TelegramService;
