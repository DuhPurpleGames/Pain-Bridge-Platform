/* ============================
   LOGGER.JS — Live Activity Log
   ============================ */

const Logger = (() => {
  const MAX_LOGS = 120;
  const logs = [];

  function ts() {
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function render(entry) {
    const panel = document.getElementById('panel-logs');
    if (!panel) return;
    const div = document.createElement('div');
    div.className = `log-entry ${entry.type}`;
    div.innerHTML = `<span class="text-gray-600 flex-shrink-0">${entry.time}</span>
      <span>${entry.msg}</span>`;
    panel.insertBefore(div, panel.firstChild);
    // Trim old entries
    while (panel.children.length > MAX_LOGS) {
      panel.removeChild(panel.lastChild);
    }
  }

  return {
    log(msg, type = 'info') {
      const entry = { msg, type, time: ts() };
      logs.push(entry);
      render(entry);
    },
    logs
  };
})();

// Toast notifications
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }
};
