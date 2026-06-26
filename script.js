// script.js - 学生名单展示与查询逻辑
// 该脚本负责从后端获取学生名单数据，渲染到页面上，并实现搜索和详情展示功能。
// 注意：为了安全性，所有用户输入和后端数据都经过了 HTML 转义处理，防止 XSS 攻击。
function escapeHTML(value) {
  // 第一步：处理空值，undefined/null 转为空字符串，其他值转字符串
  const safeValue = value === undefined || value === null ? '' : String(value);
  // 第二步：替换特殊字符为 HTML 实体
  return safeValue
    .replace(/&/g, '&amp;') // 先替换 &，避免后续替换引入新的 &
    .replace(/</g, '&lt;') // 替换 <，防止标签注入
    .replace(/>/g, '&gt;') // 替换 >，防止标签注入
    .replace(/"/g, '&quot;') // 替换 "，防止属性注入
    .replace(/'/g, '&#39;'); // 替换 '，防止属性注入
}

// TODO: 后端使用 SQL Server 查询学生名单，并通过 GET /api/students 返回 JSON 数组
const fallbackStudents = [
  {
    name: '李明轩',
    id: '20241001',
    grade: '7',
    major: '计算机',
    honor: 'CSP-J',
    status: '在校',
    photo: 'https://i.pravatar.cc/280?img=15'
  },
  {
    name: '王雨欣',
    id: '20241018',
    grade: '7',
    major: '计算机',
    honor: 'USACO',
    status: '在校',
    photo: 'https://i.pravatar.cc/280?img=12'
  },
  {
    name: '张凯',
    id: '20242005',
    grade: '8',
    major: '化学',
    honor: '化学竞赛获奖',
    status: '在校',
    photo: 'https://i.pravatar.cc/280?img=5'
  },
  {
    name: '赵雅静',
    id: '20243002',
    grade: '9',
    major: '化学',
    honor: '学术竞赛获奖',
    status: '在校',
    photo: 'https://i.pravatar.cc/280?img=20'
  },
  {
    name: '陈思洁',
    id: '20242018',
    grade: '8',
    major: '物理',
    honor: 'JPC',
    status: '在校',
    photo: 'https://i.pravatar.cc/280?img=21'
  },
  {
    name: '刘泽宇',
    id: '20243011',
    grade: '6',
    major: '数学',
    honor: 'AMC8',
    status: '在校',
    photo: 'https://i.pravatar.cc/280?img=25'
  },
  {
    name: '王雪静',
    id: '20241025',
    grade: '8',
    major: '英语',
    honor: 'ESDP',
    status: '在校',
    photo: 'https://i.pravatar.cc/280?img=10'
  },
  {
    name: '孙浩然',
    id: '20242030',
    grade: '9',
    major: '生物',
    honor: 'Brainbee',
    status: '离校',
    photo: 'https://i.pravatar.cc/280?img=7'
  }
];

let currentStudents = fallbackStudents; // 当前显示的学生名单，初始为备份数据，后续会从后端接口更新
const studentApiPath = '/api/students'; // 后端接口路径，前端通过该路径获取学生名单数据

function getCurrentUser() {
  return {
    account: localStorage.getItem('userAccount') || '',
    subject: localStorage.getItem('userSubject') || '',
    displayName: localStorage.getItem('userDisplayName') || ''
  };
}

function logout() {
  localStorage.removeItem('userAccount');
  localStorage.removeItem('userSubject');
  localStorage.removeItem('userDisplayName');
  window.location.href = './login in.html';
}

function initLogoutButton() {
  const button = document.getElementById('logoutButton');
  if (!button) return;
  button.addEventListener('click', logout);
}

function renderCurrentUser() {
  const user = getCurrentUser();
  const currentUserEl = document.getElementById('currentUser');
  const currentSubjectEl = document.getElementById('currentUserSubject');
  if (currentUserEl) {
    currentUserEl.textContent = user.displayName || user.account || '未登录';
  }
  if (currentSubjectEl) {
    currentSubjectEl.textContent = user.subject ? `学科权限：${user.subject}` : '学科权限：未知';
  }
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

function getClassNumberForStudent(student) {
  const classCount = getClassCountByGrade(student.grade);
  const seed = student.id || student.name || '';
  return (getStableHash(seed) % classCount) + 1;
}

function ensureStudentClass(student) {
  if (!student) {
    return student;
  }
  if (student.classLabel && student.classNumber) {
    return student;
  }
  const classNumber = getClassNumberForStudent(student);
  student.classNumber = classNumber;
  student.classLabel = `${student.grade}年级${classNumber}班`;
  return student;
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

function canTeacherViewStudent(student, user) {
  if (isAdminUser(user)) {
    return true;
  }
  if (isClassTeacher(user)) {
    ensureStudentClass(student);
    return student.classLabel === getClassTeacherLabel(user);
  }
  return getMajorSubject(student.major) === user.subject;
}

function filterStudentsByUser(students) {
  const user = getCurrentUser();
  if (!user.account) {
    return [];
  }
  if (isAdminUser(user)) {
    return students;
  }
  return students.filter(student => canTeacherViewStudent(student, user));
}

async function fetchStudents() { // 从后端接口获取学生名单数据，失败时使用静态备份数据
  try {  // 使用 fetch API 获取学生名单数据，设置 cache: 'no-store' 禁止浏览器缓存响应，确保每次请求都获取最新数据
    const response = await fetch(studentApiPath, { cache: 'no-store' }); // 处理响应状态码，如果不是 200-299 的成功状态码，抛出错误
    if (!response.ok) { // 200-299 以外的状态码都视为错误
      throw new Error(`Server returned ${response.status}`); // 抛出错误，包含状态码信息，便于调试和日志记录
    }
    const data = await response.json(); // 解析响应体为 JSON 格式，期望得到一个学生对象数组
    if (!Array.isArray(data)) { // 验证数据格式是否正确，应该是一个数组，如果不是，抛出错误
      throw new Error('Invalid student data format'); // 抛出错误，提示数据格式不正确，便于调试和日志记录
    }
    return data.map(ensureStudentClass); // 记得为每个学生分配班级信息
  } catch (error) { // 捕获任何网络错误、解析错误或数据格式错误，记录警告日志，并返回静态备份数据，确保页面功能正常
    console.warn('无法从后端接口获取学生名单，使用静态备份数据。', error); // 记录警告日志，包含错误信息，便于调试和监控
    return fallbackStudents.map(ensureStudentClass); // 返回静态备份数据，并补充班级信息
  }
}

function getStudentDetailUrl(studentId) {
  // 从列表页导航到详情页时，通过 sessionStorage 缓存学生数据，以防后端不可用
  const student = currentStudents.find(s => s.id === studentId);
  if (student) {
    sessionStorage.setItem(`student_${studentId}`, JSON.stringify(student));
  }
  return `./student-detail.html?id=${encodeURIComponent(studentId)}`;
}

function getFirstHonor(honor) {
  if (!honor) return '';
  if (Array.isArray(honor)) {
    return honor[0] || '';
  }
  const honorText = String(honor).trim();
  const parts = honorText.split(/[,;；、|]/).map(part => part.trim()).filter(Boolean);
  return parts[0] || honorText;
}

function renderStudentRows(students) { // 将学生名单数据渲染到表格中，构建指向详情页的链接
  const tbody = document.querySelector('#student-list');
  tbody.innerHTML = students.map(student => {
    ensureStudentClass(student);
    const displayHonor = getFirstHonor(student.honor);
    return ` 
      <tr>
        <td><a href="${getStudentDetailUrl(student.id)}" class="student-link">${escapeHTML(student.name)}</a></td> 
        <td>${escapeHTML(student.id)}</td>
        <td>${escapeHTML(student.grade)}</td>
        <td>${escapeHTML(student.classLabel || '无')}</td>
        <td>${escapeHTML(student.major)}</td>
        <td><span class="badge ${student.honor ? 'badge-premium' : 'badge-search'}">${escapeHTML(displayHonor || '无')}</span></td>
        <td class="${student.status === '离校' ? 'status-leave' : 'status-active'}">${escapeHTML(student.status)}</td>
      </tr>
    `;
  }).join('');
}

function renderStudentCarousel(students) { // 将学生名单数据渲染到轮播组件中，使用 HTML 模板字符串生成学生卡片，并进行 HTML 转义处理
  const track = document.querySelector('#student-carousel-track');
  const cards = students.map(student => {
    return `
      <div class="student-card" data-student-id="${escapeHTML(student.id)}">
        <img src="${escapeHTML(student.photo)}" alt="${escapeHTML(student.name)} 的照片">
        <div class="student-card-body">
          <p class="student-card-name">${escapeHTML(student.name)}</p>
          <p class="student-card-meta">${escapeHTML(student.major)}</p>
        </div>
      </div>
    `;
  }).join('');
  track.innerHTML = cards + cards;
}

function filterStudents(query) { // 根据查询条件过滤学生名单，支持姓名、专业和学号模糊搜索
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? currentStudents.filter(student => {
        return student.name.toLowerCase().includes(normalized) 
          || student.major.toLowerCase().includes(normalized)
          || student.id.toLowerCase().includes(normalized);
      })
    : currentStudents;
  renderStudentRows(filtered);
  renderStudentCarousel(filtered);
}

function attachRowClickHandler() {
  const carousel = document.querySelector('#student-carousel');
  carousel.addEventListener('click', event => {
    const card = event.target.closest('.student-card');
    if (!card) return;
    const studentId = card.dataset.studentId;
    window.location.href = getStudentDetailUrl(studentId);
  });
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

function canViewStudent(user, message) {
  if (isAdminUser(user)) {
    return true;
  }
  if (isClassTeacher(user)) {
    const userClassLabel = getClassTeacherLabel(user);
    const messageClassLabel = message.classLabel;
    return messageClassLabel === userClassLabel;
  }
  const studentMajorSubject = getMajorSubject(message.studentMajor);
  const userSubject = user.subject;
  return studentMajorSubject === userSubject;
}

function countUnreadMessages(user) {
  const allUpdates = JSON.parse(localStorage.getItem('student_updates') || '[]');
  const deletedIds = new Set(JSON.parse(localStorage.getItem(`deleted_messages_${user.account}`) || '[]'));
  const readIds = new Set(JSON.parse(localStorage.getItem(`read_messages_${user.account}`) || '[]'));
  
  const visibleMessages = allUpdates.filter(message => {
    if (deletedIds.has(message.id)) {
      return false;
    }
    if (readIds.has(message.id)) {
      return false; // 已读消息不计入未读数
    }
    if (message.updatedBy === user.account) {
      return false;
    }
    return canViewStudent(user, message);
  });
  
  return visibleMessages.length;
}

function initNotificationBell() {
  const bell = document.querySelector('#notificationBell');
  const badge = document.querySelector('#notificationBadge');
  
  // 更新未读消息数
  function updateUnreadCount() {
    const user = getCurrentUser();
    const unreadCount = countUnreadMessages(user);
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('empty');
    } else {
      badge.classList.add('empty');
    }
  }
  
  // 初始加载
  updateUnreadCount();
  
  // 点击跳转到消息页面
  if (bell) {
    bell.addEventListener('click', () => {
      window.location.href = './messages.html';
    });
  }
  
  // 监听 storage 变化（其他页面保存消息时更新）
  window.addEventListener('storage', (event) => {
    if (event.key === 'student_updates' || event.key && event.key.startsWith('deleted_messages_') || event.key && event.key.startsWith('read_messages_')) {
      updateUnreadCount();
    }
  });
}

async function initializeStudentList() {
  initLogoutButton();
  renderCurrentUser();
  initNotificationBell();
  const students = await fetchStudents();
  const visibleStudents = filterStudentsByUser(students);
  currentStudents = visibleStudents;
  renderStudentRows(visibleStudents);
  renderStudentCarousel(visibleStudents);
  attachRowClickHandler();
  const searchInput = document.querySelector('#student-search');
  if (searchInput) {
    searchInput.addEventListener('input', event => {
      filterStudents(event.target.value);
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeStudentList);
