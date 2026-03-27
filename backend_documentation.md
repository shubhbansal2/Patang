# Backend Documentation

This document is the consolidated and updated backend reference for Patang. It replaces the older split between the general backend document and the sports/facilities/calendar implementation note.

Related docs:
- Local setup and test users: [LOCAL_SETUP_AND_TEST_USERS.md](/Users/aarya/repo_main/LOCAL_SETUP_AND_TEST_USERS.md)
- Test inventory: [TEST_INVENTORY.md](/Users/aarya/repo_main/TEST_INVENTORY.md)

## 1. Stack and Architecture

- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT-based auth with role-based authorization middleware
- File handling: Multer for multipart uploads
- Email flows: OTP and reset email support
- Scheduling: `node-cron` jobs for slot generation, group expiry, no-show marking, and subscription expiry
- Package manager: `pnpm`

The backend currently mixes legacy flows and newer V2 flows. Both still exist in the repo, and some aggregated endpoints normalize data from both models for the frontend.

## 2. Core Backend Concepts

### 2.1 Authentication and Authorization

- `protectRoute` authenticates the request and populates `req.user`.
- `authorizeRoles(...roles)` restricts route access by role.

Current role surface in the backend includes:
- `student`
- `faculty`
- `caretaker`
- `coach`
- `executive`
- `admin`
- `coordinator`
- `captain`
- `gym_admin`
- `swim_admin`

### 2.2 Response Shape

The backend uses standardized success and error helpers from `src/utils/apiResponse.js`, especially in the newer controllers.

### 2.3 Legacy vs V2 Flows

There are two main booking/subscription generations in the codebase:

- Legacy:
  - `Booking`
  - `TimeSlot`
  - `Subscription`
  - `SubscriptionPlan`
- V2 / newer:
  - `SportsBooking`
  - `SportsSlot`
  - `SubscriptionV2`

The frontend uses both, depending on the page and feature. Dashboard/history aggregation also merges multiple sources where needed.

## 3. Application Entry and Mounted Route Groups

The main backend entry is [backend/src/app.js](/Users/aarya/repo_main/backend/src/app.js).

Mounted route groups:

- `/api/auth`
- `/api/facilities`
- `/api/bookings`
- `/api/subscriptions`
- `/api/v2/facilities`
- `/api/v2/bookings`
- `/api/v2/subscriptions`
- `/api/v2/admin/subscriptions`
- `/api/v2/events`
- `/api/v2/admin/events`
- `/api/v2/penalties`
- `/api/dashboard`
- `/api/slot-booking`
- `/api/history`
- `/api/calendar`
- `/api/settings`
- `/api/coordinator`
- `/api/feedback`
- `/api/executive`
- `/api/captain`
- `/api/executive/captain`
- `/api/notifications`

The app also serves `/uploads`, though new subscription documents are now stored through the cloud-backed document storage flow rather than simple local disk paths.

## 4. Main Functional Modules

### 4.1 Authentication

Route file: [backend/src/routes/authRoutes.js](/Users/aarya/repo_main/backend/src/routes/authRoutes.js)

Implemented flows:
- register user
- verify OTP
- login
- logout
- forgot password
- reset password
- authenticated password update

Purpose:
- handles account creation, verification, session token issuance, and password lifecycle.

### 4.2 Student and Faculty Dashboard

Route file: [backend/src/routes/dashboardRoutes.js](/Users/aarya/repo_main/backend/src/routes/dashboardRoutes.js)

Controller:
- [backend/src/controllers/dashboardController.js](/Users/aarya/repo_main/backend/src/controllers/dashboardController.js)

Implemented behavior:
- aggregates subscriptions
- aggregates upcoming facility bookings
- returns access logs
- returns penalties
- returns events
- computes fair-use related dashboard metrics

Purpose:
- powers the main student/faculty dashboard in a single payload.

### 4.3 Sports Slot Booking and Registration Discovery

Route file: [backend/src/routes/slotBookingRoutes.js](/Users/aarya/repo_main/backend/src/routes/slotBookingRoutes.js)

Controller:
- [backend/src/controllers/slotBookingController.js](/Users/aarya/repo_main/backend/src/controllers/slotBookingController.js)

Implemented pages/data APIs:
- `GET /api/slot-booking/sports`
- `GET /api/slot-booking/gym`
- `GET /api/slot-booking/swimming`

Implemented behavior:
- sports facility browsing by sport type
- bookable-date generation
- stale/past date normalization
- expired-slot handling
- participant-aware slot capacity calculation
- recent and upcoming booking activity feed
- gym and swimming registration page payloads
- occupancy snapshot for subscription-based facilities

Purpose:
- supplies the student slot-booking page for sports and the gym/swimming registration views.

### 4.4 Sports Bookings, Caretaker Attendance, and Modification

