'use strict';

// The `Cache warming` screen of the project behavior settings. It edits the nested `warming` value of
// `.sai/settings.jsonc` one harness at a time: the screen asks for Claude Code or opencode first, then edits
// that harness's block (`warming.claude` or `warming.opencode`) with one default per role and guided rules, one
// per (provider, model) pair that the harness's installed SAI files declare. A harness without a block is
// seeded from the legacy global value, which keeps applying until that harness is edited. Saves go through the
// settings writer and write only the base file. Prompts are injected so tests drive it.
const { isDeepStrictEqual } = require('node:util');
const { CATALOGUE, SETTINGS_FILE, LOCAL_SETTINGS_FILE, WARMING_ROLES } = require('../sai/tools/project-settings.js');
const { readStored, storedValue, saveSettings } = require('./project-settings-writer.js');
const { BACK } = require('./install-flow.js');

const ID = 'warming';
const QUESTION = `${CATALOGUE[ID].label}:`;
const HARNESS_QUESTION = 'Choose a harness:';
// The harness picker of the model customization flow, reused here; the stored ids are `claude` and `opencode`.
const HARNESS_OPTIONS = Object.freeze(['OpenCode', 'Claude Code']);
const HARNESS_IDS = Object.freeze({ OpenCode: 'opencode', 'Claude Code': 'claude' });
const OFF_TEXT = CATALOGUE[ID].absent;
const DONE = 'Done';
const ENABLE = 'Enable';
const OFF = 'Off';
const REMOVE = 'Remove rule';
const DEFAULT_TIMINGS = Object.freeze({ interval: 4, max: 30 });

const isOn = entry => entry !== undefined && entry !== false && entry.enabled !== false;
const describe = entry => (isOn(entry) ? `every ${entry.interval} min, up to ${entry.max} min` : OFF_TEXT);
const timingsProblem = entry => CATALOGUE[ID].validate({ defaults: { agent: entry } });

// Ask for interval and max, each pre-filled: an empty answer keeps the value in brackets. Asks again until
// both are positive and max is at least interval. Resolves to { interval, max }, BACK, or null (interrupt).
async function askTimings({ current, promptInput, log }) {
  const start = isOn(current) ? current : DEFAULT_TIMINGS;
  for (;;) {
    const entry = {};
    for (const [key, label] of [['interval', 'Interval'], ['max', 'Maximum']]) {
      const answer = await promptInput(`${label} in minutes [${start[key]}]: `);
      if (answer === BACK) return BACK;
      if (answer === null || answer === undefined) return null;
      const text = String(answer).trim();
      entry[key] = text === '' ? start[key] : Number(text);
    }
    if (!timingsProblem(entry)) return entry;
    log('Rejected: interval and max must be positive numbers of minutes, and max at least interval.');
  }
}

// The top-level legacy value that a harness without a block still reads.
function globalBlock(value) {
  if (value === undefined) return undefined;
  const block = {};
  if (value.defaults !== undefined) block.defaults = value.defaults;
  if (value.rules !== undefined) block.rules = value.rules;
  return Object.keys(block).length ? block : undefined;
}

const harnessBlock = (value, harness) => (value && Object.hasOwn(value, harness) ? value[harness] : globalBlock(value));

/**
 * Run the screen. `pairs` is `{ claude: { agent: [{provider, model}], subagent: [...] }, opencode: {...} }`,
 * the guided pairs of the installed files per harness. Resolves to { status: 'saved'|'unchanged'|'failed'|'discarded', ... }.
 * 'discarded' (null from a prompt, an interrupt) drops the unsaved edits and saves nothing.
 */
