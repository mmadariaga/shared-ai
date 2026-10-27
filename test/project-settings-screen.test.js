'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const writer = require('../bin/project-settings-writer');
const screen = require('../bin/project-settings-screen');
const warmingSetup = require('../bin/warming-setup');
const modelCustomization = require('../bin/model-customization');
const { CATALOGUE } = require('../sai/tools/project-settings');
const { BACK } = require('../bin/install-flow');

const providerIds = ['github', 'gitlab', 'azuredevops'];
const FILE = path.join('.sai', 'settings.jsonc');
const COMMENTED = `// project note
{
  /* block */
  "other": { "x": 1 }, // foreign key
  "backlog": {
    // provider note
    "provider": "gitlab", // kept
    "repository": "a/b",
  },
}
`;

function project(text) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-screen-'));
  if (text !== undefined) {
    fs.mkdirSync(path.join(directory, '.sai'));
    fs.writeFileSync(path.join(directory, FILE), text);
  }
  return directory;
}

const read = directory => fs.readFileSync(path.join(directory, FILE), 'utf8');

// Scripted prompts: each answer is consumed in order; a function answer receives the question and options.
function script(answers, seen = []) {
  return async (question, options, _input, _footer, navigator) => {
    seen.push({ question, options, navigator });
    const answer = answers.shift();
    return typeof answer === 'function' ? answer(question, options) : answer;
  };
}

// Option values are setting ids and section headers; the visible rows travel as display options.
const rowFor = (options, id) => options.find(option => option === id);
const texts = call => call.options.map((option, index) => call.navigator?.displayOptions?.[index] ?? option);
const SCREEN_QUESTION = 'Project behavior settings:';
const pick = id => (_question, options) => rowFor(options, id);

function run(directory, choices, inputs = [], log = () => {}) {
  return screen.runProjectSettingsScreen({
    projectPath: directory,
    promptChoice: script(choices),
    promptInput: script(inputs),
    log,
  });
}

test('writer: editing a value keeps comments, foreign keys and every other byte', () => {
  const directory = project(COMMENTED);
  const result = writer.saveSettings(directory, { 'backlog.provider': 'github' }, { providerIds });
  assert.equal(result.ok, true);
  assert.equal(read(directory), COMMENTED.replace('"gitlab"', '"github"'));
});

test('writer: a new key is added in place and ask is written as the string "ask"', () => {
  const directory = project(COMMENTED);
  const result = writer.saveSettings(directory, { 'backlog.provider': 'ask', 'explore.overviewLanguage': 'none', 'explore.readyToProposeLanguage': 'english' }, { providerIds });
  assert.equal(result.ok, true);
  const text = read(directory);
  assert.ok(text.startsWith(COMMENTED.slice(0, COMMENTED.indexOf('"gitlab"'))));
  assert.match(text, /"provider": "ask", \/\/ kept/);
  assert.match(text, /\/\/ provider note/);
  assert.match(text, /\/\/ foreign key/);
  assert.deepEqual(writer.parseText(text).root.explore, { overviewLanguage: 'None', readyToProposeLanguage: 'English' });
});

test('writer: the first save creates .sai and the settings file', () => {
  const directory = project();
  assert.equal(fs.existsSync(path.join(directory, '.sai')), false);
  const result = writer.saveSettings(directory, { 'backlog.provider': 'gitlab' }, { providerIds });
  assert.equal(result.ok, true);
  assert.deepEqual(writer.parseText(read(directory)).root, { backlog: { provider: 'gitlab' } });
});

test('writer: an empty change set writes nothing', () => {
  const directory = project();
  assert.deepEqual(writer.saveSettings(directory, {}, { providerIds }), { ok: true, changed: false });
  assert.equal(fs.existsSync(path.join(directory, '.sai')), false);
});

test('writer: an unparseable file is refused and left byte-identical', () => {
  const directory = project('{ "backlog": ');
  const result = writer.saveSettings(directory, { 'backlog.provider': 'gitlab' }, { providerIds });
  assert.equal(result.ok, false);
  assert.match(result.error, /cannot be edited/);
  assert.equal(read(directory), '{ "backlog": ');
});

test('writer: a non-object root or a key that blocks the path is refused', () => {
  const array = project('[1]');
  assert.equal(writer.saveSettings(array, { 'backlog.provider': 'gitlab' }, { providerIds }).ok, false);
  assert.equal(read(array), '[1]');
  const blocked = project('{"backlog": "gitlab"}');
  assert.equal(writer.saveSettings(blocked, { 'backlog.provider': 'gitlab' }, { providerIds }).ok, false);
  assert.equal(read(blocked), '{"backlog": "gitlab"}');
});

