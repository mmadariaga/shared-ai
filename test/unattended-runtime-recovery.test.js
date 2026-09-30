const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function section(document, title) {
  const start = document.indexOf(`## ${title}\n`);
  assert.notEqual(start, -1, `missing section: ${title}`);
  const bodyStart = start + `## ${title}\n`.length;
  const nextHeading = document.indexOf('\n## ', bodyStart);
  return compact(document.slice(bodyStart, nextHeading === -1 ? undefined : nextHeading));
}

test('recovery is reached from both selected unattended routes, not POC or other selectors', () => {
  const policyPath = 'sai/policies/unattended-runtime-recovery.md';
  const policy = read(policyPath);
  const plan = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  const directBuild = read('sai/commands/explore/steps/pipeline-direct-build.md');
  const selector = read('sai/commands/explore/steps/route-selector.md');
  const pocLane = read('sai/commands/explore/steps/poc-lane.md');
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  const policyProjection = manifest.projections.find(({ id }) => id === 'sai-policies');

  assert.ok(policy.length > 0, `${policyPath} should exist and have content`);
  assert.match(plan, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.match(directBuild, /For the full `direct-build-unattended` route only, Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.match(directBuild, /Do not load or apply it to the pinned `--no-specs` POC profile/);
  assert.doesNotMatch(selector, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.doesNotMatch(pocLane, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.deepEqual(policyProjection.harnesses, ['claude', 'opencode']);
  assert.equal(policyProjection.recursive, true);
});

test('runtime repair follows dispatch, validation, accepted-result, and one-shot execution precedence', () => {
  const precedence = section(read('sai/policies/unattended-runtime-recovery.md'), 'Precedence');
  const dispatch = precedence.indexOf('Dispatch and pre-ready failures');
  const replacement = precedence.indexOf('For a failed continuation');
  const validation = precedence.indexOf('For every returned payload');
  const acceptedResult = precedence.indexOf('A valid worker result');
  const oneShot = precedence.indexOf("Direct Build's backfill and archive execution orders use their role-specific one-shot contracts");
  const runtimeRepair = precedence.indexOf('Only an unaccepted, post-disclosure runtime interruption');

  assert.ok(dispatch >= 0 && dispatch < replacement && replacement < validation && validation < acceptedResult && acceptedResult < oneShot && oneShot < runtimeRepair,
    'existing dispatch, transport, validation, accepted-result, and execution handling must precede generic repair');
  assert.match(precedence, /invalid payload supplies no accepted status, trusted progress, or trusted `changed_files`/);
  assert.match(precedence, /A replacement is not a repair continuation/);
  assert.match(precedence, /do not use runtime repair to create, alter, or resend its order/);
  assert.match(precedence, /valid archive failure identified as a backfill-artifact error may use only the route's existing backfill correction\/relaunch path/);
  assert.match(precedence, /A missing or invalid execution result never authorizes that relaunch/);
  assert.match(read('sai/policies/unattended-runtime-recovery.md'), /Never classify an interruption by its name alone/);
});

test('runtime repair charges the existing route diagnosis allowance before continuation and cannot stack retries', () => {
  const budget = section(read('sai/policies/unattended-runtime-recovery.md'), 'Shared recovery budget');
  const charge = budget.indexOf("Charge the route's existing counter immediately before attempting the continuation");
  const planCounter = budget.indexOf('`diagnosis_rounds.spec` or `diagnosis_rounds.design`');
  const directBuildCounter = budget.indexOf('`diagnosis_rounds.direct_build.direct-build`');
  const nonRefund = budget.indexOf('does not refund or reset the charge');
  const mutualExclusion = budget.indexOf('Whichever is first consumes it');
  const reset = budget.indexOf('Reset them only where the existing route resets its diagnosis state');
  const continuation = read('sai/policies/unattended-runtime-recovery.md').indexOf('Continue only a worker whose existing contract accepts');

  assert.ok(charge >= 0 && charge < nonRefund && nonRefund < planCounter && planCounter < directBuildCounter && directBuildCounter < mutualExclusion && mutualExclusion < reset,
    'the existing phase/slice counter is charged before continuation and its reset boundary is explicit');
  assert.ok(charge < continuation, 'charge the allowance before attempting any compatible worker continuation');
  assert.match(budget, /`diagnosis_rounds\.direct_build\.direct-build` for the implementer scope across Steps 1–2 of the active slice\. It is one allowance across that worker's implementation and functional-fix stretches, not one per step/);
  assert.match(budget, /A delivery failure, repeated error, or malformed result does not refund or reset the charge/);
  assert.match(budget, /Do not reset these counters on progress, a question answer, a worker continuation, a review\/fix round, a transport retry, a replacement, or a Direct Build step transition/);
  assert.match(budget, /An existing route diagnosis or \*\*Bounded Recovery\*\* continuation for the same Plan phase or Direct Build implementer scope uses this same one-shot allowance/);
  assert.match(budget, /A fresh valid result after repair is still validated and classified normally, but a second non-clean result from that same worker scope stops/);
  assert.match(budget, /dispatch-retry limit, replacement limit, three-round review\/fix limits, and mutation gates remain unchanged/);
  assert.match(budget, /Runtime repair never retries a dispatch, creates a replacement, extends a review\/fix loop, or resets any of those limits/);
});

test('only worker-supported continuations are allowed; unsupported mutation roles stop without replay', () => {
  const policy = read('sai/policies/unattended-runtime-recovery.md');
  const workers = section(policy, 'Worker-compatible continuation');

  assert.match(workers, /`sai-1-spec-proposal-worker` and `sai-2-design-worker` accept the existing `continue_after_recovery` record/);
  assert.match(workers, /`sai-direct-build-worker` accepts the policy-authorized same-worker verification note/);
  assert.ok(workers.includes('**Direct Build backfill worker `sai-backfill-worker` (Steps 3 and 6):** no generic runtime-repair note is authorized'));
  assert.ok(workers.includes('**Direct Build archive worker `sai-archive-worker` (Steps 7 and 8):** no generic runtime-repair note is authorized'));
  assert.match(workers, /never refires an order after a partial mutation/);
  assert.match(workers, /Never replay the archive, staging, or commit operation over partial or unknown effects/);
  assert.match(workers, /A valid named backfill-artifact failure follows only the route's existing backfill correction\/relaunch path/);
  assert.match(workers, /If the active worker has no compatible continuation above, recovery is ineligible/);
  assert.match(workers, /Do not dispatch a replacement, resend the original task as a new dispatch, or repair the result on the coordinator's behalf/);
});

test('Direct Build runtime repair policy and implementer contract agree on the verification note', () => {
  const policy = compact(section(read('sai/policies/unattended-runtime-recovery.md'), 'Worker-compatible continuation'));
  const worker = compact(read('sai/commands/explore/direct-build-worker.md'));
  const notePolicy = policy.slice(policy.indexOf('Direct Build implementer (Steps 1–2):'), policy.indexOf('Direct Build backfill worker'));
  const noteStart = worker.indexOf('**Runtime-repair verification note.**');
  const noteEnd = worker.indexOf('## Lifecycle', noteStart);
  const noteContract = worker.slice(noteStart, noteEnd);

  assert.ok(notePolicy.includes('`sai-direct-build-worker` accepts the policy-authorized same-worker verification note defined in its worker contract'));
  for (const detail of [
    'verified current effects',
    'one reversible correction within the crystallized block',
    'one concrete verification check',
  ]) {
    assert.ok(notePolicy.includes(detail), `policy should specify ${detail}`);
    assert.ok(noteContract.includes(detail), `worker contract should accept ${detail}`);
  }
  assert.match(noteContract, /adds no requirement or task, authorizes no artifact outside the block's existing scope, and grants no new mutation authority/);
  assert.match(noteContract, /Do not use it for deletion or a destructive, irreversible, or shared-system action/);
  assert.match(noteContract, /If the effects, scope, reversibility, or check cannot be established, make no correction/);
  assert.match(noteContract, /does not change the ordered-findings continuation or its route-owned round limit/);
  assert.match(noteContract, /nor does it add a result status or payload field/);
  assert.match(worker, /Explore reviews the resulting diff against the block's Capabilities and Edge Cases and continues THIS same worker with findings when correction is needed/);
  assert.match(worker, /A continuation payload is an ordered finding list \(or a verification note\); apply exactly the listed corrections within the block's scope/);
  assert.match(worker, /Every run closes with exactly one terminal lifecycle status/);
  assert.match(worker, /duplicate-free `changed_files` union of every path created or modified across all rounds of this worker instance/);
});

test('fresh validation precedes advancement and exhaustion stops without a routine question', () => {
  const policy = read('sai/policies/unattended-runtime-recovery.md');
  const normalizedPolicy = compact(policy);
  const advance = normalizedPolicy.indexOf('Advance a phase, step, or slice only when its ordinary completion conditions pass');
  const validation = normalizedPolicy.indexOf('Validate the fresh result with the active validator before acting on it');
  const stop = section(policy, 'Stop condition');

  assert.ok(validation >= 0 && advance >= 0 && validation < advance,
    'the repaired result must pass active validation before phase or step progress');
  assert.ok(normalizedPolicy.includes("Union only paths established by the route's normal evidence rules"));
  assert.match(stop, /Exhaustion or failure of this continuation does not fall through to another retry, diagnosis, or replacement for the same work/);
  assert.match(stop, /Do not ask a routine "how should I proceed\?" question/);
  assert.match(stop, /this policy grants no new authorization/);
});

test('recovery preserves Plan review stops and Direct Build selection, execution-order, and commit gates', () => {
  const plan = compact(read('sai/commands/explore/steps/pipeline-plan-unattended.md'));
  const directBuild = compact(read('sai/commands/explore/steps/pipeline-direct-build.md'));
  const stop = section(read('sai/policies/unattended-runtime-recovery.md'), 'Stop condition');

  assert.match(plan, /A successful Plan \(unattended\) run.*?review here → `\/sai-build \{name\}` in another chat.*?performs no implementation-phase dispatch/);
  assert.match(plan, /`\/sai-3-implement` is never dispatched/);
  assert.match(directBuild, /Selecting it consents delegated writes \(item 1\) AND pre-authorizes one local commit for the current slice/);
  assert.match(directBuild, /after coordinator validation, gate resolution, and the one-commit authorization state are all present/);
  assert.match(directBuild, /never push, amend, retry, or add an action outside the order/);
  assert.match(stop, /Keep the Plan approval\/review stop and Direct Build's selected-scope, validated execution-order, and one-local-commit gates unchanged/);
});
