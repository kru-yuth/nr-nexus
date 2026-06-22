# Current Sprint — 4 มิ.ย. 2569
## กำลังทำ
- [ ] Migrate components ให้ใช้ Design System

## เสร็จแล้ว
- [x] Rolled back Firestore security rules (`firestore.rules`) to original stable state (commit `6b9744a732a51dfa8acbadc0bc2fcc24531f4762`) to fix the user/teacher login issue, and successfully deployed them to production Firestore.
- [x] Implemented teacher-generated parent SDQ token links, displaying them appended to student names in the teacher dashboard, and integrated parent links into the student's SDQ page views.
- [x] Added SDQ Assessment card/widget to the Student Dashboard and fixed Firestore query index requirements for student SDQ assessments and home visits using client-side sorting.
- [x] Fixed Firestore index errors in SDQ/CareCase queries by using client-side sorting, bypassing index requirements and preventing submission failures.
- [x] Added customized SDQ submission feedback and exit flows (Student & Parent exit window/log out, Teacher returns to Student Care dashboard to evaluate the next student).
- [x] Implemented separate leave counts (Personal Leave vs. Sick Leave) in Attendance analytics across the Student, Teacher, and Admin modules.
- [x] Cleaned up all project-wide ESLint errors/warnings (duplicate keys, unused variables, hooks dependencies) ensuring build passes successfully.
- [x] Integrated official DMH SDQ items, scoring subscales, band thresholds, range-based calculations, and updated Thai band terminology ("กลุ่มเสี่ยง" / "กลุ่มปัญหา").
- [x] Refactored SDQ Assessments to top-level collection to support independent screening without requiring an active CareCase, and added case linking capability.
- [x] Implemented client-side PDF Reports (Individual + Class Summary) in the Student Care (SDQ) module using `@react-pdf/renderer` with Thai Sarabun font support.
- [x] Fixed homeroom query mismatches in careService.js (level and class parsing) and resolved Firestore security rules crash conditions.
- [x] Fixed translation mismatches (flat vs nested keys) for classroom dashboard actions and aligned TH/EN translation blocks.
- [x] Integrated SDQ dashboard redirection in App Hub, Copy Student Link action, and direct Teacher SDQ Assessment buttons.
- [x] Implemented SDQ Form UI (Teacher / Parent / Student) and Parent Token Generator with full translations and router bindings.
- [x] Cleaned up verification scripts and local artifacts, and updated .gitignore rules
- [x] Verified transaction double-submit protection using local Firestore emulator
- [x] Fixed critical parent token race conditions and security rules issues in careService.js & firestore.rules
- [x] Built careService.js + SDQ Scoring Engine and updated firestore.rules and translations
- [x] Design System foundation
- [x] Token/color audit
- [x] Fixed attendance overcounting bug
- [x] Refactored context files for token efficiency

## บล็อคอยู่
(ว่าง)

## Test Accounts
- student.demo@nr.ac.th → student, ม.3/1
- teacherdemo@nr.ac.th → teacher + homeroom + discipline.write
