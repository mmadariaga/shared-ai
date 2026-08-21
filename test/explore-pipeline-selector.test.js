'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const exploreSources = [
  'sai/commands/explore/instructions.md',
  'sai/commands/explore/body.md',
  'commands/claude/sai-explore.md',
  'commands/opencode/sai-explore.md',
];

function exploreContract() {
  return exploreSources.map(relativePath => {
    const fullPath = path.join(repoRoot, relativePath);
    assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
    return fs.readFileSync(fullPath, 'utf8');
  }).join('\n');
}

function spec(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function supervisionContract() {
  return [
    exploreContract(),
    spec('sai/policies/artifact-feedback-gate.md'),
    spec('sai/policies/artifact-review-contract.md'),
  ].join('\n');
}

test('supervision is entered only through the crystallization-close selector', () => {
  const source = exploreContract();

  assert.doesNotMatch(source, /start-pipeline/);
  assert.match(source, /There is no literal pipeline token/i);
  assert.match(source, /entered \*\*only\*\* through this selector/i);
  assert.match(source, /no token form is recognized/i);
  assert.match(source, /Crystallization-close selector/);
});

test('the selector closes every crystallization emission through the authoritative shared close', () => {
  const source = exploreContract();
  const sharedCloseSpec = spec('openspec/specs/explore-crystallization-block/spec.md');
  const selectorSpec = spec('openspec/specs/explore-pipeline-selector/spec.md');

  assert.match(source, /items 5, 6, and 7 \u2014 closes its turn with exactly one selector/i);
  assert.match(source, /after the final `Ready to Propose` block and after the keep-window-open recommendation/i);
  assert.match(source, /exactly two options, in this fixed order/i);
  assert.match(source, /\*\*Auto\*\* \u2014 delegate supervised `sai-1` \+ `sai-2` execution/);
  assert.match(source, /\*\*Manual\*\* \u2014 exit the pipeline path and continue by hand/);
  assert.match(source, /AskUserQuestion on Claude Code|`AskUserQuestion` on Claude Code/i);
  assert.match(source, /`question` tool on opencode/i);
  assert.match(source, /remember\.md`? \(L10\u201315\)/);

  assert.match(sharedCloseSpec, /one authoritative crystallization-turn close/i);
  assert.match(sharedCloseSpec, /Items 5 \(single change\), 6 \(sliced feature\), and 7 \(inline proposal refusal\)[\s\S]{0,180}reference that definition/i);
  assert.match(selectorSpec, /Selecting `Manual` SHALL dispatch nothing and SHALL NOT change supervision state/i);
  assert.match(selectorSpec, /An unmapped free-text answer MUST be treated as (?:\*\*|`)Manual(?:\*\*|`)/i);
  assert.match(selectorSpec, /[`*]*Manual[`*]* SHALL remain re-invocable without a cap[\s\S]{0,120}selector/i);
  assert.match(selectorSpec, /`--fast-track` SHALL NOT auto-select Auto or suppress the selector/i);
});

test('Manual and unmapped answers preserve the shared close without suppressing re-emission', () => {
  const source = exploreContract();
  const selectorSpec = spec('openspec/specs/explore-pipeline-selector/spec.md');

  assert.match(source, /Selecting \*\*Manual\*\* dispatches nothing[\s\S]{0,180}(?:changes no state value|does not change supervision state)/i);
  assert.match(source, /Manual[\s\S]{0,260}(?:already[- ]emitted|already emitted)[\s\S]{0,180}(?:shared close|keep-window-open recommendation|recommendation)/i);
  assert.match(source, /(?:no|not|without|does not|shall not)[\s\S]{0,80}second recommendation[\s\S]{0,80}(?:and|or)[\s\S]{0,50}selector/i);
  assert.match(selectorSpec, /An unmapped free-text answer MUST be treated as (?:\*\*|`)Manual(?:\*\*|`)/i);
  assert.match(selectorSpec, /[`*]*Manual[`*]* SHALL remain re-invocable without a cap[\s\S]{0,120}selector/i);
  assert.match(selectorSpec, /`--fast-track` SHALL NOT auto-select Auto or suppress the selector/i);
});

test('the selector authorizes the delegated-write exception and is not the removed review picker', () => {
  const source = exploreContract();

  assert.match(source, /the user's explicit selection of the \*\*Auto\*\* option on the crystallization-close pipeline selector/i);
  assert.match(source, /explicit user act that authorizes item 1's delegated-write exception/i);
  assert.match(source, /consent to selection and dispatch only/i);
  assert.match(source, /is \*\*not\*\* the removed global Yes\/No review picker/i);
  assert.match(source, /this review loop stays picker-free at crystallization/i);
});

test('the crystallization closing recommendation names review-loop and no pipeline token', () => {
  const source = exploreContract();

  assert.match(source, /The recommendation names no pipeline token/);
  assert.match(source, /names the literal token `review-loop` exactly once/);
  assert.match(source, /after the final `Ready to Propose` block and after the keep-window-open recommendation/i);
  assert.match(source, /an inline refusal is a crystallization emission and closes exactly like items 5 and 6/i);
});

test('the selector prompt and labels localize while the command literals stay English', () => {
  const source = exploreContract();

  assert.match(source, /question text and both option labels render in the user's language/i);
  assert.match(source, /`review-loop`, `\/sai-1-spec`, and `\/sai-2-design` strings stay verbatim English/);
});

test('supervision tracks ordered unique changes and dispatches only eligible work', () => {
  const source = exploreContract();

  for (const term of [
    /tracked_changes/,
    /completed_changes/,
    /active_change/,
    /ordered unique|duplicate[- ]free|first[- ]emission order/i,
    /empty|completed.*set|already completed/i,
    /Cancel/,
    /one remaining|single remaining|without a picker/i,
    /failed|cancelled.*retry|retryable/i,
    /active.*reject|duplicate starts/i,
  ]) assert.match(source, term);
});

test('supervised spec dispatch preserves the selected block and branches between auto-answer and escalation', () => {
  const source = exploreContract();

  assert.match(source, /SpecWorkerRequest/);
  assert.match(source, /complete emitted Ready to Propose block/);
  assert.match(source, /selected change.*complete.*Ready to Propose|complete.*emitted Ready to Propose/i);
  assert.match(source, /only that complete emitted Ready to Propose block|receives only.*block/i);
  assert.match(source, /needs_input/);
  assert.match(source, /ordered option|options.*order|order.*option/i);
  assert.match(source, /auto[- ]answer/i);
  assert.match(source, /escalat/i);
  assert.match(source, /closed[- ]choice/i);
  assert.match(source, /worker's own offered option values|offered option values.*worker/i);
  assert.match(source, /same worker/);
  assert.match(source, /only.*user.*answer|user's answer/i);
});

test('supervised question autonomy uses qualitative confidence and escalates ambiguity', () => {
  const source = exploreContract();

  assert.match(source, /confidence is judged qualitatively/i);
  assert.match(source, /Ambiguity resolves toward escalation/i);
  assert.match(source, /borderline|unclear/i);
  assert.match(source, /(?:borderline|unclear).*escalat|escalat.*(?:borderline|unclear)/i);
});

test('supervised auto-answers require bounded grounding and escalate ungrounded answers', () => {
  const source = exploreContract();

  assert.match(source, /The answer must be located in the permitted grounding sources/i);
  assert.match(source, /The permitted grounding sources are bounded/i);
  assert.match(source, /conversation-only|ungrounded/i);
  assert.match(source, /(?:conversation-only|ungrounded).*escalat|escalat.*(?:conversation-only|ungrounded)/i);
});

test('below-threshold questions preserve exact worker wording and continue the same worker', () => {
  const source = exploreContract();

  assert.match(source, /Below-threshold questions escalate to the user unchanged/i);
  assert.match(source, /worker's exact question/i);
  assert.match(source, /exact option labels\/values/i);
  assert.match(source, /harness-native picker/i);
  assert.match(source, /selected value.*same worker|same worker.*selected value/i);
  assert.match(source, /same-worker continuation|same worker continuation/i);
});

test('question autonomy is limited to selector-dispatched supervision', () => {
  const source = exploreContract();

  assert.match(source, /Autonomy is scoped to supervised spec execution/i);
  assert.match(source, /selector-dispatched supervision only/i);
  assert.match(source, /independent `?\/sai-1-spec`?/i);
  assert.match(source, /standalone coordinator.*unchanged|unchanged.*standalone coordinator/i);
});

test('each auto-answer emits the interim accountability notice with ordered fields', () => {
  const source = exploreContract();

  assert.match(source, /Auto-answered questions are reported/i);
  assert.match(source, /minimal interim notice at the point of answering|existing minimal interim notice/i);
  assert.match(source, /Auto-answered \(supervised\):.*\u2192.*\n\s+\[grounding:.*\u2014/is);
  assert.match(source, /question.*answer.*grounding.*citation/is);
});

test('supervised autonomy keeps state in conversation and tracks escalations', () => {
  const source = exploreContract();

  assert.match(source, /in-conversation-only|conversation-only state/i);
  assert.match(source, /per-auto-answer record|auto-answer record/i);
  assert.match(source, /question.*answer.*grounding citation/is);
  assert.match(source, /running escalated count/i);
  assert.match(source, /scoped to this selector-dispatched supervision only/i);
});

test('machine feedback continues each actionable finding to the same phase worker', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/instructions.md'), 'utf8');
  const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /MachineFeedbackAdapter/);
  assert.match(source, /sai\/policies\/artifact-feedback-gate\.md/);
  assert.match(source, /needs_input/);
  assert.match(source, /same (?:spec[- ]proposal|spec|design|phase)[- ]?worker/i);

  assert.match(policy, /For each finding.*one same-worker continuation/i);
  assert.match(policy, /per-item legitimacy rules/i);
  assert.match(policy, /artifact-only scope/i);
  assert.match(policy, /decision-summary recomputation/i);
  assert.match(policy, /Accepted changes remain worker-owned.*proposal\.md.*specs/si);
  assert.match(policy, /specific discard reporting|Every discarded finding.*specific reason/i);
});

test('machine feedback cannot enter or advance the user gate or proceed branch', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /emits neither the picker nor the empty-turn prompt/i);
  assert.match(source, /does not consume a user feedback turn/i);
  assert.match(source, /does not increment.*iteration counter/i);
  assert.match(source, /does not execute.*proceed-label.*next-action/i);
});

test('iteration zero offers feedback after the supervised review rounds settle', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /empty findings array is a no-op/i);
  assert.match(source, /Defer the ordinary user-facing gate while another (?:review pass|review round) is required/i);
  assert.match(source, /Present that gate for the first time, unchanged at iteration 0, only after the review (?:round|loop) converges, exhausts? (?:its )?three-round cap, or is interrupted by worker failure\./i);
  assert.match(source, /first ordered labels remain.*Give feedback \(Recommended\).*proceed-label/i);
  assert.match(source, /iteration 0/);
});

test('explore remains read-only and closes with the supervised in-session completion contract', () => {
  const source = exploreContract();

  assert.match(source, /Explore.*no direct write|no direct write/i);
  assert.match(source, /owned change directory|limited to.*change directory/i);
  assert.match(source, /review-loop/);
  assert.match(source, /Crystallization-close selector/);
  assert.match(source, /user[- ]triggered|user triggered|user-selected/i);
  for (const harness of ['Claude Code', 'opencode']) {
    assert.match(source, new RegExp(harness.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(
    source,
    /Supervised sai-1 done in openspec\/changes\/\{name\}\/\./
  );
  assert.doesNotMatch(source, /sai-2 was not run|Independent review and artifact feedback are complete/i);
  assert.match(
    source,
    /(?:spec convergence|spec.*converg|cap exhaustion)[\s\S]{0,200}(?:chain|proceed|continue)[\s\S]{0,120}(?:design|sai-2)/i
  );
  assert.match(source, /Ready to Propose/);
});

test('Claude Code explore adapter permits worker supervision without direct writes', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'commands/claude/sai-explore.md'), 'utf8');

  const allowedToolsLine = source.match(/^allowed-tools:\s*(.+)$/im);
  assert.ok(allowedToolsLine, 'allowed-tools frontmatter should exist');
  const allowedTools = allowedToolsLine[1].split(',').map(tool => tool.trim());

  assert.ok(allowedTools.includes('Agent'));
  assert.ok(allowedTools.includes('SendMessage'));
  assert.ok(allowedTools.includes('Bash(openspec:*)'));
  assert.ok(allowedTools.includes('Bash(git:*)'));
  assert.equal(allowedTools.includes('Edit'), false);
  assert.equal(allowedTools.includes('Write'), false);
  assert.equal(allowedTools.includes('Bash'), false);
});

test('Step 1 explore adapters route only the permitted planning workers', () => {
  const claude = fs.readFileSync(path.join(repoRoot, 'commands/claude/sai-explore.md'), 'utf8');
  const opencode = fs.readFileSync(path.join(repoRoot, 'commands/opencode/sai-explore.md'), 'utf8');
  const launcher = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/launcher.md'), 'utf8');

   assert.match(claude, /Fetch @sai\/adapters\/claude\/idea-list-render\.md/);
   assert.match(claude, /Fetch @sai\/commands\/explore\/launcher\.md/);
   assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/);
   assert.doesNotMatch(claude, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Edit(?:,|\s|$)/m);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Write(?:,|\s|$)/m);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Bash(?:,|\s|$)/m);

     assert.match(opencode, /Fetch @sai\/commands\/explore\/launcher\.md/);
     assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/);
   assert.doesNotMatch(opencode, /Fetch @skills\/sai-1-spec-proposal-worker\/SKILL\.md/);
    assert.doesNotMatch(opencode, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
    assert.doesNotMatch(opencode, /managed coordinator|reviewer[- ](?:binding|skill|agent)/i);

  for (const retiredPath of [
    'commands/copilot/sai-explore.prompt.md',
    'sai/orchestration/inline-invocation.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('opencode explore adapter enables native task dispatch with both numbered planning workers', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'commands/opencode/sai-explore.md'), 'utf8');
  const launcher = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/launcher.md'), 'utf8');

    assert.match(source, /Fetch @sai\/commands\/explore\/launcher\.md/);
    assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/);
    assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/);
   assert.doesNotMatch(source, /Fetch @skills\/sai-1-spec-proposal-worker\/SKILL\.md/);
   assert.doesNotMatch(source, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
   assert.doesNotMatch(source, /sai-coordinator|managed coordinator/i);
   assert.doesNotMatch(source, /reviewer[- ](?:binding|skill|agent)|independent[- ]review.*(?:binding|skill|agent)/i);
});

test('retired Copilot and inline explore surfaces are absent', () => {
  for (const retiredPath of [
    'commands/copilot/sai-explore.prompt.md',
    'sai/orchestration/inline-invocation.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('install manifest projects shared explore assets and routed spec assets only to routed harnesses', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/install-manifest.json'), 'utf8');

  assert.match(source, /Claude Code|claude/i);
  assert.match(source, /opencode/i);
  assert.doesNotMatch(source, /Copilot|copilot/i);
  assert.match(source, /sai-1-spec-proposal-worker/);
  assert.match(source, /shared.*instruction|instruction.*shared|policies/i);
  assert.doesNotMatch(source, /reviewer.*lifecycle|independent.*reviewer.*projection/i);
});

test('direct spec and design wrappers retain their existing terminal contracts', () => {
  const source = [
    'commands/claude/sai-1-spec.md',
    'commands/opencode/sai-1-spec.md',
    'commands/claude/sai-2-design.md',
    'commands/opencode/sai-2-design.md',
  ].map(relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')).join('\n');

  assert.doesNotMatch(source, /start-pipeline|pipeline selector.*adapter|explore.*adapter/i);
  assert.doesNotMatch(source, /independent[- ]reviewer|reviewer[- ]binding/i);
  for (const retiredPath of [
    'commands/copilot/sai-1-spec.prompt.md',
    'commands/copilot/sai-2-design.prompt.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('Step 1 continues every completed-round finding to the same phase worker', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /For every completed review pass in the bounded convergence loop|For every completed review round/i);
  assert.match(feedbackGate, /For each finding in that (?:pass|round), in array order, perform one same-worker continuation/i);
  assert.match(feedbackGate, /Complete all findings for the current (?:pass|round) before supervision evaluates whether another (?:fresh review pass|review round) is required/i);
});

test('Step 1 preserves artifact-only worker ownership and specific discard reasons', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );
  const supervision = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/instructions.md'), 'utf8');

  assert.match(feedbackGate, /Accepted changes remain worker-owned and may be written only by that worker to `proposal\.md` or `specs\/\*\*` in the selected change directory/i);
  assert.match(feedbackGate, /Report every \*\*discarded\*\* item individually[\s\S]{0,240}specific reason/i);
  assert.match(supervision, /The spec worker is the spec phase's only delegated writer: its write scope is limited to `proposal\.md`, `specs\/\*\*`, and permitted metadata in its selected change directory/i);
  assert.match(supervision, /Explore never writes directly/i);
});

test('Step 1 defers the ordinary gate until review convergence, round cap, or interruption', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /Defer the ordinary user-facing gate while another (?:review pass|review round) is required/i);
  assert.match(feedbackGate, /Present that gate for the first time, unchanged at iteration 0, only after the review (?:round|loop) converges, exhausts? (?:its )?three-round cap, or is interrupted by worker failure\./i);
  assert.match(feedbackGate, /Its first ordered labels remain `Give feedback \(Recommended\)` followed by `proceed-label`/i);
});

test('Step 1 gives each routed feedback selection exactly one coordinator-owned text prompt', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /## Parameters[\s\S]{0,500}`artifacts`[\s\S]{0,500}`proceed-label`[\s\S]{0,500}`next-action`/i);
  assert.match(feedbackGate, /routed feedback selection[\s\S]{0,300}coordinator/i);
  assert.match(feedbackGate, /exactly one clean feedback-text prompt/i);
  assert.match(
    feedbackGate,
    /worker[\s\S]{0,180}(?:must not|does not|never)[\s\S]{0,120}(?:emit|present|output)[\s\S]{0,120}(?:feedback|prompt)/i
  );
});

test('Step 1 gives repeated feedback selections independent coordinator prompts without worker prompts', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /each selection[\s\S]{0,240}independent coordinator prompt/i);
  assert.match(feedbackGate, /no additional worker prompt/i);
});

test('Step 1 preserves the feedback heading, iteration labels, language, selection, and machine-feedback semantics', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /## On "Give feedback"/);
  assert.match(feedbackGate, /`Give feedback \(Recommended\)`[\s\S]{0,180}`Give more feedback`/i);
  assert.match(feedbackGate, /render it in the user's language/i);
  assert.match(feedbackGate, /Apply feedback \*\*selectively per item\*\*/i);
  assert.match(feedbackGate, /## Machine-feedback adapter \(supervised (?:sai-1 only|phases)\)/i);
});

test('Step 1 applies routed ownership to sai-1 and sai-2', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /routed[\s\S]{0,240}sai-1[\s\S]{0,240}sai-2/i);
});

test('Step 4 synchronizes the normative artifact feedback gate contract', () => {
  const normative = fs.readFileSync(
    path.join(repoRoot, 'openspec/specs/artifact-feedback-gate/spec.md'),
    'utf8'
  );

  assert.match(normative, /sai\/policies\/artifact-feedback-gate\.md/);
  assert.match(normative, /sai\/policies\/remember\.md/);
  assert.match(normative, /Give feedback \(Recommended\)/i);
  assert.match(normative, /Give more feedback/i);
  assert.match(normative, /exactly one[\s\S]{0,160}routed[\s\S]{0,160}coordinator[\s\S]{0,160}prompt/i);
  assert.match(normative, /sai-2[\s\S]{0,240}Continue[\s\S]{0,240}terminal design navigation/i);

  assert.doesNotMatch(normative, /sai-2 gate coexists with the existing \(b\) confirm without stale re-reads/i);
  assert.doesNotMatch(normative, /\(a\)[\s\S]{0,500}\(b\)[\s\S]{0,500}continuation/i);
});

test('Step 2 reports auto-answered questions at every terminal outcome with grounding citations', () => {
  const source = exploreContract();

  assert.match(source, /Auto-answered questions are reported at every phase ending/i);
  assert.match(source, /convergence.*cap exhaustion.*(?:worker failure|failed|cancelled).*worker/is);
  assert.match(source, /each.*auto[- ]answer.*grounding citation|grounding citation.*each.*auto[- ]answer/is);
});

test('Step 2 reports only the aggregate escalation denominator without escalated question content', () => {
  const source = exploreContract();

  assert.match(source, /The audit log reports the escalation denominator/i);
  assert.match(source, /escalated question content is absent from the audit log/i);
});

test('Step 2 keeps the autonomy audit in conversation and never persists it', () => {
  const source = exploreContract();

  assert.match(source, /The audit log is never persisted/i);
  assert.match(source, /in[- ]conversation text|conversation[- ]only/i);
  assert.match(source, /no file.*artifact.*configuration|never written to any file.*artifact.*config/i);
});

test('Step 2 pins the autonomy audit field order and empty-report form', () => {
  const source = exploreContract();

  assert.match(source, /Autonomy audit.*supervised spec phase/is);
  assert.match(source, /Auto-answered:.*Escalated:/i);
  assert.match(source, /Q:.*A:.*Grounding:/is);
  assert.match(source, /no questions were auto-answered this phase/i);
});

test('supervised pipeline state extends the selector interface by phase with separate round counters', () => {
  const source = supervisionContract();

  for (const field of [
    'tracked_changes',
    'last_crystallization_set',
    'completed_changes',
    'active_change',
    'active_phase',
    'auto_answered',
    'escalated_count',
    'specs_converged_changes',
    'review_rounds',
  ]) assert.match(source, new RegExp(`\\b${field}\\b`));

  assert.match(source, /auto_answered.*phase-keyed|phase-keyed.*auto_answered/i);
  assert.match(source, /escalated_count.*phase-keyed|phase-keyed.*escalated_count/i);
  assert.match(source, /review_rounds[\s\S]{0,180}(?:`?spec`?|"spec")[\s\S]{0,180}(?:`?design`?|"design")|(?:`?spec`?|"spec")[\s\S]{0,180}review_rounds[\s\S]{0,180}(?:`?design`?|"design")/i);
  assert.doesNotMatch(source, /\breview_passes\b/);
  assert.doesNotMatch(source, /\bfinding_history\b/);
  assert.match(source, /spec-to-design transition adapter|transition adapter.*design/i);
  assert.match(source, /On an \*\*Auto\*\* selection, use only `last_crystallization_set` and `completed_changes`/);
  assert.match(source, /review loop's \(item 9\) source only, and is never the selector's dispatch source/i);
  assert.match(source, /replaces `last_crystallization_set` with that turn's emitted names/i);
  assert.match(source, /assumed applied or discarded/i);
  assert.match(source, /wrapper_echo_value\s*:\s*""/);
  assert.match(source, /arguments_value\s*:\s*"\{name\} --fast-track"/);
});

test('supervised review reports spec convergence or cap exhaustion before design dispatch and preserves the token', () => {
  const source = supervisionContract();

  assert.match(
    source,
    /spec phase.*converg[\s\S]{0,360}(?:pass outcome|round outcome|autonomy audit)[\s\S]{0,360}(?:design worker|design dispatch)/i
  );
  assert.match(source, /same active supervised invocation and `active_change` remain in force/i);
  assert.match(source, /spec (?:phase )?cap exhaustion[\s\S]{0,200}(?:chain|proceed|continue|dispatch)[\s\S]{0,120}(?:design|sai-2)/i);
  assert.match(source, /failed or cancelled spec-worker[\s\S]{0,180}(?:no design|design worker.*not|does not dispatch design)/i);
});

test('Step 2 blind supervision rejects duplicate starts until the chained design outcome', () => {
  const source = supervisionContract();

  assert.match(source, /Active supervision rejects another \*\*Auto\*\* selection/i);
  assert.match(source, /throughout the chained design phase/i);
  assert.match(source, /ends only at the applicable terminal outcome/i);
  assert.match(source, /spec and design.*(?:review_rounds|review rounds).*autonomy records remain separate|spec and design.*autonomy records remain separate/i);
  assert.match(source, /completed_changes.*applicable terminal worker result/i);
  assert.match(source, /specs_converged_changes.*active_phase.*design/i);
});

test('active exploration closure defines the three conversation-only states and success-only rule', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /\*\*Pre-crystallization closure \(sai-explore only\):\*\*/);
  assert.match(source, /The state is exactly one of `active-uncrystallized`, `crystallized`, or `discarded`/);
  assert.match(source, /Before a candidate idea exists, no Closure State is active/);
  assert.match(source, /Once a candidate idea exists under active exploration, its state starts as `active-uncrystallized`/);
  assert.match(source, /The one-time readiness signal remains at most once per stable idea/);
  assert.match(source, /On every successful turn while the state is `active-uncrystallized`/);
  assert.match(source, /genuine unresolved question remains/);
  assert.match(source, /When no genuine unresolved question remains/);
  assert.match(source, /Say `crystallize` when ready; crystallization generates the paste-ready prompt for `\/sai-1-spec`/);
  assert.match(source, /every later successful qualifying turn/);
});

test('Claude Code and opencode consume the same shared closure contract', () => {
  const shared = spec('sai/commands/explore/instructions.md');
  const claude = spec('commands/claude/sai-explore.md');
  const opencode = spec('commands/opencode/sai-explore.md');

  assert.match(claude, /Fetch @sai\/adapters\/claude\/boot\.md and follow it\./);
  assert.match(opencode, /Fetch @sai\/adapters\/opencode\/boot\.md and follow it\./);
  assert.equal(
    claude.match(/command_name:\s*explore/)?.[0],
    opencode.match(/command_name:\s*explore/)?.[0]
  );

  for (const literal of [
    /active-uncrystallized/,
    /crystallized/,
    /discarded/,
    /crystallize/,
    /\/sai-1-spec/,
  ]) {
    assert.match(shared, literal);
    assert.doesNotMatch(claude, literal);
    assert.doesNotMatch(opencode, literal);
  }
});

test('Step 1 parses an optional overview language before fast-track and leaves absent language unresolved', () => {
  const source = spec('sai/commands/explore/body.md');

  assert.match(source, /## Overview-language parse/);
  assert.match(source, /--overview-lang <language>/);
  assert.match(
    source,
    /(?:extract(?:s|ed|ing)?|consume|set)[\s\S]{0,320}(?:language value|overview[_ -]?language)|(?:language value|overview[_ -]?language)[\s\S]{0,320}(?:extract|consume|set)/i
  );
  assert.match(source, /non-empty/);
  assert.match(source, /duplicate/i);
  assert.match(source, /missing.*value|value.*missing/i);
  assert.match(source, /(?:validation error|invalid|reject(?:s|ed|ion)?)[\s\S]{0,240}(?:duplicate|missing)|(?:duplicate|missing)[\s\S]{0,240}(?:validation error|invalid|reject)/i);
  assert.match(source, /before.*resolution|resolution.*before/i);
  assert.match(source, /--fast-track/);
  assert.match(
    source,
    /(?:absent|omitted|not provided)[\s\S]{0,220}(?:unresolved|no effective (?:overview )?language)|(?:unresolved|no effective (?:overview )?language)[\s\S]{0,220}(?:absent|omitted|not provided)/i
  );
});

test('Step 1 gate 9 uses the opt-in overview-language selector and deterministic option sets', () => {
  const contract = [
    spec('sai/commands/explore/instructions.md'),
    spec('sai/commands/explore/body.md'),
  ].join('\n');
  const selectorStart = contract.search(/(?:Gate 9|gate-9|overview[- ]language selector)/i);

  assert.ok(selectorStart >= 0, 'the opt-in overview-language selector should be specified');
  const selector = contract.slice(selectorStart);

  assert.match(selector, /(?:None\s*(?:—|-)\s*do[- ]not[- ]create|do[- ]not[- ]create[\s\S]{0,120}None)/i);
  assert.doesNotMatch(contract, /emitted first and carrying the `Recommended` marker/);
  assert.doesNotMatch(contract, /emitted second, carrying no marker/);
  assert.match(
    selector,
    /(?:English[\s\S]{0,120}undetermined|undetermined[\s\S]{0,120}English)[\s\S]{0,700}(?:two|2) options[\s\S]{0,700}None[\s\S]{0,400}English/i
  );
  assert.match(
    selector,
    /(?:non[- ]English|not English)[\s\S]{0,700}(?:three|3) options[\s\S]{0,700}None[\s\S]{0,400}English[\s\S]{0,500}endonym/i
  );
});

test('Step 1 gate 9 defaults to None for absent fast-track or noncommittal input and honors an explicit flag', () => {
  const contract = [
    spec('sai/commands/explore/instructions.md'),
    spec('sai/commands/explore/body.md'),
  ].join('\n');
  const selectorStart = contract.search(/(?:Gate 9|gate-9|overview[- ]language selector)/i);

  assert.ok(selectorStart >= 0, 'the opt-in overview-language selector should be specified');
  const selector = contract.slice(selectorStart);

  assert.match(
    selector,
    /(?:--fast-track[\s\S]{0,260}(?:absent|omitted|not present)|(?:absent|omitted|not present)[\s\S]{0,260}--fast-track)[\s\S]{0,700}None/i
  );
  assert.match(selector, /(?:declin\w*|non[- ]committal|noncommittal)[\s\S]{0,500}(?:None|do[- ]not[- ]create)/i);
  assert.match(
    selector,
    /(?:explicit(?:ly)?[\s\S]{0,220}`?--overview-lang`?|`?--overview-lang`?[\s\S]{0,220}explicit)[\s\S]{0,700}(?:suppress|skip|bypass|omit|not present|does not present|without)[\s\S]{0,180}(?:gate|selector)/i
  );
});

test('Step 1 forwards selected overview language only for Auto and keeps None and Manual free of overview dispatch', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /overview_language/);
  assert.match(source, /--overview-lang/);
  assert.match(source, /selected.*language|language.*selected/i);
  assert.match(source, /arguments_value:\s*"\{name\} --fast-track --supervised --overview-lang \{overview_language\}"/);

  const deterministic = source.indexOf('**Deterministic selection**');
  assert.ok(deterministic >= 0, 'the deterministic Auto selection contract should be present');
  const auto = source.slice(deterministic);
  const noOverview = auto.match(
    /(?:do[- ]not[- ]create|None)[\s\S]{0,5000}?arguments_value:\s*"\{name\} --fast-track --supervised"/i
  );
  assert.ok(
    noOverview,
    'do-not-create/None Auto should forward exactly {name} --fast-track --supervised'
  );
  const noOverviewEnvelope = noOverview[0].match(/arguments_value:\s*"[^"]+"/i)?.[0] || '';
  assert.equal(
    noOverviewEnvelope,
    'arguments_value: "{name} --fast-track --supervised"',
    'the do-not-create/None Auto envelope should contain no overview flag or value'
  );
  assert.doesNotMatch(
    noOverviewEnvelope,
    /--overview-lang(?:\s|`|"|$)/i,
    'the do-not-create/None Auto envelope must not carry an overview flag or value'
  );

  const manualStart = source.lastIndexOf('Selecting **Manual**');
  assert.ok(manualStart >= 0, 'the Manual selector branch should be present');
  const manual = source.slice(manualStart, deterministic);
  assert.match(manual, /dispatches nothing/i);
  assert.doesNotMatch(manual, /arguments_value|--overview-lang/i,
    'Manual must forward no supervised dispatch envelope');

  assert.match(source, /not.*persist|never.*persist/i);
  assert.match(source, /failed\/cancelled retry|failed or cancelled retry|retry/i);
});

test('Step 1 keeps explore wrapper documentation equivalent across both harnesses', () => {
  for (const relativePath of [
    'commands/claude/sai-explore.md',
    'commands/opencode/sai-explore.md',
  ]) {
    const source = spec(relativePath);
    assert.match(
      source,
      /argument-hint:.*--overview-lang <language>.*--fast-track/,
      `${relativePath} should document both optional flags`
    );
  }
});

test('Step 1 rejects malformed language input before dispatch', () => {
  const source = exploreContract();

  assert.match(source, /Missing value for --overview-lang|missing.*value.*--overview-lang/i);
  assert.match(source, /duplicate.*--overview-lang|--overview-lang.*duplicate/i);
  assert.match(source, /no.*resolution|before.*change.*resolution/i);
  assert.match(source, /no.*dispatch|without.*dispatch/i);
});

// ─── Step 2: spec-design-review-progress-step (external findings and worker correction) ─

test('Step 2: external findings stay within reviewed artifacts and worker corrections retain specific discard reasons', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const coordinator = spec('sai/commands/spec/coordinator.md');
  const source = `${worker}\n${coordinator}`;

  assert.match(source, /external[\s-]+(?:artifact[- ]review )?findings?/i,
    'the correction path should consume external findings');
  assert.match(source, /Findings may edit only `proposal\.md` and `specs\/\*\*`|findings?[^\n]{0,180}(?:only|limited|restricted)[^\n]{0,180}(?:proposal\.md|specs\/\*\*)/i,
    'external findings should be corrected only within the reviewed artifacts');
  assert.match(source, /Accepted edits trigger pre-completion verification and decision-summary recomputation from current artifacts/i,
    'accepted external corrections should trigger worker verification and summary recomputation');
  assert.match(source, /Findings may edit only `proposal\.md` and `specs\/\*\*`|findings?[\s\S]{0,180}(?:only|limited|restricted)[\s\S]{0,120}(?:proposal\.md|specs\/\*\*)/i,
    'external findings should be limited to the reviewed artifacts');
  assert.match(source, /Report every discarded item with a specific reason|reports? every discard with its specific reason|every discarded item individually[\s\S]{0,120}specific reason/i,
    'a discarded finding should carry a specific rejection reason');
  assert.match(coordinator, /Report (?:worker-authored|external-finding) discards/i,
    'the coordinator should surface discarded findings');
  assert.match(worker, /does not dispatch or own an artifact reviewer|does not create the findings, dispatch an artifact reviewer, or own the review operation/i,
    'the phase worker should not dispatch or own the reviewer');
});

