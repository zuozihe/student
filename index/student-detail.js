function getQueryParam(name) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(name) || '';
}

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

function getDisplaySubject(user) {
  if (isAdminUser(user)) {
    return '所有学科';
  }
  if (isClassTeacher(user)) {
    return `本班级：${getClassTeacherLabel(user)}`;
  }
  return user.subject;
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

function getClassCountByGrade(grade) {
  const normalized = String(grade).trim();
  if (normalized === '9') {
    return 4;
  }
  if (['6', '7', '8'].includes(normalized)) {
    return 5;
  }
  return 5;
}

function getStableHash(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getClassLabelForStudent(student) {
  const classCount = getClassCountByGrade(student.grade);
  const seed = student.id || student.name || '';
  const classNumber = (getStableHash(seed) % classCount) + 1;
  return `${student.grade}年级${classNumber}班`;
}

function getConversationStorageKey(studentId) {
  return `student_conversation_${studentId}`;
}

function getConversationNotifyKey(studentId) {
  return `conversation_update_${studentId}`;
}

function getHonorStorageKey(studentId) {
  return `student_honor_${studentId}`;
}

function getHonorNotifyKey(studentId) {
  return `honor_update_${studentId}`;
}

function getHonorSummary(honorText, honorRecords = []) {
  const records = normalizeHonorRecords(honorRecords);
  const firstHonor = records.find(record => (record.honor || '').trim());
  if (firstHonor) {
    return firstHonor.honor;
  }
  if (Array.isArray(honorText)) {
    return honorText.find(item => String(item || '').trim()) || '';
  }
  const text = String(honorText || '').trim();
  if (!text) {
    return '';
  }
  const parts = text.split(/[,;；、|]/).map(part => part.trim()).filter(Boolean);
  return parts[0] || text;
}

function getDefaultHonorRecords() {
  return [
    { date: '', honor: '' },
    { date: '', honor: '' },
    { date: '', honor: '' }
  ];
}

function normalizeHonorRecords(records) {
  return (records || []).filter(record => {
    return (record.date || '').trim() !== '' || (record.honor || '').trim() !== '';
  }).map(record => ({
    date: (record.date || '').trim(),
    honor: (record.honor || '').trim()
  }));
}

function getHonorChangeEntries(oldRecords, newRecords) {
  const before = normalizeHonorRecords(oldRecords);
  const after = normalizeHonorRecords(newRecords);
  const changes = [];
  const maxLength = Math.max(before.length, after.length);

  for (let i = 0; i < maxLength; i++) {
    const oldRec = before[i];
    const newRec = after[i];
    if (oldRec && !newRec) {
      changes.push({
        action: '删除',
        date: oldRec.date,
        target: '荣誉',
        content: oldRec.honor
      });
    } else if (!oldRec && newRec) {
      changes.push({
        action: '新增',
        date: newRec.date,
        target: '荣誉',
        content: newRec.honor
      });
    } else if (oldRec && newRec) {
      if (oldRec.date !== newRec.date || oldRec.honor !== newRec.honor) {
        changes.push({
          action: '更新',
          date: newRec.date,
          target: '荣誉',
          content: newRec.honor,
          before: oldRec,
          after: newRec
        });
      }
    }
  }
  return changes;
}

let originalHonorRecords = [];
let originalConversationRecords = [];
let originalRadarScores = [];
const radarLabels = ['学习能力', '创业思维', '人文思维', '服务思维', '语言能力'];

function getRadarStorageKey(studentId) {
  return `student_radar_${studentId}`;
}

function loadRadarScores(studentId) {
  const stored = localStorage.getItem(getRadarStorageKey(studentId));
  if (!stored) {
    return [3, 3, 3, 3, 3];
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length !== radarLabels.length) {
      return [3, 3, 3, 3, 3];
    }
    return parsed.map(value => parseFloat(value) || 3);
  } catch (e) {
    return [3, 3, 3, 3, 3];
  }
}

function saveRadarScores(studentId, scores) {
  localStorage.setItem(getRadarStorageKey(studentId), JSON.stringify(scores));
}

function isSameRadarScores(oldScores, newScores) {
  if (oldScores.length !== newScores.length) {
    return false;
  }
  return oldScores.every((value, index) => Number(value) === Number(newScores[index]));
}

function getDefaultConversationRecords() {
  return [
    { date: '', target: '', content: '' },
    { date: '', target: '', content: '' },
    { date: '', target: '', content: '' }
  ];
}

function normalizeConversationRecords(records) {
  return (records || []).filter(record => {
    return (record.date || '').trim() !== ''
      || (record.target || '').trim() !== ''
      || (record.content || '').trim() !== '';
  }).map(record => ({
    date: (record.date || '').trim(),
    target: (record.target || '').trim(),
    content: (record.content || '').trim()
  }));
}

function isSameConversationRecords(oldRecords, newRecords) {
  const normalizedOld = normalizeConversationRecords(oldRecords);
  const normalizedNew = normalizeConversationRecords(newRecords);
  if (normalizedOld.length !== normalizedNew.length) {
    return false;
  }
  return normalizedOld.every((oldRecord, index) => {
    const newRecord = normalizedNew[index] || {};
    return oldRecord.date === newRecord.date
      && oldRecord.target === newRecord.target
      && oldRecord.content === newRecord.content;
  });
}

function isSamePayload(oldPayload, newPayload) {
  return oldPayload.grade === newPayload.grade
    && oldPayload.major === newPayload.major
    && oldPayload.honor === newPayload.honor
    && oldPayload.status === newPayload.status;
}

function loadConversationRecords(studentId) {
  const stored = localStorage.getItem(getConversationStorageKey(studentId));
  if (!stored) {
    return getDefaultConversationRecords();
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return getDefaultConversationRecords();
    }
    return parsed.length > 0 ? parsed : getDefaultConversationRecords();
  } catch (e) {
    return getDefaultConversationRecords();
  }
}

