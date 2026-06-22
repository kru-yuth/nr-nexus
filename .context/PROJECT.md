# NR Nexus — Project Context

## Overview
ระบบบริหารจัดการโรงเรียนฤทธิณรงค์รอน (Ritthinarongron School)
Production: https://nr-nexus.web.app
Stack: React 19 (Vite), TailwindCSS v4, Firebase (Auth/Firestore/Hosting)
Users: 530 records (นักเรียน + ครู + บุคลากร)

## Architecture
- Unified User System: users collection เดียวสำหรับทุก app
- Whitelisted Access: @nr.ac.th domain เท่านั้น
- Identity patterns: UID / email-based (email_nr_ac_th) / random legacy (2-4 records)
- permissions[] Discord-style array เช่น ["discipline.write", "attendance.read"]
- Document ID: UID (linked) หรือ email_nr_ac_th (whitelist)

## Modules Status
✅ Auth + User Management (prefix field, normalizeUserData)
✅ Discipline — เช็คมาสาย (grace period 3ครั้ง/เดือน, discipline.read/write)
✅ Attendance — เช็คชื่อ (subjects, sessions, records, mobile-first)
✅ Design System (tokens.css, tailwind config, src/components/ui/)
⏳ Student Care + SDQ Assessment (กำลัง build — ดู schema ด้านล่าง)
⬜ Leave (ลา — planned)
⬜ Notification (planned)
⬜ Volunteer (planned)

## Multi-Agent System
.context/agents/ มี 7 files:
orchestrator, discipline, attendance, user-management,
student-care, leave, data-pipeline
Orchestrator UI: src/components/Orchestrator/NRNexusOrchestrator.jsx

## Key Files
- src/services/userService.js → normalizeUserData (เรียกเสมอ)
- src/context/AuthContext.jsx → user data จาก Firestore
- firestore.rules → whitelist check (ห้ามแก้)
- src/i18n/translations.js → ทุก text ต้องผ่านที่นี่ รวมถึง SDQ 25 ข้อ
- src/components/ui/index.jsx → shared components
- src/styles/tokens.css → design tokens
- data/scripts/ → Python scripts สำหรับ data pipeline

## Test Accounts
- student.demo@nr.ac.th → student, ม.3/1
- teacherdemo@nr.ac.th → teacher + homeroom ม.3/1 + discipline.write

## Iron Rules (ห้ามละเมิด)
- normalizeUserData เสมอเมื่อดึง user data
- ห้ามแก้ whitelist check ใน firestore.rules
- ห้าม hardcode สี hex ใช้ Tailwind class (bg-primary ฯลฯ)
- ห้าม hardcode text ใช้ translations.js (รวมถึง SDQ question text)
- ห้าม import component ใหม่ ใช้ src/components/ui/ เท่านั้น
- build ผ่านก่อน deploy เสมอ
- backup ก่อน run data scripts ทุกครั้ง
- sdq_assessments เป็น write-once เสมอ — ห้าม updateDoc เด็ดขาด
- ถามก่อนถ้าไม่แน่ใจ ห้ามเดา

## Known Patterns
- getUserData() ใน rules รองรับ 3 patterns: UID, email-based, uid field
- Transaction เสมอเมื่อแก้ behavior_scores
- serverTimestamp() เสมอ ห้าม client-side time
- removeUndefined() ก่อน updateDoc() ทุกครั้ง
- Batch write ทีละ 500 (Firestore limit)
- submitSDQ ใช้ runTransaction เสมอ (ไม่ใช่ getDoc+setDoc แยกกัน)
- users/{studentId} มี parentLink: { token, academicYear, generatedAt, generatedBy, active }
- parentLink: ครูกด generate → token เก่าตายทันที / URL: /sdq/parent?token=xxx (unprotected)

## Open Source Goal
ตั้งใจ opensource ให้โรงเรียนทั่วประเทศไทยนำไปใช้
docs/ มี developer-guide และ user-guide รอ

---