test('writer: values are validated through the catalogue before writing', () => {
  const directory = project(COMMENTED);
  assert.equal(writer.saveSettings(directory, { 'backlog.provider': 'jira' }, { providerIds }).ok, false);
  assert.equal(writer.saveSettings(directory, { 'explore.readyToProposeLanguage': 'none' }, { providerIds }).ok, false);
  assert.equal(writer.saveSettings(directory, { 'backlog.repository': 'a/b' }, { providerIds }).ok, true);
  assert.equal(writer.saveSettings(directory, { 'backlog.type': 'bug' }, { providerIds }).ok, false);
});

test('writer: a write error leaves the file byte-identical', t => {
  const directory = project(COMMENTED);
  t.mock.method(fs, 'renameSync', () => { throw new Error('disk full'); });
  const result = writer.saveSettings(directory, { 'backlog.provider': 'github' }, { providerIds });
  assert.equal(result.ok, false);
  assert.match(result.error, /disk full/);
  t.mock.restoreAll();
  assert.equal(read(directory), COMMENTED);
  assert.deepEqual(fs.readdirSync(path.join(directory, '.sai')), ['settings.jsonc']);
});

test('writer: CRLF files keep CRLF in inserted text', () => {
  const directory = project('{\r\n  "backlog": {\r\n    "provider": "gitlab"\r\n  }\r\n}\r\n');
  assert.equal(writer.saveSettings(directory, { 'explore.overviewLanguage': 'English' }, { providerIds }).ok, true);
  assert.equal(read(directory).replace(/\r\n/g, '').includes('\n'), false);
});

test('E15 and E12: the screen lists labelled rows under section headers, only its own keys', async () => {
  const directory = project(COMMENTED);
  const seen = [];
  const result = await screen.runProjectSettingsScreen({
    projectPath: directory, promptChoice: script([DONE_ROW], seen), promptInput: script([]), log: () => {},
  });
  assert.equal(result.status, 'unchanged');
  assert.equal(seen[0].question, SCREEN_QUESTION);
  assert.deepEqual(texts(seen[0]), [
    '-- Explore --',
    'Ready to Propose language: ask',
    'Change overview language: ask',
    'Chat language: follow my language',
    '-- Backlog --',
    'Provider: gitlab',
    '-- Pull requests --',
    'Provider: ask',
    'Done',
  ]);
  assert.deepEqual(seen[0].navigator.groupHeaders, ['-- Explore --', '-- Backlog --', '-- Pull requests --']);
});

function DONE_ROW() { return 'Done'; }

test('E16: provider choices are ask plus the registry ids; language choices differ by id', async () => {
  const directory = project();
  const seen = [];
  await screen.runProjectSettingsScreen({
    projectPath: directory,
    promptChoice: script([pick('backlog.provider'), BACK, pick('explore.overviewLanguage'), BACK, pick('explore.readyToProposeLanguage'), BACK, pick('explore.chatPublicLanguage'), BACK, DONE_ROW], seen),
    promptInput: script([]), log: () => {},
  });
  const choices = seen.filter(call => call.question !== SCREEN_QUESTION).map(call => call.options);
  assert.deepEqual(choices[0], ['ask', 'github', 'gitlab', 'azuredevops']);
  assert.deepEqual(choices[1], ['ask', 'English', 'none', screen.OTHER_LANGUAGE]);
  assert.deepEqual(choices[2], ['ask', 'English', screen.OTHER_LANGUAGE]);
  assert.deepEqual(choices[3], ['follow my language', 'English', screen.OTHER_LANGUAGE]);
  assert.deepEqual(seen.filter(call => call.question !== SCREEN_QUESTION).map(call => call.question), ['Provider:', 'Change overview language:', 'Ready to Propose language:', 'Chat language:']);
});

test('E16: a rejected free-text language is asked again and an accepted one is saved in canonical form', async () => {
  const directory = project();
  const messages = [];
  const result = await run(
    directory,
    [pick('explore.readyToProposeLanguage'), screen.OTHER_LANGUAGE, DONE_ROW],
    ['   ', 'none', ' english '],
    message => messages.push(message),
  );
  assert.equal(result.status, 'saved');
  assert.equal(messages.filter(message => message.startsWith('Rejected')).length, 2);
  assert.deepEqual(writer.parseText(read(directory)).root, { explore: { readyToProposeLanguage: 'English' } });
});

