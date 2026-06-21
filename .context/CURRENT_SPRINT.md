# Current Sprint — 4 มิ.ย. 2569
## กำลังทำ
- [ ] Migrate components ให้ใช้ Design System
- [ ] Implement separate leave counts in Attendance analytics

## เสร็จแล้ว
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
