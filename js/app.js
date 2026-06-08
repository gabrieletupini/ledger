import {
  initFirebase, onSyncStatus, onAuthReady, loginWithGoogle, logout,
  subscribeToEvents, createEvent, updateEvent, deleteEvent,
} from './firebase.js';
import { EVENT_TYPES, CATEGORIES, categoryByKey, subcategoryByKey } from './seed-content.js';
import { STUDIES } from './studies.js';

// ===== State =====
let events = [];
let libraryFilter = { category: 'all', subcategory: null };
let readOnly = false;
let editingStudyIds = [];

const _now = new Date();
let calendarYear = _now.getFullYear();
let calendarMonth = _now.getMonth();

// ===== DOM helpers =====
const $ = (id) => document.getElementById(id);

const loginScreen = $('login-screen');
const appEl = $('app');
const googleBtn = $('google-login-btn');
const loginError = $('login-error');
const syncStatus = $('sync-status');
const toast = $('toast');

// ===== Init =====
function init() {
  initFirebase();

  onSyncStatus((status) => {
    syncStatus.className = 'sync-status ' + status;
    syncStatus.title = status;
  });

  onAuthReady((user) => {
    if (user) {
      readOnly = false;
      document.body.classList.remove('read-only');
      const banner = $('readonly-banner');
      if (banner) banner.classList.add('hidden');
      loginScreen.classList.add('hidden');
      appEl.classList.remove('hidden');
      startApp();
      return;
    }
    if (!readOnly) {
      loginScreen.classList.remove('hidden');
      appEl.classList.add('hidden');
    }
  });

  googleBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    const r = await loginWithGoogle();
    if (r.error === 'unauthorized') loginError.textContent = 'Unauthorized account.';
    else if (r.error) loginError.textContent = r.error;
  });

  const readonlyBtn = $('readonly-btn');
  if (readonlyBtn) {
    readonlyBtn.addEventListener('click', () => {
      readOnly = true;
      document.body.classList.add('read-only');
      const banner = $('readonly-banner');
      if (banner) banner.classList.remove('hidden');
      loginScreen.classList.add('hidden');
      appEl.classList.remove('hidden');
      startApp();
    });
  }
  const bannerSignin = $('readonly-banner-signin');
  if (bannerSignin) {
    bannerSignin.addEventListener('click', (e) => { e.preventDefault(); window.location.reload(); });
  }
  const logoutBtn = $('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Signing out…';
      try { await logout(); } catch (err) { console.error('signOut failed:', err); }
      window.location.reload();
    });
  }
}

let appStarted = false;
function startApp() {
  if (appStarted) return;
  appStarted = true;

  setupTabs();
  setupEventModal();
  setupModals();
  setupKeyboard();

  $('open-event-btn').addEventListener('click', () => openEventModal());

  subscribeToEvents((items) => {
    events = items;
    renderEventCalendar();
  });

  renderLibraryFilters();
  renderLibrary();
  renderEventLegend();
}

// ===== Tabs =====
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      ['library', 'calendar'].forEach(v => {
        const el = $('view-' + v);
        const active = v === name;
        el.classList.toggle('hidden', !active);
        el.classList.toggle('view-active', active);
      });
    });
  });
}

// ===== Date helpers =====
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmtDate(new Date());

function prettyShortDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ===== Library =====
const studyById = (id) => STUDIES.find(s => s.id === id);

function renderLibraryFilters() {
  const el = $('library-filters');

  // Build a single row of pills: "All" + each subcategory leaf, with its
  // parent category as a prefix when there is more than one category.
  const pills = [`<button class="library-filter ${libraryFilter.category === 'all' ? 'active' : ''}" data-cat="all">All</button>`];

  CATEGORIES.forEach(cat => {
    cat.subcategories.forEach(sub => {
      const isActive = libraryFilter.category === cat.key && libraryFilter.subcategory === sub.key;
      const label = CATEGORIES.length > 1
        ? `${escapeHtml(cat.label)} · ${escapeHtml(sub.label)}`
        : escapeHtml(sub.label);
      pills.push(
        `<button class="library-filter ${isActive ? 'active' : ''}" data-cat="${cat.key}" data-sub="${sub.key}">${label}</button>`
      );
    });
  });

  el.innerHTML = `<div class="filter-group">${pills.join('')}</div>`;

  el.querySelectorAll('.library-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const sub = btn.dataset.sub || null;
      libraryFilter = { category: cat, subcategory: sub };
      renderLibraryFilters();
      renderLibrary();
    });
  });
}

function studyFilename(s) {
  return s.file.split('/').pop();
}

