# install-doctor-diagnostics Specification

## Purpose
Define doctor diagnostics over the complete manifest-projected opencode agent census: every manifest-projected opencode agent file receives a doctor record — missing, incompatible, or compatible — so that no projected worker is silently absent from the doctor report, with the installer's binding-derived roster validation as the install-time counterpart.

## Requirements

### Requirement: Installer and doctor diagnostics share census coverage
Doctor's managed-agent inventory SHALL cover every manifest-projected opencode agent file: doctor SHALL derive the inventory from the install manifest's opencode `tunable-seed` agent projections and SHALL emit a record for each projected agent file — missing, incompatible, or compatible — so that no projected worker can be silently absent from the doctor report. The projection set is doctor's only inventory source, so coverage of binding-dispatched workers holds exactly while the projection set stays aligned with the binding-derived roster; that alignment is not enforced at runtime by doctor or the installer. The installer's binding-derived roster validation SHALL remain the install-time counterpart.

#### Scenario: Doctor catches the previously invisible spec worker
- **WHEN** the projected agent file `sai-1-spec-proposal-worker.md` is absent while the other projected worker agent files exist
- **THEN** doctor reports `sai-1-spec-proposal-worker` as missing and exits with the existing error severity

#### Scenario: Adding a binding expands both checks
- **WHEN** a binding dispatching a new worker is valid AND the install manifest declares a matching `tunable-seed` agent projection
- **THEN** install-time roster validation includes the new worker and doctor emits a record for its projected agent file without maintaining a separate doctor-side membership list

#### Scenario: A binding without a projection is invisible to doctor
- **WHEN** a binding dispatches a worker but the install manifest declares no matching `tunable-seed` agent projection
- **THEN** doctor emits no record for that worker and no runtime check detects the desync — binding-to-projection alignment is an explicit open gap for a future code change (installer roster validation cross-checking the projection set), not a guarantee this requirement claims

### Requirement: Doctor reports census derivation failures
Doctor MUST remain loadable when opencode managed-agent inventory derivation fails. Its managed opencode-agent check SHALL catch install-manifest load or expansion failures for the opencode projections and SHALL emit an error diagnostic carrying the actionable failure message instead of aborting during module import or diagnostic generation.

#### Scenario: Manifest expansion failure becomes a doctor diagnostic
- **WHEN** doctor runs while the install manifest cannot be loaded or its opencode projections cannot be expanded
- **THEN** doctor emits an error diagnostic naming the opencode projection expansion and continues producing its diagnostic result
