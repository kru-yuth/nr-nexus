import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
import os
from datetime import datetime

# --- Configuration ---
# Place your service account key file at the project root
SERVICE_ACCOUNT_PATH = 'service-account.json'
BACKUP_DIR = 'data/backups'

def audit_and_backup():
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"❌ Error: Service account file '{SERVICE_ACCOUNT_PATH}' not found.")
        print("Please follow these steps:")
        print("1. Go to Firebase Console > Project Settings > Service Accounts.")
        print("2. Click 'Generate new private key'.")
        print("3. Rename the downloaded file to 'service-account.json' and place it in the project root.")
        return

    # 1. Initialize Firebase Admin
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"❌ Error initializing Firebase Admin: {e}")
        return

    print("🔍 Auditing 'users' collection...")
    try:
        users_ref = db.collection('users')
        docs = users_ref.stream()

        all_users = []
        auto_id_docs = []
        uid_docs = []
        
        for doc in docs:
            user_data = doc.to_dict()
            doc_id = doc.id
            
            # Pre-process data to handle non-serializable types (like Firestore Timestamps)
            for key, value in user_data.items():
                if hasattr(value, 'isoformat'): # Handles datetime, Timestamp, etc.
                    user_data[key] = value.isoformat()
                elif isinstance(value, datetime):
                    user_data[key] = value.isoformat()

            user_data['_doc_id'] = doc_id
            all_users.append(user_data)
            
            # Identify ID type
            # Standard Firestore Auto-ID is 20 chars
            # Standard Firebase Auth UID is usually 28 chars
            if len(doc_id) == 20:
                auto_id_docs.append(doc_id)
            else:
                uid_docs.append(doc_id)

        # 2. Save Backup
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(BACKUP_DIR, f'users_backup_{timestamp}.json')
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(all_users, f, ensure_ascii=False, indent=2)

        print(f"\n✅ Audit & Backup complete!")
        print(f"📂 Backup File: {backup_file}")
        print(f"\n📊 Summary:")
        print(f"   - Total Documents: {len(all_users)}")
        print(f"   - Potential Auto-generated IDs (len=20): {len(auto_id_docs)}")
        print(f"   - Potential Auth UIDs (len!=20): {len(uid_docs)}")
        
        if auto_id_docs:
            print("\n🚩 Auto-generated IDs found:")
            for aid in auto_id_docs[:10]: # Show first 10
                print(f"     - {aid}")
            if len(auto_id_docs) > 10:
                print(f"     ... and {len(auto_id_docs) - 10} more.")
        
        print("\n💡 Next steps:")
        print("1. Inspect the backup JSON file to verify the data.")
        print("2. Once confirmed, we can run a cleanup script to remove the duplicates.")

    except Exception as e:
        print(f"❌ Error during audit: {e}")

if __name__ == "__main__":
    audit_and_backup()
