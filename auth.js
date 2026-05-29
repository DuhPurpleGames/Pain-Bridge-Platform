/* ============================
   AUTH.JS — User Authentication
   ============================ */

const Auth = (() => {
  let _currentUser = null;
  let _sessionToken = null;

  function hashPassword(pw) {
    // Simple hash for demo — in prod use bcrypt via backend
    let h = 0;
    for (let i = 0; i < pw.length; i++) {
      h = Math.imul(31, h) + pw.charCodeAt(i) | 0;
    }
    return h.toString(36) + pw.length.toString(36);
  }

  function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function restoreSession() {
    const token = localStorage.getItem('pb_session');
    if (!token) return false;
    try {
      const sess = await DB.getSession(token);
      if (!sess) return false;
      const user = await DB.getUserById(sess.userId);
      if (!user) return false;
      _currentUser = user;
      _sessionToken = token;
      onLogin(user);
      return true;
    } catch { return false; }
  }

  function onLogin(user) {
    _currentUser = user;
    document.getElementById('auth-area').classList.add('hidden');
    const ua = document.getElementById('user-area');
    ua.classList.remove('hidden');
    ua.classList.add('flex');
    document.getElementById('user-name-display').textContent = user.name || user.email;
    Wallet.load(user.id);
    Logger.log(`Session restored · ${user.email}`, 'success');
    Chat.renderWelcome(user);
  }

  return {
    get currentUser() { return _currentUser; },
    get isLoggedIn() { return !!_currentUser; },

    async init() {
      await restoreSession();
    },

    async register(name, email, password) {
      const existing = await DB.getUserByEmail(email);
      if (existing) throw new Error('Email already registered');
      const id = await DB.createUser({ name, email, password: hashPassword(password) });
      const user = await DB.getUserById(id);
      const token = generateToken();
      await DB.saveSession(token, id);
      localStorage.setItem('pb_session', token);
      _sessionToken = token;
      closeModal();
      Toast.show(`Welcome, ${name}! Account created.`, 'success');
      Logger.log(`New user registered: ${email}`, 'success');
      onLogin(user);
    },

    async login(email, password) {
      const user = await DB.getUserByEmail(email);
      if (!user || user.password !== hashPassword(password)) {
        throw new Error('Invalid email or password');
      }
      const token = generateToken();
      await DB.saveSession(token, user.id);
      localStorage.setItem('pb_session', token);
      _sessionToken = token;
      closeModal();
      Toast.show(`Welcome back, ${user.name || user.email}!`, 'success');
      Logger.log(`Login: ${email}`, 'success');
      onLogin(user);
    },

    async logout() {
      if (_sessionToken) {
        await DB.deleteSession(_sessionToken);
        localStorage.removeItem('pb_session');
      }
      _currentUser = null;
      _sessionToken = null;
      document.getElementById('user-area').classList.add('hidden');
      document.getElementById('user-area').classList.remove('flex');
      document.getElementById('auth-area').classList.remove('hidden');
      document.getElementById('wallet-balance').textContent = '$0.00';
      Chat.reset();
      Logger.log('Logged out', 'info');
      Toast.show('Logged out successfully', 'info');
    }
  };
})();

// Global wrappers
function openAuth(mode) {
  const content = document.getElementById('modal-auth-content');
  const isLogin = mode === 'login';
  content.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-cinzel text-gold text-base tracking-widest">${isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}</h2>
      <button onclick="closeModal()" class="text-gray-500 hover:text-white text-xl">×</button>
    </div>
    ${!isLogin ? `<div class="mb-4">
      <label class="text-xs text-gray-400 uppercase tracking-widest block mb-1">Full Name</label>
      <input id="auth-name" type="text" class="form-input" placeholder="Your name"/>
    </div>` : ''}
    <div class="mb-4">
      <label class="text-xs text-gray-400 uppercase tracking-widest block mb-1">Email</label>
      <input id="auth-email" type="email" class="form-input" placeholder="email@example.com"/>
    </div>
    <div class="mb-6">
      <label class="text-xs text-gray-400 uppercase tracking-widest block mb-1">Password</label>
      <input id="auth-password" type="password" class="form-input" placeholder="••••••••"/>
    </div>
    <div id="auth-error" class="text-red-400 text-xs mb-3 hidden"></div>
    <button onclick="submitAuth('${mode}')" class="btn-gold w-full py-3 text-sm w-full block">
      ${isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
    </button>
    <p class="text-center text-xs text-gray-500 mt-4">
      ${isLogin ? `No account? <a onclick="openAuth('register')" class="text-gold cursor-pointer">Register free</a>`
                : `Have an account? <a onclick="openAuth('login')" class="text-gold cursor-pointer">Sign in</a>`}
    </p>`;
  showModal('modal-auth');
}

async function submitAuth(mode) {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');
  try {
    if (mode === 'register') {
      const name = document.getElementById('auth-name').value.trim();
      if (!name) throw new Error('Name required');
      await Auth.register(name, email, password);
    } else {
      await Auth.login(email, password);
    }
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
}

function logout() { Auth.logout(); }
