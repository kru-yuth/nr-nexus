import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import pandas as pd
import os
from datetime import datetime

# --- Configuration ---
SERVICE_ACCOUNT_PATH = 'service-account.json'
INPUT_CSV = 'data/processed/golden_master_clean.csv'

def import_students():
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"❌ Error: Service account file '{SERVICE_ACCOUNT_PATH}' not found.")
        return
    
    if not os.path.exists(INPUT_CSV):
        print(f"❌ Error: Input CSV file '{INPUT_CSV}' not found. Please run clean_students.py first.")
        return

    # 1. Initialize Firebase Admin
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"❌ Error initializing Firebase Admin: {e}")
        return

    print(f"📂 Loading data from {INPUT_CSV}...")
    # บังคับอ่าน citizenId และ studentId เป็น string เพื่อรักษาเลข 0 นำหน้า
    # ใช้ encoding='utf-8-sig' เพื่อรองรับภาษาไทยที่มี BOM
    df = pd.read_csv(INPUT_CSV, dtype={"citizenId": str, "studentId": str}, encoding='utf-8-sig')
    df = df.fillna("") # เปลี่ยน NaN เป็น string ว่าง
    
    total_records = len(df)
    print(f"📊 Found {total_records} records to process.")

    users_ref = db.collection('users')
    batch = db.batch()
    count = 0
    success_count = 0
    timestamp = datetime.now().isoformat()

    print("🚀 Starting Batch Import...")

    for _, row in df.iterrows():
        email = str(row['email']).lower().strip()
        student_id = str(row['studentId']).strip()
        
        # 1. Determine Document ID
        if email and "@" in email:
            # ใช้ Email-based ID (ตรงกับ logic ใน userService.js)
            doc_id = email.replace("@", "_").replace(".", "_")
        else:
            # ถ้าไม่มี Email ใช้ Student ID เป็น ID แทน
            doc_id = f"std_{student_id}"

        # 2. Prepare Data
        # เราใช้ merge=True เพื่อให้ Upsert ได้ (ไม่ทับฟิลด์อื่นๆ ที่อาจมีอยู่แล้ว เช่น uid)
        prefix = str(row['prefix']).strip()
        first_name = str(row['firstName']).strip()
        last_name = str(row['lastName']).strip()
        
        # สร้างฟิลด์ name เพื่อความเข้ากันได้กับ Frontend
        full_name = f"{prefix}{first_name} {last_name}".strip()

        user_data = {
            "name": full_name,
            "displayName": full_name, # Fallback สำหรับบางจุดใน UI
            "email": email,
            "studentId": student_id,
            "prefix": prefix,
            "firstName": first_name,
            "lastName": last_name,
            "gender": str(row['gender']).strip(),
            "level": str(row['level']).strip(),
            "class": str(row['class']).strip(),
            "citizenId": str(row['citizenId']).strip(),
            "status": str(row['status']).strip() or "active",
            "roles": ["student"], # ค่าพื้นฐานสำหรับนักเรียน
            "updatedAt": timestamp
        }

        # 3. Add to Batch
        doc_ref = users_ref.document(doc_id)
        batch.set(doc_ref, user_data, merge=True)
        
        count += 1
        success_count += 1

        # 4. Commit every 500 records
        if count % 500 == 0:
            batch.commit()
            batch = db.batch()
            print(f"   ✅ Processed {count}/{total_records}...")

    # Final commit
    if count % 500 != 0:
        batch.commit()

    print(f"\n✨ IMPORT COMPLETE!")
    print(f"   - Total records processed: {success_count}")
    print(f"   - Collection: 'users'")
    print(f"   - Strategy: Upsert (merge=True)")

if __name__ == "__main__":
    import_students()
