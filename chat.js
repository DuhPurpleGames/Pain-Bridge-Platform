/* ============================
   CHAT.JS — AI Chat Engine (Part 1)
   Core setup, UI rendering, API call
   ============================ */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const PRICE_QUERY = 0.50;
const PRICE_AUDIT = 2.00;

let _conversationHistory = [];

// --- HELPERS ---
function _chatWin() { return document.getElementById('chat-window'); }

function _appendMsg(html) {
  const win = _chatWin();
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = html;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

function _escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _formatContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/^(ORACLE VERDICT:|STRATEGIC PRIORITY:|FORMULA:|HOMEWORK:|THREAT LEVEL:|EXPLOIT THIS:)/gm,
      '<div class="mt-3 pt-2 border-t border-gold/20"><span class="text-gold font-bold text-xs uppercase tracking-widest">$1</span></div>')
    .replace(/^(MOVE \d+:|LESSON:|INTEL:|TRANSMUTE:)/gm,
      '<div class="mt-2"><span class="text-amber-400 font-bold text-xs">$1</span></div>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
}

function _userMsg(text) {
  _appendMsg(`<div class="msg-user">
    <div class="text-[10px] text-gray-500 mb-1 uppercase tracking-widest">You</div>
    <div class="text-gray-200">${_escHtml(text)}</div>
  </div>`);
}

function _agentMsg(agent, content, isAudit) {
  const label = isAudit ? 'FULL AUDIT REPORT' : agent.title;
  const cost = isAudit ? '$2.00' : '$0.50';
  const badge = isAudit ? 'badge-red' : 'badge-gold';
  const style = isAudit ? 'border-color:rgba(201,168,76,0.3); background:rgba(201,168,76,0.04)' : '';
  _appendMsg(`<div class="msg-agent" style="${style}">
    <div class="msg-agent-header">
      <span style="font-size:16px">${agent.emoji}</span>
      <div>
        <span class="text-xs font-bold tracking-widest uppercase" style="color:${agent.color}">${agent.name}</span>
        <span class="text-[10px] text-gray-500 ml-2">${label}</span>
      </div>
      <span class="ml-auto badge ${badge} text-[9px]">${cost}</span>
    </div>
    <div class="text-gray-300 text-sm leading-relaxed">${_formatContent(content)}</div>
  </div>`);
}

function _showTyping(agent) {
  const win = _chatWin();
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.className = 'chat-msg';
  div.innerHTML = `<div class="msg-agent" style="padding:10px 14px">
    <div class="flex items-center gap-2">
      <span>${agent.emoji}</span>
      <span class="text-xs" style="color:${agent.color}">${agent.name} is analyzing...</span>
      <div class="typing-dots ml-2"><span></span><span></span><span></span></div>
    </div>
  </div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function _hideTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function _setLoading(loading) {
  const btn = document.getElementById('send-btn');
  const inp = document.getElementById('chat-input');
  const status = document.getElementById('input-status');
  if (loading) {
    btn.disabled = true; btn.textContent = 'THINKING...';
    inp.disabled = true;
    status.textContent = 'Agent is processing your query...';
  } else {
    btn.disabled = false; btn.textContent = 'ASK · $0.50';
    inp.disabled = false; status.textContent = '';
  }
}

// --- API CALL ---
async function _callAPI(systemPrompt, userMessage, isAudit) {
  const maxTokens = isAudit ? 1500 : 800;
  const messages = [
    ..._conversationHistory.slice(-6),
    { role: 'user', content: userMessage }
  ];
  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || 'No response generated.';
}

// --- CHAT MODULE ---
const Chat = {
  reset() {
    _chatWin().innerHTML = '';
    _conversationHistory = [];
    this.renderWelcome(null);
  },

  renderWelcome(user) {
    const win = _chatWin();
    win.innerHTML = '';
    _conversationHistory = [];
    if (!user) {
      win.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center py-10 px-8">
          <div class="text-5xl mb-4">🔮</div>
          <h2 class="font-cinzel text-gold text-base tracking-widest mb-2">PAIN BRIDGE PLATFORM</h2>
          <p class="text-gray-400 text-sm mb-4 max-w-xs">5 specialized AI agents. Business pain → Competitive advantage.</p>
          <div class="grid grid-cols-3 gap-3 my-4 w-full max-w-xs text-center">
            <div class="bg-gray-900/50 rounded-lg p-2 border border-gray-800">
              <div class="text-amber-400 font-mono text-sm">$0.50</div>
              <div class="text-[10px] text-gray-500">Per Ask</div>
            </div>
            <div class="bg-gray-900/50 rounded-lg p-2 border border-gray-800">
              <div class="text-amber-400 font-mono text-sm">$2.00</div>
              <div class="text-[10px] text-gray-500">Full Audit</div>
            </div>
            <div class="bg-gray-900/50 rounded-lg p-2 border border-gray-800">
              <div class="text-emerald-400 font-mono text-sm">FREE</div>
              <div class="text-[10px] text-gray-500">Browse</div>
            </div>
          </div>
          <button onclick="openAuth('register')" class="btn-gold px-8 py-2 text-sm mb-2">START FREE →</button>
          <button onclick="openAuth('login')" class="btn-ghost px-6 py-2 text-xs">Already have account</button>
        </div>`;
      return;
    }
    _appendMsg(`<div class="msg-system">Welcome back, ${user.name || user.email}. Select an agent below.</div>`);
    this.showAgentIntro(AgentManager.active);
  },

  showAgentIntro(agent) {
    const intros = {
      oracle: "Feed me your situation. I'll find exactly where you're bleeding revenue and losing ground.",
      strategist: "Tell me your challenge. I'll give you precise tactical moves to outmaneuver your competition.",
      alchemist: "Describe your pain. I'll architect the complete transformation from problem to profit.",
      scout: "What market are you in? I'll run recon and find the gaps competitors left wide open.",
      mentor: "Share what's not working. I'll teach you the root cause so you solve it permanently."
    };
    _appendMsg(`<div class="msg-agent" style="border-color:${agent.color}30">
      <div class="msg-agent-header">
        <span style="font-size:18px">${agent.emoji}</span>
        <div>
          <span class="font-bold text-xs tracking-widest uppercase" style="color:${agent.color}">${agent.name}</span>
          <span class="text-[10px] text-gray-500 ml-2">${agent.title}</span>
        </div>
      </div>
      <div class="text-gray-400 text-xs leading-relaxed">${intros[agent.id] || 'Ready to analyze your business challenge.'}</div>
    </div>`);
  }
};
