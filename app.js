const STORAGE_KEY = 'gastos:expenses';

const CATEGORIES = [
  { id: 'alimentacao', label: 'Alimentação', color: '#f59e0b', emoji: '🍔' },
  { id: 'transporte', label: 'Transporte', color: '#3b82f6', emoji: '🚗' },
  { id: 'moradia', label: 'Moradia', color: '#8b5cf6', emoji: '🏠' },
  { id: 'saude', label: 'Saúde', color: '#10b981', emoji: '💊' },
  { id: 'lazer', label: 'Lazer', color: '#ec4899', emoji: '🎮' },
  { id: 'educacao', label: 'Educação', color: '#06b6d4', emoji: '📚' },
  { id: 'compras', label: 'Compras', color: '#ef4444', emoji: '🛍️' },
  { id: 'outros', label: 'Outros', color: '#94a3b8', emoji: '📦' },
];

let expenses = [];
let selectedCategory = 'outros';
let deferredPrompt = null;
let totalAnimated = 0;

const $ = (id) => document.getElementById(id);
const dpr = Math.min(window.devicePixelRatio || 1, 3);

const formatBRL = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatShort = (v) => {
  if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return 'R$ ' + Math.round(v);
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const dayLetter = (dateObj) => ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][dateObj.getDay()];

const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) expenses = JSON.parse(raw);
  } catch (e) { expenses = []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); }
const total = () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

// ---- count-up ----
function animateNumber(el, from, to, duration, fmt) {
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---- canvas helpers ----
function setupCanvas(canvas, cssSize) {
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  canvas.style.width = cssSize + 'px';
  canvas.style.height = cssSize + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// ---- total ring (this month share) ----
function drawRing(progress) {
  const canvas = $('ring');
  const size = 120;
  const ctx = setupCanvas(canvas, size);
  const cx = size / 2, cy = size / 2, r = 46;
  ctx.clearRect(0, 0, size, size);
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  // track
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // progress arc (gradient)
  if (progress > 0) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#22d3ee');
    grad.addColorStop(1, '#a3e635');
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }
}

function monthProgress() {
  const t = total();
  if (t <= 0) return 0;
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = expenses.filter((e) => (e.date || '').slice(0, 7) === ym)
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  return Math.min(month / t, 1);
}

// ---- 7-day bars ----
function renderBars() {
  const wrap = $('bars');
  wrap.innerHTML = '';
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(isoDaysAgo(i));
  const sums = days.map((d) =>
    expenses.filter((e) => e.date === d).reduce((s, e) => s + Number(e.amount || 0), 0)
  );
  const max = Math.max(...sums, 1);
  const weekTotal = sums.reduce((a, b) => a + b, 0);
  $('weekTotal').textContent = formatBRL(weekTotal);

  days.forEach((d, i) => {
    const dateObj = new Date(d + 'T00:00:00');
    const col = document.createElement('div');
    col.className = 'bar-col' + (i === 6 ? ' today' : '');
    const val = document.createElement('div');
    val.className = 'bar-val';
    val.textContent = sums[i] > 0 ? formatShort(sums[i]) : '';
    const track = document.createElement('div');
    track.className = 'bar-track';
    const bar = document.createElement('div');
    bar.className = 'bar';
    const h = Math.max((sums[i] / max) * 100, 3);
    bar.style.height = h + '%';
    bar.style.animationDelay = i * 0.05 + 's';
    const day = document.createElement('div');
    day.className = 'bar-day';
    day.textContent = dayLetter(dateObj);
    track.appendChild(bar);
    col.appendChild(val);
    col.appendChild(track);
    col.appendChild(day);
    wrap.appendChild(col);
  });
}

// ---- donut chart ----
function categorySums() {
  const map = {};
  expenses.forEach((e) => {
    const id = e.category || 'outros';
    map[id] = (map[id] || 0) + Number(e.amount || 0);
  });
  return CATEGORIES
    .map((c) => ({ ...c, sum: map[c.id] || 0 }))
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);
}

function drawDonut(progress) {
  const canvas = $('donut');
  const size = 180;
  const ctx = setupCanvas(canvas, size);
  const cx = size / 2, cy = size / 2, r = 66, thick = 24;
  ctx.clearRect(0, 0, size, size);

  const sums = categorySums();
  const totalSum = sums.reduce((s, c) => s + c.sum, 0);
  $('donutTotal').textContent = formatBRL(totalSum);

  if (totalSum <= 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  let startAngle = -Math.PI / 2;
  const gap = 0.04;
  sums.forEach((c) => {
    const slice = (c.sum / totalSum) * Math.PI * 2 * progress;
    if (slice <= 0) return;
    ctx.strokeStyle = c.color;
    ctx.lineWidth = thick;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle + gap / 2, startAngle + slice - gap / 2);
    ctx.stroke();
    startAngle += slice;
  });
}

