const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: 'Student'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  subjects: [{
    subjectName: String,
    subjectCode: String,
    totalClasses: Number,
    attendedClasses: Number,
    percentage: Number,
    status: {
      type: String,
      enum: ['safe', 'warning', 'critical'],
      default: 'safe'
    }
  }],
  overallPercentage: {
    type: Number,
    default: 0
  },
  totalClasses: {
    type: Number,
    default: 0
  },
  totalAttended: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  errorMessage: {
    type: String
  },
  notificationsSent: {
    email: {
      type: Boolean,
      default: false
    },
    telegram: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
attendanceRecordSchema.index({ studentId: 1, date: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
