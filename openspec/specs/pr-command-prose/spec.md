# pr-command-prose Specification

## Purpose
TBD - created by archiving change pr-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: pr-command-prose routes to collect and apply, consuming their JSON

The `sai/commands/pr/instructions.md` SHALL route the model's `/sai-pr` invocation to collect branch and readiness data as JSON, then to apply with drafted title and body text. The instructions MUST NOT direct the model to read `spec.md` or `implement.md` files, as the `sai-workflow` schema does not produce them in any project. The prose SHALL describe the JSON structure of collect output and stdin/stdout conventions for apply.

#### Scenario: routes pr-collect for readiness inspection
- **WHEN** /sai-pr is invoked
- **THEN** the command instructions route to `sai/tools/pr.js collect` to gather branch, commit, diff, artifact, specification, authentication, and existing PR information as JSON
- **AND** the model can inspect the collect output to determine readiness before proceeding

#### Scenario: routes pr-apply for pull request creation
- **WHEN** collect is complete and the model has drafted title and body text
- **THEN** the command instructions route to `sai/tools/pr.js apply`, passing the title and body via stdin
- **AND** apply creates the pull request or reports title validation errors

#### Scenario: removes stale artifact references
- **WHEN** the command prose addresses files expected in the change directory
- **THEN** it does not direct the model to read `spec.md` or `implement.md`, which the sai-workflow schema never produces
- **AND** any prior instruction to check those files is removed

#### Scenario: describes JSON input and output contracts
- **WHEN** the command instructions explain collect and apply
- **THEN** they describe the JSON structure of collect output (artifacts object, commit entries, diff statistics) and the stdin/stdout contract for apply (title + body on stdin, PR URL on stdout)
- **AND** the model can correctly parse collect output and format apply input