test('Step 2: accepted external corrections re-verify and recompute the decision summary without re-emitting earlier progress ids', () => {
  const worker = spec('sai/commands/spec/worker.md');

  assert.match(worker, /Accepted edits trigger pre-completion verification and decision-summary recomputation from current artifacts/i,
    'accepted edits should trigger re-verification of the artifacts');
  assert.match(worker, /decision-summary recomputation from current artifacts/,
    'the decision summary should be recomputed from current artifacts');
  assert.match(worker, /without re-emitting or reopening `proposal`, `specs`, or `validation`|without reopening or re-emitting the already completed `proposal`, `specs`, or `validation` progress ids/i,
    'earlier progress ids should not be re-emitted');
});

test('Step 2: validation precedes external findings and external evidence is the only review-progress source', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const coordinator = spec('sai/commands/spec/coordinator.md');

  assert.doesNotMatch(worker, /run the automatic review loop/,
    'validation must not enter a worker-owned automatic review loop');
  assert.match(worker, /artifact validation plus decision-summary derivation returns `validation`/,
    'validation should be reported as a progress event');
  assert.match(worker, /external[\s-]+(?:artifact[- ]review )?findings?/i,
    'external findings should follow validation');
  assert.match(worker, /valid[\s\S]{0,220}(?:external|base[- ]form)[\s\S]{0,220}(?:High=0|Summary)|(?:High=0|Summary)[\s\S]{0,220}(?:valid|external|base[- ]form)/i,
    'only valid external evidence may produce review progress');
  assert.match(coordinator, /`validation`[\s\S]{0,120}`review`/,
    'the plan should order validation before review');
});

