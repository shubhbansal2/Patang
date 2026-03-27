# Patang

Patang is a full-stack sports and facilities management platform for institute users. It covers sports slot booking, gym and swimming pass registration, QR-based access workflows, caretaker attendance handling, captain practice blocks, and role-based admin portals.

## Repository Structure

- [backend](/Users/aarya/repo_main/backend): Express + MongoDB backend with auth, booking, subscription, event, admin, and caretaker APIs.
- [frontend](/Users/aarya/repo_main/frontend): React frontend for students, caretakers, captains, coordinators, executives, gym admins, and swim admins.

## Main Features

- Authentication with registration, OTP verification, login, and password reset
- Student and faculty dashboard with bookings, subscriptions, penalties, and events
- Sports slot booking with fair-use checks, participant counts, and booking activity
- Gym and swimming registration with document upload and admin approval
- Sports caretaker console for attendance verification
- Captain practice block management
- Coordinator and executive management flows
- Gym admin and swim admin dashboards, request review, and QR scanning

## Running Locally

The repo is documented as `npm`-first.

Quick start:

```bash
cd /Users/aarya/repo_main/backend
npm ci
npm start

cd /Users/aarya/repo_main/frontend
npm ci
npm run dev
```

Detailed setup, environment notes, test commands, and test accounts are in:
- [LOCAL_SETUP_AND_TEST_USERS.md](/Users/aarya/repo_main/LOCAL_SETUP_AND_TEST_USERS.md)

## Project Documentation

- [IMPLEMENTED_FEATURES.md](/Users/aarya/repo_main/IMPLEMENTED_FEATURES.md)
  Basic feature-by-feature summary of what is currently implemented in Patang.

- [backend_documentation.md](/Users/aarya/repo_main/backend_documentation.md)
  Consolidated backend reference covering architecture, route groups, modules, and backend behavior.

- [LOCAL_SETUP_AND_TEST_USERS.md](/Users/aarya/repo_main/LOCAL_SETUP_AND_TEST_USERS.md)
  Local setup steps, test commands, and dedicated MongoDB test users for every role.

- [TEST_INVENTORY.md](/Users/aarya/repo_main/TEST_INVENTORY.md)
  File-by-file overview of the automated unit and integration test suite.

## Testing

Current automated coverage includes both frontend and backend unit tests, plus backend route-level integration tests.

Recommended commands:

```bash
cd /Users/aarya/repo_main/frontend
npm test

cd /Users/aarya/repo_main/backend
npm test -- --pool forks
```

## Notes

- The backend is configured to work with a cloud MongoDB deployment.
- Gym and swimming subscriptions are pass-based and use QR verification.
- Some local environment details such as ports are controlled through env files rather than hardcoded repo-wide settings.
