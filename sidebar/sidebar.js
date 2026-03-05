// Axiom Sidebar Script

document.addEventListener('DOMContentLoaded', async () => {
  // --- Tabs ---
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // --- Chat ---
  const chatMessages = document.getElementById('sidebar-chat-messages');
  const chatInput = document.getElementById('sidebar-chat-input');
  const chatSend = document.getElementById('sidebar-chat-send');

  async function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';

    chatMessages.innerHTML += `<div class="chat-msg user">${escapeHtml(text)}</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'chat',
        message: text,
        pageContext: 'Sidebar conversation',
      });
      chatMessages.innerHTML += `<div class="chat-msg assistant">${escapeHtml(result.reply || result.error)}</div>`;
    } catch (err) {
      chatMessages.innerHTML += `<div class="chat-msg assistant" style="color:#ef4444">Error: ${escapeHtml(err.message)}</div>`;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  // --- Reminders ---
  const reminderList = document.getElementById('reminder-list');

  async function loadReminders() {
    const reminders = await chrome.runtime.sendMessage({ action: 'getReminders' });
    reminderList.innerHTML = (reminders || [])
      .map(
        (r) => `
        <div class="reminder-item">
          <div>
            <div class="reminder-text">${escapeHtml(r.text)}</div>
            ${r.dueDate ? `<div class="reminder-date">${new Date(r.dueDate).toLocaleString()}</div>` : ''}
          </div>
          <button class="delete-reminder" data-id="${r.id}">&times;</button>
        </div>
      `
      )
      .join('');

    reminderList.querySelectorAll('.delete-reminder').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ action: 'deleteReminder', id: btn.dataset.id });
        loadReminders();
      });
    });
  }

  document.getElementById('add-reminder').addEventListener('click', async () => {
    const text = document.getElementById('reminder-text').value.trim();
    const date = document.getElementById('reminder-date').value;
    if (!text) return;

    await chrome.runtime.sendMessage({
      action: 'addReminder',
      reminder: { text, dueDate: date || null },
    });
    document.getElementById('reminder-text').value = '';
    document.getElementById('reminder-date').value = '';
    loadReminders();
  });

  loadReminders();

  // --- Profile ---
  const profile = await chrome.runtime.sendMessage({ action: 'getProfile' });
  const profileEl = document.getElementById('sidebar-profile');

  profileEl.innerHTML = `
    <div class="label">Name</div>
    <div class="value">${escapeHtml(profile.name || 'Not set')}</div>
    <div class="label">Education</div>
    <div class="value">${escapeHtml(profile.education || 'Not set')}</div>
    <div class="label">Occupation</div>
    <div class="value">${escapeHtml(profile.occupation || 'Not set')}</div>
    <div class="label">Knowledge Level</div>
    <div class="value">${escapeHtml(profile.knowledgeLevel || 'intermediate')}</div>
    <div class="label">Interests</div>
    <div class="value">${(profile.interests || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('') || 'None'}</div>
    <div class="label">Goals</div>
    <div class="value">${(profile.goals || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('') || 'None'}</div>
  `;

  document.getElementById('edit-profile').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  });
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
