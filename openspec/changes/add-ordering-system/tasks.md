## 1. Backend Implementation (FastAPI + SQLite)
- [x] 1.1 Setup FastAPI project structure and SQLite database connection.
- [x] 1.2 **Auth**: Implement `User` model (EmployeeID, Name, Ext, Email, Password) and Login API (JWT).
- [x] 1.3 **Menu**: Implement `MenuItem` model and CRUD APIs (Admin only for CUD).
- [x] 1.4 **Order**: Implement `Order` model and Submit API.
    - [x] 1.4.1 Implement 9:00 AM cut-off logic.
    - [x] 1.4.2 Implement Weekend/Holiday restriction logic.
    - [x] 1.4.3 Implement Cancellation API (with time check).
- [x] 1.5 **Admin Stats**: Implement API for "Today's Order Statistics" and "Order Analysis".
    - [x] 1.5.1 Implement Total Price calculation for Admin.
- [x] 1.6 **Reminders**: Implement API to identify non-ordering users for a given date.
- [x] 1.7 **Notifications**: Implement "Group Mail" trigger API.

## 2. Frontend Implementation (React + Tailwind v4)
- [x] 2.1 Setup Vite project with Tailwind CSS v4.
- [x] 2.2 **Auth**: Create Login page and Auth context.
- [x] 2.3 **Ordering (User)**: Create Menu view and Order submission interface (Date selection).
- [x] 2.4 **Admin - Menu**: Create interface to Add/Edit/Delete menu items.
- [x] 2.5 **Admin - Stats**: Create Dashboard for Order Analysis and Daily Stats.
- [x] 2.6 **Admin - Reminders**: Create view to list missing orders and "Send Reminder" button.

## 3. Verification
- [ ] 3.1 Verify User login and session persistence.
- [ ] 3.2 Verify Users can order for today and future dates.
- [ ] 3.3 Verify Admin can manage menu items.
- [ ] 3.4 Verify Admin sees correct statistics.
- [ ] 3.5 Verify Reminder emails are triggered (mocked or actual).
