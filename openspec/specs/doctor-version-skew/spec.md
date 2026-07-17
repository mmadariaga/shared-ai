## ADDED Requirements

### Requirement: version skew via .version marker

When a harness user-global dir contains a `.version` marker, the doctor SHALL read it and compare it against the latest `version` field fetched from `raw.githubusercontent.com/mmadariaga/shared-ai/main/package.json`. When the two differ, the doctor SHALL report a version-skew warning naming the installed version and the latest version; when they match, it SHALL report the install as up to date.

#### Scenario: marker matches latest
- **WHEN** a harness's `.version` marker equals the `version` in the latest `package.json` on `main`
- **THEN** the doctor reports that harness as up to date

#### Scenario: marker behind latest
- **WHEN** a harness's `.version` marker differs from the latest `package.json` `version`
- **THEN** the doctor reports a version-skew warning naming both the installed and the latest version

### Requirement: file-diff fallback when marker absent or untrusted

When a harness's `.version` marker is missing or cannot be trusted, the doctor SHALL fall back to comparing the installed harness files against the fresh repo fetched from `main`, and SHALL report the set of differing or missing files instead of a numeric version comparison.

#### Scenario: absent marker triggers file diff
- **WHEN** a detected harness has no `.version` marker
- **THEN** the doctor reports a file diff of that harness's installed files against the fresh repo rather than a numeric version-skew line

#### Scenario: file diff names differing files
- **WHEN** the file-diff fallback runs and finds installed files that differ from or are missing relative to the fresh repo
- **THEN** the doctor lists those files so the user can see exactly what is out of date

### Requirement: network-read boundary

The version-skew check SHALL obtain the latest `package.json` (and, for the fallback, the fresh repo file inventory) over the network by read-only fetch. It SHALL NOT require authentication and SHALL NOT write any fetched content to disk.

#### Scenario: fetch is read-only and unauthenticated
- **WHEN** the doctor fetches the latest `package.json` from `raw.githubusercontent.com`
- **THEN** it performs an unauthenticated read and does not persist the fetched content to disk
