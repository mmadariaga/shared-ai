# opencode-model-discovery Specification

## Purpose
_TBD: purpose not yet written._

## Requirements

### Requirement: Model catalog discovery from the opencode CLI
The OpenCode settings selector SHALL discover the available model catalog by executing `opencode models` through the injectable command runner and parsing the command's stdout. Every non-empty stdout line SHALL be parsed as one model identifier of the form `provider/model-id`: the provider identifier SHALL be the substring before the first `/` and the model identifier SHALL be the substring after it. A non-empty line that does not contain a `/`, or whose provider or model side is empty, SHALL be a malformed catalog line. The parsed catalog SHALL be the source for every provider and model option offered to the user.

#### Scenario: catalog lines parse into provider and model identifiers
- **WHEN** the discovery command returns stdout lines such as `opencode-go/deepseek-v4-flash` and `openai/gpt-5.4`
- **THEN** each line parses into a provider identifier (`opencode-go`, `openai`) and a model identifier (`deepseek-v4-flash`, `gpt-5.4`) split at the first `/`

#### Scenario: the parsed catalog drives every offered option
- **WHEN** the user is offered provider or model choices for OpenCode customization
- **THEN** every offered option comes from the parsed catalog and no option is a frozen placeholder

#### Scenario: a malformed line fails the whole discovery transaction
- **WHEN** any non-empty stdout line lacks a `/`, or has an empty provider side or an empty model side
- **THEN** the entire catalog parse is treated as a discovery failure and no partial catalog is offered

### Requirement: Discovery uses the local catalog without refresh
The model discovery command SHALL NOT pass `--refresh`. The flow SHALL use the opencode CLI's effective local model catalog and SHALL NOT trigger an implicit network operation or models.dev cache refresh.

#### Scenario: discovery command line carries no refresh flag
- **WHEN** the OpenCode settings selector executes the model discovery command
- **THEN** the executed command line is exactly `opencode models` with no `--refresh` flag

### Requirement: Provider set derived by first-slash split
The provider set SHALL be derived from the parsed catalog by collecting the distinct provider prefixes in first-appearance order, each provider prefix being the substring before the first `/` of at least one catalog entry. The provider screen SHALL offer exactly that derived provider set.

#### Scenario: distinct providers are offered once in first-appearance order
- **WHEN** the parsed catalog contains entries from `opencode`, `opencode-go`, and `openai`
- **THEN** the provider screen offers exactly `opencode`, `opencode-go`, and `openai` in first-appearance order with no duplicates

#### Scenario: provider order follows catalog appearance
- **WHEN** the catalog lists `openai` entries before `opencode-go` entries
- **THEN** the provider screen offers `openai` before `opencode-go`

### Requirement: Model screen scoped to the selected provider
After the user selects a provider, the model screen SHALL offer exactly the model identifiers whose catalog entry carries that provider prefix, in catalog order. The model screen SHALL reuse the already-parsed catalog output and SHALL NOT execute a second discovery command.

#### Scenario: model list matches the selected provider only
- **WHEN** the user selects provider `opencode-go` whose catalog entries include `opencode-go/deepseek-v4-flash` and `opencode-go/glm-5.2`
- **THEN** the model screen offers exactly `deepseek-v4-flash` and `glm-5.2` and no model from any other provider

#### Scenario: no second discovery launch for the model screen
- **WHEN** the user selects a provider
- **THEN** the model screen is populated from the catalog output already parsed at the provider screen without executing `opencode models` again

### Requirement: Injectable command execution
The discovery command SHALL be executed through an injectable command runner whose default SHALL execute the real `opencode` CLI and whose injected replacement SHALL allow deterministic tests to script command output, failure exit codes, and parse boundaries without launching the CLI. Command output, exit status, and errors from the runner SHALL be the only inputs to catalog parsing. The runner SHALL accept an executable plus an argument array and SHALL execute the command without shell-string interpolation, so CLI- or config-derived values are never interpreted as command syntax. On Windows, the default runner MUST invoke `powershell.exe` and transport the executable and JSON-encoded argument array through environment variables, then decode and splat the arguments without interpolating them into shell syntax; on non-Windows platforms, it SHALL preserve direct argument-vector execution.

#### Scenario: injected runner output drives parsing
- **WHEN** a test injects a command runner returning a fixed stdout payload and exit status zero
- **THEN** the catalog parser consumes exactly that payload and the flow offers options derived from it

#### Scenario: injected runner failure drives the failure path
- **WHEN** a test injects a command runner returning a non-zero exit status or a thrown error
- **THEN** the flow treats discovery as failed and follows the discovery-failure cancellation behavior

#### Scenario: runner receives an executable and an argument array
- **WHEN** the selector executes the model discovery command
- **THEN** the runner is invoked with the executable and the argument array (e.g. `opencode`, `['models']`) and the command is never assembled by interpolating values into a shell string

#### Scenario: Windows catalog discovery resolves the npm shim safely
- **WHEN** the default runner executes `opencode models` with `platform: 'win32'`
- **THEN** it invokes `powershell.exe`, preserves the executable and argument array in environment data, and passes the decoded arguments through PowerShell splatting.

#### Scenario: Non-Windows catalog discovery keeps direct execution
- **WHEN** the default runner executes `opencode models` on a non-Windows platform
- **THEN** it invokes the executable directly with the unchanged argument array and UTF-8 output encoding.

### Requirement: Discovery failure is non-fatal cancellation
When the discovery command launch throws, the command exits non-zero, any non-empty stdout line is malformed (missing `/` or an empty provider or model side), or the parsed catalog is empty, the OpenCode customization SHALL cancel: no provider, model, or variant screen SHALL be presented, no placeholder fallback SHALL be offered, and no settings SHALL be produced (hence no override). The cancellation SHALL emit an actionable diagnostic identifying the failed catalog query, preserving stderr when available or reporting the exit status when stderr is empty. The customization run SHALL complete normally without hard-exiting the process.

#### Scenario: non-zero exit cancels without a fallback
- **WHEN** the discovery command exits non-zero
- **THEN** OpenCode customization is cancelled with no provider or model screen presented, no placeholder options offered, and no settings produced

#### Scenario: a malformed line cancels without a partial catalog
- **WHEN** any non-empty stdout line is malformed, even when other lines are well-formed
- **THEN** OpenCode customization is cancelled with no partial catalog offered and no invalid or partial settings produced

#### Scenario: empty catalog cancels the run
- **WHEN** the discovery command succeeds and parses but yields an empty catalog
- **THEN** OpenCode customization is cancelled with no provider screen presented and the run completes normally

#### Scenario: Catalog launch failure reports the cause
- **WHEN** the command runner throws while querying the model catalog
- **THEN** the selector logs an `Unable to query OpenCode models` diagnostic containing the launch error and returns no settings.

#### Scenario: Catalog non-zero exit reports stderr or status
- **WHEN** the catalog command exits with a non-zero status
- **THEN** the selector logs the command failure detail and cancels without showing a selection screen.