Route file: [backend/src/routes/bookingRoutes.js](/Users/aarya/repo_main/backend/src/routes/bookingRoutes.js)

Controller:
- [backend/src/controllers/bookingController.js](/Users/aarya/repo_main/backend/src/controllers/bookingController.js)

Implemented endpoints:
- availability check
- create sports booking
- list my bookings
- caretaker booking list
- caretaker attendee verification by identifier
- update booking participant count
- cancel booking
- mark attendance

Implemented behavior:
- participant-aware remaining capacity
- facility block overlap checks
- caretaker-scoped booking visibility
- absent/present attendance marking
- slot release on absence/cancellation paths
- modification access control

Purpose:
- supports the newer sports booking UX and the sports caretaker console.

### 4.5 Legacy V2 Booking Lifecycle

Route file: [backend/src/routes/bookingRoutesV2.js](/Users/aarya/repo_main/backend/src/routes/bookingRoutesV2.js)

Controller:
- [backend/src/controllers/bookingControllerV2.js](/Users/aarya/repo_main/backend/src/controllers/bookingControllerV2.js)

Implemented behavior:
- legacy booking creation
- group booking join flow
- caretaker verification by identifier
- check-in with QR token
- explicit release endpoint
- attendance updates
- late cancellation penalty flow

Purpose:
- retains the older spec-compliant booking engine and associated caretaker workflows.

### 4.6 Facility Management

Route files:
- [backend/src/routes/facilityRoutes.js](/Users/aarya/repo_main/backend/src/routes/facilityRoutes.js)
- [backend/src/routes/facilityRoutesV2.js](/Users/aarya/repo_main/backend/src/routes/facilityRoutesV2.js)

Controllers:
- [backend/src/controllers/facilityController.js](/Users/aarya/repo_main/backend/src/controllers/facilityController.js)
- [backend/src/controllers/facilityControllerV2.js](/Users/aarya/repo_main/backend/src/controllers/facilityControllerV2.js)

Implemented behavior:
- list facilities
- create facilities
- create sports slots
- fetch facility slots
- update slot capacity
- create facility blocks
- availability endpoint for V2 facilities

Purpose:
- manages the core physical inventory: courts, gym, swimming pool, venues, and operational blocks.

### 4.7 Gym and Swimming Subscriptions

Route files:
- [backend/src/routes/subscriptionRoutes.js](/Users/aarya/repo_main/backend/src/routes/subscriptionRoutes.js)
- [backend/src/routes/subscriptionRoutesV2.js](/Users/aarya/repo_main/backend/src/routes/subscriptionRoutesV2.js)
- [backend/src/routes/subscriptionAdminRoutes.js](/Users/aarya/repo_main/backend/src/routes/subscriptionAdminRoutes.js)

Controllers:
- [backend/src/controllers/subscriptionController.js](/Users/aarya/repo_main/backend/src/controllers/subscriptionController.js)
- [backend/src/controllers/subscriptionControllerV2.js](/Users/aarya/repo_main/backend/src/controllers/subscriptionControllerV2.js)

Implemented student-side behavior:
- fetch plans
- apply for gym/swimming subscription
- upload medical certificate and payment receipt
- view my subscriptions
- view protected uploaded documents through authorized routes

Implemented admin-side behavior:
- list pending applications
- approve or reject applications
- generate pass IDs and QR codes on approval
- compute occupancy summaries
- compute per-slot occupancy for admin dashboards
- verify entry using pass data
- restrict scans to allowed facility operating hours

Important current implementation note:
- gym and swimming registration are pass-based, not user-slot-assigned.
- users do not need to choose a subscription time slot during registration.
- admins can scan valid passes only during active facility slot windows.

### 4.8 Cloud-backed Subscription Document Storage

Key files:
- [backend/src/services/fileStorageService.js](/Users/aarya/repo_main/backend/src/services/fileStorageService.js)
- [backend/src/controllers/subscriptionControllerV2.js](/Users/aarya/repo_main/backend/src/controllers/subscriptionControllerV2.js)

Implemented behavior:
- incoming medical certificate and payment receipt uploads are stored through the backend document storage layer
- `SubscriptionV2` stores protected document references and file IDs
- documents are exposed through authorized streaming routes instead of public raw upload URLs for new submissions

Purpose:
- keeps subscription documents associated with the user and accessible to authorized reviewers.

### 4.9 Penalties and Fair Use

Route file:
- [backend/src/routes/penaltyRoutes.js](/Users/aarya/repo_main/backend/src/routes/penaltyRoutes.js)

Controllers/services:
- [backend/src/controllers/penaltyController.js](/Users/aarya/repo_main/backend/src/controllers/penaltyController.js)
- [backend/src/services/bookingService.js](/Users/aarya/repo_main/backend/src/services/bookingService.js)
- [backend/src/services/penaltyService.js](/Users/aarya/repo_main/backend/src/services/penaltyService.js)

