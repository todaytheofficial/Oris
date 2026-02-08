// public/js/admin.js

const Admin = {
  initialized: false,

  init() {
    const user = API.getUser();
    if (!user) return;

    // Показываем кнопку админки только Today_Idk
    const adminBtn = document.getElementById('nav-admin-btn');
    if (user.username === 'Today_Idk') {
      if (adminBtn) adminBtn.style.display = '';
    }
  },

  async loadPanel() {
    if (!this.initialized) {
      this.initialized = true;
      const input = document.getElementById('admin-search');
      let debounce;
      input?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => this.loadUsers(input.value.trim()), 400);
      });
    }
    this.loadUsers('');
  },

  async loadUsers(query) {
    const list = document.getElementById('admin-users-list');
    if (!list) return;

    list.innerHTML = '<div class="page-loading"><div class="spinner-sm"></div></div>';

    try {
      const data = await API.get(`/admin/users?q=${encodeURIComponent(query)}`);

      if (!data.users?.length) {
        list.innerHTML = '<p class="empty-state-text" style="padding:40px">Не найдено</p>';
        return;
      }

      list.innerHTML = '';
      data.users.forEach(user => list.appendChild(this.renderUserCard(user)));
    } catch (err) {
      list.innerHTML = `<p class="empty-state-text" style="padding:40px">${err.message}</p>`;
    }
  },

  renderUserCard(user) {
    const div = document.createElement('div');
    div.className = `admin-user-card ${user.isBanned ? 'banned' : ''}`;
    div.dataset.userId = user._id;

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=222&color=fff&size=84&bold=true`;

    div.innerHTML = `
      <div class="admin-user-info">
        <img class="avatar avatar-md" src="${user.avatar || defaultAvatar}" alt="">
        <div>
          <div class="admin-user-name">
            ${App.escapeHtml(user.displayName || user.username)}
            ${user.hasBadge ? '<svg class="badge-inline" viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' : ''}
            ${user.isBanned ? '<span class="ban-tag">ЗАБАНЕН</span>' : ''}
          </div>
          <div class="admin-user-meta">@${user.username} · ${user.email} · ${user.followersCount || 0} подписчиков</div>
        </div>
      </div>
      <div class="admin-user-actions">
        <button class="admin-btn badge-btn" title="${user.hasBadge ? 'Снять галочку' : 'Дать галочку'}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="${user.hasBadge ? '#fff' : 'none'}" stroke="#fff" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
        <button class="admin-btn ban-btn" title="${user.isBanned ? 'Разбанить' : 'Забанить'}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="${user.isBanned ? '#2ed573' : '#ff4757'}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </button>
        <div class="admin-followers-input">
          <input type="number" class="followers-count-input" placeholder="0" min="1" max="100000" value="100">
          <button class="admin-btn add-followers-btn" title="Накрутить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </button>
        </div>
        <button class="admin-btn delete-btn" title="Удалить аккаунт">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ff4757" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    `;

    // Badge toggle
    div.querySelector('.badge-btn').addEventListener('click', async () => {
      try {
        const data = await API.post(`/admin/badge/${user._id}`);
        Toast.show(`${user.username}: галочка ${data.hasBadge ? 'выдана' : 'снята'}`, 'success');
        this.loadUsers(document.getElementById('admin-search')?.value || '');
      } catch (err) { Toast.show(err.message, 'error'); }
    });

    // Ban toggle
    div.querySelector('.ban-btn').addEventListener('click', async () => {
      const reason = user.isBanned ? '' : (prompt('Причина бана:') || 'Нарушение правил');
      try {
        const data = await API.post(`/admin/ban/${user._id}`, { reason });
        Toast.show(`${user.username}: ${data.isBanned ? 'забанен' : 'разбанен'}`, 'success');
        this.loadUsers(document.getElementById('admin-search')?.value || '');
      } catch (err) { Toast.show(err.message, 'error'); }
    });

    // Add followers
    div.querySelector('.add-followers-btn').addEventListener('click', async () => {
      const count = parseInt(div.querySelector('.followers-count-input').value) || 0;
      if (count < 1) return;
      try {
        const data = await API.post(`/admin/followers/${user._id}`, { count });
        Toast.show(`${user.username}: +${count} подписчиков (всего ${data.followersCount})${data.hasBadge ? ' ✓' : ''}`, 'success');
        this.loadUsers(document.getElementById('admin-search')?.value || '');
      } catch (err) { Toast.show(err.message, 'error'); }
    });

    // Delete
    div.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm(`Удалить аккаунт @${user.username}? Это необратимо!`)) return;
      try {
        await API.delete(`/admin/user/${user._id}`);
        Toast.show(`${user.username} удалён`, 'info');
        div.style.transition = '0.3s'; div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
      } catch (err) { Toast.show(err.message, 'error'); }
    });

    return div;
  }
};