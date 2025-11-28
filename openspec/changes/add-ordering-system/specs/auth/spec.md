## ADDED Requirements

### Requirement: User Identity
The system SHALL store user personnel information.

#### Scenario: User profile
- **GIVEN** a registered user
- **THEN** their profile includes Employee ID, Name, Extension, and Email

### Requirement: Authentication
The system SHALL allow users to log in using an account and password.

#### Scenario: Successful login
- **WHEN** a user enters valid credentials
- **THEN** they are authenticated and redirected to the main page
