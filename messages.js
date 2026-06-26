// messages.js - 消息管理系统

function getCurrentUser() {
  return {
    account: localStorage.getItem('userAccount') || '',
    subject: localStorage.getItem('userSubject') || 'admin',
    displayName: localStorage.getItem('userDisplayName') || '管理员'
  };
}

function isAdminUser(user) {
  return user.subject === 'admin';
}

function isClassTeacher(user) {
  return typeof user.subject === 'string' && user.subject.startsWith('班级:');
}

function getClassTeacherLabel(user) {
  if (!isClassTeacher(user)) {
    return '';
  }
  return user.subject.replace('班级:', '');
}

function canViewStudent(user, message) {
  // Admin 可以查看所有学生
  if (isAdminUser(user)) {
    return true;
  }
  
  // 班级老师只能查看同班学生
  if (isClassTeacher(user)) {
    const userClassLabel = getClassTeacherLabel(user);
    const messageClassLabel = message.classLabel;
    return messageClassLabel === userClassLabel;
  }
  
  // 科目老师可以查看同科目学生
  const studentMajorSubject = getMajorSubject(message.studentMajor);
  const userSubject = user.subject;
  return studentMajorSubject === userSubject;
}

function getMajorSubject(major) {
  const normalized = (major || '').trim();
  const subjectMap = {
    '计算机': '计算机',
    '电子信息工程': '计算机',
    '化学': '化学',
    '物理': '物理',
    '英语': '英语',
    '数学': '数学',
    '生物': '生物'
  };
  return subjectMap[normalized] || '其他';
}

function loadAllStudentUpdates() {
  const data = localStorage.getItem('student_updates');
  return data ? JSON.parse(data) : [];
}

function getDeletedMessagesForUser(userAccount) {
  const key = `deleted_messages_${userAccount}`;
  const data = localStorage.getItem(key);
  return new Set(data ? JSON.parse(data) : []);
}

function saveDeletedMessagesForUser(userAccount, deletedIds) {
  const key = `deleted_messages_${userAccount}`;
  localStorage.setItem(key, JSON.stringify(Array.from(deletedIds)));
}

function getReadMessagesForUser(userAccount) {
  const key = `read_messages_${userAccount}`;
  const data = localStorage.getItem(key);
  return new Set(data ? JSON.parse(data) : []);
}

function saveReadMessagesForUser(userAccount, readIds) {
  const key = `read_messages_${userAccount}`;
  localStorage.setItem(key, JSON.stringify(Array.from(readIds)));
}

function deleteMessage(userAccount, messageId) {
  const deleted = getDeletedMessagesForUser(userAccount);
  deleted.add(messageId);
  saveDeletedMessagesForUser(userAccount, deleted);
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function renderMessages() {
  const user = getCurrentUser();
  if (!user.account) {
    window.location.href = './login in.html';
    return;
  }
  
  const allUpdates = loadAllStudentUpdates();
  const deletedIds = getDeletedMessagesForUser(user.account);
  const readIds = getReadMessagesForUser(user.account);
  const container = document.querySelector('#messagesContainer');
  
  // 过滤消息：1. 只显示用户有权限查看的学生  2. 排除已删除的消息  3. 排除用户自己的操作
  const visibleMessages = allUpdates.filter(message => {
    if (deletedIds.has(message.id)) {
      return false; // 已被用户删除
    }
    if (message.updatedBy === user.account) {
      return false; // 是用户自己的操作
    }
    return canViewStudent(user, message);
  });
  
  if (visibleMessages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">暂无消息</div>
      </div>
    `;
    return;
  }
  
  // 按时间倒序排列（最新的在前）
  const sortedMessages = [...visibleMessages].sort((a, b) => b.timestamp - a.timestamp);
  
  container.innerHTML = sortedMessages.map(message => {
    const isRead = readIds.has(message.id);
    const unreadClass = isRead ? '' : 'unread';
    
    const changesHtml = message.changes && message.changes.length > 0
      ? message.changes.map(change => `
          <div class="change-item">
            <span class="change-action">[${change.action}]</span>
            ${change.date ? `日期：${change.date} | ` : ''}对象：${change.target || '无'} | 内容：${change.content || '无'}
          </div>
        `).join('')
      : '<div style="color: #999; font-size: 0.9rem;">学生信息已修改</div>';
    
    return `
      <div class="message-item ${unreadClass}" data-message-id="${message.id}">
        <div class="message-header">
          <div>
            <div class="message-title">
              📝 ${message.studentName || '未知学生'} (${message.studentGrade}年级 ${message.studentMajor}) - 信息修改通知
            </div>
          </div>
          <div class="message-time">${formatTime(message.timestamp)}</div>
        </div>
        <div class="message-content">
          <strong>${message.updatedByName || '未知用户'}</strong> 在 <strong>${formatTime(message.timestamp)}</strong> 修改了以下内容：
        </div>
        <div>
          ${changesHtml}
        </div>
        <div class="message-actions">
          <button class="read-btn ${isRead ? 'already-read' : ''}" onclick="markAsRead('${message.id}')" ${isRead ? 'disabled' : ''}>
            ${isRead ? '✓ 已读' : '标记已读'}
          </button>
          <button class="delete-btn" onclick="deleteAndRefresh('${message.id}')">删除消息</button>
        </div>
      </div>
    `;
  }).join('');
}

function markAsRead(messageId) {
  const user = getCurrentUser();
  const readIds = getReadMessagesForUser(user.account);
  readIds.add(messageId);
  saveReadMessagesForUser(user.account, readIds);
  
  // 触发 storage 事件通知其他标签页更新
  window.dispatchEvent(new StorageEvent('storage', {
    key: `read_messages_${user.account}`,
    oldValue: null,
    newValue: null,
    storageArea: localStorage
  }));
  
  renderMessages();
}

function deleteAndRefresh(messageId) {
  const user = getCurrentUser();
  deleteMessage(user.account, messageId);
  // 触发 storage 事件通知其他标签页更新
  window.dispatchEvent(new StorageEvent('storage', {
    key: `deleted_messages_${user.account}`,
    oldValue: null,
    newValue: null,
    storageArea: localStorage
  }));
  renderMessages();
}

document.addEventListener('DOMContentLoaded', () => {
  renderMessages();
  
  // 监听其他标签页的消息更新
  window.addEventListener('storage', (event) => {
    if (event.key === 'student_updates' || event.key && event.key.startsWith('deleted_messages_') || event.key && event.key.startsWith('read_messages_')) {
      renderMessages();
    }
  });
});