Implemented behavior:
- view my penalties
- rolling booking quota checks
- late cancellation penalties
- no-show penalties
- booking suspension support via penalty state

Purpose:
- enforces fair use and misuse consequences for sports bookings.

### 4.10 History

Route file:
- [backend/src/routes/historyRoutes.js](/Users/aarya/repo_main/backend/src/routes/historyRoutes.js)

Controller:
- [backend/src/controllers/historyController.js](/Users/aarya/repo_main/backend/src/controllers/historyController.js)

Implemented behavior:
- sports booking history
- gym/swimming access and subscription history
- penalties history
- filtering and pagination support

Purpose:
- powers the user-facing historical records pages.

### 4.11 Calendar and Events

Route files:
- [backend/src/routes/calendarRoutes.js](/Users/aarya/repo_main/backend/src/routes/calendarRoutes.js)
- [backend/src/routes/eventRoutes.js](/Users/aarya/repo_main/backend/src/routes/eventRoutes.js)
- [backend/src/routes/eventAdminRoutes.js](/Users/aarya/repo_main/backend/src/routes/eventAdminRoutes.js)

Controllers:
- [backend/src/controllers/calendarController.js](/Users/aarya/repo_main/backend/src/controllers/calendarController.js)
- [backend/src/controllers/eventController.js](/Users/aarya/repo_main/backend/src/controllers/eventController.js)
- [backend/src/controllers/eventAdminController.js](/Users/aarya/repo_main/backend/src/controllers/eventAdminController.js)

Implemented behavior:
- public authenticated approved-events feed
- user event listing
- event creation
- event update
- event cancellation
- executive/admin moderation of pending events
- calendar month view aggregation
- category and time-based calendar shaping
- overlay of user-relevant activities

Purpose:
- supports the unified campus calendar and club-event lifecycle.

### 4.12 Coordinator Portal

Route file:
- [backend/src/routes/coordinatorRoutes.js](/Users/aarya/repo_main/backend/src/routes/coordinatorRoutes.js)

Controller:
- [backend/src/controllers/coordinatorController.js](/Users/aarya/repo_main/backend/src/controllers/coordinatorController.js)

Implemented behavior:
- coordinator event-management page data
- coordinator event submission with poster upload
- venue booking page data
- venue booking request submission

Purpose:
- allows coordinators to create event proposals and request venue reservations.

### 4.13 Feedback

Route file:
- [backend/src/routes/feedbackRoutes.js](/Users/aarya/repo_main/backend/src/routes/feedbackRoutes.js)

Controller:
- [backend/src/controllers/feedbackController.js](/Users/aarya/repo_main/backend/src/controllers/feedbackController.js)

Implemented behavior:
- fetch feedback page data
- submit feedback
- feedback inbox for staff/admin-side roles
- reply and status update flow

Supported reviewer roles:
- coordinator
- caretaker
- executive
- admin
- gym_admin
- swim_admin

Purpose:
- provides a two-sided feedback and reply channel between users and operational staff.

### 4.14 Settings and Profile

Route file:
- [backend/src/routes/settingsRoutes.js](/Users/aarya/repo_main/backend/src/routes/settingsRoutes.js)

Controller:
- [backend/src/controllers/settingsController.js](/Users/aarya/repo_main/backend/src/controllers/settingsController.js)

Implemented behavior:
- full settings page payload
- lightweight profile-card endpoint
- profile update
- password change

Purpose:
- backs the account/profile area used across the frontend shell.

### 4.15 Executive Administration

Route file:
- [backend/src/routes/executiveRoutes.js](/Users/aarya/repo_main/backend/src/routes/executiveRoutes.js)

Controllers:
- [backend/src/controllers/executiveController.js](/Users/aarya/repo_main/backend/src/controllers/executiveController.js)
- [backend/src/controllers/executiveVenueController.js](/Users/aarya/repo_main/backend/src/controllers/executiveVenueController.js)

Implemented behavior:
- executive dashboard
- pending venue review
- venue approval/rejection
- analytics overview
- booking analytics
- subscription analytics
- user listing and user detail
- role updates
- penalty listing and penalty update
- facility admin listing and facility update
- audit log

Current access note:
- `executive`, `admin`, `gym_admin`, and `swim_admin` can access this route group in the backend.

Purpose:
- central administrative layer for operations, moderation, and analytics.

### 4.16 Captain Workflows

Route files:
- [backend/src/routes/captainRoutes.js](/Users/aarya/repo_main/backend/src/routes/captainRoutes.js)
- [backend/src/routes/captainAdminRoutes.js](/Users/aarya/repo_main/backend/src/routes/captainAdminRoutes.js)

