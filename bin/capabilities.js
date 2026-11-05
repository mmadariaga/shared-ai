'use strict';

// Capability grants describe access, not operation or file-write authorization.
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const { harnessRoot, SAI_DIR } = require('../sai/tools/temp-root');
const FLAGS = ['read', 'search', 'write', 'webfetch', 'websearch', 'codegraph', 'question', 'panel', 'message', 'stopTask'];
const LISTS = ['shell', 'skills', 'delegate'];
const TEMP_WRITE = 'temp';
const AGENTS = {
  explorer: { claude: 'budget-explorer', opencode: 'budget-explorer' },
  executor: { claude: 'budget-executor', opencode: 'budget-executor' },
  budget: { claude: 'budget-subagent', opencode: 'budget-subagent' },
  // The harness's built-in general-purpose subagent, which inherits the caller's model.
  general: { claude: 'general-purpose', opencode: 'general' },
};

function resolveProfile(registry, name, ancestors = []) {
  if (!registry || !Object.hasOwn(registry.profiles || {}, name)) throw new Error(`Unknown capability profile: ${name}`);
  if (ancestors.includes(name)) throw new Error(`Capability profile cycle: ${[...ancestors, name].join(' -> ')}`);
  const definition = registry.profiles[name];
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new Error(`Invalid capability profile: ${name}`);
  for (const key of Object.keys(definition)) {
    if (![...FLAGS, ...LISTS, 'extends'].includes(key)) throw new Error(`Unknown capability ${name}.${key}`);
  }
  const profile = definition.extends ? resolveProfile(registry, definition.extends, [...ancestors, name]) : {};
  for (const flag of FLAGS) {
    if (definition[flag] !== undefined) {
      // `write` also takes the scoped value `temp`: native writes limited to the SAI temp root.
      if (typeof definition[flag] !== 'boolean' && !(flag === 'write' && definition[flag] === TEMP_WRITE)) {
        throw new Error(`Capability ${name}.${flag} must be boolean${flag === 'write' ? ` or "${TEMP_WRITE}"` : ''}`);
      }
      profile[flag] = definition[flag];
    }
  }
  for (const key of LISTS) {
    if (definition[key] !== undefined) {
      if (!Array.isArray(definition[key]) || definition[key].some(value => typeof value !== 'string' || !value)) {
        throw new Error(`Capability ${name}.${key} must be a string array`);
      }
      profile[key] = [...new Set(definition[key])];
    }
  }
  return profile;
}

function assignment(registry, kind, name) {
  const profile = registry?.assignments?.[kind]?.[name];
  if (typeof profile !== 'string') throw new Error(`Missing capability assignment: ${kind}.${name}`);
  resolveProfile(registry, profile);
  return profile;
}

function targetName(target, harness) {
  const name = AGENTS[target]?.[harness] || target;
  if (!AGENTS[target] && !/^sai-[a-z0-9-]+-worker$/.test(target)) throw new Error(`Invalid delegation target: ${target}`);
  return name;
}

function validateRegistry(registry) {
  if (!registry || !registry.profiles || !registry.assignments) throw new Error('Capability registry requires profiles and assignments');
  const universalShell = registry.universal?.shell;
  if (universalShell !== undefined && (!Array.isArray(universalShell) || universalShell.some(value => typeof value !== 'string' || !value))) {
    throw new Error('Capability universal.shell must be a string array');
  }
  for (const name of Object.keys(registry.profiles)) {
    const profile = resolveProfile(registry, name);
    for (const target of profile.delegate || []) targetName(target, 'opencode');
  }
  for (const kind of ['agents', 'commands']) {
    if (!registry.assignments[kind] || typeof registry.assignments[kind] !== 'object') throw new Error(`Missing capability assignments: ${kind}`);
    for (const name of Object.keys(registry.assignments[kind])) assignment(registry, kind, name);
  }
}

// The install root is written with forward slashes and the drive letter as Node reports it.
function normalizeInstallRoot(installRoot) {
  if (installRoot === undefined || installRoot === null || installRoot === '') return undefined;
  return String(installRoot).replace(/\\/g, '/').replace(/\/+$/, '');
}

