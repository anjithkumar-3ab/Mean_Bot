const express = require('express');
const router = express.Router();

// AttendanceService will be set by server.js to use shared instance
let attendanceService = null;

// Function to set the shared attendance service instance
function setAttendanceService(service) {
  attendanceService = service;
}

/**
 * @route   POST /api/attendance/check/:studentId
 * @desc    Manually trigger attendance check for a student
 */
router.post('/check/:studentId', async (req, res) => {
  try {
    if (!attendanceService) {
      return res.status(500).json({
        success: false,
        message: 'Attendance service not initialized'
      });
    }

    const { studentId } = req.params;

    console.log(`Manual attendance check requested for: ${studentId}`);

    const result = await attendanceService.checkStudentAttendance(studentId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to check attendance',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Attendance checked successfully',
      data: result
    });

  } catch (error) {
    console.error('Error in manual attendance check:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking attendance',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/attendance/check-all
 * @desc    Manually trigger attendance check for all students
 */
router.post('/check-all', async (req, res) => {
  try {
    if (!attendanceService) {
      return res.status(500).json({
        success: false,
        message: 'Attendance service not initialized'
      });
    }

    console.log('Manual attendance check requested for all students');

    // Start the process asynchronously
    attendanceService.checkAllStudentsAttendance()
      .then(result => {
        console.log('Batch attendance check completed:', result);
      })
      .catch(error => {
        console.error('Error in batch attendance check:', error);
      });

    res.json({
      success: true,
      message: 'Attendance check started for all students. This may take a few minutes.'
    });

  } catch (error) {
    console.error('Error starting batch attendance check:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting attendance check',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/attendance/history/:studentId
 * @desc    Get attendance history for a student
 */
router.get('/history/:studentId', async (req, res) => {
  try {
    if (!attendanceService) {
      return res.status(500).json({
        success: false,
        message: 'Attendance service not initialized'
      });
    }

    const { studentId } = req.params;
    const limit = parseInt(req.query.limit) || 30;

    const result = await attendanceService.getAttendanceHistory(studentId, limit);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get attendance history',
        error: result.error
      });
    }

    res.json({
      success: true,
      count: result.records.length,
      records: result.records
    });

  } catch (error) {
    console.error('Error getting attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting attendance history',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/attendance/all-students
 * @desc    Get all students with their latest attendance records
 */
router.get('/all-students', async (req, res) => {
  try {
    const Student = require('../models/Student');
    const AttendanceRecord = require('../models/AttendanceRecord');

    console.log('Fetching all students with latest attendance...');

    // Get all students
    const students = await Student.find({}, '-encryptedPassword');

    // Get latest attendance for each student
    const studentsWithAttendance = await Promise.all(
      students.map(async (student) => {
        const latestRecord = await AttendanceRecord.findOne({ 
          studentId: student.studentId, 
          status: 'success' 
        }).sort({ date: -1 });

        return {
          studentId: student.studentId,
          name: student.name,
          isActive: student.isActive,
          lastCheck: student.lastAttendanceCheck,
          attendance: latestRecord ? {
            overallPercentage: latestRecord.overallPercentage,
            totalClasses: latestRecord.totalClasses,
            totalAttended: latestRecord.totalAttended,
            subjects: latestRecord.subjects,
            date: latestRecord.date
          } : null
        };
      })
    );

    res.json({
      success: true,
      count: studentsWithAttendance.length,
      students: studentsWithAttendance
    });

  } catch (error) {
    console.error('Error getting all students with attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students data',
      error: error.message
    });
  }
});

// Export both the router and the setAttendanceService function
module.exports = router;
module.exports.setAttendanceService = setAttendanceService;
