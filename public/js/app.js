// public/js/app.js

const App = {
  initialized: false,
  feedCursor: null,
  isLoadingFeed: false,
  hasMorePosts: true,
  feedLoaded: false,
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  selectedFile: null,
  selectedFileType: 'text',
  selectedGifUrl: null,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    Router.init();
    this.setupRoutes();
    this.updateUI();
    this.bindEvents();
    this.setupInfiniteScroll();
    Admin.init();
  },

  setupRoutes() {
    Router.on('/', () => this.showPage('feed'));
    Router.on('/feed', () => this.showPage('feed'));
    Router.on('/search', () => this.showPage('search'));
    Router.on('/notifications', () => this.showPage('notifications'));
    Router.on('/admin', () => this.showPage('admin'));
    Router.on('/profile/:id', (params) => Profile.loadPage(params.id));
  },

  showPage(page) {
    document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(`page-${page}`);
    if (section) section.classList.remove('hidden');

    const titles = { feed: 'Лента', search: 'Поиск', notifications: 'Уведомления', admin: 'Админка' };
    const titleEl = document.getElementById('main-title');
    if (titleEl) titleEl.textContent = titles[page] || '';

    if (page === 'feed' && !this.feedLoaded) { this.loadFeed(); this.feedLoaded = true; }
    if (page === 'search') Search.init();
    if (page === 'notifications') Notifications.init();
    if (page === 'admin') Admin.loadPanel();
  },

  updateUI() {
    const user = API.getUser();
    if (!user) return;
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=222222&color=fff&size=128&bold=true`;
    const avatar = user.avatar || defaultAvatar;

    this.setEl('sidebar-avatar', 'src', avatar);
    this.setEl('sidebar-username', 'textContent', user.displayName || user.username);
    this.setEl('sidebar-handle', 'textContent', `@${user.username}`);
    this.setEl('create-post-avatar', 'src', avatar);
  },

  setEl(id, prop, val) {
    const el = document.getElementById(id);
    if (el) el[prop] = val;
  },

  bindEvents() {
    const textarea = document.getElementById('post-text');
    if (textarea) {
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
      textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') this.createPost();
      });
    }

    document.getElementById('publish-btn')?.addEventListener('click', () => this.createPost());
    document.getElementById('post-image-input')?.addEventListener('change', (e) => this.handleImageSelect(e));
    document.getElementById('voice-record-btn')?.addEventListener('click', () => this.toggleVoiceRecording());

    document.getElementById('emoji-btn')?.addEventListener('click', function() {
      EmojiPicker.open(document.getElementById('post-text'), this);
    });

    document.getElementById('gif-btn')?.addEventListener('click', function() {
      GifPicker.open(this, (url) => {
        App.selectedGifUrl = url;
        App.selectedFile = null;
        App.selectedFileType = 'image';
        App.showMediaPreview(url, 'gif');
      });
    });

    document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'profile') {
          const user = API.getUser();
          if (user) Router.navigate(`/profile/${user.id}`);
        } else if (page === 'admin') {
          Router.navigate('/admin');
        } else {
          Router.navigate(page === 'feed' ? '/' : `/${page}`);
        }
      });
    });

    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sidebar') && !e.target.closest('.mobile-menu-btn')) {
        document.querySelector('.sidebar')?.classList.remove('open');
      }
      if (!e.target.closest('.post-actions-menu')) {
        document.querySelectorAll('.post-dropdown').forEach(d => d.classList.add('hidden'));
      }
    });
  },

  handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.selectedFile = file;
    this.selectedFileType = 'image';
    this.selectedGifUrl = null;
    this.showMediaPreview(URL.createObjectURL(file), 'image');
  },

  showMediaPreview(src, type) {
    const preview = document.getElementById('media-preview');
    if (!preview) return;
    preview.innerHTML = '';
    preview.classList.remove('hidden');

    const img = document.createElement('img');
    img.src = src;
    preview.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-media';
    removeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    removeBtn.addEventListener('click', () => this.clearMedia());
    preview.appendChild(removeBtn);
  },

  async toggleVoiceRecording() {
    const btn = document.getElementById('voice-record-btn');
    if (!btn) return;

    if (this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      btn.classList.remove('recording');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType;
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const ext = mimeType.includes('webm') ? '.webm' : '.ogg';
        this.selectedFile = new File([blob], `voice${ext}`, { type: mimeType });
        this.selectedFileType = 'voice';
        this.selectedGifUrl = null;

        const preview = document.getElementById('media-preview');
        preview.innerHTML = '';
        preview.classList.remove('hidden');
        const wrapper = document.createElement('div');
        wrapper.className = 'voice-preview';
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = URL.createObjectURL(blob);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-media';
        removeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        removeBtn.addEventListener('click', () => this.clearMedia());
        wrapper.appendChild(audio);
        wrapper.appendChild(removeBtn);
        preview.appendChild(wrapper);
        stream.getTracks().forEach(t => t.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      btn.classList.add('recording');
      Toast.show('Запись... Нажмите снова для остановки', 'info');
    } catch { Toast.show('Нет доступа к микрофону', 'error'); }
  },

  clearMedia() {
    this.selectedFile = null;
    this.selectedFileType = 'text';
    this.selectedGifUrl = null;
    const preview = document.getElementById('media-preview');
    if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
    const imgInput = document.getElementById('post-image-input');
    if (imgInput) imgInput.value = '';
  },

  async createPost() {
    const textarea = document.getElementById('post-text');
    const text = textarea?.value.trim() || '';
    const btn = document.getElementById('publish-btn');

    if (!text && !this.selectedFile && !this.selectedGifUrl) {
      Toast.show('Напишите что-нибудь или прикрепите файл', 'error');
      return;
    }

    if (btn) btn.disabled = true;

    try {
      let data;
      if (this.selectedGifUrl) {
        data = await API.post('/posts', { text, type: 'image', gifUrl: this.selectedGifUrl });
      } else {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('type', this.selectedFileType);
        if (this.selectedFile) formData.append('media', this.selectedFile);
        data = await API.post('/posts', formData);
      }

      const feed = document.getElementById('feed');
      if (feed) feed.prepend(this.renderPost(data.post));
      if (textarea) { textarea.value = ''; textarea.style.height = 'auto'; }
      this.clearMedia();
      Toast.show('Пост опубликован!', 'success');
    } catch (error) {
      Toast.show(error.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  async loadFeed() {
    if (this.isLoadingFeed || !this.hasMorePosts) return;
    this.isLoadingFeed = true;
    document.getElementById('feed-loader')?.classList.remove('hidden');

    try {
      let url = '/posts/feed?limit=20';
      if (this.feedCursor) url += `&cursor=${this.feedCursor}`;
      const data = await API.get(url);
      if (data.posts) data.posts.forEach(post => this.appendPost(post));
      this.feedCursor = data.nextCursor;
      if (!data.nextCursor) {
        this.hasMorePosts = false;
        document.getElementById('feed-end')?.classList.remove('hidden');
      }
    } catch { Toast.show('Ошибка загрузки ленты', 'error'); }
    finally {
      this.isLoadingFeed = false;
      document.getElementById('feed-loader')?.classList.add('hidden');
    }
  },

  setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) this.loadFeed();
    });
  },

  appendPost(post) {
    document.getElementById('feed')?.appendChild(this.renderPost(post));
  },

  renderPost(post) {
    const template = document.getElementById('post-template');
    const clone = template.content.cloneNode(true);
    const article = clone.querySelector('.post-card');
    article.dataset.postId = post._id;

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.displayName || 'U')}&background=222222&color=fff&size=84&bold=true`;

    clone.querySelector('.post-avatar').src = post.author?.avatar || defaultAvatar;

    const authorEl = clone.querySelector('.post-author');
    authorEl.textContent = post.author?.displayName || post.author?.username || 'Пользователь';
    authorEl.addEventListener('click', () => {
      if (post.author?._id) Router.navigate(`/profile/${post.author._id}`);
    });

    // Галочка
    const badgeIcon = clone.querySelector('.badge-icon');
    if (post.author?.hasBadge && badgeIcon) badgeIcon.classList.remove('hidden');

    clone.querySelector('.post-time').textContent = this.formatTime(post.createdAt);

    // Меню
    const currentUser = API.getUser();
    const menuBtn = clone.querySelector('.post-menu-btn');
    const dropdown = clone.querySelector('.post-dropdown');
    const deleteBtn = clone.querySelector('.post-delete-btn');

    if (currentUser && (post.author?._id === currentUser.id || currentUser.username === 'Today_Idk')) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.post-dropdown').forEach(d => d.classList.add('hidden'));
        dropdown.classList.toggle('hidden');
      });
      deleteBtn.addEventListener('click', () => this.deletePost(post._id));
    } else {
      menuBtn.style.display = 'none';
    }

    // Текст
    const textEl = clone.querySelector('.post-text');
    if (post.text) textEl.textContent = post.text;
    else textEl.style.display = 'none';

    // Медиа
    const mediaContainer = clone.querySelector('.post-media');
    if (post.gifUrl) {
      const img = document.createElement('img');
      img.src = post.gifUrl;
      img.alt = 'GIF';
      img.loading = 'lazy';
      img.className = 'post-gif';
      mediaContainer.appendChild(img);
    } else if (post.mediaUrl) {
      if (post.type === 'voice') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = post.mediaUrl;
        audio.preload = 'metadata';
        mediaContainer.appendChild(audio);
      } else {
        const img = document.createElement('img');
        img.src = post.mediaUrl;
        img.alt = 'Фото';
        img.loading = 'lazy';
        mediaContainer.appendChild(img);
      }
    }

    // Лайк
    const likeBtn = clone.querySelector('.like-btn');
    const likeCount = clone.querySelector('.like-count');
    likeCount.textContent = post.likesCount || 0;
    if (post.isLiked) likeBtn.classList.add('liked');
    likeBtn.addEventListener('click', () => this.toggleLike(post._id, likeBtn, likeCount));

    // Комменты
    const commentBtn = clone.querySelector('.comment-btn');
    commentBtn.querySelector('span').textContent = post.commentsCount || 0;
    commentBtn.addEventListener('click', () => this.toggleComments(post._id, article));

    // Поделиться
    clone.querySelector('.share-btn').addEventListener('click', () => {
      const url = `${window.location.origin}/post/${post._id}`;
      if (navigator.share) navigator.share({ title: 'Oris', text: post.text || '', url }).catch(() => {});
      else { navigator.clipboard.writeText(url).then(() => Toast.show('Ссылка скопирована', 'success')); }
    });

    // Закладка
    const bookmarkBtn = clone.querySelector('.bookmark-btn');
    if (post.isBookmarked) bookmarkBtn.classList.add('bookmarked');
    bookmarkBtn.addEventListener('click', async () => {
      try {
        const data = await API.post(`/posts/${post._id}/bookmark`);
        bookmarkBtn.classList.toggle('bookmarked', data.isBookmarked);
        Toast.show(data.isBookmarked ? 'Сохранено' : 'Убрано', 'info');
      } catch { Toast.show('Ошибка', 'error'); }
    });

    return clone;
  },

  async toggleLike(postId, btn, countEl) {
    try {
      const data = await API.post(`/posts/${postId}/like`);
      btn.classList.toggle('liked', data.isLiked);
      countEl.textContent = data.likesCount;
    } catch { Toast.show('Ошибка', 'error'); }
  },

  async toggleComments(postId, articleEl) {
    let section = articleEl.querySelector('.comments-section');
    if (section) { section.classList.toggle('hidden'); return; }

    section = document.createElement('div');
    section.className = 'comments-section';
    section.innerHTML = `
      <div class="comments-list"><div class="comments-loading"><div class="spinner-sm"></div></div></div>
      <div class="comment-form">
        <input type="text" class="comment-input" placeholder="Написать комментарий..." maxlength="500">
        <button class="comment-send-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;
    articleEl.appendChild(section);

    const list = section.querySelector('.comments-list');
    try {
      const data = await API.get(`/posts/${postId}/comments`);
      list.innerHTML = '';
      if (!data.comments?.length) list.innerHTML = '<p class="no-comments">Пока нет комментариев</p>';
      else data.comments.forEach(c => list.appendChild(this.renderComment(c, postId)));
    } catch { list.innerHTML = '<p class="no-comments">Ошибка загрузки</p>'; }

    const input = section.querySelector('.comment-input');
    const sendBtn = section.querySelector('.comment-send-btn');

    const sendComment = async () => {
      const text = input.value.trim();
      if (!text) return;
      sendBtn.disabled = true;
      try {
        const data = await API.post(`/posts/${postId}/comments`, { text });
        list.querySelector('.no-comments')?.remove();
        list.appendChild(this.renderComment(data.comment, postId));
        input.value = '';
        const countEl = articleEl.querySelector('.comment-btn span');
        if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
      } catch (err) { Toast.show(err.message, 'error'); }
      finally { sendBtn.disabled = false; }
    };

    sendBtn.addEventListener('click', sendComment);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendComment(); } });
    input.focus();
  },

  renderComment(comment, postId) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.displayName || 'U')}&background=222222&color=fff&size=64&bold=true`;
    const currentUser = API.getUser();
    const isOwn = currentUser && comment.author?._id === currentUser.id;
    const isAdmin = currentUser && currentUser.username === 'Today_Idk';

    div.innerHTML = `
      <img class="avatar avatar-sm" src="${comment.author?.avatar || defaultAvatar}" alt="">
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">${this.escapeHtml(comment.author?.displayName || comment.author?.username || 'Пользователь')}</span>
          ${comment.author?.hasBadge ? '<span class="badge-icon-lg"></span>' : ''}
          <span class="comment-time">${this.formatTime(comment.createdAt)}</span>
        </div>
        <p class="comment-text">${this.escapeHtml(comment.text)}</p>
      </div>
      ${(isOwn || isAdmin) ? `<button class="comment-delete-btn"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
    `;

    div.querySelector('.comment-author').addEventListener('click', () => {
      if (comment.author?._id) Router.navigate(`/profile/${comment.author._id}`);
    });

    const delBtn = div.querySelector('.comment-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        try {
          await API.delete(`/posts/${postId}/comments/${comment._id}`);
          div.style.transition = '0.3s'; div.style.opacity = '0';
          setTimeout(() => div.remove(), 300);
        } catch (err) { Toast.show(err.message, 'error'); }
      });
    }

    return div;
  },

  async deletePost(postId) {
    if (!confirm('Удалить пост?')) return;
    try {
      await API.delete(`/posts/${postId}`);
      const card = document.querySelector(`[data-post-id="${postId}"]`);
      if (card) { card.style.transition = '0.4s'; card.style.opacity = '0'; setTimeout(() => card.remove(), 400); }
      Toast.show('Пост удалён', 'info');
    } catch (err) { Toast.show(err.message, 'error'); }
  },

  escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; },

  formatTime(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'сейчас';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн`;
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
};

