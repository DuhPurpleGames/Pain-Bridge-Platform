/* ============================
   WALLET.JS — Balance & Funding
   ============================ */

const Wallet = (() => {
  let _balance = 0;
  let _userId = null;
  let _totalSpent = 0;
  let _queryCount = 0;
  let _auditCount = 0;

  function updateDisplay() {
    const el = document.getElementById('wallet-balance');
    if (el) el.textContent = `$${_balance.toFixed(2)}`;
    document.getElementById('stat-spent').textContent = `$${_totalSpent.toFixed(2)}`;
    document.getElementById('stat-queries').textContent = _queryCount;
    document.getElementById('stat-audits').textContent = _auditCount;
  }

  return {
    get balance() { return _balance; },

    async load(userId) {
      _userId = userId;
      const w = await DB.getWallet(userId);
      _balance = w.balance || 0;
      const txs = await DB.getTransactions(userId);
      _totalSpent = txs.filter(t => t.type === 'spend').reduce((s, t) => s + t.amount, 0);
      const msgs = await DB.getMessages(userId);
      _queryCount = msgs.filter(m => m.role === 'user').length;
      _auditCount = msgs.filter(m => m.cost >= 2).length;
      updateDisplay();
      Logger.log(`Wallet loaded · $${_balance.toFixed(2)}`, 'info');
    },

    async spend(amount, label) {
      if (!_userId) return false;
      if (_balance < amount) {
        Toast.show('Insufficient balance — add funds to continue', 'error');
        Logger.log(`Insufficient funds for: ${label}`, 'warn');
        openWallet();
        return false;
      }
      _balance = await DB.deductWallet(_userId, amount);
      _totalSpent += amount;
      await DB.logTransaction(_userId, 'spend', amount, label);
      updateDisplay();
      Logger.log(`Charged $${amount.toFixed(2)} · ${label}`, 'warn');
      return true;
    },

    async addFunds(amount) {
      if (!_userId) return;
      _balance = await DB.addFunds(_userId, amount);
      updateDisplay();
      Logger.log(`Funds added · +$${amount.toFixed(2)} · Balance: $${_balance.toFixed(2)}`, 'success');
      Toast.show(`$${amount.toFixed(2)} added to your account!`, 'success');
    },

    incrementQuery() { _queryCount++; updateDisplay(); },
    incrementAudit() { _auditCount++; updateDisplay(); },

    setRevenueGap(val) {
      document.getElementById('stat-saved').textContent = val;
    }
  };
})();

// --- WALLET MODAL ---
function openWallet() {
  const content = document.getElementById('modal-wallet-content');
  const user = Auth.currentUser;

  if (!user) {
    content.innerHTML = `
      <div class="text-center py-4">
        <div class="text-4xl mb-3">🔮</div>
        <h2 class="font-cinzel text-gold text-sm tracking-widest mb-2">LOGIN REQUIRED</h2>
        <p class="text-gray-400 text-sm mb-4">Create a free account to add funds and access AI agents</p>
        <button onclick="closeModal(); openAuth('register')" class="btn-gold px-6 py-2 text-sm">CREATE FREE ACCOUNT</button>
      </div>`;
    showModal('modal-wallet');
    return;
  }

  const tiers = [
    { amount: 5, label: '5 Queries', desc: '10× Ask or 2× Audits + 2× Ask' },
    { amount: 10, label: '10 Queries', desc: '20× Ask or 5× Audits' },
    { amount: 25, label: 'Power Pack', desc: '50× Ask or 12× Audits', highlight: true },
    { amount: 50, label: 'Pro Pack', desc: '100× Ask or 25× Audits' }
  ];

  content.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="font-cinzel text-gold text-sm tracking-widest">ADD FUNDS</h2>
        <p class="text-xs text-gray-500 mt-0.5">Current balance: <span class="text-gold font-mono">$${Wallet.balance.toFixed(2)}</span></p>
      </div>
      <button onclick="closeModal()" class="text-gray-500 hover:text-white text-xl">×</button>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-5">
      ${tiers.map(t => `
        <div class="fund-tier ${t.highlight ? 'border-gold' : ''}" onclick="selectTier(${t.amount}, this)">
          ${t.highlight ? '<div class="text-[9px] text-gold uppercase tracking-widest mb-1">⭐ Best Value</div>' : ''}
          <div class="text-gold font-cinzel text-lg font-bold">$${t.amount}</div>
          <div class="text-xs text-white font-semibold mt-0.5">${t.label}</div>
          <div class="text-[10px] text-gray-400 mt-0.5">${t.desc}</div>
        </div>`).join('')}
    </div>

    <div class="mb-4">
      <label class="text-xs text-gray-400 uppercase tracking-widest block mb-2">Or enter custom amount</label>
      <div class="flex gap-2">
        <input id="custom-amount" type="number" min="1" max="500" step="0.5"
          class="form-input flex-1" placeholder="$0.00"
          oninput="document.getElementById('fund-btn').textContent = this.value ? 'ADD $' + parseFloat(this.value||0).toFixed(2) : 'SELECT AMOUNT'"/>
        <button id="fund-btn" onclick="processFunds()" class="btn-gold px-5 py-2 text-sm">SELECT AMOUNT</button>
      </div>
    </div>

    <div class="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
      <p class="text-[10px] text-gray-500 text-center">
        💳 Demo mode: funds are simulated for development. Stripe integration ready to activate.
      </p>
    </div>

    <div class="mt-4 pt-4 border-t border-gray-800">
      <p class="text-[10px] text-gray-600 text-center uppercase tracking-widest mb-2">Pricing</p>
      <div class="flex justify-around text-center">
        <div><div class="text-amber-400 font-mono text-sm">$0.50</div><div class="text-[10px] text-gray-500">Per AI Response</div></div>
        <div><div class="text-amber-400 font-mono text-sm">$2.00</div><div class="text-[10px] text-gray-500">Full Audit Report</div></div>
        <div><div class="text-emerald-400 font-mono text-sm">FREE</div><div class="text-[10px] text-gray-500">Browse & Preview</div></div>
      </div>
    </div>`;

  showModal('modal-wallet');
}

let _selectedTier = 0;
function selectTier(amount, el) {
  document.querySelectorAll('.fund-tier').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  _selectedTier = amount;
  document.getElementById('fund-btn').textContent = `ADD $${amount.toFixed(2)}`;
  const customInput = document.getElementById('custom-amount');
  if (customInput) customInput.value = '';
}

async function processFunds() {
  const customVal = parseFloat(document.getElementById('custom-amount')?.value) || 0;
  const amount = customVal > 0 ? customVal : _selectedTier;
  if (!amount || amount <= 0) {
    Toast.show('Please select or enter an amount', 'error');
    return;
  }
  await Wallet.addFunds(amount);
  closeModal();
  _selectedTier = 0;
}
