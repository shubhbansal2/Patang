# Patang Test Inventory

This file documents what every current automated test file covers across the backend and frontend.

## Backend

### `/Users/aarya/repo_main/backend/src/controllers/authController.test.js`
- Valid login for a verified user.
- Invalid credential rejection.
- Registration success path.
- Registration duplicate or invalid-flow handling.
- Forgot-password initiation behavior.
- Reset and verification-related auth outcomes.

### `/Users/aarya/repo_main/backend/src/controllers/bookingController.test.js`
- Updating a sports booking with a new participant count.
- Rejecting updates that exceed slot capacity.
- Rejecting booking modification by a different non-admin user.
- Slot availability calculations using participant-aware occupancy.
- Facility-block overlap handling for slot availability.
- Validation when `slotId` or `bookingDate` is missing.
- Caretaker booking list scoped to assigned facilities.
- Caretaker attendee verification success path.
- Caretaker attendee verification invalid-identifier path.

### `/Users/aarya/repo_main/backend/src/controllers/bookingControllerV2.test.js`
- Legacy booking creation success path.
- Fair-use quota rejection for a booking request.
- Group booking join flow and transition to confirmed state.
- Late cancellation penalty behavior.
- QR check-in success inside the valid booking window.

### `/Users/aarya/repo_main/backend/src/controllers/dashboardController.test.js`
- Unauthorized dashboard access.
- Successful dashboard aggregation payload for an authenticated user.

### `/Users/aarya/repo_main/backend/src/controllers/slotBookingController.test.js`
- Fallback from stale or past requested dates to the current valid IST bookable date.
- Inclusion of active upcoming sports bookings in the booking activity feed.

### `/Users/aarya/repo_main/backend/src/controllers/subscriptionControllerV2.test.js`
- Successful subscription application creation.
- Duplicate active or pending subscription rejection.
- Invalid protected document type rejection.
- Forbidden access to another user's protected subscription documents.
- Admin approval flow with pass generation and QR issuance.
- Entry verification when the next action is inferred from the latest access log.
- Entry verification rejection when the pass is outside facility operating hours.
- Occupancy summary fetch behavior.
- Scoped admin restrictions and related invalid paths around document or review access.

### `/Users/aarya/repo_main/backend/src/routes/subscriptionAdminRoutes.integration.test.js`
- Route-level authorization for admin subscription review endpoints.
- Validation rejection before controller execution for malformed admin actions.
- Listing scoped pending subscriptions plus occupancy through the real route stack.
- Approving a pending subscription through the real admin route.

### `/Users/aarya/repo_main/backend/src/routes/subscriptionRoutesV2.integration.test.js`
- Unauthenticated subscription application rejection.
- Multipart validation when required uploaded files are missing.
- Duplicate active subscription conflict through the real route stack.
- Successful multipart subscription application through upload, validation, and controller layers.

### `/Users/aarya/repo_main/backend/src/services/accessService.test.js`
- Subscription-type normalization helpers.
- Role-based scoped subscription type calculation.
- QR scan payload parsing from direct, object, JSON-string, raw-string, and null inputs.
- Occupancy summary behavior with and without an active facility capacity record.
- Latest access action lookup behavior.
- Access-log creation behavior.

### `/Users/aarya/repo_main/backend/src/services/bookingService.test.js`
- Fair-use quota counting across both legacy bookings and current sports bookings.

## Frontend

### `/Users/aarya/repo_main/frontend/src/pages/DashboardPage.test.jsx`
- Rendering multiple subscriptions, bookings, and upcoming events.
- Empty-state rendering for missing subscriptions and bookings.
- Booking cancellation flow and success confirmation.
- Booking modification flow, including participant-count updates.
- QR expansion modal behavior from the student dashboard.

### `/Users/aarya/repo_main/frontend/src/pages/caretaker/SportsCaretakerPage.test.jsx`
- Rendering caretaker booking data for sports attendance verification.
- Caretaker attendance actions and booking verification UI behavior.

### `/Users/aarya/repo_main/frontend/src/pages/gym-admin/GymAdminDashboardPage.test.jsx`
- Rendering pending gym requests.
- Rendering live occupancy from backend field names `occupiedSlots` and `totalSlots`.
- Rendering slot-level occupancy information.
- Empty-state handling when there are no pending requests.

### `/Users/aarya/repo_main/frontend/src/pages/slot-booking/GymRegistrationView.test.jsx`
- Required-file validation for gym registration.
- Successful gym registration submission with uploaded documents.
- Locked-state behavior when an existing subscription already exists.

### `/Users/aarya/repo_main/frontend/src/pages/slot-booking/SportsBookingView.test.jsx`
- Standard sports booking submission.
- Group sports booking submission.
- Custom player-count submission behavior.
- Fair-use blocking behavior.
- Expired slot handling as unavailable.
- Booking activity feed rendering for upcoming bookings.

### `/Users/aarya/repo_main/frontend/src/pages/slot-booking/SwimmingRegistrationView.test.jsx`
- Swimming registration page copy and occupancy snapshot rendering.
- Successful swimming registration submission with uploaded documents.

### `/Users/aarya/repo_main/frontend/src/pages/slot-booking/api.test.js`
- Slot-booking API response unwrapping.
- Error-message extraction.
- Plan normalization helpers.
- Sports booking fetch request payloads.
- Sports booking creation payloads, including participant count.
- Gym and swimming registration request wiring.

### `/Users/aarya/repo_main/frontend/src/pages/slot-booking/utils.test.js`
- Date formatting helpers.
- Slot time-range formatting.
- Currency and plan-duration formatting helpers.
- Status tone and slot-bookability helper logic.

### `/Users/aarya/repo_main/frontend/src/pages/swim-admin/SwimAdminDashboardPage.test.jsx`
- Rendering swimming requests with correct facility filtering.
- Rendering live occupancy from backend field names.
- Error-state rendering when dashboard loading fails.

### `/Users/aarya/repo_main/frontend/src/services/api.test.js`
- Shared API client behavior for `FormData` uploads, especially removal of forced JSON content type and preservation of auth behavior.

## Current Totals

- Backend: 10 test files, 48 passing tests.
- Frontend: 10 test files, 32 passing tests.
- Overall: 20 test files, 80 passing tests.
