/**
 * Attendance Calculator Core Module
 * Extracted from E:\M\1\attendance-calculator
 * Can be used as a standalone module in any JavaScript project
 */

class AttendanceCalculator {
    constructor(totalClasses, attendedClasses, requiredPercentage = 75) {
        this.totalClasses = totalClasses;
        this.attendedClasses = attendedClasses;
        this.requiredPercentage = requiredPercentage;
    }

    /**
     * Calculate current attendance percentage
     * @returns {number} Current attendance percentage
     */
    getCurrentPercentage() {
        if (this.totalClasses === 0) return 0;
        return (this.attendedClasses / this.totalClasses) * 100;
    }

    /**
     * Check if attendance meets the required percentage
     * @returns {boolean} True if attendance is sufficient
     */
    isSufficient() {
        return this.getCurrentPercentage() >= this.requiredPercentage;
    }

    /**
     * Calculate how many classes can be missed while maintaining required percentage
     * @returns {number} Number of classes that can be missed
     */
    classesCanMiss() {
        if (!this.isSufficient()) return 0;

        let canMiss = 0;
        let futureTotal = this.totalClasses;
        let futureAttended = this.attendedClasses;

        while (true) {
            futureTotal++;
            const percentage = (futureAttended / futureTotal) * 100;

            if (percentage < this.requiredPercentage) {
                break;
            }
            canMiss++;
        }

        return canMiss;
    }

    /**
     * Calculate how many consecutive classes need to be attended to reach required percentage  
     * @returns {number} Number of classes to attend
     */
    classesNeedToAttend() {
        if (this.isSufficient()) return 0;

        let needToAttend = 0;
        let futureTotal = this.totalClasses;
        let futureAttended = this.attendedClasses;

        while (true) {
            futureTotal++;
            futureAttended++;
            needToAttend++;

            const percentage = (futureAttended / futureTotal) * 100;

            if (percentage >= this.requiredPercentage) {
                break;
            }

            // Safety check to prevent infinite loop
            if (needToAttend > 10000) {
                return -1; // Impossible to reach
            }
        }

        return needToAttend;
    }

    /**
     * Get detailed status message
     * @returns {string} Status message
     */
    getStatus() {
        const currentPercentage = this.getCurrentPercentage();

        if (currentPercentage >= this.requiredPercentage) {
            return "Safe ✅";
        } else if (currentPercentage >= this.requiredPercentage - 5) {
            return "Warning ⚠️";
        } else {
            return "Danger ❌";
        }
    }

    /**
     * Get comprehensive attendance report
     * @returns {Object} Detailed attendance report
     */
    getReport() {
        const currentPercentage = this.getCurrentPercentage();
        const isSufficient = this.isSufficient();

        return {
            totalClasses: this.totalClasses,
            attendedClasses: this.attendedClasses,
            missedClasses: this.totalClasses - this.attendedClasses,
            currentPercentage: currentPercentage.toFixed(2),
            requiredPercentage: this.requiredPercentage,
            isSufficient: isSufficient,
            status: this.getStatus(),
            classesCanMiss: isSufficient ? this.classesCanMiss() : 0,
            classesNeedToAttend: !isSufficient ? this.classesNeedToAttend() : 0
        };
    }

    /**
     * Predict attendance after certain number of attended/missed classes
     * @param {number} futureAttended - Number of future classes to attend
     * @param {number} futureMissed - Number of future classes to miss
     * @returns {Object} Future attendance prediction
     */
    predict(futureAttended, futureMissed) {
        const newTotal = this.totalClasses + futureAttended + futureMissed;
        const newAttended = this.attendedClasses + futureAttended;
        const newPercentage = (newAttended / newTotal) * 100;

        return {
            totalClasses: newTotal,
            attendedClasses: newAttended,
            percentage: newPercentage.toFixed(2),
            isSufficient: newPercentage >= this.requiredPercentage
        };
    }

    /**
     * Calculate attendance percentage from raw data
     * @param {number} total - Total classes
     * @param {number} attended - Attended classes
     * @returns {number} Attendance percentage
     */
    static calculatePercentage(total, attended) {
        if (total === 0) return 0;
        return (attended / total) * 100;
    }

    /**
     * Determine if percentage meets requirement
     * @param {number} percentage - Current percentage
     * @param {number} required - Required percentage
     * @returns {boolean} True if sufficient
     */
    static isMeetingRequirement(percentage, required = 75) {
        return percentage >= required;
    }
}

// Export for use in other modules (Node.js/ES6)
module.exports = AttendanceCalculator;
