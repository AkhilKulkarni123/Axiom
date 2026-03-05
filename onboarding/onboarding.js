// Axiom Onboarding Script

const state = {
  interests: [],
  goals: [],
};

document.addEventListener('DOMContentLoaded', async () => {
  // Load existing data
  const profile = await chrome.runtime.sendMessage({ action: 'getProfile' });
  const settings = await chrome.runtime.sendMessage({ action: 'getSettings' });
  const apiKeyResult = await chrome.runtime.sendMessage({ action: 'getApiKey' });

  // Populate fields
  document.getElementById('name').value = profile.name || '';
  document.getElementById('education').value = profile.education || '';
  document.getElementById('occupation').value = profile.occupation || '';
  document.getElementById('knowledge-level').value = profile.knowledgeLevel || 'intermediate';
  document.getElementById('notes').value = profile.notes || '';
  document.getElementById('api-key').value = apiKeyResult.apiKey || '';

  state.interests = profile.interests || [];
  state.goals = profile.goals || [];
  renderTags('interest-tags', state.interests);
  renderTags('goal-tags', state.goals);

  // Mark quick tags that are already selected
  document.querySelectorAll('.quick-tag').forEach((el) => {
    const target = el.dataset.target;
    const arr = target === 'interests' ? state.interests : state.goals;
    if (arr.includes(el.textContent)) el.classList.add('selected');
  });

  // Settings toggles
  document.getElementById('setting-auto-summarize').checked = settings.autoSummarize ?? true;
  document.getElementById('setting-confidence-check').checked = settings.confidenceCheck ?? true;
  document.getElementById('setting-suggestions').checked = settings.suggestions ?? true;
  document.getElementById('setting-reminders').checked = settings.reminders ?? true;

  // Navigate to hash step if present
  if (location.hash === '#settings') {
    showStep('settings');
  }

  // --- Navigation ---
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showStep(btn.dataset.step));
  });

  document.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      saveCurrentState();
      showStep(btn.dataset.next);
    });
  });

  // --- Tag Inputs ---
  setupTagInput('interest-input', 'interest-tags', state.interests);
  setupTagInput('goal-input', 'goal-tags', state.goals);

  // Quick tag buttons
  document.querySelectorAll('.quick-tag').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.target;
      const arr = target === 'interests' ? state.interests : state.goals;
      const containerId = target === 'interests' ? 'interest-tags' : 'goal-tags';
      const text = el.textContent;

      if (arr.includes(text)) {
        arr.splice(arr.indexOf(text), 1);
        el.classList.remove('selected');
      } else {
        arr.push(text);
        el.classList.add('selected');
      }
      renderTags(containerId, arr);
    });
  });

  // --- Finish ---
  document.getElementById('btn-finish').addEventListener('click', async () => {
    saveCurrentState();

    const profile = {
      name: document.getElementById('name').value.trim(),
      education: document.getElementById('education').value.trim(),
      occupation: document.getElementById('occupation').value.trim(),
      knowledgeLevel: document.getElementById('knowledge-level').value,
      notes: document.getElementById('notes').value.trim(),
      interests: state.interests,
      goals: state.goals,
    };

    const settings = {
      autoSummarize: document.getElementById('setting-auto-summarize').checked,
      confidenceCheck: document.getElementById('setting-confidence-check').checked,
      suggestions: document.getElementById('setting-suggestions').checked,
      reminders: document.getElementById('setting-reminders').checked,
    };

    const apiKey = document.getElementById('api-key').value.trim();

    await chrome.runtime.sendMessage({ action: 'saveProfile', profile });
    await chrome.runtime.sendMessage({ action: 'saveSettings', settings });
    if (apiKey) {
      await chrome.runtime.sendMessage({ action: 'saveApiKey', apiKey });
    }
    await chrome.runtime.sendMessage({ action: 'setOnboarded' });

    // Show success
    const btn = document.getElementById('btn-finish');
    btn.textContent = 'Saved!';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = 'Finish Setup';
      btn.style.background = '';
    }, 2000);
  });
});

function showStep(stepId) {
  document.querySelectorAll('.step').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  document.getElementById(`step-${stepId}`).classList.add('active');
  document.querySelector(`.nav-item[data-step="${stepId}"]`).classList.add('active');
}

function setupTagInput(inputId, containerId, arr) {
  const input = document.getElementById(inputId);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      const val = input.value.trim();
      if (!arr.includes(val)) {
        arr.push(val);
        renderTags(containerId, arr);
      }
      input.value = '';
    }
  });
}

function renderTags(containerId, arr) {
  const container = document.getElementById(containerId);
  container.innerHTML = arr
    .map(
      (t, i) => `<span class="tag">${t}<span class="remove-tag" data-index="${i}">&times;</span></span>`
    )
    .join('');

  container.querySelectorAll('.remove-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      arr.splice(parseInt(btn.dataset.index), 1);
      renderTags(containerId, arr);
    });
  });
}

function saveCurrentState() {
  // Auto-save happens on finish, but we keep state in memory
}
