## Purpose

Help users create useful agents quickly by asking for outcomes and preferences
first, while keeping advanced capabilities available for users who need them.

## ADDED Requirements

### Requirement: Agent creation is outcome-first
The system SHALL collect the intended outcome, target audience or input and
success criteria before presenting advanced provider configuration.

#### Scenario: User starts a new agent
- **WHEN** the user opens agent creation
- **THEN** the primary form asks for the task outcome and gives examples of successful results

#### Scenario: User submits an incomplete outcome
- **WHEN** the outcome is missing or too vague to validate
- **THEN** the form explains the missing information and preserves the entered fields

### Requirement: Performance preferences are understandable
The system SHALL provide labeled choices for fast, balanced, highest-quality and
local-first execution with concise explanations of their trade-offs.

#### Scenario: User chooses a preference
- **WHEN** the user selects a performance preference
- **THEN** the generated agent stores the corresponding routing preference

### Requirement: Advanced controls remain available
The system SHALL allow advanced users to expand capability and provider controls
without making those controls mandatory for a valid agent.

#### Scenario: User expands advanced settings
- **WHEN** the user opens advanced settings
- **THEN** capability and provider controls are available with safe defaults
