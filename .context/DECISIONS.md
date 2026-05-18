# Architectural Decisions (ADR)

## 1. Centralized Security Rules
- **Decision:** The `firestore.rules` file is maintained at the root of the `nr-nexus` project.
- **Context:** To ensure consistency across the unified database, all security rules for `users`, `volunteer_jobs`, `electricity_records`, and `waste_records` are combined into a single file.
- **Consequence:** Deployment of rules must be done through the `nr-nexus` project to ensure all sub-projects' data are protected correctly.

## 2. Single Firebase Project for Multiple Apps
- **Decision:** Use a single Firebase project to serve `nr-nexus`, `nr-electricity-stats`, and `waste-management-system`.
- **Context:** This simplifies authentication (single user pool) and allows seamless data sharing between modules without complex cross-project integrations.
- **Consequence:** Easier management of a **Unified User System**.

## 3. Multi-repo Approach
- **Decision:** Maintain separate repositories for each application instead of a Monorepo.
- **Context:** Allows independent development cycles and reduces the complexity of managing a single massive codebase, while still sharing the same backend infrastructure.
- **Consequence:** Requires discipline in maintaining shared schema definitions across repos.

## 4. Citizen ID Data Type
- **Decision:** `citizenId` is always stored as a **String**.
- **Context:** Citizen IDs in Thailand can start with zero. Storing them as Numbers would result in the loss of leading zeros.
- **Consequence:** All lookups and validations must treat this field as a string.

## 5. Student Onboarding Logic
- **Decision:** Students imported without an email address are assigned `status = "pending"`.
- **Context:** Access to the system requires an `@nr.ac.th` email. If an email is not provided during the initial batch import (e.g., from school registration data), the account remains in a pending state until an email is assigned and the student can be "activated".
- **Consequence:** UI must filter or highlight pending users for administrators to resolve.

## 6. Naming Convention
- **Decision:** NR stands for **Ritthinarongron** (โรงเรียนฤทธิณรงค์รอน), not Nakhon Ratchasima.
- **Context:** Clarifying the school's identity to prevent confusion and ensure consistent branding.
- **Consequence:** Use "NR" as a prefix for all sub-projects (e.g., NR Nexus, NR Electricity Stats) to maintain a cohesive ecosystem identity.

## 7. Known Issues & Fixes (Historical Context)
### 7.1 Data Schema Inconsistency (Fixed May 2026)
- **Issue:** Mixed casing in field names (e.g., `FirstName` vs `firstName`) caused UI rendering failures and data fragmentation.
- **Fix:** Performed a "Clean Slate" operation—wiped the `users` collection and re-imported using a strict lowercase schema.
- **Mandate:** Always use lowercase field names as defined in `data-pipeline.md`.

### 7.2 Fragile CSV Parsing (Fixed May 2026)
- **Issue:** Using fixed column indices (e.g., `row[2]`) in Frontend imports caused data misalignment when CSV structures varied.
- **Fix:** Implemented **Header-based mapping** in `UserManagement.jsx`.
- **Mandate:** Never use fixed indices for CSV parsing; always map by header names.

### 7.3 Whitelist Check Permission Denied (Fixed May 2026)
- **Issue:** Firestore rules blocked the pre-login email check (whitelist verification).
- **Fix:** Updated `firestore.rules` to allow a restricted `read` (limit 1, filter by email) for unauthenticated requests.
- **Context:** Necessary for the "Whitelisted Access" architecture.

### 7.5 Student Data Display Gaps (Fixed May 2026)
- **Issue:** Critical fields (Prefix, Level, Class, Gender) were missing for some students in the UI.
- **Cause:** Legacy data in Firestore used UpperCase field names (e.g., `Level`, `Title`) which the Frontend didn't handle.
- **Fix:** Implemented **Field Normalization** in `userService.js` (`fetchAllUsers`) to check both LowerCase and legacy UpperCase fields.
- **Mandate:** All new imports must strictly use LowerCase, but services must maintain fallback logic for legacy documents until full migration.

### 7.8 Display Name Fix & Redundant Doc Cleanup (May 2026)
- **Issue:** Some users showed "Unknown" as their name in the UI.
- **Cause:** 
    1. Import/Restore scripts didn't explicitly set the `name` field, and legacy documents often had "Unknown" stored in them.
    2. Multiple redundant documents existed for the same email due to switching between auto-generated IDs and Email-based IDs.
- **Fix:** 
    1. Updated `import_teachers.py` and `restore_admins.py` to construct `name` from prefix/first/last.
    2. Created `cleanup_redundant_docs.py` to purge 44 documents using old 20-character auto-generated IDs.
