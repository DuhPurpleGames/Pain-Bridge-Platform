/* ============================
   ACTIONS.JS — Priority Actions
   ============================ */

const Actions = (() => {
  const _actions = [];

  const STARTER_ACTIONS = [
    { title: 'Define your #1 customer pain point in one sentence', priority: 'high', tag: 'Foundation', done: false },
    { title: 'Map your 3 nearest competitors\' positioning gaps', priority: 'high', tag: 'Intel', done: false },
    { title: 'Calculate your current customer acquisition cost', priority: 'med', tag: 'Revenue', done: false },
    { title: 'Identify your highest-margin product or service', priority: 'med', tag: 'Revenue', done: false },
    { title: 'List the last 5 customers who stopped buying', priority: 'high', tag: 'Recovery', done: false },
    { title: 'Request your first AI audit for deep gap analysis', priority: 'high', tag: 'Platform', done: false }
  ];

  function render() {
    const panel = document.getElementById('panel-actions');
    if (!panel) return;

    const all = [..._actions, ...STARTER_ACTIONS];
    const pending = all.filter(a => !a.done);
    const done = all.filter(a => a.done);

    panel.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="text-[10px] text-gray-500 uppercase tracking-widest">Priority Actions</div>
        <div class="flex gap-2">
          <span class="badge badge-red">${pending.length} OPEN</span>
          ${done.length ? `<span class="badge badge-green">${done.length} DONE</span>` : ''}
        </div>
      </div>
      ${pending.map((a, i) => `
        <div class="action-card priority-${a.priority} mb-2" onclick="toggleAction(${i})">
          <div class="flex items-start gap-2">
            <div class="w-4 h-4 rounded border border-gray-600 flex-shrink-0 mt-0.5 flex items-center justify-center hover:border-gold transition-colors">
              <span class="text-[10px] text-gray-600">○</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-[9px] text-gray-500 uppercase tracking-widest">${a.tag}</span>
                ${a.priority === 'high' ? '<span class="badge badge-red text-[8px]">HIGH</span>' :
                  a.priority === 'med' ? '<span class="badge badge-gold text-[8px]">MED</span>' :
                  '<span class="badge badge-green text-[8px]">LOW</span>'}
              </div>
              <div class="text-xs text-gray-300">${a.title}</div>
            </div>
            <button class="text-[10px] text-gold hover:text-white ml-1 flex-shrink-0"
              onclick="event.stopPropagation(); askAgentAbout('${a.title.replace(/'/g, "\\'")}')">→</button>
          </div>
        </div>`).join('')}
      ${done.length ? `
        <div class="mt-3 pt-2 border-t border-gray-800">
          <div class="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Completed</div>
          ${done.map(a => `
            <div class="action-card mb-1 opacity-40">
              <div class="flex items-center gap-2">
                <span class="text-emerald-400 text-xs">✓</span>
                <span class="text-xs text-gray-500 line-through">${a.title}</span>
              </div>
            </div>`).join('')}
        </div>` : ''}`;
  }

  return {
    init() { render(); },

    toggleAction(idx) {
      const all = [..._actions];
      if (all[idx]) {
        all[idx].done = !all[idx].done;
        _actions[idx] = all[idx];
        render();
        Logger.log(`Action ${_actions[idx].done ? 'completed' : 'reopened'}: ${_actions[idx].title.substring(0, 40)}...`, 'success');
      }
    },

    extractFromAudit(text, agent) {
      // Parse action items from audit text
      const lines = text.split('\n');
      let extracted = 0;
      lines.forEach(line => {
        const clean = line.replace(/^[-•*\d.)\s]+/, '').replace(/\*\*/g, '').trim();
        if (clean.length > 20 && clean.length < 120 &&
            /implement|create|build|launch|test|audit|review|identify|map|optimize|fix|add|start/i.test(clean)) {
          _actions.unshift({
            title: clean.charAt(0).toUpperCase() + clean.slice(1),
            priority: extracted < 2 ? 'high' : 'med',
            tag: agent.title.split(' ')[0],
            done: false
          });
          extracted++;
          if (extracted >= 4) return;
        }
      });
      if (extracted > 0) {
        if (_actions.length > 20) _actions.splice(20);
        render();
        Logger.log(`${extracted} actions extracted from audit`, 'success');
        switchRightTab('actions');
      }
    }
  };
})();

function toggleAction(i) { Actions.toggleAction(i); }
