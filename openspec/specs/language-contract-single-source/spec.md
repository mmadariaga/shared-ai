# language-contract-single-source Specification

## Purpose
TBD - created by archiving change budget-ro. Update Purpose after archive.

## Requirements

### Requirement: remember-language-section-fetches-the-language-skill
The `## Language` section of `sai/policies/remember.md` SHALL consist of one `Fetch @skills/token-efficient-languages/SKILL.md` line followed by the sentence stating that the user can override any of the three rules explicitly. It SHALL NOT restate the reason-in-English, reply-in-the-user's-language, or artifacts-in-English rules inline.

#### Scenario: language rules come from the skill
- **WHEN** a session loads `@sai/policies/remember.md`
- **THEN** the three language rules reach it through the fetched `token-efficient-languages` skill and `remember.md` holds no inline copy of them

#### Scenario: explicit user override keeps working
- **WHEN** the user explicitly requests a different reasoning, reply, or artifact language
- **THEN** the override sentence in `remember.md` § Language applies and the request wins over the fetched defaults
