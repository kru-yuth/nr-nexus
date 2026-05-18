import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
from datetime import datetime

SERVICE_ACCOUNT_PATH = 'service-account.json'

def backup_and_clear_users():
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    # 1. Backup
    print("📦 Backing up users...")
    users_ref = db.collection('users')
    docs = users_ref.stream()
    
    def serialize_firestore(obj):
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        return obj

    backup_data = {doc.id: {k: serialize_firestore(v) for k, v in doc.to_dict().items()} for doc in docs}
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"data/backups/users_backup_{timestamp}.json"
    os.makedirs("data/backups", exist_ok=True)
    
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2)
    print(f"✅ Backup saved to {backup_file} ({len(backup_data)} records)")

    # 2. Clear (Batch delete)
    print("🔥 Clearing 'users' collection...")
    batch = db.batch()
    count = 0
    for doc_id in backup_data.keys():
        batch.delete(users_ref.document(doc_id))
        count += 1
        if count % 500 == 0:
            batch.commit()
            batch = db.batch()
    
    if count % 500 != 0:
        batch.commit()
    print(f"✅ Deleted {count} records.")

if __name__ == "__main__":
    backup_and_clear_users()
