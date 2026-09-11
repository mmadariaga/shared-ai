'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const exploreSources = [
  'sai/commands/explore/instructions.md',
  'sai/commands/explore/steps/common.md',
  'sai/commands/explore/steps/artifact-review-language-gate.md',
  'sai/commands/explore/steps/slicing-assessment.md',
  'sai/commands/explore/steps/crystallization-protocol.md',
  'sai/policies/ready-to-propose-format.md',
  'sai/commands/explore/steps/crystallization-language-gates.md',
  'sai/commands/explore/steps/review-loop.md',
  'sai/commands/explore/steps/pipeline-selector.md',
  'sai/commands/explore/steps/pipeline-plan-unattended.md',
  'sai/commands/explore/steps/pipeline-direct-build.md',
  'sai/commands/explore/steps/idea-list.md',
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
  assert.match(source, /exactly three options, in this fixed order/i);
  assert.match(source, /\*\*Plan - Unattended\*\* — Runs `sai-1` and `sai-2` to create the plan and stops for pre-implementation human review\./);
  assert.match(source, /\*\*Direct Build - Unattended\*\* — Implements the change directly and updates specs afterward: ideal for fixes and simple changes\./);
  assert.match(source, /\*\*Manual\*\* — Proceed manually by pasting the `Ready to Propose` block into a new chat with `\/sai-1-spec` \(full control over the process\)\./);
  assert.match(source, /AskUserQuestion on Claude Code|`AskUserQuestion` on Claude Code/i);
  assert.match(source, /`question` tool on opencode/i);
  assert.match(source, /remember\.md`? \(L10\u201315\)/);
  assert.match(source, /Selecting \*\*Plan - Unattended\*\* \(`route_mode = plan-unattended`\)/);

  assert.match(sharedCloseSpec, /one authoritative crystallization-turn close/i);
  assert.match(sharedCloseSpec, /Items 5 \(single change\), 6 \(sliced feature\), and 7 \(inline proposal refusal\)[\s\S]{0,180}reference that definition/i);
  assert.match(selectorSpec, /Selecting `Manual` SHALL dispatch nothing and SHALL NOT change supervision state/i);
  assert.match(selectorSpec, /An unmapped free-text answer MUST be treated as (?:\*\*|`)Manual(?:\*\*|`)/i);
  assert.match(selectorSpec, /[`*]*Manual[`*]* SHALL remain re-invocable without a cap[\s\S]{0,120}selector/i);
  assert.match(source, /`--fast-track` auto-selects nothing: the selector is always asked/i);
});

test('overview-language gate is deferred from crystallization until a dispatchable supervised Plan selection', () => {
  const crystallization = [
    spec('sai/commands/explore/steps/common.md'),
    spec('sai/commands/explore/steps/slicing-assessment.md'),
    spec('sai/commands/explore/steps/crystallization-protocol.md'),
    spec('sai/commands/explore/steps/crystallization-language-gates.md'),
  ].join('\n');
  const supervised = spec('sai/commands/explore/steps/pipeline-plan-unattended.md');

  assert.doesNotMatch(crystallization, /overview-language gate \(gate 9|gate 9.*before.*Ready to Propose/i);
  assert.match(supervised, /Gate 9 at Plan \(unattended\) activation/);
  assert.match(supervised, /after \*\*Deterministic selection\*\* confirms a dispatchable change/i);
  assert.match(supervised, /before setting `active_change` or dispatching the first spec worker/i);
  assert.match(supervised, /Empty or completed crystallization sets, `Cancel`, and an already-active run end before this gate/i);
  assert.match(supervised, /The ask never occurs at crystallization emission.*\*\*Manual\*\*.*\*\*Direct Build \(unattended\)\*\*/i);
});

test('the spec handoff example demonstrates fast-track and overview language together', () => {
  const coordinator = spec('sai/commands/spec/coordinator.md');
  assert.match(coordinator, /sai-2-design \{name\}/);
  assert.match(coordinator, /--fast-track --overview-lang Lang/);
});

test('Manual and unmapped answers preserve the shared close without suppressing re-emission', () => {
  const source = exploreContract();
  const selectorSpec = spec('openspec/specs/explore-pipeline-selector/spec.md');

  assert.match(source, /Selecting \*\*Manual\*\*[\s\S]{0,80}dispatches nothing[\s\S]{0,180}(?:changes no state value|does not change supervision state)/i);
  assert.match(source, /Manual[\s\S]{0,260}(?:already[- ]emitted|already emitted)[\s\S]{0,180}(?:shared close|keep-window-open recommendation|recommendation)/i);
  assert.match(source, /(?:no|not|without|does not|shall not)[\s\S]{0,80}second recommendation[\s\S]{0,80}(?:and|or)[\s\S]{0,50}selector/i);
  assert.match(selectorSpec, /An unmapped free-text answer MUST be treated as (?:\*\*|`)Manual(?:\*\*|`)/i);
  assert.match(selectorSpec, /[`*]*Manual[`*]* SHALL remain re-invocable without a cap[\s\S]{0,120}selector/i);
  assert.match(source, /`--fast-track` auto-selects nothing: the selector is always asked/i);
});

test('the selector authorizes the delegated-write exception and is not the removed review picker', () => {
  const source = exploreContract();

  assert.match(source, /the user's explicit selections on the crystallization-close pipeline selector/i);
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
  assert.match(source, /selector remains a three-option \*\*Plan \(unattended\)\*\*\s*\/\s*\*\*Direct Build \(unattended\)\*\*\s*\/\s*\*\*Manual\*\* choice/i,
    'the review-loop description should name all three selector options');
  assert.doesNotMatch(source, /selector remains a two-option \*\*Auto\*\* \/ \*\*Manual\*\* choice/i);
});

test('the selector prompt and descriptions localize while option titles and command literals stay English', () => {
  const source = exploreContract();

  assert.match(source, /question text and each option description[\s\S]{0,160}fixed option titles remain exactly `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(source, /the literal `review-loop`, `\/sai-1-spec`, and `\/sai-2-design` command strings stay verbatim English/i);
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

test("machine feedback continues each round's complete findings list to the same phase worker", () => {
  const source = exploreContract();
  const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /MachineFeedbackAdapter/);
  assert.match(source, /sai\/policies\/artifact-feedback-gate\.md/);
  assert.match(source, /needs_input/);
  assert.match(source, /same (?:spec[- ]proposal|spec|design|phase)[- ]?worker/i);

  assert.match(policy, /exactly one same-worker continuation[\s\S]{0,200}complete ordered findings/i);
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
  const launcher = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/command-bootstrap.md'), 'utf8');

   assert.match(claude, /Fetch @sai\/adapters\/claude\/idea-list-render\.md/);
   assert.match(claude, /Fetch @sai\/commands\/explore\/command-bootstrap\.md/);
   assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/);
   assert.doesNotMatch(claude, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Edit(?:,|\s|$)/m);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Write(?:,|\s|$)/m);
   assert.doesNotMatch(claude, /allowed-tools:[^\n]*(?:^|,\s*)Bash(?:,|\s|$)/m);

     assert.match(opencode, /Fetch @sai\/commands\/explore\/command-bootstrap\.md/);
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
  const launcher = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/command-bootstrap.md'), 'utf8');

     assert.match(source, /Fetch @sai\/commands\/explore\/command-bootstrap\.md/);
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

