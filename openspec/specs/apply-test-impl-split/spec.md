# apply-test-impl-split Specification

## Purpose
Defines the RED/GREEN worker split and routing rules for apply steps.
## Requirements
### Requirement: RED-carrying testable steps split into a RED worker then a GREEN worker

The `sai-4-apply` coordinator SHALL select the split two-worker flow for a Step if and only if **all three parts** of the routing condition hold:

1. the Step's body contains a RED block — the property that makes the Step **testable**;
2. a **Step Contract** is available for that Step: `interfaces.md` exists for the change and contains a `## Step N` section whose integer `N` matches the Step's `implementation.md` `## Step N` heading;
3. the Step's plan-level file scope contains at least one production file — the property that makes the Step **divisible**. A production file is a plan-authorized file that the coordinator's existing allowed-files derivation classifies as production: neither a test file nor a declared interface.

When all three parts hold, the coordinator SHALL dispatch two managed workers in order instead of one: first the blind RED worker (test authoring), then — only after the RED worker verifies a valid RED — the GREEN worker (implementation). The coordinator SHALL NOT combine both into a single dispatch for a Step that satisfies all three parts.

A Step that is **testable but not divisible** — its plan-level file scope contains no production file, so a GREEN implementation dispatch would have an empty allowed-files list — SHALL NOT be split: the coordinator SHALL route it to the RED worker under the green-exception (see `apply-step-routing-tree`), exactly as the routing decision tree dictates. "Testable" (the RED block) and "divisible" (production surface) are distinct properties: a RED block alone never licenses the two-worker flow, because a GREEN dispatch with an empty allowed-files list cannot perform its side of the split. The part-3 test is absence-based: it asks whether at least one production file exists in the Step's plan-level file scope, never whether every file is a test — a Step scoped solely to test files and a Step scoped solely to declared interfaces both have no production file, both derive an empty GREEN allowed-files list, and both route to the RED green-exception.

If a RED result is non-clean, the coordinator SHALL inspect its cause before dispatching GREEN. A clear, safe, current-Step cause inside the RED worker's authorized test or RED-stub scope SHALL enter the shared bounded same-worker RED continuation for either the split-flow RED dispatch or the green-exception RED dispatch; the ordinary green-exception dispatch remains terminal when no continuation is selected. An out-of-scope cause, a missing or ambiguous contract, an unpassable RED STOP with `unrecoverable: true`, or an unpassable RED STOP whose Cause Locus is out-of-scope or unresolved SHALL spend zero recovery attempts and SHALL halt or use its owner-authorized route. An unpassable RED STOP with `unrecoverable: false` and a clear safe in-scope cause SHALL follow the shared eligibility rule and may spend one new diagnosis slot. Only a coordinator-verified valid RED permits the GREEN dispatch in the split flow. The RED continuation SHALL not reveal the GREEN implementation body or permit production edits.

#### Scenario: Coordinator processes a testable, divisible Step

- **WHEN** the coordinator reaches an unchecked Step that contains a RED block, has an available Step Contract, and whose plan-level file scope contains at least one production file
- **THEN** it dispatches the blind RED worker first, waits for its report and a valid RED, and only then dispatches a separate GREEN worker for the same Step

#### Scenario: Coordinator processes a testable Step with no production files

- **WHEN** the coordinator reaches an unchecked Step that contains a RED block and has an available Step Contract, but whose plan-level file scope contains no production file (test-only, interfaces-only, or any other production-free scope)
- **THEN** it routes the Step to the RED worker under the green-exception, which authors the tests and leaves them green

#### Scenario: RED worker result gets an in-scope continuation

- **WHEN** a RED worker result is non-clean and coordinator evidence identifies a clear, safe correction inside its plan-authorized test or RED-stub scope
- **THEN** the coordinator continues the same RED worker through `continue_after_recovery`
- **AND** it does not dispatch GREEN until a later coordinator verification confirms a valid RED

#### Scenario: RED worker does not verify a valid RED

