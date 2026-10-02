const STORAGE_KEY = 'gastos:expenses';

const CATEGORIES = [
  { id: 'alimentacao', label: 'Alimentação', color: '#f59e0b', emoji: '🍔' },
  { id: 'transporte', label: 'Transporte', color: '#3b82f6', emoji: '🚗' },
  { id: 'moradia', label: 'Moradia', color: '#8b5cf6', emoji: '🏠' },
  { id: 'saude', label: 'Saúde', color: '#10b981', emoji: '💊' },
  { id: 'lazer', label: 'Lazer', color: '#ec4899', emoji: '🎮' },
  { id: 'educacao', label: 'Educação', color: '#06b6d4', emoji: '📚' },
  { id: 'compras', label: 'Compras', color: '#ef4444', emoji: '🛍️' },
  { id: 'outros', label: 'Outros', color: '#64748b', emoji: '📦' },
];

let expenses = [];
let selectedCategory = 'outros';
let deferredPrompt = null;

const $ = (id) => document.getElementById(id);

const formatBRL = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const categoryOf = (id) =>
  CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) expenses = JSON.parse(raw);
  } catch (e) {
    expenses = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function total() {
  return expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
}

function renderChips() {
  const wrap = $('chips');
  wrap.innerHTML = '';
  CATEGORIES.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'chip' + (c.id === selectedCategory ? ' active' : '');
    if (c.id === selectedCategory) b.style.background = c.color;
    b.textContent = `${c.emoji} ${c.label}`;
    b.onclick = () => {
      selectedCategory = c.id;
      renderChips();
    };
    wrap.appendChild(b);
  });
}

function renderList() {
  $('total').textContent = formatBRL(total());
  const list = $('list');
  list.innerHTML = '';

  if (expenses.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M16 7H3"/><path d="M17 13h-6"/><path d="M17 17h-6"/></svg>
      <div class="e1">Nenhum gasto ainda</div>
      <div class="e2">Adicione seu primeiro gasto acima.</div>`;
    list.appendChild(empty);
    return;
  }

  expenses.forEach((e) => {
    const cat = categoryOf(e.category);
    const card = document.createElement('div');
    card.className = 'card';

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
    del.onclick = () => confirmRemove(e);
    right.appendChild(amount);
    right.appendChild(del);

    card.appendChild(emoji);
    card.appendChild(body);
    card.appendChild(right);
    list.appendChild(card);
  });
}

function confirmRemove(e) {
  if (confirm(`Remover "${e.description}"?`)) {
    expenses = expenses.filter((x) => x.id !== e.id);
    save();
    renderList();
    toast('Gasto removido');
  }
}

function addExpense() {
  const description = $('description').value.trim();
  const amountStr = $('amount').value.trim();
  const date = $('date').value.trim() || todayISO();
  const value = Number(amountStr.replace(',', '.'));

  if (!description || !value || value <= 0) {
    toast('Preencha descrição e valor maior que zero');
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
  renderList();
  $('description').value = '';
  $('amount').value = '';
  toast('Gasto adicionado');
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 1800);
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

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

  const installed =
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS() && !installed) {
    $('iosHint').hidden = false;
    setTimeout(() => ($('iosHint').hidden = true), 6000);
  }
}

function init() {
  load();
  $('date').value = todayISO();
  renderChips();
  renderList();
  $('addBtn').addEventListener('click', addExpense);
  $('description').addEventListener('keydown', (e) => e.key === 'Enter' && addExpense());
  $('amount').addEventListener('keydown', (e) => e.key === 'Enter' && addExpense());
  setupInstall();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
