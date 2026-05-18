import firebase_admin
from firebase_admin import credentials, firestore
import os

def audit_yuth():
    cred_path = 'service-account.json'
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    users_ref = db.collection('users')
    
    print("Searching for 'yuth@nr.ac.th' in Firestore...")
    
    # 1. Try direct ID
    doc1 = users_ref.document('Vvf7jJuIUHRst0hJCrVGPPmVEEp1').get()
    if doc1.exists:
        print(f"Found document by ID 'Vvf7jJuIUHRst0hJCrVGPPmVEEp1':")
        print(doc1.to_dict())
    else:
        print("Document ID 'Vvf7jJuIUHRst0hJCrVGPPmVEEp1' NOT found.")

    # 2. Try query by email
    docs = users_ref.where('email', '==', 'yuth@nr.ac.th').stream()
    found = False
    for d in docs:
        print(f"Found by query 'email == yuth@nr.ac.th': ID={d.id}")
        print(d.to_dict())
        found = True
    
    if not found:
        print("Query 'email == yuth@nr.ac.th' returned NO results.")

    # 3. Try query by Email (Legacy)
    docs = users_ref.where('Email', '==', 'yuth@nr.ac.th').stream()
    found = False
    for d in docs:
        print(f"Found by query 'Email == yuth@nr.ac.th': ID={d.id}")
        print(d.to_dict())
        found = True
    
    if not found:
        print("Query 'Email == yuth@nr.ac.th' returned NO results.")

    # 4. Search all for substring "yuth"
    print("\nSearching all documents for substring 'yuth'...")
    all_docs = users_ref.stream()
    count = 0
    for d in all_docs:
        data = d.to_dict()
        data_str = str(data).lower()
        if 'yuth' in data_str:
            print(f"Found substring match: ID={d.id}")
            print(data)
            count += 1
    print(f"Total substring matches: {count}")

if __name__ == "__main__":
    audit_yuth()
