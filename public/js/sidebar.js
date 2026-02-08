// public/js/sidebar.js

function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <svg viewBox="0 0 48 48" width="32" height="32"><defs><linearGradient id="slg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7c3aed"/><stop offset="100%" style="stop-color:#a78bfa"/></linearGradient></defs><circle cx="24" cy="24" r="22" fill="none" stroke="url(#slg)" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="url(#slg)"/></svg>
      <span class="sidebar-logo-text">Oris</span>
    </div>

    <nav class="sidebar-nav">
      <button class="sidebar-btn ${activePage === 'feed' ? 'active' : ''}" data-page="feed">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Лента</span>
      </button>
      <button class="sidebar-btn ${activePage === 'explore' ? 'active' : ''}" data-page="explore">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>Поиск</span>
      </button>
      <button class="sidebar-btn ${activePage === 'notifications' ? 'active' : ''}" data-page="notifications">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span>Уведомления</span>
      </button>
      <button class="sidebar-btn ${activePage === 'profile' ? 'active' : ''}" id="nav-profile-btn" data-page="profile">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Профиль</span>
      </button>
    </nav>

    <div class="sidebar-bottom">
      <button class="sidebar-btn" id="theme-toggle-btn">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>
        <span>Тема</span>
      </button>
      <div class="sidebar-user">
        <img id="sidebar-avatar" src="" alt="" class="sidebar-user-avatar">
        <div class="sidebar-user-info">
          <span id="sidebar-username" class="sidebar-user-name"></span>
          <span id="sidebar-handle" class="sidebar-user-handle"></span>
        </div>
      </div>
      <button id="logout-btn" class="sidebar-btn logout-btn">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Выйти</span>
      </button>
    </div>
  `;
}