'use strict';

/**
 * usage — the one renderer of the usage declarations of agent-facing tools.
 *
 * Each tool declares its usage once, as data beside its parser:
 *
 *   const USAGE = {
 *     general: { usage: [...], examples: [...], flags, positionals, required },  // a tool without subcommands
 *     subcommands: { name: { usage: [...], examples: [...], flags, positionals, required } },
 *   };
 *
 * - `usage`: the lines after `Usage: ` (one per accepted shape of the entry).
 * - `notes`: optional lines that explain the flags, shown between the usage and the examples.
 * - `examples`: real invocations, each one a call this module accepts.
 * - `flags`: `{ '--flag': false }` (boolean), `true` (takes a value), an array of the
 *   values of an enum, or `{ values, pattern, expect, once, dashValue }` (`pattern`: a RegExp the value
 *   must match, `expect` its description; `once`: a second occurrence is an error).
 * - `positionals`: the count accepted after the subcommand, a number (the maximum) or `{ min, max, names, values }`
 *   (`values`: the closed set of the first positional).
 * - `required`: flags the entry cannot run without.
 * - `lenient`: the entry is checked only for unknown flags and invalid enum or pattern values; the tool
 *   keeps its own messages for a missing value, a missing or extra positional, and a missing flag.
 *
 * A tool with subcommands declares no `general` entry: the general block lists every subcommand, then the
 * optional `notes` of the declaration itself (the facts that hold for every subcommand, such as the exit codes).
 *
 * Wording that an existing contract already pins is kept through `messages` (the declaration's own:
 * `missingSubcommand`, `unknownSubcommand(name)`, `unknownFlag(flag)`; an entry's: `positional`, and the maps
 * `required`, `unknown`, and `invalid` keyed by flag, the last holding functions of the value).
 *
 * `handle` is the entry guard of a tool. It answers `--help` (any position, no validation) and a
 * wrong invocation (unknown flag, missing value, unaccepted positional, invalid enum value,
 * unknown or missing subcommand) before the tool does any work, and returns the exit code, or
 * null when the call is well formed. `--help` exits 0; a usage error exits 2.
 */

const HELP_TOKENS = ['--help', '-h'];

function helpRequested(argv) {
  return argv.some((token) => HELP_TOKENS.includes(token));
}

function flagSpec(raw) {
  if (raw === false) return { value: false };
  if (raw === true) return { value: true };
  if (Array.isArray(raw)) return { value: true, values: raw };
  return { value: true, ...raw };
}

function isFlag(token) {
  return token.length > 1 && token.startsWith('-') && !/^-\d/.test(token);
}

function entryOf(decl, subcommand) {
  return subcommand === null ? decl.general : decl.subcommands[subcommand];
}

/** The first token that is not a flag or a flag's value: the subcommand position. */
function locateSubcommand(decl, argv) {
  if (!decl.subcommands) return { index: -1, name: null };
  const valueFlags = new Set();
  for (const entry of Object.values(decl.subcommands)) {
    for (const [flag, raw] of Object.entries(entry.flags || {})) if (flagSpec(raw).value) valueFlags.add(flag);
  }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (isFlag(token)) {
      if (!token.includes('=') && valueFlags.has(token)) i += 1;
      continue;
    }
    return { index: i, name: token };
  }
  return { index: -1, name: null };
}

function positionalBounds(entry) {
  const raw = entry.positionals;
  if (raw === undefined) return { min: 0, max: 0, names: [] };
  if (typeof raw === 'number') return { min: 0, max: raw, names: [] };
  return { min: raw.min || 0, max: raw.max === undefined ? (raw.min || 0) : raw.max, names: raw.names || [], values: raw.values || null };
}