function renderLibrary() {
  const list = $('library-list');
  const items = libraryFilter.category === 'all'
    ? STUDIES
    : STUDIES.filter(s =>
        s.category === libraryFilter.category &&
        (!libraryFilter.subcategory || s.subcategory === libraryFilter.subcategory)
      );

  if (!items.length) {
    list.innerHTML = `<div class="empty-state">No essays yet under this filter.</div>`;
    return;
  }

  const sorted = [...items].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  list.innerHTML = sorted.map(a => {
    const cat = categoryByKey(a.category);
    const sub = subcategoryByKey(a.category, a.subcategory);
    const crumb = cat && sub
      ? `${escapeHtml(cat.label)} <span class="sep">›</span> ${escapeHtml(sub.label)}${a.ticker ? ` <span class="sep">·</span> ${escapeHtml(a.ticker)}` : ''}`
      : '';
    return `
      <div class="library-card" data-id="${a.id}">
        <div class="library-card-breadcrumb">${crumb}</div>
        <h3 class="library-card-title">${escapeHtml(a.title)}</h3>
        <p class="library-card-excerpt">${escapeHtml(a.excerpt)}</p>
        <div class="library-card-meta">
          <span>${a.readingMinutes} min · ${prettyShortDate(a.publishedAt)}</span>
          <span class="library-card-actions">
            <a class="library-card-download" href="${a.file}" download="${escapeHtml(studyFilename(a))}" onclick="event.stopPropagation()">⬇ Download</a>
          </span>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.library-card').forEach(card => {
    card.addEventListener('click', () => {
      const a = STUDIES.find(x => x.id === card.dataset.id);
      if (a) window.open(a.file, '_blank', 'noopener');
    });
  });
}

// ===== Event calendar =====
const WEEKDAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const eventType = (key) => EVENT_TYPES.find(t => t.key === key) || EVENT_TYPES[EVENT_TYPES.length - 1];
const eventLabel = (e) => (e.type === 'other' && e.customLabel) ? e.customLabel : eventType(e.type).label;

function renderEventLegend() {
  $('event-legend').innerHTML = EVENT_TYPES.map(t =>
    `<span class="event-legend-item"><span class="event-legend-dot" style="background:${t.color}"></span>${escapeHtml(t.label)}</span>`
  ).join('');
}

function renderEventCalendar() {
  const cal = $('event-calendar');
  if (!cal) return;

  const byDate = new Map();
  for (const e of events) {
    if (!e.date) continue;
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  byDate.forEach(arr => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')));

  const todayStr = today();
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const monthLabel = new Date(calendarYear, calendarMonth, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push('<div class="cal-day cal-day-empty"></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(d)}`;
    const dayE = byDate.get(key) || [];
    const isToday = key === todayStr;
    const chips = dayE.slice(0, 3).map(e => {
      const et = eventType(e.type);
      const ticker = e.ticker ? `<span class="cal-chip-ticker">${escapeHtml(e.ticker)}</span>` : '';
      const clip = (e.studyIds && e.studyIds.length) ? '<span class="cal-chip-clip">📎</span>' : '';
      const title = eventLabel(e) + (e.time ? ` · ${e.time}` : '') + (e.ticker ? ` · ${e.ticker}` : '');
      return `<div class="cal-chip" data-event-id="${escapeHtml(e.id)}" style="border-left-color:${et.color}" title="${escapeHtml(title)}">${ticker}<span class="cal-chip-label">${escapeHtml(eventLabel(e))}</span>${clip}</div>`;
    }).join('');
    const more = dayE.length > 3 ? `<div class="cal-more" data-date="${key}">+${dayE.length - 3} more</div>` : '';
    cells.push(`<div class="cal-day${isToday ? ' cal-day-today' : ''}${dayE.length ? ' cal-day-has' : ''}" data-date="${key}"><div class="cal-day-num">${d}</div>${chips}${more}</div>`);
  }
  while (cells.length % 7 !== 0) cells.push('<div class="cal-day cal-day-empty"></div>');

  cal.innerHTML = `
    <div class="cal-nav">
      <button class="cal-nav-btn" data-cal-nav="prev" title="Previous month">←</button>
      <span class="cal-month-label">${escapeHtml(monthLabel)}</span>
      <button class="cal-nav-btn" data-cal-nav="next" title="Next month">→</button>
    </div>
    <div class="cal-weekdays">${WEEKDAY_LABELS_SHORT.map(w => `<span>${w}</span>`).join('')}</div>
    <div class="cal-grid">${cells.join('')}</div>
  `;

  cal.querySelectorAll('[data-cal-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.calNav === 'prev') { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } }
      else { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } }
      renderEventCalendar();
    });
  });

  cal.querySelectorAll('.cal-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = events.find(x => x.id === chip.dataset.eventId);
      if (ev) openEventModal(ev);
    });
  });

  cal.querySelectorAll('.cal-more').forEach(more => {
    more.addEventListener('click', (e) => {
      e.stopPropagation();
      showEventDayPopover(more, more.dataset.date, byDate.get(more.dataset.date) || []);
    });
  });

  cal.querySelectorAll('.cal-day[data-date]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.cal-chip, .cal-more')) return;
      const dayE = byDate.get(cell.dataset.date) || [];
      if (readOnly) {
        if (dayE.length) showEventDayPopover(cell, cell.dataset.date, dayE);
        return;
      }
      openEventModal(null, cell.dataset.date);
    });
  });
}