test('Step 2: external findings, not worker inference, drive review evidence and corrections', () => {
  const worker = spec('sai/commands/spec/worker.md');

  assert.match(worker, /external[\s-]+(?:artifact[- ]review )?findings?/i,
    'the worker should consume external findings');
  assert.match(worker, /Findings may edit only `proposal\.md` and `specs\/\*\*`/,
    'the external correction scope should remain explicit');
  assert.match(worker, /never infer `?High=0`? from missing, malformed, or other summary text/i,
    'a worker must not infer review evidence from absent or malformed input');
  assert.doesNotMatch(worker, /The reviewer evaluates reviewed-set consistency/,
    'the retired worker-owned reviewer axes must be absent');
});

test('Step 2: workers have no automatic reviewer loop under supervision and the supervised flow has no routed task list', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const supervision = spec('sai/commands/explore/instructions.md');

  assert.match(worker, /\bsupervised\b/i,
    'the worker contract should state the supervised boundary');
  assert.match(worker, /does not dispatch or own an artifact reviewer, an automatic review loop, review counters/i,
    'the worker must not retain a worker-owned automatic reviewer or its counters');
  assert.match(worker, /supervised selector Explore has no adapter progress plan/i,
    'the supervised selector must not acquire a routed worker progress plan');
  assert.doesNotMatch(worker, /coexists with and never replaces the supervised pipeline's (?:independent convergence loop|supervised review rounds|in[- ]session review rounds)/i,
    'supervision must not retain a second worker-owned review layer');
  assert.match(supervision, /no adapter-declared plan is in force in the supervised flow/,
    'no routed progress plan should be in force under supervision');
  assert.match(supervision, /no plan-based list renders/,
    'no routed task list should render under supervision');
  assert.match(supervision, /Step marking has no application/,
    'step marking should have no application in the supervised flow');
});

