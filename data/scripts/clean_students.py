"""
clean_students.py
Pipeline สำหรับ clean และ validate golden_master_students.csv
ก่อน import เข้า Firestore

Decisions:
  - citizenId เก็บเป็น string เสมอ (pad leading zeros ให้ครบ 13 หลัก)
  - email ว่าง → status = "pending" (ไม่แยกไฟล์ import ด้วยกันได้เลย)
  - lastName "-" หรือ NaN → empty string ""
  - lastName "ไม่ปรากฎ" → เก็บไว้ตามเดิม (ข้อมูลจริง ไม่ใช่ error)

Output:
  - golden_master_clean.csv  → ทุก record พร้อม import (รวม pending)
  - needs_review.csv         → เฉพาะ records ที่มี issue ให้ Admin ดู
"""

import pandas as pd
import os

# รัน script จาก nr-nexus/data/scripts/
SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE    = os.path.join(SCRIPT_DIR, '../raw/golden_master_students.csv')
OUTPUT_CLEAN  = os.path.join(SCRIPT_DIR, '../processed/golden_master_clean.csv')
OUTPUT_REVIEW = os.path.join(SCRIPT_DIR, '../processed/needs_review.csv')
CITIZEN_ID_LEN = 13

os.makedirs(os.path.join(SCRIPT_DIR, '../processed'), exist_ok=True)

# ── 1. Load (citizenId เป็น string ตั้งแต่ต้น ป้องกัน int64 ตัด leading zero) ──
print("📂 Loading...")
df = pd.read_csv(INPUT_FILE, dtype={"citizenId": str})
print(f"   {len(df)} records loaded\n")

# ── 2. citizenId: pad leading zeros ให้ครบ 13 หลัก ──────────────────
print("🔧 Padding citizenId...")
df["citizenId"] = df["citizenId"].astype(str).str.strip()

needs_pad = (df["citizenId"].str.len() < CITIZEN_ID_LEN) & (df["citizenId"].str.isnumeric())
df.loc[needs_pad, "citizenId"] = df.loc[needs_pad, "citizenId"].str.zfill(CITIZEN_ID_LEN)

padded_count = needs_pad.sum()
if padded_count:
    print(f"   Padded {padded_count} records:")
    print(df[needs_pad][["studentId","firstName","citizenId"]].to_string(index=False))
else:
    print("   No padding needed")

# ── 3. lastName: "-" และ NaN → empty string ──────────────────────────
print("\n🔧 Cleaning lastName...")
df["lastName"] = df["lastName"].fillna("")
df["lastName"] = df["lastName"].apply(lambda x: "" if str(x).strip() == "-" else str(x).strip())
cleaned_ln = (df["lastName"] == "").sum()
print(f"   {cleaned_ln} records with empty lastName")

# ── 4. email ว่าง → status = "pending" ───────────────────────────────
print("\n🔧 Setting pending status for missing emails...")
mask_no_email = df["email"].isna() | (df["email"].str.strip() == "")
df.loc[mask_no_email, "status"] = "pending"
pending_count = mask_no_email.sum()
print(f"   {pending_count} records set to pending:")
if pending_count:
    print(df[mask_no_email][["studentId","firstName","lastName","status"]].to_string(index=False))

# ── 5. Validation: หา issues ทั้งหมด (เพื่อ needs_review.csv) ──────────
print("\n🔍 Running validation...")
review_flags = pd.Series([""] * len(df), index=df.index)

# citizenId ยังสั้นอยู่ (non-numeric เช่น passport format)
still_short = df["citizenId"].str.len() < CITIZEN_ID_LEN
review_flags[still_short] += "citizenId_short|"

# duplicate citizenId
dup_cid = df.duplicated("citizenId", keep=False)
review_flags[dup_cid] += "citizenId_duplicate|"

# duplicate studentId
dup_sid = df.duplicated("studentId", keep=False)
review_flags[dup_sid] += "studentId_duplicate|"

# duplicate email (เฉพาะที่มี email)
dup_email = df["email"].notna() & df.duplicated("email", keep=False)
review_flags[dup_email] += "email_duplicate|"

# pending records
review_flags[mask_no_email] += "missing_email_pending|"

# บันทึก flag
df["_review_flag"] = review_flags.str.rstrip("|")

has_issue = df["_review_flag"] != ""
print(f"   {has_issue.sum()} records have issues")

# ── 6. Export ─────────────────────────────────────────────────────────
col_order = ["email","studentId","prefix","firstName","lastName",
             "gender","level","class","citizenId","status"]

# clean file = ทุก record (รวม pending) ไม่มี flag column
df[col_order].to_csv(OUTPUT_CLEAN, index=False, encoding="utf-8-sig")

# review file = เฉพาะ records ที่มี issue + flag column
review_cols = col_order + ["_review_flag"]
df[has_issue][review_cols].sort_values("studentId").to_csv(
    OUTPUT_REVIEW, index=False, encoding="utf-8-sig"
)

# ── 7. Summary ───────────────────────────────────────────────────────
print("\n" + "="*50)
print("📊 SUMMARY")
print("="*50)
print(f"Total records      : {len(df)}")
print(f"Active             : {(df['status']=='active').sum()}")
print(f"Pending            : {(df['status']=='pending').sum()}")
print(f"citizenId padded   : {padded_count}")
print(f"lastName cleaned   : {cleaned_ln}")
print(f"Records w/ issues  : {has_issue.sum()}")
print("="*50)
print(f"\n✅ Output: {OUTPUT_CLEAN}")
print(f"⚠️  Review: {OUTPUT_REVIEW}")

