// Client Portal JavaScript
const API_BASE = '/api';

// Session storage
let currentStudent = null;
let currentAttendance = null;

// DOM Elements
const loginView = document.getElementById('login-view');
const attendanceView = document.getElementById('attendance-view');
const loginForm = document.getElementById('login-form');
const toast = document.getElementById('toast');

// Toast Notification
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Loading Spinner
function showLoading(container) {
  container.innerHTML = '<div class="spinner"></div>';
  container.style.display = 'block';
}

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('student-id').value.trim().toUpperCase();
  const password = document.getElementById('password').value;
  
  if (!studentId || !password) {
    showToast('Please enter both Student ID and Password', 'warning');
    return;
  }
  
  // Show loading
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Checking...';
  
  try {
    // First verify student exists in database
    const studentResponse = await fetch(`${API_BASE}/students/${studentId}`);
    const studentData = await studentResponse.json();
    
    if (!studentData.success) {
      // Student not in database - try to fetch attendance directly
      showToast('Fetching attendance...', 'info');
      await checkAttendanceDirectly(studentId, password);
    } else {
      // Student exists - check attendance
      currentStudent = {
        studentId: studentData.student.studentId,
        name: studentData.student.name
      };
      
      await checkAttendance(studentId);
    }
    
  } catch (error) {
    console.error('Login error:', error);
    showToast('Network error. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Check attendance for registered student
async function checkAttendance(studentId) {
  const resultBox = document.getElementById('attendance-result');
  showLoading(resultBox);
  
  try {
    const response = await fetch(`${API_BASE}/attendance/check/${studentId}`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success && data.data.attendance) {
      currentAttendance = data.data.attendance;
      
      // Update user info
      document.getElementById('user-name').textContent = currentStudent.name || studentId;
      document.getElementById('user-id').textContent = `Student ID: ${studentId}`;
      
      // Show attendance view
      loginView.style.display = 'none';
      attendanceView.style.display = 'block';
      
      // Display attendance
      displayAttendance(currentAttendance, resultBox);
      updateQuickStats(currentAttendance);
      
      showToast('Attendance loaded successfully!', 'success');
      
      // Reset login form
      loginForm.reset();
    } else {
      showToast(data.error || 'Failed to check attendance', 'error');
      resultBox.innerHTML = `
        <div class="alert alert-danger">
          <strong>❌ Error:</strong> ${data.error || 'Failed to check attendance'}
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error', 'error');
    resultBox.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Network Error:</strong> Unable to connect to the server.
      </div>
    `;
  } finally {
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = '🚀 Login & Check Attendance';
  }
}

// Check attendance directly (for non-registered students)
async function checkAttendanceDirectly(studentId, password) {
  // This would require a new API endpoint that accepts credentials
  // For now, show a message to register first
  showToast('Please register through the Telegram bot or main portal first', 'warning');
  
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = false;
  submitBtn.textContent = '🚀 Login & Check Attendance';
}

// Display Attendance
function displayAttendance(attendance, container) {
  const percentage = parseFloat(attendance.overallPercentage);
  const status = percentage >= 75 ? 'safe' : percentage >= 70 ? 'warning' : 'critical';
  
  // Calculate additional statistics
  const subjectCount = attendance.subjects ? attendance.subjects.length : 0;
  const criticalSubjects = attendance.subjects ? 
    attendance.subjects.filter(s => parseFloat(s.percentage) < 70).length : 0;
  const warningSubjects = attendance.subjects ? 
    attendance.subjects.filter(s => parseFloat(s.percentage) >= 70 && parseFloat(s.percentage) < 75).length : 0;
  const safeSubjects = attendance.subjects ? 
    attendance.subjects.filter(s => parseFloat(s.percentage) >= 75).length : 0;
  
  let html = `
    <div class="attendance-summary">
      <h3>📊 Overall Mean Attendance</h3>
      <div class="attendance-percentage ${status}">${percentage.toFixed(2)}%</div>
      <div class="attendance-details">
        <strong>${attendance.totalAttended} / ${attendance.totalClasses}</strong> classes attended
      </div>
      <div class="attendance-stats" style="margin-top: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
        <div style="background: #d4edda; padding: 10px; border-radius: 5px;">
          <div style="font-size: 24px; font-weight: bold; color: #155724;">✅ ${safeSubjects}</div>
          <div style="font-size: 12px; color: #155724;">Safe (≥75%)</div>
        </div>
        <div style="background: #fff3cd; padding: 10px; border-radius: 5px;">
          <div style="font-size: 24px; font-weight: bold; color: #856404;">⚠️ ${warningSubjects}</div>
          <div style="font-size: 12px; color: #856404;">Warning (70-75%)</div>
        </div>
        <div style="background: #f8d7da; padding: 10px; border-radius: 5px;">
          <div style="font-size: 24px; font-weight: bold; color: #721c24;">❌ ${criticalSubjects}</div>
          <div style="font-size: 12px; color: #721c24;">Critical (<70%)</div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 14px; color: #666;">
        Total Subjects: <strong>${subjectCount}</strong>
      </div>
    </div>
  `;
  
  // Add attendance insights
  if (percentage < 75) {
    const currentAttended = attendance.totalAttended;
    const currentTotal = attendance.totalClasses;
    const classesNeeded = Math.ceil((0.75 * currentTotal - currentAttended) / 0.25);
    
    if (classesNeeded > 0) {
      html += `
        <div class="alert alert-warning">
          💡 <strong>Suggestion:</strong> Attend the next <strong>${classesNeeded} classes continuously</strong> to reach 75% attendance.
        </div>
      `;
    }
  } else {
    const currentAttended = attendance.totalAttended;
    const currentTotal = attendance.totalClasses;
    const canMiss = Math.floor((currentAttended - 0.75 * currentTotal) / 0.75);
    
    if (canMiss > 0) {
      html += `
        <div class="alert alert-success">
          💡 <strong>Good News:</strong> You can miss up to <strong>${canMiss} classes</strong> and still stay above 75%.
        </div>
      `;
    } else {
      html += `
        <div class="alert alert-warning">
          ⚠️ <strong>Caution:</strong> You're just above 75%. Don't miss any classes!
        </div>
      `;
    }
  }
  
  if (attendance.subjects && attendance.subjects.length > 0) {
    html += `
      <h3>📚 Subject-wise Breakdown</h3>
      <table class="subject-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Subject Code</th>
            <th>Classes</th>
            <th>Attendance %</th>
            <th>Status</th>
            <th>To Reach 75%</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    attendance.subjects.forEach((subject, index) => {
      const subPercent = parseFloat(subject.percentage);
      const subStatus = subPercent >= 75 ? 'safe' : subPercent >= 70 ? 'warning' : 'critical';
      const statusIcon = subPercent >= 75 ? '✅' : subPercent >= 70 ? '⚠️' : '❌';
      const statusText = subPercent >= 75 ? 'Safe' : subPercent >= 70 ? 'Warning' : 'Critical';
      
      // Calculate classes needed
      let toReach75 = '';
      const attended = subject.attendedClasses;
      const total = subject.totalClasses;
      
      if (subPercent >= 75) {
        toReach75 = '<span style="color: green; font-weight: bold;">✓ No need</span>';
      } else {
        const classesNeeded = Math.ceil(3 * total - 4 * attended);
        
        if (classesNeeded > 0 && classesNeeded < 1000) {
          toReach75 = `<span style="color: #ff6b6b; font-weight: bold;">Attend ${classesNeeded} class${classesNeeded !== 1 ? 'es' : ''}</span>`;
        } else if (classesNeeded <= 0) {
          toReach75 = '<span style="color: green; font-weight: bold;">✓ No need</span>';
        } else {
          toReach75 = '<span style="color: #999;">Very difficult</span>';
        }
      }
      
      html += `
        <tr class="${subStatus}">
          <td><strong>${index + 1}</strong></td>
          <td><strong>${subject.subjectCode || subject.subjectName}</strong></td>
          <td>${subject.attendedClasses} / ${subject.totalClasses}</td>
          <td><span class="subject-percentage ${subStatus}">${subPercent.toFixed(2)}%</span></td>
          <td>${statusIcon} ${statusText}</td>
          <td><small>${toReach75}</small></td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
  }
  
  container.innerHTML = html;
  container.style.display = 'block';
}

// Update Quick Stats
function updateQuickStats(attendance) {
  const percentage = parseFloat(attendance.overallPercentage);
  const subjectCount = attendance.subjects ? attendance.subjects.length : 0;
  
  document.getElementById('stat-overall').textContent = `${percentage.toFixed(1)}%`;
  document.getElementById('stat-attended').textContent = `${attendance.totalAttended}/${attendance.totalClasses}`;
  document.getElementById('stat-subjects').textContent = subjectCount;
  
  // Update stat card colors
  const statOverall = document.getElementById('stat-overall').parentElement;
  if (percentage >= 75) {
    statOverall.classList.add('success');
    statOverall.classList.remove('warning', 'danger');
  } else if (percentage >= 70) {
    statOverall.classList.add('warning');
    statOverall.classList.remove('success', 'danger');
  } else {
    statOverall.classList.add('danger');
    statOverall.classList.remove('success', 'warning');
  }
  
  document.getElementById('quick-stats').style.display = 'grid';
}

// Back Button
document.getElementById('back-btn').addEventListener('click', () => {
  loginView.style.display = 'block';
  attendanceView.style.display = 'none';
  currentStudent = null;
  currentAttendance = null;
});

// Logout Button
document.getElementById('logout-btn').addEventListener('click', () => {
  loginView.style.display = 'block';
  attendanceView.style.display = 'none';
  currentStudent = null;
  currentAttendance = null;
  showToast('Logged out successfully', 'success');
});

// Refresh Button
document.getElementById('refresh-btn').addEventListener('click', async () => {
  if (!currentStudent) return;
  
  const resultBox = document.getElementById('attendance-result');
  showLoading(resultBox);
  showToast('Refreshing attendance...', 'info');
  
  await checkAttendance(currentStudent.studentId);
});

// View History Button
document.getElementById('view-history-btn').addEventListener('click', async () => {
  if (!currentStudent) return;
  
  const historyView = document.getElementById('history-view');
  const historyContent = document.getElementById('history-content');
  const attendanceResult = document.getElementById('attendance-result');
  
  // Hide attendance result, show history
  attendanceResult.style.display = 'none';
  historyView.style.display = 'block';
  
  showLoading(historyContent);
  
  try {
    const response = await fetch(`${API_BASE}/attendance/history/${currentStudent.studentId}?limit=10`);
    const data = await response.json();
    
    if (data.success && data.records) {
      displayHistory(data.records, historyContent);
    } else {
      historyContent.innerHTML = '<div class="alert alert-info">No attendance records found.</div>';
    }
    
  } catch (error) {
    console.error('Error:', error);
    historyContent.innerHTML = '<div class="alert alert-danger">Failed to load history.</div>';
  }
});

// Display History
function displayHistory(records, container) {
  if (records.length === 0) {
    container.innerHTML = '<div class="alert alert-info">No attendance records found.</div>';
    return;
  }
  
  let html = '<h3>Recent Attendance Records</h3>';
  
  records.forEach(record => {
    const date = new Date(record.date).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    const percentage = record.status === 'success' ? parseFloat(record.overallPercentage).toFixed(2) : 'N/A';
    
    html += `
      <div class="history-item">
        <div class="history-header">
          <span class="history-date">${date}</span>
          <span class="history-status ${record.status}">${record.status.toUpperCase()}</span>
        </div>
    `;
    
    if (record.status === 'success') {
      html += `
        <div>
          <strong>Overall: </strong>${percentage}% (${record.totalAttended}/${record.totalClasses})
        </div>
        <div style="margin-top: 10px;">
          <strong>Subjects: </strong>${record.subjects.length}
        </div>
      `;
    } else {
      html += `<div class="alert alert-danger" style="margin-top: 10px;">${record.errorMessage || 'Error checking attendance'}</div>`;
    }
    
    html += '</div>';
  });
  
  container.innerHTML = html;
}

console.log('Client Portal loaded successfully');
