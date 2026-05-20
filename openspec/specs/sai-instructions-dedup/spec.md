## ADDED Requirements

### Requirement: Replace Language blocks in all 9 instruction files

Each of the following files SHALL have its inline `Language:` block replaced with the Fetch directive `Fetch skills/universal/token-efficient-languages/SKILL.md`:

| File | Line (approx) | Current block |
|---|---|---|
| `instructions/sai/accessibility.md` | 321 | `- **Language:** You MUST think...` |
| `instructions/sai/apply.md` | 86 | `> You MUST think and reason...` |
| `instructions/sai/commit.md` | 147 | `- **Language:** You MUST think...` |
| `instructions/sai/implement.md` | 260 | `- **Language:** You MUST think...` |
| `instructions/sai/performance.md` | 343 | `- **Language:** You MUST think...` |
| `instructions/sai/pr.md` | 141 | `- **Language:** You MUST think...` |
| `instructions/sai/review.md` | 44 | `- **Language:** You MUST think...` |
| `instructions/sai/security.md` | 318 | `- **Language:** You MUST think...` |
| `instructions/sai/spec.propose.md` | 37 | `- **Language:** Think and reason...` |

#### Scenario: Block replaced

- **WHEN** any of the 9 files is read after the change
- **THEN** the inline `**Language:**` bullet or blockquote is absent and `Fetch skills/universal/token-efficient-languages/SKILL.md` appears in its place

### Requirement: remember.md unchanged

`instructions/sai/remember.md` line 3 (`- Agent thinking/reasoning: **English only** unless the user explicitly requests otherwise`) SHALL NOT be modified. It is a last-loaded terse reminder, not a full rule copy.

#### Scenario: remember.md audit

- **WHEN** `instructions/sai/remember.md` is read after the change
- **THEN** line 3 is identical to its pre-change content

### Requirement: No semantic drift

The replacement MUST NOT alter the semantics of the surrounding context in each file. The Fetch directive SHALL occupy the same structural position (within a "Remember" section, a "Collaboration Style" list, or equivalent) that the inline Language block occupied.

#### Scenario: Section structure preserved

- **WHEN** a file containing a "Remember" or "Collaboration Style" section is read
- **THEN** the Fetch directive is present within that section, at the location the Language block previously occupied