function renderLegend() {
  const legend = $('legend');
  legend.innerHTML = '';
  const sums = categorySums();
  const totalSum = sums.reduce((s, c) => s + c.sum, 0);
  if (totalSum <= 0) {
    legend.innerHTML = '<div class="legend-item"><span class="legend-name" style="color:var(--muted-2)">Sem dados ainda</span></div>';
    return;
  }
  sums.forEach((c) => {
    const pct = Math.round((c.sum / totalSum) * 100);
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML =
      `<span class="legend-dot" style="background:${c.color}"></span>` +
      `<span class="legend-name">${c.emoji} ${c.label}</span>` +
      `<span class="legend-pct" style="color:${c.color}">${pct}%</span>`;
    legend.appendChild(item);
  });
}

// ---- list ----
function renderList() {
  $('countPills').textContent = expenses.length;
  $('listCount').textContent = expenses.length ? `${expenses.length} itens` : '';
  const list = $('list');
  list.innerHTML = '';

  if (expenses.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
      <div class="e1">Nenhum gasto ainda</div>
      <div class="e2">Adicione seu primeiro lançamento acima.</div>`;
    list.appendChild(empty);
    return;
  }

  expenses.forEach((e, i) => {
    const cat = categoryOf(e.category);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = Math.min(i * 0.04, 0.4) + 's';
    card.dataset.id = e.id;

    const emoji = document.createElement('div');
    emoji.className = 'emoji';
    emoji.style.background = `${cat.color}22`;
    emoji.textContent = cat.emoji;

    const body = document.createElement('div');
    body.className = 'body';
    const t = document.createElement('div');
    t.className = 'c-title';
    t.textContent = e.description;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.style.background = `${cat.color}22`;
    pill.style.color = cat.color;
    pill.textContent = cat.label;
    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = formatDate(e.date);
    meta.appendChild(pill);
    meta.appendChild(date);
    body.appendChild(t);
    body.appendChild(meta);

    const right = document.createElement('div');
    right.className = 'right';
    const amount = document.createElement('div');
    amount.className = 'amount';
    amount.textContent = formatBRL(e.amount);
    const del = document.createElement('button');
    del.className = 'del';
    del.setAttribute('aria-label', 'Remover gasto');
    del.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`;
    del.onclick = () => confirmRemove(e, card);
    right.appendChild(amount);
    right.appendChild(del);

    card.appendChild(emoji);
    card.appendChild(body);
    card.appendChild(right);
    list.appendChild(card);
  });
}

function confirmRemove(e, cardEl) {
  if (!confirm(`Remover "${e.description}"?`)) return;
  cardEl.classList.add('leaving');
  setTimeout(() => {
    expenses = expenses.filter((x) => x.id !== e.id);
    save();
    refreshAll(true);
    toast('Gasto removido');
  }, 220);
}

function refreshAll(animate) {
  const newTotal = total();
  if (animate) {
    animateNumber($('total'), totalAnimated, newTotal, 700, formatBRL);
    totalAnimated = newTotal;
  } else {
    $('total').textContent = formatBRL(newTotal);
    totalAnimated = newTotal;
  }
  const prog = monthProgress();
  drawRing(prog);
  animateNumber($('ringPct'), 0, Math.round(prog * 100), 700, (v) => Math.round(v) + '%');
  renderBars();
  drawDonut(1);
  renderLegend();
  renderList();
}

function addExpense() {
  const description = $('description').value.trim();
  const amountStr = $('amount').value.trim();
  const date = $('date').value.trim() || todayISO();
  const value = Number(amountStr.replace(',', '.'));

  if (!description || !value || value <= 0) {
    toast('Preencha descrição e um valor maior que zero');
    return;
  }

  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description,
    amount: value,
    category: selectedCategory,
    date,
    createdAt: new Date().toISOString(),
  };
  expenses = [item, ...expenses];
  save();
  $('description').value = '';
  $('amount').value = '';
  refreshAll(true);
  toast('Gasto adicionado');
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

function renderChips() {
  const wrap = $('chips');
  wrap.innerHTML = '';
  CATEGORIES.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'chip' + (c.id === selectedCategory ? ' active' : '');
    if (c.id === selectedCategory) b.style.background = c.color;
    b.textContent = `${c.emoji} ${c.label}`;
    b.onclick = () => { selectedCategory = c.id; renderChips(); };
    wrap.appendChild(b);
  });
}

function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

function setupInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('installBtn').hidden = false;
  });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') $('installBtn').hidden = true;
    deferredPrompt = null;
  });
  const installed = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS() && !installed) {
    $('iosHint').hidden = false;
    setTimeout(() => ($('iosHint').hidden = true), 6000);
  }
}

function init() {
  const now = new Date();
  $('todayLabel').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
  load();
  $('date').value = todayISO();
  renderChips();
  refreshAll(false);
  $('addBtn').addEventListener('click', addExpense);
  $('description').addEventListener('keydown', (e) => e.key === 'Enter' && addExpense());
  $('amount').addEventListener('keydown', (e) => e.key === 'Enter' && addExpense());
  setupInstall();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
