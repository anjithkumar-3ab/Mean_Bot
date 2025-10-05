// Netlify Serverless Function - Telegram Webhook
// This replaces the polling-based Telegram bot for Netlify deployment
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const Student = require('../../models/Student');
const { encryptPassword } = require('../../utils/encryption');

// Database connection helper
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system';
    await mongoose.connect(MONGODB_URI);
  }
}

// Initialize bot (without polling)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// In-memory session storage (use database in production for persistence)
const registrationSessions = new Map();
const passwordChangeSessions = new Map();

exports.handler = async (event, context) => {
  // Enable context reuse
  context.callbackWaitsForEmptyEventLoop = false;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  try {
    await connectDB();

    // Parse Telegram update
    const update = JSON.parse(event.body);
    console.log('Telegram Update:', JSON.stringify(update, null, 2));

    // Handle callback query (button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
    // Handle messages
    else if (update.message) {
      await handleMessage(update.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };

  } catch (error) {
    console.error('Webhook Error:', error);
    return {
      statusCode: 200, // Always return 200 to Telegram
      headers,
      body: JSON.stringify({ ok: true })
    };
  }
};

// Handle callback queries
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  try {
    await bot.answerCallbackQuery(query.id);

    switch (data) {
      case 'register':
        await startRegistration(chatId);
        break;
      case 'check':
        await sendSimpleMessage(chatId, '⚠️ *Manual Check Required*\n\nDue to serverless limitations, please check attendance via the web interface.');
        break;
      case 'myaccounts':
        await handleMyAccountsCommand(chatId);
        break;
      case 'help':
        await sendHelpMessage(chatId);
        break;
      case 'edit_accounts':
        await handleEditAccountsCommand(chatId);
        break;
      case 'cancel_registration':
        registrationSessions.delete(chatId);
        await bot.sendMessage(chatId, '❌ *Registration Cancelled*', { parse_mode: 'Markdown' });
        break;
      default:
        if (data.startsWith('remove_')) {
          const studentId = data.replace('remove_', '');
          await handleRemoveAccountCommand(chatId, studentId);
        } else if (data.startsWith('confirmremove_')) {
          const studentId = data.replace('confirmremove_', '');
          await confirmRemoveAccount(chatId, studentId);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling callback:', error);
  }
}

// Handle messages
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // Handle commands
  if (text.startsWith('/start')) {
    await handleStartCommand(chatId);
  } else if (text.startsWith('/help')) {
    await sendHelpMessage(chatId);
  } else if (text.startsWith('/register')) {
    await startRegistration(chatId);
  } else if (text.startsWith('/myaccounts')) {
    await handleMyAccountsCommand(chatId);
  } else if (registrationSessions.has(chatId)) {
    await handleRegistrationStep(chatId, text);
  }
}

// Command handlers
async function handleStartCommand(chatId) {
  const welcomeMessage = `👋 *Welcome to Attendance Bot!*

🔹 Chat ID: \`${chatId}\`

📝 *Quick Start:*
Click the buttons below!

━━━━━━━━━━━━━━━━━━━━━
⚠️ Running in Serverless Mode
Some features require the web interface.`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '📝 Register Account', callback_data: 'register' }],
      [{ text: '👥 My Accounts', callback_data: 'myaccounts' }],
      [{ text: '❓ Help', callback_data: 'help' }]
    ]
  };

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function startRegistration(chatId) {
  registrationSessions.set(chatId, { step: 'name', data: {} });
  
  await bot.sendMessage(chatId,
    `📝 *Registration - Step 1 of 3*\n\nPlease enter your full name:`,
    { parse_mode: 'Markdown' }
  );
}

