'use strict';

/* ============================================================
   STATE
   ============================================================ */
const state = {
  user:       null,
  tasks:      [],
  categories: [],
  statusFilter:   'all',
  categoryFilter: null,   // null = no filter
  editingTaskId:  null,
};

/* ============================================================
   API HELPERS
   ============================================================ */
const api = {
  async request(method, url, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    };
    const res = await fetch(url, opts);
    if (res.status === 401) { window.location.href = '/'; return null; }
    return res;
  },
  get:    (url)       => api.request('GET',    url),
  post:   (url, body) => api.request('POST',   url, body),
  put:    (url, body) => api.request('PUT',    url, body),
  patch:  (url)       => api.request('PATCH',  url),
  delete: (url)       => api.request('DELETE', url),
};

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  await loadCategories();
  await loadTasks();
});

/* ============================================================
   USER
   ============================================================ */
async function loadUser() {
  const res = await api.get('/api/auth/me');
  if (!res) return;
  state.user = await res.json();
  document.getElementById('user-name').textContent   = state.user.name;
  document.getElementById('user-avatar').textContent = state.user.name.charAt(0).toUpperCase();
}

async function logout() {
  await api.post('/api/auth/logout');
  window.location.href = '/';
}

/* ============================================================
   CATEGORIES
   ============================================================ */
async function loadCategories() {
  const res = await api.get('/api/categories');
  if (!res || !res.ok) return;
  state.categories = await res.json();
  renderCategoryNav();
  renderCategorySelect();
}

function renderCategoryNav() {
  const nav = document.getElementById('category-nav');
  nav.innerHTML = '';

  if (state.categories.length === 0) {
    nav.innerHTML = '<p style="font-size:13px;color:var(--text-light);padding:8px 12px;">Nenhuma categoria ainda</p>';
    return;
  }

  state.categories.forEach(cat => {
    const count = state.tasks.filter(t => t.category_id === cat.id).length;
    const active = state.categoryFilter === cat.id ? 'active' : '';
    const btn = document.createElement('button');
    btn.className = `sidebar-link ${active}`;
    btn.innerHTML = `
      <span class="sidebar-link-left">
        <span style="width:8px;height:8px;border-radius:50%;background:${categoryColor(cat.id)};display:inline-block;flex-shrink:0"></span>
        <span>${escHtml(cat.name)}</span>
      </span>
      <span style="display:flex;gap:4px;align-items:center">
        <span class="sidebar-badge">${count}</span>
        <button onclick="confirmDeleteCategory(${cat.id},'${escHtml(cat.name)}')" class="btn btn-ghost btn-icon" style="opacity:.5;font-size:13px;padding:2px 4px" title="Excluir">×</button>
      </span>`;
    btn.querySelector('.sidebar-link-left').addEventListener('click', () => {
      setCategoryFilter(cat.id);
    });
    nav.appendChild(btn);
  });
}

function renderCategorySelect() {
  const sel = document.getElementById('task-category-select');
  const current = sel.value;
  sel.innerHTML = '<option value="0">Sem categoria</option>';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

async function submitCategoryForm(e) {
  e.preventDefault();
  const name = document.getElementById('cat-name-input').value.trim();
  const errEl = document.getElementById('cat-modal-error');
  errEl.classList.remove('show');

  const res = await api.post('/api/categories', { name });
  if (!res) return;

  if (!res.ok) {
    const d = await res.json();
    errEl.textContent = d.error || 'Erro ao criar categoria';
    errEl.classList.add('show');
    return;
  }

  const cat = await res.json();
  state.categories.push(cat);
  closeCategoryModal();
  renderCategoryNav();
  renderCategorySelect();
  showToast(`Categoria "${cat.name}" criada!`, 'success');
}

function confirmDeleteCategory(id, name) {
  openConfirmModal(
    'Excluir categoria',
    `Excluir a categoria "${name}"? As tarefas continuarão existindo sem categoria.`,
    async () => {
      const res = await api.delete(`/api/categories/${id}`);
      if (!res || !res.ok) { showToast('Erro ao excluir categoria', 'error'); return; }
      state.categories = state.categories.filter(c => c.id !== id);
      if (state.categoryFilter === id) state.categoryFilter = null;
      state.tasks.forEach(t => { if (t.category_id === id) { t.category_id = null; t.category = null; } });
      renderCategoryNav();
      renderCategorySelect();
      renderTasks();
      showToast('Categoria excluída', 'success');
    }
  );
}

/* ============================================================
   TASKS
   ============================================================ */
async function loadTasks() {
  showSkeleton(true);
  const params = new URLSearchParams();
  if (state.statusFilter !== 'all') params.set('status', state.statusFilter);
  if (state.categoryFilter) params.set('category_id', state.categoryFilter);

  const res = await api.get(`/api/tasks?${params}`);
  showSkeleton(false);
  if (!res || !res.ok) return;

  state.tasks = await res.json();
  renderTasks();
  updateStats();
  renderCategoryNav(); // refresh category counts
}

function renderTasks() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  list.innerHTML = '';

  if (state.tasks.length === 0) {
    list.style.display = 'none';
    empty.style.display = '';
    return;
  }

  list.style.display = '';
  empty.style.display = 'none';

  state.tasks.forEach(task => {
    list.appendChild(buildTaskCard(task));
  });

  updateTaskCountLabel();
}