// ===== Search =====
const Search = {
  initialized: false,
  init() {
    if (this.initialized) return;
    this.initialized = true;
    const input = document.getElementById('search-input');
    let debounce;
    input?.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this.search(input.value.trim()), 400);
    });
  },

  async search(query) {
    const results = document.getElementById('search-results');
    if (!results) return;
    if (!query || query.length < 2) {
      results.innerHTML = '<div class="empty-state"><p class="empty-state-text">Начните вводить для поиска</p></div>';
      return;
    }
    results.innerHTML = '<div class="page-loading"><div class="spinner-sm"></div></div>';
    try {
      const data = await API.get(`/users/search?q=${encodeURIComponent(query)}`);
      if (!data.users?.length) { results.innerHTML = '<p class="empty-state-text" style="padding:40px">Никого не найдено</p>'; return; }
      results.innerHTML = '';
      data.users.forEach(user => {
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=222222&color=fff&size=84&bold=true`;
        const div = document.createElement('div');
        div.className = 'search-user-card';
        div.innerHTML = `
          <img class="avatar avatar-md" src="${user.avatar || defaultAvatar}" alt="">
          <div class="search-user-info">
            <span class="search-user-name">${App.escapeHtml(user.displayName || user.username)}${user.hasBadge ? ' <svg viewBox="0 0 16 16" width="20" height="20" fill="#ffffff" stroke="none" style="vertical-align:middle"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' : ''}</span>
            <span class="search-user-handle">@${user.username}</span>
          </div>
        `;
        div.addEventListener('click', () => Router.navigate(`/profile/${user._id}`));
        results.appendChild(div);
      });
    } catch { results.innerHTML = '<p class="empty-state-text" style="padding:40px">Ошибка поиска</p>'; }
  }
};

// ===== Notifications =====
const Notifications = {
  loaded: false,
  init() { if (this.loaded) return; this.loaded = true; this.load(); },
  async load() {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    container.innerHTML = '<div class="page-loading"><div class="spinner-sm"></div></div>';
    try {
      const data = await API.get('/notifications');
      if (!data.notifications?.length) {
        container.innerHTML = '<div class="empty-state"><p class="empty-state-text">Нет уведомлений</p></div>';
        return;
      }
      container.innerHTML = '';
      data.notifications.forEach(n => {
        const div = document.createElement('div');
        div.className = `notification-item ${n.read ? '' : 'unread'}`;
        div.innerHTML = `<div class="notification-icon">${this.getIcon(n.type)}</div><div class="notification-body"><p>${App.escapeHtml(n.message)}</p><span class="notification-time">${App.formatTime(n.createdAt)}</span></div>`;
        container.appendChild(div);
      });
    } catch { container.innerHTML = '<p class="empty-state-text" style="padding:40px">Ошибка загрузки</p>'; }
  },
  getIcon(type) {
    const i = {
      like: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#ff4757" stroke="#ff4757" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
      comment: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
      follow: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2ed573" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'
    };
    return i[type] || i.like;
  }
};