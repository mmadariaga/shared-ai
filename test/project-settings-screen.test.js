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

// Option values are setting ids; the visible rows travel as display options.
const rowFor = (options, id) => options.find(option => option === id);
const texts = call => call.options.map((option, index) => call.navigator?.displayOptions?.[index] ?? option);

// The project setting screens: scripted prompts drive the editor, which reads and writes the settings files.
const LANGUAGE = { title: 'Language settings:', ids: screen.LANGUAGE_IDS };
const BACKLOG_PR = { title: 'Backlog and PR settings:', ids: screen.BACKLOG_PR_IDS };
const pick = id => (_question, options) => rowFor(options, id);

function editor(directory, choices, inputs = [], { log = () => {}, color = false, seen = [] } = {}) {
  return screen.createSettingsEditor({ projectPath: directory, promptChoice: script(choices, seen), promptInput: script(inputs), log, color });
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

test('E4: the Language settings submenu lists its three rows with today\'s value texts and no headers', async () => {
  const directory = project('{"explore":{"overviewLanguage":"English"}}');
  const seen = [];
  const result = await editor(directory, [BACK], [], { seen }).runSection(LANGUAGE);
  assert.equal(result.status, 'back');
  assert.equal(seen[0].question, 'Language settings:');
  assert.deepEqual(seen[0].options, ['explore.readyToProposeLanguage', 'explore.chatPublicLanguage', 'pr.language']);
  assert.deepEqual(texts(seen[0]), ['Ready to Propose language: ask', 'Chat language: follow my language', 'PR/MR language: English']);
  assert.equal(texts(seen[0]).some(text => /overview/i.test(text)), false, 'the retired overview setting is no editable row');
  assert.equal(seen[0].navigator.groupHeaders, undefined);
  assert.equal(fs.existsSync(path.join(directory, FILE)), true);
});

test('E4: the Backlog and PR settings submenu names its two provider rows and the auto-approve row', async () => {
  const seen = [];
  await editor(project(COMMENTED), [BACK], [], { seen }).runSection(BACKLOG_PR);
  assert.equal(seen[0].question, 'Backlog and PR settings:');
  assert.deepEqual(seen[0].options, ['backlog.provider', 'pr.provider', 'publication.autoApprove']);
  assert.deepEqual(texts(seen[0]), ['Backlog provider: gitlab', 'Pull requests provider: ask', 'Auto-approve publication: off']);
});

test('E16: provider choices are ask plus the registry ids; language choices differ by id', async () => {
  const directory = project();
  const seen = [];
  await editor(directory, [pick('backlog.provider'), BACK, pick('pr.provider'), BACK, BACK], [], { seen }).runSection(BACKLOG_PR);
  const providerCalls = seen.filter(call => call.question.endsWith('provider:'));
  assert.deepEqual(providerCalls.map(call => call.question), ['Backlog provider:', 'Pull requests provider:']);
  assert.deepEqual(providerCalls[0].options, ['ask', 'github', 'gitlab', 'azuredevops']);
  assert.deepEqual(providerCalls[1].options, ['ask', 'github', 'gitlab', 'azuredevops']);
  const languages = [];
  await editor(directory, [pick('explore.readyToProposeLanguage'), BACK, pick('explore.chatPublicLanguage'), BACK, BACK], [], { seen: languages }).runSection(LANGUAGE);
  const pickers = languages.filter(call => call.question !== LANGUAGE.title);
  assert.deepEqual(pickers.map(call => call.question), ['Ready to Propose language:', 'Chat language:']);
  assert.deepEqual(pickers[0].options, ['ask', 'English', screen.OTHER_LANGUAGE]);
  assert.deepEqual(pickers[1].options, ['follow my language', 'English', screen.OTHER_LANGUAGE]);
  assert.equal(fs.existsSync(path.join(directory, '.sai')), false, 'backing out of every picker writes nothing');
});

test('E10: the PR/MR language picker offers English and a typed language; English removes the key and a typed name is saved', async () => {
  const directory = project();
  const seen = [];
  await editor(directory, [pick('pr.language'), screen.OTHER_LANGUAGE, BACK], [' español '], { seen }).runSection(LANGUAGE);
  const picker = seen.find(call => call.question === 'PR/MR language:');
  assert.deepEqual(picker.options, ['English', screen.OTHER_LANGUAGE]);
  assert.deepEqual(writer.parseText(read(directory)).root, { pr: { language: 'español' } });
  const shown = [];
  await editor(directory, [pick('pr.language'), 'English', BACK], [], { seen: shown }).runSection(LANGUAGE);
  assert.ok(texts(shown[0]).includes('PR/MR language: español'));
  assert.equal(Object.hasOwn(writer.parseText(read(directory)).root.pr ?? {}, 'language'), false);
  const messages = [];
  await editor(project(), [pick('pr.language'), screen.OTHER_LANGUAGE, BACK], ['none', 'Euskara'], { log: message => messages.push(message) }).runSection(LANGUAGE);
  assert.equal(messages.filter(message => message.startsWith('Rejected')).length, 1);
});

test('E16: a rejected free-text language is asked again and an accepted one is saved in canonical form', async () => {
  const directory = project();
  const messages = [];
  await editor(directory, [pick('explore.readyToProposeLanguage'), screen.OTHER_LANGUAGE, BACK], ['none', ' english '], { log: message => messages.push(message) }).runSection(LANGUAGE);
  assert.equal(messages.filter(message => message.startsWith('Rejected')).length, 1);
  assert.deepEqual(writer.parseText(read(directory)).root, { explore: { readyToProposeLanguage: 'English' } });
});

test('E6: an empty free-text answer saves nothing and returns to the submenu with the previous value', async () => {
  const directory = project(COMMENTED);
  const seen = [];
  await editor(directory, [pick('explore.chatPublicLanguage'), screen.OTHER_LANGUAGE, BACK], ['   '], { seen }).runSection(LANGUAGE);
  assert.equal(seen[2].question, LANGUAGE.title);
  assert.ok(texts(seen[2]).includes('Chat language: follow my language'));
  assert.equal(read(directory), COMMENTED);
});

test('E16: a free-text language keeps its own spelling', async () => {
  const directory = project();
  await editor(directory, [pick('explore.readyToProposeLanguage'), screen.OTHER_LANGUAGE, BACK], [' Español ']).runSection(LANGUAGE);
  assert.deepEqual(writer.parseText(read(directory)).root, { explore: { readyToProposeLanguage: 'Español' } });
});

test('E17: choosing ask writes the string "ask" for an unset id and keeps the key comment for a set one', async () => {
  const directory = project(COMMENTED);
  await editor(directory, [pick('backlog.provider'), 'ask', BACK]).runSection(BACKLOG_PR);
  assert.equal(read(directory), COMMENTED.replace('"gitlab"', '"ask"'));
  const fresh = project();
  await editor(fresh, [pick('explore.readyToProposeLanguage'), 'ask', BACK]).runSection(LANGUAGE);
  assert.deepEqual(writer.parseText(read(fresh)).root, { explore: { readyToProposeLanguage: 'ask' } });
});

test('E5: a chosen value is on disk before the next screen, which shows it, and the user stays in the submenu', async () => {
  const directory = project(COMMENTED);
  const onDisk = [];
  const seen = [];
  const result = await editor(directory, [pick('backlog.provider'), 'github', () => { onDisk.push(read(directory)); return BACK; }], [], { seen }).runSection(BACKLOG_PR);
  assert.equal(result.status, 'back');
  assert.deepEqual(seen.map(call => call.question), [BACKLOG_PR.title, 'Backlog provider:', BACKLOG_PR.title]);
  assert.deepEqual(onDisk, [COMMENTED.replace('"gitlab"', '"github"')]);
  assert.ok(texts(seen[2]).includes('Backlog provider: github'));
  assert.equal(seen[2].navigator.initial, 'backlog.provider');
});

test('E6: leaving a picker with Back saves nothing, and choosing the stored value leaves the file untouched', async () => {
  const none = project();
  await editor(none, [pick('backlog.provider'), BACK, BACK]).runSection(BACKLOG_PR);
  assert.equal(fs.existsSync(path.join(none, '.sai')), false);
  const same = project(COMMENTED);
  const before = fs.statSync(path.join(same, FILE)).mtimeMs;
  await editor(same, [pick('backlog.provider'), 'gitlab', BACK]).runSection(BACKLOG_PR);
  assert.equal(read(same), COMMENTED);
  assert.equal(fs.statSync(path.join(same, FILE)).mtimeMs, before);
});

test('E19: an invalid stored value shows with the reader warning and can be replaced', async () => {
  const directory = project('{\n  "backlog": { "provider": "jira" }\n}\n');
  const seen = [];
  const messages = [];
  await editor(directory, [pick('backlog.provider'), 'github', BACK], [], { seen, log: message => messages.push(message) }).runSection(BACKLOG_PR);
  assert.match(messages[0], /Setting backlog\.provider in \.sai\/settings\.jsonc must be one of/);
  assert.ok(texts(seen[0]).includes('Backlog provider: "jira" (invalid)'));
  assert.equal(read(directory), '{\n  "backlog": { "provider": "github" }\n}\n');
});

test('E20: an unparseable file is reported when a submenu opens, before any edit', async () => {
  const directory = project('{ nope');
  const messages = [];
  const seen = [];
  const result = await editor(directory, [], [], { seen, log: message => messages.push(message) }).runSection(LANGUAGE);
  assert.equal(result.status, 'failed');
  assert.match(messages[0], /Cannot edit \.sai\/settings\.jsonc/);
  assert.equal(seen.length, 0);
  assert.equal(read(directory), '{ nope');
});

test('E10: a write error is reported, leaves the file byte-identical and keeps the user in the submenu', async t => {
  const directory = project(COMMENTED);
  const seen = [];
  const messages = [];
  t.mock.method(fs, 'renameSync', () => { throw new Error('read-only'); });
  const result = await editor(directory, [pick('backlog.provider'), 'github', BACK], [], { seen, log: message => messages.push(message) }).runSection(BACKLOG_PR);
  t.mock.restoreAll();
  assert.equal(result.status, 'back');
  assert.match(messages.join('\n'), /not saved: .*read-only/);
  assert.equal(read(directory), COMMENTED);
  assert.equal(seen[2].question, BACKLOG_PR.title);
  assert.ok(texts(seen[2]).includes('Backlog provider: gitlab'));
});

test('E7: an interrupt in a submenu or a picker ends the screen as interrupted and keeps what was already saved', async () => {
  const directory = project(COMMENTED);
  const messages = [];
  const interrupted = await editor(directory, [pick('backlog.provider'), 'github', pick('pr.provider'), null], [], { log: message => messages.push(message) }).runSection(BACKLOG_PR);
  assert.equal(interrupted.status, 'interrupted');
  assert.equal(read(directory), COMMENTED.replace('"gitlab"', '"github"'));
  assert.equal((await editor(project(), [null]).runSection(LANGUAGE)).status, 'interrupted');
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

test('E5 and E6: an override row shows the base value struck through, the local value and (local)', () => {
  const directory = projectWithLocal('{"backlog":{"provider":"gitlab"}}', '{"backlog":{"provider":"github"},"explore":{"chatPublicLanguage":"Euskara"}}');
  const shown = editor(directory, [], [], { color: true });
  assert.equal(shown.rowText('backlog.provider'), 'Backlog provider: \x1b[9mgitlab\x1b[29m github (local)');
  assert.equal(shown.rowText('explore.chatPublicLanguage'), 'Chat language: \x1b[9mfollow my language\x1b[29m Euskara (local)');
  assert.equal(shown.rowText('pr.provider'), 'Pull requests provider: ask');
});

test('E9: without styling an override row keeps the base text, the local text and the (local) marker', () => {
  const directory = projectWithLocal('{"backlog":{"provider":"gitlab"}}', '{"backlog":{"provider":"gitlab"}}');
  const row = editor(directory, [], [], { color: false }).rowText('backlog.provider');
  assert.equal(row, 'Backlog provider: gitlab -> gitlab (local)');
  assert.equal(row.includes('\x1b'), false);
});

test('E1: without a local file no row shows an override', () => {
  const shown = editor(project(COMMENTED), [], [], { color: true });
  for (const id of screen.SETTING_IDS) assert.equal(/\(local\)|\x1b/.test(shown.rowText(id)), false, id);
});

test('E8: a submenu saves an overridden key to the local file, other keys to the base file, and never creates the local file', async () => {
  const directory = projectWithLocal(COMMENTED, LOCAL_TEXT);
  await editor(directory, [pick('backlog.provider'), 'gitlab', BACK]).runSection(BACKLOG_PR);
  await editor(directory, [pick('explore.chatPublicLanguage'), screen.OTHER_LANGUAGE, BACK], [' Euskara ']).runSection(LANGUAGE);
  assert.equal(readLocal(directory), LOCAL_TEXT.replace('"github"', '"gitlab"'));
  assert.deepEqual(writer.parseText(read(directory)).root.explore, { chatPublicLanguage: 'Euskara' });
  assert.equal(writer.parseText(read(directory)).root.backlog.provider, 'gitlab');
  const base = project(COMMENTED);
  await editor(base, [pick('explore.chatPublicLanguage'), 'English', BACK]).runSection(LANGUAGE);
  assert.equal(fs.existsSync(path.join(base, LOCAL_FILE)), false);
});

test('E8: an override that is chosen back to the stored local value changes nothing and the base file stays unchanged', async () => {
  const directory = projectWithLocal(COMMENTED, LOCAL_TEXT);
  await editor(directory, [pick('backlog.provider'), 'github', BACK]).runSection(BACKLOG_PR);
  assert.equal(read(directory), COMMENTED);
  assert.equal(readLocal(directory), LOCAL_TEXT);
});

test('I6: follow my language removes the chat language key and leaves the file otherwise intact', async () => {
  const text = '{\n  "explore": {\n    "chatPublicLanguage": "Euskara", // pick\n    "overviewLanguage": "English"\n  }\n}\n';
  const directory = project(text);
  const seen = [];
  await editor(directory, [pick('explore.chatPublicLanguage'), 'follow my language', BACK], [], { seen }).runSection(LANGUAGE);
  assert.ok(texts(seen[0]).includes('Chat language: Euskara'));
  assert.ok(texts(seen[2]).includes('Chat language: follow my language'));
  assert.equal(read(directory), '{\n  "explore": {\n    "overviewLanguage": "English"\n  }\n}\n');
  const absentText = '{\n  "explore": {\n    "overviewLanguage": "English"\n  }\n}\n';
  const absent = project(absentText);
  await editor(absent, [pick('explore.chatPublicLanguage'), 'follow my language', BACK]).runSection(LANGUAGE);
  assert.equal(read(absent), absentText);
});

test('I6: a rejected chat language none is asked again; removing a local override lets the base value show', async () => {
  const none = project();
  const messages = [];
  await editor(none, [pick('explore.chatPublicLanguage'), screen.OTHER_LANGUAGE, BACK], ['none', 'Deutsch'], { log: message => messages.push(message) }).runSection(LANGUAGE);
  assert.equal(messages.filter(message => message.startsWith('Rejected')).length, 1);
  assert.deepEqual(writer.parseText(read(none)).root, { explore: { chatPublicLanguage: 'Deutsch' } });
  const directory = projectWithLocal('{"explore":{"chatPublicLanguage":"Euskara"}}', '{"explore":{"chatPublicLanguage":"Deutsch"}}');
  const seen = [];
  await editor(directory, [pick('explore.chatPublicLanguage'), 'follow my language', BACK], [], { seen }).runSection(LANGUAGE);
  assert.ok(texts(seen[0]).includes('Chat language: Euskara -> Deutsch (local)'));
  assert.ok(texts(seen[2]).includes('Chat language: Euskara'));
  assert.deepEqual(writer.parseText(readLocal(directory)).root, { explore: {} });
  assert.equal(writer.parseText(read(directory)).root.explore.chatPublicLanguage, 'Euskara');
});

test('E20: an unparseable local file is reported when a submenu opens, before any edit', async () => {
  const broken = projectWithLocal(COMMENTED, '{ nope');
  const messages = [];
  const seen = [];
  const failed = await editor(broken, [], [], { seen, log: message => messages.push(message) }).runSection(BACKLOG_PR);
  assert.equal(failed.status, 'failed');
  assert.match(messages[0], /Cannot edit \.sai\/settings\.local\.jsonc/);
  assert.equal(seen.length, 0);
  assert.equal(readLocal(broken), '{ nope');
});



// The `Cache warming` screen: one harness at a time, each with its own block of the nested `warming` value.
const WARMING_QUESTION = 'Cache warming:';
const HARNESS_QUESTION = 'Choose a harness:';
const PAIRS = {
  claude: {
    agent: [{ provider: 'anthropic', model: 'opus' }],
    subagent: [{ provider: 'anthropic', model: 'haiku' }],
  },
  opencode: {
    agent: [],
    subagent: [{ provider: 'opencode-go', model: 'deepseek-v4.1-flash' }],
  },
};
const WARMING_TEXT = `// project note
{
  "other": 1, // foreign key
  "warming": {
    "claude": {
      "defaults": { "agent": false },
      "rules": [
        { "provider": "anthropic", "model": "claude-opus-5-5", "role": "agent", "interval": 2, "max": 10 },
        { "provider": "anthropic", "role": "subagent", "enabled": false }
      ]
    },
    "opencode": {
      "defaults": { "agent": { "interval": 3, "max": 12 } }
    }
  }
}
`;

function runWarming(directory, choices, inputs = [], { pairs = PAIRS, log = () => {}, seen = [] } = {}) {
  return warmingSetup.runWarmingSetup({
    projectPath: directory, pairs, promptChoice: script(choices, seen), promptInput: script(inputs), log,
  });
}

const warmingOf = directory => writer.parseText(read(directory)).root.warming;

test('E1/E4: the screen asks for a harness first, then enables that block default with the pre-filled timings', async () => {
  const directory = project();
  const seen = [];
  const prompts = [];
  const result = await warmingSetup.runWarmingSetup({
    projectPath: directory, pairs: PAIRS, promptChoice: script(['Claude Code', 'default:agent', 'Enable', 'Done'], seen),
    promptInput: async question => { prompts.push(question); return ''; }, log: () => {},
  });
  assert.equal(result.status, 'saved');
  assert.deepEqual(prompts, ['Interval in minutes [4]: ', 'Maximum in minutes [30]: ']);
  assert.deepEqual(warmingOf(directory), { claude: { defaults: { agent: { interval: 4, max: 30 } } } });
  assert.equal(seen[0].question, HARNESS_QUESTION);
  assert.deepEqual(seen[0].options, ['OpenCode', 'Claude Code']);
  assert.deepEqual(texts(seen[1]).slice(0, 3), ['-- Role defaults --', 'Default for agent: off', 'Default for subagent: off']);
  assert.deepEqual(seen[1].navigator.groupHeaders, ['-- Role defaults --', '-- Rules for agent --', '-- Rules for subagent --']);
});

test('E2/E3: each harness lists only its own pairs, and a rule saved under one harness stays in its block', async () => {
  const directory = project();
  const seen = [];
  const messages = [];
  const result = await runWarming(directory, ['Claude Code', 'pair:agent:anthropic/opus', 'Enable', 'pair:subagent:anthropic/haiku', 'Off', 'Done'], ['0', '5', '3', '1', '7', '20'], { seen, log: message => messages.push(message) });
  assert.equal(result.status, 'saved');
  const rows = texts(seen[1]).filter(text => text.includes('/'));
  assert.deepEqual(rows, ['anthropic/opus: no rule', 'anthropic/haiku: no rule']);
  assert.equal(rows.some(text => text.includes('deepseek')), false);
  assert.equal(messages.filter(message => message.startsWith('Rejected:')).length, 2);
  assert.deepEqual(warmingOf(directory), {
    claude: {
      rules: [
        { provider: 'anthropic', model: 'opus', role: 'agent', interval: 7, max: 20 },
        { provider: 'anthropic', model: 'haiku', role: 'subagent', enabled: false },
      ],
    },
  });
  const open = [];
  const opened = await runWarming(directory, ['OpenCode', 'Done'], [], { seen: open });
  assert.equal(opened.status, 'unchanged');
  assert.deepEqual(texts(open[1]).filter(text => text.includes('/')), ['opencode-go/deepseek-v4.1-flash: no rule']);
  const again = [];
  await runWarming(directory, ['Claude Code', 'rule:0', null], [], { seen: again });
  assert.equal(again[2].question, 'anthropic/opus:');
  assert.deepEqual(again[2].options, ['Enable', 'Off', 'Remove rule']);
  assert.ok(texts(again[1]).includes('anthropic/opus: every 7 min, up to 20 min'));
  const prefilled = [];
  await warmingSetup.runWarmingSetup({ projectPath: directory, pairs: PAIRS, promptChoice: script(['Claude Code', 'rule:0', 'Enable', null]), promptInput: async question => { prefilled.push(question); return null; }, log: () => {} });
  assert.deepEqual(prefilled, ['Interval in minutes [7]: ']);
});

test('E1: reopening the harness block after a save and leaving keeps the file byte-identical', async () => {
  const directory = project();
  await runWarming(directory, ['Claude Code', 'default:subagent', 'Enable', 'Done'], ['3', '12']);
  const saved = read(directory);
  const seen = [];
  const result = await runWarming(directory, ['Claude Code', 'Done'], [], { seen });
  assert.equal(result.status, 'unchanged');
  assert.equal(read(directory), saved);
  assert.ok(texts(seen[1]).includes('Default for subagent: every 3 min, up to 12 min'));
});

test('E5: a default switches to off, a rule switches to enabled: false, and a rule is removed, leaving the other harness block intact', async () => {
  const directory = project(WARMING_TEXT);
  const result = await runWarming(directory, ['Claude Code', 'default:agent', 'Enable', 'default:agent', 'Off', 'rule:0', 'Off', 'rule:1', 'Remove rule', 'Done'], ['4', '30']);
  assert.equal(result.status, 'saved');
  assert.deepEqual(warmingOf(directory), {
    claude: { defaults: { agent: false }, rules: [{ provider: 'anthropic', model: 'claude-opus-5-5', role: 'agent', enabled: false }] },
    opencode: { defaults: { agent: { interval: 3, max: 12 } } },
  });
  assert.match(read(directory), /\/\/ project note/);
  assert.match(read(directory), /"other": 1, \/\/ foreign key/);
});

test('E6: rules that match no installed pair stay listed, editable, and kept by a save', async () => {
  const directory = project(WARMING_TEXT);
  const seen = [];
  const result = await runWarming(directory, ['Claude Code', 'default:subagent', 'Enable', 'Done'], ['', ''], { seen });
  assert.equal(result.status, 'saved');
  const rows = texts(seen[1]);
  assert.ok(rows.includes('anthropic/claude-opus-5-5: every 2 min, up to 10 min (no installed file uses it)'));
  assert.ok(rows.includes('anthropic (any model): off (no installed file uses it)'));
  const warming = writer.parseText(WARMING_TEXT).root.warming;
  assert.deepEqual(warmingOf(directory), {
    claude: { defaults: { agent: false, subagent: { interval: 4, max: 30 } }, rules: warming.claude.rules },
    opencode: warming.opencode,
  });
});

test('E7: an invalid warming value shows the warning and starts empty; leaving unchanged keeps the file, saving replaces it', async () => {
  const text = '{\n  "warming": { "claude": { "defaults": { "agent": { "interval": 9, "max": 2 } } } }\n}\n';
  const directory = project(text);
  const messages = [];
  const seen = [];
  const left = await runWarming(directory, ['Claude Code', 'Done'], [], { seen, log: message => messages.push(message) });
  assert.equal(left.status, 'unchanged');
  assert.equal(read(directory), text);
  assert.match(messages[0], /^Setting warming in \.sai\/settings\.jsonc claude\.defaults\.agent needs max to be at least interval/);
  assert.ok(texts(seen[1]).includes('Default for agent: off'));
  const replaced = await runWarming(directory, ['Claude Code', 'default:agent', 'Enable', 'Done'], ['5', '15']);
  assert.equal(replaced.status, 'saved');
  assert.deepEqual(warmingOf(directory), { claude: { defaults: { agent: { interval: 5, max: 15 } } } });
});

test('E8: a local warming value is warned about, and only the base file is written', async () => {
  const local = '{ "warming": { "defaults": { "agent": false, "subagent": false } } }\n';
  const directory = projectWithLocal(WARMING_TEXT, local);
  const messages = [];
  const result = await runWarming(directory, ['Claude Code', 'default:subagent', 'Enable', 'Done'], ['4', '30'], { log: message => messages.push(message) });
  assert.equal(result.status, 'saved');
  assert.match(messages[0], /^\.sai\/settings\.local\.jsonc defines warming, and that value replaces the one this section writes/);
  assert.equal(readLocal(directory), local);
  assert.deepEqual(warmingOf(directory).claude.defaults, { agent: false, subagent: { interval: 4, max: 30 } });
});

test('E5: a harness without a block is seeded from the legacy global value on its first edit', async () => {
  const directory = project('{ "warming": { "defaults": { "agent": { "interval": 6, "max": 20 } }, "rules": [{ "provider": "anthropic", "role": "subagent", "enabled": false }] } }\n');
  const seen = [];
  const prompts = [];
  const result = await warmingSetup.runWarmingSetup({
    projectPath: directory, pairs: PAIRS, promptChoice: script(['Claude Code', 'default:agent', 'Enable', 'Done'], seen),
    promptInput: async question => { prompts.push(question); return question.startsWith('Interval') ? '8' : '25'; }, log: () => {},
  });
  assert.equal(result.status, 'saved');
  assert.deepEqual(prompts, ['Interval in minutes [6]: ', 'Maximum in minutes [20]: ']);
  assert.ok(texts(seen[1]).includes('Default for agent: every 6 min, up to 20 min'));
  assert.ok(texts(seen[1]).some(text => text.startsWith('anthropic (any model): off')));
  assert.deepEqual(warmingOf(directory), {
    defaults: { agent: { interval: 6, max: 20 } },
    rules: [{ provider: 'anthropic', role: 'subagent', enabled: false }],
    claude: { defaults: { agent: { interval: 8, max: 25 } }, rules: [{ provider: 'anthropic', role: 'subagent', enabled: false }] },
  });
});

test('E9: Done saves and leaves; Back saves and returns to the harness choice; Back at the choice leaves the section', async () => {
  const directory = project();
  const seen = [];
  const result = await runWarming(directory, ['Claude Code', 'default:agent', 'Enable', BACK, 'OpenCode', 'default:agent', 'Enable', 'Done'], ['4', '30', '2', '10'], { seen });
  assert.equal(result.status, 'saved');
  assert.deepEqual(warmingOf(directory), {
    claude: { defaults: { agent: { interval: 4, max: 30 } } },
    opencode: { defaults: { agent: { interval: 2, max: 10 } } },
  });
  assert.equal(seen.filter(call => call.question === HARNESS_QUESTION).length, 2);
  const untouched = project();
  const left = await runWarming(untouched, [BACK]);
  assert.equal(left.status, 'unchanged');
  assert.equal(fs.existsSync(path.join(untouched, FILE)), false);
});

test('the screen keeps the file byte-identical on an interrupt, backing out of a prompt, and an unparseable file', async () => {
  const directory = project(WARMING_TEXT);
  const messages = [];
  const interrupted = await runWarming(directory, ['Claude Code', 'default:agent', 'Enable', 'Done'], [null], { log: message => messages.push(message) });
  assert.equal(interrupted.status, 'discarded');
  assert.deepEqual(messages, ['Interrupted: the edits were discarded and nothing was saved.']);
  const backed = await runWarming(directory, ['Claude Code', 'default:agent', 'Enable', 'default:agent', null], [BACK]);
  assert.equal(backed.status, 'discarded');
  assert.equal(read(directory), WARMING_TEXT);
  const broken = project('{ nope');
  const failed = await runWarming(broken, [], [], { log: message => messages.push(message) });
  assert.equal(failed.status, 'failed');
  assert.match(messages.at(-1), /^Cannot edit \.sai\/settings\.jsonc/);
  assert.equal(read(broken), '{ nope');
});

// The post-setup menu: each topic is an entry of the main menu, and the warming flow opens from it.
const MAIN_QUESTION = 'Post-setup customization:';
const MAIN_ENTRIES = ['Model customization', 'Language settings', 'Backlog and PR settings', 'Telemetry: off', 'Cache warming', 'Exit'];
const TELEMETRY_ROW = (_question, options) => options.find(option => option.startsWith('Telemetry'));

function warmingRoots() {
  const roots = Object.fromEntries(['claudeAgents', 'claudeCommands', 'opencodeAgents', 'opencodeCommands'].map(name => [name, fs.mkdtempSync(path.join(os.tmpdir(), `warming-${name}-`))]));
  fs.writeFileSync(path.join(roots.claudeCommands, 'sai-explore.md'), '---\nname: sai-explore\nmodel: opus\neffort: high\n---\n\nbody\n');
  return {
    claudeGlobalAgentRoot: roots.claudeAgents, claudeGlobalCommandRoot: roots.claudeCommands,
    opencodeGlobalAgentRoot: roots.opencodeAgents, opencodeGlobalCommandRoot: roots.opencodeCommands,
  };
}

function runMenu(directory, answers, seen = []) {
  return modelCustomization.runPostSetupMenu({
    projectPath: directory, packageRoot: path.join(__dirname, '..'), isTTY: true, ...warmingRoots(),
    promptChoice: script(answers, seen), promptInput: async () => '',
  });
}

test('E1: the main menu lists the topics in order, shows the telemetry value, and has no Project behavior settings entry', async () => {
  const seen = [];
  const outcome = await runMenu(project(), ['Exit'], seen);
  assert.equal(outcome.reason, 'cancelled');
  assert.equal(seen[0].question, MAIN_QUESTION);
  assert.deepEqual(seen[0].options, MAIN_ENTRIES);
  assert.equal(seen[0].options.includes('Project behavior settings'), false);
  const on = [];
  await runMenu(project('{"experimental":{"changeTelemetry":true}}'), ['Exit'], on);
  assert.equal(on[0].options[3], 'Telemetry: on');
});

test('E11: outside an interactive terminal the menu does not appear', async () => {
  const directory = project();
  const skipped = await modelCustomization.runPostSetupMenu({ projectPath: directory, isTTY: false, promptChoice: async () => { throw new Error('must not prompt'); } });
  assert.equal(skipped.reason, 'non-tty');
  assert.equal(fs.existsSync(path.join(directory, '.sai')), false);
});

test('E2: Back from a submenu returns to the main menu with the cursor on that section', async () => {
  const seen = [];
  const answers = ['Language settings', BACK, 'Backlog and PR settings', BACK, 'Model customization', BACK, 'Exit'];
  await runMenu(project(), answers, seen);
  assert.deepEqual(seen.map(call => call.question), [MAIN_QUESTION, 'Language settings:', MAIN_QUESTION, 'Backlog and PR settings:', MAIN_QUESTION, 'Model customization:', MAIN_QUESTION]);
  assert.equal(seen[0].navigator.initial, undefined);
  assert.equal(seen[2].navigator.initial, 'Language settings');
  assert.equal(seen[4].navigator.initial, 'Backlog and PR settings');
  assert.equal(seen[6].navigator.initial, 'Model customization');
});

test('E3: the Model customization submenu shows its four actions', async () => {
  const seen = [];
  await runMenu(project(), ['Model customization', BACK, 'Exit'], seen);
  assert.equal(seen[1].question, 'Model customization:');
  assert.deepEqual(seen[1].options, ['Customize models', 'Reset to default models', 'Save preset', 'Load preset']);
});

test('E4 and E5: a value chosen in a submenu is saved at once and the user stays in that submenu', async () => {
  const directory = project(COMMENTED);
  const onDisk = [];
  const seen = [];
  const answers = ['Backlog and PR settings', pick('backlog.provider'), 'github', () => { onDisk.push(read(directory)); return BACK; }, 'Exit'];
  await runMenu(directory, answers, seen);
  assert.deepEqual(seen.map(call => call.question), [MAIN_QUESTION, 'Backlog and PR settings:', 'Backlog provider:', 'Backlog and PR settings:', MAIN_QUESTION]);
  assert.deepEqual(texts(seen[1]), ['Backlog provider: gitlab', 'Pull requests provider: ask', 'Auto-approve publication: off']);
  assert.deepEqual(texts(seen[3]), ['Backlog provider: github', 'Pull requests provider: ask', 'Auto-approve publication: off']);
  assert.equal(onDisk[0], COMMENTED.replace('"gitlab"', '"github"'));
  assert.equal(seen[3].navigator.initial, 'backlog.provider');
});

test('E7: Ctrl+C on a screen closes the menu and keeps the values already chosen', async () => {
  const directory = project(COMMENTED);
  const answers = ['Backlog and PR settings', pick('backlog.provider'), 'github', pick('pr.provider'), null, 'Exit'];
  const outcome = await runMenu(directory, answers);
  assert.equal(outcome.reason, 'cancelled');
  assert.deepEqual(answers, ['Exit'], 'the interrupt closed the menu; the later answer was never asked');
  assert.equal(read(directory), COMMENTED.replace('"gitlab"', '"github"'));
  const atSubmenu = ['Language settings', null, 'Exit'];
  await runMenu(project(), atSubmenu);
  assert.deepEqual(atSubmenu, ['Exit']);
  const atTelemetry = [TELEMETRY_ROW, null, 'Exit'];
  await runMenu(project(), atTelemetry);
  assert.deepEqual(atTelemetry, ['Exit']);
});

test('E8: the Telemetry row opens the On/Off picker, saves, and returns to the main menu with the new value', async () => {
  const directory = project('// top\n{\n  "other": 1\n}\n');
  const seen = [];
  await runMenu(directory, [TELEMETRY_ROW, 'On', TELEMETRY_ROW, 'Off', 'Exit'], seen);
  assert.deepEqual(seen.map(call => call.question), [MAIN_QUESTION, 'Telemetry:', MAIN_QUESTION, 'Telemetry:', MAIN_QUESTION]);
  assert.deepEqual(seen[1].options, ['On', 'Off']);
  assert.equal(seen[2].options[3], 'Telemetry: on');
  assert.equal(seen[2].navigator.initial, 'Telemetry: on', 'the cursor returns to the Telemetry row, which shows the new value');
  assert.equal(seen[4].options[3], 'Telemetry: off');
  assert.equal(Object.hasOwn(writer.parseText(read(directory)).root.experimental, 'changeTelemetry'), false);
  assert.equal(writer.parseText(read(directory)).root.other, 1);
});

test('E9: Cache warming opens the warming flow from the main menu, and Back returns to the main menu', async () => {
  const directory = project();
  const seen = [];
  const answers = ['Cache warming', 'Claude Code', 'pair:agent:anthropic/opus', 'Enable', 'Done', 'Cache warming', BACK, 'Exit'];
  const outcome = await runMenu(directory, answers, seen);
  assert.equal(outcome.reason, 'cancelled');
  assert.equal(answers.length, 0);
  assert.deepEqual(seen.map(call => call.question), [MAIN_QUESTION, HARNESS_QUESTION, WARMING_QUESTION, 'anthropic/opus:', WARMING_QUESTION, MAIN_QUESTION, HARNESS_QUESTION, MAIN_QUESTION]);
  assert.equal(seen[5].navigator.initial, 'Cache warming');
  assert.deepEqual(warmingOf(directory), { claude: { rules: [{ provider: 'anthropic', model: 'opus', role: 'agent', interval: 4, max: 30 }] } });
});

test('E12: the menus show only the eight settings, none of the repository, project, organization, or publish-after-run keys', async () => {
  assert.deepEqual([...screen.SETTING_IDS], ['explore.readyToProposeLanguage', 'explore.chatPublicLanguage', 'pr.language', 'backlog.provider', 'pr.provider', 'publication.autoApprove', 'experimental.changeTelemetry']);
  const seen = [];
  await runMenu(project(), ['Language settings', BACK, 'Backlog and PR settings', BACK, 'Exit'], seen);
  assert.deepEqual([...seen[1].options, ...seen[3].options], screen.SETTING_IDS.filter(id => id !== 'experimental.changeTelemetry'));
});

// The telemetry boolean through its own picker.
const TELEMETRY = 'experimental.changeTelemetry';
const telemetryOf = directory => writer.parseText(read(directory)).root.experimental?.changeTelemetry;

test('E8: the telemetry label is Telemetry, and the row reads on for true and off for false or an absent key', () => {
  assert.equal(CATALOGUE[TELEMETRY].label, 'Telemetry');
  for (const [text, shown] of [['{"experimental":{"changeTelemetry":true}}', 'on'], ['{"experimental":{"changeTelemetry":false}}', 'off'], ['{}', 'off']]) {
    assert.equal(editor(project(text), []).rowText(TELEMETRY), `Telemetry: ${shown}`, text);
  }
});

test('E4: On saves true and Off removes the key from the base file', async () => {
  const directory = project('// top\n{\n  "other": 1\n}\n');
  assert.equal((await editor(directory, ['On']).editSetting(TELEMETRY)).status, 'saved');
  assert.equal(telemetryOf(directory), true);
  assert.equal((await editor(directory, ['Off']).editSetting(TELEMETRY)).status, 'saved');
  assert.equal(Object.hasOwn(writer.parseText(read(directory)).root.experimental, 'changeTelemetry'), false);
  assert.equal(writer.parseText(read(directory)).root.other, 1);
  assert.equal((await editor(project('{}'), ['Off']).editSetting(TELEMETRY)).status, 'unchanged');
});

test('E5: a telemetry key that the local file holds shows as an override and saves to the local file, with Off as an explicit false', async () => {
  const base = '{"experimental":{"changeTelemetry":true}}';
  const directory = projectWithLocal(base, '{"experimental":{"changeTelemetry":true}}');
  assert.equal(editor(directory, []).rowText(TELEMETRY), 'Telemetry: on -> on (local)');
  assert.equal((await editor(directory, ['Off']).editSetting(TELEMETRY)).status, 'saved');
  assert.equal(editor(directory, []).rowText(TELEMETRY), 'Telemetry: on -> off (local)');
  assert.equal(writer.parseText(readLocal(directory)).root.experimental.changeTelemetry, false);
  assert.equal(read(directory), base);
  const same = projectWithLocal(base, '{"experimental":{"changeTelemetry":false}}');
  assert.equal((await editor(same, ['Off']).editSetting(TELEMETRY)).status, 'unchanged');
});

test('E6: a stored telemetry value that is not a boolean shows as invalid with the reader warning and any choice replaces it', async () => {
  const text = '{ "experimental": { "changeTelemetry": "yes" } }';
  const messages = [];
  assert.equal(editor(project(text), []).rowText(TELEMETRY), 'Telemetry: "yes" (invalid)');
  const turnedOn = project(text);
  assert.equal((await editor(turnedOn, ['On'], [], { log: message => messages.push(message) }).editSetting(TELEMETRY)).status, 'saved');
  assert.match(messages[0], /Setting experimental\.changeTelemetry in \.sai\/settings\.jsonc must be true or false/);
  assert.equal(telemetryOf(turnedOn), true);
  const turnedOff = project(text);
  assert.equal((await editor(turnedOff, ['Off']).editSetting(TELEMETRY)).status, 'saved');
  assert.equal(Object.hasOwn(writer.parseText(read(turnedOff)).root.experimental, 'changeTelemetry'), false);
});

test('E10: a telemetry save that fails shows the error and leaves the value as it was', async t => {
  const directory = project('{"other":1}');
  t.mock.method(fs, 'renameSync', () => { throw new Error('read-only'); });
  const messages = [];
  const result = await editor(directory, ['On'], [], { log: message => messages.push(message) }).editSetting(TELEMETRY);
  t.mock.restoreAll();
  assert.equal(result.status, 'failed');
  assert.match(messages.join('\n'), /not saved: .*read-only/);
  assert.equal(read(directory), '{"other":1}');
});

// The publication auto-approve boolean in the Backlog and PR settings submenu: the same On/Off picker as telemetry.
const AUTO_APPROVE = 'publication.autoApprove';
const autoApproveOf = directory => writer.parseText(read(directory)).root.publication?.autoApprove;

const autoApproveOfLocal = directory => writer.parseText(readLocal(directory)).root.publication?.autoApprove;

test('E12: the auto-approve row reads on for a local true and off for false, an absent key, or a true the base file alone holds, and offers On and Off', async () => {
  assert.equal(CATALOGUE[AUTO_APPROVE].label, 'Auto-approve publication');
  for (const [text, shown] of [['{"publication":{"autoApprove":true}}', 'off'], ['{"publication":{"autoApprove":false}}', 'off'], ['{}', 'off']]) {
    assert.equal(editor(project(text), []).rowText(AUTO_APPROVE), `Auto-approve publication: ${shown}`, text);
  }
  assert.equal(editor(projectWithLocal('{}', '{"publication":{"autoApprove":true}}'), []).rowText(AUTO_APPROVE), 'Auto-approve publication: off -> on (local)');
  const seen = [];
  await editor(project('{}'), [pick(AUTO_APPROVE), BACK, BACK], [], { seen }).runSection(BACKLOG_PR);
  assert.equal(seen[1].question, 'Auto-approve publication:');
  assert.deepEqual(seen[1].options, ['On', 'Off']);
});

test('E4: On saves true to the local file, creating it, and Off saves false there; the base file stays untouched', async () => {
  const baseText = '// top\n{\n  "other": 1\n}\n';
  const directory = project(baseText);
  const seen = [];
  const onDisk = [];
  await editor(directory, [pick(AUTO_APPROVE), 'On', () => { onDisk.push(autoApproveOfLocal(directory)); return BACK; }], [], { seen }).runSection(BACKLOG_PR);
  assert.deepEqual(onDisk, [true]);
  assert.equal(texts(seen[2]).at(-1), 'Auto-approve publication: off -> on (local)');
  assert.equal(read(directory), baseText);
  assert.equal((await editor(directory, ['Off']).editSetting(AUTO_APPROVE)).status, 'saved');
  assert.equal(autoApproveOfLocal(directory), false);
  assert.equal(read(directory), baseText);
  assert.equal(editor(directory, []).rowText(AUTO_APPROVE), 'Auto-approve publication: off -> off (local)');
});

test('E4: a true that only the base file holds shows Off, and On or Off still write the local file alone', async () => {
  const baseText = '{"publication":{"autoApprove":true}}';
  const messages = [];
  const shown = project(baseText);
  assert.equal(editor(shown, []).rowText(AUTO_APPROVE), 'Auto-approve publication: off');
  await editor(shown, [BACK], [], { log: message => messages.push(message) }).runSection(BACKLOG_PR);
  assert.match(messages.join('\n'), /publication\.autoApprove in \.sai\/settings\.jsonc grants consent only from \.sai\/settings\.local\.jsonc/);
  const turnedOn = project(baseText);
  assert.equal((await editor(turnedOn, ['On']).editSetting(AUTO_APPROVE)).status, 'saved');
  assert.equal(autoApproveOfLocal(turnedOn), true);
  assert.equal(read(turnedOn), baseText);
  const turnedOff = project(baseText);
  assert.equal((await editor(turnedOff, ['Off']).editSetting(AUTO_APPROVE)).status, 'saved');
  assert.equal(autoApproveOfLocal(turnedOff), false);
  assert.equal(read(turnedOff), baseText);
});

test('E4: the writer sends both consent keys to the local file, creating it, and never to the base file', () => {
  const baseText = '{"pr":{"provider":"github"}}';
  const directory = project(baseText);
  const saved = writer.saveSettings(directory, { [AUTO_APPROVE]: true, 'pr.publishAfterRun': 'yes', 'pr.language': 'Euskara' }, { prProviderIds: ['github'] });
  assert.deepEqual([saved.ok, saved.files], [true, ['.sai/settings.jsonc', '.sai/settings.local.jsonc']]);
  const local = writer.parseText(readLocal(directory)).root;
  assert.deepEqual(local, { publication: { autoApprove: true }, pr: { publishAfterRun: 'yes' } });
  assert.deepEqual(writer.parseText(read(directory)).root, { pr: { provider: 'github', language: 'Euskara' } });
  const withoutBase = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-screen-'));
  assert.equal(writer.saveSettings(withoutBase, { 'pr.publishAfterRun': 'no' }, {}).ok, true);
  assert.equal(fs.existsSync(path.join(withoutBase, FILE)), false);
  assert.equal(writer.parseText(readLocal(withoutBase)).root.pr.publishAfterRun, 'no');
});

test('E4: the menu warns that committing the local file shares the grant when git does not ignore it', async () => {
  const { spawnSync } = require('node:child_process');
  const git = (directory, ...args) => spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
  const exposed = project('{}');
  git(exposed, 'init', '-q');
  const messages = [];
  assert.equal((await editor(exposed, ['On'], [], { log: message => messages.push(message) }).editSetting(AUTO_APPROVE)).status, 'saved');
  assert.match(messages.join('\n'), /\.sai\/settings\.local\.jsonc is not ignored by git: committing it shares the publication grant with every clone/);
  assert.equal(fs.existsSync(path.join(exposed, '.gitignore')), false);
  const ignored = project('{}');
  git(ignored, 'init', '-q');
  fs.writeFileSync(path.join(ignored, '.gitignore'), '.sai/settings.local.jsonc\n');
  const quiet = [];
  assert.equal((await editor(ignored, ['On'], [], { log: message => quiet.push(message) }).editSetting(AUTO_APPROVE)).status, 'saved');
  assert.deepEqual(quiet, []);
  const off = project('{}');
  git(off, 'init', '-q');
  const none = [];
  await editor(off, ['Off'], [], { log: message => none.push(message) }).editSetting(AUTO_APPROVE);
  assert.deepEqual(none, []);
});

test('E11: the screen refuses a non-boolean auto-approve value, and a hand-written one reads as false with the reader warning', async () => {
  assert.equal(writer.checkValue(AUTO_APPROVE, 'yes').ok, false);
  assert.match(writer.checkValue(AUTO_APPROVE, 'yes').problem, /publication\.autoApprove must be true or false/);
  assert.equal(writer.saveSettings(project('{}'), { [AUTO_APPROVE]: 'yes' }, { providerIds }).ok, false);
  const text = '{ "publication": { "autoApprove": "yes" } }';
  const messages = [];
  assert.equal(editor(project(text), []).rowText(AUTO_APPROVE), 'Auto-approve publication: "yes" (invalid)');
  await editor(project(text), [BACK], [], { log: message => messages.push(message) }).runSection(BACKLOG_PR);
  assert.match(messages[0], /Setting publication\.autoApprove in \.sai\/settings\.jsonc must be true or false; it reads as false/);
});

test('E8: a telemetry edit and a nested warming save both persist', async () => {
  const directory = project(COMMENTED);
  const answers = [TELEMETRY_ROW, 'On', 'Cache warming', 'Claude Code', 'default:agent', 'Enable', 'Done', 'Exit'];
  const outcome = await runMenu(directory, answers);
  assert.equal(outcome.reason, 'cancelled');
  assert.equal(answers.length, 0);
  const root = writer.parseText(read(directory)).root;
  assert.equal(root.experimental.changeTelemetry, true);
  assert.deepEqual(root.warming, { claude: { defaults: { agent: { interval: 4, max: 30 } } } });
  assert.equal(root.backlog.provider, 'gitlab');
  assert.equal(root.other.x, 1);
});
