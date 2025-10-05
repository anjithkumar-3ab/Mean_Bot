const MITSIMSScraper = require('./scraper');
const TelegramService = require('./telegramService');
const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceCalculator = require('../utils/attendanceCalculator');
const { formatForDatabase, parseSpecificAttendanceHTML } = require('../utils/attendanceHtmlParser');

class AttendanceService {
  constructor(telegramService = null) {
    // Accept telegram service as parameter to avoid creating multiple instances
    this.telegramService = telegramService || new TelegramService();
    // Set this service instance in telegram service for command handling
    if (this.telegramService && !this.telegramService.attendanceService) {
      this.telegramService.setAttendanceService(this);
    }
  }

  /**
   * Check attendance for a single student using HTML parser
   */
  async checkStudentAttendanceHTML(studentId, htmlContent) {
    try {
      console.log(`Checking attendance from HTML for student: ${studentId}`);

      // Get student details
      const student = await Student.findOne({ studentId });
      
      if (!student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      if (!student.isActive) {
        console.log(`Student ${studentId} is inactive. Skipping...`);
        return { success: false, message: 'Student is inactive' };
      }

      // Parse HTML content and format for database
      const attendanceData = formatForDatabase(htmlContent, studentId);
      
      // Save attendance record
      const attendanceRecord = await AttendanceRecord.create(attendanceData);

      // Update student's last check time
      student.lastAttendanceCheck = new Date();
      await student.save();

      // Send notifications
      const notifications = {
        telegram: { success: false }
      };

      // Prepare data for notifications
      const notificationData = {
        overallPercentage: attendanceData.overallPercentage,
        totalClasses: attendanceData.totalClasses,
        totalAttended: attendanceData.totalAttended,
        subjects: attendanceData.subjects
      };

      // Send Telegram notification
      if (student.notifications.telegram && student.telegramChatId && this.telegramService.isAvailable()) {
        const telegramResult = await this.telegramService.sendAttendanceReport(
          student.telegramChatId,
          student.name,
          notificationData
        );
        notifications.telegram = telegramResult;
        
        if (telegramResult.success) {
          attendanceRecord.notificationsSent.telegram = true;
        }
      }

      // Save notification status
      await attendanceRecord.save();

      console.log(`HTML attendance check completed for ${studentId}`);
      
      return {
        success: true,
        attendance: notificationData,
        notifications,
        recordId: attendanceRecord._id
      };

    } catch (error) {
      console.error(`Error checking attendance from HTML for ${studentId}:`, error);
      
      // Save error record
      try {
        await AttendanceRecord.create({
          studentId: studentId,
          status: 'error',
          errorMessage: error.message
        });
      } catch (saveError) {
        console.error('Failed to save error record:', saveError);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check attendance for a single student (original method)
   */
  async checkStudentAttendance(studentId) {
    try {
      console.log(`Checking attendance for student: ${studentId}`);

      // Get student details
      const student = await Student.findOne({ studentId });
      
      if (!student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      if (!student.isActive) {
        console.log(`Student ${studentId} is inactive. Skipping...`);
        return { success: false, message: 'Student is inactive' };
      }

      // Scrape attendance from MITS IMS
      const scraper = new MITSIMSScraper();
      const result = await scraper.fetchAttendance(student.studentId, student.encryptedPassword);

      if (!result.success) {
        // Save error record
        await AttendanceRecord.create({
          studentId: student.studentId,
          status: 'error',
          errorMessage: result.error
        });

        return {
          success: false,
          error: result.error
        };
      }

      // If the result contains HTML content, use the HTML parser
      if (result.htmlContent) {
        return this.checkStudentAttendanceHTML(studentId, result.htmlContent);
      }

      // Calculate attendance insights using AttendanceCalculator
      const calculator = new AttendanceCalculator(
        result.data.totalClasses,
        result.data.totalAttended,
        75 // Required percentage
      );
      
      const attendanceReport = calculator.getReport();
      
      // Enhance subjects with calculator insights and ensure correct status format
      const enhancedSubjects = result.data.subjects.map(subject => {
        const subjectCalc = new AttendanceCalculator(
          subject.totalClasses,
          subject.attendedClasses,
          75
        );
        const subjectReport = subjectCalc.getReport();
        
        // Ensure status matches MongoDB enum
        let dbStatus = 'safe'; // default
        if (subject.percentage < 60) {
          dbStatus = 'critical';
        } else if (subject.percentage < 75) {
          dbStatus = 'warning';
        }
        
        return {
          subjectName: subject.subjectName || subject.subjectCode,
          subjectCode: subject.subjectCode,
          totalClasses: subject.totalClasses,
          attendedClasses: subject.attendedClasses,
          percentage: subject.percentage,
          status: dbStatus, // Use correct enum value
          canMiss: subjectReport.classesCanMiss,
          needToAttend: subjectReport.classesNeedToAttend,
          isSufficient: subjectReport.isSufficient
        };
      });
      
      // Save attendance record with enhanced data
      const attendanceRecord = await AttendanceRecord.create({
        studentId: student.studentId,
        subjects: enhancedSubjects,
        overallPercentage: result.data.overallPercentage,
        totalClasses: result.data.totalClasses,
        totalAttended: result.data.totalAttended,
        status: 'success'
      });

      // Update student's last check time
      student.lastAttendanceCheck = new Date();
      await student.save();

      // Send notifications
      const notifications = {
        telegram: { success: false }
      };

      // Send Telegram notification
      if (student.notifications.telegram && student.telegramChatId && this.telegramService.isAvailable()) {
        const telegramResult = await this.telegramService.sendAttendanceReport(
          student.telegramChatId,
          student.name,
          result.data
        );
        notifications.telegram = telegramResult;
        
        if (telegramResult.success) {
          attendanceRecord.notificationsSent.telegram = true;
        }
      }

      // Save notification status
      await attendanceRecord.save();

      console.log(`Attendance check completed for ${studentId}`);
      
      return {
        success: true,
        attendance: {
          ...result.data,
          subjects: enhancedSubjects,
          insights: {
            overallStatus: attendanceReport.status,
            canMiss: attendanceReport.classesCanMiss,
            needToAttend: attendanceReport.classesNeedToAttend,
            isSufficient: attendanceReport.isSufficient
          }
        },
        notifications
      };

    } catch (error) {
      console.error(`Error checking attendance for ${studentId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check attendance for all active students
   */
  async checkAllStudentsAttendance() {
    try {
      console.log('Starting attendance check for all students...');

      const students = await Student.find({ isActive: true });
      console.log(`Found ${students.length} active students`);

      const results = [];

      // Process students sequentially to avoid overwhelming the server
      for (const student of students) {
        console.log(`Processing student ${student.studentId}...`);
        
        const result = await this.checkStudentAttendance(student.studentId);
        results.push({
          studentId: student.studentId,
          ...result
        });

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`Attendance check completed. Success: ${successCount}, Failed: ${failCount}`);

      return {
        success: true,
        total: students.length,
        successCount,
        failCount,
        results
      };

    } catch (error) {
      console.error('Error checking all students attendance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get attendance history for a student
   */
  async getAttendanceHistory(studentId, limit = 30) {
    try {
      const records = await AttendanceRecord.find({ studentId })
        .sort({ date: -1 })
        .limit(limit);

      return {
        success: true,
        records
      };

    } catch (error) {
      console.error('Error getting attendance history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get latest attendance for a student
   */
  async getLatestAttendance(studentId) {
    try {
      const record = await AttendanceRecord.findOne({ studentId, status: 'success' })
        .sort({ date: -1 });

      if (!record) {
        return {
          success: false,
          message: 'No attendance records found'
        };
      }

      return {
        success: true,
        record
      };

    } catch (error) {
      console.error('Error getting latest attendance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AttendanceService;