// The absolute form double-quotes the command path, as the instructions document it: `node "<path>"`.
// A path token that ends in a wildcard keeps only its opening quote, so the wildcard still spans the rest.
function quoteCommandPath(pattern) {
  return pattern.replace(/^(node )(\S+)/, (_, command, token) => `${command}"${token}${token.endsWith('*') ? '' : '"'}`);
}

// The config directory `opencode debug paths` prints on its `config` line, or undefined when it cannot be read.
function opencodeReportedConfig() {
  try {
    const result = childProcess.spawnSync('opencode debug paths', { shell: true, encoding: 'utf8', timeout: 15000 });
    if (!result || result.error || result.status !== 0 || typeof result.stdout !== 'string') return undefined;
    return /^config\s+(.+?)\s*$/m.exec(result.stdout)?.[1];
  } catch {
    return undefined;
  }
}

const defaultRoots = new Map();

// The install root a caller did not pass: Claude Code's `~/.claude`; opencode's reported config directory,
// else the XDG location, else `~/.config/opencode`. Resolved once per process and XDG setting.
function defaultInstallRoot(harness) {
  const key = `${harness}:${process.env.XDG_CONFIG_HOME || ''}`;
  if (!defaultRoots.has(key)) {
    defaultRoots.set(key, harness === 'claude' ? path.join(os.homedir(), '.claude')
      : opencodeReportedConfig() || path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'opencode'));
  }
  return defaultRoots.get(key);
}

function shellPatterns(patterns, harness, installRoot) {
  const root = harness === 'claude' ? '.claude' : '.opencode';
  const global = harness === 'claude' ? '~/.claude' : '~/.config/opencode';
  const expand = (pattern, base) => pattern.replaceAll('{sai}', `${base}/sai`).replaceAll('{skills}', `${base}/skills`).replaceAll('{harness}', harness);
  const needsRoot = (patterns || []).some(pattern => /\{(?:sai|skills)\}/.test(pattern));
  const absolute = needsRoot ? normalizeInstallRoot(installRoot) || normalizeInstallRoot(defaultInstallRoot(harness)) : undefined;
  return (patterns || []).flatMap(pattern => {
    if (!/\{(?:sai|skills)\}/.test(pattern)) return [pattern];
    // Quote before expanding, so a root with spaces stays inside the quotes.
    return [expand(pattern, root), expand(pattern, global), expand(quoteCommandPath(pattern), absolute)];
  });
}

