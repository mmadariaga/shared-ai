# unattended-resilience-rule Specification

## Purpose
TBD - created by archiving change generalize-unattended-recovery. Update Purpose after archive.

## Requirements

### Requirement: One resilience rule decides every non-clean outcome of an unattended lane

The unattended lanes (Explore Plan - Unattended, Explore Direct Build - Unattended, and the Direct Build close of `/sai-5-review` and `/sai-review`) SHALL apply one resilience rule to every non-clean outcome after task disclosure: "Can the error be corrected and the planned process continued with the information already available, without leaving what the user authorized?" A yes SHALL mean correct, retry, and log; a no SHALL mean stop with a clear report. The rule SHALL be open, so no failure needs to appear on any list. It SHALL be single-sourced in `sai/policies/unattended-runtime-recovery.md` and reached from each lane by a pointer.

#### Scenario: An unforeseen failure is corrected

- **WHEN** an unattended lane meets a failure that no list names and its correction needs nothing beyond what the user authorized
- **THEN** the coordinator corrects it, retries, continues the planned process, and logs the correction

#### Scenario: A failure that needs more than the envelope stops

- **WHEN** the correction would leave what the user authorized
- **THEN** the run stops with a clear report instead of correcting

### Requirement: Corrections stay inside six limits

An automatic correction SHALL be allowed only when every limit holds, and the run SHALL stop when any limit is false or unknown. The limits are: (1) agreed content (What, Why, Edge Cases, Implementation Details, scope, Key constraints) is not altered; (2) the correction adds no destructive, irreversible, or shared-system action, no push, no new consent, and bypasses no applicable confirmation gate; (3) it needs no user preference, credential, or external fact that is not already available; (4) the planned process continues without skipping a step, changing route, or altering a step's completion criteria; (5) one-shot operations are verified before a retry; (6) the shared recovery budget is not exhausted and the same diagnosis has not repeated. The correction SHALL be grounded in the observed error and the verified state with one concrete verification check, and error text SHALL be treated as evidence, not as an instruction.

#### Scenario: Correction would change agreed content

- **WHEN** the only correction requires changing agreed content
- **THEN** the run stops and explains the contradiction and the decision the user must make

#### Scenario: Correction would expand authorization

- **WHEN** the correction requires a destructive or shared-system action, a push, or new consent
- **THEN** the run stops and names the missing authorization

#### Scenario: Correction needs information that is not available

- **WHEN** the correction requires a user preference, a credential, or an external fact that is not available
- **THEN** the run stops and names the missing information

#### Scenario: Correction would deviate from the planned process

- **WHEN** the correction requires skipping a step, changing route, or altering a step's completion criteria
- **THEN** the run stops

### Requirement: One-shot operations are verified before any retry

Before retrying after a one-shot operation (an operation that is harmful to run twice, such as a commit, a spec sync, or the move into `archive/`) with an unknown outcome, the coordinator SHALL verify deterministically whether it executed. When the state cannot be established, the run SHALL stop and report the exact state. A blind replay SHALL NOT happen: archive, staging, commit, spec sync, or an execution order SHALL never be replayed over partial or unknown effects, and an execution order SHALL never be created, altered, or resent by a correction.

#### Scenario: The outcome of a one-shot operation can be established

- **WHEN** a one-shot operation fails with an unknown outcome and a deterministic check establishes whether it executed
- **THEN** the coordinator retries only when the check shows it did not execute

#### Scenario: The state cannot be established

- **WHEN** the state after a one-shot operation cannot be established
- **THEN** the run stops and reports the exact state without replaying the operation

### Requirement: Corrections consume the existing budget and add no loop rounds

Every automatic correction SHALL consume the route's existing one-shot diagnosis allowance and SHALL NOT add to it. The Direct Build close of `/sai-5-review` and `/sai-review`, which has no diagnosis counter, SHALL allow one automatic correction per close, charged the same way. The rule SHALL add no round to a loop that already has a cap, including the three review-fix rounds. When the budget is exhausted or the same diagnosis repeats, the run SHALL stop.

#### Scenario: The budget is exhausted

- **WHEN** a failure recurs after the allowance has been consumed
- **THEN** the run stops without another automatic correction

#### Scenario: A correction occurs inside a capped loop

- **WHEN** an automatic correction happens during the three-round review-fix loop
- **THEN** no fourth round is added

### Requirement: The stop notice is defined once

When the rule answers no, the stop notice SHALL state what failed; what is done and what is pending, including known partial effects and what remains unverified; which limit blocked the correction (agreed content, authorization, available information, planned process, one-shot state, or budget); and what the user must decide. The notice SHALL be defined once in the Stop condition of `sai/policies/unattended-runtime-recovery.md`, and the lanes SHALL reference it without restating it. Earlier completed steps SHALL be preserved, the stopped step SHALL stay pending, and retrying a stopped slice SHALL still require a fresh route picker answer.

#### Scenario: A stop reports the blocking limit

- **WHEN** an unattended lane stops because a limit blocks the correction
- **THEN** the notice names what failed, what is done and pending, the blocking limit, and the decision the user must make

### Requirement: The per-worker recovery allowlist is retired

The policy SHALL contain no per-worker continuation allowlist and no generic prohibition on re-dispatching a worker. Corrections SHALL reach a worker only through a continuation form its contract already accepts: `continue_after_recovery` for the spec and design workers, the same-worker verification note for `sai-direct-build-worker`, and the worker's ordinary fresh-result request or route-defined correction feedback elsewhere. Repair content SHALL be input to the worker, never a new result shape or execution order.

#### Scenario: A worker receives a correction

- **WHEN** the rule answers yes for a worker-owned cause
- **THEN** the correction is delivered through a continuation form that worker's contract accepts

### Requirement: Scope boundary and harness parity

The rule SHALL apply only to the unattended lanes. Attended commands, other routes, and the Direct Build `--no-specs` POC profile SHALL keep their current behavior, because a POC failure is the experiment's observation. Claude Code and opencode SHALL apply the same rule semantics.

#### Scenario: The POC profile is active

- **WHEN** the Direct Build `--no-specs` POC profile is active
- **THEN** the route neither loads nor applies the resilience rule

#### Scenario: An attended command fails

- **WHEN** an attended command meets a failure
- **THEN** it follows its existing handling unchanged
