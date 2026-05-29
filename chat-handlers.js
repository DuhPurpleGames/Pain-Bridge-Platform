/* ============================
   CHAT-HANDLERS.JS (Part 2)
   Send query, audit, key handlers
   ============================ */

// Attached to Chat object — sendQuery method
Chat.sendQuery = async function(text, isAudit) {
  const agent = AgentManager.active;
  const user = Auth.currentUser;
  const cost = isAudit ? PRICE_AUDIT : PRICE_QUERY;

  if (!user) {
    Toast.show('Please login to use AI agents', 'error');
    openAuth('login');
    return;
  }

  const canSpend = await Wallet.spend(cost, `${agent.name} · ${isAudit ? 'Audit' : 'Query'}`);
  if (!canSpend) return;

  _userMsg(text);
  _showTyping(agent);
  _setLoading(true);
  Logger.log(`${agent.name} → processing ${isAudit ? 'AUDIT' : 'query'}...`, 'agent');

  const systemPrompt = isAudit
    ? `${agent.prompt}\n\nThis is a FULL AUDIT. Cover: 1) Pain Point Analysis 2) Revenue Gap 3) Competitor Positioning 4) Action Steps 5) 90-Day Plan. Be thorough and specific.`
    : agent.prompt;

  const userCtx = `Entrepreneur query:\n\n${text}\n\nProvide your specialized analysis.`;

  try {
    const reply = await _callAPI(systemPrompt, userCtx, isAudit);
    _hideTyping();
    _agentMsg(agent, reply, isAudit);

    if (isAudit) {
      await DB.saveReport(user.id, text.substring(0, 80), reply, agent.id);
      Wallet.incrementAudit();
      Reports.refresh();
      Actions.extractFromAudit(reply, agent);
      Solutions.extractFromResponse(reply, agent);
      Logger.log('Audit complete · Saved to reports', 'success');
    } else {
      Wallet.incrementQuery();
      Logger.log(`${agent.name} responded · $0.50 charged`, 'success');
    }

    _conversationHistory.push({ role: 'user', content: text });
    _conversationHistory.push({ role: 'assistant', content: reply });
    await DB.saveMessage(user.id, 'user', text, agent.id, 0);
    await DB.saveMessage(user.id, 'assistant', reply, agent.id, cost);

    const gapMatch = reply.match(/\$[\d,]+[k]?[\s-]*revenue/i);
    if (gapMatch) Wallet.setRevenueGap(gapMatch[0]);

  } catch (err) {
    _hideTyping();
    const errMsg = err.message || 'API error';
    _appendMsg(`<div class="msg-system text-red-400">⚠ ${errMsg}</div>`);
    Logger.log(`API error: ${errMsg}`, 'error');
    await Wallet.addFunds(cost);
    Logger.log(`Refunded $${cost.toFixed(2)} due to error`, 'warn');
    Toast.show('Error occurred — charge refunded', 'error');
  } finally {
    _setLoading(false);
  }
};

// --- GLOBAL INPUT HANDLERS ---
function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await Chat.sendQuery(text, false);
}

async function requestAudit() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim() ||
    'Please perform a comprehensive business audit and identify all revenue gaps, competitive weaknesses, and priority opportunities for my business.';
  input.value = '';
  await Chat.sendQuery(text, true);
}
