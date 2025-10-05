const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  // Encrypted MITS IMS password
  encryptedPassword: {
    type: String,
    required: true
  },
  // Telegram username (e.g., @username or username)
  telegramUsername: {
    type: String,
    trim: true
  },
  // Telegram Chat IDs (array to support multiple chat IDs checking same student)
  telegramChatIds: [{
    type: String,
    trim: true
  }],
  // Legacy field - kept for backward compatibility
  telegramChatId: {
    type: String,
    trim: true
  },
  // Preferences
  notifications: {
    telegram: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastAttendanceCheck: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Sync legacy telegramChatId with telegramChatIds array
  if (this.telegramChatId && !this.telegramChatIds.includes(this.telegramChatId)) {
    this.telegramChatIds.push(this.telegramChatId);
  }
  // Keep first chatId in legacy field for backward compatibility
  if (this.telegramChatIds.length > 0 && !this.telegramChatId) {
    this.telegramChatId = this.telegramChatIds[0];
  }
  
  next();
});

module.exports = mongoose.model('Student', studentSchema);