function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card${task.done ? ' done' : ''}`;
  card.dataset.id = task.id;

  const date = new Date(task.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const catBadge = task.category
    ? `<span class="category-badge" style="background:${categoryColor(task.category.id)}22;color:${categoryColor(task.category.id)}">
        <span style="width:6px;height:6px;border-radius:50%;background:${categoryColor(task.category.id)};display:inline-block"></span>
        ${escHtml(task.category.name)}
       </span>`
    : '';

  card.innerHTML = `
    <label class="task-checkbox">
      <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${task.id})">
      <span class="task-checkbox-box"></span>
    </label>
    <div class="task-body">
      <div class="task-title">${escHtml(task.title)}</div>
      ${task.description ? `<div class="task-description">${escHtml(task.description)}</div>` : ''}
      <div class="task-meta">
        ${catBadge}
        <span class="task-date">${date}</span>
      </div>
    </div>
    <div class="task-actions">
      <button class="btn btn-ghost btn-icon" title="Editar" onclick="openTaskModal(${task.id})">✏️</button>
      <button class="btn btn-ghost btn-icon" title="Excluir" onclick="confirmDeleteTask(${task.id},'${escHtml(task.title).replace(/'/g, "\\'")}')">🗑️</button>
    </div>`;

  return card;
}

async function toggleTask(id) {
  const res = await api.patch(`/api/tasks/${id}/toggle`);
  if (!res || !res.ok) { showToast('Erro ao atualizar tarefa', 'error'); await loadTasks(); return; }

  const updated = await res.json();
  const idx = state.tasks.findIndex(t => t.id === id);
  if (idx !== -1) state.tasks[idx] = updated;

  // Update card DOM in-place (no full reload)
  const card = document.querySelector(`.task-card[data-id="${id}"]`);
  if (card) {
    card.classList.toggle('done', updated.done);
    card.querySelector('.task-title').style.textDecoration = updated.done ? 'line-through' : '';
  }

  updateStats();
  updateTaskCountLabel();
}

async function submitTaskForm(e) {
  e.preventDefault();
  const errEl = document.getElementById('task-modal-error');
  errEl.classList.remove('show');

  const title      = document.getElementById('task-title-input').value.trim();
  const desc       = document.getElementById('task-desc-input').value.trim();
  const catId      = parseInt(document.getElementById('task-category-select').value, 10);
  const categoryID = catId === 0 ? 0 : catId;

  const body = { title, description: desc, category_id: categoryID || 0 };

  const btn = document.getElementById('task-submit-btn');
  btn.disabled = true;

  let res;
  if (state.editingTaskId) {
    res = await api.put(`/api/tasks/${state.editingTaskId}`, body);
  } else {
    res = await api.post('/api/tasks', body);
  }

  btn.disabled = false;

  if (!res || !res.ok) {
    const d = res ? await res.json() : {};
    errEl.textContent = d.error || 'Erro ao salvar tarefa';
    errEl.classList.add('show');
    return;
  }

  closeTaskModal();
  await loadTasks();
  showToast(state.editingTaskId ? 'Tarefa atualizada!' : 'Tarefa criada!', 'success');
}

function confirmDeleteTask(id, title) {
  openConfirmModal(
    'Excluir tarefa',
    `Excluir a tarefa "${title}"? Esta ação não pode ser desfeita.`,
    async () => {
      const res = await api.delete(`/api/tasks/${id}`);
      if (!res || !res.ok) { showToast('Erro ao excluir tarefa', 'error'); return; }
      state.tasks = state.tasks.filter(t => t.id !== id);
      renderTasks();
      updateStats();
      showToast('Tarefa excluída', 'success');
    }
  );
}

/* ============================================================
   FILTERS
   ============================================================ */
function setStatusFilter(status, sidebarBtn, tabBtn) {
  state.statusFilter = status;
  state.categoryFilter = null;

  // Sidebar buttons
  document.querySelectorAll('#status-nav .sidebar-link').forEach(el => el.classList.remove('active'));
  if (sidebarBtn) sidebarBtn.classList.add('active');

  // Filter tabs in main
  document.querySelectorAll('#filter-tabs .filter-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.status === status);
  });

  // Update titles
  const titles = { all: 'Todas as tarefas', pending: 'Tarefas pendentes', done: 'Tarefas concluídas' };
  document.getElementById('main-title').firstChild.textContent = titles[status] + ' ';

  loadTasks();
}

function setCategoryFilter(categoryId) {
  state.categoryFilter = state.categoryFilter === categoryId ? null : categoryId;
  state.statusFilter   = 'all';

  document.querySelectorAll('#status-nav .sidebar-link').forEach((el, i) => el.classList.toggle('active', i === 0));
  document.querySelectorAll('#filter-tabs .filter-tab').forEach(el => el.classList.toggle('active', el.dataset.status === 'all'));

  const cat = state.categories.find(c => c.id === categoryId);
  document.getElementById('main-title').firstChild.textContent =
    (state.categoryFilter ? `📂 ${cat?.name}` : 'Todas as tarefas') + ' ';

  renderCategoryNav(); // highlight active category
  loadTasks();
}

/* ============================================================
   STATS
   ============================================================ */
function updateStats() {
  const allTasks  = state.tasks;
  const total     = allTasks.length;
  const done      = allTasks.filter(t => t.done).length;
  const pending   = total - done;

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('count-all').textContent    = total;
  document.getElementById('count-pending').textContent = pending;
  document.getElementById('count-done').textContent   = done;
}

function updateTaskCountLabel() {
  const label = document.getElementById('task-count-label');
  label.textContent = state.tasks.length > 0 ? `(${state.tasks.length})` : '';
}

/* ============================================================
   MODALS
   ============================================================ */
function openTaskModal(taskId) {
  state.editingTaskId = taskId || null;
  const modal = document.getElementById('task-modal-overlay');
  const title = document.getElementById('task-modal-title');
  const errEl = document.getElementById('task-modal-error');

  errEl.classList.remove('show');
  renderCategorySelect();

  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    title.textContent = 'Editar tarefa';
    document.getElementById('task-title-input').value    = task.title;
    document.getElementById('task-desc-input').value     = task.description || '';
    document.getElementById('task-category-select').value = task.category_id || 0;
  } else {
    title.textContent = 'Nova tarefa';
    document.getElementById('task-title-input').value    = '';
    document.getElementById('task-desc-input').value     = '';
    document.getElementById('task-category-select').value = 0;
  }

  document.getElementById('task-submit-btn').textContent = taskId ? 'Salvar alterações' : 'Salvar tarefa';
  modal.classList.add('open');
  document.getElementById('task-title-input').focus();
}

function closeTaskModal(e) {
  if (e && e.target !== document.getElementById('task-modal-overlay')) return;
  document.getElementById('task-modal-overlay').classList.remove('open');
  state.editingTaskId = null;
}

function openCategoryModal() {
  document.getElementById('cat-name-input').value = '';
  document.getElementById('cat-modal-error').classList.remove('show');
  document.getElementById('cat-modal-overlay').classList.add('open');
  document.getElementById('cat-name-input').focus();
}

function closeCategoryModal(e) {
  if (e && e.target !== document.getElementById('cat-modal-overlay')) return;
  document.getElementById('cat-modal-overlay').classList.remove('open');
}

// Close modals on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('task-modal-overlay').classList.remove('open');
    document.getElementById('cat-modal-overlay').classList.remove('open');
    document.getElementById('confirm-modal-overlay').classList.remove('open');
  }
});

/* ============================================================
   CONFIRM MODAL
   ============================================================ */
let confirmCallback = null;

function openConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent   = title;
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = onConfirm;
  document.getElementById('confirm-modal-overlay').classList.add('open');

  const btn = document.getElementById('confirm-action-btn');
  btn.onclick = async () => {
    btn.disabled = true;
    await confirmCallback();
    closeConfirmModal();
    btn.disabled = false;
  };
}

function closeConfirmModal() {
  document.getElementById('confirm-modal-overlay').classList.remove('open');
  confirmCallback = null;
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

/* ============================================================
   SKELETON
   ============================================================ */
function showSkeleton(show) {
  document.getElementById('skeleton-list').style.display = show ? '' : 'none';
  document.getElementById('task-list').style.display     = show ? 'none' : '';
  if (show) document.getElementById('empty-state').style.display = 'none';
}

/* ============================================================
   UTILS
   ============================================================ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CATEGORY_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f59e0b','#10b981','#06b6d4','#3b82f6',
];

function categoryColor(id) {
  return CATEGORY_COLORS[(id - 1) % CATEGORY_COLORS.length];
}
