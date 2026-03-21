# Backend Implementation Overview

This document provides a detailed overview of the backend implementation for the student/faculty user portal, the coordinator portal, the feedback system, and the underlying data models.

## 1. Architecture & Tech Stack

The backend is built using:
- **Node.js & Express.js (v5)**: The core web framework. Express handles routing, middleware execution, and HTTP requests/responses.
- **MongoDB & Mongoose (v9)**: The NoSQL database and Object Data Modeling (ODM) library used for data persistence.
- **JWT (JSON Web Tokens)**: Used for stateless authentication.
- **Multer**: Middleware for handling `multipart/form-data`, specifically used for file uploads (e.g., medical certificates, event posters).
- **Nodemailer**: Used for sending OTP emails during registration and password resets.

## 2. Core Concepts

### 2.1 Authentication & Authorization
Authentication is token-based. The `protectRoute` middleware intercepts incoming requests, verifies the JWT in the `Authorization: Bearer <token>` header, and populates `req.user` with the authenticated user's details.

Authorization is role-based. The `authorizeRoles(...roles)` middleware restricts access to specific endpoints based on the authenticated user's assigned roles.

**Roles defined in User schema**:
`student`, `faculty`, `caretaker`, `coach`, `executive`, `admin`, `coordinator`, `gym_admin`, `swim_admin`

### 2.2 Standardized Responses
API responses are standardized using utility functions in `src/utils/apiResponse.js`:
- `successResponse(res, statusCode, data, message)`
- `errorResponse(res, statusCode, errorCode, errorMessage, details)`

### 2.3 The "V1" vs "V2" Challenge
The codebase contains a mix of "V1" and "V2" models/controllers. V1 represents the initial implementation, while V2 (`*V2.js` controllers, `Booking` vs `SportsBooking` models) was introduced later to comply with a newer, more rigorous API specification (especially regarding group bookings and QR passes).
**The current implementation gracefully handles both**: High-level aggregated endpoints (like Dashboard and History) query both V1 and V2 models, normalize the data into a consistent format, and return a unified view to the frontend.

---

## 3. Implemented Features & Modules

### 3.1 Authentication Module (`authController.js`)
Handles all user identity operations.
- **POST `/api/auth/register`**: Creates an unverified user and sends an OTP to their IITK email.
- **POST `/api/auth/verify-otp`**: Verifies the OTP and activates the account, returning a JWT.
- **POST `/api/auth/login`**: Authenticates email/password and returns a JWT.
- **POST `/api/auth/forgot-password` & `/reset-password`**: OTP-based password recovery flow.

### 3.2 User Portal
The user portal is designed around aggregated data endpoints. Instead of the frontend making dozens of API calls, a single GET request fetches all data needed to render an entire page.

#### A. Dashboard (`dashboardController.js`)
**GET `/api/dashboard`**
The primary landing page. Runs 8 parallel database queries to fetch:
1. Active subscriptions (Gym/Swimming) with QR pass details.
2. Upcoming sports facility bookings (merges V1 & V2 bookings).
3. Recent gym/pool access logs (check-ins/check-outs).
4. Active penalties (no-shows, late cancellations).
5. Upcoming approved campus events.
6. A derived **Fair-Use Score** calculated based on booking activity in the last 72 hours and active penalties.

#### B. Slot Booking (`slotBookingController.js`)
Handles the discovery and registration for facilities.

**GET `/api/slot-booking/sports`**:
- Fetches available facilities based on the selected `sportType`.
- Retrieves slot templates mapped against existing bookings to calculate **real-time capacity (`spotsLeft`)**.
- Determines slot status (Available, Fully Booked, Group Open).

**GET `/api/slot-booking/gym` & `/api/slot-booking/swimming`**:
- Reuses the `SubscriptionPlan` model to show available pricing tiers.
- Fetches real-time occupancy using the `accessService` (current check-ins).
- Shows the user's active subscription status if they are already registered.

#### C. History Page (`historyController.js`)
Provides historical data across three tabs with pagination (`page`, `limit`):

**GET `/api/history/sports`**:
- Merges past V1 and V2 bookings.
- Calculates monthly attended vs. missed statistics.

