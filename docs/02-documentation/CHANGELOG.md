# Changelog - Cantik AI

## [2026-03-27] - Admin Dashboard Fix + Doctor Consultation Feature

### Fixed - Admin Dashboard
- **Admin Login Error**: Fixed `ReferenceError: isAllowedOrigin is not defined`
  - Added `isAllowedOrigin()` function with `ADMIN_ALLOWED_ORIGINS` Set
  - Includes localhost origins: 5173, 3000, 8080 (both localhost and 127.0.0.1)
  - Admin login now works correctly from browser
- **Admin Features Verified**:
  - Users Management ✓
  - Analyses Management ✓
  - Products Management ✓
  - Articles Management ✓
  - Banners Management ✓
  - Chat Sessions Management ✓
  - Kiosk Sessions Management ✓
  - Design System Management ✓
  - Database Management ✓
  - Settings Management ✓

### Added - Doctor Consultation System

### Added
- **Doctor Consultation System**
  - 3 database tables: `doctors`, `doctor_appointments`, `doctor_reviews`
  - 7 API endpoints for doctor management
  - 6 sample doctors with realistic data
  - Frontend pages: Doctors list, Doctor detail, Booking
  - Appointment tracking in Profile page
  - **Online consultation methods**: Video Call, Telepon, Chat

### Changed
- **Menu Structure (Home Page)**
  - "Rekomendasi" → `/recommendations` (AI product recommendations)
  - "Konsultasi" → `/doctors` (Doctor consultation)
  - **Icon updated**: Video icon for Konsultasi (was MessageCircle)
- **Bottom Nav**
  - "Chat" → `/chat` (AI chat for skincare Q&A)
- **UI Improvements**
  - Modern doctor cards with gradient backgrounds
  - Consultation method badges (Video Call, Telepon)
  - Enhanced color palette using cantik.ai theme
  - Better visual hierarchy and spacing

### Fixed
- `doctor.rating.toFixed is not a function` → Use `Number(rating).toFixed(1)`
- SQL column mapping: `specialization` → `specialty`
- Reviews query: Use `COALESCE(u.name, u.email)` instead of `u.username`
- JSON parsing for schedule field with try-catch

### Files Created
- `platforms/pwa/src/services/doctorApi.js`
- `platforms/pwa/src/pages/Doctors.jsx`
- `platforms/pwa/src/pages/DoctorDetail.jsx`
- `platforms/pwa/src/pages/DoctorBooking.jsx`

### Files Modified
- `platforms/pwa/src/pages/Home.jsx` - Menu updates + Video icon
- `platforms/pwa/src/App.jsx` - Routes added
- `platforms/pwa/src/pages/Profile.jsx` - Appointments section
- `platforms/pwa/src/pages/Doctors.jsx` - UI redesign with consultation methods
- `platforms/pwa/src/pages/DoctorDetail.jsx` - Added consultation methods section
- `backend/src/index.js` - API endpoints + bug fixes

---

## Previous Changes
See git history for earlier changes.