Controllers:
- [backend/src/controllers/captainController.js](/Users/aarya/repo_main/backend/src/controllers/captainController.js)
- [backend/src/controllers/captainAdminController.js](/Users/aarya/repo_main/backend/src/controllers/captainAdminController.js)

Implemented behavior:
- captains can create practice block requests
- captains can view, edit, and cancel their practice blocks
- executives/admins can list captains
- executives/admins can appoint or dismiss captains
- executives/admins can review pending practice blocks

Purpose:
- supports team practice-block scheduling and captain administration.

### 4.17 Notifications

Route file:
- [backend/src/routes/notificationRoutes.js](/Users/aarya/repo_main/backend/src/routes/notificationRoutes.js)

Controller:
- [backend/src/controllers/notificationController.js](/Users/aarya/repo_main/backend/src/controllers/notificationController.js)

Implemented behavior:
- list my notifications
- mark one as read
- mark all as read

The backend also creates notifications from booking and subscription workflows where applicable.

## 5. Main Data Models

Core models in [backend/src/models](/Users/aarya/repo_main/backend/src/models):

### Identity and Access
- `User`: authentication, roles, and profile details
- `Notification`: user notification records
- `AccessLog`: facility entry/exit logs
- `AccessPass`: legacy access-pass support
- `AuditLog`: administrative audit trail

### Facilities and Booking
- `Facility`: facility metadata and operational flags
- `SportsSlot`: current slot model for sports and facility-hour windows
- `TimeSlot`: legacy slot model
- `SportsBooking`: current sports booking model
- `Booking`: legacy booking model
- `FacilityBlock`: venue/facility reservations, closures, and reviewable blocks
- `TeamPracticeBlock`: captain practice requests

### Subscription
- `SubscriptionPlan`: legacy subscription plan model
- `Subscription`: legacy subscription request/pass model
- `SubscriptionV2`: current pass-based gym/swimming subscription model

### Operational Modules
- `Penalty`: no-show, late cancellation, and related punishments
- `Event`: event lifecycle and moderation model
- `Feedback`: feedback and staff reply model

## 6. Current Business Rules Reflected in Code

### Sports Booking
- booking availability is capacity-aware
- participant count affects remaining capacity
- expired slots are treated as unavailable
- past or stale requested dates are normalized/rejected
- facility blocks can make slots unavailable
- active booking quotas are enforced across a rolling window

### Caretaker Attendance
- caretakers can see upcoming assigned bookings
- verification can be done by roll number or email
- absence can release a slot back into circulation

### Gym and Swimming
- users apply with documents, not a chosen slot
- pass approval issues QR and validity metadata
- QR verification is allowed only during valid facility operating hours
- occupancy derives from facility plus access-log data

### Event and Venue Workflow
- coordinators submit
- executives/admins review
- approved items surface to the calendar and related dashboards

## 7. Scheduled Jobs

Job files:
- [backend/src/jobs/groupExpiryJob.js](/Users/aarya/repo_main/backend/src/jobs/groupExpiryJob.js)
- [backend/src/jobs/noShowJob.js](/Users/aarya/repo_main/backend/src/jobs/noShowJob.js)
- [backend/src/jobs/slotGenerationJob.js](/Users/aarya/repo_main/backend/src/jobs/slotGenerationJob.js)
- [backend/src/jobs/subscriptionExpiryJob.js](/Users/aarya/repo_main/backend/src/jobs/subscriptionExpiryJob.js)

Implemented jobs:
- group expiry: auto-cancels unfilled group bookings near slot start
- no-show job: marks unattended legacy bookings and applies penalties
- slot generation: generates future slots for active facilities
- subscription expiry: expires approved subscriptions whose end date has passed

## 8. Validation and Upload Middleware

Key files:
- [backend/src/middlewares/validate.js](/Users/aarya/repo_main/backend/src/middlewares/validate.js)
- [backend/src/middlewares/upload.js](/Users/aarya/repo_main/backend/src/middlewares/upload.js)

Implemented validation areas:
- booking request validation
- subscription apply validation
- event create/update validation
- admin event action validation
- subscription admin action validation

Implemented upload areas:
- subscription documents
- event poster upload
- upload size/type checks

## 9. Testing Coverage

The backend now includes both unit and route-level integration coverage.

Current tested areas include:
- auth controller
- dashboard controller
- booking controller
- booking controller V2
- slot booking controller
- subscription controller V2
- access service
- booking service
- subscription route integration
- subscription admin route integration

See:
- [TEST_INVENTORY.md](/Users/aarya/repo_main/TEST_INVENTORY.md)

## 10. Notes on Documentation Consolidation

This file now subsumes the older sports/facilities/calendar backend note. The sports, facilities, subscription, calendar, events, coordinator, caretaker, and admin workflows are all documented here so the repo has a single backend reference point.