async function handleRegistrationStep(chatId, text) {
  const session = registrationSessions.get(chatId);
  if (!session) return;

  try {
    switch (session.step) {
      case 'name':
        session.data.name = text.trim();
        session.step = 'student_id';
        await bot.sendMessage(chatId,
          `✅ Name: ${text}\n\n📝 *Step 2 of 3*\n\nEnter your Student ID:`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'student_id':
        session.data.studentId = text.trim().toUpperCase();
        session.step = 'password';
        await bot.sendMessage(chatId,
          `✅ Student ID: \`${text}\`\n\n📝 *Step 3 of 3*\n\nEnter your MITS IMS password:`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'password':
        session.data.password = text.trim();
        await performRegistration(chatId, session.data);
        registrationSessions.delete(chatId);
        break;
    }
  } catch (error) {
    console.error('Registration error:', error);
    registrationSessions.delete(chatId);
    await bot.sendMessage(chatId, '❌ Registration failed. Please try again.');
  }
}

async function performRegistration(chatId, data) {
  const { studentId, password, name } = data;

  let student = await Student.findOne({ studentId });

  if (student) {
    if (!student.telegramChatIds) student.telegramChatIds = [];
    if (student.telegramChatIds.includes(chatId.toString())) {
      await bot.sendMessage(chatId, '❌ Already registered!');
      return;
    }
    student.telegramChatIds.push(chatId.toString());
    await student.save();
    await bot.sendMessage(chatId, '✅ *Account Linked!*', { parse_mode: 'Markdown' });
  } else {
    const encryptedPassword = encryptPassword(password);
    await Student.create({
      studentId,
      name,
      encryptedPassword,
      telegramChatIds: [chatId.toString()],
      telegramChatId: chatId.toString(),
      notifications: { telegram: true },
      isActive: true
    });
    await bot.sendMessage(chatId, '🎉 *Registration Successful!*', { parse_mode: 'Markdown' });
  }
}

async function handleMyAccountsCommand(chatId) {
  const students = await Student.find({ telegramChatIds: chatId.toString() });

  if (students.length === 0) {
    await bot.sendMessage(chatId, '❌ No accounts found. Use /register to add one.');
    return;
  }

  let message = `📋 *Your Accounts*\n\nTotal: ${students.length}\n\n`;
  students.forEach((s, i) => {
    message += `${i + 1}. ${s.isActive ? '✅' : '❌'} *${s.studentId}* - ${s.name}\n`;
  });

  const keyboard = {
    inline_keyboard: [
      [{ text: '✏️ Edit/Remove Accounts', callback_data: 'edit_accounts' }],
      [{ text: '🏠 Main Menu', callback_data: 'help' }]
    ]
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function handleEditAccountsCommand(chatId) {
  const students = await Student.find({ telegramChatIds: chatId.toString() });

  if (students.length === 0) {
    await bot.sendMessage(chatId, '❌ No accounts found.');
    return;
  }

  let message = `✏️ *Edit/Remove Accounts*\n\nSelect account to remove:\n\n`;
  
  const buttons = students.map(s => [{
    text: `🗑️ Remove ${s.studentId}`,
    callback_data: `remove_${s.studentId}`
  }]);
  buttons.push([{ text: '◀️ Back', callback_data: 'myaccounts' }]);

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

async function handleRemoveAccountCommand(chatId, studentId) {
  const student = await Student.findOne({
    studentId,
    telegramChatIds: chatId.toString()
  });

  if (!student) {
    await bot.sendMessage(chatId, '❌ Access denied.');
    return;
  }

  const message = `⚠️ *Confirm Removal*\n\n` +
    `Student ID: \`${studentId}\`\n` +
    `Name: ${student.name}\n\n` +
    `Remove this account?`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Yes, Remove', callback_data: `confirmremove_${studentId}` },
        { text: '❌ Cancel', callback_data: 'edit_accounts' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function confirmRemoveAccount(chatId, studentId) {
  const student = await Student.findOne({
    studentId,
    telegramChatIds: chatId.toString()
  });

  if (!student) {
    await bot.sendMessage(chatId, '❌ Error: Account not found.');
    return;
  }

  student.telegramChatIds = student.telegramChatIds.filter(
    id => id !== chatId.toString()
  );

  if (student.telegramChatIds.length === 0) {
    student.isActive = false;
  }

  await student.save();

  await bot.sendMessage(chatId,
    `✅ *Account Removed!*\n\nStudent ID: \`${studentId}\``,
    { parse_mode: 'Markdown' }
  );
}

async function sendHelpMessage(chatId) {
  const helpMessage = `📖 *Help - Attendance Bot*

*Available Commands:*
• /start - Start the bot
• /register - Register account
• /myaccounts - View accounts
• /help - Show this message

*Features:*
✅ Account registration
✅ Multiple accounts
✅ Account management
⚠️ Manual attendance check (web)

━━━━━━━━━━━━━━━━━━━━━
Running in serverless mode`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

async function sendSimpleMessage(chatId, message) {
  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}