- **WHEN** the RED worker's report indicates RED result `passes` or `wrong-failure`
- **THEN** the coordinator treats the result as a non-clean closure and inspects its cause
- **AND** it either uses the bounded same-RED-worker continuation for an eligible in-scope correction or surfaces the zero-attempt human STOP for an out-of-scope, unresolved, vetoed, or otherwise unsafe cause
- **AND** it does not dispatch the GREEN worker before a valid RED is verified

#### Scenario: A completed RED STOP is still non-clean

- **WHEN** a RED dispatch returns `completed` while its report carries `STOP reached? = yes`
- **THEN** the coordinator SHALL diagnose the non-clean closure before dispatching GREEN or spending recovery
- **AND** it SHALL require an evidence-backed in-scope diagnosis with `unrecoverable: false` for any RED continuation, otherwise stopping with zero attempts

#### Scenario: Coordinator independently verifies the RED intermediate

- **WHEN** a split-flow RED worker returns `RED result = valid` with tests intentionally failing by assertion
- **THEN** the coordinator runs the RED Verification Checklist to confirm the expected failure and allowed-file boundary
- **AND** it dispatches GREEN only after that independent confirmation, without treating the RED result as final Step completion

### Requirement: RED worker is blind to the implementation body

The blind RED worker dispatch's prompt SHALL contain the `interfaces.md` section for that Step N (its signatures + exact assertions) plus the testing-relevant slice of `tasks.md`'s `## Implementation Context` injected by the coordinator — and NOTHING from the GREEN implementation body of the Step. The RED worker writes the interface stubs and the tests and verifies a VALID RED (an assertion failure attributable to the behavior under test, not a setup/import/compilation error).

The injected slice SHALL name its source fields explicitly rather than paraphrasing them. It SHALL include the **Test Command** field verbatim, because the RED worker is required to run the test command during RED verification and is forbidden from reading `implementation.md`, where the command otherwise lives. The framework and assertion/mock libraries SHALL be taken from the **Stack** field. Test file location and naming SHALL NOT be mandated as `## Implementation Context` fields; the RED worker recovers them under its existing permission to read existing test files and test infrastructure. The coordinator's own enumeration of the injected slice SHALL therefore drop test file location/naming, so that it no longer promises an injection whose source is guaranteed not to exist.

The RED worker SHALL scope its RED run to the tests it authored, substituting the test identifier into the scoping idiom the **Test Command** field carries. Where the field carries the no-runner sentinel, or the project's runner offers no scoping, the RED worker SHALL attribute the RED classification only to failures originating in the tests it authored, and SHALL NOT classify a pre-existing unrelated failure elsewhere in the suite as either a valid RED or a `wrong-failure` for this Step. A same-worker RED recovery continuation SHALL retain this blindness, injected slice, test scope, and authorized test/stub file boundary; it SHALL never receive the GREEN implementation body. The authorized test/stub file boundary carries one bounded exception: when the plan names obsolete test files as retired, each with its exact repository-relative path inside the RED block, the RED worker MAY remove exactly those plan-named retired files and nothing else; the exception grants no read access, and a recovery continuation inherits it for exactly the same named files only.

#### Scenario: Coordinator assembles the RED worker prompt

- **WHEN** the coordinator dispatches the RED worker for a testable Step
- **THEN** the prompt includes only that Step's `interfaces.md` section and the injected testing context from `tasks.md`, and excludes the Step's GREEN implementation code

#### Scenario: RED continuation remains blind

- **WHEN** the coordinator continues the RED worker after an eligible non-clean result
- **THEN** the existing RED prompt context remains unchanged and the continuation adds only diagnosis and evidence
- **AND** the GREEN implementation body remains unavailable

#### Scenario: Testing context is single-sourced in tasks.md

- **WHEN** the coordinator injects the testing stack into the RED worker prompt
- **THEN** it takes the framework and assertion/mock libraries from the **Stack** field and the test command from the **Test Command** field of `tasks.md`'s `## Implementation Context`, not from `interfaces.md` (which carries no testing-stack section)

#### Scenario: RED worker runs the injected command during RED verification

- **WHEN** the RED worker reaches RED verification
- **THEN** the command it runs is the **Test Command** value injected by the coordinator, scoped to the tests it authored via that value's scoping idiom, not a command it inferred from the test files it read

#### Scenario: Pre-existing unrelated failure in an unscoped run

