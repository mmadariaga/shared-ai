## ADDED Requirements

### Requirement: Explore adopts the chat language setting

The `/sai-explore` load in `sai/commands/explore/body.md` SHALL, after `sai-state spawn` and its resets, read `explore.chatPublicLanguage` with the project settings `get` CLI. When the CLI returns a `value`, the command SHALL adopt it as if the user had written "let's talk in <value>" before any idea or change is discussed: all explanatory chat text of that invocation SHALL use that language from the first message after the load, writing in another language SHALL NOT change it, and only an explicit user request for another language SHALL replace it for the rest of the invocation. Reasoning SHALL stay English, and fixed literals (STOP notices, halt messages, picker labels), the `Ready to Propose` block, the change overview, and every artifact SHALL be unaffected. A non-zero exit, unparseable output, or `value: null` SHALL count as an absent setting: the command SHALL print the tool's warnings, or one line naming the failure, and continue without a language instruction. The rule SHALL live only in the explore command card; `sai/policies/public-chat.md` and the `token-efficient-languages` contract SHALL keep their text.

#### Scenario: Setting fixes the chat language
- **WHEN** `explore.chatPublicLanguage` is `Español` and the user writes in English after the load
- **THEN** the explanatory chat text of the invocation stays in Spanish

#### Scenario: Explicit request replaces the setting
- **WHEN** the setting is `Español` and the user explicitly asks to talk in English
- **THEN** the chat uses English for the rest of the invocation

#### Scenario: Absent setting keeps today's behavior
- **WHEN** the `get` CLI returns `value: null` or fails
- **THEN** the command prints the warnings or one failure line and follows the language the user writes in

#### Scenario: Literals and artifacts are unaffected
- **WHEN** the setting has a value
- **THEN** STOP notices, halt messages, picker labels, the `Ready to Propose` block, the change overview, and artifacts keep their own languages and text
