## Purpose

Make agent improvement faster and more reliable by turning feedback into
deduplicated, measurable evaluation work instead of blind repeated model calls.

## ADDED Requirements

### Requirement: Feedback is curated before learning
The system SHALL normalize, deduplicate and classify feedback before it becomes
an improvement or evaluation input, while preserving the original source and
human approval state.

#### Scenario: Duplicate feedback arrives
- **WHEN** equivalent feedback is submitted more than once
- **THEN** the system keeps one learning signal with an occurrence count and source metadata

#### Scenario: Feedback is ambiguous
- **WHEN** feedback cannot be classified with confidence
- **THEN** it remains pending review and cannot automatically promote a new agent version

### Requirement: Evaluation work is cache-aware and parallelizable
The system SHALL reuse valid deterministic evaluation results and execute
independent regression cases concurrently with bounded concurrency.

#### Scenario: Cached evaluation is valid
- **WHEN** the same version, input, rubric and evaluation configuration was already evaluated
- **THEN** the system returns the cached result without another model call

#### Scenario: A parallel case fails
- **WHEN** one regression case fails while other cases are running
- **THEN** the run records the failed case, completes or cancels according to policy, and reports an explicit non-passing result

### Requirement: Learning progress is measurable
The system SHALL record cache hit rate, evaluation duration, completed case count,
regression score and promotion outcome for each learning run.

#### Scenario: Learning run completes
- **WHEN** all scheduled cases finish
- **THEN** the user can inspect its metrics and the gate outcome

#### Scenario: Learning run is interrupted
- **WHEN** the process stops before completion
- **THEN** the run is marked incomplete and can be retried without duplicating completed valid cases

### Requirement: Vector memory remains optional
The system SHALL continue functioning when Qdrant is unavailable and SHALL never
block feedback capture or evaluation on an external vector service.

#### Scenario: Qdrant is offline
- **WHEN** a memory synchronization or search request cannot reach Qdrant
- **THEN** the system reports degraded memory status and continues with local memory behavior
