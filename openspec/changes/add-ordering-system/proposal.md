# Change: Add Ordering System

## Why
To implement the core ordering functionality for VSCC-WebDiner, enabling staff to order meals and administrators to manage menus and track orders.

## What Changes
- **Tech Stack**: FastAPI, SQLite, React + Tailwind v4.
- **Capabilities**:
    - `auth`: User management (Employee ID, Name, Ext, Email) and Login.
    - `ordering`: Menu browsing, Order submission (future dates allowed), Admin Menu Management, Order Statistics.
    - `notifications`: Order reminders (Identify non-ordering users, Group Email).

## Impact
- **New Specs**: `auth`, `ordering`, `notifications`
- **New Code**: 
    - Backend: FastAPI app, SQLite DB models, API routes.
    - Frontend: Login page, Ordering Dashboard, Admin Dashboard.
