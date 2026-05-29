/* ============================
   DB.JS — IndexedDB Persistence
   Free, zero-dependency storage
   ============================ */

const DB = (() => {
  const DB_NAME = 'PainBridgeDB';
  const DB_VER = 2;
  let _db = null;

  const STORES = {
    users:    { keyPath: 'id', autoIncrement: true },
    sessions: { keyPath: 'token' },
    wallets:  { keyPath: 'userId' },
    messages: { keyPath: 'id', autoIncrement: true },
    reports:  { keyPath: 'id', autoIncrement: true },
    transactions: { keyPath: 'id', autoIncrement: true }
  };

  async function open() {
    if (_db) return _db;
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        Object.entries(STORES).forEach(([name, opts]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, opts);
            if (name === 'users') store.createIndex('email', 'email', { unique: true });
            if (name === 'messages') store.createIndex('userId', 'userId');
            if (name === 'reports') store.createIndex('userId', 'userId');
            if (name === 'transactions') store.createIndex('userId', 'userId');
          }
        });
      };
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = e => rej(e.target.error);
    });
  }

  async function tx(storeName, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const tr = db.transaction(storeName, mode);
      const store = tr.objectStore(storeName);
      const req = fn(store);
      req.onsuccess = e => res(e.target.result);
      req.onerror = e => rej(e.target.error);
    });
  }

  async function txAll(storeName, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const tr = db.transaction(storeName, mode);
      const store = tr.objectStore(storeName);
      const results = [];
      const req = fn ? fn(store) : store.openCursor();
      if (fn) { req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e.target.error); return; }
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) { results.push(cursor.value); cursor.continue(); }
        else res(results);
      };
      req.onerror = e => rej(e.target.error);
    });
  }

  return {
    // USERS
    async createUser(data) {
      return tx('users', 'readwrite', s => s.add({ ...data, createdAt: Date.now() }));
    },
    async getUserByEmail(email) {
      const db = await open();
      return new Promise((res, rej) => {
        const tr = db.transaction('users', 'readonly');
        const idx = tr.objectStore('users').index('email');
        const req = idx.get(email);
        req.onsuccess = e => res(e.target.result);
        req.onerror = e => rej(e.target.error);
      });
    },
    async getUserById(id) {
      return tx('users', 'readonly', s => s.get(id));
    },

    // SESSIONS
    async saveSession(token, userId) {
      return tx('sessions', 'readwrite', s => s.put({ token, userId, createdAt: Date.now() }));
    },
    async getSession(token) {
      return tx('sessions', 'readonly', s => s.get(token));
    },
    async deleteSession(token) {
      return tx('sessions', 'readwrite', s => s.delete(token));
    },

    // WALLETS
    async getWallet(userId) {
      const w = await tx('wallets', 'readonly', s => s.get(userId));
      return w || { userId, balance: 0 };
    },
    async setWallet(userId, balance) {
      return tx('wallets', 'readwrite', s => s.put({ userId, balance, updatedAt: Date.now() }));
    },
    async deductWallet(userId, amount) {
      const w = await this.getWallet(userId);
      const newBal = Math.max(0, (w.balance || 0) - amount);
      await this.setWallet(userId, newBal);
      return newBal;
    },
    async addFunds(userId, amount) {
      const w = await this.getWallet(userId);
      const newBal = (w.balance || 0) + amount;
      await this.setWallet(userId, newBal);
      await this.logTransaction(userId, 'deposit', amount, `Added $${amount.toFixed(2)}`);
      return newBal;
    },

    // MESSAGES
    async saveMessage(userId, role, content, agentId, cost) {
      return tx('messages', 'readwrite', s => s.add({
        userId, role, content, agentId, cost: cost || 0, ts: Date.now()
      }));
    },
    async getMessages(userId) {
      const db = await open();
      return new Promise((res, rej) => {
        const tr = db.transaction('messages', 'readonly');
        const idx = tr.objectStore('messages').index('userId');
        const req = idx.getAll(userId);
        req.onsuccess = e => res(e.target.result || []);
        req.onerror = e => rej(e.target.error);
      });
    },

    // REPORTS
    async saveReport(userId, title, content, agentId) {
      return tx('reports', 'readwrite', s => s.add({
        userId, title, content, agentId, ts: Date.now()
      }));
    },
    async getReports(userId) {
      const db = await open();
      return new Promise((res, rej) => {
        const tr = db.transaction('reports', 'readonly');
        const idx = tr.objectStore('reports').index('userId');
        const req = idx.getAll(userId);
        req.onsuccess = e => res((e.target.result || []).sort((a,b) => b.ts - a.ts));
        req.onerror = e => rej(e.target.error);
      });
    },

    // TRANSACTIONS
    async logTransaction(userId, type, amount, note) {
      return tx('transactions', 'readwrite', s => s.add({
        userId, type, amount, note, ts: Date.now()
      }));
    },
    async getTransactions(userId) {
      const db = await open();
      return new Promise((res, rej) => {
        const tr = db.transaction('transactions', 'readonly');
        const idx = tr.objectStore('transactions').index('userId');
        const req = idx.getAll(userId);
        req.onsuccess = e => res((e.target.result || []).sort((a,b) => b.ts - a.ts));
        req.onerror = e => rej(e.target.error);
      });
    }
  };
})();