/** The first problem of `tokens` against one entry, or null. */
function validateEntry(entry, tokens, decl = {}) {
  const flags = entry.flags || {};
  const messages = entry.messages || {};
  const seen = new Set();
  let positionals = 0;
  const bounds = positionalBounds(entry);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '--') {
      positionals += tokens.length - i - 1;
      break;
    }
    if (!isFlag(token)) {
      positionals += 1;
      if (entry.lenient) continue;
      if (bounds.max !== null && positionals > bounds.max) return `unexpected positional argument: ${token}`;
      if (positionals === 1 && bounds.values && !bounds.values.includes(token)) return `invalid value for <${bounds.names[0] || 'argument'}>: ${token} (expected ${bounds.values.join('|')})`;
      continue;
    }
    const equals = token.startsWith('--') ? token.indexOf('=') : -1;
    const key = equals > 0 ? token.slice(0, equals) : token;
    if (!Object.hasOwn(flags, key)) return messages.unknown?.[key] ?? (decl.messages?.unknownFlag ? decl.messages.unknownFlag(key) : `unknown flag: ${key}`);
    const spec = flagSpec(flags[key]);
    if (spec.once && seen.has(key)) return `${key} accepts one value`;
    seen.add(key);
    if (!spec.value) {
      if (equals > 0) return `${key} takes no value`;
      continue;
    }
    let value;
    let optionInstead = null;
    // A lenient entry leaves a flag without its value to the tool, whose own message says what was missing.
    if (entry.lenient && equals < 0 && (tokens[i + 1] === undefined || (!spec.dashValue && tokens[i + 1].startsWith('--')))) continue;
    if (equals > 0) value = token.slice(equals + 1);
    else {
      value = tokens[i + 1];
      i += 1;
      if (value !== undefined && !spec.dashValue && value.startsWith('--')) {
        optionInstead = value;
        value = undefined;
      }
    }
    if (value === undefined || value === '') {
      // The shared input reader has always named the option that stood where the path belonged.
      if (optionInstead !== null && key === '--input-file') return `${key} requires a path, not the option ${optionInstead}; use ${key}=<path> for a path that starts with --`;
      return messages.required?.[key] ?? `value required for ${key}`;
    }
    const wrong = (spec.values && !spec.values.includes(value)) || (spec.pattern && !spec.pattern.test(value));
    if (wrong) {
      if (messages.invalid?.[key]) return messages.invalid[key](value);
      return `invalid value for ${key}: ${value} (expected ${spec.values ? spec.values.join('|') : spec.expect || String(spec.pattern)})`;
    }
  }
  if (entry.lenient) return null;
  for (const flag of entry.required || []) if (!seen.has(flag)) return messages.required?.[flag] ?? `missing required flag: ${flag}`;
  if (positionals < bounds.min) {
    const missing = bounds.names[positionals] ? `<${bounds.names[positionals]}>` : 'a positional argument';
    return messages.positional ?? `missing ${missing}`;
  }
  return null;
}

/** `{ cause, subcommand }` for the first problem of a call, or null when it is well formed. */
function check(decl, argv) {
  if (!decl.subcommands) {
    const cause = validateEntry(decl.general, argv, decl);
    return cause ? { cause, subcommand: null } : null;
  }
  const { index, name } = locateSubcommand(decl, argv);
  const messages = decl.messages || {};
  if (name === null) return { cause: messages.missingSubcommand ?? 'sub-command required', subcommand: null };
  if (!Object.hasOwn(decl.subcommands, name)) return { cause: messages.unknownSubcommand ? messages.unknownSubcommand(name) : `unknown sub-command: ${name}`, subcommand: null };
  const cause = validateEntry(decl.subcommands[name], argv.filter((_, position) => position !== index), decl);
  return cause ? { cause, subcommand: name } : null;
}

/** The lines of the `Usage:` part and the example list of one entry (or of the general block). */
function blockOf(decl, subcommand) {
  if (subcommand !== null || !decl.subcommands) {
    const entry = entryOf(decl, subcommand);
    return { usage: entry.usage, notes: entry.notes || [], examples: entry.examples };
  }
  const entries = Object.values(decl.subcommands);
  return { usage: entries.flatMap((entry) => entry.usage), notes: decl.notes || [], examples: entries.map((entry) => entry.examples[0]) };
}

function usageText(lines) {
  return lines.map((line, index) => (index === 0 ? `Usage: ${line}` : `       ${line}`)).join('\n');
}