test("Step 1 continues each completed round's findings in one batched same-worker continuation", () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /For every completed review pass in the bounded convergence loop|For every completed review round/i);
  assert.match(
    feedbackGate,
    /For each completed review round, perform exactly one same-worker continuation that carries that round's complete ordered findings list/i
  );
  assert.match(feedbackGate, /exactly one verification at the close of the turn \(`openspec validate`\)/i);
  assert.match(feedbackGate, /one block reporting every individual disposition/i);
  assert.match(feedbackGate, /decision-summary recomputation exactly once/i);
  assert.doesNotMatch(feedbackGate, /For each finding[\s\S]{0,120}perform one same-worker continuation/i);
  assert.match(feedbackGate, /Complete all findings for the current (?:pass|round) before supervision evaluates whether another (?:fresh review pass|review round) is required/i);
});

test('Step 1 preserves artifact-only worker ownership and specific discard reasons', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );
  const supervision = exploreContract();

  assert.match(feedbackGate, /Accepted changes remain worker-owned and may be written only by that worker to `proposal\.md` or `specs\/\*\*` in the selected change directory/i);
  assert.match(feedbackGate, /Report every \*\*discarded\*\* item individually[\s\S]{0,240}specific reason/i);
  assert.match(supervision, /The spec worker is the spec phase's only delegated writer:[\s\S]{0,260}SpecWriteSurface[\s\S]{0,180}`proposal\.md`[\s\S]{0,100}`specs\/\*\*`/i);
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

  assert.match(source, /pinned scannable layout single-sourced at `sai\/policies\/autonomy-audit-log\.md`/);
  assert.match(source, /phase label `supervised spec phase`/);
  assert.match(source, /that policy owns the fixed field order, the empty-report case/);
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
   assert.match(source, /On a \*\*Plan - Unattended\*\* or \*\*Direct Build - Unattended\*\* selection, use only `last_crystallization_set` and `completed_changes`/);
  assert.match(source, /review loop's \(item 9\) source only, and is never the selector's dispatch source/i);
  assert.match(source, /replaces `last_crystallization_set` with that turn's emitted names/i);
  assert.match(source, /assumed applied or discarded/i);
  assert.doesNotMatch(source, /\bwrapper_echo_value\s*:/,
    'supervised chained requests must not construct or forward the wrapper echo field');
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

   assert.match(source, /Active supervision rejects another \*\*Plan \(unattended\)\*\* selection/i);
  assert.match(source, /throughout the chained design phase/i);
  assert.match(source, /ends only at the applicable terminal outcome/i);
  assert.match(source, /spec and design.*(?:review_rounds|review rounds).*autonomy records remain separate|spec and design.*autonomy records remain separate/i);
  assert.match(source, /completed_changes.*applicable terminal worker result/i);
  assert.match(source, /specs_converged_changes.*active_phase.*design/i);
});

