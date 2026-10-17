'use strict';

// The `Project settings` screen of the post-setup menu. It shows and edits the
// three settings that the menu manages and saves them through the writer when
// the user leaves the screen. Prompts are injected so tests drive it.
const fs = require('fs');
const path = require('path');
const { readSettings, SETTINGS_FILE } = require('../sai/tools/project-settings.js');
const { checkValue, readStored, storedValue, saveSettings } = require('./project-settings-writer.js');
const { BACK } = require('./install-flow.js');

const SETTING_IDS = Object.freeze(['explore.readyToProposeLanguage', 'explore.overviewLanguage', 'backlog.provider', 'pr.provider']);
const REGISTRIES = Object.freeze([
  ['skills', 'universal', 'to-backlog', 'providers', 'registry.json'],
  ['skills', 'universal', 'from-backlog', 'providers', 'registry.json'],
]);
const PR_REGISTRY = Object.freeze(['skills', 'universal', 'to-pr', 'providers', 'registry.json']);
const OTHER_LANGUAGE = 'Other language...';
const DONE = 'Done';
const ASK = 'ask';

/** The union of the provider ids in the to-backlog and from-backlog registries. */
function providerIdsFrom(packageRoot) {
  const ids = new Set();
  for (const parts of REGISTRIES) {
    const registry = JSON.parse(fs.readFileSync(path.join(packageRoot, ...parts), 'utf8'));
    for (const entry of registry.providers) ids.add(entry.id);
  }
  return [...ids];
}

/** The provider ids in the to-pr registry, the code hosts that `pr.provider` may name. */
function prProviderIdsFrom(packageRoot) {
  const registry = JSON.parse(fs.readFileSync(path.join(packageRoot, ...PR_REGISTRY), 'utf8'));
  return registry.providers.map(entry => entry.id);
}

function valueChoices(id, providerIds, prProviderIds) {
  if (id === 'backlog.provider') return [ASK, ...providerIds];
  if (id === 'pr.provider') return [ASK, ...prProviderIds];
  return [ASK, 'English', ...(id === 'explore.overviewLanguage' ? ['none'] : []), OTHER_LANGUAGE];
}

function rowLabel(id, shown) {
  return `${id}: ${shown}`;
}

/**
 * Run the screen. Resolves to { status: 'saved'|'unchanged'|'failed'|'discarded', ... } and always
 * returns to the menu. 'discarded' (null from a prompt, an interrupt) drops the edits and saves nothing.
 */
async function runProjectSettingsScreen({
  projectPath = process.cwd(),
  packageRoot = path.join(__dirname, '..'),
  promptChoice,
  promptInput,
  log = console.log,
} = {}) {
  const providerIds = providerIdsFrom(packageRoot);
  const prProviderIds = prProviderIdsFrom(packageRoot);
  const stored = readStored(projectPath);
  if (stored.status === 'unreadable') {
    log(`Cannot edit ${SETTINGS_FILE}: ${stored.error}. Fix or remove the file and try again.`);
    return { status: 'failed', reason: 'unparseable', error: stored.error };
  }
  const root = stored.status === 'ok' ? stored.root : {};
  const { values, warnings } = readSettings({ cwd: projectPath, providerIds, prProviderIds, locate: false });
  for (const warning of warnings) log(warning);

  const changes = {};
  const displayValue = id => {
    if (Object.hasOwn(changes, id)) return changes[id];
    const raw = storedValue(root, id);
    if (raw === undefined) return ASK;
    if (Object.hasOwn(values, id)) return values[id];
    return checkValue(id, raw, providerIds, prProviderIds).ok ? ASK : `${JSON.stringify(raw)} (invalid)`;
  };

  // A free-text language: ask again until the catalogue accepts it or the user backs out.
  const askLanguage = async id => {
    for (;;) {
      const answer = await promptInput('Language name: ');
      if (answer === BACK) return BACK;
      if (answer === null || answer === undefined) return null;
      const checked = checkValue(id, String(answer), providerIds, prProviderIds);
      if (checked.ok) return checked.value;
      log(`Rejected: ${checked.problem}.`);
    }
  };

  const discard = () => {
    log('Interrupted: the edits were discarded and nothing was saved.');
    return { status: 'discarded' };
  };

  const record = (id, value) => {
    if (value === storedValue(root, id)) delete changes[id];
    else changes[id] = value;
  };

  for (;;) {
    const labels = new Map(SETTING_IDS.map(id => [rowLabel(id, displayValue(id)), id]));
    const action = await promptChoice('Project settings:', [...labels.keys(), DONE]);
    if (action === null) return discard();
    if (action === BACK || action === DONE) break;
    const id = labels.get(action);
    if (!id) return discard();
    const chosen = await promptChoice(`${id}:`, valueChoices(id, providerIds, prProviderIds));
    if (chosen === null) return discard();
    if (chosen === BACK) continue;
    if (chosen === OTHER_LANGUAGE) {
      const language = await askLanguage(id);
      if (language === null) return discard();
      if (language !== BACK) record(id, language);
      continue;
    }
    const checked = checkValue(id, chosen, providerIds, prProviderIds);
    if (!checked.ok) {
      log(`Rejected: ${checked.problem}.`);
      continue;
    }
    record(id, checked.value);
  }

  if (Object.keys(changes).length === 0) return { status: 'unchanged' };
  const saved = saveSettings(projectPath, changes, { providerIds, prProviderIds });
  if (!saved.ok) {
    log(`Project settings were not saved: ${saved.error}`);
    return { status: 'failed', reason: 'save', error: saved.error };
  }
  log(`Saved ${Object.keys(changes).length} project setting(s) to ${SETTINGS_FILE}.`);
  return { status: 'saved', changes: { ...changes } };
}

module.exports = { SETTING_IDS, OTHER_LANGUAGE, DONE, providerIdsFrom, prProviderIdsFrom, runProjectSettingsScreen };
