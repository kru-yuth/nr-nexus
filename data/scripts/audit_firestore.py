import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

SERVICE_ACCOUNT_PATH = 'service-account.json'

def audit_firestore_data():
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    print("🔍 Auditing 'users' collection in Firestore...")
    users_ref = db.collection('users')
    docs = users_ref.stream()

    total = 0
    missing_prefix = 0
    missing_gender = 0
    missing_level = 0
    missing_class = 0
    no_email = 0
    
    sample_issues = []

    for doc in docs:
        total += 1
        data = doc.to_dict()
        
        # Check for missing or empty fields
        p = data.get('prefix', '')
        g = data.get('gender', '')
        l = data.get('level', '')
        c = data.get('class', '')
        e = data.get('email', '')
        
        has_issue = False
        issue_desc = []
        
        if not p: 
            missing_prefix += 1
            has_issue = True
            issue_desc.append("missing_prefix")
        if not g: 
            missing_gender += 1
            has_issue = True
            issue_desc.append("missing_gender")
        if not l: 
            missing_level += 1
            has_issue = True
            issue_desc.append("missing_level")
        if not c: 
            missing_class += 1
            has_issue = True
            issue_desc.append("missing_class")
        if not e:
            no_email += 1

        if has_issue and len(sample_issues) < 10:
            sample_issues.append({
                "id": doc.id,
                "name": data.get('name', 'N/A'),
                "email": e,
                "issues": ", ".join(issue_desc)
            })

    print(f"\n📊 Firestore Audit Results:")
    print(f"Total Documents: {total}")
    print(f"Missing Prefix: {missing_prefix}")
    print(f"Missing Gender: {missing_gender}")
    print(f"Missing Level: {missing_level}")
    print(f"Missing Class: {missing_class}")
    print(f"Documents without Email: {no_email}")

    if sample_issues:
        print("\n⚠️ Sample records with issues:")
        for s in sample_issues:
            print(f"- ID: {s['id']} | Name: {s['name']} | Issues: {s['issues']}")
    else:
        print("\n✅ All records in Firestore have prefix, gender, level, and class!")

if __name__ == "__main__":
    audit_firestore_data()
