## Purpose

Provide reliable, efficient regression evaluation so agent improvements are
accepted only when evidence shows they are safe and better.

## ADDED Requirements

### Requirement: Evaluation gates are regression-safe
The system SHALL compare a candidate version with the active version using the
configured rubric and SHALL prevent automatic promotion when the candidate regresses.

#### Scenario: Candidate passes the gate
- **WHEN** the candidate meets the configured threshold without regression
- **THEN** the system records a passing gate and makes it eligible for approval

#### Scenario: Candidate regresses
- **WHEN** the candidate scores below the active version beyond tolerance
- **THEN** the system records a failed gate and does not promote it automatically

### Requirement: Evaluation progress is visible
The system SHALL expose total cases, completed cases, cached cases, duration and
the current gate state while or after a run.

#### Scenario: User opens an evaluation run
- **WHEN** the run has started
- **THEN** the UI shows progress and distinguishes cached from newly evaluated cases
