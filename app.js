const STATUSES = ['Pendiente', 'En búsqueda', 'Agregada', 'Disponible'];
const config = window.APP_CONFIG || {};
const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
const db = isConfigured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
let activeFilter = 'Todas';
let adminItems = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function safeImage(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
function formatDate(value) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}
function cover(item, className = 'thumb') {
  const url = safeImage(item.image || '');
  return url ? `<img class="${className}" src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\'${className} thumb-placeholder\'>✳</div>'">` : `<div class="${className} thumb-placeholder">✳</div>`;
}
function showSetupError(error) {
  window.alert(error?.message || 'Configura primero la URL y la clave pública de Supabase en config.js.');
}
function renderRecent(items) {
  const recent = [...items].sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,6);
  document.querySelector('#recent-list').innerHTML = recent.length ? recent.map(item => `<article class="recent-card">${cover(item)}<div class="recent-info"><div class="recent-title">${escapeHtml(item.title)}</div><div class="recent-meta">${escapeHtml(item.type)}${item.year ? ` · ${escapeHtml(item.year)}` : ''}</div><span class="badge" data-status="${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></div></article>`).join('') : '<div class="empty-state">Todavía no hay actualizaciones en la lista.</div>';
  document.querySelector('#nav-count').textContent = items.filter(item => item.status === 'Pendiente').length;
}
function renderAdmin(items) {
  adminItems = items;
  document.querySelector('#stat-total').textContent = items.length;
  document.querySelector('#stat-pending').textContent = items.filter(x => x.status === 'Pendiente').length;
  document.querySelector('#stat-searching').textContent = items.filter(x => x.status === 'En búsqueda').length;
  document.querySelector('#stat-added').textContent = items.filter(x => x.status === 'Agregada').length;
  document.querySelector('#stat-ready').textContent = items.filter(x => x.status === 'Disponible').length;
  document.querySelector('#filter-total').textContent = items.length;
  const visible = [...items].sort((a,b) => b.created_at.localeCompare(a.created_at)).filter(x => activeFilter === 'Todas' || x.status === activeFilter);
  document.querySelector('#admin-list').innerHTML = visible.length ? visible.map(item => `<article class="request-row" data-id="${escapeHtml(item.id)}">${cover(item)}<div><div class="row-title">${escapeHtml(item.title)}</div><div class="row-meta">${escapeHtml(item.type)}${item.year ? ` · ${escapeHtml(item.year)}` : ''}</div></div><div class="row-type"><span class="row-label">SOLICITADA POR</span><span class="row-value">${escapeHtml(item.requester)}</span></div><div class="row-date"><span class="row-label">FECHA</span><span class="row-value">${formatDate(item.created_at)}</span></div><div><span class="row-label">ESTADO</span><select class="status-select" aria-label="Estado de ${escapeHtml(item.title)}">${STATUSES.map(status => `<option ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}</select></div><button class="delete-button" aria-label="Eliminar ${escapeHtml(item.title)}" title="Eliminar petición">×</button></article>`).join('') : `<div class="empty-state">${items.length ? 'No hay peticiones en esta categoría.' : 'La cola está vacía. Cuando alguien envíe una petición aparecerá aquí.'}</div>`;
}
async function refreshUpdates() {
  if (!db) return;
  const { data, error } = await db.from('public_updates').select('id,title,type,year,image,status,updated_at').order('updated_at', { ascending: false }).limit(30);
  if (error) { document.querySelector('#recent-list').innerHTML = '<div class="empty-state">No se pudieron cargar las actualizaciones.</div>'; return; }
  renderRecent(data || []);
}
async function refreshAdmin() {
  if (!db) throw new Error('Falta la configuración de Supabase.');
  const { data: { session }, error: sessionError } = await db.auth.getSession();
  if (sessionError || !session) throw new Error('Inicia sesión para continuar.');
  const { data, error } = await db.from('requests').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  document.querySelector('#admin-login').hidden = true;
  document.querySelector('#admin-content').hidden = false;
  renderAdmin(data || []);
}
async function showView(view) {
  const isAdmin = view === 'admin';
  document.querySelector('#request-view').hidden = isAdmin;
  document.querySelector('#admin-view').hidden = !isAdmin;
  document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (isAdmin) {
    try { await refreshAdmin(); }
    catch { document.querySelector('#admin-login').hidden = false; document.querySelector('#admin-content').hidden = true; }
  }
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelector('#request-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!db) return showSetupError();
  const form = new FormData(event.currentTarget);
  const submit = event.currentTarget.querySelector('[type="submit"]');
  const year = String(form.get('year') || '').trim();
  submit.disabled = true;
  const { error } = await db.from('requests').insert({ title: String(form.get('title')).trim(), requester: String(form.get('requester')).trim(), type: form.get('type'), year: year ? Number(year) : null, image: safeImage(String(form.get('image') || '').trim()) });
  submit.disabled = false;
  if (error) return window.alert(error.message);
  event.currentTarget.reset();
  document.querySelector('#success-message').hidden = false;
  setTimeout(() => { document.querySelector('#success-message').hidden = true; }, 4500);
  await refreshUpdates();
});
document.querySelector('#admin-login').addEventListener('submit', async event => {
  event.preventDefault();
  if (!db) return showSetupError();
  const email = document.querySelector('#admin-email').value.trim();
  const password = document.querySelector('#admin-password').value;
  const button = event.currentTarget.querySelector('[type="submit"]');
  button.disabled = true;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (!error) {
    document.querySelector('#admin-password').value = '';
    document.querySelector('#login-error').hidden = true;
    try { await refreshAdmin(); } catch { document.querySelector('#login-error').hidden = false; }
  } else document.querySelector('#login-error').hidden = false;
  button.disabled = false;
});
document.querySelector('#logout-button').addEventListener('click', async () => {
  await db?.auth.signOut();
  document.querySelector('#admin-login').hidden = false;
  document.querySelector('#admin-content').hidden = true;
  showView('request');
});
document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-button').forEach(filter => filter.classList.toggle('selected', filter === button));
  renderAdmin(adminItems);
}));
document.querySelector('#admin-list').addEventListener('change', async event => {
  if (!event.target.matches('.status-select')) return;
  const row = event.target.closest('.request-row');
  const { error } = await db.from('requests').update({ status: event.target.value, updated_at: new Date().toISOString() }).eq('id', row.dataset.id);
  if (error) return window.alert(error.message);
  await Promise.all([refreshAdmin(), refreshUpdates()]);
});
document.querySelector('#admin-list').addEventListener('click', async event => {
  const button = event.target.closest('.delete-button');
  if (!button) return;
  const row = button.closest('.request-row');
  const { error } = await db.from('requests').delete().eq('id', row.dataset.id);
  if (error) return window.alert(error.message);
  await Promise.all([refreshAdmin(), refreshUpdates()]);
});
refreshUpdates();
setInterval(() => { if (!document.hidden) refreshUpdates(); }, 30000);
