## ADDED Requirements

### Requirement: Order Reminders
The system SHALL allow Administrators to identify users who have not ordered for a specific date and send reminders.

#### Scenario: Identify missing orders
- **WHEN** an Admin checks the reminder status for "Today"
- **THEN** a list of users who have not placed an order is displayed with their contact info

#### Scenario: Send group mail
- **WHEN** an Admin clicks "Send Reminders"
- **THEN** an email is sent to all users in the missing order list