function getHonorStorageKey(studentId) {
  return `student_honor_${studentId}`;
}

function getHonorNotifyKey(studentId) {
  return `honor_update_${studentId}`;
}

function loadHonorRecords(studentId) {
  const stored = localStorage.getItem(getHonorStorageKey(studentId));
  if (!stored) {
    return getDefaultHonorRecords();
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return getDefaultHonorRecords();
    }
    return parsed.length > 0 ? parsed : getDefaultHonorRecords();
  } catch (e) {
    return getDefaultHonorRecords();
  }
}

function saveHonorRecords(studentId, records, changes) {
  localStorage.setItem(getHonorStorageKey(studentId), JSON.stringify(records));
  appendConversationHistory(studentId, changes);
  localStorage.setItem(getHonorNotifyKey(studentId), JSON.stringify({
    timestamp: Date.now(),
    updatedBy: getCurrentUser().displayName || getCurrentUser().account
  }));
}

function renderHonorRecords(records) {
  const tbody = document.querySelector('#honorTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  records.forEach(record => {
    tbody.appendChild(createHonorRow(record));
  });
}

function createHonorRow(record = { date: '', honor: '' }) {
  const disabledAttr = honorEditable ? '' : 'disabled';
  const deleteButtonStyle = honorEditable ? '' : 'display:none;';
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="date" value="${record.date || ''}" ${disabledAttr} /></td>
    <td><textarea placeholder="荣誉内容" ${disabledAttr}>${record.honor || ''}</textarea></td>
    <td><button type="button" class="delete-honor-row" style="${deleteButtonStyle}">删除</button></td>
  `;
  return row;
}

function gatherHonorRecords() {
  const rows = Array.from(document.querySelectorAll('#honorTable tbody tr'));
  return rows.map(row => {
    const date = row.querySelector('input[type="date"]')?.value.trim() || '';
    const honor = row.querySelector('textarea')?.value.trim() || '';
    return { date, honor };
  }).filter(record => record.date || record.honor);
}

let honorEditable = false;

function setHonorEditable(enabled) {
  honorEditable = enabled;
  const addButton = document.querySelector('#addHonorRow');
  if (addButton) {
    addButton.disabled = !enabled;
  }
  const rows = document.querySelectorAll('#honorTable tbody tr');
  rows.forEach(row => {
    row.querySelectorAll('input, textarea').forEach(field => {
      field.disabled = !enabled;
    });
    const deleteButton = row.querySelector('.delete-honor-row');
    if (deleteButton) {
      deleteButton.style.display = enabled ? '' : 'none';
    }
  });
}

function initializeHonorSection(studentId, studentHonor) {
  const records = loadHonorRecords(studentId);
  originalHonorRecords = normalizeHonorRecords(records);
  renderHonorRecords(records);

  const addButton = document.querySelector('#addHonorRow');
  if (addButton) {
    addButton.addEventListener('click', () => {
      if (!honorEditable) return;
      const tbody = document.querySelector('#honorTable tbody');
      if (!tbody) return;
      tbody.appendChild(createHonorRow());
    });
  }

  const tableBody = document.querySelector('#honorTable tbody');
  if (tableBody) {
    tableBody.addEventListener('click', event => {
      const deleteButton = event.target.closest('.delete-honor-row');
      if (!deleteButton) return;
      const row = deleteButton.closest('tr');
      if (row) {
        row.remove();
      }
    });
  }

  window.addEventListener('storage', event => {
    if (event.key !== getHonorNotifyKey(studentId)) {
      return;
    }
    if (!event.newValue) {
      return;
    }
    try {
      const payload = JSON.parse(event.newValue);
      if (payload && payload.updatedBy) {
        setMessage(`学生荣誉已由 ${payload.updatedBy} 更新，请刷新查看最新内容。`, 'success');
      }
    } catch (e) {
      // ignore malformed notification payload
    }
  });
}

let conversationEditable = false;

function getConversationHistoryKey(studentId) {
  return `student_conversation_history_${studentId}`;
}

function loadConversationHistory(studentId) {
  const stored = localStorage.getItem(getConversationHistoryKey(studentId));
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function getConversationChangeEntries(oldRecords, newRecords) {
  const before = normalizeConversationRecords(oldRecords);
  const after = normalizeConversationRecords(newRecords);
  const changes = [];
  const maxLength = Math.max(before.length, after.length);

  for (let i = 0; i < maxLength; i++) {
    const oldRec = before[i];
    const newRec = after[i];
    if (oldRec && !newRec) {
      changes.push({
        action: '删除',
        date: oldRec.date,
        target: oldRec.target,
        content: oldRec.content
      });
    } else if (!oldRec && newRec) {
      changes.push({
        action: '新增',
        date: newRec.date,
        target: newRec.target,
        content: newRec.content
      });
    } else if (oldRec && newRec) {
      if (oldRec.date !== newRec.date || oldRec.target !== newRec.target || oldRec.content !== newRec.content) {
        changes.push({
          action: '更新',
          date: newRec.date,
          target: newRec.target,
          content: newRec.content,
          before: oldRec,
          after: newRec
        });
      }
    }
  }
  return changes;
}

function notifyTeachersOfStudentUpdate(studentId, studentName, studentGrade, studentMajor, classLabel, changes) {
  // 保存学生更新到全局消息列表
  const user = getCurrentUser();
  const updatesKey = 'student_updates';
  const updates = JSON.parse(localStorage.getItem(updatesKey) || '[]');
  
  const message = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    studentId: studentId,
    studentName: studentName,
    studentGrade: studentGrade,
    studentMajor: studentMajor,
    classLabel: classLabel,
    updatedBy: user.account,
    updatedByName: user.displayName || user.account,
    updatedBySubject: user.subject,
    changes: changes || []
  };
  
  updates.unshift(message);
  // 保留最近100条更新
  if (updates.length > 100) {
    updates.length = 100;
  }
  
  localStorage.setItem(updatesKey, JSON.stringify(updates));
  
  // 触发 storage 事件通知其他页面
  window.dispatchEvent(new StorageEvent('storage', {
    key: updatesKey,
    oldValue: null,
    newValue: null,
    storageArea: localStorage
  }));
}

function appendConversationHistory(studentId, changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return loadConversationHistory(studentId);
  }
  const history = loadConversationHistory(studentId);
  const entry = {
    timestamp: Date.now(),
    updatedBy: getCurrentUser().displayName || getCurrentUser().account,
    changes: changes.map(change => ({
      action: change.action,
      date: change.date || '',
      target: change.target || '',
      content: change.content || '',
      before: change.before || null,
      after: change.after || null
    }))
  };
  history.unshift(entry);
  if (history.length > 10) {
    history.length = 10;
  }
  localStorage.setItem(getConversationHistoryKey(studentId), JSON.stringify(history));
  return history;
}

function saveConversationRecords(studentId, records, changes) {
  localStorage.setItem(getConversationStorageKey(studentId), JSON.stringify(records));
  appendConversationHistory(studentId, changes);
  localStorage.setItem(getConversationNotifyKey(studentId), JSON.stringify({
    timestamp: Date.now(),
    updatedBy: getCurrentUser().displayName || getCurrentUser().account
  }));
}

function renderConversationHistory(studentId) {
  const history = loadConversationHistory(studentId);
  const list = document.querySelector('#historyList');
  if (!list) return;
  list.innerHTML = '';

  if (history.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'history-entry';
    emptyItem.textContent = '暂无保存历史。';
    list.appendChild(emptyItem);
    return;
  }

  history.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'history-entry';

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${new Date(entry.timestamp).toLocaleString()} — ${entry.updatedBy || '未知用户'}`;
    details.appendChild(summary);

    // 处理新格式 (changes 数组)
    if (entry.changes && Array.isArray(entry.changes)) {
      if (entry.changes.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = '该保存点没有记录变更。';
        details.appendChild(empty);
      } else {
        entry.changes.forEach(change => {
          const changeLine = document.createElement('p');
          const actionLabel = `[${change.action}]`;
          const contentStr = `日期: ${change.date || '无'}; 对象: ${change.target || '无'}; 内容: ${change.content || '无'}`;
          changeLine.textContent = `${actionLabel} ${contentStr}`;
          details.appendChild(changeLine);
        });
      }
    }
    // 向后兼容旧格式 (records 数组)
    else if (entry.records && Array.isArray(entry.records)) {
      if (entry.records.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = '该保存点没有记录内容。';
        details.appendChild(empty);
      } else {
        entry.records.forEach(record => {
          const recordLine = document.createElement('p');
          recordLine.textContent = `日期：${record.date || '无'}；对象：${record.target || '无'}；内容：${record.content || '无'}`;
          details.appendChild(recordLine);
        });
      }
    }

    item.appendChild(details);
    list.appendChild(item);
  });
}

