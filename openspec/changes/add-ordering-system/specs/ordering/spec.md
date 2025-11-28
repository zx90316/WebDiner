## ADDED Requirements

### Requirement: Menu Management (Admin)
The system SHALL allow Administrators to manage the menu.

#### Scenario: Add new item
- **WHEN** an Admin submits a new menu item details
- **THEN** the item is added to the menu and visible to users

#### Scenario: Delete item
- **WHEN** an Admin deletes a menu item
- **THEN** the item is removed from the menu

### Requirement: User Ordering
The system SHALL allow Users to place orders for the current date or future dates, subject to time and day restrictions.

#### Scenario: Order for future
- **WHEN** a User selects a future date and submits an order
- **THEN** the order is recorded for that specific date

#### Scenario: Order Cut-off
- **WHEN** a User attempts to place an order for "Today" after 9:00 AM
- **THEN** the system prevents the order submission and shows an error message

#### Scenario: Holiday Restriction
- **WHEN** a User attempts to place an order for a weekend or holiday
- **THEN** the system prevents the order submission

### Requirement: Order Cancellation
The system SHALL allow Users to cancel their orders before the cut-off time.

#### Scenario: Cancel before cut-off
- **WHEN** a User cancels their order for "Today" before 9:00 AM
- **THEN** the order is successfully cancelled

#### Scenario: Cancel after cut-off
- **WHEN** a User attempts to cancel their order for "Today" after 9:00 AM
- **THEN** the system prevents the cancellation

### Requirement: Order Statistics (Admin)
The system SHALL provide order statistics to Administrators, including total price calculations.

#### Scenario: View today's stats with price
- **WHEN** an Admin views the dashboard
- **THEN** a summary of today's orders is displayed
- **AND** the total calculated price for all orders is shown

### Requirement: Order Analysis (Admin)
The system SHALL provide a detailed order analysis table.

#### Scenario: View analysis
- **WHEN** an Admin requests the order analysis
- **THEN** a detailed table of who ordered what is displayed
