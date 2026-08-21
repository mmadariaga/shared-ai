'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const artifact = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('worker failures expose closed classification metadata after resolution only', () => {
  const lifecycle = artifact('sai/orchestration/worker-core.md');
  assert.match(lifecycle, /failure_class/);
  assert.match(lifecycle, /unrecoverable:\s*boolean/);
  assert.match(lifecycle, /blocking-contradiction[\s\S]*validation-failed[\s\S]*generation-error[\s\S]*dispatch-failed[\s\S]*envelope-contract-violation[\s\S]*unclassified-worker-fault/);
  assert.match(lifecycle, /outer-envelope-violation[\s\S]*(?:coordinator-authored|only the coordinator)/i);
  assert.match(lifecycle, /pre-resolution[\s\S]*(?:omit|only)[\s\S]*(?:failure_class|classification)/i);
});

test('shared runner owns a three-slot ledger of distinct diagnosis keys', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /recovery_policy/);
  assert.match(runner, /continue_after_recovery/);
  assert.match(runner, /(?:three|3)[\s-]+(?:slot|diagnosis)/i,
    'recovery must expose three diagnosis slots');
  assert.match(runner, /distinct[- ]diagnos(?:is|es)/i,
    'the recovery budget must be consumed by distinct diagnoses');
  assert.match(runner, /ledger/i,
    'recovery must retain a diagnosis ledger');
  assert.match(runner, /diagnosis[_ ]key[\s:=`]*[\s\S]{0,220}(?:tuple|\([^)]*failure[_ ]class[^)]*cause[_ ]locus[^)]*\))/i,
    'each diagnosis must have a tuple key containing failure_class and Cause Locus');
  assert.match(runner, /(?:(?:duplicate|already[- ]seen)[\s\S]{0,180}(?:before|prior to)[\s\S]{0,100}dispatch|(?:before|prior to)[\s\S]{0,100}dispatch[\s\S]{0,180}(?:duplicate|already[- ]seen))/i,
    'duplicate diagnoses must be rejected before dispatch');
  assert.match(runner, /failure[_ ]class[\s\S]{0,220}(?:(?:prior)[\s\S]{0,120}(?:not|never)[\s\S]{0,80}gate|(?:not|never)[\s\S]{0,80}gate[\s\S]{0,120}prior)/i,
    'failure_class is a prior, not the recovery gate');
  assert.match(runner, /same[- ]worker/i);
  assert.match(runner, /recovery[\s\S]{0,400}(?:never|no)[\s\S]{0,120}replacement/i);
  assert.match(runner, /outer-envelope-violation/);
});

test('recovery routes Cause Locus diagnoses through dual inspection channels', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  const orchestrationSpec = artifact('openspec/specs/orchestration-core/spec.md');
  const contract = `${runner}\n${orchestrationSpec}`;

  assert.match(contract, /(?:diagnos(?:is|es)[\s\S]{0,220}(?:route|routing)|(?:route|routing)[\s\S]{0,220}diagnos(?:is|es))/i,
    'recovery routing must be diagnosis-driven');
  assert.match(contract, /Cause[\s_-]+Locus/i,
    'the diagnosis must name Cause Locus');
  assert.match(contract, /in[- ]scope/i,
    'Cause Locus must distinguish in-scope failures');
  assert.match(contract, /out[- ]of[- ]scope/i,
    'Cause Locus must distinguish out-of-scope failures');
  assert.match(contract, /unresolved/i,
    'Cause Locus must retain an unresolved state');
  assert.match(contract, /(?:dual|two)[\s\S]{0,140}inspection[\s\S]{0,140}(?:channel|path)/i,
    'diagnosis must use dual inspection channels');
});

test('planning non-clean inspection boundary and adapter surface declaration live in the runner', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /non[- ]clean[\s\S]{0,200}(?:failed|closure)/i,
    'runner must name the non-clean closure route');
  assert.match(runner, /(?:standalone|planning)[\s\S]{0,200}(?:adapter|inspection)/i,
    'runner must address standalone/planning adapters');
  assert.match(runner, /(?:worker[- ]owned|artifact surface|authorized read set)/i,
    'adapters must declare a worker-owned artifact surface / authorized read set');
  assert.match(runner, /same[- ]worker/i,
    'same-worker correction must remain named');
  assert.match(runner, /(?:clean[\s\S]{0,120}(?:completed|needs_input|cancelled|progress|notice)|artifact[- ]blind)/i,
    'clean-route blindness must be retained');
  assert.match(runner, /(?:ephemeral|conversation state|not[\s\S]{0,80}(?:written|persisted)[\s\S]{0,80}(?:artifact|metadata))/i,
    'diagnosis must remain ephemeral — no durable recovery markers');
});

test('dual-channel exclusivity is per cause surface with no unresolved static fallback', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /(?:per[- ](?:cause[- ])?surface|cause surface)/i,
    'channel selection must be per cause surface');
  assert.match(runner, /(?:authorized read set|read set)[\s\S]{0,300}(?:inspection|inspect)/i,
    'inspection applies when the cause surface is in the authorized read set');
  assert.match(runner, /(?:phase[- ]static|design-overview-repair)[\s\S]{0,300}(?:outside|not[\s\S]{0,40}(?:in|within)|∉|blind)/i,
    'phase-static matching applies when the surface is outside the read set');
  assert.match(runner, /(?:no|not|never)[\s\S]{0,120}fall[\s-]?back[\s\S]{0,200}(?:phase[- ]static|static|design-overview-repair)|(?:unresolved)[\s\S]{0,200}(?:no|not|never)[\s\S]{0,120}(?:phase[- ]static|static|fall[\s-]?back)/i,
    'authorized-but-unresolved inspection must not fall back to a static row');
  assert.match(runner, /channel selection[\s\S]{0,200}(?:before|precedes)[\s\S]{0,120}(?:key|diagnosis)/i,
    'channel selection must precede key derivation');
  assert.match(runner, /design-overview-repair/,
    'sole overview registry identity must remain');
  assert.equal(
    (runner.match(/\| design-overview-repair \|/g) || []).length,
    1,
    'exactly one design-overview-repair registry row'
  );
});

test('recovery preserves ordinary continuation fallback and invocation accounting', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /outside recovery[\s\S]{0,260}(?:replacement|fallback)/i);
  assert.match(runner, /changed_files[\s\S]{0,260}(?:first-seen|ordered)[\s\S]{0,260}(?:never|not)[\s\S]{0,80}reset/i);
  assert.match(runner, /needs_input[\s\S]{0,300}(?:exit|resume)[\s\S]{0,180}(?:normal|input)/i);
  assert.match(runner, /cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery/i);
  assert.match(runner, /--fast-track[\s\S]{0,180}(?:neither|not|same)[\s\S]{0,180}(?:pool|recovery)/i);
});

test('recovery reporting is conversational and never mutates progress plan state', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /failure class[\s\S]{0,220}(?:1|2|3)[\s\S]{0,100}of 3/i);
  assert.match(runner, /attempts spent|attempt count/i);
  assert.match(runner, /recovery[\s\S]{0,260}(?:does not|never)[\s\S]{0,180}(?:mark|extend|rename|add)[\s\S]{0,120}progress/i);
});

test('active orchestration capability declares the optional recovery seam', () => {
  const spec = artifact('openspec/specs/orchestration-core/spec.md');
  assert.match(spec, /optional static `recovery_policy`/);
  assert.match(spec, /continue_after_recovery/);
  assert.match(spec, /never dispatch a replacement worker from that recovery path/i);
});

test('design overview recovery keeps generator classification separate from the closed nested envelope', () => {
  const routing = artifact('openspec/specs/change-overview-generation-routing/spec.md');
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(routing, /failure_kind[\s\S]{0,260}(?:unchanged|same)[\s\S]{0,220}failure_class/i,
    'valid failed generator results should propagate failure_kind unchanged to failure_class');
  assert.match(routing, /status[\s\S]{0,180}changed_files[\s\S]{0,180}validation[\s\S]{0,180}failure_details[\s\S]{0,180}failure_kind/i,
    'the nested generator result should retain the five-field order');
  assert.match(worker, /post-resolution[\s\S]{0,300}overview_language[\s\S]{0,300}failure_class[\s\S]{0,300}unrecoverable/i,
    'post-resolution design failures should retain invocation-scoped overview_language with failure metadata');
  assert.match(worker, /overview_language[\s\S]{0,260}(?:absent|missing)[\s\S]{0,180}English/i,
    'the absent overview language flag should default to English');
});

test('overview soundness vetoes the first envelope violation before any bounded recovery attempt', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /before[\s\S]{0,300}(?:first )?return(?:ing)?[\s\S]{0,180}envelope-contract-violation[\s\S]{0,420}(?:overview|existing overview)[\s\S]{0,160}sound/i,
    'overview soundness must be verified before returning the first envelope violation');
  assert.match(worker, /unsound[\s\S]{0,260}unrecoverable:\s*true[\s\S]{0,260}(?:zero|0)[\s\S]{0,120}recovery attempts/i,
    'an unsound overview must veto recovery with zero attempts');
});

test('overview recovery re-dispatches eligible failures inside the shared attempt pool', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /validation[\s\S]{0,180}generation[\s\S]{0,180}dispatch[\s\S]{0,240}re-dispatch/i,
    'validation, generation, and dispatch failures should all permit overview re-dispatch');
  assert.match(worker, /re-dispatch[\s\S]{0,240}(?:existing|same)[\s\S]{0,100}attempt/i,
    'overview recovery should stay inside the existing attempt');
  assert.match(worker, /(?:no|without|never)[\s\S]{0,180}(?:second|additional)[\s\S]{0,160}(?:ordinary )?regeneration allowance/i,
    'overview recovery must not open a second ordinary regeneration allowance');
});

test('verified recovery commits current overview state and preserves incomplete-state accounting', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /verified recovery completion[\s\S]{0,300}overview\.state:\s*current/i,
    'verified recovery completion should commit overview.state: current');
  assert.match(worker, /current[\s\S]{0,300}(?:clear|clears|cleared)[\s\S]{0,160}(?:both|failure_kind[\s\S]{0,80}failure_details)/i,
    'verified recovery completion should clear both overview diagnostics');
  assert.match(worker, /ordered[\s-]+changed[-_]file union[\s\S]{0,240}\.openspec\.yaml/i,
    'durable metadata should enter the ordered changed-file union');
  assert.match(worker, /(?:first materialization|first-materialization)[\s\S]{0,300}failed[\s\S]{0,240}(?:regeneration|re-generation)[\s\S]{0,220}stale/i,
    'incomplete recovery should retain failed versus stale state mapping');
  assert.match(worker, /(?:failure class|failure_class)[\s\S]{0,220}(?:attempts spent|attempt ordinal|attempts)[\s\S]{0,220}(?:stopping reason|reason for stopping)/i,
    'incomplete recovery should report class, attempts spent, and stopping reason');
});

test('composition scopes the recovery pool per adapter segment and keeps the changed-files union across transitions', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /segment-scoped|active adapter segment/i,
    'recovery pool must be segment-scoped under composition');
  assert.match(runner, /(?:segment-scoped|per[- ]segment)[\s\S]{0,220}(?:diagnos(?:is|es)|ledger)/i,
    'the distinct-diagnosis ledger must be scoped to the active segment');
  assert.match(runner, /fresh[\s\S]{0,80}three[- ]attempt|fresh[\s\S]{0,80}pool/i,
    'a later recovery_policy: true segment must receive a fresh three-attempt pool');
  assert.match(runner, /(?:shall not|must not|does not|never)[\s\S]{0,120}inherit[\s\S]{0,120}(?:depleted|exhausted|remaining)/i,
    'a later segment must not inherit a depleted budget');
  assert.match(runner, /changed[-_ ]files[\s\S]{0,200}(?:across|span)[\s\S]{0,120}(?:transition|segment)/i,
    'the changed-files union must continue across segment transitions');
  assert.match(runner, /(?:shall not|must not|never)[\s\S]{0,80}reset[\s\S]{0,80}(?:at a )?transition/i,
    'the union must not reset at a transition');
});

test('design overview repair has one phase-static registry and deterministic match matrix', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /design-overview-repair/,
    'the command runner must register the design-overview-repair diagnosis');
  assert.match(runner, /phase[- ]static[\s\S]{0,260}(?:registry|match matrix)|(?:registry|match matrix)[\s\S]{0,260}phase[- ]static/i,
    'the repair registry must be phase-static');
  assert.match(runner, /(?:dual|two)[\s\S]{0,180}(?:inspection|evidence)[\s\S]{0,180}(?:channel|path)/i,
    'matching must inspect both diagnosis channels');
  assert.match(runner, /determin(?:istic|istically)/i,
    'the phase-static match algorithm must be deterministic');
  assert.match(runner, /(?:match|matching)[\s-]+algorithm/i,
    'the registry must define a match algorithm');
  assert.match(runner, /(?:mandatory|required)[\s\S]{0,180}primary[- ]path[\s\S]{0,180}(?:evidence|changed_files)|primary[- ]path[\s\S]{0,180}(?:evidence|changed_files)[\s\S]{0,180}(?:mandatory|required)/i,
    'a successful match must require primary-path evidence');
  assert.match(runner, /openspec\/changes\/\{change-name\}\/change-overview\.md/,
    'the registry must use the change overview as its primary path');
  assert.match(runner, /(?:optional|secondary)[\s\S]{0,260}\.openspec\.yaml|\.openspec\.yaml[\s\S]{0,260}(?:optional|secondary)/i,
    'the durable metadata path must be optional');
  assert.match(runner, /overview-generation-repair/,
    'the registry must name the overview-generation-repair lifecycle point');
  assert.match(runner, /design-worker-overview-repair/,
    'the registry must name the design-worker-overview-repair boundary');
  assert.match(runner, /(?:accepted|allowed|eligible)[\s\S]{0,260}validation[\s\S]{0,260}generation[\s\S]{0,260}dispatch/i,
    'the registry must enumerate validation, generation, and dispatch as accepted classes');
  assert.match(runner, /(?:successful|success)[\s\S]{0,300}(?:diagnosis[-_ ]key)[\s:=`]*design-overview-repair|diagnosis[-_ ]key[\s:=`]*design-overview-repair[\s\S]{0,300}(?:successful|success)/i,
    'a successful match must return the registered diagnosis key');
});

test('design overview repair rejects incomplete or prose-derived matches and has no duplicate registry table', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /(?:(?:missing|absent)[\s\S]{0,160}changed_files|changed_files[\s\S]{0,160}(?:missing|absent))[\s\S]{0,180}unresolved/i,
    'missing changed_files must remain unresolved');
  assert.match(runner, /(?:empty[\s\S]{0,160}changed_files|changed_files[\s\S]{0,160}empty)[\s\S]{0,180}unresolved/i,
    'empty changed_files must remain unresolved');
  assert.match(runner, /out[- ]of[- ](?:surface|scope)[\s\S]{0,240}unresolved/i,
    'out-of-surface evidence must remain unresolved');
  assert.match(runner, /(?:(?:omitted|missing)[\s\S]{0,180}primary[- ]path|primary[- ]path[\s\S]{0,180}(?:omitted|missing))[\s\S]{0,240}unresolved/i,
    'omitted primary-path evidence must remain unresolved');
  assert.match(runner, /(?:(?:non[- ]accepted|unaccepted|unsupported|ineligible)[\s\S]{0,180}(?:failure[_ -]?class|class)|(?:failure[_ -]?class|class)[\s\S]{0,180}(?:non[- ]accepted|unaccepted|unsupported|ineligible))[\s\S]{0,240}unresolved/i,
    'a non-accepted failure class must remain unresolved');
  assert.match(runner, /(?:summary[\s_-]+prose|prose[\s\S]{0,80}summary)[\s\S]{0,220}(?:not|never|cannot|must not)[\s\S]{0,180}(?:cause[\s_-]*locus|locus)/i,
    'summary prose must never supply a Cause Locus');

  const walkMarkdown = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdown(entryPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
  });
  const runnerPath = path.join(repoRoot, 'sai', 'orchestration', 'command-runner.md');
  for (const markdownPath of walkMarkdown(path.join(repoRoot, 'sai'))) {
    if (markdownPath === runnerPath) continue;
    const contents = fs.readFileSync(markdownPath, 'utf8');
    assert.doesNotMatch(contents, /^\s*\|[^\n]*design-overview-repair[^\n]*\|/im,
      `no duplicate design-overview-repair registry table is allowed outside command-runner: ${path.relative(repoRoot, markdownPath)}`);
  }
});

test('worker-core keeps routing diagnosis coordinator-only and closes an unpassable apply RED/GREEN STOP as a worker failure', () => {
  const lifecycle = artifact('sai/orchestration/worker-core.md');
  const failureStart = lifecycle.indexOf('The post-resolution');
  const failureEnd = lifecycle.indexOf('The design-only notice', failureStart);
  assert.ok(failureStart >= 0 && failureEnd > failureStart,
    'worker-core should expose the post-resolution worker failure envelope');
  const workerFailure = lifecycle.slice(failureStart, failureEnd);

  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const coordinatorOwnership = '(?:coordinator[- ]only|coordinator[- ]owned|coordinator[- ]authored|only the coordinator)';
  for (const field of ['routing diagnosis', 'Cause Locus', 'diagnosis_key']) {
    const escapedField = escapeRegExp(field);
    assert.match(lifecycle,
      new RegExp(`(?:${escapedField}[\\s\\S]{0,260}${coordinatorOwnership}|${coordinatorOwnership}[\\s\\S]{0,260}${escapedField})`, 'i'),
      `${field} must be coordinator-only`);
  }

  assert.match(workerFailure, /failure_class/, 'worker failures must retain failure_class');
  assert.match(workerFailure, /unrecoverable:\s*boolean/, 'worker failures must retain boolean unrecoverable');
  assert.doesNotMatch(workerFailure, /^\s*(?:routing[_ -]?diagnosis|cause[_ -]?locus|diagnosis[_ ]key)\s*:/im,
    'the worker-authored failure envelope must not add a routing diagnosis field');

  assert.match(lifecycle,
    /(?:unpassable[\s\S]{0,260}(?:RED[\s\S]{0,120}GREEN|GREEN[\s\S]{0,120}RED)[\s\S]{0,260}STOP|(?:RED[\s\S]{0,120}GREEN|GREEN[\s\S]{0,120}RED)[\s\S]{0,260}unpassable[\s\S]{0,260}STOP)/i,
    'an unpassable RED/GREEN run must reach the STOP path');
  assert.match(lifecycle, /status:\s*failed/i,
    'the unpassable STOP must return status failed');
  assert.match(lifecycle, /failure_class:\s*blocking-contradiction/i,
    'the unpassable STOP must return failure_class blocking-contradiction');
  assert.match(lifecycle, /unrecoverable:\s*boolean/i,
    'the unpassable STOP must return boolean unrecoverable');
  assert.match(lifecycle, /(?:concrete[\s\S]{0,100}evidence|evidence[\s\S]{0,100}concrete)/i,
    'the unpassable STOP must retain concrete evidence');
  assert.match(lifecycle, /(?:STOP reached\?[\s\S]{0,120}\byes\b|\byes\b[\s\S]{0,120}STOP reached\?)/i,
    'the apply report must mark STOP reached as yes');
});

test('worker-core states failure_class is evidence not an eligibility gate and stays lifecycle-only', () => {
  const lifecycle = artifact('sai/orchestration/worker-core.md');
  assert.match(lifecycle, /failure_class[\s\S]{0,260}(?:not[\s\S]{0,80}(?:eligibility|gate)|prior|diagnostic)/i,
    'failure_class must be diagnostic evidence, not the recovery eligibility gate');
  assert.match(lifecycle, /(?:not[\s\S]{0,120}persist|lifecycle[- ]only|not[\s\S]{0,80}(?:written|write)[\s\S]{0,80}artifact)[\s\S]{0,200}(?:failure_class|unrecoverable|diagnosis)/i,
    'classification and recovery metadata must not be persisted into artifacts');
  assert.match(lifecycle, /outer-envelope-violation[\s\S]{0,200}(?:coordinator|never a worker)/i,
    'outer-envelope-violation remains coordinator-only');
});

test('planning clean path stays blind while non-clean path names class artifact and cause locus', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  const specCoord = artifact('sai/commands/spec/coordinator.md');
  const designCoord = artifact('sai/commands/design/coordinator.md');
  const contract = `${runner}\n${specCoord}\n${designCoord}`;

  assert.match(specCoord, /(?:clean|happy path|progress|needs_input)[\s\S]{0,300}(?:not|never|do not)[\s\S]{0,120}(?:read|open|inspect)[\s\S]{0,120}artifact/i,
    'spec clean path never opens artifacts');
  assert.match(designCoord, /(?:clean)[\s\S]{0,300}(?:not|never|do not|shall not)[\s\S]{0,120}(?:read|inspect)[\s\S]{0,120}artifact/i,
    'design clean path never opens artifacts');
  assert.match(specCoord, /non[- ]clean[\s\S]{0,400}(?:failure_class|class)[\s\S]{0,400}(?:artifact|cause locus|Cause Locus)/i,
    'spec non-clean diagnosis names class/artifact/locus when evidence permits');
  assert.match(designCoord, /non[- ]clean[\s\S]{0,400}(?:failure_class|class)[\s\S]{0,400}(?:artifact|cause locus|Cause Locus)/i,
    'design non-clean diagnosis names class/artifact/locus when evidence permits');
  assert.match(contract, /(?:never|not|shall not)[\s\S]{0,120}(?:write|repair)[\s\S]{0,200}(?:proposal|design\.md|artifact)/i,
    'planning coordinators never become artifact writers');
  assert.equal((runner.match(/\| design-overview-repair \|/g) || []).length, 1,
    'sole design-overview-repair registry row');
});

test('ordinary cancellation remains a clean stop outside Explore Auto item 10', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery/i,
    'ordinary cancellation must retain the existing clean-stop/no-recovery pin');
  assert.match(runner,
    /(?:ordinary|normal)[\s\S]{0,220}cancelled[\s\S]{0,260}(?:clean[- ]stop|clean stop)[\s\S]{0,220}(?:outside|except)[\s\S]{0,220}Explore Auto item[- ]?10/i,
    'ordinary cancellation must remain a clean stop outside the Explore Auto item-10 exception');
  assert.match(runner,
    /Explore Auto item[- ]?10[\s\S]{0,320}(?:does not|never|must not)[\s\S]{0,140}(?:spend|consume|count against|draw from|debit)[\s\S]{0,140}(?:the )?(?:shared )?(?:diagnosis|recovery) ledger/i,
    'the Explore Auto item-10 exception must not spend the shared recovery ledger');
});

test('Explore Auto item-10 cancellation is a named one-shot diagnosable exception', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /selector[- ]dispatched[\s\S]{0,180}Explore Auto item[- ]?10/i,
    'the exception must name selector-dispatched Explore Auto item-10');
  assert.match(runner,
    /Explore Auto item[- ]?10[\s\S]{0,420}(?:cancelled|cancellation)[\s\S]{0,240}(?:may|can|eligible)[\s\S]{0,120}Diagnosis Round/i,
    'cancelled Explore Auto item-10 may enter Diagnosis Round');
  assert.match(runner, /diagnosis_rounds/,
    'the Explore exception must reference diagnosis_rounds');
  assert.match(runner,
    /(?:at most one|one[- ]shot|single)[\s\S]{0,180}same[- ]worker[\s\S]{0,180}(?:re[- ]dispatch|redispatch)/i,
    'the exception permits at most one same-worker re-dispatch');
  assert.match(runner,
    /Explore Auto item[- ]?10[\s\S]{0,520}(?:never|no|must not|shall not)[\s\S]{0,180}replacement worker/i,
    'the exception must never dispatch a replacement worker');
});

test('Explore continuation loss after diagnosis is terminal without replacement', () => {
  const runner = artifact('sai/orchestration/command-runner.md');

  assert.match(runner, /continuation\/transport loss/i,
    'continuation/transport loss must remain a named diagnosis');
  assert.match(runner,
    /Explore[\s\S]{0,360}(?:Diagnosis Round|diagnosis)[\s\S]{0,300}continuation\/transport loss[\s\S]{0,240}(?:terminal|terminate|closed)/i,
    'Explore diagnosis continuation loss must be terminal');
  assert.match(runner,
    /Explore[\s\S]{0,520}(?:Diagnosis Round|diagnosis)[\s\S]{0,360}continuation\/transport loss[\s\S]{0,220}(?:never|no|must not|shall not)[\s\S]{0,180}replacement/i,
    'Explore diagnosis continuation loss must never use a replacement worker');
  assert.match(runner,
    /(?:retryable|can be retried|remains retryable)[\s\S]{0,240}(?:later|next)[\s\S]{0,180}(?:Auto|automatic)[\s\S]{0,120}selection/i,
    'the change must remain retryable for later Auto selection');
});
