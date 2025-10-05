// API Base URL
const API_BASE = '/api';

// DOM Elements
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');
const toast = document.getElementById('toast');

// Navigation
navButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetSection = button.dataset.section;
    
    // Update active states
    navButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    sections.forEach(section => {
      section.classList.remove('active');
      if (section.id === `${targetSection}-section`) {
        section.classList.add('active');
      }
    });
  });
});

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

// Registration Form
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('reg-student-id').value.trim();
  const name = document.getElementById('reg-name').value.trim();
  const password = document.getElementById('reg-password').value;
  const telegramChatId = document.getElementById('reg-telegram-chat-id').value.trim();
  const telegramUsername = document.getElementById('reg-telegram-username').value.trim();
  const telegramNotif = document.getElementById('reg-telegram-notif').checked;
  
  try {
    const response = await fetch(`${API_BASE}/students/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentId,
        name,
        password,
        telegramChatId,
        telegramUsername,
        notifications: {
          telegram: telegramNotif
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Registration successful! You will receive attendance updates daily via Telegram.', 'success');
      document.getElementById('register-form').reset();
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error. Please try again.', 'error');
  }
});

// Check Attendance Form
document.getElementById('check-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('check-student-id').value.trim();
  const resultBox = document.getElementById('attendance-result');
  
  if (!studentId) {
    showToast('Please enter student ID', 'warning');
    return;
  }
  
  showLoading(resultBox);
  
  try {
    const response = await fetch(`${API_BASE}/attendance/check/${studentId}`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success && data.data.attendance) {
      displayAttendance(data.data.attendance, resultBox);
      showToast('Attendance checked successfully!', 'success');
    } else {
      // Enhanced error display
      let errorMsg = 'Failed to check attendance';
      let errorDetails = '';
      
      if (data.error) {
        errorMsg = data.error;
      } else if (data.message) {
        errorMsg = data.message;
      }
      
      // Provide helpful suggestions based on error type
      if (errorMsg.includes('not found')) {
        errorDetails = '<br><small>Please make sure you are registered first. Go to the "Register" tab to create an account.</small>';
      } else if (errorMsg.includes('login') || errorMsg.includes('Login')) {
        errorDetails = '<br><small>There was an issue logging into the attendance portal. Please verify your credentials are correct.</small>';
      } else if (errorMsg.includes('inactive')) {
        errorDetails = '<br><small>Your account is inactive. Go to "Manage Account" to activate it.</small>';
      } else if (errorMsg.includes('Network') || errorMsg.includes('timeout')) {
        errorDetails = '<br><small>Network connection issue. Please check your internet connection and try again.</small>';
      }
      
      resultBox.innerHTML = `
        <div class="alert alert-danger">
          <strong>❌ Error:</strong> ${errorMsg}
          ${errorDetails}
        </div>
        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <strong>💡 Troubleshooting Tips:</strong>
          <ul style="margin-top: 10px; margin-bottom: 0;">
            <li>Verify your student ID is correct (e.g., 23691A3305)</li>
            <li>Make sure you're registered in the system</li>
            <li>Check if your account is active</li>
            <li>Ensure your MITS portal credentials are up to date</li>
            <li>Try again in a few moments</li>
          </ul>
        </div>
      `;
      resultBox.style.display = 'block';
      showToast('Failed to check attendance', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    resultBox.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Network Error:</strong> Unable to connect to the server.
        <br><small>Please check your internet connection and try again.</small>
      </div>
    `;
    resultBox.style.display = 'block';
    showToast('Network error', 'error');
  }
});

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
  
  // Add attendance insights if available
  if (attendance.insights) {
    html += `
      <div class="attendance-insights" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
        <h4>🎯 Attendance Insights</h4>
        <div style="margin-top: 10px;">
          <strong>Status:</strong> ${attendance.insights.overallStatus}
        </div>
    `;
    
    if (attendance.insights.isSufficient) {
      html += `
        <div style="margin-top: 8px; color: #155724;">
          ✅ You can miss up to <strong>${attendance.insights.canMiss}</strong> consecutive classes and still maintain 75% attendance.
        </div>
      `;
    } else {
      if (attendance.insights.needToAttend > 0) {
        html += `
          <div style="margin-top: 8px; color: #721c24;">
            ⚠️ You need to attend <strong>${attendance.insights.needToAttend}</strong> consecutive classes to reach 75% attendance.
          </div>
        `;
      } else {
        html += `
          <div style="margin-top: 8px; color: #721c24;">
            ⚠️ It may be very difficult to reach the required 75% attendance. Please attend all future classes.
          </div>
        `;
      }
    }
    
    html += `</div>`;
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
      const subStatus = subject.status || (subPercent >= 75 ? 'safe' : subPercent >= 70 ? 'warning' : 'critical');
      const statusIcon = subPercent >= 75 ? '✅' : subPercent >= 70 ? '⚠️' : '❌';
      const statusText = subPercent >= 75 ? 'Safe' : subPercent >= 70 ? 'Warning' : 'Critical';
      
      // Calculate classes needed to reach 75%
      let toReach75 = '';
      const attended = subject.attendedClasses;
      const total = subject.totalClasses;
      const targetPercent = 75;
      
      if (subPercent >= targetPercent) {
        // Already at or above 75%
        toReach75 = '<span style="color: green; font-weight: bold;">✓ No need</span>';
      } else {
        // Need to attend more classes to reach 75%
        // Formula: (attended + x) / (total + x) >= 0.75
        // Solving: attended + x >= 0.75 * (total + x)
        //          attended + x >= 0.75*total + 0.75*x
        //          x - 0.75*x >= 0.75*total - attended
        //          0.25*x >= 0.75*total - attended
        //          x >= (0.75*total - attended) / 0.25
        //          x >= 3*total - 4*attended
        
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
  
  // Add alert with mean attendance
  if (percentage < 70) {
    html += `<div class="alert alert-danger">
      ⚠️ <strong>Critical!</strong> Your mean attendance is <strong>${percentage.toFixed(2)}%</strong> (below 70%). 
      Please attend classes regularly to avoid academic issues!
    </div>`;
  } else if (percentage < 75) {
    html += `<div class="alert alert-warning">
      ⚠️ <strong>Warning!</strong> Your mean attendance is <strong>${percentage.toFixed(2)}%</strong> (between 70-75%). 
      Try to maintain above 75% to be safe.
    </div>`;
  } else {
    html += `<div class="alert alert-success">
      ✅ <strong>Excellent!</strong> Your mean attendance is <strong>${percentage.toFixed(2)}%</strong> (above 75%). 
      Keep up the good work!
    </div>`;
  }
  
  container.innerHTML = html;
  container.style.display = 'block';
}

// History Form
document.getElementById('history-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('history-student-id').value.trim();
  const resultBox = document.getElementById('history-result');
  
  showLoading(resultBox);
  
  try {
    const response = await fetch(`${API_BASE}/attendance/history/${studentId}?limit=10`);
    const data = await response.json();
    
    if (data.success && data.records) {
      displayHistory(data.records, resultBox);
    } else {
      resultBox.innerHTML = '<div class="alert alert-info">No attendance records found.</div>';
      resultBox.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Error:', error);
    resultBox.innerHTML = '<div class="alert alert-danger">Network error. Please try again.</div>';
    resultBox.style.display = 'block';
  }
});

// Display History
function displayHistory(records, container) {
  if (records.length === 0) {
    container.innerHTML = '<div class="alert alert-info">No attendance records found.</div>';
    container.style.display = 'block';
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
      
      // Notifications
      const notifSent = [];
      if (record.notificationsSent.telegram) notifSent.push('� Telegram');
      
      if (notifSent.length > 0) {
        html += `<div style="margin-top: 5px; color: #666;"><small>Sent: ${notifSent.join(', ')}</small></div>`;
      }
    } else {
      html += `<div class="alert alert-danger" style="margin-top: 10px;">${record.errorMessage || 'Error checking attendance'}</div>`;
    }
    
    html += '</div>';
  });
  
  container.innerHTML = html;
  container.style.display = 'block';
}

