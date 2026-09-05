## Purpose

Give users and operators a safe, understandable view of available AI providers
and the routing decisions that affect speed, quality, cost and resilience.

## ADDED Requirements

### Requirement: Provider status is observable without secrets
The system SHALL report each configured or local provider's availability,
capabilities, last health result and measured latency without returning API keys,
tokens or secret-bearing URLs.

#### Scenario: Provider health is available
- **WHEN** an authenticated user opens provider status
- **THEN** the response lists safe provider metadata and a current health state

#### Scenario: Provider is unavailable
- **WHEN** a provider health check times out or fails
- **THEN** the provider is marked unavailable with a safe reason and other providers remain usable

### Requirement: Routing strategy is user-selectable
The system SHALL allow a user to choose a task strategy based on speed,
balanced quality, reasoning quality or local-first execution.

#### Scenario: User selects fast execution
- **WHEN** the user selects the fast strategy for an agent
- **THEN** routing prefers an available fast model and retains configured fallback behavior

#### Scenario: Invalid strategy is submitted
- **WHEN** a request contains an unsupported strategy
- **THEN** the request is rejected with a validation error and no provider call is made

### Requirement: Routing explanations are safe and actionable
The system SHALL expose the selected tier, provider, fallback count and reason
for the choice without exposing prompts, credentials or internal chain-of-thought.

#### Scenario: User inspects a response
- **WHEN** a response completes
- **THEN** the user can see a concise routing summary including whether fallback occurred