test('E16: a free-text language keeps its own spelling and the overview accepts none', async () => {
  const directory = project();
  const result = await run(
    directory,
    [pick('explore.readyToProposeLanguage'), screen.OTHER_LANGUAGE, pick('explore.overviewLanguage'), 'none', DONE_ROW],
    [' Español '],
  );
  assert.equal(result.status, 'saved');
  assert.deepEqual(writer.parseText(read(directory)).root, { explore: { readyToProposeLanguage: 'Español', overviewLanguage: 'None' } });
});

test('E17: choosing ask writes the string "ask" for an unset id and keeps the key comment for a set one', async () => {
  const directory = project(COMMENTED);
  const result = await run(directory, [pick('backlog.provider'), 'ask', DONE_ROW]);
  assert.equal(result.status, 'saved');
  assert.equal(read(directory), COMMENTED.replace('"gitlab"', '"ask"'));
  const fresh = project();
  await run(fresh, [pick('explore.overviewLanguage'), 'ask', DONE_ROW]);
  assert.deepEqual(writer.parseText(read(fresh)).root, { explore: { overviewLanguage: 'ask' } });
});

test('E18: leaving the screen saves; a session without a change leaves the filesystem untouched', async () => {
  const none = project();
  const result = await run(none, [DONE_ROW]);
  assert.equal(result.status, 'unchanged');
  assert.equal(fs.existsSync(path.join(none, '.sai')), false);
  const same = project(COMMENTED);
  const before = fs.statSync(path.join(same, FILE)).mtimeMs;
  assert.equal((await run(same, [pick('backlog.provider'), 'gitlab', DONE_ROW])).status, 'unchanged');
  assert.equal(read(same), COMMENTED);
  assert.equal(fs.statSync(path.join(same, FILE)).mtimeMs, before);
  const viaBack = project();
  assert.equal((await run(viaBack, [pick('backlog.provider'), 'github', BACK])).status, 'saved');
  assert.deepEqual(writer.parseText(read(viaBack)).root, { backlog: { provider: 'github' } });
});

test('E19: an invalid stored value shows with the reader warning and can be replaced', async () => {
  const directory = project('{\n  "backlog": { "provider": "jira" }\n}\n');
  const seen = [];
  const messages = [];
  const result = await screen.runProjectSettingsScreen({
    projectPath: directory,
    promptChoice: script([pick('backlog.provider'), 'github', DONE_ROW], seen),
    promptInput: script([]),
    log: message => messages.push(message),
  });
  assert.match(messages[0], /Setting backlog\.provider in \.sai\/settings\.jsonc must be one of/);
  assert.ok(texts(seen[0]).includes('Provider: "jira" (invalid)'));
  assert.equal(result.status, 'saved');
  assert.equal(read(directory), '{\n  "backlog": { "provider": "github" }\n}\n');
});

test('E20: an unparseable file is reported when the screen opens, before any edit', async () => {
  const directory = project('{ nope');
  const messages = [];
  const seen = [];
  const result = await screen.runProjectSettingsScreen({
    projectPath: directory, promptChoice: script([], seen), promptInput: script([]), log: message => messages.push(message),
  });
  assert.equal(result.status, 'failed');
  assert.match(messages[0], /Cannot edit \.sai\/settings\.jsonc/);
  assert.equal(seen.length, 0);
  assert.equal(read(directory), '{ nope');
});

test('E20: a write error is reported, leaves the file byte-identical and returns to the menu', async t => {
  const directory = project(COMMENTED);
  t.mock.method(fs, 'renameSync', () => { throw new Error('read-only'); });
  const messages = [];
  const result = await run(directory, [pick('backlog.provider'), 'github', DONE_ROW], [], message => messages.push(message));
  t.mock.restoreAll();
  assert.equal(result.status, 'failed');
  assert.match(messages.join('\n'), /not saved: .*read-only/);
  assert.equal(read(directory), COMMENTED);
});

test('E20: an interrupt discards the edits, reports it, and leaves the file byte-identical', async () => {
  const directory = project(COMMENTED);
  const messages = [];
  const result = await run(directory, [pick('backlog.provider'), 'github', pick('explore.overviewLanguage'), null], [], message => messages.push(message));
  assert.equal(result.status, 'discarded');
  assert.deepEqual(messages.filter(message => message.startsWith('Interrupted')), ['Interrupted: the edits were discarded and nothing was saved.']);
  assert.equal(read(directory), COMMENTED);
});

