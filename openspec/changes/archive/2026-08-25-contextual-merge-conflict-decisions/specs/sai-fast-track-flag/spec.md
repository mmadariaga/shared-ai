# sai-fast-track-flag Specification

## MODIFIED Requirements

### Requirement: Merge fast-track bypasses only runtime scope

When `/sai-merge` runs with `--fast-track`, it SHALL bypass only the runtime resolution scope question. It SHALL still require contextual analysis, explicit human decisions for semantic ambiguity, complete-file payload validation, worker-owned verification, and final commit authorization.

#### Scenario: Fast-track preserves contextual safety

- **WHEN** a fast-track merge contains a semantically ambiguous conflict
- **THEN** the command skips only scope selection and still requires the contextual decision and every later validation and authorization boundary
