# Task: Data Pipeline - Student Import

## Overview
Import consolidated student data from a master CSV file into the Firestore `users` collection.

## Input Specification
- **File:** `golden_master_clean.csv`
- **Schema:**
  - `email`: User's school email (@nr.ac.th)
  - `studentId`: School student ID
  - `prefix`: Name prefix (e.g., นาย, นางสาว, เด็กชาย)
  - `firstName`: First name in Thai
  - `lastName`: Last name in Thai
  - `gender`: Gender (ชาย/หญิง)
  - `level`: Educational level (e.g., ม.1)
  - `class`: Room number (e.g., 1)
  - `citizenId`: 13-digit Identification number
  - `status`: Account status (active/pending)

## Output Specification
- **Target:** Firestore Collection `users`
- **Document ID:** Recommendation is to use a normalized email (e.g., replacing dots/ats) or a unique identifier that prevents duplicates.

## Implementation Rules
1. **Citizen ID Integrity:** Ensure `citizenId` is treated strictly as a **String** to preserve leading zeros.
2. **Batch Processing:** Use Firestore `WriteBatch`. Perform commits in batches of **500 records** per commit to adhere to Firestore's atomic limit.
3. **Pending Status:** 
   - If `email` is empty or invalid, set `status` to `"pending"`.
   - If `email` is valid, set `status` to `"active"` (or as specified in CSV).
4. **Data Normalization:**
   - Normalize names (remove extra spaces).
   - Ensure `roles` array is initialized as `['student']`.
5. **Conflict Handling:**
   - If a document with the same email or `studentId` already exists, decide whether to overwrite (Update) or skip (Ignore) based on project needs (usually `merge: true` is safer).

## Success Criteria
- [ ] All records from CSV are present in Firestore.
- [ ] No leading zeros are lost in `citizenId`.
- [ ] 500-record batch limit is respected.
- [ ] Students without emails are correctly marked as `pending`.