test('E20: after an interrupt in the screen the post-setup menu loop continues', async () => {
  const directory = project(COMMENTED);
  const seen = [];
  const answers = ['Project behavior settings', (_q, options) => rowFor(options, 'backlog.provider'), 'github', null, 'Exit'];
  const outcome = await modelCustomization.runPostSetupMenu({
    projectPath: directory, isTTY: true, promptChoice: script(answers, seen), promptInput: async () => { throw new Error('unexpected input'); },
  });
  assert.equal(outcome.reason, 'cancelled');
  assert.equal(answers.length, 0, 'the Exit answer after the interrupt was consumed by the menu');
  assert.equal(seen.filter(call => call.question === 'Post-setup customization:').length, 2);
  assert.equal(read(directory), COMMENTED);
});

test('E21 and menu: the post-setup menu offers Project behavior settings, runs the screen, and skips without a TTY', async () => {
  const directory = project();
  const skipped = await modelCustomization.runPostSetupMenu({ projectPath: directory, isTTY: false, promptChoice: async () => { throw new Error('must not prompt'); } });
  assert.equal(skipped.reason, 'non-tty');
  assert.equal(fs.existsSync(path.join(directory, '.sai')), false);
  const seen = [];
  const answers = ['Project behavior settings', (_q, options) => rowFor(options, 'backlog.provider'), 'gitlab', 'Done', 'Exit'];
  const outcome = await modelCustomization.runPostSetupMenu({
    projectPath: directory, isTTY: true, promptChoice: script(answers, seen), promptInput: async () => { throw new Error('unexpected input'); },
  });
  assert.equal(outcome.reason, 'cancelled');
  assert.ok(seen[0].options.includes('Project behavior settings'));
  assert.equal(seen[0].options.includes('Project settings'), false);
  assert.deepEqual(writer.parseText(read(directory)).root, { backlog: { provider: 'gitlab' } });
});

test('provider ids are the union of the to-backlog and from-backlog registries', () => {
  assert.deepEqual(screen.providerIdsFrom(path.join(__dirname, '..')).sort(), ['azuredevops', 'github', 'gitlab']);
});

const LOCAL_FILE = path.join('.sai', 'settings.local.jsonc');
const LOCAL_TEXT = '// mine\n{\n  "backlog": {\n    // keep\n    "provider": "github", // mine\n  },\n}\n';
const readLocal = directory => fs.readFileSync(path.join(directory, LOCAL_FILE), 'utf8');

function projectWithLocal(base, local) {
  const directory = project(base);
  fs.mkdirSync(path.join(directory, '.sai'), { recursive: true });
  fs.writeFileSync(path.join(directory, LOCAL_FILE), local);
  return directory;
}

test('I4 and E8: the writer saves a key that the local file holds there and every other key to the base file', () => {
  const directory = projectWithLocal(COMMENTED, LOCAL_TEXT);
  const result = writer.saveSettings(directory, { 'backlog.provider': 'azuredevops', 'explore.overviewLanguage': 'English' }, { providerIds });
  assert.deepEqual(result, { ok: true, changed: true, files: ['.sai/settings.jsonc', '.sai/settings.local.jsonc'] });
  assert.equal(readLocal(directory), LOCAL_TEXT.replace('"github"', '"azuredevops"'));
  assert.equal(read(directory), COMMENTED.replace(/\n\}\n$/, '\n  "explore": {\n    "overviewLanguage": "English"\n  },\n}\n'));
});

test('I4: a local-only change leaves the base file untouched and an unheld key never creates the local file', () => {
  const directory = projectWithLocal(COMMENTED, LOCAL_TEXT);
  const before = read(directory);
  assert.equal(writer.saveSettings(directory, { 'backlog.provider': 'gitlab' }, { providerIds }).ok, true);
  assert.equal(read(directory), before);
  const fresh = project(COMMENTED);
  assert.equal(writer.saveSettings(fresh, { 'backlog.provider': 'github' }, { providerIds }).ok, true);
  assert.equal(fs.existsSync(path.join(fresh, LOCAL_FILE)), false);
  const none = project();
  assert.equal(writer.saveSettings(none, { 'explore.chatPublicLanguage': 'Euskara' }, { providerIds }).ok, true);
  assert.deepEqual(fs.readdirSync(path.join(none, '.sai')), ['settings.jsonc']);
});

