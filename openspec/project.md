# Project Context

## Purpose
VSCC-WebDiner is a web-based ordering system designed to streamline restaurant operations. It allows customers to browse menus, place orders, and track their status, while providing staff with tools to manage orders and menus.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4
- **Backend**: Python (FastAPI)
- **Database**: SQLite 3

## Project Conventions

### Code Style
- **Formatting**: Prettier default settings.
- **Linting**: ESLint with standard React/TypeScript configs.
- **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files.
- **Backend Style**: PEP 8 (Python).

### Architecture Patterns
- **Frontend**: Feature-based directory structure (e.g., `features/menu`, `features/cart`).
- **State Management**: React Context or lightweight store (e.g., Zustand).
- **API**: RESTful API design with FastAPI.

### Testing Strategy
- **Unit Tests**: Pytest (Backend), Vitest (Frontend).
- **E2E**: Playwright (optional).

### Git Workflow
- Feature branches merged into `main` via Pull Requests.
- Commit messages should be descriptive.

## Domain Context
- **User (Personnel)**: Employee ID (工號), Name (姓名), Extension (分機), Email (信箱).
- **Menu**: Items, Categories, Modifiers.
- **Order**: Status (Pending, Preparing, Ready, Served, Paid).
- **Admin**: Menu Management, Order Analysis, Reminders.

## Important Constraints
- **Mobile-first**: For ordering interface.
- **Admin Dashboard**: Desktop-optimized.
- **Data**: SQLite for simplicity and portability.

## External Dependencies
- **Email Service**: For order reminders.