function renderRadarInputs(scores) {
  radarLabels.forEach((label, index) => {
    const input = document.querySelector(`#radarInput${index}`);
    const valueLabel = document.querySelector(`#radarValue${index}`);
    if (input) {
      input.value = scores[index] || 3;
    }
    if (valueLabel) {
      valueLabel.textContent = (scores[index] || 3).toFixed(1);
    }
  });
}

function gatherRadarScores() {
  return radarLabels.map((_, index) => {
    const input = document.querySelector(`#radarInput${index}`);
    return parseFloat(input?.value) || 1;
  });
}

function drawRadarChart(scores) {
  const canvas = document.querySelector('#radarChart');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const center = size / 2;
  const radius = center - 50;
  const points = scores.map((score, index) => {
    const angle = Math.PI / 2 + index * 2 * Math.PI / radarLabels.length;
    const valueRadius = ((score - 1) / 4) * radius;
    return {
      x: center + Math.cos(angle) * valueRadius,
      y: center - Math.sin(angle) * valueRadius,
      angle
    };
  });

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    radarLabels.forEach((label, index) => {
      const angle = Math.PI / 2 + index * 2 * Math.PI / radarLabels.length;
      const r = (radius / 4) * ring;
      const x = center + Math.cos(angle) * r;
      const y = center - Math.sin(angle) * r;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
  }

  ctx.strokeStyle = '#94a3b8';
  radarLabels.forEach((label, index) => {
    const angle = Math.PI / 2 + index * 2 * Math.PI / radarLabels.length;
    const x = center + Math.cos(angle) * radius;
    const y = center - Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#4f7cff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4f7cff';
  points.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#334155';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  radarLabels.forEach((label, index) => {
    const angle = Math.PI / 2 + index * 2 * Math.PI / radarLabels.length;
    const x = center + Math.cos(angle) * (radius + 18);
    const y = center - Math.sin(angle) * (radius + 18);
    ctx.fillText(label, x, y);
  });
}

function renderRadarChart(scores) {
  const normalizedScores = scores.map(value => {
    const num = parseFloat(value);
    if (isNaN(num)) return 3;
    return Math.max(1, Math.min(5, num));
  });
  drawRadarChart(normalizedScores);
}

function setRadarEditable(enabled) {
  radarLabels.forEach((label, index) => {
    const input = document.querySelector(`#radarInput${index}`);
    if (input) {
      input.disabled = !enabled;
    }
  });
}

function bindRadarInputs() {
  radarLabels.forEach((_, index) => {
    const input = document.querySelector(`#radarInput${index}`);
    const valueLabel = document.querySelector(`#radarValue${index}`);
    if (input && valueLabel) {
      input.addEventListener('input', () => {
        valueLabel.textContent = parseFloat(input.value).toFixed(1);
        renderRadarChart(gatherRadarScores());
      });
    }
  });
}

function getDefaultConversationRecords() {
  return [
    { date: '', target: '', content: '' },
    { date: '', target: '', content: '' },
    { date: '', target: '', content: '' }
  ];
}

function createConversationRow(record = { date: '', target: '', content: '' }) {
  const disabledAttr = conversationEditable ? '' : 'disabled';
  const deleteButtonStyle = conversationEditable ? '' : 'display:none;';
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="date" value="${record.date || ''}" ${disabledAttr} /></td>
    <td><input type="text" placeholder="谈话对象" value="${record.target || ''}" ${disabledAttr} /></td>
    <td><textarea placeholder="谈话内容" ${disabledAttr}>${record.content || ''}</textarea></td>
    <td><button type="button" class="delete-conversation-row" style="${deleteButtonStyle}">删除</button></td>
  `;
  return row;
}

function renderConversationRecords(records) {
  const tbody = document.querySelector('#conversationTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  records.forEach(record => {
    tbody.appendChild(createConversationRow(record));
  });
}

function gatherConversationRecords() {
  const rows = Array.from(document.querySelectorAll('#conversationTable tbody tr'));
  return rows.map(row => {
    const date = row.querySelector('input[type="date"]')?.value.trim() || '';
    const target = row.querySelector('input[type="text"]')?.value.trim() || '';
    const content = row.querySelector('textarea')?.value.trim() || '';
    return { date, target, content };
  }).filter(record => record.date || record.target || record.content);
}

function setConversationEditable(enabled) {
  conversationEditable = enabled;
  const addButton = document.querySelector('#addConversationRow');
  if (addButton) {
    addButton.disabled = !enabled;
  }
  const rows = document.querySelectorAll('#conversationTable tbody tr');
  rows.forEach(row => {
    row.querySelectorAll('input, textarea').forEach(field => {
      field.disabled = !enabled;
    });
    const deleteButton = row.querySelector('.delete-conversation-row');
    if (deleteButton) {
      deleteButton.style.display = enabled ? '' : 'none';
    }
  });
}

function initializeConversationSection(studentId) {
  const records = loadConversationRecords(studentId);
  originalConversationRecords = normalizeConversationRecords(records);
  renderConversationRecords(records);

  const radarScores = loadRadarScores(studentId);
  originalRadarScores = radarScores.map(value => Number(value));
  renderRadarInputs(radarScores);
  bindRadarInputs();
  renderRadarChart(radarScores);

  const addButton = document.querySelector('#addConversationRow');
  if (addButton) {
    addButton.addEventListener('click', () => {
      if (!conversationEditable) return;
      const tbody = document.querySelector('#conversationTable tbody');
      if (!tbody) return;
      tbody.appendChild(createConversationRow());
    });
  }

  const tableBody = document.querySelector('#conversationTable tbody');
  if (tableBody) {
    tableBody.addEventListener('click', event => {
      const deleteButton = event.target.closest('.delete-conversation-row');
      if (!deleteButton) return;
      const row = deleteButton.closest('tr');
      if (row) {
        row.remove();
      }
    });
  }

  window.addEventListener('storage', event => {
    if (event.key !== getConversationNotifyKey(studentId)) {
      return;
    }
    if (!event.newValue) {
      return;
    }
    try {
      const payload = JSON.parse(event.newValue);
      if (payload && payload.updatedBy) {
        setMessage(`学生谈话记录已由 ${payload.updatedBy} 更新，请刷新查看最新内容。`, 'success');
      }
    } catch (e) {
      // ignore malformed notification payload
    }
  });
}

function canTeacherViewStudent(student, user) {
  if (isAdminUser(user)) {
    return true;
  }
  if (isClassTeacher(user)) {
    const classLabel = student.classLabel || getClassLabelForStudent(student);
    return classLabel === getClassTeacherLabel(user);
  }
  return getMajorSubject(student.major) === user.subject;
}

function setMessage(text, type = 'info') {
  const message = document.querySelector('#detailMessage');
  if (!message) return;
  message.textContent = text;
  message.className = `message ${type}`;
  message.hidden = false;
}

function hideMessage() {
  const message = document.querySelector('#detailMessage');
  if (!message) return;
  message.hidden = true;
}

function setStatusColor() {
  const statusSelect = document.querySelector('#studentStatus');
  const statusText = document.querySelector('#detailStatus');
  const isLeave = statusSelect?.value === '离校' || statusText?.textContent.trim() === '离校';
  if (statusSelect) {
    statusSelect.style.color = isLeave ? '#dc2626' : '#344054';
    statusSelect.classList.toggle('status-leave', isLeave);
  }
  if (statusText) {
    statusText.classList.toggle('status-leave', isLeave);
  }
}

function setFormValues(student) {
  const classLabel = student.classLabel || getClassLabelForStudent(student);
  document.querySelector('#studentName').value = student.name || '';
  document.querySelector('#studentId').value = student.id || '';
  document.querySelector('#studentGrade').value = student.grade || '7';
  document.querySelector('#studentClass').value = classLabel;
  document.querySelector('#studentMajor').value = student.major || '';
  document.querySelector('#studentStatus').value = student.status || '在校';

  document.querySelector('#detailName').textContent = student.name || '';
  document.querySelector('#detailId').textContent = student.id || '';
  document.querySelector('#detailGrade').textContent = student.grade || '';
  document.querySelector('#detailClass').textContent = classLabel;
  document.querySelector('#detailMajor').textContent = student.major || '';
  document.querySelector('#detailHonor').textContent = getHonorSummary(student.honor, loadHonorRecords(student.id)) || '无';
  document.querySelector('#detailStatus').textContent = student.status || '';
  setStatusColor();

  renderConversationRecords(loadConversationRecords(student.id));
  renderConversationHistory(student.id);
  const radarScores = loadRadarScores(student.id);
  originalRadarScores = radarScores.map(value => Number(value));
  renderRadarInputs(radarScores);
  renderRadarChart(radarScores);
}

function toggleEditMode(enabled) {
  const formFields = document.querySelectorAll('#studentDetailForm input, #studentDetailForm select');
  formFields.forEach(field => {
    if (field.id === 'studentName' || field.id === 'studentId' || field.id === 'studentClass') {
      field.disabled = true;
    } else {
      field.disabled = !enabled;
    }
  });

  document.querySelector('#editButton').hidden = enabled;
  document.querySelector('#saveButton').hidden = !enabled;
  document.querySelector('#cancelButton').hidden = !enabled;
  setHonorEditable(enabled);
  setConversationEditable(enabled);
  setRadarEditable(enabled);
  if (enabled) {
    hideMessage();
  }
}

function showPermissionNotice(isAllowed) {
  const notice = document.querySelector('#permissionNotice');
  if (!notice) return;
  notice.hidden = isAllowed;
}

async function fetchStudentById(studentId) {
  // 首先尝试从 sessionStorage 或 URL 参数获取学生数据（从列表页跳转时）
  const cachedStudentData = sessionStorage.getItem(`student_${studentId}`);
  if (cachedStudentData) {
    try {
      return JSON.parse(cachedStudentData);
    } catch (e) {
      console.warn('缓存数据解析失败', e);
    }
  }
  
  // 尝试从后端 API 获取
  try {
    const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`服务器返回 ${response.status}`);
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      throw new Error('无效的学生数据');
    }
    return data;
  } catch (error) {
    console.warn('从后端 API 获取学生详细信息失败', error);
    // 返回基本的学生对象（用于演示）
    return {
      id: studentId,
      name: '学生信息加载失败',
      grade: '未知',
      major: '未知',
      honor: '无',
      status: '未知'
    };
  }
}

async function saveStudent(studentId, payload) {
  try {
    const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `服务器返回 ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('后端保存失败，使用本地回退保存：', error);
    const fallback = window.currentStudent ? { ...window.currentStudent, ...payload } : { id: studentId, ...payload };
    return fallback;
  }
}

