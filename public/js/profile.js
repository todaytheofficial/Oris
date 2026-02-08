// public/js/profile.js

const Profile = {
  currentUserId: null,

  async loadPage(userId) {
    this.currentUserId = userId;

    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById('page-profile');
    if (section) section.classList.remove('hidden');

    document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === 'profile');
    });

    const titleEl = document.getElementById('main-title');
    if (titleEl) titleEl.textContent = 'Профиль';

    const container = document.getElementById('profile-page-content');
    if (!container) return;

    container.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

    try {
      const data = await API.get(`/users/id/${userId}`);
      const user = data.user;
      const currentUser = API.getUser();
      const isOwnProfile = currentUser && currentUser.id === userId;

      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=222222&color=fff&size=200&bold=true`;
      const coverStyle = user.banner
        ? `background-image: url(${user.banner}); background-size: cover; background-position: center;`
        : '';

      container.innerHTML = `
        <!-- Обложка -->
        <div class="profile-cover-section">
          <div class="profile-cover-bg" style="${coverStyle}"></div>
          ${isOwnProfile ? `
            <label class="cover-upload-btn" title="Сменить баннер">
              <input type="file" id="pp-cover-input" accept="image/*" hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </label>
          ` : ''}
        </div>

        <!-- Аватар + инфо -->
        <div class="profile-main-info">
          <div class="profile-avatar-row">
            <div class="profile-avatar-area">
              <img class="avatar avatar-xl profile-page-avatar" src="${user.avatar || defaultAvatar}" alt="" id="pp-avatar">
              ${isOwnProfile ? `
                <label class="avatar-upload-btn" title="Сменить аватар">
                  <input type="file" id="pp-avatar-input" accept="image/*" hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </label>
              ` : ''}
            </div>
            <div class="profile-actions-area">
              ${isOwnProfile ? `
                <button class="btn btn-outline" id="edit-profile-btn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span>Редактировать</span>
                </button>
              ` : `
                <button class="btn ${user.isFollowing ? 'btn-outline' : 'btn-primary'}" id="follow-btn" data-userid="${userId}">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    ${user.isFollowing
                      ? '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>'
                      : '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>'
                    }
                  </svg>
                  <span>${user.isFollowing ? 'Отписаться' : 'Подписаться'}</span>
                </button>
              `}
            </div>
          </div>

          <div class="profile-details">
            <h2 class="profile-page-name" id="pp-name">${this.escapeHtml(user.displayName || user.username)}${user.hasBadge ? ' <span class="badge-icon"></span>' : ''}</h2>
            <p class="profile-page-handle">@${user.username}</p>
            ${user.bio ? `<p class="profile-page-bio">${this.escapeHtml(user.bio)}</p>` : ''}
            <div class="profile-stats">
              <div class="stat-item">
                <span class="stat-number">${user.postCount || 0}</span>
                <span class="stat-label">постов</span>
              </div>
              <div class="stat-item">
                <span class="stat-number" id="pp-followers">${user.followersCount || 0}</span>
                <span class="stat-label">подписчиков</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">${user.followingCount || 0}</span>
                <span class="stat-label">подписок</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="profile-tabs">
          <button class="profile-tab active" data-tab="posts">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Посты
          </button>
          <button class="profile-tab" data-tab="media">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Медиа
          </button>
          <button class="profile-tab" data-tab="likes">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            Лайки
          </button>
        </div>

        <div id="profile-posts-container" class="profile-posts-container"></div>
      `;

      this.bindPageEvents(userId, isOwnProfile);
      this.loadPosts(userId, 'posts');

    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p class="empty-state-text">${err.message}</p>
        </div>
      `;
    }
  },

  bindPageEvents(userId, isOwnProfile) {
    document.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.loadPosts(userId, tab.dataset.tab);
      });
    });

    if (isOwnProfile) {
      document.getElementById('edit-profile-btn')?.addEventListener('click', () => this.openEditModal());
      document.getElementById('pp-avatar-input')?.addEventListener('change', (e) => this.uploadAvatar(e));
      document.getElementById('pp-cover-input')?.addEventListener('change', (e) => this.uploadCover(e));
    } else {
      document.getElementById('follow-btn')?.addEventListener('click', () => this.toggleFollow(userId));
    }
  },

  async loadPosts(userId, tab = 'posts') {
    const container = document.getElementById('profile-posts-container');
    if (!container) return;

    container.innerHTML = '<div class="page-loading"><div class="spinner-sm"></div></div>';

    try {
      let url;
      if (tab === 'posts') url = `/posts/user/${userId}?limit=20`;
      else if (tab === 'media') url = `/posts/user/${userId}?limit=20&type=media`;
      else if (tab === 'likes') url = `/posts/user/${userId}/likes?limit=20`;

      const data = await API.get(url);
      container.innerHTML = '';

      if (!data.posts || data.posts.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <p class="empty-state-text">Пока пусто</p>
          </div>
        `;
        return;
      }

      data.posts.forEach(post => container.appendChild(App.renderPost(post)));
    } catch {
      container.innerHTML = '<p class="empty-state-text">Ошибка загрузки</p>';
    }
  },

  async toggleFollow(userId) {
    const btn = document.getElementById('follow-btn');
    if (!btn) return;

    try {
      const data = await API.post(`/users/${userId}/follow`);
      btn.className = `btn ${data.isFollowing ? 'btn-outline' : 'btn-primary'}`;
      btn.querySelector('span').textContent = data.isFollowing ? 'Отписаться' : 'Подписаться';

      const followersEl = document.getElementById('pp-followers');
      if (followersEl) followersEl.textContent = data.followersCount;

      Toast.show(data.isFollowing ? 'Вы подписались' : 'Вы отписались', 'success');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  openEditModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const user = API.getUser();
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=222222&color=fff&size=200&bold=true`;

    document.getElementById('profile-avatar').src = user.avatar || defaultAvatar;
    document.getElementById('profile-displayname').textContent = user.displayName || user.username;
    document.getElementById('profile-username').textContent = `@${user.username}`;
    document.getElementById('edit-displayname').value = user.displayName || '';
    document.getElementById('edit-bio').value = user.bio || '';

    modal.querySelector('.modal-overlay').onclick = () => this.closeEditModal();
    modal.querySelector('.modal-close').onclick = () => this.closeEditModal();
    document.getElementById('profile-form').onsubmit = (e) => this.saveProfile(e);
    document.getElementById('avatar-input').onchange = (e) => this.uploadAvatar(e);
  },

  closeEditModal() {
    document.getElementById('profile-modal')?.classList.add('hidden');
  },

  async saveProfile(e) {
    e.preventDefault();

    try {
      const data = await API.put('/users/profile', {
        displayName: document.getElementById('edit-displayname').value.trim(),
        bio: document.getElementById('edit-bio').value.trim()
      });

      const user = API.getUser();
      user.displayName = data.user.displayName;
      user.bio = data.user.bio;
      API.setUser(user);

      const ppName = document.getElementById('pp-name');
      if (ppName) ppName.textContent = data.user.displayName;
      document.getElementById('profile-displayname').textContent = data.user.displayName;
      App.updateUI();

      Toast.show('Профиль обновлён', 'success');
      this.closeEditModal();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Toast.show('Максимум 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      Toast.show('Загрузка...', 'info');
      const data = await API.post('/users/avatar', formData);

      const user = API.getUser();
      user.avatar = data.avatar;
      API.setUser(user);

      document.querySelectorAll('#pp-avatar, #profile-avatar').forEach(img => img.src = data.avatar);
      App.updateUI();

      Toast.show('Аватар обновлён!', 'success');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async uploadCover(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Toast.show('Максимум 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('banner', file);

    try {
      Toast.show('Загрузка...', 'info');
      const data = await API.post('/users/banner', formData);

      const user = API.getUser();
      user.banner = data.banner;
      API.setUser(user);

      const coverBg = document.querySelector('.profile-cover-bg');
      if (coverBg) {
        coverBg.style.backgroundImage = `url(${data.banner})`;
        coverBg.style.backgroundSize = 'cover';
        coverBg.style.backgroundPosition = 'center';
      }

      Toast.show('Баннер обновлён!', 'success');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};