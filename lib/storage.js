// Axiom Storage Utilities
// Wraps Chrome storage API with convenient async helpers

const STORAGE_KEYS = {
  PROFILE: 'axiom_profile',
  API_KEY: 'axiom_api_key',
  SETTINGS: 'axiom_settings',
  PAGE_CACHE: 'axiom_page_cache',
  REMINDERS: 'axiom_reminders',
  BROWSING_INSIGHTS: 'axiom_browsing_insights',
  ONBOARDED: 'axiom_onboarded',
};

async function storageGet(key) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

async function storageSet(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function storageRemove(key) {
  await chrome.storage.local.remove(key);
}

async function getProfile() {
  return (await storageGet(STORAGE_KEYS.PROFILE)) || {
    name: '',
    interests: [],
    goals: [],
    education: '',
    occupation: '',
    knowledgeLevel: 'intermediate',
    notes: '',
  };
}

async function saveProfile(profile) {
  await storageSet(STORAGE_KEYS.PROFILE, profile);
}

async function getSettings() {
  return (await storageGet(STORAGE_KEYS.SETTINGS)) || {
    autoSummarize: true,
    confidenceCheck: true,
    suggestions: true,
    reminders: true,
    simplifyLevel: 'auto',
    theme: 'light',
  };
}

async function saveSettings(settings) {
  await storageSet(STORAGE_KEYS.SETTINGS, settings);
}

async function getApiKey() {
  return await storageGet(STORAGE_KEYS.API_KEY);
}

async function saveApiKey(key) {
  await storageSet(STORAGE_KEYS.API_KEY, key);
}

async function isOnboarded() {
  return (await storageGet(STORAGE_KEYS.ONBOARDED)) === true;
}

async function setOnboarded() {
  await storageSet(STORAGE_KEYS.ONBOARDED, true);
}

async function getReminders() {
  return (await storageGet(STORAGE_KEYS.REMINDERS)) || [];
}

async function saveReminders(reminders) {
  await storageSet(STORAGE_KEYS.REMINDERS, reminders);
}

// Export for use as module or content script
if (typeof globalThis !== 'undefined') {
  globalThis.AxiomStorage = {
    STORAGE_KEYS,
    storageGet,
    storageSet,
    storageRemove,
    getProfile,
    saveProfile,
    getSettings,
    saveSettings,
    getApiKey,
    saveApiKey,
    isOnboarded,
    setOnboarded,
    getReminders,
    saveReminders,
  };
}