async function runWarmingSetup({
  projectPath = process.cwd(),
  pairs = {},
  promptChoice,
  promptInput,
  log = console.log,
} = {}) {
  const first = readStored(projectPath, SETTINGS_FILE);
  if (first.status === 'unreadable') {
    log(`Cannot edit ${SETTINGS_FILE}: ${first.error}. Fix or remove the file and try again.`);
    return { status: 'failed', reason: 'unparseable', error: first.error };
  }
  const initial = first.status === 'ok' ? storedValue(first.root, ID) : undefined;
  const initialProblem = initial === undefined ? null : CATALOGUE[ID].validate(initial);
  if (initialProblem) log(`Setting ${ID} in ${SETTINGS_FILE} ${initialProblem}; this section starts from empty values.`);
  const local = readStored(projectPath, LOCAL_SETTINGS_FILE);
  if (local.status === 'ok' && storedValue(local.root, ID) !== undefined) {
    log(`${LOCAL_SETTINGS_FILE} defines ${ID}, and that value replaces the one this section writes. The section writes only ${SETTINGS_FILE}.`);
  }

  let savedAny = false;
  const discard = () => {
    log(savedAny ? 'Interrupted: the unsaved edits were discarded.' : 'Interrupted: the edits were discarded and nothing was saved.');
    return { status: 'discarded' };
  };

  // One harness visit: seed its block, edit it, and save only that block on Done or Back.
  async function editHarness(harness, harnessPairs) {
    const read = () => readStored(projectPath, SETTINGS_FILE);
    const current = read();
    if (current.status === 'unreadable') {
      log(`Cannot edit ${SETTINGS_FILE}: ${current.error}. Fix or remove the file and try again.`);
      return { status: 'failed', reason: 'unparseable', error: current.error };
    }
    const stored = current.status === 'ok' ? storedValue(current.root, ID) : undefined;
    const problem = stored === undefined ? null : CATALOGUE[ID].validate(stored);
    const original = problem ? undefined : harnessBlock(stored, harness);
    const defaults = { ...original?.defaults };
    const rules = (original?.rules ?? []).map(rule => ({ ...rule }));
    let dirty = false;

    const ruleName = rule => (rule.model === undefined ? `${rule.provider} (any model)` : `${rule.provider}/${rule.model}`);
    const ruleRow = (index, note = '') => ({
      id: `rule:${index}`, kind: 'rule', index, current: rules[index], name: ruleName(rules[index]),
      text: `${ruleName(rules[index])}: ${describe(rules[index])}${note}`,
    });

    // Role defaults, then per role the guided pairs of the chosen harness followed by the rules that match none of them.
    function buildRows() {
      const rows = [{ header: '-- Role defaults --' }];
      for (const role of WARMING_ROLES) {
        rows.push({ id: `default:${role}`, kind: 'default', role, current: defaults[role], name: `Default for ${role}`, text: `Default for ${role}: ${describe(defaults[role])}` });
      }
      for (const role of WARMING_ROLES) {
        const used = new Set();
        const section = [];
        for (const { provider, model } of harnessPairs[role] ?? []) {
          const index = rules.findIndex(rule => rule.role === role && rule.provider === provider && rule.model === model);
          if (index === -1) section.push({ id: `pair:${role}:${provider}/${model}`, kind: 'pair', role, provider, model, name: `${provider}/${model}`, text: `${provider}/${model}: no rule` });
          else { used.add(index); section.push(ruleRow(index)); }
        }
        rules.forEach((rule, index) => { if (rule.role === role && !used.has(index)) section.push(ruleRow(index, ' (no installed file uses it)')); });
        if (section.length) rows.push({ header: `-- Rules for ${role} --` }, ...section);
      }
      return rows;
    }

    function persist(exit) {
      const value = { ...(Object.keys(defaults).length ? { defaults } : {}), ...(rules.length ? { rules } : {}) };
      // An invalid stored value is replaced by any edit; a valid one is rewritten only when the edits changed it.
      const same = !problem && (original === undefined ? Object.keys(value).length === 0 : isDeepStrictEqual(value, original));
      if (!dirty || same) return { status: 'unchanged', exit };
      const base = read();
      if (base.status === 'unreadable') {
        log(`Cache warming was not saved: cannot read ${SETTINGS_FILE}: ${base.error}`);
        return { status: 'failed', reason: 'save', error: base.error };
      }
      const whole = base.status === 'ok' ? storedValue(base.root, ID) : undefined;
      const usable = whole !== undefined && !CATALOGUE[ID].validate(whole) ? whole : {};
      // Rebuild the whole value from what is stored and replace only this harness's block: the other block and
      // the legacy global keys are kept, and the global keys are never deleted automatically.
      const saved = saveSettings(projectPath, { [ID]: { ...usable, [harness]: value } }, { baseOnly: true });
      if (!saved.ok) {
        log(`Cache warming was not saved: ${saved.error}`);
        return { status: 'failed', reason: 'save', error: saved.error };
      }
      log(`Saved cache warming to ${saved.files.join(', ')}.`);
      return { status: 'saved', exit };
    }

    for (;;) {
      const rows = buildRows();
      const options = [...rows.map(row => row.header ?? row.id), DONE];
      const displayOptions = [...rows.map(row => row.header ?? row.text), DONE];
      const groupHeaders = rows.filter(row => row.header).map(row => row.header);
      const action = await promptChoice(QUESTION, options, undefined, undefined, { groupHeaders, displayOptions });
      if (action === null) return { status: 'discarded' };
      if (action === BACK || action === DONE) return persist(action === DONE);
      const row = rows.find(candidate => candidate.id === action);
      if (!row) continue;
      const chosen = await promptChoice(`${row.name}:`, row.kind === 'rule' ? [ENABLE, OFF, REMOVE] : [ENABLE, OFF]);
      if (chosen === null) return { status: 'discarded' };
      if (chosen === REMOVE) {
        rules.splice(row.index, 1);
        dirty = true;
        continue;
      }
      if (chosen !== ENABLE && chosen !== OFF) continue;
      let timings;
      if (chosen === ENABLE) {
        timings = await askTimings({ current: row.current, promptInput, log });
        if (timings === null) return { status: 'discarded' };
        if (timings === BACK) continue;
      }
      if (row.kind === 'default') {
        defaults[row.role] = timings ?? false;
      } else {
        const source = row.kind === 'rule' ? row.current : row;
        const rule = { provider: source.provider, ...(source.model === undefined ? {} : { model: source.model }), role: source.role, ...(timings ?? { enabled: false }) };
        if (row.kind === 'rule') rules[row.index] = rule;
        else rules.push(rule);
      }
      dirty = true;
    }
  }

  for (;;) {
    const choice = await promptChoice(HARNESS_QUESTION, HARNESS_OPTIONS);
    if (choice === null) return discard();
    if (choice === BACK) break;
    const harness = HARNESS_IDS[choice];
    if (!harness) continue;
    const outcome = await editHarness(harness, pairs[harness] ?? {});
    if (outcome.status === 'discarded') return discard();
    if (outcome.status === 'failed') return outcome;
    if (outcome.status === 'saved') savedAny = true;
    if (outcome.exit) break;
  }
  return savedAny ? { status: 'saved' } : { status: 'unchanged' };
}

module.exports = { runWarmingSetup, HARNESS_OPTIONS, DONE, ENABLE, OFF, REMOVE, DEFAULT_TIMINGS };
