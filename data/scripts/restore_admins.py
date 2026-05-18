import json
import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime

def restore_admins():
    backup_path = 'data/backups/users_backup_20260516_160329.json'
    cred_path = 'service-account.json'
    
    if not os.path.exists(backup_path):
        print(f"Error: {backup_path} not found")
        return
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    with open(backup_path, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    print(f"Loaded {len(backup_data)} records from backup.")
    
    recovered_count = 0
    batch = db.batch()
    timestamp = datetime.now().isoformat()

    for doc_id, data in backup_data.items():
        # Get roles (handle various formats)
        roles = data.get('roles', [])
        if not roles:
            role = data.get('role', data.get('Role', 'student')).lower()
            roles = [role]
        
        roles = [r.lower() for r in roles]
        
        # If it's an admin or teacher, we MUST restore them
        if 'admin' in roles or 'teacher' in roles:
            print(f"Restoring {data.get('email', data.get('Email'))} (Roles: {roles})")
            
            # Construct name if missing
            prefix = data.get('prefix', data.get('Title', ''))
            f_name = data.get('firstName', data.get('FirstName', ''))
            l_name = data.get('lastName', data.get('LastName', ''))
            constructed_name = f"{prefix}{f_name} {l_name}".strip() or "Unknown"

            # Normalize fields to lowercase as per project mandate
            normalized_data = {
                "name": data.get('name', data.get('displayName', constructed_name)),
                "displayName": data.get('displayName', data.get('name', constructed_name)),
                "email": (data.get('email', data.get('Email', '') or '')).lower().strip(),
                "roles": roles,
                "status": data.get('status', 'active'),
                "gender": data.get('gender', data.get('Gender', '')),
                "level": data.get('level', data.get('Level', '')),
                "class": data.get('class', data.get('LevelRoom', '')),
                "prefix": prefix,
                "firstName": f_name,
                "lastName": l_name,
                "studentId": data.get('studentId', data.get('StudentID', '')),
                "updatedAt": timestamp
            }
            
            # Carry over UID if exists
            if data.get('uid'):
                normalized_data['uid'] = data['uid']
            
            # Carry over ID if it's a field
            if data.get('id'):
                normalized_data['legacyId'] = data['id']
            
            # If doc_id is a UID (starts with uppercase or long alphanumeric), keep it.
            # Otherwise, use email-based ID for consistency.
            target_id = doc_id
            if "@" in target_id or "_" in target_id:
                 email = normalized_data['email']
                 if email:
                     target_id = email.replace("@", "_").replace(".", "_")

            doc_ref = db.collection('users').document(target_id)
            batch.set(doc_ref, normalized_data, merge=True)
            recovered_count += 1
            
            if recovered_count % 500 == 0:
                batch.commit()
                batch = db.batch()

    if recovered_count % 500 != 0:
        batch.commit()
        
    print(f"✅ Successfully restored {recovered_count} admin/teacher records.")

if __name__ == "__main__":
    restore_admins()
