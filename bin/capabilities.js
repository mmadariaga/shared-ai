'use strict';

// Capability grants describe access, not operation or file-write authorization.
const fs = require('fs');
const path = require('path');
const FLAGS = ['read', 'search', 'write', 'webfetch', 'websearch', 'codegraph', 'question', 'panel', 'message'];
const LISTS = ['shell', 'skills', 'delegate'];
const AGENTS = {
  explorer: { claude: 'budget-explorer', opencode: 'explore' },
  executor: { claude: 'budget-executor', opencode: 'executor' },
  budget: { claude: 'budget-subagent', opencode: 'budget' },
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
      if (typeof definition[flag] !== 'boolean') throw new Error(`Capability ${name}.${flag} must be boolean`);
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
  for (const name of Object.keys(registry.profiles)) {
    const profile = resolveProfile(registry, name);
    for (const target of profile.delegate || []) targetName(target, 'opencode');
  }
  for (const kind of ['agents', 'commands']) {
    if (!registry.assignments[kind] || typeof registry.assignments[kind] !== 'object') throw new Error(`Missing capability assignments: ${kind}`);
    for (const name of Object.keys(registry.assignments[kind])) assignment(registry, kind, name);
  }
}

function shellPatterns(patterns, harness) {
  const root = harness === 'claude' ? '.claude' : '.opencode';
  const global = harness === 'claude' ? '~/.claude' : '~/.config/opencode';
  return (patterns || []).flatMap(pattern => /\{(?:sai|skills)\}/.test(pattern)
    ? [root, global].map(base => pattern.replaceAll('{sai}', `${base}/sai`).replaceAll('{skills}', `${base}/skills`).replaceAll('{harness}', harness)) : [pattern]);
}

function translate(registry, name, harness) {
  if (!['claude', 'opencode'].includes(harness)) throw new Error(`Unsupported capability harness: ${harness}`);
  const profile = resolveProfile(registry, name);
  const tools = [];
  const rules = [{ action: '*', resource: '*', effect: 'deny' }];
  const grant = (action, resource = '*', effect = 'allow') => rules.push({ action, resource, effect });
  if (profile.read) { tools.push('Read'); grant('read'); }
  if (profile.search) { tools.push('Glob', 'Grep'); grant('glob'); grant('grep'); }
  if (profile.write) { tools.push('Edit', 'Write'); grant('edit'); }
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
  if (profile.shell?.length) {
    tools.push('Bash', 'PowerShell');
    for (const resource of shellPatterns(profile.shell, harness)) grant('shell', resource);
  }
  if (profile.delegate?.length) {
    tools.push('Agent');
    for (const target of profile.delegate) grant('subagent', targetName(target, harness));
  }
  if (profile.message) tools.push('SendMessage');
  // V2 has no built-in todo action; its panel adapter owns absence handling.
  if (profile.panel) tools.push('TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList');
  if (profile.read || profile.shell?.length) {
    grant('external_directory', '*', 'ask');
    grant('external_directory', '~/.config/opencode/*');
    grant('external_directory', '/tmp/opencode/*');
    const dataRoot = process.env.XDG_DATA_HOME || '~/.local/share';
    grant('external_directory', `${dataRoot}/opencode/tool-output/*`);
    grant('external_directory', `${dataRoot}/opencode/shell/*`);
  }
  if (profile.read) {
    grant('read', '*.env', 'ask');
    grant('read', '*.env.*', 'ask');
    grant('read', '*.env.example');
  }
  const allowed = tools.filter(tool => !['Bash', 'PowerShell'].includes(tool));
  allowed.push(...shellPatterns(profile.shell, 'claude').flatMap(pattern => ['Bash', 'PowerShell'].map(tool => pattern === '*' ? tool : `${tool}(${pattern.replace(/ \*$/, ':*')})`)));
  const nativeTools = harness === 'claude' ? [...new Set(tools)]
    : [...new Set(rules.filter(rule => rule.effect === 'allow' && rule.action !== 'external_directory').map(rule => rule.action))];
  const toolRequirements = [];
  if (profile.write) toolRequirements.push({ capability: 'write', anyOf: harness === 'claude' ? [['Edit', 'Write']] : [['patch'], ['edit', 'write']] });
  if (profile.shell?.length) toolRequirements.push({ capability: 'shell', anyOf: harness === 'claude' ? [['Bash'], ['PowerShell']] : [['shell']] });
  return { profile, toolRequirements,
    ...(harness === 'claude' ? { nativeTools, tools: [...new Set(tools)].join(', '), allowedTools: [...new Set(allowed)].join(', ') }
      : { nativeActions: nativeTools, permissions: rules }),
  };
}

function permissionYaml(rules) {
  return rules.map(rule => `  - action: ${JSON.stringify(rule.action)}\n    resource: ${JSON.stringify(rule.resource)}\n    effect: ${rule.effect}`).join('\n');
}

function projectSource(text, registry, kind, name, harness) {
  const profileName = assignment(registry, kind, name);
  const native = translate(registry, profileName, harness);
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

function projectFile(projection, registry, repoRoot) {
  const source = projection.sourcePath.replaceAll(path.sep, '/');
  const match = /\/(agents|commands)\/(claude|opencode)\/([^/]+)\.md$/.exec(source);
  if (!match || match[3] === 'worker-template') return projection;
  const text = projection.sourceText ?? fs.readFileSync(projection.sourcePath, 'utf8');
  return { ...projection,
    sourcePath: path.join(repoRoot, '.tmp', 'capability-sources', projection.harness, match[1], `${match[3]}.md`),
    sourceText: projectSource(text, registry, match[1], match[3], projection.harness) };
}

function requirementsProjection(registry, harness, destinationRoot, repoRoot) {
  const commands = Object.fromEntries(Object.entries(registry.assignments.commands).map(([name, profile]) =>
    [name, { profileName: profile, ...translate(registry, profile, harness) }]));
  return {
    id: `${harness}-capability-requirements`, harness, strategy: 'copy', ownership: 'managed', drift: 'content',
    // Uninstall materializes generated sources here; never use executable source.
    sourcePath: path.join(repoRoot, '.tmp', 'capability-sources', harness, 'capability-requirements.json'),
    destinationPath: path.join(destinationRoot.sai, 'capability-requirements.json'),
    sourceText: JSON.stringify({ harness, registry, commands }, null, 2) + '\n',
  };
}

function profileProjections(registry, harness, destinationRoot, repoRoot) {
  return Object.keys(registry.profiles).map(name => ({
    id: `${harness}-capability-profile-${name}`, harness, strategy: 'copy', ownership: 'managed', drift: 'content',
    sourcePath: path.join(repoRoot, '.tmp', 'capability-sources', harness, 'profiles', `${name}.json`),
    destinationPath: path.join(destinationRoot.sai, 'capabilities', `${name}.json`),
    sourceText: JSON.stringify({ harness, profileName: name, ...translate(registry, name, harness) }, null, 2) + '\n',
  }));
}

module.exports = { resolveProfile, assignment, validateRegistry, translate, permissionYaml, projectSource, projectFile, requirementsProjection, profileProjections };