test('I4: an undefined value removes the key in place and an unparseable local file refuses the whole save', () => {
  const directory = project('// top\n{\n  "explore": {\n    "chatPublicLanguage": "Euskara",\n    "overviewLanguage": "English" // tail\n  }\n}\n');
  assert.equal(writer.saveSettings(directory, { 'explore.chatPublicLanguage': undefined }, { providerIds }).ok, true);
  assert.equal(read(directory), '// top\n{\n  "explore": {\n    "overviewLanguage": "English" // tail\n  }\n}\n');
  const broken = projectWithLocal(COMMENTED, '{ nope');
  const result = writer.saveSettings(broken, { 'explore.overviewLanguage': 'English' }, { providerIds });
  assert.equal(result.ok, false);
  assert.match(result.error, /settings\.local\.jsonc cannot be edited/);
  assert.equal(read(broken), COMMENTED);
});

test('I5 and E6: an override row shows the base value struck through, the local value and (local)', async () => {
  const directory = projectWithLocal('{"backlog":{"provider":"gitlab"}}', '{"backlog":{"provider":"github"},"explore":{"chatPublicLanguage":"Euskara"}}');
  const seen = [];
  await screen.runProjectSettingsScreen({ projectPath: directory, promptChoice: script([DONE_ROW], seen), promptInput: script([]), log: () => {}, color: true });
  assert.ok(texts(seen[0]).includes('Provider: \x1b[9mgitlab\x1b[29m github (local)'));
  assert.ok(texts(seen[0]).includes('Chat language: \x1b[9mfollow my language\x1b[29m Euskara (local)'));
  assert.ok(texts(seen[0]).includes('Provider: ask'));
});

test('E9: without styling an override row keeps the base text, the local text and the (local) marker', async () => {
  const directory = projectWithLocal('{"backlog":{"provider":"gitlab"}}', '{"backlog":{"provider":"gitlab"}}');
  const seen = [];
  await screen.runProjectSettingsScreen({ projectPath: directory, promptChoice: script([DONE_ROW], seen), promptInput: script([]), log: () => {}, color: false });
  assert.ok(texts(seen[0]).includes('Provider: gitlab -> gitlab (local)'));
  assert.equal(texts(seen[0]).some(row => row.includes('\x1b')), false);
});

test('E1: without a local file no row shows an override', async () => {
  const directory = project(COMMENTED);
  const seen = [];
  await screen.runProjectSettingsScreen({ projectPath: directory, promptChoice: script([DONE_ROW], seen), promptInput: script([]), log: () => {}, color: true });
  assert.equal(texts(seen[0]).some(row => row.includes('(local)') || row.includes('\x1b')), false);
});

test('E8: the screen saves an overridden key to the local file, other keys to the base file, and never creates the local file', async () => {
  const directory = projectWithLocal(COMMENTED, LOCAL_TEXT);
  const messages = [];
  const result = await run(directory, [pick('backlog.provider'), 'gitlab', pick('explore.chatPublicLanguage'), screen.OTHER_LANGUAGE, DONE_ROW], [' Euskara '], message => messages.push(message));
  assert.equal(result.status, 'saved');
  assert.equal(readLocal(directory), LOCAL_TEXT.replace('"github"', '"gitlab"'));
  assert.deepEqual(writer.parseText(read(directory)).root.explore, { chatPublicLanguage: 'Euskara' });
  assert.equal(writer.parseText(read(directory)).root.backlog.provider, 'gitlab');
  assert.match(messages.join('\n'), /Saved 2 project setting\(s\) to \.sai\/settings\.jsonc, \.sai\/settings\.local\.jsonc\./);
  const base = project(COMMENTED);
  await run(base, [pick('explore.chatPublicLanguage'), 'English', DONE_ROW]);
  assert.equal(fs.existsSync(path.join(base, LOCAL_FILE)), false);
});

test('E8: an override that is chosen back to the stored local value changes nothing and the base file stays unchanged', async () => {
  const directory = projectWithLocal(COMMENTED, LOCAL_TEXT);
  const result = await run(directory, [pick('backlog.provider'), 'github', DONE_ROW]);
  assert.equal(result.status, 'unchanged');
  assert.equal(read(directory), COMMENTED);
  assert.equal(readLocal(directory), LOCAL_TEXT);
});

test('I6: follow my language removes the chat language key and leaves the file otherwise intact', async () => {
  const text = '{\n  "explore": {\n    "chatPublicLanguage": "Euskara", // pick\n    "overviewLanguage": "English"\n  }\n}\n';
  const directory = project(text);
  const seen = [];
  const result = await screen.runProjectSettingsScreen({
    projectPath: directory, promptChoice: script([pick('explore.chatPublicLanguage'), 'follow my language', DONE_ROW], seen), promptInput: script([]), log: () => {},
  });
  assert.equal(result.status, 'saved');
  assert.ok(texts(seen[0]).includes('Chat language: Euskara'));
  assert.ok(texts(seen[2]).includes('Chat language: follow my language'));
  assert.equal(read(directory), '{\n  "explore": {\n    "overviewLanguage": "English"\n  }\n}\n');
  const absent = project(text.replace('"chatPublicLanguage": "Euskara", // pick\n    ', ''));
  assert.equal((await run(absent, [pick('explore.chatPublicLanguage'), 'follow my language', DONE_ROW])).status, 'unchanged');
});