function showEventDayPopover(anchor, dateKey, dayE) {
  document.querySelector('.day-popover')?.remove();
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const pop = document.createElement('div');
  pop.className = 'day-popover';
  pop.innerHTML = `
    <div class="day-popover-title">${escapeHtml(dateLabel)} — ${dayE.length} event${dayE.length === 1 ? '' : 's'}</div>
    <ul class="day-popover-list">
      ${dayE.map(e => {
        const et = eventType(e.type);
        const reads = (e.studyIds || []).map(studyById).filter(Boolean);
        const readsHtml = reads.length
          ? `<div class="day-popover-reads">${reads.map(s =>
              `<a class="day-popover-read" href="${s.file}" target="_blank" rel="noopener">📎 ${escapeHtml(s.title)}</a>`
            ).join('')}</div>`
          : '';
        const tickerPart = e.ticker ? ` · ${escapeHtml(e.ticker)}` : '';
        const timePart = e.time ? ` · ${escapeHtml(e.time)}` : '';
        return `<li data-event-id="${escapeHtml(e.id)}">
          <div class="day-popover-main">
            <span class="day-popover-dot" style="background:${et.color}"></span>
            <span>${escapeHtml(eventLabel(e))}${tickerPart}${timePart}</span>
            <span class="day-popover-amount">${e.amount ? escapeHtml(e.amount) : ''}</span>
          </div>
          ${readsHtml}
        </li>`;
      }).join('')}
    </ul>`;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.top = `${r.bottom + window.scrollY + 6}px`;
  pop.style.left = `${Math.min(r.left + window.scrollX, window.innerWidth - 360)}px`;
  pop.querySelectorAll('[data-event-id]').forEach(li => {
    li.addEventListener('click', (e) => {
      if (e.target.closest('.day-popover-read')) return;
      const ev = events.find(x => x.id === li.dataset.eventId);
      pop.remove();
      if (ev) openEventModal(ev);
    });
  });
  setTimeout(() => {
    const close = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 0);
}

// ===== Event modal =====
function setupEventModal() {
  const sel = $('event-type');
  sel.innerHTML = EVENT_TYPES.map(t => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join('');
  sel.addEventListener('change', () => {
    $('event-custom-wrap').classList.toggle('hidden', sel.value !== 'other');
    refreshEventStudiesPicker();
  });

  $('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('event-id').value;
    const type = sel.value;
    const data = {
      date: $('event-date').value || today(),
      time: $('event-time').value || null,
      type,
      customLabel: type === 'other' ? ($('event-custom').value.trim() || null) : null,
      ticker: $('event-ticker').value.trim() || null,
      amount: $('event-amount').value.trim() || null,
      note: $('event-note').value.trim(),
      studyIds: [...editingStudyIds],
    };
    if (id) { await updateEvent(id, data); showToast('Event updated'); }
    else { await createEvent(data); showToast('Event logged'); }
    closeModal('event-modal');
  });

  $('event-delete-btn').addEventListener('click', async () => {
    const id = $('event-id').value;
    if (!id) return;
    if (!confirm('Delete this event?')) return;
    await deleteEvent(id);
    closeModal('event-modal');
    showToast('Event deleted');
  });
}

function refreshEventStudiesPicker() {
  const labelEl = $('event-studies-label');
  const pickerEl = $('event-studies-picker');
  if (!labelEl || !pickerEl) return;
  if (STUDIES.length === 0) {
    labelEl.classList.add('hidden');
    pickerEl.innerHTML = '';
    return;
  }
  labelEl.classList.remove('hidden');
  pickerEl.innerHTML = STUDIES.map(s => {
    const checked = editingStudyIds.includes(s.id);
    return `
      <label class="studies-picker-row${checked ? ' checked' : ''}">
        <input type="checkbox" value="${s.id}"${checked ? ' checked' : ''}>
        <span>${escapeHtml(s.title)} <span class="studies-picker-meta">${s.readingMinutes} min</span></span>
      </label>`;
  }).join('');
  pickerEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.studies-picker-row').classList.toggle('checked', cb.checked);
      editingStudyIds = [...pickerEl.querySelectorAll('input:checked')].map(c => c.value);
    });
  });
}

function openEventModal(event, dateStr) {
  if (readOnly) return;
  const sel = $('event-type');

  $('event-modal-title').textContent = event ? 'Edit event' : 'Log an event';
  $('event-id').value = event ? event.id : '';
  $('event-date').value = event ? event.date : (dateStr || today());
  $('event-time').value = (event && event.time) || '';
  sel.value = event ? event.type : EVENT_TYPES[0].key;
  $('event-custom-wrap').classList.toggle('hidden', sel.value !== 'other');
  $('event-custom').value = (event && event.customLabel) || '';
  $('event-ticker').value = (event && event.ticker) || '';
  $('event-amount').value = (event && event.amount) || '';
  $('event-note').value = (event && event.note) || '';
  $('event-delete-btn').classList.toggle('hidden', !event);

  editingStudyIds = (event && event.studyIds) ? [...event.studyIds] : [];
  refreshEventStudiesPicker();

  openModal('event-modal');
}

// ===== Modal helpers =====
function setupModals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) modal.classList.remove('open');
    });
  });
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });
}

function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    }
  });
}

// ===== Utilities =====
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', init);