- **WHEN** the RED worker must run the suite unscoped and the run exits non-zero because of a failure in tests it did not author
- **THEN** it classifies RED only from the results of its own tests and does not report that unrelated failure as a valid RED or as a `wrong-failure`

#### Scenario: Injected slice no longer promises location and naming

- **WHEN** the apply instructions enumerate the testing-relevant slice injected into the RED worker
- **THEN** the enumeration names the **Stack**-sourced framework and libraries and the **Test Command**, and does not list test file location/naming

#### Scenario: Retirement removal rides the blind dispatch

- **WHEN** the plan names an obsolete guard test as retired inside the Step's RED block
- **THEN** the blind RED worker removes exactly that named file without gaining any read access to production files or change artifacts, and a same-worker recovery continuation inherits the removal authorization for exactly that named file only

### Requirement: Coordinator guards interfaces.md ↔ implementation.md Step-N key integrity

The coordinator injects "that Step's `interfaces.md` section" into the blind RED worker by matching the integer `N` of the current `implementation.md` `## Step N` heading to the `## Step N` heading in `interfaces.md`. Because `interfaces.md` is regenerated wholesale while `implementation.md` is preserved byte-for-byte (including orphan steps) across re-runs, the two can desync. The routing condition's part 2 already confines RED-worker dispatch to Steps with an available `## Step N`, so the guard SHALL STOP and surface the desync to the user only when the match is **ambiguous** — more than one `## Step N` section matches the same integer `N`. On an ambiguous match the coordinator SHALL NOT inject a mismatched or empty interface contract into the blind RED worker. A clean absence — no `## Step N` section for the integer — is NOT a guard violation: it halts the run per `apply-step-routing-tree` (contract absence is a STOP), and no RED worker is dispatched for it.

#### Scenario: Ambiguous Step N match stops the run

- **WHEN** the coordinator is about to dispatch the RED worker for a RED-carrying Step N and more than one `## Step N` section in `interfaces.md` matches the same integer `N` (keys drifted after a divergent design re-run)
- **THEN** the coordinator STOPs and surfaces the desync, and does not dispatch the RED worker with a wrong or ambiguous interface contract

#### Scenario: No matching Step N halts the run

- **WHEN** the coordinator reaches a RED-carrying Step N for which `interfaces.md` has no `## Step N` section
- **THEN** the run halts per the contract-absence STOP rule; the RED worker is never dispatched for it

#### Scenario: Matching Step N is present

- **WHEN** the coordinator dispatches the RED worker for Step N and `interfaces.md` has exactly one `## Step N` section
- **THEN** it injects that section's signatures and assertions into the RED worker prompt

### Requirement: RED worker stubs obey the RED phase contract

The interface stubs the RED worker writes to reach a valid RED SHALL obey `implement-red-phase-contract`: a stub exposes the required symbol but returns a null/empty/wrong value and contains no logic that would satisfy the assertion. The RED worker SHALL NOT write real implementation logic into a stub — doing so would either make the RED pass (an invalid RED) or leak implementation authorship into the agent that is meant to be blind to the implementation.

#### Scenario: RED worker needs a stub to compile the test

- **WHEN** the test file references a symbol that does not yet exist and the RED worker creates a stub so the test compiles
- **THEN** the stub returns a wrong/empty value with no assertion-satisfying logic, so the RED fails by assertion, per `implement-red-phase-contract`

### Requirement: RED worker may read existing test files as a fallback

The RED worker MAY read existing test files and test infrastructure (fixtures, harness, shared helpers) when the injected testing context is insufficient to author a valid RED. It SHALL NOT read the Step's GREEN implementation body or other production source to derive the assertions. Reading existing test files does not leak the implementation body, so it preserves test independence while avoiding an unrecoverable invalid-RED when the injected context has a gap.

#### Scenario: Injected context is insufficient

- **WHEN** the injected testing context does not fully specify how to wire up a test and the RED worker cannot otherwise reach a valid RED
- **THEN** the RED worker may read existing test files and test infrastructure to match their patterns, but does not read the Step's implementation body

### Requirement: GREEN worker cannot modify test files

