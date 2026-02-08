// public/js/api.js

// ===== API Клиент =====
const API = {
  BASE_URL: '/api',

  getToken() { return localStorage.getItem('oris_token'); },
  setToken(t) { localStorage.setItem('oris_token', t); },
  removeToken() { localStorage.removeItem('oris_token'); },

  setUser(u) { localStorage.setItem('oris_user', JSON.stringify(u)); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('oris_user')); }
    catch { return null; }
  },
  removeUser() { localStorage.removeItem('oris_user'); },

  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    const token = this.getToken();
    const headers = {};

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.removeToken();
          this.removeUser();
          window.location.href = '/';
        }
        throw new Error(data.message || 'Ошибка запроса');
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  get(ep) {
    return this.request(ep, { method: 'GET' });
  },

  post(ep, body) {
    const isForm = body instanceof FormData;
    return this.request(ep, {
      method: 'POST',
      body: isForm ? body : JSON.stringify(body)
    });
  },

  put(ep, body) {
    return this.request(ep, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(ep) {
    return this.request(ep, { method: 'DELETE' });
  }
};


// ===== SPA Router =====
const Router = {
  routes: {},

  init() {
    window.addEventListener('popstate', () => this.resolve());

    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href') || link.dataset.link);
      }
    });
  },

  on(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path) {
    window.history.pushState(null, null, path);
    this.resolve();
  },

  resolve() {
    const path = window.location.pathname;

    // Точное совпадение
    if (this.routes[path]) {
      this.routes[path]();
      return;
    }

    // Параметризованные маршруты (/profile/:id)
    for (const route in this.routes) {
      const paramNames = [];
      const regexStr = route.replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
      const match = path.match(new RegExp(`^${regexStr}$`));
      if (match) {
        const params = {};
        paramNames.forEach((name, i) => params[name] = match[i + 1]);
        this.routes[route](params);
        return;
      }
    }

    // Fallback
    if (this.routes['/']) this.routes['/']();
  }
};


// ===== Toast уведомления =====
const Toast = {
  icons: {
    success: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  },

  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${this.icons[type] || this.icons.info}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};


// ===== Emoji Picker =====
const EmojiPicker = {
  categories: {
    'Смайлы': ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🥴','😇','🥳','🥺','🤠','🤡','🤥','🤫','🤭','🧐','🤓'],
    'Жесты': ['👋','🤚','🖐','✋','🖖','👌','🤏','✌','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🙏','💪','🖤','❤️','🧡','💛','💚','💙','💜','🤎','🤍','💯','💥','💫','⭐','🌟','✨','💢','💦','💤'],
    'Природа': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦅','🦆','🦉','🐺','🐗','🐴','🦄','🐝','🦋','🌸','🌹','🌺','🌻','🌼','🌷','🔥','🌈','☀','🌙','❄','💧','🌊'],
    'Еда': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🍕','🍔','🍟','🌭','🍿','🧁','🍩','🍪','🎂','🍰','🍫','🍬','🍭','☕','🍵','🥤','🍺','🍷','🥂','🍾'],
    'Объекты': ['⚽','🏀','🎮','🎯','🎨','🎬','🎤','🎧','🎵','🎶','💻','📱','💡','🔮','💎','🏆','🥇','🎁','🎀','🎊','🎉','📸','💰','🚀','✈','🏠','🔑','💍']
  },

  isOpen: false,
  targetInput: null,
  pickerEl: null,

  open(targetInput, anchorEl) {
    if (this.isOpen) { this.close(); return; }

    this.targetInput = targetInput;

    const picker = document.createElement('div');
    picker.className = 'emoji-picker';

    const tabs = document.createElement('div');
    tabs.className = 'emoji-tabs';

    const panels = document.createElement('div');
    panels.className = 'emoji-panels';

    const catNames = Object.keys(this.categories);

    catNames.forEach((cat, i) => {
      const tab = document.createElement('button');
      tab.className = `emoji-tab ${i === 0 ? 'active' : ''}`;
      tab.textContent = this.categories[cat][0];
      tab.title = cat;

      const panel = document.createElement('div');
      panel.className = `emoji-panel ${i === 0 ? 'active' : ''}`;

      this.categories[cat].forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-item';
        btn.textContent = emoji;
        btn.addEventListener('click', () => this.insert(emoji));
        panel.appendChild(btn);
      });

      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
        panels.querySelectorAll('.emoji-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        panel.classList.add('active');
      });

      tabs.appendChild(tab);
      panels.appendChild(panel);
    });

    picker.appendChild(tabs);
    picker.appendChild(panels);

    // Позиционирование
    this.positionPicker(picker, anchorEl, 380);

    document.body.appendChild(picker);
    this.pickerEl = picker;
    this.isOpen = true;

    setTimeout(() => {
      document.addEventListener('click', this._closeHandler = (e) => {
        if (!picker.contains(e.target) && e.target !== anchorEl && !anchorEl.contains(e.target)) {
          this.close();
        }
      });
    }, 10);
  },

  positionPicker(picker, anchor, pickerHeight) {
    const rect = anchor.getBoundingClientRect();
    picker.style.position = 'fixed';

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow > pickerHeight || spaceBelow > spaceAbove) {
      picker.style.top = (rect.bottom + 8) + 'px';
      picker.style.bottom = 'auto';
    } else {
      picker.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
      picker.style.top = 'auto';
    }

    const pickerWidth = 340;
    let left = rect.left;
    if (left + pickerWidth > window.innerWidth - 8) {
      left = window.innerWidth - pickerWidth - 8;
    }
    if (left < 8) left = 8;
    picker.style.left = left + 'px';
  },

  insert(emoji) {
    if (!this.targetInput) return;

    const start = this.targetInput.selectionStart || 0;
    const end = this.targetInput.selectionEnd || 0;
    const text = this.targetInput.value;

    this.targetInput.value = text.slice(0, start) + emoji + text.slice(end);
    this.targetInput.selectionStart = this.targetInput.selectionEnd = start + emoji.length;
    this.targetInput.focus();
    this.targetInput.dispatchEvent(new Event('input'));
  },

  close() {
    if (this.pickerEl) {
      this.pickerEl.remove();
      this.pickerEl = null;
    }
    this.isOpen = false;
    document.removeEventListener('click', this._closeHandler);
  }
};