// ========== MANAGE ACCOUNTS SECTION ==========

/**
 * Load All Accounts Button
 */
document.getElementById('load-all-accounts-btn').addEventListener('click', async () => {
  await loadAllAccounts();
});

/**
 * Refresh Accounts Button
 */
document.getElementById('refresh-accounts-btn').addEventListener('click', async () => {
  await loadAllAccounts();
  showToast('Accounts refreshed', 'success');
});

/**
 * Load and display all student accounts
 */
async function loadAllAccounts() {
  const listContainer = document.getElementById('all-accounts-list');
  const refreshBtn = document.getElementById('refresh-accounts-btn');
  
  listContainer.innerHTML = '<div class="spinner"></div>';
  listContainer.style.display = 'block';
  
  try {
    const response = await fetch(`${API_BASE}/students`);
    const data = await response.json();
    
    if (!data.success || !data.students || data.students.length === 0) {
      listContainer.innerHTML = `
        <div class="alert alert-info">
          <strong>ℹ️ No Accounts Found</strong><br>
          No registered students found in the system.
        </div>
      `;
      return;
    }
    
    const students = data.students;
    
    // Sort by student ID
    students.sort((a, b) => a.studentId.localeCompare(b.studentId));
    
    let html = `
      <div style="margin-bottom: 15px;">
        <strong>Total Accounts: ${students.length}</strong>
      </div>
      <div style="overflow-x: auto;">
        <table class="subject-table" style="width: 100%; font-size: 14px;">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Student ID</th>
              <th>Name</th>
              <th>Telegram</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: center;">Notifications</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    students.forEach((student, index) => {
      const statusBadge = student.isActive 
        ? '<span style="background: #4CAF50; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">✅ Active</span>'
        : '<span style="background: #999; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">❌ Inactive</span>';
      
      const telegramBadge = student.notifications && student.notifications.telegram
        ? '<span style="color: #4CAF50; font-weight: bold;">✅ ON</span>'
        : '<span style="color: #999;">❌ OFF</span>';
      
      const telegramInfo = student.telegramChatId 
        ? `${student.telegramChatId}${student.telegramUsername ? ' (@' + student.telegramUsername.replace('@', '') + ')' : ''}`
        : 'Not set';
      
      html += `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td><strong>${index + 1}</strong></td>
          <td><strong>${student.studentId}</strong></td>
          <td>${student.name || '-'}</td>
          <td style="font-size: 12px; color: #666;">${telegramInfo}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">${telegramBadge}</td>
          <td style="text-align: center;">
            <button 
              class="btn btn-sm" 
              onclick="editAccount('${student.studentId}')"
              style="background: #2196F3; color: white; padding: 5px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
              title="Edit Account">
              ✏️ Edit
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    listContainer.innerHTML = html;
    refreshBtn.style.display = 'inline-block';
    
  } catch (error) {
    console.error('Error loading accounts:', error);
    listContainer.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Error:</strong> Failed to load accounts.<br>
        <small>${error.message}</small>
      </div>
    `;
    showToast('Failed to load accounts', 'error');
  }
}

/**
 * Edit account - Load student details into form
 */
async function editAccount(studentId) {
  try {
    const response = await fetch(`${API_BASE}/students/${studentId}`);
    const data = await response.json();
    
    if (data.success && data.student) {
      const student = data.student;
      
      // Populate form
      document.getElementById('update-student-id').value = student.studentId;
      document.getElementById('editing-student-id').textContent = student.studentId;
      document.getElementById('update-name').value = student.name || '';
      document.getElementById('update-telegram-chat-id').value = student.telegramChatId || '';
      document.getElementById('update-telegram-username').value = student.telegramUsername || '';
      document.getElementById('update-password').value = '';
      document.getElementById('update-telegram-notif').checked = student.notifications.telegram;
      document.getElementById('update-active').checked = student.isActive;
      
      // Show edit form
      document.getElementById('account-details').style.display = 'block';
      
      // Scroll to form
      document.getElementById('account-details').scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      showToast(`Editing account: ${student.studentId}`, 'success');
    } else {
      showToast(data.message || 'Student not found', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error', 'error');
  }
}

// Make editAccount globally accessible
window.editAccount = editAccount;

/**
 * Cancel Edit Button
 */
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('account-details').style.display = 'none';
  document.getElementById('update-form').reset();
  showToast('Edit cancelled', 'info');
});

// Manage Account - Update
document.getElementById('update-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('update-student-id').value.trim();
  
  if (!studentId) {
    showToast('No student ID selected', 'warning');
    return;
  }
  
  const name = document.getElementById('update-name').value.trim();
  const telegramChatId = document.getElementById('update-telegram-chat-id').value.trim();
  const telegramUsername = document.getElementById('update-telegram-username').value.trim();
  const password = document.getElementById('update-password').value;
  const telegramNotif = document.getElementById('update-telegram-notif').checked;
  const isActive = document.getElementById('update-active').checked;
  
  const updateData = {
    name,
    telegramChatId,
    telegramUsername,
    notifications: {
      telegram: telegramNotif
    },
    isActive
  };
  
  if (password) {
    updateData.password = password;
  }
  
  try {
    const response = await fetch(`${API_BASE}/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Account updated successfully', 'success');
      document.getElementById('update-password').value = '';
      
      // Refresh the accounts list
      await loadAllAccounts();
      
      // Hide edit form
      document.getElementById('account-details').style.display = 'none';
    } else {
      showToast(data.message || 'Update failed', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error', 'error');
  }
});

