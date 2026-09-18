# powershell-quoting Specification

## Purpose
TBD - created by archiving change sai-state-powershell-quoting. Update Purpose after archive.

## Requirements

### Requirement: Windows PowerShell official quoting pattern
The documentation SHALL define the variable-with-escaped-doubles pattern as the official Windows PowerShell emit form, labeled as verified on PowerShell 5.1 with verification on PowerShell 7+ pending, and SHALL explain that single quotes protect against PowerShell parsing only and not against native-argument passing to node.exe.

#### Scenario: Agent emits from Windows PowerShell with official pattern
- **WHEN** an agent builds the payload in a variable with escaped doubles and passes the variable as exactly one argument on Windows PowerShell
- **THEN** the store receives intact JSON doubles and parses the event without INVALID_EVENT

### Requirement: Single-quote form scope boundary
The documentation SHALL retain the single-quote form for bash and interactive PowerShell only with an explicit native-argument warning and a Linux-unaffected note, and SHALL NOT present it as the Windows agent-shell form.

#### Scenario: Reader follows quoting guidance on Linux or bash
- **WHEN** a reader follows the single-quote form on Linux or bash where no native-argument boundary strips quotes
- **THEN** the payload parses normally and Linux behavior stays unchanged
