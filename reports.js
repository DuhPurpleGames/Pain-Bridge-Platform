/* ============================
   REPORTS.JS — Saved Audit Reports
   ============================ */

const Reports = (() => {
  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function agentInfo(id) {
    const a = AgentManager.getById(id);
    return a || { name: 'Agent', emoji: '🤖', color: '#C9A84C' };
  }

  async function loadAndRender() {
    const panel = document.getElementById('panel-reports');
    if (!panel) return;

    const user = Auth.currentUser;
    if (!user) {
      panel.innerHTML = `<div class="text-center py-8">
        <p class="text-gray-500 text-sm">Login to view your saved audit reports</p>
        <button onclick="openAuth('login')" class="btn-gold px-4 py-1 text-xs mt-3">LOGIN</button>
      </div>`;
      return;
    }

    const reports = await DB.getReports(user.id);

    if (!reports.length) {
      panel.innerHTML = `<div class="text-center py-8">
        <div class="text-3xl mb-2">📋</div>
        <p class="text-gray-500 text-sm mb-1">No audit reports yet</p>
        <p class="text-gray-600 text-xs">Request a full audit for $2.00 to generate your first report</p>
      </div>`;
      return;
    }

    panel.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="text-[10px] text-gray-500 uppercase tracking-widest">Saved Reports</div>
        <span class="badge badge-gold">${reports.length}</span>
      </div>
      ${reports.map((r, i) => {
        const agent = agentInfo(r.agentId);
        const preview = r.content.replace(/\*\*/g, '').substring(0, 120) + '...';
        return `<div class="report-card mb-2" onclick="openReport(${i})">
          <div class="flex items-center gap-2 mb-1">
            <span>${agent.emoji}</span>
            <span class="text-xs font-bold" style="color:${agent.color}">${agent.name}</span>
            <span class="ml-auto text-[10px] text-gray-500 font-mono">${formatDate(r.ts)}</span>
          </div>
          <div class="text-xs text-white font-semibold mb-1">${r.title || 'Audit Report'}</div>
          <p class="text-[11px] text-gray-500 leading-relaxed">${preview}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="badge badge-red text-[9px]">AUDIT · $2.00</span>
            <span class="text-[10px] text-gold">View Full →</span>
          </div>
        </div>`;
      }).join('')}`;

    // Store for modal access
    window._reportsCache = reports;
  }

  return {
    async refresh() {
      await loadAndRender();
    },
    async init() {
      await loadAndRender();
    }
  };
})();

async function openReport(index) {
  const reports = window._reportsCache || [];
  const r = reports[index];
  if (!r) return;

  const agent = AgentManager.getById(r.agentId) || { name: 'Agent', emoji: '🤖', color: '#C9A84C' };
  const content = document.getElementById('modal-report-content');

  const formatted = r.content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/^(ORACLE VERDICT:|STRATEGIC PRIORITY:|FORMULA:|HOMEWORK:|THREAT LEVEL:|EXPLOIT THIS:)/gm,
      '<div class="mt-4 pt-3 border-t border-gold/20"><span class="text-gold font-bold text-xs uppercase tracking-widest">$1</span></div>')
    .replace(/^(MOVE \d+:|LESSON:|INTEL:|TRANSMUTE:)/gm,
      '<div class="mt-3"><span class="text-amber-400 font-bold text-xs">$1</span></div>')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br/>');

  content.innerHTML = `
    <div class="flex items-start justify-between mb-5">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span style="font-size:20px">${agent.emoji}</span>
          <span class="font-bold text-sm uppercase tracking-widest" style="color:${agent.color}">${agent.name} · Full Audit</span>
        </div>
        <p class="text-xs text-gray-500">${r.title}</p>
        <p class="text-[10px] text-gray-600 mt-0.5">${new Date(r.ts).toLocaleString()}</p>
      </div>
      <button onclick="closeModal()" class="text-gray-500 hover:text-white text-xl flex-shrink-0">×</button>
    </div>
    <div class="bg-black/40 rounded-lg p-4 max-h-[60vh] overflow-y-auto border border-gray-800">
      <div class="text-gray-300 text-sm leading-relaxed">${formatted}</div>
    </div>
    <div class="flex gap-3 mt-4">
      <button onclick="copyReport()" class="btn-ghost px-4 py-2 text-xs flex-1">📋 COPY REPORT</button>
      <button onclick="closeModal()" class="btn-gold px-4 py-2 text-xs flex-1">CLOSE</button>
    </div>`;

  window._currentReportContent = r.content;
  showModal('modal-report');
}

function copyReport() {
  if (window._currentReportContent) {
    navigator.clipboard.writeText(window._currentReportContent)
      .then(() => Toast.show('Report copied to clipboard!', 'success'))
      .catch(() => Toast.show('Copy failed — please select manually', 'error'));
  }
}