// Manage Account - Delete
document.getElementById('delete-account-btn').addEventListener('click', async () => {
  const studentId = document.getElementById('update-student-id').value.trim();
  
  if (!studentId) {
    showToast('No student ID selected', 'warning');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete account ${studentId}? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/students/${studentId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Account deleted successfully', 'success');
      
      // Hide edit form
      document.getElementById('account-details').style.display = 'none';
      document.getElementById('update-form').reset();
      
      // Refresh the accounts list
      await loadAllAccounts();
    } else {
      showToast(data.message || 'Delete failed', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error', 'error');
  }
});

// ========== SETTINGS SECTION ==========

// Load scheduler status
async function loadSchedulerStatus() {
  try {
    const response = await fetch(`${API_BASE}/scheduler/status`);
    const data = await response.json();
    
    if (data.success && data.status) {
      const status = data.status;
      
      // Update UI
      document.getElementById('current-check-time').textContent = status.checkTime;
      document.getElementById('current-timezone').textContent = status.timezone;
      document.getElementById('active-tasks').textContent = status.activeTasks;
      
      // Format next run time
      if (status.nextRun) {
        const nextRun = new Date(status.nextRun);
        const formatted = nextRun.toLocaleString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        document.getElementById('next-run').textContent = formatted;
      } else {
        document.getElementById('next-run').textContent = 'Not scheduled';
      }
      
      // Set form values
      document.getElementById('attendance-check-time').value = status.checkTime;
      document.getElementById('enable-scheduler').checked = status.isRunning;
      
    } else {
      showToast('Failed to load scheduler status', 'error');
    }
  } catch (error) {
    console.error('Error loading scheduler status:', error);
    showToast('Network error loading status', 'error');
  }
}

// Load system statistics
async function loadSystemStats() {
  try {
    console.log('Fetching system stats from /api/stats...');
    const response = await fetch(`${API_BASE}/stats`);
    console.log('Stats response status:', response.status);
    
    const data = await response.json();
    console.log('Stats data received:', data);
    
    if (data.success && data.stats) {
      const stats = data.stats;
      
      // Update UI
      document.getElementById('total-students').textContent = stats.totalStudents;
      document.getElementById('active-students').textContent = stats.activeStudents;
      document.getElementById('inactive-students').textContent = stats.inactiveStudents;
      document.getElementById('telegram-enabled').textContent = stats.telegramEnabled;
      
      console.log('Stats UI updated successfully');
    } else {
      console.error('Failed to load system statistics:', data.message);
      // Set to 0 if failed
      document.getElementById('total-students').textContent = '0';
      document.getElementById('active-students').textContent = '0';
      document.getElementById('inactive-students').textContent = '0';
      document.getElementById('telegram-enabled').textContent = '0';
      
      if (data.message) {
        showToast(`Stats error: ${data.message}`, 'warning');
      }
    }
  } catch (error) {
    console.error('Error loading system statistics:', error);
    // Set to 0 on error
    document.getElementById('total-students').textContent = '0';
    document.getElementById('active-students').textContent = '0';
    document.getElementById('inactive-students').textContent = '0';
    document.getElementById('telegram-enabled').textContent = '0';
    
    showToast('Unable to load statistics. Check console for details.', 'error');
  }
}

// Settings Form Submit
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const checkTime = document.getElementById('attendance-check-time').value;
  const enabled = document.getElementById('enable-scheduler').checked;
  
  if (!checkTime) {
    showToast('Please select a check time', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/scheduler/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        checkTime,
        enabled
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(`Settings updated! Daily check will run at ${checkTime}`, 'success');
      loadSchedulerStatus(); // Refresh status
    } else {
      showToast(data.message || 'Failed to update settings', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error', 'error');
  }
});

// Refresh Status Button
document.getElementById('refresh-status-btn').addEventListener('click', () => {
  loadSchedulerStatus();
  loadSystemStats();
  showToast('Status refreshed', 'success');
});

// Test Scheduler Button
document.getElementById('test-scheduler-btn').addEventListener('click', async () => {
  const testBtn = document.getElementById('test-scheduler-btn');
  const testResult = document.getElementById('test-result');
  
  // Disable button and show loading
  testBtn.disabled = true;
  testBtn.textContent = '⏳ Running test...';
  testResult.innerHTML = '<div class="spinner"></div>';
  testResult.style.display = 'block';
  
  try {
    const response = await fetch(`${API_BASE}/scheduler/test`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      testResult.innerHTML = `
        <div class="alert alert-success">
          <strong>✅ Test Completed Successfully!</strong>
          <div style="margin-top: 10px;">
            <strong>Total Students:</strong> ${data.result.total}<br>
            <strong>Success:</strong> ${data.result.successCount}<br>
            <strong>Failed:</strong> ${data.result.failCount}<br>
            <strong>Time:</strong> ${new Date(data.result.timestamp).toLocaleString()}
          </div>
        </div>
      `;
      showToast('Test completed successfully', 'success');
    } else {
      testResult.innerHTML = `
        <div class="alert alert-danger">
          <strong>❌ Test Failed</strong><br>
          ${data.message || 'Unknown error'}
        </div>
      `;
      showToast('Test failed', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    testResult.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Network Error</strong><br>
        Unable to run test. Please try again.
      </div>
    `;
    showToast('Network error', 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '▶️ Run Test Check';
  }
});

// Load scheduler status when settings section becomes active
const settingsNavBtn = document.querySelector('.nav-btn[data-section="settings"]');
if (settingsNavBtn) {
  settingsNavBtn.addEventListener('click', () => {
    loadSchedulerStatus();
    loadSystemStats();
  });
}

// ========== CALCULATE ALL STUDENTS FUNCTIONALITY ==========

/**
 * Calculate All Button - Triggers attendance check for all students
 */
document.getElementById('calculate-all-btn').addEventListener('click', async () => {
  const calculateBtn = document.getElementById('calculate-all-btn');
  const viewBtn = document.getElementById('view-all-btn');
  const resultBox = document.getElementById('all-attendance-result');
  
  if (!confirm('This will check attendance for ALL registered students. This may take several minutes. Continue?')) {
    return;
  }
  
  // Disable button and show loading
  calculateBtn.disabled = true;
  calculateBtn.textContent = '⏳ Calculating... This may take a while';
  resultBox.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div class="spinner"></div>
      <p style="margin-top: 20px; font-size: 16px; color: #666;">
        Checking attendance for all students...<br>
        <small>This process may take several minutes depending on the number of students.</small>
      </p>
    </div>
  `;
  resultBox.style.display = 'block';
  
  try {
    const response = await fetch(`${API_BASE}/attendance/check-all`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Attendance check started! Fetching results...', 'success');
      
      // Wait a bit for the checks to complete, then fetch all students
      setTimeout(async () => {
        await displayAllStudentsAttendance(resultBox);
        viewBtn.style.display = 'inline-block'; // Show view button
      }, 3000); // Wait 3 seconds before first fetch
      
    } else {
      resultBox.innerHTML = `
        <div class="alert alert-danger">
          <strong>❌ Error:</strong> ${data.message || 'Failed to start attendance check'}
        </div>
      `;
      showToast('Failed to start attendance check', 'error');
    }
    
  } catch (error) {
    console.error('Error:', error);
    resultBox.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Network Error:</strong> Unable to connect to the server.
      </div>
    `;
    showToast('Network error', 'error');
  } finally {
    calculateBtn.disabled = false;
    calculateBtn.textContent = '📊 Calculate All Students';
  }
});

/**
 * View All Button - Shows all students without recalculating
 */
document.getElementById('view-all-btn').addEventListener('click', async () => {
  const resultBox = document.getElementById('all-attendance-result');
  showLoading(resultBox);
  await displayAllStudentsAttendance(resultBox);
});

/**
 * Display all students with their attendance
 */
async function displayAllStudentsAttendance(container) {
  try {
    const response = await fetch(`${API_BASE}/attendance/all-students`);
    const data = await response.json();
    
    if (!data.success || !data.students || data.students.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <strong>ℹ️ No Students Found</strong><br>
          No registered students found in the system.
        </div>
      `;
      container.style.display = 'block';
      return;
    }
    
    const students = data.students;
    
    // Sort students by attendance percentage (lowest first to highlight critical cases)
    students.sort((a, b) => {
      const aPercent = a.attendance ? parseFloat(a.attendance.overallPercentage) : 0;
      const bPercent = b.attendance ? parseFloat(b.attendance.overallPercentage) : 0;
      return aPercent - bPercent;
    });
    
    // Calculate statistics
    const totalStudents = students.length;
    const withAttendance = students.filter(s => s.attendance).length;
    const criticalStudents = students.filter(s => s.attendance && parseFloat(s.attendance.overallPercentage) < 70).length;
    const warningStudents = students.filter(s => s.attendance && parseFloat(s.attendance.overallPercentage) >= 70 && parseFloat(s.attendance.overallPercentage) < 75).length;
    const safeStudents = students.filter(s => s.attendance && parseFloat(s.attendance.overallPercentage) >= 75).length;
    
    let html = `
      <div style="margin-bottom: 20px;">
        <h3>📊 Overall Statistics</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">Total Students</div>
            <div style="font-size: 32px; font-weight: bold;">${totalStudents}</div>
          </div>
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">❌ Critical (<70%)</div>
            <div style="font-size: 32px; font-weight: bold;">${criticalStudents}</div>
          </div>
          <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">⚠️ Warning (70-75%)</div>
            <div style="font-size: 32px; font-weight: bold;">${warningStudents}</div>
          </div>
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">✅ Safe (≥75%)</div>
            <div style="font-size: 32px; font-weight: bold;">${safeStudents}</div>
          </div>
        </div>
      </div>
      
      <h3>👥 Student Details (${totalStudents} students)</h3>
      <div style="margin-top: 15px;">
    `;
    
    students.forEach((student, index) => {
      const attendance = student.attendance;
      
      if (!attendance) {
        // No attendance data
        html += `
          <div class="student-card" style="background: #f8f9fa; border-left: 4px solid #999; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 16px;">${index + 1}. ${student.name || student.studentId}</strong>
                <div style="color: #666; font-size: 14px; margin-top: 5px;">ID: ${student.studentId}</div>
              </div>
              <div style="text-align: right;">
                <span style="background: #e0e0e0; color: #666; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                  No Data
                </span>
                <div style="color: #999; font-size: 12px; margin-top: 5px;">
                  ${student.isActive ? '🟢 Active' : '🔴 Inactive'}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        const percentage = parseFloat(attendance.overallPercentage);
        let statusClass = 'safe';
        let statusIcon = '✅';
        let statusText = 'Safe';
        let borderColor = '#4CAF50';
        let bgGradient = 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
        
        if (percentage < 70) {
          statusClass = 'critical';
          statusIcon = '❌';
          statusText = 'Critical';
          borderColor = '#f44336';
          bgGradient = 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
        } else if (percentage < 75) {
          statusClass = 'warning';
          statusIcon = '⚠️';
          statusText = 'Warning';
          borderColor = '#FF9800';
          bgGradient = 'linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)';
        }
        
        const lastCheckDate = new Date(attendance.date).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        html += `
          <div class="student-card" style="background: ${bgGradient}; border-left: 4px solid ${borderColor}; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <strong style="font-size: 16px;">${index + 1}. ${student.name || student.studentId}</strong>
                  <span style="font-size: 12px; color: #666;">${student.isActive ? '🟢 Active' : '🔴 Inactive'}</span>
                </div>
                <div style="color: #666; font-size: 14px; margin-top: 5px;">ID: ${student.studentId}</div>
                <div style="margin-top: 10px; display: flex; gap: 20px; flex-wrap: wrap;">
                  <div>
                    <div style="font-size: 12px; color: #666;">Classes</div>
                    <div style="font-size: 16px; font-weight: bold;">${attendance.totalAttended} / ${attendance.totalClasses}</div>
                  </div>
                  <div>
                    <div style="font-size: 12px; color: #666;">Subjects</div>
                    <div style="font-size: 16px; font-weight: bold;">${attendance.subjects ? attendance.subjects.length : 0}</div>
                  </div>
                  <div>
                    <div style="font-size: 12px; color: #666;">Last Checked</div>
                    <div style="font-size: 12px; font-weight: bold;">${lastCheckDate}</div>
                  </div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 36px; font-weight: bold; color: ${borderColor};">${percentage.toFixed(1)}%</div>
                <div style="margin-top: 5px;">
                  <span style="background: ${borderColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                    ${statusIcon} ${statusText}
                  </span>
                </div>
              </div>
            </div>
            
            ${attendance.subjects && attendance.subjects.length > 0 ? `
              <details style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,0.1);">
                <summary style="cursor: pointer; font-weight: bold; font-size: 14px;">
                  📚 View ${attendance.subjects.length} Subjects
                </summary>
                <div style="margin-top: 10px; max-height: 300px; overflow-y: auto;">
                  <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                    <thead>
                      <tr style="background: rgba(0,0,0,0.05);">
                        <th style="padding: 8px; text-align: left;">Subject</th>
                        <th style="padding: 8px; text-align: center;">Classes</th>
                        <th style="padding: 8px; text-align: center;">%</th>
                        <th style="padding: 8px; text-align: center;">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${attendance.subjects.map(subject => {
                        const subPercent = parseFloat(subject.percentage);
                        const subIcon = subPercent >= 75 ? '✅' : subPercent >= 70 ? '⚠️' : '❌';
                        const subColor = subPercent >= 75 ? '#4CAF50' : subPercent >= 70 ? '#FF9800' : '#f44336';
                        return `
                          <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <td style="padding: 8px;"><strong>${subject.subjectCode || subject.subjectName}</strong></td>
                            <td style="padding: 8px; text-align: center;">${subject.attendedClasses}/${subject.totalClasses}</td>
                            <td style="padding: 8px; text-align: center; font-weight: bold; color: ${subColor};">${subPercent.toFixed(1)}%</td>
                            <td style="padding: 8px; text-align: center;">${subIcon}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </details>
            ` : ''}
          </div>
        `;
      }
    });
    
    html += `</div>`;
    
    // Add summary message
    if (criticalStudents > 0) {
      html += `
        <div class="alert alert-danger" style="margin-top: 20px;">
          <strong>⚠️ Attention Required!</strong><br>
          ${criticalStudents} student${criticalStudents !== 1 ? 's have' : ' has'} critical attendance (<70%). 
          Please ensure they attend classes regularly.
        </div>
      `;
    } else if (warningStudents > 0) {
      html += `
        <div class="alert alert-warning" style="margin-top: 20px;">
          <strong>⚠️ Monitor Closely!</strong><br>
          ${warningStudents} student${warningStudents !== 1 ? 's have' : ' has'} attendance between 70-75%. 
          Encourage regular attendance.
        </div>
      `;
    } else if (safeStudents === totalStudents && totalStudents > 0) {
      html += `
        <div class="alert alert-success" style="margin-top: 20px;">
          <strong>✅ Excellent!</strong><br>
          All students have attendance above 75%. Keep up the great work!
        </div>
      `;
    }
    
    container.innerHTML = html;
    container.style.display = 'block';
    showToast(`Loaded attendance for ${totalStudents} students`, 'success');
    
  } catch (error) {
    console.error('Error fetching all students:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <strong>❌ Error:</strong> Failed to load student data.<br>
        <small>${error.message}</small>
      </div>
    `;
    container.style.display = 'block';
    showToast('Failed to load student data', 'error');
  }
}
