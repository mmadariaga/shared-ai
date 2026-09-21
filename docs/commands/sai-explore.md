# `/sai-explore`

## Command function

Helps think through an idea before committing to an implementation. It clarifies needs, compares alternatives, uncovers risks, and turns a large or unclear idea into manageable changes.

## Flags and behavior modifiers

- `--fast-track`: skips confirmations related to the document language and closing the exploration. In a later planning step, it also skips choosing the language for the general overview.
- `--overview-lang <language>`: sets the language of the general overview and prevents a question about that preference.
- Closing selector: lets the user choose between `Manual`, `Plan - Unattended`, and `Direct Build - Unattended` when the exploration is ready to continue.

## In detail

The user starts with an idea, a question, a problem with several possible explanations, or a decision that is not yet mature. The command discusses the goal, boundaries, scenarios, and alternatives until it is clear what is worth building and why.

If the idea is too large for one reviewable change, it splits it into a small, useful first result called a Walking Skeleton, followed by an ordered list of later changes. Each part is described so it can enter the workflow separately.

If it detects that the place where the feature would be added mixes too many responsibilities or does not offer a clear extension point, it may first propose a reorganization that preserves current behavior. This gives the new feature a clearer place to connect.

When the technical approach is uncertain or there are several plausible explanations for a bug, it may propose a disposable proof of concept. This experiment answers the question that separates the alternatives; it is not automatically considered part of the final product. An explicit decision is requested before running it.

When the conversation closes, the user chooses how to continue. `Manual` keeps step-by-step control and allows review of the changes discovered during the session. `Plan - Unattended` prepares the required documents without asking for intermediate confirmations. `Direct Build - Unattended` delegates the build and authorizes one local confirmation when the process is complete. `--fast-track` does not skip these closing decisions.
