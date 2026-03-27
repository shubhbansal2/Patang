# PR README: Combined Sports Facilities, Gym Registration, and Calendar Backend

## Quick Links

- Local setup and test users: [LOCAL_SETUP_AND_TEST_USERS.md](/Users/aarya/repo_main/LOCAL_SETUP_AND_TEST_USERS.md)
- Backend reference: [backend_documentation.md](/Users/aarya/repo_main/backend_documentation.md)
- Test inventory: [TEST_INVENTORY.md](/Users/aarya/repo_main/TEST_INVENTORY.md)

## Summary

This pull request combines and stabilizes the backend work for:

- Sports facilities slot booking
- Gym and swimming subscription registration
- Caretaker operations for attendance and booking validation
- Gym/Swim admin review and access verification
- Unified event calendar workflows
- Penalty and suspension automation

The branch is intended to be the merged continuation of the earlier `gym_registration` and sports facilities backend work, with caretaker and admin portal requirements added on top.

## What This PR Adds

### 1. Sports Facilities Booking Backend

- Users can view available sports facility slots for the next 3 days.
- Users can book valid available slots.
- Group bookings are supported with `Provisioned` to `Confirmed` flow.
- Group members can join open group bookings.
- Slots are reserved/booked with race-condition-safe status updates.
- Fair-use rules are enforced:
  - Maximum 2 active bookings in a rolling 72-hour window.
- Booking conflicts and duplicate active slot bookings are prevented.

### 2. Booking Cancellation and Penalty Rules

- Users can cancel their own sports bookings with a mandatory cancellation reason.
- If cancelled 2 hours or more before slot start:
  - Booking is cancelled without penalty.
- If cancelled within 2 hours of slot start:
  - Booking is marked `LateCancelled`
  - A late cancellation penalty is created.
- Penalty escalation is supported:
  - 2 late cancellations within 30 days can trigger suspension.
  - 3 no-shows within 30 days can trigger suspension.
- Suspended users are blocked from creating new bookings.

### 3. Caretaker Functionality for Sports Facilities

- Caretakers can view booking records for monitoring and ground operations.
- Caretakers can verify whether a student has a valid booking by cross-referencing:
  - booking ID
  - slot ID
  - facility ID
  - user ID / email / roll number
- Caretakers can check in a booking holder using booking QR validation.
- Check-in is only allowed from slot start time up to 15 minutes after start.
- Caretakers can manually mark attendees as:
  - present
  - absent
- Marking a user absent creates a no-show penalty.
- Caretakers/admins can release a slot and mark the booking cancelled with a reason when required.

### 4. Gym and Swimming Subscription Backend

- Students/faculty can apply for Gym or Swimming Pool subscriptions.
- Supported plans:
  - Monthly
  - Semesterly
  - Yearly
- Applications require:
  - medical certificate upload
  - payment receipt upload
- Duplicate pending/approved applications for the same facility type are blocked.
- Approved subscriptions receive:
  - start date
  - end date
  - unique pass ID
  - generated QR code / digital pass
- Subscription expiry is tracked by scheduled jobs.

### 5. Gym/Swim Admin Functionality

- Admins can review submitted applications.
- Review actions support:
  - approve
  - reject
- Review comments are stored with the decision.
- Gym/swim-specific admin roles are scoped correctly:
  - `gym_admin` can act on Gym subscriptions
  - `swim_admin` can act on Swimming Pool subscriptions
- Admin listing includes occupancy summaries for operational visibility.

### 6. QR Verification and Entry/Exit Logging

- Gym/Swim access can be verified using pass ID or QR payload.
- Valid scans check:
  - subscription exists
  - status is approved
  - start date has begun
  - subscription has not expired
- Successful scans log access actions.
- Entry/exit is tracked automatically:
  - if the last action was `entry`, the next scan becomes `exit`
  - otherwise the next scan becomes `entry`
- Occupancy summaries are calculated from access logs.
- Available slot count updates dynamically from:
  - total facility capacity
  - active entries not yet exited

### 7. Event Calendar Backend

- Users can view approved events.
- Authorized users can submit event proposals.
- Executives/admin flows support:
  - pending event review
  - approval
  - rejection
  - change requests
- Events support standard metadata such as:
  - title
  - description
  - category
  - time range
  - venue
  - organizing club
  - registration link
- Approved events can integrate with venue/facility reservation flow.

### 8. Automation and Scheduled Jobs

- Group expiry job:
  - auto-cancels unfilled group bookings close to start time
- No-show job:
  - marks unattended confirmed bookings as `NoShow`
  - creates penalty records
- Subscription expiry job:
  - expires subscriptions when validity ends
- Slot generation job:
  - supports forward slot creation for facilities

## Roles Covered in This PR

### Student / Faculty

- View facilities
- Book sports slots
- Join group bookings
- Cancel bookings with reason
- Apply for gym/swim subscriptions
- View their subscriptions
- View their penalties
- View events

### Caretaker

- View sports bookings
- Verify valid booking by cross-reference
- Check in booking holders by QR
- Mark present/absent
- Trigger no-show outcomes
- Release cancelled slots
- Verify gym/swim entry scans
- View occupancy for gym/swim facilities

### Gym Admin / Swim Admin

- Review subscription applications for their assigned facility type
- Approve or reject with comments
- Verify subscription scans
- View current occupancy / available capacity

### Admin / Executive

- Review subscriptions
- Review events
- Access wider operational visibility across modules

## API Areas Updated

- `/api/v2/facilities`
- `/api/v2/bookings`
- `/api/v2/subscriptions`
- `/api/v2/admin/subscriptions`
- `/api/v2/events`
- `/api/v2/admin/events`
- `/api/v2/penalties`

Notable caretaker/admin additions include:

- `GET /api/v2/bookings/caretaker`
- `POST /api/v2/bookings/verify-attendee`
- `PATCH /api/v2/bookings/:bookingId/attendance`
- `PATCH /api/v2/bookings/:bookingId/release`
- `POST /api/v2/subscriptions/verify-entry`
- `GET /api/v2/admin/subscriptions/occupancy`

## Data/Model Enhancements

- Booking support for:
  - attendance tracking
  - cancellation reason tracking
  - late cancellation/no-show states
- Subscription support for:
  - review comments
  - QR pass generation
  - approval metadata
- Access log support for:
  - gym/swim entry-exit logging
  - occupancy calculation

## Behavioral Guarantees Preserved

- Existing sports booking flows remain intact.
- Existing gym registration/subscription flows remain intact.
- Penalty automation remains active.
- Role-based authorization remains enforced.
- The new caretaker/admin functionality extends the existing backend rather than replacing it.

## Verification Completed

- Syntax checks passed for the modified backend files.
- Dependency install completed using `pnpm`.
- Application import/boot verification passed successfully for the Express app.

## Notes

- This PR is backend-focused.
- No dedicated automated test suite was present in `backend/package.json`, so validation was done through code-path verification and runtime import checks.