- **Mandate:** Always set both `name` and `displayName` fields during any user import or restoration. Use Email-based IDs (`user_nr_ac_th`) or UIDs for all user documents.

### 7.9 Student Migration Pipeline 2569 (May 2026)
- **Decision:** Implemented `migrate_students_2569.py` to handle the transition to the 2569 academic year.
- **Context:** The input is a multi-sheet ODS file where each sheet may contain multiple rooms separated by title rows.
- **Rules:** 
    - **Header Parsing:** Rows are parsed iteratively to detect "Room" context from title strings (e.g., "1/1"). Actual data starts after finding a numeric row index.
    - **M.1 New Intake:** Emails are generated as `[romanized_firstName][studentId]@nr.ac.th` using `pythainlp`. These records are exported to `new_m1_email_review.csv` for manual approval before import.
    - **Alumni Transition:** 
        1. All students in old M.6 sheet -> `alumni`.
        2. Students in old M.3 sheet NOT in new M.4 sheet -> `alumni`.
        3. Students with "ขาดเรียนนาน" note -> `alumni`.
        4. Existing active students NOT found in any 2569 sheet -> `alumni`.
- **Consequence:** 288 students updated, 128 set to alumni, and 63 new M.1 records pending review.

### 7.10 Late Check-in Module (May 2026)
- **Decision:** Implemented a real-time self-reporting system for late arrivals.
- **Context:** Requires strict server-side timestamping and behavior score integration.
- **Rules:** 
    - **Time Blocks:** 08:00-08:29 (-5 pts, `late_minor`), 08:30-09:29 (-10 pts, `late_major`), 09:30+ (Closed).
    - **Uniqueness:** Doc ID is `{uid}_{YYYY-MM-DD}` to enforce 1 record/day.
    - **Scores:** Atomic Firestore batch updates both `late_checkins` and `behavior_scores`.
    - **Security:** Rules enforce `request.time` for timestamps and strict math validation for score updates.
- **Consequence:** Students gain a transparent way to check in, and admins can monitor live data via the Discipline Dashboard.

### 7.11 Late Check-in Grace Period & Permissions (May 2026)
- **Decision:** Implemented a 3-time monthly grace period for 08:00-08:29 late arrivals and a new permission-based access control for discipline management.
- **Context:** Encourages students via positive reinforcement and provides granular control for staff.
- **Rules:** 
    - **Grace Period:** First 3 late arrivals (08:00-08:29) in a month result in `deductedScore: 0` and `status: "warning"`. The 4th+ arrival deducts 5 points.
    - **Permissions:** Added `permissions` array to user schema. `discipline.write` allows teachers to record/edit check-ins and scores.
    - **UI:** Students see positive reinforcement messages and a warning count (X/3) during the grace period.
    - **Firestore Rules:** Updated to enforce `hasPermission('discipline.write')` and allow students to record warnings (-0 deduction).
- **Consequence:** Higher student morale through fair warning system and improved security via granular permissions.

## 8. Incident Log — May 2026
| Issue | Severity | Root Cause | Resolution |
| :--- | :--- | :--- | :--- |
| **Student Data Gaps** | Medium | Missing support for legacy UpperCase fields in Frontend. | Field Normalization in `userService.js`. |
| **Admin Login Failure** | High | Invalid Firestore Rules syntax & Case-sensitivity. | Refined `firestore.rules` (v2) & Enhanced whitelist query. |
| **Admin Accounts Deleted**| Critical | Bulk "Clean Slate" import without Staff records. | Recovered 45 staff records via `restore_admins.py`. |
| **JS Reference Error** | High | Missing `getDoc` import in `userService.js`. | Added missing Firebase Firestore imports. |
| **"Unknown" Display Names**| Medium | Missing `name` field in imports & Redundant docs. | Explicit name construction & Purged 44 old documents. |

## 9. Import Log
### 9.1 Teacher Master Import (May 16, 2026)
- **Source:** `golden_master_teachers.csv`
- **Target:** Firestore `users` collection (Email-based IDs)
- **Results:**
    - Total in CSV: 38
    - Created (New Docs): 37
    - Updated (Merged): 0
    - Skipped: 1 (`yuth@nr.ac.th`)
- **Note:** Successfully merged `homeroomClass` and standardized `roles` array.

## 10. Current Project Status (As of May 16, 2026)
- **Database:** `users` collection contains **530 verified records**.
- **Module:** Late Check-in Module with **3-Warning Grace Period** and **Granular Permissions** is live.
- **Security:** `firestore.rules` updated to support `hasPermission` and grace period logic.
- **Ready for:** Building out Volunteer management and school-wide reporting.