test('active exploration closure defines the three conversation-only states and success-only rule', () => {
  const source = spec('sai/commands/explore/steps/common.md');

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
  const shared = exploreContract();
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

  assert.match(source, /## Overview-language validation/);
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
    exploreContract(),
    spec('sai/commands/explore/body.md'),
  ].join('\n');
  const selectorStart = contract.search(/Gate 9 at Plan \(unattended\) activation/i);

  assert.ok(selectorStart >= 0, 'the opt-in overview-language selector should be specified');
  const selector = contract.slice(selectorStart);

  assert.match(selector, /(?:None\s*(?:â€”|-)\s*do[- ]not[- ]create|do[- ]not[- ]create[\s\S]{0,120}None)/i);
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
    exploreContract(),
    spec('sai/commands/explore/body.md'),
  ].join('\n');
  const selectorStart = contract.search(/Gate 9 at Plan \(unattended\) activation/i);

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

test('Step 1 forwards selected overview language only for Plan (unattended) and keeps None and Manual free of overview dispatch', () => {
  const source = exploreContract();

  assert.match(source, /overview_language/);
  assert.match(source, /--overview-lang/);
  assert.match(source, /selected.*language|language.*selected/i);
  assert.match(source, /arguments_value:\s*"\{name\} --fast-track --supervised --overview-lang \{overview_language\}"/);

  const deterministic = source.indexOf('**Deterministic selection**');
  assert.ok(deterministic >= 0, 'the deterministic Plan/Build selection contract should be present');
  const auto = source.slice(deterministic);
  const noOverview = auto.match(
    /(?:do[- ]not[- ]create|None)[\s\S]{0,5000}?arguments_value:\s*"\{name\} --fast-track --supervised"/i
  );
  assert.ok(
    noOverview,
    'do-not-create/None Plan should forward exactly {name} --fast-track --supervised'
  );
  const noOverviewEnvelope = noOverview[0].match(/arguments_value:\s*"[^"]+"/i)?.[0] || '';
  assert.equal(
    noOverviewEnvelope,
    'arguments_value: "{name} --fast-track --supervised"',
    'the do-not-create/None Plan envelope should contain no overview flag or value'
  );
  assert.doesNotMatch(
    noOverviewEnvelope,
    /--overview-lang(?:\s|`|"|$)/i,
    'the do-not-create/None Plan envelope must not carry an overview flag or value'
  );

  const manualStart = source.lastIndexOf('Selecting **Manual**');
  assert.ok(manualStart >= 0, 'the Manual selector branch should be present');
  const manual = source.slice(manualStart, deterministic);
  assert.match(manual, /dispatches nothing/i);
  assert.doesNotMatch(manual, /(?:command_name|arguments_value)\s*:/i,
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

// â”€â”€â”€ Step 2: spec-design-review-progress-step (external findings and worker correction) â”€

test('Step 2: external findings stay within reviewed artifacts and worker corrections retain specific discard reasons', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const coordinator = spec('sai/commands/spec/coordinator.md');
  const source = `${worker}\n${coordinator}`;

  assert.match(source, /external[\s-]+(?:artifact[- ]review )?findings?/i,
    'the correction path should consume external findings');
  assert.match(source, /Findings may edit only\s+`proposal\.md`\s+and\s+`specs\/\*\*`|findings?[^\n]{0,180}(?:only|limited|restricted)[^\n]{0,180}(?:proposal\.md|specs\/\*\*)/i,
    'external findings should be corrected only within the reviewed artifacts');
  assert.match(source, /Accepted edits trigger pre-completion verification and decision-summary recomputation from current artifacts/i,
    'accepted external corrections should trigger worker verification and summary recomputation');
  assert.match(source, /Findings may edit only\s+`proposal\.md`\s+and\s+`specs\/\*\*`|findings?[\s\S]{0,180}(?:only|limited|restricted)[\s\S]{0,120}(?:proposal\.md|specs\/\*\*)/i,
    'external findings should be limited to the reviewed artifacts');
  assert.match(source, /Report every discarded item with a specific\s+reason|reports? every discard with its specific\s+reason|every discarded item individually[\s\S]{0,120}specific\s+reason/i,
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
  const contract = spec('sai/policies/spec-phase-contract.md');

  assert.doesNotMatch(worker, /run the automatic review loop/,
    'validation must not enter a worker-owned automatic review loop');
  assert.match(worker, /artifact validation plus decision-summary derivation returns `validation`/,
    'validation should be reported as a progress event');
  assert.match(worker, /external[\s-]+(?:artifact[- ]review )?findings?/i,
    'external findings should follow validation');
  assert.match(worker, /valid[\s\S]{0,220}(?:external|base[- ]form)[\s\S]{0,220}(?:High=0|Summary)|(?:High=0|Summary)[\s\S]{0,220}(?:valid|external|base[- ]form)/i,
    'only valid external evidence may produce review progress');
  assert.match(contract, /`validation`[\s\S]{0,120}`review`/,
    'the canonical plan should order validation before review');
});

test('Step 2: external findings, not worker inference, drive review evidence and corrections', () => {
  const worker = spec('sai/commands/spec/worker.md');

  assert.match(worker, /external[\s-]+(?:artifact[- ]review )?findings?/i,
    'the worker should consume external findings');
  assert.match(worker, /Findings may edit only\s+`proposal\.md`\s+and\s+`specs\/\*\*`/,
    'the external correction scope should remain explicit');
  assert.match(worker, /never infer `?High=0`? from missing, malformed, or other summary text/i,
    'a worker must not infer review evidence from absent or malformed input');
  assert.doesNotMatch(worker, /The reviewer evaluates reviewed-set consistency/,
    'the retired worker-owned reviewer axes must be absent');
});

test('Step 2: workers have no automatic reviewer loop under supervision and the supervised flow has no routed task list', () => {
  const worker = spec('sai/commands/spec/worker.md');
  const supervision = exploreContract();

  assert.match(worker, /\bsupervised\b/i,
    'the worker contract should state the supervised boundary');
  assert.match(worker, /does not dispatch or own an artifact reviewer, an automatic review loop, review counters/i,
    'the worker must not retain a worker-owned automatic reviewer or its counters');
  assert.match(worker, /Explore\s+may suppress the visual plan while retaining the pointer map/i,
    'the supervised selector must retain pointer routing without visual progress');
  assert.doesNotMatch(worker, /coexists with and never replaces the supervised pipeline's (?:independent convergence loop|supervised review rounds|in[- ]session review rounds)/i,
    'supervision must not retain a second worker-owned review layer');
  assert.match(supervision, /declares no visual `progress_plan`/,
    'the supervised adapter should suppress only the visual progress plan');
  assert.match(supervision, /no task-list step is marked and no milestone stamp is rendered/i,
    'no routed task list should render under supervision');
  assert.match(supervision, /canonical routing-only `SpecStepPointerMap`/,
    'pointer routing should remain active under supervision');
});

// â”€â”€â”€ Step 3: spec-design-review-progress-step (supervised design review) â”€â”€â”€â”€

test('Step 3: design workers have no automatic reviewer loop under supervision and keep the supervised flow without routed-list marking', () => {
  const worker = spec('sai/commands/design/worker.md');
  const supervision = exploreContract();

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

// â”€â”€â”€ suppress-worker-review-under-supervision: Auto envelope pins (verify-first) â”€
test('Plan spec envelope carries leading --supervised only in arguments_value', () => {
  const source = exploreContract();
  assert.doesNotMatch(source, /\bwrapper_echo_value\s*:/,
    'spec Plan dispatch must not construct or forward the wrapper echo field');
  assert.match(source, /arguments_value:[\s\S]{0,200}--supervised/, 'spec Plan dispatch should put --supervised on arguments_value');
  assert.match(source, /arguments_value:[\s\S]{0,200}--supervised[\s\S]{0,200}Ready to Propose|arguments_value[\s\S]{0,120}line `--supervised`[\s\S]{0,200}Ready to Propose/i, 'spec arguments_value should begin with --supervised ahead of the Ready-to-Propose body');
  assert.doesNotMatch(source, /\bwrapper_echo_value\s*:\s*"--supervised"/,
    'explore must not carry the marker as a bare non-empty wrapper echo');
});

test('Plan chained design envelope forwards overview generation conditionally', () => {
  const source = exploreContract();
  const deterministic = source.indexOf('**Deterministic selection**');
  assert.ok(deterministic >= 0, 'the deterministic Plan/Build selection contract should be present');
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
    'the supervised Plan envelope should remain name-first and fast-track-first'
  );
});

test('Step 7: design grammar is name-first and accepts supervised and fast-track flags', () => {
  const worker = spec('sai/commands/design/worker.md');

  assert.match(worker, /requires the change name before the option/i,
    'the design grammar should require the change name before flags');
  assert.match(worker, /recognize bare `--supervised`/i,
    'the design grammar should recognize the bare --supervised flag');
  assert.match(worker, /order-independent among flags after the change name[\s\S]{0,220}both accepted/i,
    'the overview-language and supervised flags stay order-independent after the name');
  assert.match(worker, /If `--fast-track` is present[\s\S]{0,220}remove the token/i,
    'the design worker must strip fast-track from the combined envelope');
  assert.match(worker, /fast-track notice/i,
    'the design worker must return a fast-track notice');
  assert.match(worker, /coordinator prints it/i,
    'the coordinator must own presentation of the worker-produced fast-track notice');
});

test('design-phase retry carries --supervised and does not re-run sai-1', () => {
  const source = exploreContract();
  assert.match(source, /design-phase retry[\s\S]{0,800}--supervised|retry[\s\S]{0,400}--supervised[\s\S]{0,400}design/i, 'design-phase retry must carry --supervised');
  assert.match(source, /design-phase retry[\s\S]{0,500}never dispatch sai-1|never[\s\S]{0,80}regenerate `proposal\.md`|does not re-dispatch the sai-1/i, 'design-phase retry must not re-dispatch sai-1 or regenerate proposal/specs');
});

// â”€â”€â”€ Step 1: supervised-review-in-session (in-session review rounds) â”€

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
  const source = exploreContract();

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

test('shared native stage selector capability and response shapes keep stable protocol values', () => {
  const shared = exploreContract();

  assert.match(shared, /NativeStageSelectorCapability\s*=\s*\{ available: boolean, supportsFreeText: boolean, present\(selector, orderedOptions\) -> SelectorResponse \}/);
  assert.match(shared, /SelectorResponse\s*=\s*\{ selector: maturity\|later, kind: option\|free-text, value: review-edge-cases\|keep-iterating\|next-step\|discuss-ideas-feedback\|null, text: string\|null \}/);
  for (const value of ['review-edge-cases', 'keep-iterating', 'next-step', 'discuss-ideas-feedback']) {
    assert.match(shared, new RegExp(`\\b${value}\\b`), `${value} should remain a stable selector value`);
  }
  assert.match(shared, /For `kind: option`, `value` is the stable protocol value and `text` is `null`/);
  assert.match(shared, /A response is valid only for the selector that is currently pending/);
});

test('stage selectors preserve Spanish ordering and later placement after both text list questions', () => {
  const shared = exploreContract();
  const edgeCaseQuestion = shared.indexOf('established edge-case text question');
  const implementationQuestion = shared.indexOf('implementation-detail text question');
  const laterSelector = shared.indexOf('one later selector', implementationQuestion);

  assert.ok(edgeCaseQuestion >= 0, 'the established edge-case text question should remain explicit');
  assert.ok(implementationQuestion > edgeCaseQuestion, 'implementation details must follow edge cases');
  assert.ok(laterSelector > implementationQuestion, 'the later selector must follow both existing text questions');
  assert.match(shared, /localized advancement label maps exactly to the stable value `next-step`/);
  assert.match(shared, /Ir al siguiente step/);
  assert.match(shared, /Discutir ideas \/ dar feedback/);
  assert.ok(shared.indexOf('Ir al siguiente step') < shared.indexOf('Discutir ideas / dar feedback'),
    'Spanish later-selector options must preserve next-step before discussion order');
  assert.match(shared, /later selector is additive and does not replace either text question/);
});

test('discussion and free-text selector answers do not advance while next-step is exactly the existing path', () => {
  const shared = exploreContract();

  assert.match(shared, /The discussion value and later-selector free text remain in ask mode and do not advance, agree a list, or crystallize/);
  assert.match(shared, /Arbitrary free text is never treated as advancement merely because a selector was displayed/);
  assert.match(shared, /The later response value `next-step` follows the existing literal `next-step` intent-recognition path exactly/);
  for (const branch of [
    'non-empty and empty edge-case branches',
    'non-empty and empty implementation-detail branches',
    'stage transitions',
    'entry into `Crystallize`',
  ]) assert.match(shared, new RegExp(branch.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')));
  assert.match(shared, /The existing text questions, semantic agreement gates, `ask_mode` transitions, material-change reset/);
});

test('selector semantics remain shared and are not duplicated in harness wrappers or renderers', () => {
  const shared = exploreContract();
  const claudeWrapper = spec('commands/claude/sai-explore.md');
  const opencodeWrapper = spec('commands/opencode/sai-explore.md');
  const claudePanel = spec('sai/adapters/claude/panel-render.md');
  const opencodePanel = spec('sai/adapters/opencode/panel-render.md');
  const claudeList = spec('sai/adapters/claude/idea-list-render.md');
  const opencodeList = spec('sai/adapters/opencode/idea-list-render.md');

  assert.match(shared, /Claude Code and opencode consume this shared contract/);
  for (const harnessSurface of [claudeWrapper, opencodeWrapper, claudePanel, opencodePanel, claudeList, opencodeList]) {
    assert.doesNotMatch(harnessSurface, /NativeStageSelectorCapability|keep-iterating|discuss-ideas-feedback|selector-presented|selector-option-received|selector-free-text-received/);
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
  const source = exploreContract();
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
  const source = exploreContract();
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
  const source = exploreContract();
  const gate = source.match(
    /(?:proposal\.md[\s\S]{0,500}specs\/\*\*[\s\S]{0,700}(?:Finish|phase-transition)[\s\S]{0,300}(?:phase-transition|Finish)|design\.md[\s\S]{0,350}tasks\.md[\s\S]{0,350}interfaces\.md[\s\S]{0,900}(?:Continue|overview-generation|supervised-terminal)[\s\S]{0,300}(?:overview-generation|supervised-terminal|Continue))/i
  );

  assert.ok(gate, 'a supervised artifact gate should exist before post-proceed reporting');
  const afterGate = source.slice(gate.index + gate[0].length);
  assert.match(afterGate, /Auto-answered:[\s\S]{0,220}Escalated:/i,
    'post-proceed reporting should retain Auto-answered before Escalated');
  assert.match(source, /pinned scannable layout single-sourced at `sai\/policies\/autonomy-audit-log\.md`/,
    'post-proceed reporting should render the audit through the single-sourced policy');
  assert.match(source, /grounding citation/,
    'post-proceed reporting should retain question, answer, and grounding order');
  assert.doesNotMatch(
    source,
    /active[- ]supervision\s+interval[\s\S]{0,360}(?:stage|step)[\s\S]{0,180}(?:enumerat|\b1\.[\s\S]{0,80}\b2\.)/i,
    'the supervised contract must not add interval stage-enumeration prose'
  );
});

// â”€â”€â”€ Step 4: handoff-before-selector (green-exception tests) â”€

test('Step 4: the shared close emits every path-specific sai-1 handoff before the selector', () => {
  const nucleus = spec('sai/commands/explore/instructions.md');
  const selectorSpec = spec('sai/commands/explore/steps/pipeline-selector.md');
  const close = nucleus.indexOf('**Crystallization-turn close (shared):**');
  const handoff = nucleus.indexOf('Immediately after the `---` separator that ends the handoff block(s)', close);
  const recommendation = nucleus.indexOf('One keep-window-open recommendation', close);
  const selector = nucleus.indexOf('After that recommendation, emit the crystallization-close pipeline selector', recommendation);

  assert.ok(close >= 0, 'the shared close ordering contract should be present');
  assert.ok(handoff > close && handoff < recommendation,
    'the path-specific next-step handoff should be emitted after the payload separator and before the recommendation');
  assert.ok(selector > recommendation,
    'the recommendation should precede the selector, which remains the close final emission');

  const handoffBlock = nucleus.slice(handoff, recommendation);
  for (const [label, branch] of [
    ['Single-change path', /\*\*Open a new chat\*\*[\s\S]{0,120}\/sai-1-spec/],
    ['Sliced path', /\*\*first\*\*[\s\S]{0,160}\/sai-1-spec[\s\S]{0,220}each later slice/],
    ['Inline-refusal path', /Creating a proposal opens a new context[\s\S]{0,260}\/sai-1-spec[\s\S]{0,160}Do not dispatch a proposal in-session/],
  ]) {
    assert.equal((handoffBlock.match(new RegExp(`\\*\\*${label}\\*\\*`, 'g')) || []).length, 1,
      `${label} should have exactly one pre-selector handoff branch`);
    assert.match(handoffBlock, new RegExp(`\\*\\*${label}\\*\\*[\\s\\S]{0,520}${branch.source}`, 'i'),
      `${label} should keep its handoff wording in the shared close`);
  }

  assert.doesNotMatch(selectorSpec, /\*\*Single-change path\*\*|\*\*Sliced path\*\*|\*\*Inline-refusal path\*\*/,
    'the selector card must not restate the path-specific handoff branches');
  assert.doesNotMatch(selectorSpec, /After the selector response, the surrounding prose of the path-specific Manual\/unmapped next-step handoff/i,
    'the selector card must not describe the handoff as post-selector prose');
  assert.doesNotMatch(exploreContract(), /exactly once after the selector response/i,
    'the handoff must not be described as emitted after the selector response');
});

test('Step 4: the Ready-to-Propose payload stays bounded and the pre-selector handoff stays outside it', () => {
  const format = spec('sai/policies/ready-to-propose-format.md');
  const payloadStart = format.indexOf('## Ready to Propose');
  const separator = format.indexOf('\n---', payloadStart);

  assert.ok(payloadStart >= 0 && separator > payloadStart,
    'the ready-to-propose format should retain its heading and separator');

  const payload = format.slice(payloadStart, separator);
  assert.match(payload, /\*\*Capabilities in scope\*\*/);
  assert.match(payload, /\*\*Edge Cases\*\*/);
  assert.match(payload, /\*\*Implementation Details\*\*/);
  assert.match(payload, /\*\*Overview language\*\*:/);
  assert.doesNotMatch(payload, /(?:next[- ]step|handoff)[\s\S]{0,240}`?\/sai-1-spec`?/i,
    'the payload must not contain a path-specific next-step');
  assert.doesNotMatch(payload, /After the selector response/i,
    'the payload must not contain close-sequence prose');

  const nucleus = spec('sai/commands/explore/instructions.md');
  const selectorSpec = spec('sai/commands/explore/steps/pipeline-selector.md');
  const close = nucleus.indexOf('**Crystallization-turn close (shared):**');
  const handoff = nucleus.indexOf('Immediately after the `---` separator that ends the handoff block(s)', close);

  assert.ok(close >= 0 && handoff > close,
    'the shared close should emit the path-specific next-step handoff after the payload separator');
  assert.match(selectorSpec, /this selector is that close's final emission[\s\S]{0,220}keep-window-open recommendation/i,
    'the selector should remain the close final emission after the handoff and recommendation');
});

test('Step 4: Manual and unmapped answers refer to the already-emitted handoff without dispatch or a second close', () => {
  const source = exploreContract();
  const selectorSpec = spec('sai/commands/explore/steps/pipeline-selector.md');
  const selectorSpecFile = spec('openspec/specs/explore-pipeline-selector/spec.md');
  const nucleus = spec('sai/commands/explore/instructions.md');
  const close = nucleus.indexOf('**Crystallization-turn close (shared):**');
  const handoff = nucleus.indexOf('Immediately after the `---` separator that ends the handoff block(s)', close);
  const recommendation = nucleus.indexOf('One keep-window-open recommendation', close);

  assert.ok(close >= 0 && handoff > close && recommendation > handoff,
    'the shared close should place the handoff before the recommendation');

  const deterministic = selectorSpec.indexOf('**Deterministic selection**');
  const selectorStart = selectorSpec.indexOf('Selecting **Manual**');
  const manual = selectorSpec.slice(selectorStart, deterministic);

  assert.ok(selectorStart >= 0 && deterministic > selectorStart,
    'the shared Manual branch should precede deterministic Plan/Build selection');
  assert.match(manual, /Selecting \*\*Manual\*\*[\s\S]{0,80}dispatches nothing/i);
  assert.match(manual, /refers to the one keep-window-open recommendation already emitted[\s\S]{0,400}MUST NOT emit a second recommendation, handoff, or selector/i);
  assert.match(manual, /MUST NOT re-emit or restate the already-emitted path-specific next-step handoff/i);
  assert.match(manual, /A free-text answer that maps to neither option is treated as \*\*Manual\*\*/i);
  assert.match(manual, /no-second-recommendation, no-second-handoff, and no-second-selector rules/i);
  assert.match(selectorSpec, /the path-specific next-step handoff for every Manual\/unmapped answer was already emitted exactly once before the selector/i);
  assert.match(selectorSpecFile, /Selecting `Manual` SHALL dispatch nothing and SHALL NOT change supervision state/i);
  assert.match(selectorSpecFile, /An unmapped free-text answer MUST be treated as (?:\*\*|`)Manual(?:\*\*|`)/i);
  assert.doesNotMatch(source, /path-specific next-step handoff is emitted exactly once after the selector response/i,
    'the Manual branch must not re-emit the handoff after the selector response');
});

test('Step 4: Manual remains uncapped and each re-emission emits one handoff before the selector', () => {
  const selectorSpec = spec('sai/commands/explore/steps/pipeline-selector.md');
  const selectorSpecFile = spec('openspec/specs/explore-pipeline-selector/spec.md');
  const reinvocation = selectorSpec.indexOf('**Manual is not terminal**');
  const reEmission = selectorSpec.indexOf('every re-emission emits the path-specific next-step handoff exactly once before the selector again', reinvocation);

  assert.match(selectorSpecFile, /[`*]*Manual[`*]* SHALL remain re-invocable without a cap[\s\S]{0,180}selector/i);
  assert.ok(reinvocation >= 0 && reEmission > reinvocation,
    'uncapped Manual re-invocation should state the one-handoff-per-re-emission rule');
  assert.match(selectorSpec, /\*\*Manual is not terminal\*\*[^\n]*re-emit the selector[\s\S]{0,260}no cap on re-emissions/i);
});

test('Step 4: successful Plan (unattended) emits the build handoff and never dispatches implementation', () => {
  const source = exploreContract();
  const success = 'A successful Plan (unattended) run emits the `Next step: run /sai-build {name}.` handoff and performs no implementation-phase dispatch';
  const successIndex = source.indexOf(success);

  assert.ok(successIndex >= 0, 'the successful Plan outcome should be specified');
  assert.match(source.slice(successIndex, successIndex + 320), /`Next step: run \/sai-build \{name\}\.`/i,
    'successful Plan should hand off to the build composition');
  assert.doesNotMatch(source.slice(successIndex, successIndex + 320), /`sai-3 was not run\.`/i,
    'successful Plan should not emit the obsolete terminal text');
});

test('Step 4: Direct Build (unattended) completion re-presents a per-slice selector and Manual pauses pending slices', () => {
  const source = exploreContract();
  const transitionStart = source.indexOf('**Successful slice completion transition');
  const transitionEnd = source.indexOf('**Failures**', transitionStart);
  assert.ok(transitionStart >= 0 && transitionEnd > transitionStart,
    'the Build completion transition should be present');

  const transition = source.slice(transitionStart, transitionEnd);
  assert.match(transition, /recompute `pending_slices` only from `last_crystallization_set` minus `completed_changes`/i);
  assert.match(transition, /re-present the existing full three-option `Plan \(unattended\)` \/ `Direct Build \(unattended\)` \/ `Manual` selector exactly once/i);
  assert.match(transition, /per-slice authorization gate, not a one-time authorization/i);
  assert.match(transition, /even when exactly one pending slice remains/i);
  assert.match(transition, /Never re-select or re-run a name already in `completed_changes`/i);
  assert.match(transition, /Selecting `Manual` on this continuation selector starts no additional slice/i);
  assert.match(transition, /require a later explicit request before any pending slice runs/i);
});

test('Step 4: failed or cancelled Plan maps retry guidance from phase state without changing retry state', () => {
  const source = exploreContract();
  const selectorSpec = spec('openspec/specs/explore-pipeline-selector/spec.md');
  const contract = [source, selectorSpec].join('\n');

  assert.match(contract, /(?:failed|cancelled)[\s\S]{0,500}(?:absent|not present|missing)[\s\S]{0,220}specs_converged_changes[\s\S]{0,260}`?\/sai-1-spec`?/i,
    'a failed/cancelled Plan phase absent from specs_converged_changes should point to /sai-1-spec');
  assert.match(contract, /specs_converged_changes[\s\S]{0,500}(?:present|contains)[\s\S]{0,260}(?:absent|not present|missing)[\s\S]{0,220}completed_changes[\s\S]{0,260}`?\/sai-2-design`?/i,
    'a converged but incomplete Plan phase should point to /sai-2-design');
  assert.match(contract, /(?:retry state|retry)[\s\S]{0,220}(?:unchanged|preserv|does not change)/i,
    'failed/cancelled guidance must preserve retry state');
  assert.match(contract, /(?:failed|cancelled)[\s\S]{0,700}(?:no|not|never|without)[\s\S]{0,180}(?:implementation|sai-3)[\s\S]{0,120}(?:dispatch|start|run)/i,
    'failed/cancelled Plan must not dispatch implementation');
});

test('Step 4: handoff prose localizes while command and review-loop literals remain verbatim English', () => {
  const nucleus = spec('sai/commands/explore/instructions.md');
  const selectorSpec = spec('sai/commands/explore/steps/pipeline-selector.md');
  const close = nucleus.indexOf('**Crystallization-turn close (shared):**');
  const recommendation = nucleus.indexOf('One keep-window-open recommendation', close);

  assert.ok(close >= 0 && recommendation > close,
    'the shared close should keep the recommendation after the handoff');
  const handoffBlock = nucleus.slice(close, recommendation);
  assert.match(handoffBlock, /handoff's surrounding prose follows the selected crystallization language per item 8/i);
  assert.match(handoffBlock, /`\/sai-1-spec`, `\/sai-2-design`, and `review-loop` remain verbatim English/i);
  for (const literal of ['`/sai-1-spec`', '`/sai-2-design`', '`review-loop`']) {
    assert.match(handoffBlock, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${literal} should remain verbatim in the pre-selector handoff prose`);
  }

  assert.match(selectorSpec, /question text and each option description[\s\S]{0,160}fixed option titles remain exactly `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(selectorSpec, /the literal `review-loop`, `\/sai-1-spec`, and `\/sai-2-design` command strings stay verbatim English/i);
});

const artifact = relativePath => spec(relativePath);

test('Step 2 item-10 starts one phase-selected Review Engine diagnosis round after worker failure', () => {
  const source = supervisionContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 7000);

  assert.match(source, /diagnosis_rounds/);
  const reviewEngineCall = String.raw`Review\s+Engine\s*\(\s*changeName\s*,\s*["'\x60]sai-(?:1|2)["'\x60]\s*\)`;
  const coordinatorDisproved = String.raw`(?:coordinator[\s\S]{0,180}disprov\w*|disprov\w*[\s\S]{0,180}coordinator)`;
  const completedCoordinatorDisproved = String.raw`(?:completed[\s\S]{0,900}${coordinatorDisproved}|${coordinatorDisproved}[\s\S]{0,900}completed)`;
  const completedStop = String.raw`(?:completed[\s\S]{0,900}STOP|STOP[\s\S]{0,900}completed)`;
  const diagnosisEntry = trigger => new RegExp(
    String.raw`(?:${trigger}[\s\S]{0,900}${reviewEngineCall}|${reviewEngineCall}[\s\S]{0,900}${trigger})`,
    'i'
  );

  for (const [trigger, entry] of [
    ['failed or cancelled', diagnosisEntry(String.raw`(?:failed|cancelled)`)],
    ['completed and coordinator-disproved', diagnosisEntry(completedCoordinatorDisproved)],
    ['completed and STOP-bearing', diagnosisEntry(completedStop)],
  ]) {
    assert.match(
      diagnosis,
      entry,
      `${trigger} workers should enter a phase-selected Review Engine diagnosis`
    );
  }

  let previous = -1;
  for (const label of ['Reported', 'Evidence', 'Cause', 'Correction', 'Verification']) {
    const index = diagnosis.indexOf(label);
    assert.ok(index >= 0, `diagnosis should include ${label}`);
    assert.ok(index > previous, `diagnosis labels should remain ordered through ${label}`);
    previous = index;
  }

  assert.match(diagnosis, /continue_after_recovery/);
  assert.match(
    diagnosis,
    /(?:at most one[\s\S]{0,220}(?:same[- ]worker[\s\S]{0,120}(?:re[- ]?dispatch|dispatch)|(?:re[- ]?dispatch|dispatch)[\s\S]{0,120}same[- ]worker)|same[- ]worker[\s\S]{0,220}(?:re[- ]?dispatch|dispatch)[\s\S]{0,120}at most one)/i,
    'diagnosis permits at most one same-worker re-dispatch'
  );
});

test('Step 2 item-10 cancelled workers use the Explore-specific diagnosis path', () => {
  const source = exploreContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 7000);

  assert.match(diagnosis, /item[- ]?10[\s\S]{0,500}(?:cancelled|cancellation)|(?:cancelled|cancellation)[\s\S]{0,500}item[- ]?10/i);
  assert.match(
    diagnosis,
    /(?:cancelled|cancellation)[\s\S]{0,900}(?:Diagnosis\s+Round|diagnosis_rounds|Review\s+Engine)|(?:Diagnosis\s+Round|diagnosis_rounds|Review\s+Engine)[\s\S]{0,900}(?:cancelled|cancellation)/i,
    'cancellation should remain on the Explore diagnosis path'
  );
  assert.match(
    diagnosis,
    /(?:(?:not|never|does not|must not)[\s\S]{0,180}(?:a\s+)?(?:standalone|manual)[\s\S]{0,180}(?:recover|recovery))|(?:(?:standalone|manual)[\s\S]{0,180}(?:recover|recovery)[\s\S]{0,180}(?:not|never|excluded|item[- ]?10))/i,
    'cancelled item-10 work must not become a standalone or manual recovery path'
  );
});

test('Step 2 item-10 diagnosis forwards findings without direct Explore repair or replacement workers', () => {
  const source = exploreContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 7000);

  assert.match(
    diagnosis,
    /(?:(?:diagnosis|Review\s+Engine)\s+findings?[\s\S]{0,260}(?:forward|pass|return)[\s\S]{0,220}(?:same[- ]worker|phase worker|worker))|(?:(?:forward|pass|return)[\s\S]{0,220}(?:diagnosis|Review\s+Engine)\s+findings?[\s\S]{0,220}worker)/i,
    'diagnosis findings should be forwarded to the existing phase worker'
  );
  assert.match(
    diagnosis,
    /(?:Explore|explore|diagnosis)[\s\S]{0,260}(?:never|does not|must not|no direct)[\s\S]{0,220}(?:apply|write|edit|repair)/i,
    'Explore must not directly apply, write, edit, or repair the diagnosis correction'
  );
  assert.match(
    diagnosis,
    /(?:(?:never|does not|must not|no)[\s\S]{0,180}(?:dispatch|create|select|use)[\s\S]{0,120}replacement worker)|(?:replacement worker)[\s\S]{0,160}(?:is|gets?)?[\s\S]{0,80}(?:never|not|no)[\s\S]{0,100}(?:dispatch|create|select)/i,
    'diagnosis must not dispatch a replacement worker'
  );
});

test('Step 2 item-10 diagnosis rounds are phase-keyed, separate from review rounds, and reset per Plan attempt', () => {
  const source = supervisionContract();

  assert.match(source, /diagnosis_rounds[\s\S]{0,180}\bspec\b/i, 'diagnosis_rounds.spec should be named');
  assert.match(source, /diagnosis_rounds[\s\S]{0,260}\bdesign\b/i, 'diagnosis_rounds.design should be named');

  const counterPair = source.match(/diagnosis_rounds[\s\S]{0,700}review_rounds|review_rounds[\s\S]{0,700}diagnosis_rounds/i);
  assert.ok(counterPair, 'diagnosis_rounds and review_rounds should be discussed together');
  assert.match(counterPair[0], /independent|separate|distinct/i, 'diagnosis rounds must be independent of review rounds');
  assert.match(
    source,
    /(?:plan-unattended|Plan \(unattended\))[\s\S]{0,800}(?:reset|zero|starts?\s+at\s+(?:0|zero))[\s\S]{0,500}diagnosis_rounds|diagnosis_rounds[\s\S]{0,800}(?:reset|zero|starts?\s+at\s+(?:0|zero))[\s\S]{0,500}(?:plan-unattended|Plan \(unattended\))/i,
    'a new Plan attempt should reset diagnosis rounds'
  );
});

test('Step 2 item-10 diagnosis references Bounded Recovery without restating the generic recovery contract', () => {
  const source = supervisionContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 7000);
  const recovery = artifact('sai/policies/bounded-recovery.md');

  assert.match(recovery, /Bounded Recovery/i, 'the shared Bounded Recovery contract should exist');
  assert.match(diagnosis, /Bounded Recovery/i, 'item-10 should reference Bounded Recovery');
  for (const coordinatorPath of [
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/apply/coordinator.md',
    'sai/commands/meta-build/coordinator.md',
  ]) {
    assert.match(
      artifact(coordinatorPath),
      /Fetch @sai\/policies\/bounded-recovery\.md and follow it as part of the shared runner\./,
      `${coordinatorPath} should statically load the bounded-recovery policy`
    );
  }
  assert.match(
    diagnosis,
    /(?:(?:single|sole|shared)[\s\S]{0,180}(?:Bounded Recovery|contract))|(?:Bounded Recovery|contract)[\s\S]{0,180}(?:single|sole|shared)/i,
    'Bounded Recovery should remain the single shared contract'
  );
  assert.match(
    diagnosis,
    /(?:does not|never|must not)[\s\S]{0,220}(?:restate|repeat|duplicate|reproduce)[\s\S]{0,220}(?:full|generic)[\s\S]{0,180}(?:ledger|routing)/i,
    'item-10 should not restate the full generic ledger or routing contract'
  );
});

test('Step 2 item-10 exhausted diagnosis keeps the change retryable with phase guidance only', () => {
  const source = exploreContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 12000);

  assert.match(diagnosis, /(?:exhausted|failed)[\s\S]{0,650}continuation\/transport loss|continuation\/transport loss[\s\S]{0,650}(?:exhausted|failed)/i);
  assert.match(diagnosis, /retryable/i);
  assert.match(diagnosis, /(?:later Plan \(unattended\)|next Plan \(unattended\)|plan-unattended|uncompleted)/i);
  assert.match(
    diagnosis,
    /Next step:\s*run\s+[`"']*\/sai-(?:1-spec|2-design)|applicable existing phase guidance/i
  );
  assert.match(
    diagnosis,
    /(?:(?:not|never|does not|must not|without)[\s\S]{0,180}(?:dispatch|start|run)[\s\S]{0,100}sai-3-implement)|(?:sai-3-implement)[\s\S]{0,180}(?:not|never|does not|must not|no)[\s\S]{0,100}(?:dispatch|start|run)/i,
    'diagnosis exhaustion must not dispatch sai-3-implement'
  );
});

test('Step 3: failed or cancelled item-10 work settles the active phase review item before Diagnosis Round', () => {
  const source = exploreContract();

  assert.match(
    source,
    /(?:item[- ]?10[\s\S]{0,1000}(?:failed|cancelled)|(?:failed|cancelled)[\s\S]{0,1000}item[- ]?10)[\s\S]{0,1000}(?:active phase|phase review|reviewed-sai-[12])[\s\S]{0,700}(?:resolv\w*|set\w*|becom\w*)?[\s\S]{0,120}`pending`[\s\S]{0,700}(?:Diagnosis Round|diagnosis[- ]entry|Review\s+Engine\s+diagnosis)/i,
    'item-10 failure must resolve the active phase review item to pending before diagnosis'
  );
});

test('Step 3: Diagnosis Round does not mark review items in progress or add a diagnosis list item', () => {
  const source = exploreContract();
  const start = source.search(/Diagnosis Round/);
  assert.ok(start >= 0, 'Explore instructions should define Diagnosis Round');
  const diagnosis = source.slice(start, start + 7000);

  assert.match(
    diagnosis,
    /(?:neither|not|never|must not|does not)[\s\S]{0,260}(?:reviewed-sai-1|reviewed-sai-2)[\s\S]{0,260}(?:reviewed-sai-1|reviewed-sai-2)[\s\S]{0,260}(?:in_progress|in progress)|(?:reviewed-sai-1|reviewed-sai-2)[\s\S]{0,260}(?:in_progress|in progress)[\s\S]{0,260}(?:reviewed-sai-1|reviewed-sai-2)[\s\S]{0,260}(?:not|never|must not|does not)/i,
    'diagnosis must not set either phase review item in_progress'
  );
  assert.match(
    diagnosis,
    /(?:no|not|never|does not|must not)[\s\S]{0,180}diagnosis[- ]specific[\s\-]?list item|diagnosis[- ]specific[\s\-]?list item[\s\S]{0,180}(?:is not|does not|never|must not)[\s\S]{0,120}(?:add|appear|exist)/i,
    'diagnosis must not add a diagnosis-specific list item'
  );
});

test('Step 3: diagnosis findings do not change review evidence or count as a Supervised Review Round', () => {
  const source = exploreContract();
  const start = source.search(/Diagnosis Round/);
  assert.ok(start >= 0, 'Explore instructions should define Diagnosis Round');
  const diagnosis = source.slice(start, start + 7000);

  assert.match(
    diagnosis,
    /(?:diagnosis|diagnosis round)[\s\S]{0,500}(?:finding|findings)[\s\S]{0,300}(?:do not|does not|never|must not)[\s\S]{0,220}(?:mark|set|change|alter)[\s\S]{0,180}review evidence/i,
    'diagnosis findings must not mark or change review evidence'
  );
  assert.match(
    diagnosis,
    /(?:diagnosis|diagnosis round)[\s\S]{0,500}(?:finding|findings)[\s\S]{0,300}(?:do not|does not|never|must not)[\s\S]{0,220}clear[\s\S]{0,180}review evidence/i,
    'diagnosis findings must not clear review evidence'
  );
  assert.match(
    diagnosis,
    /(?:diagnosis|diagnosis round)[\s\S]{0,700}(?:not|never|does not|must not)[\s\S]{0,180}(?:count|increment)[\s\S]{0,180}Supervised Review Round/i,
    'diagnosis must not count as a Supervised Review Round'
  );
});

test('Step 3: successful same-worker re-dispatch resumes ordinary review and only ordinary review enters in_progress', () => {
  const source = exploreContract();

  assert.match(
    source,
    /successful[\s\S]{0,500}same[- ]worker[\s\S]{0,500}re[- ]dispatch[\s\S]{0,500}(?:resume|return)[\s\S]{0,300}ordinary review|same[- ]worker[\s\S]{0,500}re[- ]dispatch[\s\S]{0,500}(?:ordinary review)[\s\S]{0,300}(?:resume|return)/i,
    'successful same-worker re-dispatch must resume ordinary review'
  );
  assert.match(
    source,
    /only[\s\S]{0,220}ordinary review[\s\S]{0,220}(?:entry|start|transition)[\s\S]{0,220}(?:set|mark|resolve)[\s\S]{0,120}(?:`?in_progress`?|in progress)|(?:ordinary review)[\s\S]{0,300}(?:is the only|only)[\s\S]{0,220}(?:set|mark|resolve)[\s\S]{0,120}(?:`?in_progress`?|in progress)/i,
    'only ordinary review entry may set in_progress'
  );
});

test('Step 3: stopped diagnosis leaves the phase item pending and keeps diagnosis state conversation-only', () => {
  const source = exploreContract();
  const start = source.search(/Diagnosis Round/);
  assert.ok(start >= 0, 'Explore instructions should define Diagnosis Round');
  const diagnosis = source.slice(start, start + 7000);

  assert.match(
    diagnosis,
    /(?:stopped|stop(?:ping|ped)?|interrupted)[\s\S]{0,600}(?:phase item|phase review|reviewed-sai-[12])[\s\S]{0,300}`pending`/i,
    'stopped diagnosis must leave the phase item pending'
  );
  assert.match(diagnosis, /diagnosis[\s\S]{0,500}conversation-only/i,
    'diagnosis state must be conversation-only');
  assert.match(
    diagnosis,
    /diagnosis[\s\S]{0,700}(?:not|never|must not|does not)[\s\S]{0,180}(?:persist|write)[\s\S]{0,180}(?:file|\.openspec\.yaml)|(?:file|\.openspec\.yaml)[\s\S]{0,180}(?:not|never|must not|does not)[\s\S]{0,180}(?:persist|write)[\s\S]{0,700}diagnosis/i,
    'diagnosis state must not persist to files or .openspec.yaml'
  );
});

test('Step 3: Diagnosis Round render rules live in Explore instructions, not either idea-list renderer', () => {
  const explore = exploreContract();
  const claudeRenderer = spec('sai/adapters/claude/idea-list-render.md');
  const opencodeRenderer = spec('sai/adapters/opencode/idea-list-render.md');

  assert.match(explore, /Diagnosis Round/,
    'Explore instructions should own the Diagnosis Round render rules');
  for (const [name, renderer] of [
    ['Claude Code', claudeRenderer],
    ['opencode', opencodeRenderer],
  ]) {
    assert.doesNotMatch(renderer, /Diagnosis Round|diagnosis_rounds/,
      `${name} idea-list renderer must not contain diagnosis render rules`);
  }
});

test('Step 2: item-10 diagnosis includes coordinator-disproved completed worker results', () => {
  const source = supervisionContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 7000);
  const disproved = String.raw`(?:coordinator[- ]disproved|coordinator[\s\S]{0,180}disprov\w*|disprov\w*[\s\S]{0,180}coordinator)`;
  const completedDisproved = String.raw`(?:completed[\s\S]{0,900}${disproved}|${disproved}[\s\S]{0,900}completed)`;

  assert.match(
    diagnosis,
    new RegExp(
      String.raw`(?:${completedDisproved}[\s\S]{0,900}(?:Review\s+Engine|Diagnosis\s+Round|diagnosis_rounds)|(?:Review\s+Engine|Diagnosis\s+Round|diagnosis_rounds)[\s\S]{0,900}${completedDisproved})`,
      'i'
    ),
    'a coordinator-disproved completed result should enter item-10 diagnosis'
  );
});

test('Step 2: item-10 diagnosis includes STOP-bearing completed worker results', () => {
  const source = supervisionContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 7000);
  const stopBearing = String.raw`(?:STOP[- ]bearing|carrying[\s\S]{0,120}STOP)`;
  const completedStop = String.raw`(?:completed[\s\S]{0,900}${stopBearing}|${stopBearing}[\s\S]{0,900}completed)`;

  assert.match(
    diagnosis,
    new RegExp(
      String.raw`(?:${completedStop}[\s\S]{0,900}(?:Review\s+Engine|Diagnosis\s+Round|diagnosis_rounds)|(?:Review\s+Engine|Diagnosis\s+Round|diagnosis_rounds)[\s\S]{0,900}${completedStop})`,
      'i'
    ),
    'a STOP-bearing completed result should enter item-10 diagnosis'
  );
});

test('Step 2: clean completed workers never start item-10 diagnosis', () => {
  const source = supervisionContract();
  const start = source.search(/diagnosis_rounds/i);
  assert.ok(start >= 0, 'item-10 diagnosis source should exist');
  const diagnosis = source.slice(start, start + 7000);
  const notDisproved = String.raw`(?:not[\s\S]{0,120}disprov\w*|without[\s\S]{0,120}disprov\w*|no[\s\S]{0,120}disprov\w*)`;
  const noStop = String.raw`(?:no[\s\S]{0,120}STOP|without[\s\S]{0,120}STOP|not[\s\S]{0,120}STOP[- ]bearing|not[\s\S]{0,120}carrying[\s\S]{0,80}STOP)`;

  assert.match(
    diagnosis,
    new RegExp(
      String.raw`completed[\s\S]{0,900}${notDisproved}[\s\S]{0,900}${noStop}[\s\S]{0,900}(?:never|does not|must not)[\s\S]{0,260}(?:start|enter|trigger)[\s\S]{0,260}(?:item[- ]?10[\s\S]{0,120})?(?:diagnosis|Review\s+Engine|Diagnosis\s+Round|diagnosis_rounds)`,
      'i'
    ),
    'a clean completed result must be explicitly excluded by both its non-disproved and no-STOP state'
  );
});

test('Step 2: pending-before-diagnosis applies to disproved or STOP-bearing completed workers', () => {
  const source = exploreContract();
  const completedDisproved = String.raw`(?:completed[\s\S]{0,900}(?:coordinator[- ]disproved|coordinator[\s\S]{0,180}disprov\w*|disprov\w*[\s\S]{0,180}coordinator)|(?:coordinator[- ]disproved|coordinator[\s\S]{0,180}disprov\w*|disprov\w*[\s\S]{0,180}coordinator)[\s\S]{0,900}completed)`;
  const completedStop = String.raw`(?:completed[\s\S]{0,900}(?:STOP[- ]bearing|carrying[\s\S]{0,120}STOP)|(?:STOP[- ]bearing|carrying[\s\S]{0,120}STOP)[\s\S]{0,900}completed)`;

  for (const [label, trigger] of [
    ['coordinator-disproved completed', completedDisproved],
    ['STOP-bearing completed', completedStop],
  ]) {
    assert.match(
      source,
      new RegExp(
        String.raw`${trigger}[\s\S]{0,1200}(?:active phase review|phase review|reviewed-sai-[12])[\s\S]{0,700}(?:resolv\w*|set\w*|becom\w*|leave\w*)?[\s\S]{0,160}` +
          String.raw`pending[\s\S]{0,900}(?:before|prior to|then|followed by)[\s\S]{0,220}(?:Diagnosis\s+Round|diagnosis_rounds|Review\s+Engine)`,
        'i'
      ),
      `${label} work must settle the active phase review item to pending before diagnosis`
    );
  }
});

test('crystallization renders a temporary mode-specific route without changing the evidence catalog', () => {
  const ideaList = spec('sai/commands/explore/steps/idea-list.md');
  const selector = spec('sai/commands/explore/steps/pipeline-selector.md');

  assert.match(ideaList, /baseline catalog[\s\S]*evidence ledger/i);
  assert.match(ideaList, /temporarily replace only that selected slice's three baseline evidence entries/i);
  assert.match(ideaList, /never .*generic `Implementation` item/i);
  assert.match(ideaList, /Route state is conversation-only and scoped to the selected slice/i);
  assert.match(ideaList, /never mark or clear.*reviewed-sai-1.*reviewed-sai-2/i);
  assert.match(selector, /active_route/);
  assert.match(selector, /not an invocation envelope field, worker payload field, artifact field, or persisted state/i);
});

test('selector does not fetch Plan or Direct Build files at presentation', () => {
  const selector = spec('sai/commands/explore/steps/pipeline-selector.md');
  assert.doesNotMatch(selector, /Fetch @sai\/commands\/explore\/steps\/pipeline-plan-unattended\.md/);
  assert.doesNotMatch(selector, /Fetch @sai\/commands\/explore\/steps\/pipeline-direct-build\.md/);
  assert.match(selector, /\{intent: plan\}.*explore-slice@1.*stage-machine\.md/);
  assert.match(selector, /\{intent: direct-build\}.*explore-slice@1.*same policy/);
  assert.doesNotMatch(selector, /sai-state emit/);
  assert.match(selector, /Do not fetch `pipeline-plan-unattended\.md` or `pipeline-direct-build\.md` at selector presentation/);
});

test('mode-specific route labels and Plan/Build progression are explicit', () => {
  const source = exploreContract();
  const ideaList = spec('sai/commands/explore/steps/idea-list.md');
  const plan = ideaList.slice(ideaList.indexOf('**`plan-unattended` route'));
  const build = ideaList.slice(ideaList.indexOf('**`direct-build-unattended` route'));

  assert.match(plan, /exactly three steps, `sai-1` followed by `sai-2` followed by `Implement`/);
  assert.match(plan, /`sai-1` starts `in_progress`[\s\S]*clean spec convergence[\s\S]*`sai-2` as `in_progress`/i);
  assert.match(source, /clean terminal design result completes `sai-2`[\s\S]*does not claim that `sai-3`/i);
  assert.match(build, /exactly the high-level stages `Build\/Implement`, `Backfill`, and `Archive`/);
  assert.match(build, /`Build\/Implement`[\s\S]*not `\/sai-build`/);
  assert.match(source, /underlying eight-step Direct Build \(unattended\) contract remains authoritative[\s\S]*only these three high-level stages/i);
  assert.match(source, /Build\/Implement.*completed[\s\S]*Backfill.*in_progress[\s\S]*Archive.*in_progress/i);
});

test('Manual route is a completed handoff only and non-clean routes remain pending and retryable', () => {
  const source = exploreContract();
  const ideaList = spec('sai/commands/explore/steps/idea-list.md');
  const manual = ideaList.slice(ideaList.indexOf('**`manual` route'));

  assert.match(manual, /only `Manual handoff`/);
  assert.match(manual, /`completed` when the path-specific handoff is emitted/);
  assert.match(manual, /creates no delegated route steps, dispatches no worker/i);
  assert.match(source, /failed, cancelled, STOP-bearing, coordinator-disproved, or unrecovered[\s\S]*active route step `pending`/i);
  assert.match(source, /route retryable[\s\S]*no later step starts/i);
  assert.match(source, /only a clean terminal result completes the route/i);
  assert.match(source, /multi-slice route changes only the selected slice/i);
});