test('I6: a rejected chat language none is asked again; removing a local override lets the base value show', async () => {
  const none = project();
  const messages = [];
  await run(none, [pick('explore.chatPublicLanguage'), screen.OTHER_LANGUAGE, DONE_ROW], ['none', 'Deutsch'], message => messages.push(message));
  assert.equal(messages.filter(message => message.startsWith('Rejected')).length, 1);
  assert.deepEqual(writer.parseText(read(none)).root, { explore: { chatPublicLanguage: 'Deutsch' } });
  const directory = projectWithLocal('{"explore":{"chatPublicLanguage":"Euskara"}}', '{"explore":{"chatPublicLanguage":"Deutsch"}}');
  const seen = [];
  await screen.runProjectSettingsScreen({
    projectPath: directory, promptChoice: script([pick('explore.chatPublicLanguage'), 'follow my language', DONE_ROW], seen), promptInput: script([]), log: () => {}, color: false,
  });
  assert.ok(texts(seen[0]).includes('Chat language: Euskara -> Deutsch (local)'));
  assert.ok(texts(seen[2]).includes('Chat language: Euskara'));
  assert.deepEqual(writer.parseText(readLocal(directory)).root, { explore: {} });
  assert.equal(writer.parseText(read(directory)).root.explore.chatPublicLanguage, 'Euskara');
});

test('I1: section headers are passed as non-selectable rows and an unparseable local file is reported before any edit', async () => {
  const directory = project();
  const seen = [];
  const result = await screen.runProjectSettingsScreen({
    projectPath: directory, promptChoice: script([DONE_ROW], seen), promptInput: script([]), log: () => {},
  });
  assert.equal(result.status, 'unchanged');
  const { groupHeaders, displayOptions } = seen[0].navigator;
  assert.deepEqual(groupHeaders.map(header => seen[0].options.indexOf(header)), [0, 4, 6]);
  assert.equal(displayOptions.length, seen[0].options.length);
  assert.equal(groupHeaders.some(header => screen.SETTING_IDS.includes(header)), false);
  const broken = projectWithLocal(COMMENTED, '{ nope');
  const messages = [];
  const failed = await screen.runProjectSettingsScreen({
    projectPath: broken, promptChoice: script([]), promptInput: script([]), log: message => messages.push(message),
  });
  assert.equal(failed.status, 'failed');
  assert.match(messages[0], /Cannot edit \.sai\/settings\.local\.jsonc/);
  assert.equal(readLocal(broken), '{ nope');
});

test('E12: the screen lists exactly its five keys, none of the repository, project or organization keys', () => {
  assert.deepEqual([...screen.SETTING_IDS], ['explore.readyToProposeLanguage', 'explore.overviewLanguage', 'explore.chatPublicLanguage', 'backlog.provider', 'pr.provider']);
  assert.deepEqual([...modelCustomization.MENU_OPTIONS], ['Customize models', 'Reset to default models', 'Save preset', 'Load preset', 'Project behavior settings', 'Cache warming', 'Exit']);
});

// The `Cache warming` section: role defaults and guided rules for the nested `warming` value (E1-E8).
const WARMING_QUESTION = 'Cache warming:';
const PAIRS = {
  agent: [{ provider: 'anthropic', model: 'opus' }],
  subagent: [{ provider: 'anthropic', model: 'haiku' }, { provider: 'opencode-go', model: 'deepseek-v4.1-flash' }],
};
const WARMING_TEXT = `// project note
{
  "other": 1, // foreign key
  "warming": {
    "defaults": { "agent": false },
    "rules": [
      { "provider": "anthropic", "model": "claude-opus-5-5", "role": "agent", "interval": 2, "max": 10 },
      { "provider": "anthropic", "role": "subagent", "enabled": false }
    ]
  }
}
`;

function runWarming(directory, choices, inputs = [], { pairs = PAIRS, log = () => {}, seen = [] } = {}) {
  return warmingSetup.runWarmingSetup({
    projectPath: directory, pairs, promptChoice: script(choices, seen), promptInput: script(inputs), log,
  });
}

