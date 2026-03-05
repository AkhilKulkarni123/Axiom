// Axiom Background Service Worker
// Handles message routing, context menus, alarms, and AI processing

importScripts('../lib/storage.js', '../lib/ai.js');

// --- Context Menu Setup ---
chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'axiom-summarize',
    title: 'Axiom: Summarize this page',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'axiom-check',
    title: 'Axiom: Check reliability',
    contexts: ['page', 'selection'],
  });
  chrome.contextMenus.create({
    id: 'axiom-simplify',
    title: 'Axiom: Simplify selected text',
    contexts: ['selection'],
  });

  // Open onboarding on first install
  const onboarded = await AxiomStorage.isOnboarded();
  if (!onboarded) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  }

  // Set up periodic reminder check
  chrome.alarms.create('axiom-reminder-check', { periodInMinutes: 30 });
});

// --- Context Menu Handler ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'axiom-summarize') {
    chrome.tabs.sendMessage(tab.id, { action: 'summarize' });
  } else if (info.menuItemId === 'axiom-check') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'confidenceCheck',
      selection: info.selectionText || null,
    });
  } else if (info.menuItemId === 'axiom-simplify') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'simplify',
      text: info.selectionText,
    });
  }
});

// --- Side Panel ---
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

// --- Message Handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message });
  });
  return true; // async response
});

async function handleMessage(message, sender) {
  const apiKey = await AxiomStorage.getApiKey();
  const profile = await AxiomStorage.getProfile();

  switch (message.action) {
    case 'getProfile':
      return profile;

    case 'saveProfile':
      await AxiomStorage.saveProfile(message.profile);
      return { success: true };

    case 'getSettings':
      return await AxiomStorage.getSettings();

    case 'saveSettings':
      await AxiomStorage.saveSettings(message.settings);
      return { success: true };

    case 'getApiKey':
      return { apiKey: apiKey || '' };

    case 'saveApiKey':
      await AxiomStorage.saveApiKey(message.apiKey);
      return { success: true };

    case 'isOnboarded':
      return { onboarded: await AxiomStorage.isOnboarded() };

    case 'setOnboarded':
      await AxiomStorage.setOnboarded();
      return { success: true };

    case 'summarizePage': {
      const ai = new AxiomAI(apiKey);
      return await ai.summarizePage(message.content, profile);
    }

    case 'confidenceCheck': {
      const ai = new AxiomAI(apiKey);
      return await ai.confidenceCheck(message.claims, profile);
    }

    case 'suggestActions': {
      const ai = new AxiomAI(apiKey);
      return await ai.suggestActions(profile, message.context);
    }

    case 'chat': {
      const ai = new AxiomAI(apiKey);
      const reply = await ai.chat(message.message, profile, message.pageContext);
      return { reply };
    }

    case 'openSidePanel':
      if (sender.tab) {
        await chrome.sidePanel.open({ tabId: sender.tab.id });
      }
      return { success: true };

    case 'getReminders':
      return await AxiomStorage.getReminders();

    case 'addReminder': {
      const reminders = await AxiomStorage.getReminders();
      reminders.push({
        id: Date.now().toString(),
        ...message.reminder,
        createdAt: new Date().toISOString(),
      });
      await AxiomStorage.saveReminders(reminders);
      return { success: true };
    }

    case 'deleteReminder': {
      const reminders = await AxiomStorage.getReminders();
      await AxiomStorage.saveReminders(reminders.filter((r) => r.id !== message.id));
      return { success: true };
    }

    default:
      return { error: 'Unknown action' };
  }
}

// --- Alarm Handler (Reminders) ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'axiom-reminder-check') {
    const reminders = await AxiomStorage.getReminders();
    const now = new Date();
    for (const reminder of reminders) {
      if (reminder.dueDate && new Date(reminder.dueDate) <= now && !reminder.notified) {
        chrome.notifications.create(reminder.id, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'Axiom Reminder',
          message: reminder.text,
        });
        reminder.notified = true;
      }
    }
    await AxiomStorage.saveReminders(reminders);
  }
});
