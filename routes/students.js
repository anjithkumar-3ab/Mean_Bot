const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { encryptPassword } = require('../utils/encryption');

/**
 * @route   POST /api/students/register
 * @desc    Register a new student
 */
router.post('/register', async (req, res) => {
  try {
    const { studentId, name, password, telegramChatId, telegramChatIds, telegramUsername, notifications } = req.body;

    // Validation
    if (!studentId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: studentId, password'
      });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student ID already registered'
      });
    }

    // Encrypt password
    const encryptedPassword = encryptPassword(password);

    // Prepare chat IDs array
    let chatIdsArray = [];
    if (telegramChatIds && Array.isArray(telegramChatIds)) {
      chatIdsArray = telegramChatIds;
    } else if (telegramChatId) {
      chatIdsArray = [telegramChatId];
    }

    // Create new student
    const student = await Student.create({
      studentId,
      name: name || studentId,
      encryptedPassword,
      telegramChatIds: chatIdsArray,
      telegramChatId: chatIdsArray[0] || '',
      telegramUsername: telegramUsername || '',
      notifications: notifications || { telegram: true }
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: {
        studentId: student.studentId,
        name: student.name,
        telegramChatId: student.telegramChatId,
        telegramChatIds: student.telegramChatIds,
        telegramUsername: student.telegramUsername,
        notifications: student.notifications,
        isActive: student.isActive
      }
    });

  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/students/:id
 * @desc    Get student details
 */
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      student: {
        studentId: student.studentId,
        name: student.name,
        telegramChatId: student.telegramChatId,
        telegramChatIds: student.telegramChatIds,
        telegramUsername: student.telegramUsername,
        notifications: student.notifications,
        isActive: student.isActive,
        lastAttendanceCheck: student.lastAttendanceCheck,
        createdAt: student.createdAt
      }
    });

  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting student',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/students
 * @desc    Get all students
 */
router.get('/', async (req, res) => {
  try {
    const students = await Student.find({}, '-encryptedPassword');

    res.json({
      success: true,
      count: students.length,
      students
    });

  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting students',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/students/:id
 * @desc    Update student details
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, telegramChatId, telegramChatIds, telegramUsername, password, notifications, isActive } = req.body;

    const student = await Student.findOne({ studentId: req.params.id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update fields if provided
    if (name) student.name = name;
    
    // Handle chat IDs update
    if (telegramChatIds && Array.isArray(telegramChatIds)) {
      student.telegramChatIds = telegramChatIds;
      if (telegramChatIds.length > 0) {
        student.telegramChatId = telegramChatIds[0];
      }
    } else if (telegramChatId) {
      if (!student.telegramChatIds) {
        student.telegramChatIds = [];
      }
      if (!student.telegramChatIds.includes(telegramChatId)) {
        student.telegramChatIds.push(telegramChatId);
      }
      student.telegramChatId = telegramChatId;
    }
    
    if (telegramUsername !== undefined) student.telegramUsername = telegramUsername;
    if (password) student.encryptedPassword = encryptPassword(password);
    if (notifications) student.notifications = notifications;
    if (typeof isActive !== 'undefined') student.isActive = isActive;

    await student.save();

    res.json({
      success: true,
      message: 'Student updated successfully',
      student: {
        studentId: student.studentId,
        name: student.name,
        telegramChatId: student.telegramChatId,
        telegramChatIds: student.telegramChatIds,
        telegramUsername: student.telegramUsername,
        notifications: student.notifications,
        isActive: student.isActive
      }
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student
 */
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ studentId: req.params.id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
});

module.exports = router;
