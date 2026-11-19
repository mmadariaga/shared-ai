'use strict';

// The project setting screens of the post-setup menu: the `Language settings` and `Backlog and PR settings`
// submenus and the `Telemetry` row of the main menu. Every value choice is saved at once through the settings
// writer, so no edit is pending and leaving a screen saves or discards nothing. A key that the hand-created
// local settings file holds shows as an override and saves to that file. Both files are read again each time a
// screen is drawn. Prompts are injected so tests drive it.
const fs = require('fs');
const path = require('path');
const { CATALOGUE, readSettings, SETTINGS_FILE, LOCAL_SETTINGS_FILE } = require('../sai/tools/project-settings.js');
const { checkValue, readStored, storedValue, saveSettings } = require('./project-settings-writer.js');
const { BACK } = require('./install-flow.js');

const LANGUAGE_IDS = Object.freeze(['explore.readyToProposeLanguage', 'explore.overviewLanguage', 'explore.chatPublicLanguage', 'pr.language']);
const BACKLOG_PR_IDS = Object.freeze(['backlog.provider', 'pr.provider', 'publication.autoApprove']);
const TELEMETRY_ID = 'experimental.changeTelemetry';
const SETTING_IDS = Object.freeze([...LANGUAGE_IDS, ...BACKLOG_PR_IDS, TELEMETRY_ID]);
// Keys that the menu edits as a boolean: the choices are `On` and `Off`.
const BOOLEAN_IDS = Object.freeze([TELEMETRY_ID, 'publication.autoApprove']);
// The two provider settings share the catalogue label `Provider`; their submenu rows name the topic.
const ROW_LABELS = Object.freeze({ 'backlog.provider': 'Backlog provider', 'pr.provider': 'Pull requests provider' });
const REGISTRIES = Object.freeze([
  ['skills', 'universal', 'to-backlog', 'providers', 'registry.json'],
  ['skills', 'universal', 'from-backlog', 'providers', 'registry.json'],
]);
const PR_REGISTRY = Object.freeze(['skills', 'universal', 'to-pr', 'providers', 'registry.json']);
const OTHER_LANGUAGE = 'Other language...';
const ON = 'On';
const OFF = 'Off';
const ASK = 'ask';
const INTERRUPTED = Object.freeze({ status: 'interrupted' });

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

// What a key with no value reads as: `ask` unless the catalogue words it otherwise.
const absentText = id => CATALOGUE[id].absent ?? ASK;
const showValue = value => (typeof value === 'boolean' ? (value ? 'on' : 'off') : value);
const labelOf = id => ROW_LABELS[id] ?? CATALOGUE[id].label;

function valueChoices(id, providerIds, prProviderIds) {
  if (BOOLEAN_IDS.includes(id)) return [ON, OFF];
  if (id === 'backlog.provider') return [ASK, ...providerIds];
  if (id === 'pr.provider') return [ASK, ...prProviderIds];
  // `pr.language` reads `English` when absent, so its first choice and `English` are one.
  return [...new Set([absentText(id), 'English', ...(id === 'explore.overviewLanguage' ? ['none'] : []), OTHER_LANGUAGE])];
}

const colorEnabled = () => Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

// An override row: the base value struck through, then the local value and a text marker that
// stays visible when the terminal applies no styling.
function overrideText(base, local, color) {
  return color ? `\x1b[9m${base}\x1b[29m ${local} (local)` : `${base} -> ${local} (local)`;
}

/**
 * The editor of the project setting screens. `runSection({ title, ids })` shows one submenu and resolves to
 * { status: 'back'|'interrupted'|'failed' }; `editSetting(id)` runs one value picker from outside a submenu (the
 * Telemetry row) and resolves to { status: 'saved'|'unchanged'|'back'|'rejected'|'failed'|'interrupted' }.
 * 'interrupted' (null from a prompt) means the user closed the menu; nothing is pending, so nothing is lost.
 * `rowText(id)` is the `<label>: <current value>` text of a value row.
 */
