// ===== ORIS AUTH =====
document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in
  const token = getToken();
  const user = getUser();
  if (token && user && user.registrationStep === 4) {
    goTo('/pages/feed.html');
    return;
  }

  let currentStep = 1;
  let isLoginMode = false;
  let loginEmail = '';

  const steps = document.querySelectorAll('.auth-step');
  const dots = document.querySelectorAll('.progress-dot');
  const registerSection = document.querySelector('.register-section');
  const loginSection = document.querySelector('.login-section');

  // Show step
  function showStep(n) {
    currentStep = n;
    steps.forEach(s => s.classList.remove('active'));
    const target = document.querySelector(`[data-step="${n}"]`);
    if (target) target.classList.add('active');

    dots.forEach((d, i) => {
      d.classList.remove('active', 'done');
      if (i + 1 === n) d.classList.add('active');
      else if (i + 1 < n) d.classList.add('done');
    });
  }

  // Switch login/register
  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = true;
    registerSection.classList.add('hidden-section');
    loginSection.classList.add('active');
  });

  document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = false;
    loginSection.classList.remove('active');
    registerSection.classList.remove('hidden-section');
    showStep(1);
  });

  // ---- REGISTER STEP 1 ----
  document.getElementById('step1Form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();

    if (!username || !name) return showToast('Заполните все поля', 'error');

    btn.classList.add('btn-loading');
    btn.disabled = true;
    try {
      const data = await apiRequest('/api/auth/step1', {
        method: 'POST',
        body: JSON.stringify({ username, name })
      });
      setToken(data.token);
      setUser(data.user);
      showStep(2);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });

  // ---- REGISTER STEP 2 ----
  document.getElementById('step2Form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('regEmail').value.trim();
    if (!email) return showToast('Введите email', 'error');

    btn.classList.add('btn-loading');
    btn.disabled = true;
    try {
      await apiRequest('/api/auth/step2', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      showToast('Код отправлен на ' + email, 'success');
      showStep(3);
      initCodeInputs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });

  // ---- REGISTER STEP 3: CODE ----
  function initCodeInputs() {
    const inputs = document.querySelectorAll('.code-input-wrapper input');
    inputs.forEach((inp, i) => {
      inp.value = '';
      inp.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val.slice(0, 1);
        if (val && i < inputs.length - 1) {
          inputs[i + 1].focus();
        }
        // Check if all filled
        const code = Array.from(inputs).map(i => i.value).join('');
        if (code.length === 6) {
          verifyCode(code);
        }
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          inputs[i - 1].focus();
        }
      });
      inp.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        paste.split('').forEach((ch, idx) => {
          if (inputs[idx]) inputs[idx].value = ch;
        });
        if (paste.length === 6) verifyCode(paste);
      });
    });
    if (inputs[0]) inputs[0].focus();
  }

  async function verifyCode(code) {
    try {
      await apiRequest('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      showToast('Email подтверждён!', 'success');
      showStep(4);
    } catch (err) {
      showToast(err.message, 'error');
      const inputs = document.querySelectorAll('.code-input-wrapper input');
      inputs.forEach(i => { i.value = ''; i.classList.add('input-error'); });
      setTimeout(() => inputs.forEach(i => i.classList.remove('input-error')), 1500);
      if (inputs[0]) inputs[0].focus();
    }
  }

  // Resend
  document.getElementById('resendCode').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/auth/resend-code', { method: 'POST' });
      showToast('Новый код отправлен', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ---- REGISTER STEP 4: AVATAR ----
  const avatarInput = document.getElementById('avatarFileInput');
  const avatarPreview = document.getElementById('avatarPreviewImg');
  const uploadArea = document.getElementById('avatarUploadArea');
  let avatarUrl = '';

  uploadArea.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return showToast('Выберите изображение', 'error');
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarPreview.innerHTML = `<img src="${ev.target.result}" alt="avatar">`;
      uploadArea.classList.add('has-image');
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      showToast('Загрузка...', 'info');
      const data = await apiUpload(file);
      avatarUrl = data.url;
      showToast('Фото загружено', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('completeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('completeBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    try {
      const data = await apiRequest('/api/auth/complete', {
        method: 'POST',
        body: JSON.stringify({ avatar: avatarUrl })
      });
      setUser(data.user);
      showToast('Добро пожаловать в Oris!', 'success');
      setTimeout(() => goTo('/pages/feed.html'), 500);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });

  document.getElementById('skipAvatar').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/auth/complete', {
        method: 'POST',
        body: JSON.stringify({ avatar: '' })
      });
      setUser(data.user);
      goTo('/pages/feed.html');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ========== LOGIN ==========
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) return showToast('Введите email', 'error');

    btn.classList.add('btn-loading');
    btn.disabled = true;
    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      loginEmail = email;
      showToast('Код отправлен', 'success');
      document.getElementById('loginStep1').style.display = 'none';
      document.getElementById('loginStep2').style.display = 'block';
      initLoginCodeInputs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });

  function initLoginCodeInputs() {
    const inputs = document.querySelectorAll('#loginCodeInputs input');
    inputs.forEach((inp, i) => {
      inp.value = '';
      inp.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val.slice(0, 1);
        if (val && i < inputs.length - 1) inputs[i + 1].focus();
        const code = Array.from(inputs).map(i => i.value).join('');
        if (code.length === 6) verifyLoginCode(code);
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1].focus();
      });
      inp.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        paste.split('').forEach((ch, idx) => { if (inputs[idx]) inputs[idx].value = ch; });
        if (paste.length === 6) verifyLoginCode(paste);
      });
    });
    if (inputs[0]) inputs[0].focus();
  }

  async function verifyLoginCode(code) {
    try {
      const data = await apiRequest('/api/auth/login-verify', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, code })
      });
      setToken(data.token);
      setUser(data.user);
      showToast('С возвращением!', 'success');
      setTimeout(() => goTo('/pages/feed.html'), 500);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Init
  showStep(1);

  // If user has incomplete registration, resume
  if (token && user) {
    if (user.registrationStep === 1) showStep(2);
    else if (user.registrationStep === 2) { showStep(3); setTimeout(initCodeInputs, 100); }
    else if (user.registrationStep === 3) showStep(4);
  }
});