## Purpose

Expose useful, privacy-safe execution telemetry so users can understand speed
and fallback behavior without exposing private prompts or provider credentials.

## ADDED Requirements

### Requirement: Chat telemetry is privacy-safe
The system SHALL report provider, model tier, latency, cache status and fallback
count while excluding API keys, full prompts, hidden reasoning and sensitive headers.

#### Scenario: Chat response completes
- **WHEN** an authenticated chat request completes
- **THEN** its response or associated metrics include the safe telemetry fields

#### Scenario: Chat request fails
- **WHEN** all providers fail
- **THEN** the error includes a safe failure category and excludes provider secrets

### Requirement: Telemetry is usable for aggregate metrics
The system SHALL aggregate chat telemetry by time window, strategy and provider
without storing raw message content as a requirement for the aggregate.

#### Scenario: User views metrics
- **WHEN** the metrics page loads
- **THEN** it shows latency, cache and fallback aggregates for the selected window
