# Current Sprint — 4 มิ.ย. 2569
## กำลังทำ
- [ ] Fix Timestamp rendering bug (React error #31) ในหน้าดูรายละเอียดรายคน + PDF report
- [ ] Migrate components ให้ใช้ Design System

## เสร็จแล้ว
- [x] Backfill ข้อมูล name/displayName 51 record ที่มี tab character/double-space ใน Firestore จริง — verify แล้วตรง 100% กับ dry-run, เหลือ duplicate_word 10 รายการที่ยืนยันว่าเป็น false positive จาก regex สแกน ไม่ใช่บัคจริง
- [x] เพิ่ม Helper sanitizeNameField ใน userService.js เพื่อล้าง Whitespace/Tab character ก่อนดึงข้อมูลไปใช้
- [x] ปรับปรุง CareCaseDetailPage ให้แสดงประวัติแบบประเมิน SDQ เมื่อเข้าจาก Dashboard โดยไม่ต้องบังคับเปิดเคสก่อน (มีปุ่มเปิดเคสเสริมแทน)
- [x] แก้รายชื่อนักเรียนซ้ำใน SDQ Dashboard (dedup whitelist+UID docs) + แก้คำนำหน้าชื่อซ้ำใน UserManagement (normalizeUserData เติม prefix ให้ name เสมอ)
- [x] แก้ไข Firebase error: Missing or insufficient permissions ในหน้า TeacherCareDashboard, TeacherSDQPage, CareCaseDetailPage และ SDQTokenGenerator สำหรับบทบาทคุณครู (และอัปเดตสิทธิ์ sdqTokens ใน rules) - ทดสอบจริงผ่านด้วยนักเรียนจริง 2 คนเรียบร้อยแล้ว
- [x] แก้ไข Firebase error: Missing or insufficient permissions ในหน้า TeacherCareDashboard โดยการย้ายมาใช้ classId Index และปรับปรุง firestore.rules พร้อมทำ backfill ข้อมูลเก่าทั้งหมด
- [x] Backfill ข้อมูลครู 10 คน: ปิด task — ข้อมูลถูกต้องครบทั้ง 10 คนแล้ว (ยืนยันจาก dry-run ล่าสุดที่ currentValues = correctedFields ทุกคน) ไม่ต้องรัน --execute (หมายเหตุ: whitelistDocId แบบ random ID ของ peerapat, surapitchaya2569, phatcharaphon2569, aksarapak2569 คือ known legacy pattern ที่มีอยู่แล้ว ไม่ใช่ปัญหาใหม่ ไม่ต้องแก้ไข)
- [x] Bug #3: แก้ไขบัค homeroomClass ไม่บันทึกในหน้า Add User และ Edit User โดยการอัปเดต addNewUser และ updateUser (แก้ไขและ deploy ขึ้น Hosting เรียบร้อย)
- [x] ปรับปรุง `updateUser()` ให้เขียนบันทึกคู่ขนานไปยังทั้ง Whitelist และ UID Doc แบบ atomic (และเพิ่มฟิลด์ homeroomClass ใน update payload)
- [x] ตรวจสอบความเสี่ยงของสิทธิ์หาย (permissions) จาก Whitelist-Wins Merge (Step 1-3) และเสนอแนวทางแก้ไข
- [x] แก้ไข logic การซิงค์และตรวจสอบข้อมูลผู้ใช้ใน fetchUserByEmailAndLinkUID และ updateUser เพื่อแก้ปัญหาข้อมูลครู/ห้องประจำชั้นไม่ตรงกันและสิทธิ์เพี้ยน
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

## Backlog
- [ ] เพศ (gender) ผิดสำหรับนักเรียนบางคน — มาจากข้อมูล CSV ต้นทางผิด ไม่ใช่บัคโค้ด ต้อง audit เทียบทะเบียนจริงทีหลัง ไม่กระทบ SDQ scoring (ใช้แค่จัดเรียงผล)

## Test Accounts
- student.demo@nr.ac.th → student, ม.3/1
- teacherdemo@nr.ac.th → teacher + homeroom + discipline.write