// ─── Step 3: spec-design-review-progress-step (supervised design review) ────

test('Step 3: design workers have no automatic reviewer loop under supervision and keep the supervised flow without routed-list marking', () => {
  const worker = spec('sai/commands/design/worker.md');
  const supervision = spec('sai/commands/explore/instructions.md');

  assert.match(worker, /\bsupervised\b/i,
    'the design worker contract should cover supervised invocation');
  assert.match(worker, /does not create the findings, dispatch an artifact reviewer, or own the review operation/i,
    'the design worker must not retain a worker-owned automatic reviewer');
  assert.doesNotMatch(worker, /coexists with and never replaces the supervised pipeline's (?:independent convergence loop|supervised review rounds|in[- ]session review rounds)/i,
    'supervision must not retain a second design-worker review layer');
  assert.match(worker, /supervised[\s\S]{0,320}(?:no|without)[\s\S]{0,140}(?:adapter|plan|list)/i,
    'the supervised design worker should not own a routed-list surface');
  assert.match(
    supervision,
    /(?:design|sai-2)[\s\S]{0,240}no plan-based list renders|no plan-based list renders[\s\S]{0,240}(?:design|sai-2)/i,
    'no plan-based list should render in the supervised design flow'
  );
});

// ─── suppress-worker-review-under-supervision: Auto envelope pins (verify-first) ─
test('Auto spec envelope carries leading --supervised with empty wrapper echo', () => {
  const source = spec('sai/commands/explore/instructions.md');
  assert.match(source, /wrapper_echo_value:\s*""\s*\n\s*arguments_value:[\s\S]{0,80}--supervised/, 'spec Auto dispatch should leave wrapper_echo_value empty and put --supervised on arguments_value');
  assert.match(source, /arguments_value:[\s\S]{0,200}--supervised[\s\S]{0,200}Ready to Propose|arguments_value[\s\S]{0,120}line `--supervised`[\s\S]{0,200}Ready to Propose/i, 'spec arguments_value should begin with --supervised ahead of the Ready-to-Propose body');
  assert.doesNotMatch(source, /wrapper_echo_value:\s*"--supervised"/, 'explore must not carry the marker as a bare non-empty wrapper echo');
});

