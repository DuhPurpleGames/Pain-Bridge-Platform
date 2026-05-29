/* ============================
   APP.JS — Main Orchestrator
   Pain Bridge Platform
   AugustusJulius.com
   ============================ */

// ---- MODAL SYSTEM ----
function showModal(id) {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  document.querySelectorAll('.modal-box').forEach(b => b.classList.add('hidden'));
  const box = document.getElementById(id);
  if (box) box.classList.remove('hidden');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal-box').forEach(b => b.classList.add('hidden'));
}

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.querySelectorAll('.modal-box').forEach(b => b.classList.add('hidden'));
  }
});

// ---- TAB SYSTEM ----
function switchRightTab(tab) {
  const tabs = ['logs', 'actions', 'reports', 'solutions'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    if (btn) btn.classList.toggle('active-tab', t === tab);
    if (panel) panel.classList.toggle('hidden', t !== tab);
  });
  Logger.log(`Panel → ${tab.toUpperCase()}`, 'info');
}

// ---- BOOT SEQUENCE ----
async function boot() {
  Logger.log('Pain Bridge Platform initializing...', 'info');
  Logger.log('AugustusJulius.com · Multi-Agent Intelligence', 'agent');

  await new Promise(r => setTimeout(r, 50));
  Logger.log('IndexedDB storage connected', 'success');

  AgentManager.init();
  Logger.log(`${AGENTS.length} AI agents loaded`, 'success');

  await Auth.init();

  Solutions.init();
  Actions.init();
  await Reports.init();

  if (!Auth.isLoggedIn) {
    Chat.renderWelcome(null);
    Logger.log('Guest mode · Login to activate agents', 'warn');
  }

  Logger.log('System ready · All agents standing by', 'success');
  Logger.log('Pricing: $0.50/query · $2.00/audit', 'info');

  // Ambient heartbeat
  setInterval(() => {
    const msgs = [
      'Scanning competitor signals...',
      'Market intelligence updated',
      'Revenue gap analysis ready',
      'Agent network nominal',
      'Deep search engines active'
    ];
    Logger.log(msgs[Math.floor(Math.random() * msgs.length)], 'info');
  }, 45000);
}

// ---- START ----
document.addEventListener('DOMContentLoaded', boot);