**GET `/api/history/gym-swimming`**:
- Lists paginated access logs (entries/exits).
- Shows the user's historical log of subscription plans.

**GET `/api/history/penalties`**:
- Lists all active and past penalties.
- Calculates suspension consequences (e.g., "7 Day Ban") based on the `suspendedUntil` date.

#### D. Calendar (`calendarController.js`)
**GET `/api/calendar`**
- Outputs all approved campus events for the requested month, grouped by date (e.g., `{"2026-03-21": [...]}`).
- Calculates category breakdowns (e.g., 5 Cultural, 2 Technical).
- Overlays the user's personal sports bookings onto the calendar.

#### E. Settings & Profile (`settingsController.js`)
- **GET `/api/settings`**: Full profile details, subscription summary, account standing.
- **GET `/api/settings/profile-card`**: A fast, cache-friendly endpoint providing minimal data (name, email, role, fair-use tier) for the top-right avatar dropdown.
- **PATCH `/api/settings/profile`**: Updates editable fields (name, program, department).
- **PATCH `/api/settings/password`**: Securely changes the user's password requiring the current password.

---

### 3.3 Coordinator Portal (`coordinatorController.js`)
A restricted area for users with `coordinator`, `executive`, or `admin` roles.

**GET & POST `/api/coordinator/events`**:
- Allows coordinators to submit new campus events.
- Includes `posterUpload` middleware (Multer) for image handling.
- Submissions create an `Event` document with status `Pending`. They do not go live until an executive approves them.

**GET & POST `/api/coordinator/venues`**:
- Allows booking non-sports venues (e.g., Senate Hall, Auditorium).
- The GET endpoint calculates availability by fetching all `FacilityBlock` records for the selected date.
- The POST endpoint validates requests (preventing time overlaps) and creates a `FacilityBlock` with status `pending`. This request is routed to executives for approval.

---

### 3.4 Feedback System (`feedbackController.js`)
A bidirectional communication channel.

**User Facing**:
- **POST `/api/feedback`**: Users can submit feedback targeted at specific roles (e.g., `caretaker`, `gym_admin`). Supports an `isAnonymous` flag.
- **GET `/api/feedback`**: Users can view the status of their submitted feedback.

**Staff Facing (Inbox)**:
- **GET `/api/feedback/inbox`**: Staff members view feedback addressed to their assigned role. Anonymous submissions have user details completely stripped out at the API level.
- **PATCH `/api/feedback/:id/reply`**: Allows authorized staff to change the status (e.g., `acknowledged`, `resolved`) and post an `adminReply`.

---

## 4. Key Data Models

Below are the primary collections managing system state:

### Users & Access
- **`User`**: Core identity, roles, and profile metadata. Passwords are bcrypt-hashed.
- **`Penalty`**: Issued for no-shows or misuse. An active penalty with a `suspendedUntil` date will block the user from making new bookings.
- **`AccessLog`**: Simple ledger of when users scanned their pass to enter/exit a facility.

### Bookings & Facilities
- **`Facility`**: Defines physical locations (courts, gym, pools, venues), capacities, and operational status.
- **`SportsSlot` & `TimeSlot`**: Define the operating hours/chunks a facility can be booked in.
- **`SportsBooking` (V2) & `Booking` (V1)**: Records of a user reserving a time block at a facility. Includes attendance status.
- **`FacilityBlock`**: High-level reservations (e.g., venue bookings by coordinators or facility closures for maintenance). Includes an approval workflow (requestedBy, approvedBy, status).

### Gym & Pool Subscriptions
- **`SubscriptionPlan`**: The pricing and duration tiers available.
- **`SubscriptionV2`**: A user's purchased plan. Holds the status (`Pending`, `Approved`), start/end dates, and uniquely identifies the generated pass (`passId`, `qrCode`).

### Events & Feedback
- **`Event`**: Details about campus activities organized by clubs. Includes lifecycle statuses (`Pending`, `Approved`, `Rejected`, `ChangesRequested`).
- **`Feedback`**: User-submitted communications targeted at specific operational roles, supporting anonymity and staff replies.
