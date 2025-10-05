// Netlify Serverless Function - Check Attendance
const mongoose = require('mongoose');
const Student = require('../../models/Student');
const AttendanceService = require('../../services/attendanceService');

// Database connection helper
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system';
    await mongoose.connect(MONGODB_URI);
  }
}

exports.handler = async (event, context) => {
  // Enable context reuse for better performance
  context.callbackWaitsForEmptyEventLoop = false;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };
  }

  try {
    await connectDB();

    const body = JSON.parse(event.body);
    const { studentId } = body;

    if (!studentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Student ID is required'
        })
      };
    }

    // Find student
    const student = await Student.findOne({ studentId });
    if (!student) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Student not found'
        })
      };
    }

    if (!student.isActive) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Student account is inactive'
        })
      };
    }

    // Initialize attendance service
    const attendanceService = new AttendanceService();

    // Check attendance (without Telegram notification in serverless mode)
    const result = await attendanceService.checkStudentAttendance(studentId, false);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
