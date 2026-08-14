# apply-step-routing-tree Specification

## Purpose

Defines the apply Step routing decision tree that replaces the current three-part routing condition and its traced fall-back shapes: each Step routes to exactly one of five shapes — GREEN direct (non-testable with production), RED green-exception (non-testable production-free), contract-absent STOP, split blind RED → GREEN, or RED green-exception (production-free testable).

## Requirements

### Requirement: step-routing-decision-tree

The apply coordinator SHALL route every unchecked Step through exactly the following decision tree, in order:

1. If the Step's body contains NO `##### RED phase` block AND its plan-level file scope contains at least one production file — route to the GREEN worker only (GREEN direct). The GREEN worker runs the body without authoring tests; the absolute test-file prohibition applies.
2. If the Step's body contains NO `##### RED phase` block AND its plan-level file scope contains NO production file (test-only, interfaces-only, or other production-free scope) — route to the RED worker under the green-exception. The GREEN worker's absolute test-file prohibition would make a test-scoped body unexecutable, so the RED worker — the only worker permitted to author tests — executes the body, leaves the tests green, is terminal, and reports GREEN = pass.
3. If the Step's body contains a RED block AND no `## Step N` contract is available in `interfaces.md` (whole-file absence or per-Step absence) — STOP. Nothing is dispatched and nothing is written; the artifacts are corrupt and the run halts. `interfaces.md` `## Step N` is a hard requirement.
4. If the Step's body contains a RED block, a `## Step N` contract is available, AND the Step's plan-level file scope contains at least one production file — route to the split flow: blind RED worker first (tests left red), then the GREEN worker (absolute test prohibition).
5. If the Step's body contains a RED block, a `## Step N` contract is available, AND the Step's plan-level file scope contains NO production file — route to the RED worker under the green-exception: the RED worker authors the tests, must leave them green, is terminal, and reports GREEN = pass.

The tree is exhaustive and exclusive: every Step matches exactly one shape — the production-surface property is checked for both testable and non-testable Steps. No fall-back to a single generic dispatch exists for any Step.

#### Scenario: non-testable Step with production routes GREEN direct

- **WHEN** the coordinator reaches a Step whose body contains no `##### RED phase` block and whose plan-level file scope contains at least one production file
- **THEN** it dispatches the GREEN worker only, which runs the body without authoring tests

#### Scenario: non-testable production-free Step routes to the RED green-exception

- **WHEN** the coordinator reaches a Step whose body contains no `##### RED phase` block and whose plan-level file scope contains no production file (test-only, interfaces-only, or other production-free scope)
- **THEN** it dispatches the RED worker under the green-exception, which executes the test-scoped body, leaves the tests green, is terminal, and reports GREEN = pass

#### Scenario: RED Step without a Step N contract STOPS

- **WHEN** the coordinator reaches a Step with a RED block and no matching `## Step N` in `interfaces.md` (whole-file or per-Step absence)
- **THEN** it STOPS without dispatching any worker and without writing any file

#### Scenario: RED Step with contract and production routes split

- **WHEN** the coordinator reaches a Step with a RED block, an available `## Step N` contract, and at least one production file in its plan-level file scope
- **THEN** it dispatches the blind RED worker first, waits for a valid RED, and then dispatches the GREEN worker

#### Scenario: RED Step with contract and no production routes green-exception

- **WHEN** the coordinator reaches a Step with a RED block, an available `## Step N` contract, and no production file in its plan-level file scope (test-only, interfaces-only, or other production-free scope)
- **THEN** it dispatches the RED worker under the green-exception, which authors tests, leaves them green, is terminal, and reports GREEN = pass

### Requirement: contract-absence-is-a-stop

The coordinator SHALL treat contract absence as a hard halt, not a fall-back. When a RED-carrying Step has no `## Step N` contract — either `interfaces.md` does not exist, or it exists but has no matching `## Step N` for the Step's integer — the coordinator SHALL STOP the run, report the corrupt artifacts, and SHALL NOT dispatch any worker, write any file, or continue to a later Step. The previous non-blocking traced fall-back to a single dispatch is removed.

#### Scenario: whole-file absence halts

- **WHEN** `interfaces.md` does not exist and the current Step carries a RED block
- **THEN** the coordinator STOPS and dispatches nothing

#### Scenario: per-Step absence halts

- **WHEN** `interfaces.md` exists but has no `## Step N` matching the current Step's integer
- **THEN** the coordinator STOPS and dispatches nothing, even when other Steps have contracts

#### Scenario: no fall-back trace line is printed

- **WHEN** contract absence halts a run
- **THEN** the coordinator prints no "routing to a single dispatch" trace line; the run halts instead

### Requirement: green-exception-terminal-semantics

The green-exception RED dispatch SHALL be terminal for its Step: no separate GREEN worker follows it. The RED worker authors the tests and any needed stubs within its allowed-file set, verifies that the tests pass, reports GREEN = pass, and the coordinator proceeds to normal verification, gates, and commit handling. The RED worker SHALL never close a Step with broken tests.

#### Scenario: production-free Step completes in one dispatch

- **WHEN** a production-free RED-carrying Step is dispatched under the green-exception
- **THEN** the dispatch is terminal: the RED worker leaves the tests green and reports GREEN = pass, and no GREEN worker is dispatched for that Step

#### Scenario: green-exception never reports broken tests

- **WHEN** the green-exception RED worker cannot make the authored tests pass within its scope
- **THEN** it does not return a terminal pass with broken tests; it reports the failure for coordinator handling
