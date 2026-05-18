import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import os

def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate('service-account.json')
        firebase_admin.initialize_app(cred)
    return firestore.client()

def import_confirmed_students():
    db = initialize_firebase()
    users_ref = db.collection('users')
    
    m1_path = 'data/processed/new_m1_email_review.csv'
    review_path = 'data/processed/migration_needs_review.csv'
    
    imported_count = 0
    batch = db.batch()
    
    print("🚀 Starting Import for Confirmed Students...")

    # --- 1. Process New M.1 ---
    if os.path.exists(m1_path):
        print(f"📄 Reading {m1_path}...")
        df_m1 = pd.read_csv(m1_path, dtype=str)
        df_m1 = df_m1.fillna("")
        
        for _, row in df_m1.iterrows():
            if str(row.get('confirmed', '')).lower() == 'yes':
                email = str(row['suggested_email']).lower().strip()
                if not email: continue
                
                doc_id = email.replace("@", "_").replace(".", "_")
                data = {
                    "email": email,
                    "studentId": str(row['studentId']).strip(),
                    "prefix": str(row['prefix']).strip(),
                    "firstName": str(row['firstName']).strip(),
                    "lastName": str(row['lastName']).strip(),
                    "name": f"{row['prefix']}{row['firstName']} {row['lastName']}".strip(),
                    "displayName": f"{row['prefix']}{row['firstName']} {row['lastName']}".strip(),
                    "level": str(row['level']).strip(),
                    "class": str(row['class']).strip(),
                    "roles": ["student"],
                    "status": "active",
                    "updatedAt": firestore.SERVER_TIMESTAMP
                }
                
                batch.set(users_ref.document(doc_id), data, merge=True)
                imported_count += 1
                
                if imported_count % 500 == 0:
                    batch.commit()
                    batch = db.batch()

    # --- 2. Process Needs Review (Transfers) ---
    if os.path.exists(review_path):
        print(f"📄 Reading {review_path}...")
        df_rev = pd.read_csv(review_path, dtype=str)
        df_rev = df_rev.fillna("")
        
        # Check if 'email' column exists (User added it manually)
        if 'email' in df_rev.columns:
            for _, row in df_rev.iterrows():
                email = str(row['email']).lower().strip()
                if email and "@" in email:
                    doc_id = email.replace("@", "_").replace(".", "_")
                    data = {
                        "email": email,
                        "studentId": str(row['studentId']).strip(),
                        "prefix": str(row['prefix']).strip(),
                        "firstName": str(row['firstName']).strip(),
                        "lastName": str(row['lastName']).strip(),
                        "name": f"{row['prefix']}{row['firstName']} {row['lastName']}".strip(),
                        "displayName": f"{row['prefix']}{row['firstName']} {row['lastName']}".strip(),
                        "level": str(row['level']).strip(),
                        "class": str(row['class']).strip(),
                        "roles": ["student"],
                        "status": "active",
                        "updatedAt": firestore.SERVER_TIMESTAMP
                    }
                    
                    batch.set(users_ref.document(doc_id), data, merge=True)
                    imported_count += 1
                    
                    if imported_count % 500 == 0:
                        batch.commit()
                        batch = db.batch()

    if imported_count % 500 != 0:
        batch.commit()
        
    print(f"\n✨ IMPORT COMPLETE!")
    print(f"   - Total Confirmed Students Imported: {imported_count}")

if __name__ == "__main__":
    import_confirmed_students()
