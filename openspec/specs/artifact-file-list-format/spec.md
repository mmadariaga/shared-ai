# artifact-file-list-format Specification

## Purpose
Keep generated file and consulted-source listings readable as separate Markdown entries while preserving established path semantics and empty-list markers.

## Requirements

### Requirement: Generated file and source listings use Markdown bullets

Shared generation instructions and templates used by `/sai-2-design` and `/sai-1-spec` SHALL require each non-empty entry in the covered listings to start with `- ` on its own line. Covered listings are task Files Affected, Existing Tests Broken, Required Documentation Spec files, Local files and External URLs, the design File Manifest, and proposal research Local files and External URLs. These shared sources SHALL apply the same presentation to Claude Code and opencode.

#### Scenario: Task file declarations retain change semantics
- **WHEN** a design worker writes non-empty Files Affected entries
- **THEN** each entry occupies one bullet line with its A, M, D, or R token and path, retaining both source and destination for a rename and any adjacent note

#### Scenario: Existing broken tests remain separate entries
- **WHEN** a design worker lists existing tests broken by a Step
- **THEN** each test occupies one bullet line retaining its path and compile or runtime failure-mode token

#### Scenario: Required documentation retains inline notes
- **WHEN** a design worker writes non-empty Required Documentation subsections
- **THEN** every spec path, local file, or external URL occupies one bullet line, with any required note on the same line and the existing ` — ` separator preserved

#### Scenario: Proposal consulted sources are readable lists
- **WHEN** a spec worker uses the proposal template to list consulted local files or external URLs
- **THEN** the template directs one bullet per source with any note alongside its path or URL

### Requirement: Empty listings retain their existing markers

The covered generation instructions and templates SHALL preserve existing absence markers rather than convert them into file or source entries. Required Documentation empty subsections SHALL retain unbulleted `None`. An empty design File Manifest SHALL retain `None — no files affected` and its reason.

#### Scenario: No required external sources
- **WHEN** a task's Required Documentation External URLs subsection has no entries
- **THEN** the subsection contains unbulleted `None` rather than a fabricated path or empty bullet

#### Scenario: No surviving manifest paths
- **WHEN** the net fold leaves no affected files
- **THEN** the File Manifest retains its existing absence sentinel and reason rather than emitting a bullet entry
