const STORAGE_KEY = 'xinqing-journal-entries';

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(str) {
  const [y, m, d] = str.split('-');
  return `${y} 年 ${m} 月 ${d} 日`;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse journal entries', e);
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function computeStats(entries) {
  const days = entries.length;
  const totalGrats = entries.reduce(
    (sum, e) => sum + e.items.filter((x) => x && x.trim()).length,
    0,
  );

  // 连续天数 streak
  if (!entries.length) {
    return { days, totalGrats, streak: 0 };
  }
  const byDate = new Map(entries.map((e) => [e.date, true]));
  let streak = 0;
  const today = new Date();
  for (;;) {
    const key = formatDate(today);
    if (!byDate.has(key)) break;
    streak += 1;
    today.setDate(today.getDate() - 1);
  }
  return { days, totalGrats, streak };
}

function upsertToday(entries, todayStr, payload) {
  const idx = entries.findIndex((e) => e.date === todayStr);
  if (idx === -1) {
    return [...entries, { date: todayStr, ...payload }].sort(
      (a, b) => (a.date < b.date ? 1 : -1),
    );
  }
  const updated = [...entries];
  updated[idx] = { ...updated[idx], ...payload };
  return updated.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderHistory(entries, range) {
  const container = document.getElementById('historyList');
  container.innerHTML = '';

  if (!entries.length) {
    container.classList.add('empty');
    const p = document.createElement('p');
    p.className = 'empty-tip';
    p.textContent = '还没有记录～从今天开始，为生活里的微光留一小行文字吧。';
    container.appendChild(p);
    return;
  }

  const now = new Date();
  let filtered = entries;
  if (range !== 'all') {
    const days = Number(range) || 0;
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days + 1);
    const cutoffStr = formatDate(cutoff);
    filtered = entries.filter((e) => e.date >= cutoffStr);
  }

  if (!filtered.length) {
    container.classList.add('empty');
    const p = document.createElement('p');
    p.className = 'empty-tip';
    p.textContent = '该时间范围内还没有记录，可以试着回想一下最近的美好瞬间。';
    container.appendChild(p);
    return;
  }

  container.classList.remove('empty');
  filtered.forEach((entry) => {
    const wrapper = document.createElement('article');
    wrapper.className = 'history-item';

    const header = document.createElement('div');
    header.className = 'history-item-header';

    const dateEl = document.createElement('div');
    dateEl.className = 'history-date';
    dateEl.textContent = formatDisplayDate(entry.date);

    const summaryEl = document.createElement('div');
    summaryEl.className = 'history-summary';
    summaryEl.textContent = entry.summary || '今天的心情，留白也是一种答案。';

    header.appendChild(dateEl);
    header.appendChild(summaryEl);

    const ul = document.createElement('ul');
    ul.className = 'history-gratitudes';
    entry.items
      .filter((x) => x && x.trim())
      .forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });

    wrapper.appendChild(header);
    if (ul.children.length) wrapper.appendChild(ul);
    container.appendChild(wrapper);
  });
}

function updateStats(entries) {
  const { days, totalGrats, streak } = computeStats(entries);
  document.getElementById('totalDays').textContent = String(days);
  document.getElementById('totalGratitudes').textContent = String(totalGrats);
  document.getElementById('streakDays').textContent = String(streak);
}

function loadTodayToInputs(entries, todayStr) {
  const entry = entries.find((e) => e.date === todayStr);
  if (!entry) return;
  document.getElementById('g1').value = entry.items[0] || '';
  document.getElementById('g2').value = entry.items[1] || '';
  document.getElementById('g3').value = entry.items[2] || '';
  document.getElementById('summary').value = entry.summary || '';
}

function main() {
  const today = new Date();
  const todayStr = formatDate(today);
  document.getElementById('todayDate').textContent = formatDisplayDate(todayStr);

  let entries = loadEntries();
  loadTodayToInputs(entries, todayStr);
  updateStats(entries);
  renderHistory(entries, document.getElementById('filterRange').value);

  const saveStatusEl = document.getElementById('saveStatus');

  document.getElementById('saveBtn').addEventListener('click', () => {
    const g1 = document.getElementById('g1').value.trim();
    const g2 = document.getElementById('g2').value.trim();
    const g3 = document.getElementById('g3').value.trim();
    const summary = document.getElementById('summary').value.trim();

    const filledCount = [g1, g2, g3].filter(Boolean).length;
    if (filledCount === 0 && !summary) {
      saveStatusEl.textContent = '至少写下一件让你感到感恩的小事，或一句心情小结。';
      saveStatusEl.style.color = '#b45b5b';
      return;
    }

    entries = upsertToday(entries, todayStr, {
      items: [g1, g2, g3],
      summary,
    });
    saveEntries(entries);
    updateStats(entries);
    renderHistory(entries, document.getElementById('filterRange').value);

    saveStatusEl.textContent = '已为今天留下一行温柔记录。';
    saveStatusEl.style.color = '#6c7465';
    setTimeout(() => {
      saveStatusEl.textContent = '';
    }, 2600);
  });

  document.getElementById('filterRange').addEventListener('change', (e) => {
    renderHistory(entries, e.target.value);
  });

  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (!entries.length) return;
    const confirmed = window.confirm('确定要清空所有心晴记录吗？此操作只能在本地撤回。');
    if (!confirmed) return;
    entries = [];
    saveEntries(entries);
    updateStats(entries);
    renderHistory(entries, document.getElementById('filterRange').value);
  });

  initCursorEffects();
  initParallax();
}

document.addEventListener('DOMContentLoaded', main);

// 自定义鼠标光圈与 hover 效果
function initCursorEffects() {
  const orb = document.querySelector('.cursor-orb');
  if (!orb) return;

  let isPointer = false;

  const move = (event) => {
    const x = event.clientX;
    const y = event.clientY;
    orb.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    orb.classList.add('cursor-orb--visible');
  };

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseleave', () => {
    orb.classList.remove('cursor-orb--visible');
  });
  document.addEventListener('mouseenter', () => {
    orb.classList.add('cursor-orb--visible');
  });

  const accentTargets = document.querySelectorAll(
    'button, .primary-btn, .ghost-btn, .item-row, .history-item',
  );
  accentTargets.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      isPointer = true;
      orb.classList.add('cursor-orb--accent');
    });
    el.addEventListener('mouseleave', () => {
      isPointer = false;
      orb.classList.remove('cursor-orb--accent');
    });
  });
}

// 视差滚动效果
function initParallax() {
  const elements = document.querySelectorAll('[data-parallax]');
  if (!elements.length) return;

  const handleScroll = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    const center = window.innerHeight / 2;

    elements.forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      const rect = el.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - center;
      const translateY = (-offset * speed) / 10;
      el.style.transform = `translate3d(0, ${translateY}px, 0)`;
    });
  };

  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
}


