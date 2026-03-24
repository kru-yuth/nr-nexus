# คู่มือนักพัฒนา (Developer Guide) - NR Nexus

NR Nexus เป็นโปรเจกต์หลักที่รวมระบบบริหารจัดการต่างๆ ของโรงเรียนเข้าด้วยกัน

## 1. โครงสร้างระบบผู้ใช้แบบรวมศูนย์ (Unified User System)

เพื่อให้ทุกแอปพลิเคชันในเครือข่าย NR Nexus ใช้งานฐานข้อมูลผู้ใช้ร่วมกันได้อย่างมีประสิทธิภาพ ระบบจึงใช้โครงสร้างดังนี้

### 1.1 Firestore User Schema
- `email`: (String) อีเมลหลักของผู้ใช้ (@nr.ac.th)
- `uid`: (String) Google Auth UID (เชื่อมโยงอัตโนมัติเมื่อ Login)
- `roles`: (Array) รายการสิทธิ์ เช่น `['admin', 'teacher', 'student', 'parent']`
- `status`: (String) สถานะ เช่น `active`, `alumni`

## 2. การเข้าสู่ระบบ (Authentication Flow)
1. ตรวจสอบโดเมน `@nr.ac.th`
2. ค้นหาผู้ใช้จาก `email` ในคอลเลกชัน `users` (Whitelist)
3. หากพบข้อมูล จะทำการเชื่อมโยง `uid` เข้ากับเอกสารนั้น
4. หากไม่พบข้อมูลใน Whitelist ระบบจะปฏิเสธการเข้าใช้งานทันที

## 3. ข้อควรระวัง (Precautions) ⚠️

1.  **Strict Whitelist:** ระบบนี้ไม่มีการสร้างบัญชีใหม่โดยอัตโนมัติ (No Auto-registration) ผู้ดูแลระบบต้องเพิ่มอีเมลใน Firestore ก่อนเท่านั้น
2.  **Multi-role logic:** การเช็คสิทธิ์ในโค้ดต้องใช้ `roles.includes('admin')` เสมอ ห้ามเปรียบเทียบค่าตรงๆ เพราะผู้ใช้หนึ่งคนอาจมีได้หลายบทบาท
3.  **Security Rules:** การ Deploy Rules จะต้องใช้ไฟล์ `firestore.rules` ที่ root ซึ่งรวมกฎของทุกโปรเจกต์ย่อยไว้แล้วเท่านั้น
4.  **Data Integrity:** ห้ามแก้ไขฟิลด์ `roles` ให้เป็น String โดยตรงใน Firestore เพราะจะทำให้ระบบ Error (ต้องเป็น Array เสมอ)

## 4. การ Deploy
โปรเจกต์นี้ใช้ Firebase Hosting ร่วมกับโปรเจกต์ย่อยอื่นๆ

```bash
# Build
npm run build

# Deploy Hosting
firebase deploy --only hosting

# Deploy Rules (รวมทุกโปรเจกต์)
firebase deploy --only firestore:rules
```

---
*อัปเดตล่าสุด: 24 มีนาคม 2026*
