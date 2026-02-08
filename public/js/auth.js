// public/js/auth.js

const Auth = {
  init() {
    this.authScreen = document.getElementById('auth-screen');
    this.appScreen = document.getElementById('app-screen');
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.tabButtons = document.querySelectorAll('.tab-btn');

    this.bindEvents();
    this.checkAuth();
  },

  bindEvents() {
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());

    // Toggle password
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.querySelector('.eye-open').classList.toggle('hidden', !show);
        btn.querySelector('.eye-closed').classList.toggle('hidden', show);
      });
    });
  },

  switchTab(tab) {
    this.tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    this.loginForm.classList.toggle('active', tab === 'login');
    this.registerForm.classList.toggle('active', tab === 'register');
  },

  async checkAuth() {
    const token = API.getToken();
    if (!token) return this.showAuth();

    try {
      const data = await API.get('/auth/me');
      API.setUser(data.user);
      this.showApp();
    } catch {
      API.removeToken();
      API.removeUser();
      this.showAuth();
    }
  },

  showAuth() {
    this.authScreen.classList.add('active');
    this.appScreen.classList.remove('active');
  },

  showApp() {
    this.authScreen.classList.remove('active');
    this.appScreen.classList.add('active');
    App.init();
    Router.resolve();
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = this.loginForm.querySelector('.btn');
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    this.setLoading(btn, true);

    try {
      const data = await API.post('/auth/login', {
        login: document.getElementById('login-input').value.trim(),
        password: document.getElementById('login-password').value
      });
      API.setToken(data.token);
      API.setUser(data.user);
      Toast.show('Добро пожаловать!', 'success');
      this.showApp();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      this.setLoading(btn, false);
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const btn = this.registerForm.querySelector('.btn');
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';
    this.setLoading(btn, true);

    try {
      const data = await API.post('/auth/register', {
        username: document.getElementById('reg-username').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value
      });
      API.setToken(data.token);
      API.setUser(data.user);
      Toast.show('Аккаунт создан! Проверьте почту.', 'success');
      this.showApp();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      this.setLoading(btn, false);
    }
  },

  logout() {
    API.removeToken();
    API.removeUser();
    window.location.href = '/';
  },

  setLoading(btn, loading) {
    const span = btn.querySelector('span');
    const loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (span) span.classList.toggle('hidden', loading);
    if (loader) loader.classList.toggle('hidden', !loading);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});