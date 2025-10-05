const { parseSpecificAttendanceHTML, generateAttendanceReport } = require('./attendanceHtmlParser');

/**
 * Main function to process attendance HTML and integrate with your system
 * @param {string} htmlContent - Raw HTML from the student portal
 * @returns {Object} Processed attendance data ready for your system
 */
function processStudentAttendance(htmlContent) {
    try {
        // Parse the HTML
        const attendanceData = parseSpecificAttendanceHTML(htmlContent);
        
        // Generate comprehensive report
        const report = generateAttendanceReport(htmlContent);
        
        // Format for your system
        const processedData = {
            studentId: extractStudentId(htmlContent), // You'd implement this
            semester: extractSemester(htmlContent),   // You'd implement this
            timestamp: new Date().toISOString(),
            
            // Core attendance data
            subjects: attendanceData.subjects.map(subject => ({
                id: subject.serialNo,
                code: subject.subjectCode,
                name: subject.subjectCode, // You might want to map codes to full names
                attended: subject.classesAttended,
                total: subject.totalConducted,
                percentage: subject.attendancePercent,
                status: subject.status,
                
                // Additional calculations
                needed75: Math.max(0, Math.ceil(0.75 * subject.totalConducted) - subject.classesAttended),
                canMiss75: Math.max(0, subject.classesAttended - Math.ceil(0.75 * subject.totalConducted)),
                riskLevel: subject.attendancePercent < 60 ? 'critical' : 
                          subject.attendancePercent < 75 ? 'warning' : 'safe'
            })),
            
            // Summary statistics
            summary: {
                totalSubjects: attendanceData.summary.totalSubjects,
                overallPercentage: attendanceData.summary.averageAttendance,
                totalAttended: attendanceData.summary.totalClassesAttended,
                totalConducted: attendanceData.summary.totalClassesConducted,
                
                // Risk analysis
                criticalCount: attendanceData.subjects.filter(s => s.attendancePercent < 60).length,
                warningCount: attendanceData.subjects.filter(s => s.attendancePercent >= 60 && s.attendancePercent < 75).length,
                safeCount: attendanceData.subjects.filter(s => s.attendancePercent >= 75).length
            },
            
            // Recommendations
            recommendations: generateRecommendations(attendanceData.subjects),
            
            // Alerts for immediate action
            alerts: generateAlerts(attendanceData.subjects)
        };
        
        return processedData;
        
    } catch (error) {
        throw new Error(`Failed to process attendance: ${error.message}`);
    }
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(subjects) {
    const recommendations = [];
    
    subjects.forEach(subject => {
        const needed = Math.ceil(0.75 * subject.totalConducted) - subject.classesAttended;
        
        if (subject.attendancePercent < 60) {
            recommendations.push({
                type: 'critical',
                subject: subject.subjectCode,
                action: `Attend ${needed} more classes immediately`,
                priority: 1
            });
        } else if (subject.attendancePercent < 75) {
            recommendations.push({
                type: 'warning', 
                subject: subject.subjectCode,
                action: `Attend ${needed} more classes to be safe`,
                priority: 2
            });
        }
    });
    
    return recommendations.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate urgent alerts
 */
function generateAlerts(subjects) {
    const alerts = [];
    
    const critical = subjects.filter(s => s.attendancePercent < 60);
    if (critical.length > 0) {
        alerts.push({
            type: 'danger',
            message: `${critical.length} subjects below 60% attendance`,
            subjects: critical.map(s => s.subjectCode)
        });
    }
    
    const failing = subjects.filter(s => s.attendancePercent < 75);
    if (failing.length > subjects.length / 2) {
        alerts.push({
            type: 'warning',
            message: 'More than half your subjects need attention',
            count: failing.length
        });
    }
    
    return alerts;
}

/**
 * Extract student ID from HTML (placeholder - implement based on your HTML structure)
 */
function extractStudentId(htmlContent) {
    // This would extract student ID from the HTML
    // For now, return a placeholder
    return 'STUDENT_ID_PLACEHOLDER';
}

/**
 * Extract semester info from HTML
 */
function extractSemester(htmlContent) {
    const semesterMatch = htmlContent.match(/III YEAR I SEMESTER - REGULAR/);
    return semesterMatch ? 'III YEAR I SEMESTER - REGULAR' : 'UNKNOWN';
}

// Example usage and test
if (require.main === module) {
    console.log('🔄 TESTING COMPLETE ATTENDANCE PROCESSING SYSTEM\n');
    
    // Sample HTML (using the structure you provided)
    const sampleHTML = `<fieldset id="fieldset-1121" class="x-fieldset bottom-border x-fieldset-default">
        <div class="x-fieldset-body x-column-layout-ct">
            <div class="x-column-inner">
                <div class="x-field x-form-item x-column x-field-default">
                    <div class="x-form-item-body">
                        <div class="x-form-display-field">
                            <span style="font-size:12px;padding: 9px;">1</span>
                        </div>
                    </div>
                </div>
                <div class="x-field x-form-item x-column x-field-default">
                    <div class="x-form-item-body">
                        <div class="x-form-display-field">
                            <span style="font-size:12px">APTITUDE</span>
                        </div>
                    </div>
                </div>
                <div class="x-field x-form-item x-column x-field-default">
                    <div class="x-form-item-body">
                        <div class="x-form-display-field">
                            <span style="font-size:12px;padding: 55px;"> 3 </span>
                        </div>
                    </div>
                </div>
                <div class="x-field x-form-item x-column x-field-default">
                    <div class="x-form-item-body">
                        <div class="x-form-display-field">
                            <span style="font-size:12px;padding: 40px;">  4 </span>
                        </div>
                    </div>
                </div>
                <div class="x-field x-form-item x-column x-field-default">
                    <div class="x-form-item-body">
                        <div class="x-form-display-field">
                            <span style="font-size:12px;color:#0040FF; padding: 37px;">  75.0 </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </fieldset>`;
    
    try {
        const result = processStudentAttendance(sampleHTML);
        console.log('✅ Processing successful!');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Processing failed:', error.message);
    }
}

module.exports = {
    processStudentAttendance,
    generateRecommendations,
    generateAlerts,
    extractStudentId,
    extractSemester
};