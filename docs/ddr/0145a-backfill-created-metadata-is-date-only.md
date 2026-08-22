# DDR 0145a: Backfill `created` metadata uses a date-only value

## Status

Accepted

## Context

The existing backfill instruction described an ISO-8601 datetime for the
`created` metadata value, while the backfill capability contract and persisted
repository metadata use a calendar date. A datetime is accepted during the
backfill flow but prevents downstream archive behavior that derives its folder
date from the metadata value.

## Decision

The backfill metadata serializer SHALL write `created` as the date-only
`YYYY-MM-DD` calendar form. The existing `schema` and `backfilled: true` keys
remain, and intent-aware runs add only the contract-defined `prior_intent: true`
provenance key. No timestamp or companion backfill metadata key is introduced.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Keep the ISO-8601 datetime | Preserves time-of-day precision | Conflicts with the archive date contract and existing persisted convention |
| Add a separate timestamp key | Retains precision without changing `created` | Adds metadata surface and still leaves the established key inconsistent |
| Normalize `created` to `YYYY-MM-DD` (chosen) | Aligns the serializer with the capability contract and archive behavior | Drops time-of-day precision that was never consumed |

## Consequences

- New backfilled changes use the same date-only metadata shape as existing repository records.
- Archive consumers can derive the date prefix without parsing a datetime.
- Existing backfilled directories remain valid because their metadata is already date-only.
- The change introduces no migration and no additional timestamp field.