const warmingOf = directory => writer.parseText(read(directory)).root.warming;

test('E1/E4: the section enables a default with the pre-filled timings and creates the file; the other role stays off', async () => {
  const directory = project();
  const seen = [];
  const prompts = [];
  const result = await warmingSetup.runWarmingSetup({
    projectPath: directory, pairs: PAIRS, promptChoice: script(['default:agent', 'Enable', 'Done'], seen),
    promptInput: async question => { prompts.push(question); return ''; }, log: () => {},
  });
  assert.equal(result.status, 'saved');
  assert.deepEqual(prompts, ['Interval in minutes [4]: ', 'Maximum in minutes [30]: ']);
  assert.deepEqual(warmingOf(directory), { defaults: { agent: { interval: 4, max: 30 } } });
  assert.deepEqual(texts(seen[0]).slice(0, 3), ['-- Role defaults --', 'Default for agent: off', 'Default for subagent: off']);
  assert.deepEqual(seen[0].navigator.groupHeaders, ['-- Role defaults --', '-- Rules for agent --', '-- Rules for subagent --']);
});

test('E2/E4: guided pairs are listed per role, a rule pre-fills its value, and an invalid entry is asked again', async () => {
  const directory = project();
  const seen = [];
  const messages = [];
  const result = await runWarming(directory, ['pair:agent:anthropic/opus', 'Enable', 'pair:subagent:opencode-go/deepseek-v4.1-flash', 'Off', 'Done'], ['0', '5', '3', '1', '7', '20'], { seen, log: message => messages.push(message) });
  assert.equal(result.status, 'saved');
  assert.deepEqual(texts(seen[0]).filter(text => text.includes('/')), ['anthropic/opus: no rule', 'anthropic/haiku: no rule', 'opencode-go/deepseek-v4.1-flash: no rule']);
  assert.equal(messages.filter(message => message.startsWith('Rejected:')).length, 2);
  assert.deepEqual(warmingOf(directory), {
    rules: [
      { provider: 'anthropic', model: 'opus', role: 'agent', interval: 7, max: 20 },
      { provider: 'opencode-go', model: 'deepseek-v4.1-flash', role: 'subagent', enabled: false },
    ],
  });
  const again = [];
  await runWarming(directory, ['rule:0', null], [], { seen: again });
  assert.equal(again[1].question, 'anthropic/opus:');
  assert.deepEqual(again[1].options, ['Enable', 'Off', 'Remove rule']);
  assert.ok(texts(again[0]).includes('anthropic/opus: every 7 min, up to 20 min'));
  const prefilled = [];
  await warmingSetup.runWarmingSetup({ projectPath: directory, pairs: PAIRS, promptChoice: script(['rule:0', 'Enable', null]), promptInput: async question => { prefilled.push(question); return null; }, log: () => {} });
  assert.deepEqual(prefilled, ['Interval in minutes [7]: ']);
});

test('E1: reopening the section after a save and leaving keeps the file byte-identical', async () => {
  const directory = project();
  await runWarming(directory, ['default:subagent', 'Enable', 'Done'], ['3', '12']);
  const saved = read(directory);
  const seen = [];
  const result = await runWarming(directory, ['Done'], [], { seen });
  assert.equal(result.status, 'unchanged');
  assert.equal(read(directory), saved);
  assert.ok(texts(seen[0]).includes('Default for subagent: every 3 min, up to 12 min'));
});

test('E5: a default switches to off, a rule switches to enabled: false, and a rule is removed', async () => {
  const directory = project(WARMING_TEXT);
  const result = await runWarming(directory, ['default:agent', 'Enable', 'default:agent', 'Off', 'rule:0', 'Off', 'rule:1', 'Remove rule', 'Done'], ['4', '30']);
  assert.equal(result.status, 'saved');
  assert.deepEqual(warmingOf(directory), {
    defaults: { agent: false },
    rules: [{ provider: 'anthropic', model: 'claude-opus-5-5', role: 'agent', enabled: false }],
  });
  assert.match(read(directory), /\/\/ project note/);
  assert.match(read(directory), /"other": 1, \/\/ foreign key/);
});