test('Auto chained design envelope forwards overview generation conditionally', () => {
  const source = spec('sai/commands/explore/instructions.md');
  const deterministic = source.indexOf('**Deterministic selection**');
  assert.ok(deterministic >= 0, 'the deterministic Auto selection contract should be present');
  const auto = source.slice(deterministic);

  assert.ok(
    auto.match(
      /(?:selected|provided|chosen|overview_language)[\s\S]{0,5000}arguments_value:\s*"\{name\} --fast-track --supervised --overview-lang \{overview_language\}"|arguments_value:\s*"\{name\} --fast-track --supervised --overview-lang \{overview_language\}"[\s\S]{0,5000}(?:selected|provided|chosen|overview_language)/i
    ),
    'selected language should be forwarded as --overview-lang'
  );
  const noOverview = auto.match(
    /(?:do[- ]not[- ]create|None)[\s\S]{0,5000}?arguments_value:\s*"\{name\} --fast-track --supervised"/i
  );
  assert.ok(
    noOverview,
    'do-not-create/None should forward exactly {name} --fast-track --supervised'
  );
  assert.doesNotMatch(
    noOverview[0].match(/arguments_value:\s*"[^"]+"/i)?.[0] || '',
    /--overview-lang(?:\s|`|"|$)/i,
    'do-not-create/None should not forward an overview flag or value'
  );
  assert.doesNotMatch(
    auto,
    /arguments_value:\s*"\{name\} --supervised --fast-track"/,
    'the supervised Auto envelope should remain name-first and fast-track-first'
  );
});

test('Step 7: design grammar is name-first, accepts a bare supervised flag, and is order-independent after the name', () => {
  const worker = spec('sai/commands/design/worker.md');

  assert.match(worker, /(?:change[- ]name|name)[\s\S]{0,180}(?:first|required before|requires?[\s\S]{0,60}before|must precede)[\s\S]{0,180}(?:flag|option|--supervised)/i,
    'the design grammar should require the change name before flags');
  assert.match(worker, /bare[\s\S]{0,100}`?--supervised`?|`?--supervised`?[\s\S]{0,100}bare/i,
    'the design grammar should recognize the bare --supervised flag');
  assert.match(worker, /(?:either order|order[- ]independent|in any order|regardless of order)[\s\S]{0,180}(?:--fast-track|--supervised)|(?:--fast-track|--supervised)[\s\S]{0,180}(?:either order|order[- ]independent|in any order|regardless of order)/i,
    'the design flags should be order-independent after the name');
  assert.match(worker, /\{name\} --fast-track --supervised/,
    'the design grammar should accept fast-track before supervised');
  assert.match(worker, /\{name\} --supervised --fast-track/,
    'the design grammar should accept supervised before fast-track');
  assert.match(worker, /name-first design envelope[\s\S]{0,180}(?:either|fast-track|supervision)/i,
    'the name-first grammar should remain the only flag-order contract');
});

test('design-phase retry carries --supervised and does not re-run sai-1', () => {
  const source = spec('sai/commands/explore/instructions.md');
  assert.match(source, /design-phase retry[\s\S]{0,800}--supervised|retry[\s\S]{0,400}--supervised[\s\S]{0,400}design/i, 'design-phase retry must carry --supervised');
  assert.match(source, /design-phase retry[\s\S]{0,500}never dispatch sai-1|never[\s\S]{0,80}regenerate `proposal\.md`|does not re-dispatch the sai-1/i, 'design-phase retry must not re-dispatch sai-1 or regenerate proposal/specs');
});

// ─── Step 1: supervised-review-in-session (in-session review rounds) ─

test('supervised review rounds use the sole in-session Review Engine convergence path without a reviewer subagent', () => {
  const source = supervisionContract();

  assert.match(source, /supervised review round|review rounds|in[- ]session review/i);
  assert.match(source, /Review[\s-]?Engine\(changeName[\s\S]{0,120}artifactSet|Review[\s-]?Engine\(\s*changeName\s*,\s*artifactSet/i);
  assert.match(source, /artifactSet[\s\S]{0,160}sai-1\|sai-2|sai-1\|sai-2[\s\S]{0,160}artifactSet/i);
  assert.match(source, /spec[\s\S]{0,160}design[\s\S]{0,160}(?:pair|chain|phase pairing|same phase)/i);
  assert.match(source, /in[- ]session/i);
  assert.match(source, /(?:sole|only)[\s\S]{0,160}(?:automatic )?(?:convergence|review)|(?:automatic )?(?:convergence|review)[\s\S]{0,160}(?:sole|only)/i);
  assert.match(source, /does not create the findings, dispatch an artifact reviewer, or own the review operation|workers? (?:are )?consumers? of the resulting external findings block|not additional review surfaces/i,
    'the Review Engine should be the only reviewer surface');
  assert.doesNotMatch(source, /IndependentReviewResult|IndependentReviewFinding/);
});

test('Step 7: supervised rounds allow three rounds per attempt, High extension under cap, third-High exhaustion, and reset on a new attempt', () => {
  const source = spec('sai/commands/explore/instructions.md');

  assert.match(source, /review_rounds/);
  assert.match(source, /review_rounds[\s\S]{0,180}(?:`?spec`?|"spec")[\s\S]{0,180}(?:`?design`?|"design")|(?:`?spec`?|"spec")[\s\S]{0,180}review_rounds[\s\S]{0,180}(?:`?design`?|"design")/i);
  assert.doesNotMatch(source, /\breview_passes\b/);
  assert.doesNotMatch(source, /\bfinding_history\b/);
  assert.match(source, /three[- ]rounds?(?:[\s\S]{0,180}(?:per|each) attempt)|(?:per|each) attempt[\s\S]{0,180}(?:three|3)[\s\S]{0,100}round/i,
    'each supervised attempt should have a three-round budget');
  assert.match(source, /High[\s\S]{0,300}(?:extends?|continues?|requires another|next)[\s\S]{0,260}(?:round|pass)[\s\S]{0,220}(?:cap|third|three|permit)/i,
    'High findings should extend the loop while the attempt cap permits');
  assert.match(source, /(?:third|3rd|round 3|third round)[\s\S]{0,300}High[\s\S]{0,300}(?:exhaust|cap|stop)|High[\s\S]{0,300}(?:third|3rd|round 3|third round)[\s\S]{0,300}(?:exhaust|cap|stop)/i,
    'a High finding on the third round should exhaust the attempt');
  assert.match(source, /(?:new|next) attempt[\s\S]{0,260}(?:reset|starts?)[\s\S]{0,180}(?:review_rounds|round counter)[\s\S]{0,120}(?:`?0`?|zero)|(?:review_rounds|round counter)[\s\S]{0,140}(?:`?0`?|zero)[\s\S]{0,260}(?:new|next) attempt/i,
    'a new attempt should reset phase round counters to zero');
  assert.doesNotMatch(source, /at most one[\s\S]{0,80}(?:supervised )?(?:review|round)/i,
    'the live supervised contract must not impose an at-most-one review cap');
  assert.match(source, /manual (?:review|counters)[\s\S]{0,160}(?:separate|do not count|does not count|does not increment)|separate from supervised rounds/i);
});

test('Step 7: spec and design workers retain no automatic review loop for any supervised value', () => {
  const phases = [
    spec('sai/commands/spec/worker.md'),
    spec('sai/commands/design/worker.md'),
  ];

  for (const worker of phases) {
    assert.match(worker, /(?:does not dispatch or own an artifact reviewer, an automatic review loop, review counters|does not create the findings, dispatch an artifact reviewer, or own the review operation)/i,
      'neither phase worker may retain an automatic reviewer for any supervised value');
    assert.match(worker, /external[\s-]+(?:artifact[- ]review )?findings?/i,
      'both workers should consume external findings instead');
  }
});

test('external convergence is not inferred from non-supervised worker state', () => {
  for (const worker of [
    spec('sai/commands/spec/worker.md'),
    spec('sai/commands/design/worker.md'),
  ]) {
    assert.match(worker, /never infer `?High=0`? from missing, malformed, or other summary text|never infer it from a finding list, omitted or malformed counts, prose/i,
      'review progress must require external evidence regardless of supervision');
    assert.doesNotMatch(worker, /A completed pass with `High=0` converges|worker-owned review pass/i,
      'the retired non-supervised worker loop must not return');
  }
});

test('supervised rounds preserve accepted external corrections and fresh disk evidence', () => {
  const source = supervisionContract();

  assert.match(source, /fresh disk (?:re[- ]?read|read)|re[- ]?read[s]? (?:from|the) disk|fresh[\s\S]{0,120}disk/i);
  assert.match(source, /same (?:spec|design|phase)[- ]?worker/i);
  assert.match(source, /Explore never writes directly/i);
  assert.match(source, /read[- ]only/i);
  assert.match(source, /per-item legitimacy/i);
  assert.match(source, /specific discard|discard[\s\S]{0,80}specific reason/i);
});

test('cap exhaustion reports one tally line and continues the supervised run', () => {
  const source = supervisionContract();

  assert.match(source, /cap exhaustion[\s\S]{0,200}(?:one|single)[\s\S]{0,60}line|(?:one|single)[\s\S]{0,60}line[\s\S]{0,200}cap exhaustion/i);
  assert.match(source, /Summary:\s*High=<count>\s*Medium=<count>\s*Low=<count>/i);
  assert.match(source, /(?:spec|sai-1)[\s\S]{0,120}cap exhaustion[\s\S]{0,240}(?:chain|proceed|continue|dispatch)[\s\S]{0,160}(?:design|sai-2)/i);
  assert.match(source, /(?:design|sai-2)[\s\S]{0,120}cap exhaustion[\s\S]{0,240}(?:complet|terminal|end|finish)/i);
  assert.doesNotMatch(source, /Outstanding High:|Contract-violations=/);
});

test('supervised review rounds drive the phase review item in-progress state', () => {
  const source = supervisionContract();

  assert.match(source, /reviewed-sai-1[\s\S]{0,200}in_progress|in_progress[\s\S]{0,200}reviewed-sai-1/i);
  assert.match(source, /reviewed-sai-2[\s\S]{0,200}in_progress|in_progress[\s\S]{0,200}reviewed-sai-2/i);
  assert.match(source, /cap exhaustion[\s\S]{0,160}(?:resolv|pending)/i);
  assert.match(source, /render[- ]only/i);
});

test('manual Review Loop Navigation and supervised rounds remain distinct', () => {
  const source = supervisionContract();

  assert.match(source, /Review Loop Navigation/i);
  assert.match(source, /four[- ]option|four options|4[- ]option/i);
  assert.match(source, /free-text[\s\S]{0,80}exit|exit[\s\S]{0,80}free-text/i);
  assert.match(source, /supervised review rounds?|in[- ]session review rounds?/i);
  assert.match(source, /Review Loop Navigation[\s\S]{0,320}(?:manual|interactive)/i);
  assert.doesNotMatch(source, /worker[- ]owned Phase Review Pass|worker[- ]owned[\s-]+review loop/i);
});

test('Step 5: the manual gate note precedes the canonical question, names sai-explore and review-loop, and is not a third option', () => {
  const source = exploreContract();
  assert.match(source, /sai-explore[\s\S]{0,1400}review-loop|review-loop[\s\S]{0,1400}sai-explore/i,
    'the manual gate note should name both literal command surfaces');
  assert.match(source, /(?:before|prior to|preceding)[\s\S]{0,500}(?:canonical|review[- ]loop)?[\s\S]{0,500}(?:question|prompt|picker)|(?:question|prompt|picker)[\s\S]{0,500}(?:after|following)[\s\S]{0,500}(?:sai-explore|review-loop)/i,
    'the gate note should precede the canonical question');
  assert.match(source, /(?:not|never)[\s\S]{0,140}(?:a )?(?:third )?(?:option|choice)|(?:third )?(?:option|choice)[\s\S]{0,140}(?:not|never)/i,
    'the note must not become a third picker option');
});

test('Step 5: supervised flow omits the manual gate note and canonical question', () => {
  const source = exploreContract();

  assert.match(source, /supervis(?:ed|ion)[\s\S]{0,600}(?:omit|does not|never|no|without)[\s\S]{0,220}(?:gate note|note|question|ask|picker|free-text)/i,
    'supervised execution should omit both manual gate surfaces');
});

test('Step 1: artifact feedback gate declares an explicit interactive or supervised mode', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /`mode`[\s\S]{0,180}optional|optional[\s\S]{0,180}`mode`/i);
  assert.match(gate, /interactive/);
  assert.match(gate, /supervised/);
  assert.match(gate, /(?:omitted|missing)[\s\S]{0,140}interactive|default(?:s|ing)?[\s\S]{0,100}interactive/i);
  assert.match(gate, /invalid[\s\S]{0,180}(?:non-empty[\s\S]{0,80})?mode[\s\S]{0,180}STOP|mode[\s\S]{0,180}invalid[\s\S]{0,180}STOP/i);
  assert.match(
    gate,
    /(?:must not|never|do not)[\s\S]{0,180}(?:detect|infer|derive)[\s\S]{0,180}(?:invocation[- ]context|caller|conversation)[\s\S]{0,180}mode/i
  );
});

test('Step 1: supervised mode auto-proceeds without the interactive feedback surfaces', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /supervised[\s\S]{0,320}(?:auto[- ]proceed|automatically)[\s\S]{0,220}`?next-action`?/i);
  assert.match(gate, /supervised[\s\S]{0,420}`?next-action`?[\s\S]{0,180}(?:exactly once|once)/i);
  assert.match(gate, /supervised[\s\S]{0,420}(?:does not|never|no)[\s\S]{0,100}(?:present|emit)[\s\S]{0,100}(?:picker|free-text)/i);
  assert.match(gate, /supervised[\s\S]{0,520}(?:does not|never|no)[\s\S]{0,100}(?:increment|change)[\s\S]{0,100}iteration/i);
  assert.match(gate, /supervised[\s\S]{0,520}(?:does not|never|must not)[\s\S]{0,120}(?:write|modify)[\s\S]{0,100}`?\.openspec\.yaml`?/i);
  assert.match(gate, /failed[\s\S]{0,220}(?:or|and)[\s\S]{0,80}cancelled[\s\S]{0,220}(?:never|not|no)[\s\S]{0,180}(?:auto[- ]proceed|next-action)/i);
});

test('Step 1: supervised placement follows the decision summary and reports follow proceed', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(gate, /supervised[\s\S]{0,420}(?:after|following)[\s\S]{0,120}decision summary/i);
  assert.match(gate, /(?:after|following)[\s\S]{0,120}(?:proceed|`?next-action`?)[\s\S]{0,260}(?:report|reporting|summary)/i);
});

test('Step 1: interactive mode keeps Give feedback Recommended before proceed', () => {
  const gate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );
  const feedback = gate.indexOf('Give feedback (Recommended)');
  const proceed = gate.indexOf('proceed-label');

  assert.match(gate, /interactive[\s\S]{0,320}Give feedback \(Recommended\)[\s\S]{0,240}proceed/i);
  assert.ok(feedback >= 0, 'interactive feedback option should be present');
  assert.ok(proceed >= 0, 'proceed option should be present');
  assert.ok(feedback < proceed, 'interactive feedback should precede proceed');
});

test('Step 2: the supervised spec artifact gate binds mode, Finish, and the phase transition', () => {
  const source = spec('sai/commands/explore/instructions.md');
  const specArtifacts = source.match(/proposal\.md[\s\S]{0,1800}specs\/\*\*/i);

  assert.ok(specArtifacts, 'the supervised spec artifact gate should retain proposal.md and specs/**');
  const specGate = source.slice(
    Math.max(0, specArtifacts.index - 700),
    Math.min(source.length, specArtifacts.index + specArtifacts[0].length + 700)
  );
  assert.match(
    specGate,
    /mode\s*(?:=|:)\s*[`"']?supervised[`"']?/i,
    'the supervised spec artifact gate should explicitly supply mode = supervised'
  );
  assert.match(specGate, /Finish/i,
    'the supervised spec gate should use Finish as its proceed label');
  assert.match(specGate, /next-action[\s\S]{0,160}phase-transition|phase-transition[\s\S]{0,160}next-action/i,
    'the supervised spec gate should use the phase-transition next-action');
});

test('Step 2: supervised Continue conditionally selects overview generation or a no-generation terminal', () => {
  const source = spec('sai/commands/explore/instructions.md');
  const designArtifacts = source.match(/design\.md[\s\S]{0,1200}tasks\.md[\s\S]{0,1200}interfaces\.md/i);

  assert.ok(designArtifacts, 'the supervised design artifact gate should retain design.md, tasks.md, and interfaces.md');
  const designGate = source.slice(
    Math.max(0, designArtifacts.index - 700),
    Math.min(source.length, designArtifacts.index + designArtifacts[0].length + 700)
  );
  assert.match(
    designGate,
    /mode\s*(?:=|:)\s*[`"']?supervised[`"']?/i,
    'the supervised design artifact gate should explicitly supply mode = supervised'
  );
  assert.match(designGate, /Continue/i,
    'the supervised design gate should use Continue as its proceed label');
  assert.match(
    designGate,
    /(?:overview_language|selected overview language)[\s\S]{0,360}(?:next-action[\s\S]{0,180}overview-generation|overview-generation[\s\S]{0,180}next-action)|(?:next-action[\s\S]{0,180}overview-generation|overview-generation[\s\S]{0,180}next-action)[\s\S]{0,360}(?:overview_language|selected overview language)/i,
    'a selected overview language should select the overview-generation next-action'
  );
  assert.match(
    designGate,
    /(?:None|do[- ]not[- ]create|no overview language|without an overview)[\s\S]{0,420}(?:next-action[\s\S]{0,180}(?:supervised-terminal|no-generation)|(?:supervised-terminal|no-generation)[\s\S]{0,180}next-action)|(?:next-action[\s\S]{0,180}(?:supervised-terminal|no-generation)|(?:supervised-terminal|no-generation)[\s\S]{0,180}next-action)[\s\S]{0,420}(?:None|do[- ]not[- ]create|no overview language|without an overview)/i,
    'None/do-not-create should select a no-generation supervised terminal'
  );
});

test('Step 2: post-proceed report ordering remains after supervised gates without active-supervision interval stage enumeration', () => {
  const source = spec('sai/commands/explore/instructions.md');
  const gate = source.match(
    /(?:proposal\.md[\s\S]{0,500}specs\/\*\*[\s\S]{0,700}(?:Finish|phase-transition)[\s\S]{0,300}(?:phase-transition|Finish)|design\.md[\s\S]{0,350}tasks\.md[\s\S]{0,350}interfaces\.md[\s\S]{0,900}(?:Continue|overview-generation|supervised-terminal)[\s\S]{0,300}(?:overview-generation|supervised-terminal|Continue))/i
  );

  assert.ok(gate, 'a supervised artifact gate should exist before post-proceed reporting');
  const afterGate = source.slice(gate.index + gate[0].length);
  assert.match(afterGate, /Auto-answered:[\s\S]{0,220}Escalated:/i,
    'post-proceed reporting should retain Auto-answered before Escalated');
  assert.match(afterGate, /Q:[\s\S]{0,160}A:[\s\S]{0,160}Grounding:/i,
    'post-proceed reporting should retain question, answer, and grounding order');
  assert.doesNotMatch(
    source,
    /active[- ]supervision\s+interval[\s\S]{0,360}(?:stage|step)[\s\S]{0,180}(?:enumerat|\b1\.[\s\S]{0,80}\b2\.)/i,
    'the supervised contract must not add interval stage-enumeration prose'
  );
});

// ─── Step 4: manual-branch-next-step-after-selector (green-exception tests) ─

test('Step 4: the shared close puts every path-specific sai-1 handoff after the selector', () => {
  const source = exploreContract();
  const close = source.indexOf('after the final `Ready to Propose` block and after the keep-window-open recommendation');
  const selector = source.indexOf('exactly two options, in this fixed order', close);
  const separator = source.lastIndexOf('---', close);

  assert.ok(close >= 0, 'the shared close ordering contract should be present');
  assert.ok(separator >= 0 && separator < close, 'the shared close should follow the payload separator');
  assert.ok(selector > close, 'the selector should be the final emission of the shared close');

  const beforeClose = source.slice(separator, close);
  const beforeSelector = source.slice(close, selector);
  const nextStepToSpec = /(?:next[- ]step|handoff)[\s\S]{0,240}`?\/sai-1-spec`?/i;

  assert.doesNotMatch(beforeClose, nextStepToSpec,
    'a path-specific /sai-1-spec next-step must not occur between the separator and shared close');
  assert.doesNotMatch(beforeSelector, nextStepToSpec,
    'a path-specific /sai-1-spec next-step must not precede the selector');
  assert.match(source.slice(selector), /After the selector response,[\s\S]{0,1200}path-specific Manual\/unmapped next-step handoff[\s\S]{0,420}\/sai-1-spec/i,
    'the path-specific handoff should be post-selector prose');
});

test('Step 4: E8 keeps the Ready-to-Propose payload fields and separator bounded before post-selector prose', () => {
  const source = exploreContract();
  const payloadStart = source.indexOf('**Capabilities in scope**');
  const ready = source.lastIndexOf('Ready to Propose', payloadStart);
  const edgeCases = source.indexOf('**Edge Cases**', payloadStart);
  const implementationDetails = source.indexOf('**Implementation Details**', edgeCases);
  const overviewLanguage = source.indexOf('**Overview language**', implementationDetails);
  const separator = source.indexOf('---', overviewLanguage);
  const selector = source.indexOf('exactly two options, in this fixed order', separator);

  assert.ok(payloadStart >= 0 && ready >= 0 && edgeCases > payloadStart,
    'the E8 payload should retain its Ready-to-Propose heading and fields');
  assert.ok(implementationDetails > edgeCases, 'Implementation Details should remain after Edge Cases');
  assert.ok(overviewLanguage > implementationDetails, 'Overview language should remain after Implementation Details');
  assert.ok(separator > overviewLanguage, 'the Ready-to-Propose payload should retain its separator');
  assert.ok(selector > separator, 'the selector should be outside the Ready-to-Propose payload');

  const payload = source.slice(payloadStart, separator);
  assert.match(payload, /\*\*Capabilities in scope\*\*/);
  assert.match(payload, /\*\*Edge Cases\*\*/);
  assert.match(payload, /\*\*Implementation Details\*\*/);
  assert.match(
    payload,
    /\*\*Overview language\*\*:\s*(?:None|<[^>\n]*(?:selected|overview language|language)[^>\n]*>)/i
  );
  assert.doesNotMatch(payload, /(?:next[- ]step|handoff)[\s\S]{0,240}`?\/sai-1-spec`?/i,
    'the E8 payload must not contain a path-specific next-step');
  assert.match(source.slice(selector), /After the selector response,[\s\S]{0,1200}path-specific Manual\/unmapped next-step handoff[\s\S]{0,420}\/sai-1-spec/i,
    'E8 must place the path-specific next-step outside the payload after the selector');
});

test('Step 4: Manual and unmapped answers give one handoff for each crystallization path without dispatch or a second close', () => {
  const source = exploreContract();
  const selectorSpec = spec('openspec/specs/explore-pipeline-selector/spec.md');
  const handoff = source.indexOf('After the selector response, the surrounding prose of the path-specific Manual/unmapped next-step handoff');
  const deterministic = source.indexOf('**Deterministic selection**', handoff);
  const selectorStart = source.lastIndexOf('Selecting **Manual**', handoff);
  const manual = source.slice(selectorStart, deterministic);

  assert.ok(selectorStart >= 0 && handoff > selectorStart && deterministic > handoff,
    'the shared Manual branch should precede deterministic Auto selection');
  assert.match(manual, /emit that handoff \*\*exactly once\*\*/i);
  assert.match(manual, /path-specific next-step handoff is emitted exactly once after the selector response for every Manual\/unmapped answer/i);
  assert.match(manual, /Selecting \*\*Manual\*\* dispatches nothing/i);
  assert.match(manual, /A free-text answer that maps to neither option is treated as \*\*Manual\*\*/i);
  assert.match(manual, /It MUST NOT emit a second recommendation or selector for the same answer/i);
  assert.match(manual, /no-second-recommendation, and no-second-selector rules/i);
  assert.match(selectorSpec, /Selecting `Manual` SHALL dispatch nothing and SHALL NOT change supervision state/i);
  assert.match(selectorSpec, /An unmapped free-text answer MUST be treated as (?:\*\*|`)Manual(?:\*\*|`)/i);

  for (const [label, branch] of [
    ['Single-change path', /\*\*Open a new chat\*\*[\s\S]{0,120}\/sai-1-spec/],
    ['Sliced path', /\*\*first\*\*[\s\S]{0,160}\/sai-1-spec[\s\S]{0,220}each later slice/],
    ['Inline-refusal path', /Creating a proposal opens a new context[\s\S]{0,260}\/sai-1-spec[\s\S]{0,160}Do not dispatch a proposal in-session/],
  ]) {
    assert.equal((manual.match(new RegExp(`\\*\\*${label}\\*\\*`, 'g')) || []).length, 1,
      `${label} should have exactly one path-specific branch`);
    assert.match(manual, new RegExp(`\\*\\*${label}\\*\\*[\\s\\S]{0,520}${branch.source}`, 'i'),
      `${label} should preserve its single Manual handoff`);
  }
});

test('Step 4: Manual remains uncapped and each later Manual answer emits one handoff', () => {
  const source = exploreContract();
  const selectorSpec = spec('openspec/specs/explore-pipeline-selector/spec.md');
  const handoff = source.indexOf('path-specific next-step handoff is emitted exactly once after the selector response for every Manual/unmapped answer');
  const reinvocation = source.indexOf('**Manual is not terminal**', handoff);

  assert.match(selectorSpec, /[`*]*Manual[`*]* SHALL remain re-invocable without a cap[\s\S]{0,180}selector/i);
  assert.ok(handoff >= 0 && reinvocation > handoff,
    'the one-handoff rule should precede uncapped Manual re-invocation');
  assert.match(source, /path-specific next-step handoff is emitted exactly once after the selector response for every Manual\/unmapped answer/i);
  assert.match(source, /\*\*Manual is not terminal\*\*[^\n]*re-emit the selector[\s\S]{0,260}no cap on re-emissions/i);
});

test('Step 4: successful Auto is silent after selection and never dispatches implementation', () => {
  const source = exploreContract();
  const success = 'successful Auto run emits no next-step handoff and performs no implementation-phase dispatch';
  const successIndex = source.indexOf(success);

  assert.ok(successIndex >= 0, 'the successful Auto outcome should be specified');
  assert.match(source.slice(successIndex, successIndex + 320), /`sai-3 was not run\.`/i,
    'successful Auto should end without implementation dispatch');
});

test('Step 4: failed or cancelled Auto maps retry guidance from phase state without changing retry state', () => {
  const source = exploreContract();
  const selectorSpec = spec('openspec/specs/explore-pipeline-selector/spec.md');
  const contract = [source, selectorSpec].join('\n');

  assert.match(contract, /(?:failed|cancelled)[\s\S]{0,500}(?:absent|not present|missing)[\s\S]{0,220}specs_converged_changes[\s\S]{0,260}`?\/sai-1-spec`?/i,
    'a failed/cancelled Auto phase absent from specs_converged_changes should point to /sai-1-spec');
  assert.match(contract, /specs_converged_changes[\s\S]{0,500}(?:present|contains)[\s\S]{0,260}(?:absent|not present|missing)[\s\S]{0,220}completed_changes[\s\S]{0,260}`?\/sai-2-design`?/i,
    'a converged but incomplete Auto phase should point to /sai-2-design');
  assert.match(contract, /(?:retry state|retry)[\s\S]{0,220}(?:unchanged|preserv|does not change)/i,
    'failed/cancelled guidance must preserve retry state');
  assert.match(contract, /(?:failed|cancelled)[\s\S]{0,700}(?:no|not|never|without)[\s\S]{0,180}(?:implementation|sai-3)[\s\S]{0,120}(?:dispatch|start|run)/i,
    'failed/cancelled Auto must not dispatch implementation');
});

test('Step 4: post-selector prose localizes while command and review-loop literals remain verbatim English', () => {
  const source = exploreContract();
  const selector = source.indexOf('exactly two options, in this fixed order');
  const deterministic = source.indexOf('**Deterministic selection**', selector);
  assert.ok(selector >= 0, 'the selector anchor should be present');
  assert.ok(deterministic > selector, 'deterministic Auto selection should follow the selector prose');
  const postSelector = source.slice(selector, deterministic);

  assert.match(postSelector, /question text and both option labels render in the user's language/i);
  assert.match(postSelector, /After the selector response, the surrounding prose[\s\S]{0,220}follows the selected crystallization language, while its command and standing-path literals remain verbatim English/i);
  assert.match(postSelector, /`review-loop`, `\/sai-1-spec`, and `\/sai-2-design` strings stay verbatim English/i);
  for (const literal of ['`/sai-1-spec`', '`/sai-2-design`', '`review-loop`']) {
    assert.match(postSelector, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${literal} should remain verbatim in post-selector prose`);
  }
});
