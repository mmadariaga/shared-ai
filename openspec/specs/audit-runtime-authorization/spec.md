# audit-runtime-authorization Specification

## Purpose
TBD - created by archiving change audits-run-unattended-goal-driven. Update Purpose after archive.

## Requirements

### Requirement: --runtime is the whole runtime authorization

For `/sai-6-performance` and `/sai-7-accessibility`, the `--runtime` option SHALL authorize the read-only performance diagnostics and the accessibility scanners by itself: the coordinator and the worker SHALL ask no authorization question about them. A diagnostic or scanner that is not installed, has no reachable or safe target, or fails to start SHALL be recorded as unavailable in the report with its reason, and the static audit SHALL continue. Without `--runtime`, no diagnostic or scanner SHALL run and performance numbers SHALL stay marked as estimated.

#### Scenario: Performance diagnostics run without a question
- **WHEN** a user invokes `/sai-6-performance my-change --runtime`
- **THEN** the worker runs the diagnostics that firm up its findings with no authorization question

#### Scenario: A scanner is not installed
- **WHEN** `--runtime` is passed to `/sai-7-accessibility` with a URL and `pa11y` is not installed
- **THEN** the report lists `pa11y` as unavailable with the reason and the audit completes

### Requirement: The accessibility dev-server URL is an input

`/sai-7-accessibility` SHALL accept `--url <url>` as the dev-server URL of its scanners. When the run has `--runtime` without `--url`, the coordinator SHALL ask the user for the URL in one question that also allows declining, before the worker starts, and SHALL ask nothing else about runtime. A declined question, or a URL that does not respond, SHALL mark the runtime part of the report unavailable while the static audit continues.

#### Scenario: Runtime without a URL
- **WHEN** a user invokes `/sai-7-accessibility my-change --runtime`
- **THEN** the coordinator asks for the dev-server URL once, before the worker starts

#### Scenario: The user declines the URL
- **WHEN** the user declines the URL question
- **THEN** the worker receives `--runtime` with no URL and the report marks the runtime part unavailable

### Requirement: Accessibility manual checks are reported as pending

The accessibility report SHALL carry a `## Pending Manual Checks` section listing the keyboard walk and the screen-reader smoke test of each critical flow the change touches, and SHALL NOT present those checks as verified.

#### Scenario: A runtime audit with critical flows
- **WHEN** the accessibility audit covers a flow the change touches
- **THEN** the report lists that flow's keyboard walk and screen-reader smoke test as unchecked items under `## Pending Manual Checks`

### Requirement: Audit scopes without applicable surface end in a Not Applicable report

An audit with no diff against its parent (and no `--full` or `--path`) SHALL write the Not Applicable report with its justification, and the coordinator SHALL verify and commit it like any report. The accessibility audit SHALL write the Not Applicable report and run no scanner when the scope holds no UI file, even with `--runtime`. The security audit SHALL run SCA only when the scope touches a dependency manifest, and otherwise its report SHALL state that SCA did not run and why.

#### Scenario: No UI files with runtime
- **WHEN** `/sai-7-accessibility my-change --runtime --url http://localhost:3000` runs on a diff without UI files
- **THEN** no scanner runs and the committed report is the Not Applicable form

#### Scenario: No manifest change
- **WHEN** the security scope touches no dependency manifest
- **THEN** the security report states that SCA did not run and why
