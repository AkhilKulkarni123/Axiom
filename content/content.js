// Axiom Content Script
// Injects UI elements and handles page analysis

(function () {
  'use strict';

  if (window.__axiomLoaded) return;
  window.__axiomLoaded = true;

  // --- Utility ---
  function extractPageContent() {
    const article = document.querySelector('article') || document.querySelector('[role="main"]') || document.body;
    const clone = article.cloneNode(true);
    clone.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript').forEach((el) => el.remove());
    return clone.innerText.trim().substring(0, 12000);
  }

  function extractClaims() {
    const content = extractPageContent();
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    return sentences.slice(0, 30).join('. ');
  }

  function showToast(msg) {
    let toast = document.getElementById('axiom-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'axiom-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('axiom-visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('axiom-visible'), 3000);
  }

  // --- Create FAB ---
  function createFAB() {
    const fab = document.createElement('button');
    fab.id = 'axiom-fab';
    fab.title = 'Axiom';
    fab.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>`;
    fab.addEventListener('click', toggleQuickMenu);
    document.body.appendChild(fab);
  }

  // --- Quick Menu ---
  function createQuickMenu() {
    const menu = document.createElement('div');
    menu.id = 'axiom-quick-menu';
    menu.innerHTML = `
      <button class="axiom-menu-item" data-action="summarize">
        <span class="axiom-menu-icon">&#x1F4CB;</span> Summarize Page
      </button>
      <button class="axiom-menu-item" data-action="confidence">
        <span class="axiom-menu-icon">&#x1F50D;</span> Confidence Check
      </button>
      <button class="axiom-menu-item" data-action="suggestions">
        <span class="axiom-menu-icon">&#x1F4A1;</span> Suggestions
      </button>
      <button class="axiom-menu-item" data-action="chat">
        <span class="axiom-menu-icon">&#x1F4AC;</span> Chat with Axiom
      </button>
      <button class="axiom-menu-item" data-action="sidebar">
        <span class="axiom-menu-icon">&#x2699;</span> Open Sidebar
      </button>
    `;
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('.axiom-menu-item');
      if (!btn) return;
      const action = btn.dataset.action;
      toggleQuickMenu();
      handleMenuAction(action);
    });
    document.body.appendChild(menu);
  }

  function toggleQuickMenu() {
    const menu = document.getElementById('axiom-quick-menu');
    if (menu) menu.classList.toggle('axiom-visible');
  }

  // --- Overlay Panel ---
  function getOrCreateOverlay() {
    let overlay = document.getElementById('axiom-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'axiom-overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function showOverlay(title, bodyHTML) {
    const overlay = getOrCreateOverlay();
    overlay.innerHTML = `
      <div class="axiom-overlay-header">
        <h2>${title}</h2>
        <button class="axiom-overlay-close">&times;</button>
      </div>
      <div class="axiom-overlay-body">${bodyHTML}</div>
    `;
    overlay.querySelector('.axiom-overlay-close').addEventListener('click', hideOverlay);
    requestAnimationFrame(() => overlay.classList.add('axiom-visible'));
  }

  function hideOverlay() {
    const overlay = document.getElementById('axiom-overlay');
    if (overlay) overlay.classList.remove('axiom-visible');
  }

  function showLoading(title) {
    showOverlay(title, '<div class="axiom-loading"><div class="axiom-spinner"></div></div>');
  }

  // --- Feature Handlers ---
  async function handleMenuAction(action) {
    switch (action) {
      case 'summarize':
        await doSummarize();
        break;
      case 'confidence':
        await doConfidenceCheck();
        break;
      case 'suggestions':
        await doSuggestions();
        break;
      case 'chat':
        openChat();
        break;
      case 'sidebar':
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
        break;
    }
  }

  async function doSummarize() {
    showLoading('Summarizing...');
    try {
      const content = extractPageContent();
      const result = await chrome.runtime.sendMessage({
        action: 'summarizePage',
        content,
      });

      if (result.error) {
        showOverlay('Summary', `<p style="color:#ef4444">${result.error}</p>`);
        return;
      }

      const summaryText = typeof result.summary === 'string'
        ? result.summary
        : (Array.isArray(result.summary) ? result.summary.join('</li><li>') : '');

      const keyPointsHTML = result.keyPoints?.length
        ? result.keyPoints.map((p) => `<li>${p}</li>`).join('')
        : '';

      const relevanceClass = `axiom-relevance-${result.relevance || 'medium'}`;

      showOverlay('Page Summary', `
        <div class="axiom-summary-section">
          <h3>Summary</h3>
          ${typeof result.summary === 'string'
            ? `<p>${result.summary}</p>`
            : `<ul class="axiom-summary-bullets"><li>${summaryText}</li></ul>`}
        </div>
        ${keyPointsHTML ? `
          <div class="axiom-summary-section">
            <h3>Key Takeaways</h3>
            <ul class="axiom-summary-bullets">${keyPointsHTML}</ul>
          </div>
        ` : ''}
        ${result.simplifiedExplanation ? `
          <div class="axiom-summary-section">
            <h3>Simplified</h3>
            <p>${result.simplifiedExplanation}</p>
          </div>
        ` : ''}
        <div class="axiom-summary-section">
          <span class="axiom-relevance-tag ${relevanceClass}">
            Relevance: ${result.relevance || 'medium'}
          </span>
        </div>
      `);
    } catch (err) {
      showOverlay('Summary', `<p style="color:#ef4444">Error: ${err.message}</p>`);
    }
  }

  async function doConfidenceCheck() {
    showLoading('Checking reliability...');
    try {
      const claims = extractClaims();
      const result = await chrome.runtime.sendMessage({
        action: 'confidenceCheck',
        claims,
      });

      if (result.error) {
        showOverlay('Confidence Check', `<p style="color:#ef4444">${result.error}</p>`);
        return;
      }

      // Show badge
      showConfidenceBadge(result.overallScore, result.overallRating);

      // Show details
      const claimsHTML = (result.claims || [])
        .map((c) => `
          <div class="axiom-claim-card">
            <div class="axiom-claim-text">"${c.text}"</div>
            <span class="axiom-claim-rating axiom-rating-${c.rating}">${c.rating}</span>
            <span style="font-size:12px;color:#6b7280;margin-left:6px">${c.confidence}%</span>
            <div class="axiom-claim-explanation">${c.explanation}</div>
          </div>
        `)
        .join('');

      showOverlay('Confidence Check', `
        <div class="axiom-summary-section">
          <h3>Overall: ${result.overallRating} (${result.overallScore}/100)</h3>
        </div>
        ${claimsHTML || '<p>No specific claims detected.</p>'}
      `);
    } catch (err) {
      showOverlay('Confidence Check', `<p style="color:#ef4444">Error: ${err.message}</p>`);
    }
  }

  function showConfidenceBadge(score, rating) {
    let badge = document.getElementById('axiom-confidence-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'axiom-confidence-badge';
      document.body.appendChild(badge);
    }
    badge.className = '';
    const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    badge.classList.add('axiom-visible', `axiom-${level}`);
    badge.innerHTML = `<span>${score}/100</span> <span>${rating}</span>`;
    badge.onclick = () => {
      const overlay = document.getElementById('axiom-overlay');
      if (overlay) overlay.classList.toggle('axiom-visible');
    };
  }

  async function doSuggestions() {
    showLoading('Finding suggestions...');
    try {
      const context = `Page title: ${document.title}\nURL: ${location.href}\nContent preview: ${extractPageContent().substring(0, 2000)}`;
      const result = await chrome.runtime.sendMessage({
        action: 'suggestActions',
        context,
      });

      if (result.error) {
        showOverlay('Suggestions', `<p style="color:#ef4444">${result.error}</p>`);
        return;
      }

      const suggestions = Array.isArray(result) ? result : [];
      const html = suggestions.length
        ? suggestions
            .map((s) => `
              <div class="axiom-suggestion-card" data-query="${s.searchQuery || ''}">
                <div class="axiom-suggestion-type">${s.type}</div>
                <div class="axiom-suggestion-title">${s.title}</div>
                <div class="axiom-suggestion-desc">${s.description}</div>
              </div>
            `)
            .join('')
        : '<p>No suggestions available. Browse more to get personalized suggestions!</p>';

      showOverlay('Suggestions for You', html);

      // Click to search
      document.querySelectorAll('.axiom-suggestion-card').forEach((card) => {
        card.addEventListener('click', () => {
          const q = card.dataset.query;
          if (q) window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
        });
      });
    } catch (err) {
      showOverlay('Suggestions', `<p style="color:#ef4444">Error: ${err.message}</p>`);
    }
  }

  function openChat() {
    const overlay = getOrCreateOverlay();
    overlay.innerHTML = `
      <div class="axiom-overlay-header">
        <h2>Chat with Axiom</h2>
        <button class="axiom-overlay-close">&times;</button>
      </div>
      <div class="axiom-overlay-body">
        <div class="axiom-chat-container">
          <div class="axiom-chat-messages" id="axiom-chat-messages">
            <div class="axiom-chat-message axiom-assistant">Hi! I'm Axiom, your AI assistant. Ask me anything about this page or whatever's on your mind.</div>
          </div>
          <div class="axiom-chat-input-wrap">
            <input class="axiom-chat-input" id="axiom-chat-input" placeholder="Ask Axiom..." />
            <button class="axiom-chat-send" id="axiom-chat-send">Send</button>
          </div>
        </div>
      </div>
    `;
    overlay.querySelector('.axiom-overlay-close').addEventListener('click', hideOverlay);

    const input = document.getElementById('axiom-chat-input');
    const sendBtn = document.getElementById('axiom-chat-send');
    const messages = document.getElementById('axiom-chat-messages');

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      messages.innerHTML += `<div class="axiom-chat-message axiom-user">${text}</div>`;
      messages.innerHTML += `<div class="axiom-chat-message axiom-assistant" id="axiom-typing"><div class="axiom-spinner" style="width:16px;height:16px;border-width:2px"></div></div>`;
      messages.scrollTop = messages.scrollHeight;

      try {
        const pageContext = `Page: ${document.title}\nURL: ${location.href}\nContent: ${extractPageContent().substring(0, 2000)}`;
        const result = await chrome.runtime.sendMessage({
          action: 'chat',
          message: text,
          pageContext,
        });
        const typing = document.getElementById('axiom-typing');
        if (typing) typing.outerHTML = `<div class="axiom-chat-message axiom-assistant">${result.reply || result.error}</div>`;
      } catch (err) {
        const typing = document.getElementById('axiom-typing');
        if (typing) typing.outerHTML = `<div class="axiom-chat-message axiom-assistant" style="color:#ef4444">Error: ${err.message}</div>`;
      }
      messages.scrollTop = messages.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    requestAnimationFrame(() => overlay.classList.add('axiom-visible'));
    input.focus();
  }

  // --- Listen for messages from background ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'summarize':
        doSummarize();
        break;
      case 'confidenceCheck':
        if (message.selection) {
          showLoading('Checking...');
          chrome.runtime.sendMessage({ action: 'confidenceCheck', claims: message.selection }).then((r) => {
            showConfidenceBadge(r.overallScore, r.overallRating);
          });
        } else {
          doConfidenceCheck();
        }
        break;
      case 'simplify':
        showToast('Simplifying...');
        chrome.runtime.sendMessage({
          action: 'summarizePage',
          content: message.text,
        }).then((r) => {
          showOverlay('Simplified', `<p>${r.simplifiedExplanation || r.summary || 'Could not simplify.'}</p>`);
        });
        break;
    }
  });

  // --- Initialize ---
  function init() {
    createFAB();
    createQuickMenu();

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('axiom-quick-menu');
      const fab = document.getElementById('axiom-fab');
      if (menu && menu.classList.contains('axiom-visible') && !menu.contains(e.target) && !fab.contains(e.target)) {
        menu.classList.remove('axiom-visible');
      }
    });

    // Close overlay on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideOverlay();
    });

    // Listen for popup-triggered actions
    window.addEventListener('axiom-action', (e) => {
      handleMenuAction(e.detail);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
