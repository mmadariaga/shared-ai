## MODIFIED Requirements

### Requirement: Retired-party prose has a maintained verification guard

The repository SHALL maintain one retired-party prose guard shared by this capability and `invocation-core-provenance`. Its active invocation-core inventory SHALL be derived from existing `sai/commands/*/invocation.md` files, while the deleted implementation invocation SHALL remain outside that inventory. The guard SHALL preserve its existing historical-reference exclusions and retirement-evidence behavior.

#### Scenario: Guard inventory follows the retired implementation surface

- **WHEN** the maintained retired-party guard audits the active invocation-core set
- **THEN** it excludes the deleted implementation invocation while continuing to identify retired-party prose in remaining active contracts.