function createSettingsEditor({
  projectPath = process.cwd(),
  packageRoot = path.join(__dirname, '..'),
  promptChoice,
  promptInput,
  log = console.log,
  color = colorEnabled(),
} = {}) {
  // The registries are read when a picker needs them. A package root without them only loses the provider
  // validation of the rows it draws, so drawing never fails on them; opening a picker does.
  let known;
  function providers({ required = true } = {}) {
    if (known === undefined) {
      try {
        known = { providerIds: providerIdsFrom(packageRoot), prProviderIds: prProviderIdsFrom(packageRoot) };
      } catch (error) {
        if (required) throw error;
        return {};
      }
    }
    return known;
  }

  // Both files are read afresh: every choice is saved at once, so each screen draws from what is on disk.
  function load() {
    const roots = {};
    for (const settingsFile of [SETTINGS_FILE, LOCAL_SETTINGS_FILE]) {
      const stored = readStored(projectPath, settingsFile);
      if (stored.status === 'unreadable') return { unreadable: { file: settingsFile, error: stored.error } };
      roots[settingsFile] = stored.status === 'ok' ? stored.root : {};
    }
    const baseRoot = roots[SETTINGS_FILE];
    const localRoot = roots[LOCAL_SETTINGS_FILE];
    const { providerIds, prProviderIds } = providers({ required: false });
    const { baseValues, localValues, warnings } = readSettings({ cwd: projectPath, providerIds, prProviderIds, locate: false });
    return { baseRoot, localRoot, baseValues, localValues, warnings, providerIds, prProviderIds };
  }

  function reportUnreadable({ file, error }) {
    log(`Cannot edit ${file}: ${error}. Fix or remove the file and try again.`);
    return { status: 'failed', reason: 'unparseable', error };
  }

  const shownIn = (state, root, values, id) => {
    const raw = storedValue(root, id);
    if (raw === undefined) return absentText(id);
    if (Object.hasOwn(values, id)) return showValue(values[id]);
    return checkValue(id, raw, state.providerIds, state.prProviderIds).ok ? absentText(id) : `${JSON.stringify(raw)} (invalid)`;
  };

  function rowText(id, state = load()) {
    if (state.unreadable) return `${labelOf(id)}: ${absentText(id)}`;
    const base = shownIn(state, state.baseRoot, state.baseValues, id);
    const shown = storedValue(state.localRoot, id) === undefined
      ? base
      : overrideText(base, shownIn(state, state.localRoot, state.localValues, id), color);
    return `${labelOf(id)}: ${shown}`;
  }

  // A free-text language: ask again until the catalogue accepts it. An empty answer, like Back, saves nothing.
  const askLanguage = async id => {
    for (;;) {
      const answer = await promptInput('Language name: ');
      if (answer === BACK) return BACK;
      if (answer === null || answer === undefined) return null;
      if (String(answer).trim() === '') return BACK;
      const checked = checkValue(id, String(answer));
      if (checked.ok) return checked.value;
      log(`Rejected: ${checked.problem}.`);
    }
  };

  // One value picker and, for a chosen value, one write: the value is on disk before the picker closes.
  async function edit(id, state) {
    const isLocal = storedValue(state.localRoot, id) !== undefined;
    const { providerIds, prProviderIds } = providers();
    const choice = await promptChoice(`${labelOf(id)}:`, valueChoices(id, providerIds, prProviderIds));
    if (choice === null) return INTERRUPTED;
    if (choice === BACK) return { status: 'back' };
    let value;
    if (choice === OTHER_LANGUAGE) {
      value = await askLanguage(id);
      if (value === null) return INTERRUPTED;
      if (value === BACK) return { status: 'back' };
    } else {
      // `On` saves true; `Off` removes the key, except in the local file, where it saves false so a shared true cannot apply.
      const chosen = BOOLEAN_IDS.includes(id) ? (choice === ON ? true : isLocal ? false : undefined) : choice;
      if (chosen === undefined || (CATALOGUE[id].absent && chosen === CATALOGUE[id].absent)) {
        value = undefined;
      } else {
        const checked = checkValue(id, chosen, providerIds, prProviderIds);
        if (!checked.ok) {
          log(`Rejected: ${checked.problem}.`);
          return { status: 'rejected' };
        }
        value = checked.value;
      }
    }
    if (value === storedValue(isLocal ? state.localRoot : state.baseRoot, id)) return { status: 'unchanged' };
    const saved = saveSettings(projectPath, { [id]: value }, { providerIds, prProviderIds });
    if (!saved.ok) {
      log(`Project settings were not saved: ${saved.error}`);
      return { status: 'failed', reason: 'save', error: saved.error };
    }
    return { status: 'saved' };
  }

  const warn = (state, ids) => {
    for (const warning of state.warnings) if (ids.some(id => warning.includes(id))) log(warning);
  };

  async function editSetting(id) {
    const state = load();
    if (state.unreadable) return reportUnreadable(state.unreadable);
    warn(state, [id]);
    return edit(id, state);
  }

  async function runSection({ title, ids }) {
    let state = load();
    if (state.unreadable) return reportUnreadable(state.unreadable);
    warn(state, ids);
    let last;
    for (;;) {
      // Option values are the setting ids, which are unique; the visible text travels beside them, because
      // two rows may show the same value.
      const action = await promptChoice(title, [...ids], undefined, undefined, { displayOptions: ids.map(id => rowText(id, state)), initial: last });
      if (action === null) return INTERRUPTED;
      if (action === BACK) return { status: 'back' };
      const id = ids.find(candidate => candidate === action);
      if (!id) return INTERRUPTED;
      const outcome = await edit(id, state);
      if (outcome.status === 'interrupted') return outcome;
      last = id;
      state = load();
      if (state.unreadable) return reportUnreadable(state.unreadable);
    }
  }

  return { rowText, editSetting, runSection };
}

module.exports = { SETTING_IDS, LANGUAGE_IDS, BACKLOG_PR_IDS, TELEMETRY_ID, OTHER_LANGUAGE, providerIdsFrom, prProviderIdsFrom, createSettingsEditor };
