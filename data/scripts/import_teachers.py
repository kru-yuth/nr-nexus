import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import os

def import_teachers():
    csv_path = 'data/processed/golden_master_teachers.csv'
    cred_path = 'service-account.json'
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    df = pd.read_csv(csv_path, dtype=str)
    df = df.fillna("")
    
    total = len(df)
    created = 0
    updated = 0
    skipped = 0
    
    batch = db.batch()
    count = 0
    
    print(f"🚀 Starting Teacher Import ({total} records)...")
    
    for _, row in df.iterrows():
        email = str(row['email']).lower().strip()
        
        # Rule: Skip yuth@nr.ac.th to protect existing admin roles
        if email == 'yuth@nr.ac.th':
            print(f"⏭️ Skipping {email} (Identity Protection)")
            skipped += 1
            continue
            
        doc_id = email.replace("@", "_").replace(".", "_")
        doc_ref = db.collection('users').document(doc_id)
        
        # Determine if Created or Updated for the report
        snapshot = doc_ref.get()
        if not snapshot.exists:
            created += 1
        else:
            updated += 1
        
        # Prepare Data
        # Roles are pipe-separated in CSV, convert to array
        roles_array = [r.strip() for r in str(row['roles']).split('|') if r.strip()]
        
        prefix = str(row['prefix']).strip()
        first_name = str(row['firstName']).strip()
        last_name = str(row['lastName']).strip()
        full_name = f"{prefix}{first_name} {last_name}".strip()
        
        data = {
            "email": email,
            "name": full_name,
            "displayName": full_name,
            "prefix": prefix,
            "firstName": first_name,
            "lastName": last_name,
            "roles": roles_array,
            "level": str(row.get('level', '')).strip(),
            "class": str(row.get('class', '')).strip(),
            "gender": str(row.get('gender', '')).strip(),
            "status": str(row['status']).strip() or "active",
            "updatedAt": firestore.SERVER_TIMESTAMP
        }
        
        # Only add homeroomClass if it's not empty
        homeroom = str(row['homeroomClass']).strip()
        if homeroom and homeroom.lower() != 'nan':
            data["homeroomClass"] = homeroom
            
        # Upsert (Merge)
        batch.set(doc_ref, data, merge=True)
        
        count += 1
        if count % 500 == 0:
            batch.commit()
            batch = db.batch()
            print(f"   ✅ Processed {count} records...")

    if count % 500 != 0:
        batch.commit()
        
    print(f"\n✨ IMPORT COMPLETE!")
    print(f"   - Total records in CSV: {total}")
    print(f"   - Created (New Docs): {created}")
    print(f"   - Updated (Merged): {updated}")
    print(f"   - Skipped: {skipped}")

if __name__ == "__main__":
    import_teachers()
