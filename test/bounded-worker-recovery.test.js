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

test('shared recovery policy owns a three-slot ledger of distinct diagnosis keys', () => {
  const policy = artifact('sai/policies/bounded-recovery.md');
  assert.match(policy, /recovery_policy/);
  assert.match(policy, /continue_after_recovery/);
  assert.match(policy, /(?:three|3)[\s-]+(?:slot|diagnosis)/i,
    'recovery must expose three diagnosis slots');
  assert.match(policy, /distinct[- ]diagnos(?:is|es)/i,
    'the recovery budget must be consumed by distinct diagnoses');
  assert.match(policy, /ledger/i,
    'recovery must retain a diagnosis ledger');
  assert.match(policy, /diagnosis[_ ]key[\s:=`]*[\s\S]{0,220}(?:tuple|\([^)]*failure[_ ]class[^)]*cause[_ ]locus[^)]*\))/i,
    'each diagnosis must have a tuple key containing failure_class and Cause Locus');
  assert.match(policy, /(?:(?:duplicate|already[- ]seen)[\s\S]{0,180}(?:before|prior to)[\s\S]{0,100}dispatch|(?:before|prior to)[\s\S]{0,100}dispatch[\s\S]{0,180}(?:duplicate|already[- ]seen))/i,
    'duplicate diagnoses must be rejected before dispatch');
  assert.match(policy, /failure[_ ]class[\s\S]{0,220}(?:(?:prior)[\s\S]{0,120}(?:not|never)[\s\S]{0,80}gate|(?:not|never)[\s\S]{0,80}gate[\s\S]{0,120}prior)/i,
    'failure_class is a prior, not the recovery gate');
  assert.match(policy, /same[- ]worker/i);
  assert.match(policy, /recovery[\s\S]{0,400}(?:never|no)[\s\S]{0,120}replacement/i);
  assert.match(policy, /outer-envelope-violation/);
});

test('recovery routes Cause Locus diagnoses through dual inspection channels', () => {
  const policy = artifact('sai/policies/bounded-recovery.md');
  const orchestrationSpec = artifact('openspec/specs/orchestration-core/spec.md');
  const contract = `${policy}\n${orchestrationSpec}`;

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

test('planning non-clean inspection boundary and adapter surface declaration live in the recovery policy', () => {
  const policy = artifact('sai/policies/bounded-recovery.md');

  assert.match(policy, /non[- ]clean[\s\S]{0,200}(?:failed|closure)/i,
    'runner must name the non-clean closure route');
  assert.match(policy, /(?:standalone|planning)[\s\S]{0,200}(?:adapter|inspection)/i,
    'runner must address standalone/planning adapters');
  assert.match(policy, /(?:worker[- ]owned|artifact surface|authorized read set)/i,
    'adapters must declare a worker-owned artifact surface / authorized read set');
  assert.match(policy, /same[- ]worker/i,
    'same-worker correction must remain named');
  assert.match(policy, /(?:clean[\s\S]{0,120}(?:completed|needs_input|cancelled|progress|notice)|artifact[- ]blind)/i,
    'clean-route blindness must be retained');
  assert.match(policy, /(?:ephemeral|conversation state|not[\s\S]{0,80}(?:written|persisted)[\s\S]{0,80}(?:artifact|metadata))/i,
    'diagnosis must remain ephemeral — no durable recovery markers');
});

test('channel selection is per cause surface with no unresolved static fallback', () => {
  const policy = artifact('sai/policies/bounded-recovery.md');

  assert.match(policy, /(?:per[- ](?:cause[- ])?surface|cause surface)/i,
    'channel selection must be per cause surface');
  assert.match(policy, /authorized\s+read set/i,
    'inspection applies when the cause surface is in the authorized read set');
  assert.match(policy, /no fallback to a\s+static row/i,
    'authorized-but-unresolved inspection must not fall back to a static row');
  assert.match(policy, /channel selection[\s\S]{0,200}(?:before|precedes)[\s\S]{0,120}(?:key|diagnosis)/i,
    'channel selection must precede key derivation');
  assert.doesNotMatch(policy, /design-overview-repair|Static registry/,
    'the design overview registry is retired with the design phase recovery');
});
test('recovery preserves ordinary continuation fallback and invocation accounting', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  const policy = artifact('sai/policies/bounded-recovery.md');
  assert.match(policy, /outside recovery[\s\S]{0,260}(?:replacement|fallback)/i);
  assert.match(runner, /changed_files[\s\S]{0,260}(?:first-seen|ordered)[\s\S]{0,260}(?:never|not)[\s\S]{0,80}reset/i);
  assert.match(policy, /needs_input[\s\S]{0,300}(?:exit|resume)[\s\S]{0,180}(?:normal|input)/i);
  assert.match(policy, /cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery/i);
  assert.match(policy, /--fast-track[\s\S]{0,180}(?:neither|not|same)[\s\S]{0,180}(?:pool|recovery)/i);
});

test('recovery reporting is conversational and never mutates progress plan state', () => {
  const policy = artifact('sai/policies/bounded-recovery.md');
  assert.match(policy, /failure class[\s\S]{0,220}(?:1|2|3)[\s\S]{0,100}of 3/i);
  assert.match(policy, /attempts spent|attempt count/i);
  assert.match(policy, /recovery[\s\S]{0,260}(?:does not|never)[\s\S]{0,180}(?:mark|extend|rename|add)[\s\S]{0,120}progress/i);
});

test('active orchestration capability declares the optional recovery seam', () => {
  const spec = artifact('openspec/specs/orchestration-core/spec.md');
  assert.match(spec, /optional static `recovery_policy`/);
  assert.match(spec, /continue_after_recovery/);
  assert.match(spec, /never dispatch a replacement worker from that recovery path/i);
});

test('composition scopes the recovery pool per recovery scope and keeps the changed-files union across transitions', () => {
  // Composition rules live in composition.md, layered on the runner (ADR 0187).
  const runner = `${artifact('sai/orchestration/command-runner.md')}
${artifact('sai/orchestration/composition.md')}`;
  const policy = artifact('sai/policies/bounded-recovery.md');
  const composed = `${runner}\n${policy}`;
  assert.match(composed, /recovery scope|segment-scoped|active adapter segment/i,
    'the recovery pool must be scoped to the active recovery scope');
  assert.match(composed, /(?:recovery[- ]scope|segment-scoped|per[- ]segment)[\s\S]{0,260}(?:diagnos(?:is|es)|ledger)/i,
    'the distinct-diagnosis ledger must be scoped to the active recovery scope');
  assert.match(policy, /entry to each recovery scope/i,
    'the ledger must reset on entry to each recovery scope');
  assert.match(policy, /on entry to each Step[\s\S]{0,160}composition-segment boundary/i,
    'the reset boundary must be the Step for a Step-executing adapter and the segment otherwise');
  assert.match(composed, /fresh[\s\S]{0,80}three[- ](?:attempt|slot)|fresh[\s\S]{0,80}pool/i,
    'a later recovery_policy: true segment must receive a fresh three-attempt pool');
  assert.match(composed, /(?:shall not|must not|does not|never)[\s\S]{0,120}inherit[\s\S]{0,120}(?:depleted|exhausted|remaining|spent)/i,
    'a later segment must not inherit a depleted budget');
  assert.match(composed, /changed[-_ ]files[\s\S]{0,200}(?:across|span)[\s\S]{0,120}(?:transition|segment)/i,
    'the changed-files union must continue across segment transitions');
  assert.match(composed, /(?:shall not|must not|never)[\s\S]{0,80}reset[\s\S]{0,80}(?:at a )?transition/i,
    'the union must not reset at a transition');
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

test('cancellation remains a clean stop and the policy carries no Explore Plan exception', () => {
  const policy = artifact('sai/policies/bounded-recovery.md');

  assert.match(policy, /cancelled[\s\S]{0,180}(?:never|no)[\s\S]{0,120}recovery/i,
    'cancellation must retain the existing clean-stop/no-recovery pin');
  assert.doesNotMatch(policy, /Explore Plan \(unattended\) item[- ]?10/i,
    'the Explore Plan item-10 exception is retired with the Plan supervision');
  assert.doesNotMatch(policy, /diagnosis_rounds\.(?:spec|design)/,
    'the spec and design diagnosis counters are retired');
});

test('Cause Locus is decided by ownership rather than by the kind of artifact', () => {
  const policy = artifact('sai/policies/bounded-recovery.md');

  assert.match(policy, /`out-of-scope` is decided by\s*\n?\s*ownership/i,
    'out-of-scope must be defined by ownership, not by artifact kind');
  assert.doesNotMatch(policy, /`out-of-scope` means that\s*\n?\s*the cause is in a test/i,
    'a test must no longer be enumerated as an out-of-scope artifact kind');
  assert.match(policy, /cause located in a test file is therefore\s*\n?\s*`owner-in-run`/i,
    'a test-located cause with a resumable test owner must be owner-in-run');
  assert.match(policy, /never to a worker whose contract forbids\s*\n?\s*test files/i,
    'a test-located cause must never be routed to a worker forbidden from test files');
});