test('E6: rules that match no installed pair are listed, editable, and kept by a save', async () => {
  const directory = project(WARMING_TEXT);
  const seen = [];
  const result = await runWarming(directory, ['default:subagent', 'Enable', 'Done'], ['', ''], { seen });
  assert.equal(result.status, 'saved');
  const rows = texts(seen[0]);
  assert.ok(rows.includes('anthropic/claude-opus-5-5: every 2 min, up to 10 min (no installed file uses it)'));
  assert.ok(rows.includes('anthropic (any model): off (no installed file uses it)'));
  assert.deepEqual(warmingOf(directory).rules, writer.parseText(WARMING_TEXT).root.warming.rules);
  assert.deepEqual(warmingOf(directory).defaults, { agent: false, subagent: { interval: 4, max: 30 } });
});

test('E7: an invalid warming value shows the warning and starts empty; leaving unchanged keeps the file, saving replaces it', async () => {
  const text = '{\n  "warming": { "defaults": { "agent": { "interval": 9, "max": 2 } } }\n}\n';
  const directory = project(text);
  const messages = [];
  const seen = [];
  const left = await runWarming(directory, ['Done'], [], { seen, log: message => messages.push(message) });
  assert.equal(left.status, 'unchanged');
  assert.equal(read(directory), text);
  assert.match(messages[0], /^Setting warming in \.sai\/settings\.jsonc defaults\.agent needs max to be at least interval/);
  assert.ok(texts(seen[0]).includes('Default for agent: off'));
  const replaced = await runWarming(directory, ['default:agent', 'Enable', 'Done'], ['5', '15']);
  assert.equal(replaced.status, 'saved');
  assert.deepEqual(warmingOf(directory), { defaults: { agent: { interval: 5, max: 15 } } });
});

test('E8: a local warming value is warned about, and only the base file is written', async () => {
  const local = '{ "warming": { "defaults": { "agent": false, "subagent": false } } }\n';
  const directory = projectWithLocal(WARMING_TEXT, local);
  const messages = [];
  const result = await runWarming(directory, ['default:subagent', 'Enable', 'Done'], ['4', '30'], { log: message => messages.push(message) });
  assert.equal(result.status, 'saved');
  assert.match(messages[0], /^\.sai\/settings\.local\.jsonc defines warming, and that value replaces the one this section writes/);
  assert.equal(readLocal(directory), local);
  assert.deepEqual(warmingOf(directory).defaults, { agent: false, subagent: { interval: 4, max: 30 } });
});

test('the section keeps the file byte-identical on an interrupt, backing out of a prompt, and an unparseable file', async () => {
  const directory = project(WARMING_TEXT);
  const messages = [];
  const interrupted = await runWarming(directory, ['default:agent', 'Enable', 'Done'], [null], { log: message => messages.push(message) });
  assert.equal(interrupted.status, 'discarded');
  assert.deepEqual(messages, ['Interrupted: the edits were discarded and nothing was saved.']);
  const backed = await runWarming(directory, ['default:agent', 'Enable', 'default:agent', null], [BACK]);
  assert.equal(backed.status, 'discarded');
  assert.equal(read(directory), WARMING_TEXT);
  const broken = project('{ nope');
  const failed = await runWarming(broken, [], [], { log: message => messages.push(message) });
  assert.equal(failed.status, 'failed');
  assert.match(messages.at(-1), /^Cannot edit \.sai\/settings\.jsonc/);
  assert.equal(read(broken), '{ nope');
});

test('the post-setup menu offers Cache warming and opens the section with the guided pairs of installed files', async () => {
  const directory = project();
  const roots = Object.fromEntries(['claudeAgents', 'claudeCommands', 'opencodeAgents', 'opencodeCommands'].map(name => [name, fs.mkdtempSync(path.join(os.tmpdir(), `warming-${name}-`))]));
  fs.writeFileSync(path.join(roots.claudeCommands, 'sai-explore.md'), '---\nname: sai-explore\nmodel: opus\neffort: high\n---\n\nbody\n');
  const seen = [];
  const answers = ['Cache warming', 'pair:agent:anthropic/opus', 'Enable', 'Done', 'Exit'];
  const outcome = await modelCustomization.runPostSetupMenu({
    projectPath: directory, packageRoot: path.join(__dirname, '..'), isTTY: true,
    claudeGlobalAgentRoot: roots.claudeAgents, claudeGlobalCommandRoot: roots.claudeCommands,
    opencodeGlobalAgentRoot: roots.opencodeAgents, opencodeGlobalCommandRoot: roots.opencodeCommands,
    promptChoice: script(answers, seen), promptInput: async () => '',
  });
  assert.equal(outcome.reason, 'cancelled');
  assert.ok(seen[0].options.includes('Cache warming'));
  assert.deepEqual(warmingOf(directory), { rules: [{ provider: 'anthropic', model: 'opus', role: 'agent', interval: 4, max: 30 }] });
});
