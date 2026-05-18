import pandas as pd
import os
import re
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from pythainlp.transliterate import romanize

# --- Configuration ---
ODS_PATH = 'data/raw/รายชื่อนักเรียน1-2569.ods'
SERVICE_ACCOUNT_PATH = 'service-account.json'
OUTPUT_M1_REVIEW = 'data/processed/new_m1_email_review.csv'
OUTPUT_SUMMARY = 'data/processed/migration_summary.csv'
OUTPUT_NEEDS_REVIEW = 'data/processed/migration_needs_review.csv'

# Ensure directories exist
os.makedirs('data/processed', exist_ok=True)

def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    return firestore.client()

def get_sheet_mapping(xls):
    """Maps display names to ODS sheet names (handling encoding/mismatches)."""
    mapping = {}
    sheets = xls.sheet_names
    for s in sheets:
        if 'เธก.1' in s or 'ม.1' in s: mapping['ม.1'] = s
        elif 'เธก.2' in s or 'ม.2' in s: mapping['ม.2'] = s
        elif 'เธก.3' in s or 'ม.3' in s:
            if 'เน€เธเนเธฒ' in s or 'เก่า' in s: mapping['ม.3เก่า'] = s
            else: mapping['ม.3'] = s
        elif 'เธก.4' in s or 'ม.4' in s: mapping['ม.4'] = s
        elif 'เธก.5' in s or 'ม.5' in s: mapping['ม.5'] = s
        elif 'เธก.6' in s or 'ม.6' in s:
            if 'เน€เธเนเธฒ' in s or 'เก่า' in s: mapping['ม.6เก่า'] = s
            else: mapping['ม.6'] = s
        elif 'เน€เธ”เนเธเน€เธเนเธฒเนเธซเธกเน' in s or 'เด็กเข้าใหม่' in s: mapping['เด็กเข้าใหม่'] = s
    return mapping

def generate_email(first_name, student_id):
    # Romanize first name, remove spaces, lowercase
    rom = romanize(first_name).replace(" ", "").lower()
    # Filter only english characters
    rom = re.sub(r'[^a-z]', '', rom)
    return f"{rom}{student_id}@nr.ac.th"

def parse_student_sheet(xls, sheet_name, level_name, ignore_sid=False):
    """
    Parses a sheet row by row, detecting room changes and student data.
    Returns a list of student dicts.
    """
    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
    students = []
    current_room = ""
    
    for i, row in df.iterrows():
        row_list = [str(x).strip() for x in row.tolist()]
        row_str = " ".join(row_list)
        
        # 1. Detect Room change
        room_match = re.search(r'ปีที่\s+(\d+)/(\d+)', row_str)
        if room_match:
            current_room = room_match.group(2)
            continue
            
        # 2. Detect Student Data
        col0 = row_list[0]
        col1 = row_list[1]
        
        if col0.isdigit() and (ignore_sid or (col1.isdigit() and len(col1) >= 5)):
            # Found a student!
            student = {
                "เลขที่": col0,
                "studentId": col1 if col1 != 'nan' else "",
                "prefix": row_list[2] if len(row_list) > 2 else "",
                "firstName": row_list[3] if len(row_list) > 3 else "",
                "lastName": row_list[4] if len(row_list) > 4 else "",
                "level": level_name,
                "class": current_room,
                "note": row_list[5] if len(row_list) > 5 else ""
            }
            students.append(student)
            
    return students