/** The text block: optional cause, the `Usage:` lines, then the examples. */
function render(decl, subcommand = null, cause = null) {
  const { usage, notes, examples } = blockOf(decl, subcommand);
  const lines = [];
  if (cause) lines.push(cause);
  lines.push(usageText(usage));
  if (notes.length) lines.push('', ...notes);
  lines.push('', 'Examples:', ...examples.map((example) => `  ${example}`));
  return lines.join('\n');
}

/** `{ usage, examples }`, the fields a JSON tool merges into its existing object. */
function fields(decl, subcommand = null) {
  const { usage, examples } = blockOf(decl, subcommand);
  return { usage: usageText(usage), examples: [...examples] };
}

/** The recognized subcommand of a call, without validating anything else (the help scope). */
function recognized(decl, argv) {
  const { name } = locateSubcommand(decl, argv);
  return name !== null && Object.hasOwn(decl.subcommands || {}, name) ? name : null;
}

/**
 * The outcome of the guard for a call: `{ help, cause, subcommand, usage, examples }` when the call is
 * `--help` (`help` true, no cause) or a wrong invocation, and null when it is well formed. Nothing is
 * written: a tool that answers through a return value (not through stdout) uses this directly.
 */
function preflight(decl, argv) {
  if (helpRequested(argv)) {
    const subcommand = recognized(decl, argv);
    return { help: true, cause: null, subcommand, ...fields(decl, subcommand) };
  }
  const problem = check(decl, argv);
  if (!problem) return null;
  return { help: false, cause: problem.cause, subcommand: problem.subcommand, ...fields(decl, problem.subcommand) };
}

/**
 * The entry guard of a tool. Returns the exit code when the call was `--help` (0) or a wrong
 * invocation (2), after writing the block; returns null when the call is well formed.
 *
 * Without `json`, the help goes to stdout and the error to stderr, as text. With `json`
 * (`info => object`, `info` being `{ help, cause, usage, examples }`), the object it returns is
 * written to stdout as one JSON line for both.
 */
function handle(decl, argv, { json = null, stdout = process.stdout, stderr = process.stderr } = {}) {
  const found = preflight(decl, argv);
  if (!found) return null;
  if (json) stdout.write(`${JSON.stringify(json({ help: found.help, cause: found.cause, usage: found.usage, examples: found.examples }))}\n`);
  else if (found.help) stdout.write(`${render(decl, found.subcommand)}\n`);
  else stderr.write(`${render(decl, found.subcommand, found.cause)}\n`);
  return found.help ? 0 : 2;
}

/** The text block for a usage error that a tool raises itself, scoped to its subcommand. */
function error(decl, subcommand, cause) {
  return render(decl, subcommand && Object.hasOwn(decl.subcommands || {}, subcommand) ? subcommand : null, cause);
}

function tokenize(line) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(line)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
  return tokens;
}

/** The arguments of an example: the text after `node <script>`. */
function exampleArguments(example) {
  const tokens = tokenize(example);
  return tokens[0] === 'node' ? tokens.slice(2) : tokens;
}

/** The problems of a declaration: a missing block, or an example that the declaration itself rejects. */
function lint(decl) {
  const problems = [];
  const entries = decl.subcommands
    ? Object.entries(decl.subcommands).map(([name, entry]) => [name, entry])
    : [[null, decl.general]];
  if (!decl.subcommands && !decl.general) return ['no general entry'];
  if (decl.subcommands && decl.general) problems.push('a tool with subcommands declares no general entry');
  if (decl.subcommands && !entries.length) problems.push('no subcommand declared');
  for (const [name, entry] of entries) {
    const label = name === null ? 'general' : name;
    if (!entry || !Array.isArray(entry.usage) || !entry.usage.length) {
      problems.push(`${label}: no usage line`);
      continue;
    }
    if (!Array.isArray(entry.examples) || !entry.examples.length) {
      problems.push(`${label}: no example`);
      continue;
    }
    for (const example of entry.examples) {
      const argv = exampleArguments(example);
      const found = check(decl, argv);
      if (found) problems.push(`${label}: example "${example}" is rejected: ${found.cause}`);
      else if (name !== null && recognized(decl, argv) !== name) problems.push(`${label}: example "${example}" does not call the subcommand`);
    }
  }
  return problems;
}

module.exports = { helpRequested, check, preflight, render, fields, handle, error, recognized, lint, exampleArguments };
