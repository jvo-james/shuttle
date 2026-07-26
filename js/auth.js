(function () {
  'use strict';
  const App = window.ShuttleApp;

  App.auth = {
    getSession() {
      try { return JSON.parse(localStorage.getItem(App.config.sessionKey)); } catch (_) { return null; }
    },
    setSession(session) { localStorage.setItem(App.config.sessionKey, JSON.stringify(session)); },
    clearSession() { localStorage.removeItem(App.config.sessionKey); },
    credentials: {
      driver: { email: 'driver@knust.edu.gh', password: 'demo123', name: 'Kwame Mensah', role: 'driver' },
      admin: { email: 'admin@knust.edu.gh', password: 'admin123', name: 'Operations Admin', role: 'admin' }
    }
  };

  function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    const tabs = document.querySelectorAll('[data-role]');
    const roleInput = document.getElementById('loginRole');
    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');
    const submit = form.querySelector('button[type="submit"]');
    const error = document.getElementById('loginError');

    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      const role = tab.dataset.role;
      const credentials = App.auth.credentials[role];
      roleInput.value = role;
      email.value = credentials.email;
      password.value = credentials.password;
      submit.textContent = role === 'driver' ? 'Open driver console' : 'Open operations dashboard';
      error.textContent = '';
    }));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const role = roleInput.value;
      const credentials = App.auth.credentials[role];
      if (email.value.trim().toLowerCase() !== credentials.email || password.value !== credentials.password) {
        error.textContent = 'Those demo credentials do not match the selected role.';
        return;
      }
      App.auth.setSession({ role, name: credentials.name, email: credentials.email, signedInAt: Date.now() });
      App.toast('Signed in', `Opening the ${role} console.`, 'success', 1200);
      setTimeout(() => { location.href = role === 'driver' ? 'driver.html' : 'admin.html'; }, 350);
    });
  }

  function initConsoleIdentity() {
    const session = App.auth.getSession();
    const driverIdentity = document.getElementById('driverIdentity');
    const adminIdentity = document.getElementById('adminIdentity');
    if (driverIdentity) driverIdentity.textContent = session?.role === 'driver' ? session.name : 'Demo driver';
    if (adminIdentity) adminIdentity.textContent = session?.role === 'admin' ? session.name : 'Operations Admin';
    document.getElementById('driverLogout')?.addEventListener('click', () => {
      App.auth.clearSession(); location.href = 'login.html';
    });
    document.getElementById('adminLogout')?.addEventListener('click', () => {
      App.auth.clearSession(); location.href = 'login.html';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initConsoleIdentity();
  });
})();
