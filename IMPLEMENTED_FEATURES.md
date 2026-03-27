# Patang Implemented Features

This document is a concise summary of the features currently implemented in Patang.

## Authentication

- Login: Authenticated users can sign in and access role-based dashboards.
- Registration: New users can create accounts through the frontend registration flow.
- OTP verification: Newly registered users can be verified using the OTP flow.
- Forgot/reset password: Users can request a password reset and update credentials securely.
- Protected routes: Frontend pages are gated by authentication and role checks.

## Student and Faculty Features

- Dashboard: Users can view subscriptions, facility bookings, events, penalties, and access summaries.
- Sports slot booking: Users can browse sports slots and book available courts or facilities.
- Group booking: Users can create or join group bookings for sports slots.
- Booking modification: Users can change participant counts for active bookings when capacity allows.
- Booking cancellation: Users can cancel active bookings and receive UI feedback on success.
- Booking activity feed: Users can see upcoming, completed, and cancelled sports booking activity.
- Gym registration: Users can apply for gym access by uploading the required documents.
- Swimming registration: Users can apply for swimming access by uploading the required documents.
- History page: Users can review sports, subscription, and penalty history.
- Calendar page: Users can view calendar data and event-related information.
- Feedback page: Users can submit and review feedback-related content.
- Settings page: Users can manage profile and account settings.
- Entry QR viewing: Approved subscribers can open and enlarge their entry QR on the dashboard.

## Sports Caretaker Features

- Caretaker console: Sports caretakers get a dedicated attendance-verification interface.
- Upcoming booking view: Caretakers can view upcoming sports bookings with user details.
- Attendee verification: Caretakers can verify a booking holder using roll number or email.
- Attendance marking: Caretakers can mark a booking as present or absent.
- Slot release on absence: Marking a user absent frees the slot back for availability handling.

## Gym Admin Features

- Gym admin dashboard: Gym admins can view pending gym requests and live occupancy.
- Subscription review queue: Gym admins can review submitted gym subscription requests.
- Protected document access: Gym admins can open uploaded medical certificates and payment receipts.
- Approve or reject requests: Gym admins can approve or reject pending gym applications.
- QR scanner: Gym admins can verify gym passes during allowed gym operating hours only.
- Slot occupancy management: Gym admins can view per-slot occupancy and edit slot capacities.
- Gym feedback access: Gym admins can access the feedback reporting area assigned to them.

## Swim Admin Features

- Swim admin dashboard: Swim admins can view pending swimming requests and live occupancy.
- Subscription review queue: Swim admins can review submitted swimming subscription requests.
- Protected document access: Swim admins can open uploaded medical certificates and payment receipts.
- Approve or reject requests: Swim admins can approve or reject pending swimming applications.
- QR scanner: Swim admins can verify swimming passes during allowed facility operating hours only.
- Slot occupancy management: Swim admins can view per-slot occupancy and scanner-side facility usage.
- Swim feedback access: Swim admins can access the feedback reporting area assigned to them.

## Executive Features

- Executive dashboard: Executives can access a consolidated administration overview.
- Calendar management: Executives can manage institution-level calendar data.
- Coordinator access management: Executives can manage coordinator-related access and visibility.
- Booking approvals: Executives can review and act on booking-related approval flows.
- Feedback reports: Executives can view and manage submitted feedback at an administrative level.
- Analytics: Executives can view booking, subscription, and operational analytics.
- Audit log: Executives can inspect administrative audit activity.
- User management: Executives can view users and update role assignments.
- Facility management: Executives can view and manage facilities.
- Penalty management: Executives can review and update user penalties.
- Executive settings: Executives have a dedicated settings area for admin-side preferences.

## Coordinator Features

- Event management: Coordinators can create and manage event submissions.
- Venue booking: Coordinators can request and track venue bookings.

## Captain Features

- Captain dashboard: Captains have a dedicated dashboard for team practice management.
- Practice block management: Captains can create, edit, and cancel team practice blocks.

## Booking and Facility Platform Features

- Sports availability API: The system computes live slot availability and remaining capacity.
- Fair-use enforcement: Booking quotas are enforced across the rolling window rules.
- Participant-aware capacity: Slot occupancy accounts for the number of players in each booking.
- Expired-slot handling: Slots whose time window has already passed are treated as unavailable.
- Past-date protection: Stale or past booking dates are rejected or normalized by the backend.
- Facility block handling: Overlapping maintenance or practice blocks are respected during availability checks.

## Subscription and Access Features

- Pass-based subscriptions: Gym and swimming subscriptions are managed as facility passes.
- Cloud document storage: Uploaded subscription documents are stored in the cloud-backed backend storage layer.
- Protected document streaming: Subscription documents are served through authorized backend routes.
- Pass approval workflow: Approved subscriptions receive pass IDs, validity windows, and QR codes.
- Entry verification logs: Every pass scan can generate access-log records for occupancy tracking.
- Occupancy summaries: Gym and swimming occupancy snapshots are derived from facility and access data.
- Scan-window enforcement: Gym and swim QR scans are blocked outside allowed operating hours.

## Events, Feedback, and Notifications

- Approved events feed: Users can see approved upcoming events in their experience.
- Coordinator event submission flow: Event requests can be created and reviewed through the system.
- Feedback inbox and reply flow: Authorized roles can read and respond to feedback submissions.
- Notification support: The backend includes notification creation and read-tracking flows.

## Backend Operations

- Role-based APIs: Backend routes are scoped by roles such as student, caretaker, coordinator, executive, gym admin, and swim admin.
- Scheduled jobs: The backend includes jobs for slot generation, group expiry, no-show handling, and subscription expiry.
- Cloud MongoDB support: The app runs against a cloud MongoDB instance for shared persistence.
- Seed scripts: The repo contains seed and repair scripts for test users, slots, events, and admin roles.

## Testing

- Frontend unit tests: Core student, caretaker, gym admin, swim admin, and API-helper flows are covered by frontend tests.
- Backend unit tests: Controllers and services are covered for valid, invalid, and boundary cases.
- Integration tests: Route-level integration tests exist for subscription application and admin review flows.
