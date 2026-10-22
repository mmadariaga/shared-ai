#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DEFAULTS, parameters, measure, renderSummary } = require('./engine');
const { OpenCodeAdapter, claudeLimitation } = require('./adapters');

function parseArgs(argv) {
  if (argv.includes('--subagent')) {
    if (argv.includes('--mode')) throw new Error('Use --subagent or --mode, not both');
    argv = argv.flatMap(value => value === '--subagent' ? ['--mode', 'subagent'] : [value]);
  }
  const args = { ...DEFAULTS, tool: null, mode: 'main', session: null, 'invoking-session': null, out: null, log: path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local/share'), 'opencode/log/opencode.log'), 'dry-run': false, inspect: false, 'acknowledge-consumption': false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !Object.hasOwn(args, key)) throw new Error(`Unknown option ${argv[i]}`);
    if (['dry-run', 'inspect', 'acknowledge-consumption'].includes(key)) { args[key] = true; continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`--${key} needs a value`);
    args[key] = key === 'time-prefix' ? (/^(true|false)$/.test(value) ? value === 'true' : undefined) : Object.hasOwn(DEFAULTS, key) && !['probe-text', 'time-prefix'].includes(key) ? Number(value) : value;
  }
  parameters(args);
  if (!['opencode', 'claude'].includes(args.tool) || !['main', 'subagent'].includes(args.mode) || !args.session || !args['invoking-session'] || !args.out) throw new Error('Require --tool opencode|claude --mode main|subagent --session ID --invoking-session ID --out DIR');
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const p = parameters(Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, args[k]])));
  if (args['dry-run']) {
    process.stdout.write(JSON.stringify({ dry_run: true, tool: args.tool, mode: args.mode, session: args.session, invoking_session: args['invoking-session'], parameters: p, limitation: args.tool === 'claude' ? claudeLimitation(args.mode) : 'Plan only; identity, usage, permissions and interference not yet verified.' }) + '\n');
    return 0;
  }
  if (args.inspect) {
    if (args.tool === 'claude') throw new Error(claudeLimitation(args.mode));
    const adapter = new OpenCodeAdapter({ session: args.session, invokingSession: args['invoking-session'], mode: args.mode, log: args.log });
    process.stdout.write(JSON.stringify({ identity: await adapter.identify(), parameters: p, output: args.out, warning: 'Billable requests; silence in target required; no settings will be changed.' }) + '\n');
    return 0;
  }
  if (!args['acknowledge-consumption']) throw new Error('Warn about billable usage and silence, then supply --acknowledge-consumption after explicit user consent');
  // One invocation owns a new output directory; partial results are never
  // appended to a different model's run or overwritten by a repeated command.
  fs.mkdirSync(args.out, { mode: 0o700 });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  let report;
  const identity = { tool: args.tool, mode: args.mode, session: args.session, invoking_session: args['invoking-session'] };
  try {
    if (args.tool === 'claude') throw new Error(claudeLimitation(args.mode));
    const adapter = new OpenCodeAdapter({ session: args.session, invokingSession: args['invoking-session'], mode: args.mode, log: args.log });
    report = await measure(adapter, p, { signal: controller.signal, onSample: sample => fs.appendFileSync(path.join(args.out, 'results.jsonl'), JSON.stringify(sample) + '\n', { mode: 0o600 }) });
  } catch (error) {
    report = { ...identity, model: null, parameters: p, status: 'unavailable', stop_reason: 'compatibility', probes: 0, samples: [], results_valid: false, limitations: [error.message] };
  } finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
  fs.writeFileSync(path.join(args.out, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  fs.writeFileSync(path.join(args.out, 'summary.md'), renderSummary(report), { mode: 0o600 });
  process.stdout.write(`REPORT ${path.join(args.out, 'report.json')}\nSUMMARY ${path.join(args.out, 'summary.md')}\n`);
  return report.status === 'completed' ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 2; });
module.exports = { parseArgs, main };