// ===== GIF Picker — через наш сервер =====
const GifPicker = {
  isOpen: false,
  pickerEl: null,
  onSelect: null,
  cache: {},

  open(anchorEl, callback) {
    if (this.isOpen) { this.close(); return; }

    this.onSelect = callback;

    const picker = document.createElement('div');
    picker.className = 'gif-picker';
    picker.innerHTML = `
      <div class="gif-search-bar">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="gif-search-input" placeholder="Поиск GIF...">
      </div>
      <div class="gif-results"><div class="gif-loading">Загрузка...</div></div>
    `;

    // Позиционирование
    const rect = anchorEl.getBoundingClientRect();
    picker.style.position = 'fixed';

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow > 420 || spaceBelow > spaceAbove) {
      picker.style.top = (rect.bottom + 8) + 'px';
      picker.style.bottom = 'auto';
    } else {
      picker.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
      picker.style.top = 'auto';
    }

    const pickerWidth = 360;
    let left = rect.left;
    if (left + pickerWidth > window.innerWidth - 8) left = window.innerWidth - pickerWidth - 8;
    if (left < 8) left = 8;
    picker.style.left = left + 'px';

    document.body.appendChild(picker);
    this.pickerEl = picker;
    this.isOpen = true;

    // Поиск
    const input = picker.querySelector('.gif-search-input');
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this.search(input.value.trim()), 400);
    });
    input.focus();

    // Загрузка trending
    this.loadTrending();

    // Закрытие
    setTimeout(() => {
      document.addEventListener('click', this._closeHandler = (e) => {
        if (!picker.contains(e.target) && e.target !== anchorEl && !anchorEl.contains(e.target)) {
          this.close();
        }
      });
    }, 10);
  },

  async loadTrending() {
    if (!this.pickerEl) return;
    const results = this.pickerEl.querySelector('.gif-results');

    // Кэш
    if (this.cache['_trending']) {
      this.renderResults(this.cache['_trending']);
      return;
    }

    results.innerHTML = '<div class="gif-loading"><div class="spinner-sm"></div></div>';

    try {
      const data = await API.get('/gif/search?limit=20');
      if (data.gifs && data.gifs.length > 0) {
        this.cache['_trending'] = data.gifs;
        this.renderResults(data.gifs);
      } else {
        results.innerHTML = '<div class="gif-loading">Нет GIF</div>';
      }
    } catch (err) {
      results.innerHTML = '<div class="gif-loading">Ошибка загрузки</div>';
    }
  },

  async search(query) {
    if (!this.pickerEl) return;

    if (!query) {
      this.loadTrending();
      return;
    }

    const results = this.pickerEl.querySelector('.gif-results');

    // Кэш
    if (this.cache[query]) {
      this.renderResults(this.cache[query]);
      return;
    }

    results.innerHTML = '<div class="gif-loading"><div class="spinner-sm"></div></div>';

    try {
      const data = await API.get('/gif/search?q=' + encodeURIComponent(query) + '&limit=20');
      if (data.gifs) {
        this.cache[query] = data.gifs;
        this.renderResults(data.gifs);
      } else {
        results.innerHTML = '<div class="gif-loading">Ничего не найдено</div>';
      }
    } catch (err) {
      results.innerHTML = '<div class="gif-loading">Ошибка поиска</div>';
    }
  },

  renderResults(gifs) {
    if (!this.pickerEl) return;
    const results = this.pickerEl.querySelector('.gif-results');
    results.innerHTML = '';

    if (!gifs || !gifs.length) {
      results.innerHTML = '<div class="gif-loading">Ничего не найдено</div>';
      return;
    }

    gifs.forEach(gif => {
      const img = document.createElement('img');
      img.src = gif.preview;
      img.className = 'gif-item';
      img.loading = 'lazy';
      img.title = gif.title || '';

      img.addEventListener('click', () => {
        if (this.onSelect) {
          this.onSelect(gif.full || gif.preview);
        }
        this.close();
      });

      results.appendChild(img);
    });
  },

  close() {
    if (this.pickerEl) {
      this.pickerEl.remove();
      this.pickerEl = null;
    }
    this.isOpen = false;
    document.removeEventListener('click', this._closeHandler);
  }
};