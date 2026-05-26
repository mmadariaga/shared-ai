## MODIFIED Requirements

### Requirement: sai-1-spec termination behavior
After writing all spec files, sai-1-spec SHALL stop immediately after printing the "Specs ready…" message. It MUST NOT ask for approval and MUST NOT write to `.openspec.yaml`.

#### Scenario: normal completion
- **WHEN** sai-1-spec finishes writing `proposal.md` and `specs/**/*.md`
- **THEN** it prints exactly "Specs ready in openspec/changes/{name}/. Review them and run /sai-2-design {name} when ready." and exits without any follow-up question
