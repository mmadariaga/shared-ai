# sai-1-spec Stop Specification

## Purpose

This capability defines the sai-1-spec feedback gate and mandatory stop after proposal and spec artifacts are produced.

## Requirements

### Requirement: sai-1-spec stops when its segment closes

`/sai-1-spec` SHALL stop when its segment closes — after the worker wrote `proposal.md` and the specs, the mechanical checks passed, the review rounds ended, and the segment's paths were committed or left uncommitted because the project ignores them — by printing its closing report and, when the segment completed, exactly ``Spec done in openspec/changes/{name}/. Review it and run `/sai-2-design {name}` in a new chat when ready.`` It SHALL present no feedback gate and ask no follow-up question. It is not an approval gate: it MUST NOT ask for approval and MUST NOT write `approval.specs` keys to `.openspec.yaml`.

#### Scenario: stop fires after the segment closes

- **WHEN** `/sai-1-spec` finishes writing `proposal.md` and `specs/**/*.md`, its checks pass, its review ends, and its paths are committed
- **THEN** it prints the closing report ending with the `Spec done` line and exits without any follow-up question

#### Scenario: stop is deferred until the segment closes

- **WHEN** `/sai-1-spec` has written all artifacts but a mechanical check still fails
- **THEN** the `Spec done` line is not printed and the segment does not close

#### Scenario: no approval and no approval write

- **WHEN** `/sai-1-spec` closes
- **THEN** it does not ask for approval and writes no `approval.specs` key to `.openspec.yaml`
