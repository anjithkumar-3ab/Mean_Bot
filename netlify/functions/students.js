// Netlify Serverless Function - Students API
const mongoose = require('mongoose');
const Student = require('../../models/Student');
const { encryptPassword, decryptPassword } = require('../../utils/encryption');

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    await connectDB();

    const path = event.path.replace('/.netlify/functions/students', '');
    const method = event.httpMethod;

    // GET /students - Get all students
    if (method === 'GET' && !path) {
      const students = await Student.find().select('-encryptedPassword');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          count: students.length,
          data: students
        })
      };
    }

    // GET /students/:id - Get single student
    if (method === 'GET' && path) {
      const studentId = path.replace('/', '');
      const student = await Student.findOne({ studentId }).select('-encryptedPassword');
      
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: student
        })
      };
    }

    // POST /students - Create new student
    if (method === 'POST') {
      const body = JSON.parse(event.body);
      const { studentId, name, password, telegramChatId } = body;

      if (!studentId || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Student ID and password are required'
          })
        };
      }

      // Check if student already exists
      const existingStudent = await Student.findOne({ studentId });
      if (existingStudent) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Student already exists'
          })
        };
      }

      const encryptedPassword = encryptPassword(password);
      const student = await Student.create({
        studentId,
        name: name || studentId,
        encryptedPassword,
        telegramChatId: telegramChatId || '',
        telegramChatIds: telegramChatId ? [telegramChatId] : [],
        notifications: { telegram: true },
        isActive: true
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Student registered successfully',
          data: {
            studentId: student.studentId,
            name: student.name,
            isActive: student.isActive
          }
        })
      };
    }

    // PUT /students/:id - Update student
    if (method === 'PUT' && path) {
      const studentId = path.replace('/', '');
      const body = JSON.parse(event.body);

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

      // Update fields
      if (body.name) student.name = body.name;
      if (body.password) student.encryptedPassword = encryptPassword(body.password);
      if (body.telegramChatId !== undefined) {
        student.telegramChatId = body.telegramChatId;
        if (body.telegramChatId && !student.telegramChatIds.includes(body.telegramChatId)) {
          student.telegramChatIds.push(body.telegramChatId);
        }
      }
      if (body.isActive !== undefined) student.isActive = body.isActive;

      await student.save();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Student updated successfully',
          data: {
            studentId: student.studentId,
            name: student.name,
            isActive: student.isActive
          }
        })
      };
    }

    // DELETE /students/:id - Delete student
    if (method === 'DELETE' && path) {
      const studentId = path.replace('/', '');
      const student = await Student.findOneAndDelete({ studentId });

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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Student deleted successfully'
        })
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
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
