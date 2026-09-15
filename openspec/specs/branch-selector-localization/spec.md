# branch-selector-localization Specification

## Purpose
TBD - created by archiving change localize-merge-branch-question. Update Purpose after archive.
## Requirements
### Requirement: Branch selector uses canonical English source
The merge branch selector SHALL ask the canonical English source Which branch do you want to merge? as its worker source, with coordinator ambient rendering that never opens the working-language question early because selection happens before working_language is known.

#### Scenario: Canonical source replaces fixed literal
- **WHEN** the merge worker returns the branch-selection gate
- **THEN** the worker source SHALL be Which branch do you want to merge? and the coordinator SHALL render it in the ambient conversation language without opening the working-language question early

### Requirement: Ambient render preserves values and labels
The branch selector SHALL preserve exact option values and readable date labels across languages: Spanish keeps ¿Qué rama quieres mergear?, English uses the canonical, any other language falls back to the canonical, while values stay exact branch names and labels stay <branch> — last commit <YYYY-MM-DD HH:mm>.

#### Scenario: Stable values across languages
- **WHEN** the branch selector is rendered in any ambient language
- **THEN** option values SHALL stay exact branch names and labels SHALL stay <branch> — last commit <YYYY-MM-DD HH:mm> while the concise wording follows the ambient rule

### Requirement: Adjacent summary carries detailed context
The adjacent gate summary SHALL carry the detailed current branch, candidate timestamps, and merge rationale in the ambient conversation language, keeping detailed context outside the concise question.

#### Scenario: Summary keeps timestamps and rationale
- **WHEN** the branch selector gate is presented
- **THEN** the adjacent summary SHALL present the current branch, candidate timestamps, and merge rationale in the ambient conversation language

