// Axiom Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load profile
  const profile = await chrome.runtime.sendMessage({ action: 'getProfile' });
  const apiKeyResult = await chrome.runtime.sendMessage({ action: 'getApiKey' });

  // Update status
  const status = document.getElementById('status');
  if (!apiKeyResult.apiKey) {
    status.textContent = 'No API Key';
    status.className = 'status status-error';
  }

  // Show profile summary
  const summary = document.getElementById('profile-summary');
  if (profile.name || profile.interests?.length) {
    const tags = [...(profile.interests || []), ...(profile.goals || [])]
      .map((t) => `<span class="tag">${t}</span>`)
      .join('');
    summary.innerHTML = `
      <strong>${profile.name || 'User'}</strong>
      ${profile.occupation ? ` &middot; ${profile.occupation}` : ''}
      ${tags ? `<div style="margin-top:6px">${tags}</div>` : ''}
    `;
  } else {
    summary.innerHTML = 'No profile set up yet. <a href="#" id="setup-link">Get started</a>';
    document.getElementById('setup-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
    });
  }

  // Action buttons - send messages to active tab's content script
  async function sendToTab(action) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action });
      window.close();
    }
  }

  document.getElementById('btn-summarize').addEventListener('click', () => sendToTab('summarize'));
  document.getElementById('btn-confidence').addEventListener('click', () => sendToTab('confidenceCheck'));
  document.getElementById('btn-suggestions').addEventListener('click', () => {
    sendToTab('summarize'); // triggers suggestions via menu action
    // Actually, let's open the content script's suggestion flow
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Dispatch custom event that content script picks up
          window.dispatchEvent(new CustomEvent('axiom-action', { detail: 'suggestions' }));
        },
      });
      window.close();
    });
  });
  document.getElementById('btn-chat').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          window.dispatchEvent(new CustomEvent('axiom-action', { detail: 'chat' }));
        },
      });
      window.close();
    });
  });

  // Footer links
  document.getElementById('btn-settings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html#settings') });
  });
  document.getElementById('btn-onboarding').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  });
});
