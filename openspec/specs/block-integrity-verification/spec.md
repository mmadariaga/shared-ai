# block-integrity-verification Specification

## Purpose
Define the hash recomputation that every worker receiving a stored block performs before any work, so a block truncated or altered in transit is refused instead of implemented.

## Requirements

### Requirement: Hash sub-command recomputes one block's hash

`node sai/tools/ready-to-propose.js hash` SHALL read stdin, extract its `Ready to Propose` blocks, and, when exactly one block is present, print `{ok: true, hash}` with the same sha256 the dispatchable verdict reports for that block and exit 0, ignoring text around the block. Any other block count SHALL print `{ok: false, blocks, error}` and exit 1. Unreadable stdin SHALL exit 2.

#### Scenario: Single block prints its hash

- **WHEN** one block, optionally surrounded by other text, is piped to the `hash` sub-command
- **THEN** the process exits 0 and prints the sha256 that the dispatchable verdict reports for that block

#### Scenario: Truncated or altered block hashes differently

- **WHEN** a block is truncated or altered after its hash was stored
- **THEN** the `hash` sub-command prints a hash that differs from the stored one

#### Scenario: Other block counts exit 1

- **WHEN** stdin carries no block or more than one block
- **THEN** the process prints `ok: false` with the block count and exits 1

### Requirement: Receiving workers verify the block hash before any work

The Direct Build implementer after `--direct-build`, the backfill prepare worker after `--direct-build-prepare`, and the supervised spec worker after `--supervised` SHALL require paired `--block-file <absolute path>` and `--block-hash <sha256>` lines. Before dependent work each SHALL invoke `ready-to-propose.js verify-file` with those references. Verification SHALL require a safe regular transfer file containing exactly one block and matching the existing LF-normalized hash; it SHALL reject missing, unreadable, unsafe, or mismatched files. Each receiver SHALL return `failed` with no changes and identify the problem before repository reads or writes when verification fails. After success the verified file SHALL supply the sole block input. Workers SHALL never reconstruct, complete, or repair a block from chat.

#### Scenario: Hash mismatch fails without changes

- **WHEN** a receiving worker's recomputed hash differs from its envelope `--block-hash` value
- **THEN** it returns `failed` with a summary stating that the received block does not match its hash, and it changes nothing

#### Scenario: Missing required hash line fails

- **WHEN** a Direct Build implementer, backfill prepare, or supervised spec envelope carries no `--block-hash` line
- **THEN** the worker returns `failed` with no changes and a summary naming the missing line

#### Scenario: Missing or unreadable file fails before work

- **WHEN** a required file line is absent or the supplied file cannot be read
- **THEN** the worker returns failed without changes or dependent work and names the missing line or file problem.

### Requirement: Unstored blocks carry no hash check

The Manual route SHALL have no store and no hash. In the spec worker, a `--block-hash` line outside an Explore-supervised envelope SHALL be request content, and a pasted block SHALL be validated on its own merits with the dispatchable contract. The pinned `--no-specs` POC profile SHALL have no stored block: its implementer envelope's first line SHALL be `--direct-build --no-specs`, it SHALL carry no hash line, and nothing SHALL be verified.

#### Scenario: Pasted block is validated on its own merits

- **WHEN** a user pastes a block into `/sai-1-spec` outside an Explore-supervised envelope
- **THEN** no hash comparison applies and the block is validated with the dispatchable contract alone

#### Scenario: No-specs POC dispatch verifies nothing

- **WHEN** Direct Build dispatches the implementer with the `--direct-build --no-specs` marker line
- **THEN** the envelope carries no hash line and the implementer runs no hash verification