def migrate():
    print("🚀 Initializing Migration 2569...")
    db = initialize_firebase()
    
    # 1. Fetch all existing students from Firestore
    print("📥 Fetching current students from Firestore...")
    users_ref = db.collection('users')
    # Filter for students
    all_users = users_ref.stream()
    
    fs_students = {} # studentId -> {docId, level, status}
    all_doc_ids = []
    
    for doc in all_users:
        data = doc.to_dict()
        roles = data.get('roles', [])
        if 'student' in roles:
            sid = str(data.get('studentId', ''))
            if sid:
                fs_students[sid] = {
                    "id": doc.id,
                    "level": data.get('level', ''),
                    "status": data.get('status', 'active'),
                    "roles": roles
                }
        all_doc_ids.append(doc.id)

    # 2. Read ODS
    print("📂 Loading ODS file...")
    xls = pd.ExcelFile(ODS_PATH, engine='odf')
    sheet_map = get_sheet_mapping(xls)
    
    new_m1_data = []
    update_data = [] # {docId, updates}
    all_found_sids = set()
    
    summary = {
        "updated_level_class": 0,
        "new_m1_pending_email": 0,
        "set_alumni": 0,
        "skipped_new_students": 0,
        "not_found_in_firestore": 0
    }
    
    needs_review = []
    
    # --- Case 1 & 2: Process sheets ม.1 - ม.6 ---
    for lvl in ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']:
        if lvl not in sheet_map:
            print(f"⚠️ Warning: Sheet {lvl} not found")
            continue
            
        print(f"📄 Processing {lvl}...")
        students = parse_student_sheet(xls, sheet_map[lvl], lvl)
        
        for s in students:
            sid = s['studentId']
            all_found_sids.add(sid)
            
            if lvl == 'ม.1':
                # Case 2: New M.1
                # The user says "นักเรียน ม.1 ทุกคนคือนักเรียนใหม่"
                # We generate email and save for review
                email = generate_email(s['firstName'], sid)
                s['suggested_email'] = email
                s['confirmed'] = ''
                new_m1_data.append(s)
                summary['new_m1_pending_email'] += 1
            else:
                # Case 1: Existing students
                if sid in fs_students:
                    fs_doc = fs_students[sid]
                    update_data.append({
                        "id": fs_doc['id'],
                        "updates": {
                            "level": s['level'],
                            "class": s['class'],
                            "updatedAt": firestore.SERVER_TIMESTAMP,
                            "status": "active" # Reactivate if they were pending/other
                        }
                    })
                    summary['updated_level_class'] += 1
                else:
                    # StudentId not in Firestore
                    summary['not_found_in_firestore'] += 1
                    needs_review.append({**s, "_issue": "studentId_not_found_in_firestore"})

    # --- Case 3: Set Alumni ---
    print("🎓 Processing Alumni transitions...")
    
    # 3.1: ม.6เก่า -> All to alumni
    if 'ม.6เก่า' in sheet_map:
        old_m6 = parse_student_sheet(xls, sheet_map['ม.6เก่า'], 'ม.6เก่า')
        for s in old_m6:
            sid = s['studentId']
            if sid in fs_students:
                fs_doc = fs_students[sid]
                update_data.append({
                    "id": fs_doc['id'],
                    "updates": {"status": "alumni", "updatedAt": firestore.SERVER_TIMESTAMP}
                })
                summary['set_alumni'] += 1
                
    # 3.2: ม.3เก่า -> Alumni if not in ม.4 OR "ขาดเรียนนาน"
    # To check if in ม.4, we need the sids from ม.4 sheet
    m4_sids = set()
    if 'ม.4' in sheet_map:
        m4_students = parse_student_sheet(xls, sheet_map['ม.4'], 'ม.4')
        m4_sids = {str(x['studentId']) for x in m4_students}
        
    if 'ม.3เก่า' in sheet_map:
        old_m3 = parse_student_sheet(xls, sheet_map['ม.3เก่า'], 'ม.3เก่า')
        for s in old_m3:
            sid = s['studentId']
            note = s.get('note', '')
            if sid in fs_students:
                fs_doc = fs_students[sid]
                is_alumni = False
                if sid not in m4_sids:
                    is_alumni = True
                if "ขาดเรียนนาน" in note or "ขาดเรียน" in note:
                    is_alumni = True
                    
                if is_alumni:
                    update_data.append({
                        "id": fs_doc['id'],
                        "updates": {"status": "alumni", "updatedAt": firestore.SERVER_TIMESTAMP}
                    })
                    summary['set_alumni'] += 1

    # 3.3: Firestore active students NOT in ANY 2569 sheet -> Alumni
    for sid, fs_doc in fs_students.items():
        if fs_doc['status'] == 'active' and sid not in all_found_sids:
            # Check if we already marked them for update (like in Case 3.1 or 3.2)
            # Actually, update_data might contain multiple updates for the same doc. 
            # Firestore will just apply them sequentially.
            update_data.append({
                "id": fs_doc['id'],
                "updates": {"status": "alumni", "updatedAt": firestore.SERVER_TIMESTAMP}
            })
            summary['set_alumni'] += 1

    # --- Case 4: เด็กเข้าใหม่ ---
    if 'เด็กเข้าใหม่' in sheet_map:
        new_students = parse_student_sheet(xls, sheet_map['เด็กเข้าใหม่'], 'เด็กเข้าใหม่', ignore_sid=True)
        summary['skipped_new_students'] = len(new_students)
        print(f"ℹ️ Found {len(new_students)} new students without IDs. Logged to summary.")

    # --- EXECUTION ---
    # Apply updates in batches
    print(f"📤 Applying {len(update_data)} updates to Firestore...")
    batch = db.batch()
    count = 0
    for item in update_data:
        doc_ref = users_ref.document(item['id'])
        batch.update(doc_ref, item['updates'])
        count += 1
        if count % 500 == 0:
            batch.commit()
            batch = db.batch()
            print(f"   ✅ Committed {count} updates...")
    if count % 500 != 0:
        batch.commit()

    # --- EXPORT REPORTS ---
    # 1. New M.1 Review
    if new_m1_data:
        m1_df = pd.DataFrame(new_m1_data)
        cols = ['studentId', 'prefix', 'firstName', 'lastName', 'level', 'class', 'suggested_email', 'confirmed']
        m1_df[cols].to_csv(OUTPUT_M1_REVIEW, index=False, encoding='utf-8-sig')
        print(f"✅ Created {OUTPUT_M1_REVIEW}")

    # 2. Migration Summary
    summary_data = []
    for k, v in summary.items():
        summary_data.append({"case": k, "count": v, "detail": ""})
    pd.DataFrame(summary_data).to_csv(OUTPUT_SUMMARY, index=False, encoding='utf-8-sig')
    print(f"✅ Created {OUTPUT_SUMMARY}")

    # 3. Needs Review
    if needs_review:
        pd.DataFrame(needs_review).to_csv(OUTPUT_NEEDS_REVIEW, index=False, encoding='utf-8-sig')
        print(f"⚠️ Created {OUTPUT_NEEDS_REVIEW} with {len(needs_review)} records.")

    print("\n✨ MIGRATION COMPLETE!")
    print(f"   - Updated (Lvl/Class): {summary['updated_level_class']}")
    print(f"   - Set Alumni: {summary['set_alumni']}")
    print(f"   - M.1 Pending Review: {summary['new_m1_pending_email']}")

if __name__ == "__main__":
    migrate()