function translate(registry, name, harness, installRoot) {
  if (!['claude', 'opencode'].includes(harness)) throw new Error(`Unsupported capability harness: ${harness}`);
  const profile = resolveProfile(registry, name);
  // The registry's universal grants reach every profile; a wildcard shell already covers them.
  const universalShell = registry.universal?.shell || [];
  const shell = profile.shell?.includes('*') ? profile.shell : [...new Set([...(profile.shell || []), ...universalShell])];
  const tools = [];
  const rules = [{ action: '*', resource: '*', effect: 'deny' }];
  const grant = (action, resource = '*', effect = 'allow') => rules.push({ action, resource, effect });
  if (profile.read) { tools.push('Read'); grant('read'); }
  if (profile.search) { tools.push('Glob', 'Grep'); grant('glob'); grant('grep'); }
  const tempWrite = profile.write === TEMP_WRITE;
  if (profile.write === true) { tools.push('Edit', 'Write'); grant('edit'); }
  // Scoped write: only the `Write` tool (new files), and only the SAI temp root is granted.
  if (tempWrite) { tools.push('Write'); grant('edit', `${saiTempRoot(harness).split(path.sep).join('/')}/*`); }
  for (const [flag, tool] of [['webfetch', 'WebFetch'], ['websearch', 'WebSearch'], ['question', 'AskUserQuestion']]) {
    if (profile[flag]) { tools.push(tool); grant(flag); }
  }
  if (profile.codegraph) {
    tools.push('mcp__codegraph__codegraph_explore', 'ToolSearch');
    grant('codegraph_codegraph_explore');
    grant('execute');
  }
  if (profile.skills?.length) {
    tools.push('Skill');
    for (const skill of profile.skills) grant('skill', skill);
  }
  if (shell.length) {
    tools.push('Bash', 'PowerShell');
    for (const resource of shellPatterns(shell, harness, installRoot)) grant('shell', resource);
  }
  if (profile.delegate?.length) {
    tools.push('Agent');
    for (const target of profile.delegate) grant('subagent', targetName(target, harness));
  }
  if (profile.message) tools.push('SendMessage');
  // Stopping the session's own background task: Claude Code names the `TaskStop` tool. opencode ends a task by removing
  // its shell through the session API, which has no permission action, so the grant adds no opencode rule.
  if (profile.stopTask) tools.push('TaskStop');
  // V2 has no built-in todo action; its panel adapter owns absence handling.
  if (profile.panel) tools.push('TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList');
  if (profile.read || shell.length || tempWrite) {
    grant('external_directory', '*', 'ask');
    grant('external_directory', '~/.config/opencode/*');
    grant('external_directory', '/tmp/opencode/*');
    // On Linux the literal grant above already covers the SAI temp root; other platforms need their resolved root.
    const saiGrant = `${saiTempRoot().split(path.sep).join('/')}/*`;
    if (!saiGrant.startsWith('/tmp/opencode/')) grant('external_directory', saiGrant);
    const dataRoot = process.env.XDG_DATA_HOME || '~/.local/share';
    grant('external_directory', `${dataRoot}/opencode/tool-output/*`);
    grant('external_directory', `${dataRoot}/opencode/shell/*`);
  }
  if (profile.read) {
    grant('read', '*.env', 'ask');
    grant('read', '*.env.*', 'ask');
    grant('read', '*.env.example');
  }
  const allowed = tools.filter(tool => !['Bash', 'PowerShell'].includes(tool) && !(tempWrite && tool === 'Write'));
  // Claude Code applies path rules for file writes only under the `Edit` rule name, which also covers the
  // `Write` tool; a `Write(<path>)` entry is ignored and every write would ask. The tool granted stays `Write`.
  if (tempWrite) allowed.push(`Edit(${claudePathRule(`${saiTempRoot('claude').split(path.sep).join('/')}/**`)})`);
  allowed.push(...shellPatterns(shell, 'claude', harness === 'claude' ? installRoot : undefined).flatMap(pattern => ['Bash', 'PowerShell'].map(tool => pattern === '*' ? tool : `${tool}(${pattern.replace(/ \*$/, ':*')})`)));
  const nativeTools = harness === 'claude' ? [...new Set(tools)]
    : [...new Set(rules.filter(rule => rule.effect === 'allow' && rule.action !== 'external_directory').map(rule => rule.action))];
  const toolRequirements = [];
  if (profile.write) toolRequirements.push({ capability: 'write', anyOf: harness === 'claude' ? (tempWrite ? [['Write']] : [['Edit', 'Write']]) : [['patch'], ['edit', 'write']] });
  if (shell.length) toolRequirements.push({ capability: 'shell', anyOf: harness === 'claude' ? [['Bash'], ['PowerShell']] : [['shell']] });
  return { profile, toolRequirements,
    ...(harness === 'claude' ? { nativeTools, tools: [...new Set(tools)].join(', '), allowedTools: [...new Set(allowed)].join(', ') }
      : { nativeActions: nativeTools, permissions: rules }),
  };
}

// The SAI temp root opencode resolves on this platform (computed, never created).
function saiTempRoot(harness = 'opencode') {
  return path.join(harnessRoot(harness), SAI_DIR);
}

// Claude Code path rules: `//` marks an absolute filesystem path; a Windows drive `C:/x` is written `//c/x`.
function claudePathRule(absolute) {
  const drive = /^([A-Za-z]):\/(.*)$/.exec(absolute);
  return drive ? `//${drive[1].toLowerCase()}/${drive[2]}` : `/${absolute}`;
}

function permissionYaml(rules) {
  return rules.map(rule => `  - action: ${JSON.stringify(rule.action)}\n    resource: ${JSON.stringify(rule.resource)}\n    effect: ${rule.effect}`).join('\n');
}

function projectSource(text, registry, kind, name, harness, installRoot) {
  const profileName = assignment(registry, kind, name);
  const native = translate(registry, profileName, harness, installRoot);
  const values = {
    capabilityTools: native.tools,
    capabilityAllowedTools: native.allowedTools,
    capabilityPermissions: native.permissions ? permissionYaml(native.permissions) : undefined,
    capabilityProfile: profileName,
  };
  return text.replace(/\{\{(capability\w+)\}\}/g, (_, token) => {
    if (values[token] === undefined) throw new Error(`Unsupported ${harness} capability token: ${token}`);
    return values[token];
  });
}

// A skill-only workflow has no command wrapper: Claude Code reads its grants from the skill's `allowed-tools`
// frontmatter, and opencode, which takes its rules from the primary agent, receives the skill without that line.
function projectCommandlessSkill(projection, registry, repoRoot, installRoot, name) {
  const text = projection.sourceText ?? fs.readFileSync(projection.sourcePath, 'utf8');
  const sourceText = projection.harness === 'claude'
    ? projectSource(text, registry, 'commands', name, 'claude', installRoot)
    : text.replace(/^allowed-tools: \{\{capabilityAllowedTools\}\}\r?\n/m, '');
  return { ...projection,
    sourcePath: path.join(repoRoot, '.tmp', 'capability-sources', projection.harness, 'skills', name, 'SKILL.md'), sourceText };
}

function projectFile(projection, registry, repoRoot, installRoot) {
  const source = projection.sourcePath.replaceAll(path.sep, '/');
  const skill = /\/skills\/universal\/(new-change-branch)\/SKILL\.md$/.exec(source);
  if (skill) return projectCommandlessSkill(projection, registry, repoRoot, installRoot, skill[1]);
  const match = /\/(agents|commands)\/(claude|opencode)\/([^/]+)\.md$/.exec(source);
  if (!match || match[3] === 'worker-template') return projection;
  const text = projection.sourceText ?? fs.readFileSync(projection.sourcePath, 'utf8');
  return { ...projection,
    sourcePath: path.join(repoRoot, '.tmp', 'capability-sources', projection.harness, match[1], `${match[3]}.md`),
    sourceText: projectSource(text, registry, match[1], match[3], projection.harness, installRoot) };
}

function requirementsProjection(registry, harness, destinationRoot, repoRoot, installRoot) {
  const commands = Object.fromEntries(Object.entries(registry.assignments.commands).map(([name, profile]) =>
    [name, { profileName: profile, ...translate(registry, profile, harness, installRoot) }]));
  return {
    id: `${harness}-capability-requirements`, harness, strategy: 'copy', ownership: 'managed', drift: 'content',
    // Uninstall materializes generated sources here; never use executable source.
    sourcePath: path.join(repoRoot, '.tmp', 'capability-sources', harness, 'capability-requirements.json'),
    destinationPath: path.join(destinationRoot.sai, 'capability-requirements.json'),
    sourceText: JSON.stringify({ harness, registry, commands }, null, 2) + '\n',
  };
}

function profileProjections(registry, harness, destinationRoot, repoRoot, installRoot) {
  return Object.keys(registry.profiles).map(name => ({
    id: `${harness}-capability-profile-${name}`, harness, strategy: 'copy', ownership: 'managed', drift: 'content',
    sourcePath: path.join(repoRoot, '.tmp', 'capability-sources', harness, 'profiles', `${name}.json`),
    destinationPath: path.join(destinationRoot.sai, 'capabilities', `${name}.json`),
    sourceText: JSON.stringify({ harness, profileName: name, ...translate(registry, name, harness, installRoot) }, null, 2) + '\n',
  }));
}

module.exports = { resolveProfile, assignment, validateRegistry, translate, permissionYaml, normalizeInstallRoot, projectSource, projectFile, requirementsProjection, profileProjections };
