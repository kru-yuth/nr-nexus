import firebase_admin
from firebase_admin import credentials, firestore
import os

def cleanup_corrupted_docs():
    cred_path = 'service-account.json'
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    users_ref = db.collection('users')
    
    print("🧹 Starting cleanup of corrupted/redundant documents...")
    
    all_docs = users_ref.stream()
    deleted_count = 0
    batch = db.batch()
    
    for d in all_docs:
        doc_id = d.id
        
        # Pattern check:
        # 1. Auto-generated IDs are exactly 20 chars and alphanumeric
        # 2. Email-based IDs contain '_nr_ac_th'
        # 3. UIDs are usually 28 chars
        
        is_auto_gen = len(doc_id) == 20 and doc_id.isalnum()
        
        if is_auto_gen:
            print(f"🗑️ Deleting redundant doc: {doc_id} ({d.to_dict().get('email', 'no email')})")
            batch.delete(d.reference)
            deleted_count += 1
            
            if deleted_count % 500 == 0:
                batch.commit()
                batch = db.batch()

    if deleted_count % 500 != 0:
        batch.commit()
        
    print(f"\n✅ Cleanup Complete! Deleted {deleted_count} documents.")

if __name__ == "__main__":
    cleanup_corrupted_docs()