The GREEN worker SHALL write the GREEN implementation and verify GREEN, and SHALL be FORBIDDEN from creating or modifying any test file. This prohibition is the linchpin of the split: without it the implementation-mirroring channel reopens at GREEN time.

#### Scenario: GREEN passes without touching tests

- **WHEN** the GREEN worker completes a testable Step
- **THEN** it has modified only non-test files, leaving the RED worker's tests unchanged, and reports GREEN pass

### Requirement: Non-testable steps keep a single GREEN-worker dispatch

A Step that contains no RED block (config, migration, scaffolding, service-side) SHALL be processed with a single GREEN-worker dispatch when its plan-level file scope contains at least one production file — the coordinator SHALL NOT split it into two dispatches. A non-testable Step whose plan-level file scope contains no production file (test-only, interfaces-only, or other production-free scope) SHALL route to the RED worker under the green-exception per `apply-step-routing-tree`: the GREEN worker's absolute test-file prohibition would make the test-scoped body unexecutable, so the RED worker — the only worker permitted to author tests — executes the body and leaves the tests green.

#### Scenario: Coordinator processes a non-testable Step with production scope

- **WHEN** the coordinator reaches an unchecked Step with no RED block and at least one production file in its plan-level file scope
- **THEN** it dispatches exactly one GREEN worker for that Step, as in the pre-split flow

#### Scenario: Coordinator processes a non-testable production-free Step

- **WHEN** the coordinator reaches an unchecked Step with no RED block and no production file in its plan-level file scope (test-only, interfaces-only, or other production-free scope)
- **THEN** it dispatches the RED worker under the green-exception, which executes the test-scoped body, leaves the tests green, and reports GREEN = pass

### Requirement: Glossary defines the routing vocabulary

The `## Language` section of `GLOSSARY.md` at the project root SHALL contain exactly one **Divisible Step** entry with a one-sentence definition stating what it IS — a Step whose plan-level file scope contains at least one production file, the property distinct from having a RED block that makes the Step eligible for the two-worker split. The entry SHALL carry an `*Avoid*` line rejecting the aliases "splittable step", "production step", "split-eligible step", and "testable" (which describes the RED block only).

The `## Language` section SHALL also contain exactly one **Split-Routed Step** entry whose definition names all three routing parts: a `##### RED phase` block, an available **Step Contract**, and at least one production file in the plan-level file scope.

The `## Relationships` section of `GLOSSARY.md` SHALL contain an entry linking **Divisible Step** to **Split-Routed Step** — a **Divisible Step** that carries a `##### RED phase` block and has an available **Step Contract** is a **Split-Routed Step**, while a testable Step that is not divisible routes to the RED worker's green-exception — and SHALL update the **RED Worker**/**GREEN Worker** and **Step Contract** entries so the routing covers both absence shapes (contract unavailable: STOP; no production file: green-exception).

The `## Flagged ambiguities` section of `GLOSSARY.md` SHALL contain an entry resolving the "Testable Step vs the dispatch it routes to" overload in favor of the three-term split: "testable" describes only the RED block, **Divisible Step** describes the production-surface property, and **Split-Routed Step** names the two-worker outcome.

This requirement SHALL NOT duplicate the worker-vocabulary glossary edits owned by `apply-taxonomy-reclassification`: the **RED Worker** and **GREEN Worker** `## Language` entries, the aliasing of **Blind Test-Writer**/**Implementation Dispatch** to the worker roles, and the removal of stale "no coordinator-worker boundary" statements are owned by that capability and referenced here, not re-mandated.

#### Scenario: Glossary documents the Divisible Step term

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** it contains exactly one **Divisible Step** `## Language` entry with the production-file definition and the `*Avoid*` alias line

#### Scenario: Glossary documents the three-part Split-Routed Step

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** the **Split-Routed Step** entry names all three routing parts, and the **Relationships** and **Flagged ambiguities** entries reflect the STOP (contract-absent) and green-exception (no production file) routes

#### Scenario: worker vocabulary is owned by the taxonomy capability

- **WHEN** a maintainer audits GLOSSARY.md edit ownership
- **THEN** the **RED Worker**/**GREEN Worker** entries and the stale-boundary removals are mandated only by `apply-taxonomy-reclassification`, and this requirement references them without re-mandating