## SDQ Assessment Schema (Student Care Module)

### Collection: sdq_assessments
Document ID: `${studentId}_${academicYear}_${term}_${assessorType}`
Write-once — ห้าม updateDoc หลัง create เด็ดขาด

```
{
  studentId:       string  // email-based ID ของนักเรียน
  classroomId:     string  // denormalized เพื่อ query ภาพรวมห้องได้ทันที
  academicYear:    string  // "2569"
  term:            string  // "1" (เผื่อ 2 เทอมในอนาคต)

  assessorType:    "student" | "teacher" | "parent"
  assessorId:      string  // email-based ID (student/teacher) | token string (parent)

  parentEmail:     string | null  // กรอกโดยผู้ปกครองตอน submit (non-parent = null)
  parentPhone:     string | null  // กรอกโดยผู้ปกครองตอน submit (non-parent = null)

  answers: {
    q1..q25: 0 | 1 | 2   // 0=ไม่จริง, 1=ค่อนข้างจริง, 2=จริงแน่นอน
  }

  scores: {
    emotional:        number  // อารมณ์ (q3,q8,q13,q16,q24)
    conduct:          number  // ความประพฤติ (q5,q7,q12,q18,q22)
    hyperactivity:    number  // ซน/สมาธิสั้น (q2,q10,q15,q21,q25)
    peer:             number  // เพื่อน (q6,q11,q14,q19,q23)
    prosocial:        number  // ด้านบวก (q1,q4,q9,q17,q20) — ไม่รวมใน totalDifficulties
    totalDifficulties: number // emotional+conduct+hyperactivity+peer (0-40)
  }

  evaluationResult: "normal" | "risk" | "problem"
  // normal = totalDifficulties 0-15
  // risk   = totalDifficulties 16-19
  // problem = totalDifficulties 20-40

  createdAt: serverTimestamp()  // ไม่มี updatedAt เพราะ write-once
}
```

Scoring: คำนวณ client-side ใน sdqService.js ก่อน write — ไม่ใช้ Cloud Function
SDQ question text: เก็บใน translations.js ทั้งหมด ห้าม hardcode ใน component
Form defaults:
- assessorType "teacher": ทุกข้อ default = 0 (ไม่จริง) เพื่อลดภาระครู
- assessorType "student" / "parent": ไม่มี default — บังคับเลือกทุกข้อ (ป้องกันชี้นำ)

### Parent Token (เพิ่มใน users/{studentId})
```
parentLink: {
  token:        string   // uuid-v4, unguessable
  academicYear: string   // token valid สำหรับปีนี้เท่านั้น
  generatedAt:  serverTimestamp()
  generatedBy:  string   // teacherId (email-based)
  active:       boolean  // false = revoked, ครู regenerate ได้ manual
}
```

Lifecycle:
- ครูกด "สร้าง Link ผู้ปกครอง" เมื่อต้องการส่งลิงก์ → generate token ใหม่ → token เก่าตายทันที
- ครูกด regenerate ได้เสมอ (เช่น link หลุด)
- URL pattern: `/sdq/parent?token=xxx` — unprotected route ไม่ต้อง Auth
- parentEmail และ parentPhone: ผู้ปกครองกรอกเองตอน submit SDQ ไม่ใช่ตอน generate

### Security Rules — Parent Exception
sdq_assessments สำหรับ assessorType "parent":
- verify token จาก users/{studentId}.parentLink แทน whitelist
- ตรวจ: token ตรงกัน + academicYear ตรงกัน + active == true
- write-once ผ่าน !exists() check

assessorType "student" / "teacher": whitelist เดิม ไม่แตะ
read sdq_assessments: whitelist เท่านั้น (ผู้ปกครองดูผลผ่าน public link ไม่ได้)

Parent page (/sdq/parent?token=xxx):
- unprotected route — แยกออกจาก ProtectedRoute เด็ดขาด
- ยังไม่รวม parent portal เต็มรูปแบบ (planned แยกต่างหาก)