function getFormPayload(honorRecords = []) {
  const honorText = normalizeHonorRecords(honorRecords).map(record => record.honor).filter(Boolean).join('； ');
  return {
    grade: document.querySelector('#studentGrade').value.trim(),
    major: document.querySelector('#studentMajor').value.trim(),
    honor: honorText,
    status: document.querySelector('#studentStatus').value.trim()
  };
}

async function initializePage() {
  const studentId = getQueryParam('id');
  const user = getCurrentUser();
  const isAdmin = isAdminUser(user);

  if (!user.account) {
    setMessage('请先登录后访问该页面。', 'error');
    setTimeout(() => {
      window.location.href = './login in.html';
    }, 1200);
    return;
  }

  document.querySelector('#currentAccount').textContent = user.displayName || user.account;
  document.querySelector('#currentSubject').textContent = getDisplaySubject(user);
  console.log('调试信息：学生ID =', studentId, '| 登录账号 =', user.account, '| 学科 =', user.subject, '| 管理员 =', isAdmin);
  toggleEditMode(false);
  showPermissionNotice(true);

  document.querySelector('#backButton').addEventListener('click', () => {
    window.location.href = './index.html';
  });

  document.querySelector('#editButton').addEventListener('click', () => {
    if (!window.currentStudent || !canTeacherViewStudent(window.currentStudent, user)) {
      setMessage('当前账号无权编辑该学生信息。', 'error');
      return;
    }
    toggleEditMode(true);
  });

  const statusSelect = document.querySelector('#studentStatus');
  if (statusSelect) {
    statusSelect.addEventListener('change', setStatusColor);
  }

  document.querySelector('#cancelButton').addEventListener('click', () => {
    toggleEditMode(false);
    if (window.currentStudent) {
      setFormValues(window.currentStudent);
    }
  });

  document.querySelector('#saveButton').addEventListener('click', async () => {
    if (!window.currentStudent || !canTeacherViewStudent(window.currentStudent, user)) {
      setMessage('当前账号无权保存该学生信息。', 'error');
      return;
    }
    const honorRecords = gatherHonorRecords();
    const payload = getFormPayload(honorRecords);
    if (!payload.major) {
      setMessage('专业不能为空。', 'error');
      return;
    }
    const conversationRecords = gatherConversationRecords();
    const radarScores = gatherRadarScores();
    const originalPayload = {
      grade: window.currentStudent.grade || '',
      major: window.currentStudent.major || '',
      honor: window.currentStudent.honor || '',
      status: window.currentStudent.status || ''
    };
    const honorChanges = getHonorChangeEntries(originalHonorRecords, honorRecords);
    const honorChanged = honorChanges.length > 0;
    const conversationChanges = getConversationChangeEntries(originalConversationRecords, conversationRecords);
    const conversationChanged = conversationChanges.length > 0;
    if (
      isSamePayload(originalPayload, payload) &&
      !conversationChanged &&
      !honorChanged &&
      isSameRadarScores(originalRadarScores, radarScores)
    ) {
      setMessage('未检测到修改，无需保存历史记录。请确认内容已变更后再保存。', 'warning');
      toggleEditMode(false);
      return;
    }
    try {
      setMessage('正在保存，请稍候...', 'info');
      const savedStudent = await saveStudent(studentId, payload);
      window.currentStudent = savedStudent;
      if (honorChanged) {
        saveHonorRecords(studentId, honorRecords, honorChanges);
      } else {
        localStorage.setItem(getHonorStorageKey(studentId), JSON.stringify(honorRecords));
      }
      if (conversationChanged) {
        saveConversationRecords(studentId, conversationRecords, conversationChanges);
      } else {
        localStorage.setItem(getConversationStorageKey(studentId), JSON.stringify(conversationRecords));
      }
      saveRadarScores(studentId, radarScores);
      originalHonorRecords = normalizeHonorRecords(honorRecords);
      originalConversationRecords = normalizeConversationRecords(conversationRecords);
      originalRadarScores = radarScores.slice();
      setFormValues(savedStudent);
      renderConversationHistory(studentId);
      toggleEditMode(false);
      
      // 通知其他老师学生信息有修改
      const allChanges = [];
      if (!isSamePayload(originalPayload, payload)) {
        // 表单字段修改
        Object.keys(payload).forEach(key => {
          if (originalPayload[key] !== payload[key]) {
            allChanges.push({
              action: '更新',
              date: '',
              target: {'grade': '年级', 'major': '专业', 'honor': '荣誉', 'status': '状态'}[key] || key,
              content: `由 "${originalPayload[key]}" 改为 "${payload[key]}"`
            });
          }
        });
      }
      if (honorChanged) {
        allChanges.push(...honorChanges);
      }
      if (conversationChanged) {
        allChanges.push(...conversationChanges);
      }
      
      if (allChanges.length > 0) {
        const classLabel = window.currentStudent.classLabel || getClassLabelForStudent(window.currentStudent);
        notifyTeachersOfStudentUpdate(studentId, window.currentStudent.name, window.currentStudent.grade, window.currentStudent.major, classLabel, allChanges);
      }
      
      setMessage('学生信息、谈话记录及雷达评分已保存。', 'success');
    } catch (error) {
      if (honorChanged) {
        saveHonorRecords(studentId, honorRecords, honorChanges);
      } else {
        localStorage.setItem(getHonorStorageKey(studentId), JSON.stringify(honorRecords));
      }
      if (conversationChanged) {
        saveConversationRecords(studentId, conversationRecords, conversationChanges);
      } else {
        localStorage.setItem(getConversationStorageKey(studentId), JSON.stringify(conversationRecords));
      }
      saveRadarScores(studentId, radarScores);
      originalHonorRecords = normalizeHonorRecords(honorRecords);
      originalConversationRecords = normalizeConversationRecords(conversationRecords);
      originalRadarScores = radarScores.slice();
      renderConversationHistory(studentId);
      setFormValues(window.currentStudent || { id: studentId });
      setMessage('学生信息保存失败，但荣誉、谈话记录和雷达评分已本地保存。', 'warning');
    }
  });

  if (!studentId) {
    setMessage('未找到学生ID，请返回列表页重新进入。', 'error');
    return;
  }

  const studentData = await fetchStudentById(studentId);
  if (!studentData) {
    setMessage('无法加载学生详细信息，请检查网络或学生ID是否正确。', 'error');
    return;
  }

  window.currentStudent = studentData;
  const canView = canTeacherViewStudent(studentData, user);
  showPermissionNotice(canView);
  if (!canView) {
    setMessage('当前账号无权查看该学生信息。', 'error');
    document.querySelector('#studentDetailForm').hidden = true;
    document.querySelector('.form-actions').hidden = true;
    const conversationSection = document.querySelector('#conversationSection');
    if (conversationSection) {
      conversationSection.hidden = true;
    }
    return;
  }

  setFormValues(studentData);
  initializeHonorSection(studentId, studentData.honor);
  initializeConversationSection(studentId);
  setHonorEditable(false);
  setConversationEditable(false);
  setRadarEditable(false);
  renderConversationHistory(studentId);
}

document.addEventListener('DOMContentLoaded', initializePage);
