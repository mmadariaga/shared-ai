## MODIFIED Requirements

### Requirement: Crystallize stage defers overview-language resolution

The `Crystallize` stage SHALL run slicing assessment and the crystallization language gate before emitting `Ready to Propose` blocks. It MUST NOT run overview-language gate 9 at stage entry; gate 9 belongs to the later supervised Auto activation.

#### Scenario: Crystallization emits without the overview question

- **WHEN** the user enters the Crystallize stage and no explicit overview-language option is supplied
- **THEN** the block is emitted after the crystallization language gate without asking gate 9

### Requirement: Fast-track preserves stage and gate boundaries

Fast-track SHALL bypass the crystallization language question and the later overview-language question only where their respective contracts apply, without skipping stages or weakening the mandatory edge-case review.

#### Scenario: Fast-track does not skip stages

- **WHEN** fast-track is active during crystallization and later supervised Auto activation
- **THEN** the language questions resolve by their separate rules while stage progression and edge-case review remain intact
