// public/js/search.js

const Search = {
  currentType: 'users',

  init() {
    if (!Auth.requireAuth()) return;
    App.updateUI();
    App.initThemeToggle();
    this.bindEvents();
  },

  bindEvents() {
    const input = document.getElementById('search-input');
    let timeout;

    input?.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => this.doSearch(input.value.trim()), 400);
    });

    document.querySelectorAll('.search-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentType = tab.dataset.type;
        const q = document.getElementById('search-input')?.value.trim();
        if (q) this.doSearch(q);
      });
    });

    // Sidebar events
    document.getElementById('logout-btn')?.addEventListener('click', () => Auth.logout());
    document.getElementById('nav-profile-btn')?.addEventListener('click', () => {
      const user = API.getUser();
      if (user) window.location.href = `/profile/${user.username}`;
    });
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });
    document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'feed') window.location.href = '/feed';
        if (page === 'explore') window.location.href = '/search';
        if (page === 'notifications') window.location.href = '/notifications';
        if (page === 'profile') {
          const user = API.getUser();
          if (user) window.location.href = `/profile/${user.username}`;
        }
      });
    });
  },

  async doSearch(query) {
    const container = document.getElementById('search-results');
    if (!query || query.length < 2) {
      container.innerHTML = '<div class="empty-state"><p>Введите минимум 2 символа</p></div>';
      return;
    }

    container.innerHTML = '<div class="feed-loader"><div class="spinner"></div></div>';

    try {
      if (this.currentType === 'users') {
        const data = await API.get(`/users/search?q=${encodeURIComponent(query)}`);
        container.innerHTML = '';

        if (data.users.length === 0) {
          container.innerHTML = '<div class="empty-state"><p>Никого не найдено</p></div>';
          return;
        }

        data.users.forEach(user => {
          const card = document.createElement('div');
          card.className = 'user-card';
          const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=7c3aed&color=fff&size=84&bold=true`;

          card.innerHTML = `
            <img src="${user.avatar || defaultAvatar}" class="avatar avatar-lg" alt="">
            <div class="user-card-info">
              <span class="user-card-name">${user.displayName || user.username}</span>
              <span class="user-card-handle">@${user.username}</span>
              ${user.bio ? `<p class="user-card-bio">${user.bio}</p>` : ''}
            </div>
          `;
          card.addEventListener('click', () => {
            window.location.href = `/profile/${user.username}`;
          });
          container.appendChild(card);
        });
      } else {
        const data = await API.get(`/posts/search?q=${encodeURIComponent(query)}`);
        container.innerHTML = '';

        if (data.posts.length === 0) {
          container.innerHTML = '<div class="empty-state"><p>Ничего не найдено</p></div>';
          return;
        }

        data.posts.forEach(post => {
          container.appendChild(App.renderPost(post));
        });
      }
    } catch {
      container.innerHTML = '<div class="empty-state"><p>Ошибка поиска</p></div>';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Search.init());