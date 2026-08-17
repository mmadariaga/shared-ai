# Startup Handshake Specification

## Purpose
Establish a resumable worker session before expensive or mutating phase work begins.

## Requirements

### Requirement: early-startup-progress

A worker with a declared progress plan SHALL return its startup progress event as soon as prerequisite checks and required change or scope resolution complete, before dispatching subagents, writing artifacts, or beginning analysis or review work.

#### Scenario: worker establishes a resumable handle
- **WHEN** prerequisites and required resolution pass
- **THEN** the worker SHALL return its startup progress event before expensive or mutating work
- **AND** the coordinator SHALL retain a resumable worker session for continuation

#### Scenario: prerequisite or resolution failure
- **WHEN** the worker cannot complete prerequisites or required resolution
- **THEN** it SHALL return the applicable terminal failure or cancellation result instead of a startup handshake
