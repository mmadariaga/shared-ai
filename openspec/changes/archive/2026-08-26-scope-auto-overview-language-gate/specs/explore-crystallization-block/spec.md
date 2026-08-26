## MODIFIED Requirements

### Requirement: Record only knowable overview language in emitted blocks

Every `Ready to Propose` block SHALL render `**Overview language**: <value>` after `**Implementation Details**`, where `<value>` is the explicit `--overview-lang` value or `None`. A value selected later by gate 9 MUST NOT be retroactively inserted into an already emitted block.

#### Scenario: Gate-selected values do not alter emitted blocks

- **WHEN** supervised Auto resolves a language after a block was emitted
- **THEN** the existing block remains unchanged and contains only its prior explicit value or `None`

### Requirement: Close with the renamed three-option selector

The shared crystallization close SHALL retain the keep-window recommendation and finish with the three-option selector using the displayed `Auto (sai-1 + sai-2)` label before Auto-fast and Manual.

#### Scenario: Shared close uses the new label

- **WHEN** any supported crystallization path reaches its close
- **THEN** the recommendation precedes exactly one selector whose first option names `sai-1` and `sai-2` only
