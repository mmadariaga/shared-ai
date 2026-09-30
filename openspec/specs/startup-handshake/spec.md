# Startup Handshake Specification

## Purpose
Establish a resumable worker session before expensive or mutating phase work begins.

## Requirements

### Requirement: early-startup-progress

A worker with a declared progress plan SHALL complete prerequisite checks and required change or scope resolution before dispatching subagents, writing artifacts, or beginning analysis or review work. A worker whose phase declares no step machine SHALL return its startup progress event as soon as those checks complete. A step-machine worker SHALL instead follow the first filed step pointer disclosed with its task and report the startup step id together with that step's id in its first progress event, per `@sai/orchestration/worker-core.md` § Step-machine task disclosure; its resumable handle is established by its `event: ready` return.

#### Scenario: worker establishes a resumable handle
- **WHEN** prerequisites and required resolution pass
- **THEN** the worker SHALL have started no expensive or mutating work before they passed, and SHALL either return its startup progress event before that work or, on a step-machine phase, report the startup id together with the first filed step id
- **AND** the coordinator SHALL retain a resumable worker session for continuation

#### Scenario: prerequisite or resolution failure
- **WHEN** the worker cannot complete prerequisites or required resolution
- **THEN** it SHALL return the applicable terminal failure or cancellation result instead of a startup handshake, emitting no progress event
