'use strict';

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('form-login').style.display    = isLogin ? '' : 'none';
  document.getElementById('form-register').style.display = isLogin ? 'none' : '';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

function hideError(id) {
  document.getElementById(id).classList.remove('show');
}

async function handleLogin(e) {
  e.preventDefault();
  hideError('login-error');

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError('login-error', data.error || 'Falha no login');
      return;
    }

    window.location.href = '/dashboard';
  } catch {
    showError('login-error', 'Erro de conexão. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar na conta';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  hideError('register-error');

  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.textContent = 'Criando conta...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name:     document.getElementById('reg-name').value,
        email:    document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError('register-error', data.error || 'Falha no cadastro');
      return;
    }

    // Auto-login after register
    document.getElementById('login-email').value = document.getElementById('reg-email').value;
    document.getElementById('login-password').value = document.getElementById('reg-password').value;
    switchTab('login');
    showError('login-error', ''); // clear
    document.getElementById('login-error').classList.remove('show');

    // Perform auto-login
    document.querySelector('#form-login form').dispatchEvent(new Event('submit', { cancelable: true }));
  } catch {
    showError('register-error', 'Erro de conexão. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  }
}
