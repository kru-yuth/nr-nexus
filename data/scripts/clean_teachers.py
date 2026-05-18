"""
clean_teachers.py
Pipeline for cleaning and validating teacher master database.
Follows the same pattern as clean_students.py.

Rules:
  - Remove system accounts (admin, teachercom).
  - Split Prefix from FirstName (Thai/English support).
  - Title Case English names.
  - Map Roles to standard arrays.
  - Construct homeroomClass: "ม.{ชั้น}/{ห้อง}".
  - Citizen ID is not present in this raw file (must be updated later if needed).
"""

import pandas as pd
import os
import re

# File Paths
SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE    = os.path.join(SCRIPT_DIR, '../raw/ฐานข้อมูลครูและนักเรียน - teacher.csv')
OUTPUT_CLEAN  = os.path.join(SCRIPT_DIR, '../processed/golden_master_teachers.csv')
OUTPUT_REVIEW = os.path.join(SCRIPT_DIR, '../processed/teachers_needs_review.csv')

os.makedirs(os.path.join(SCRIPT_DIR, '../processed'), exist_ok=True)

def split_prefix(full_first_name):
    """
    Splits Thai/English prefixes from the first name.
    Returns (prefix, firstName)
    """
    name = str(full_first_name).strip()
    
    # Thai Prefixes
    thai_prefixes = ['นางสาว', 'นาย', 'นาง']
    for p in thai_prefixes:
        if name.startswith(p):
            return p, name[len(p):].strip()
            
    # English Prefixes (Case Insensitive)
    eng_prefixes = ['Miss', 'Mr.', 'Mrs.', 'Ms.', 'Mr', 'Mrs', 'Ms']
    for p in eng_prefixes:
        if name.lower().startswith(p.lower()):
            # Return original casing if match found
            return p, name[len(p):].strip()
            
    return "", name

def normalize_role(role_str):
    """
    Maps raw role strings to standardized role arrays.
    """
    raw = str(role_str).lower().replace(" ", "_")
    roles_list = [r.strip() for r in raw.split(',')]
    
    mapped_roles = set()
    for r in roles_list:
        if r == 'teacher':
            mapped_roles.add('teacher')
        elif r == 'admin':
            mapped_roles.add('admin')
            mapped_roles.add('teacher') # Admins are usually teachers
        elif r == 'director':
            mapped_roles.add('teacher')
            mapped_roles.add('director')
        elif r == 'deputy_director':
            mapped_roles.add('teacher')
            mapped_roles.add('deputy_director')
            
    # If nothing mapped, default to teacher if it was a staff list
    if not mapped_roles:
        return ["teacher"]
        
    return sorted(list(mapped_roles))

def clean_teachers():
    print("📂 Loading Teacher Master...")
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: {INPUT_FILE} not found")
        return

    # Use header-based loading, force numeric columns to be read as string to avoid .0 suffix
    df = pd.read_csv(INPUT_FILE, encoding='utf-8-sig', dtype={'ชั้น': str, 'ห้อง': str})
    print(f"   {len(df)} records loaded\n")

    # ── 1. Filter out system accounts ──
    exclude_emails = ['admin@nr.ac.th', 'teachercom@nr.ac.th']
    df = df[~df['Email'].str.lower().str.strip().isin(exclude_emails)]
    print(f"   Removed system accounts. {len(df)} records remaining.")

    # ── 2. Process Fields ──
    cleaned_records = []
    review_records = []
    
    for _, row in df.iterrows():
        email = str(row['Email']).lower().strip()
        raw_first_name = str(row['FirstName']).strip()
        last_name = str(row['LastName']).strip()
        raw_roles = str(row['Role']).strip()
        level = str(row.get('ชั้น', '')).strip()
        room = str(row.get('ห้อง', '')).strip()
        
        # A. Split Prefix
        prefix, first_name = split_prefix(raw_first_name)
        
        # B. Title Case English Names
        # If the name is purely alphanumeric (Eng), capitalize properly
        if first_name.isalpha():
            first_name = first_name.capitalize()
        if last_name.isalpha():
            last_name = last_name.capitalize()
            
        # C. Role Mapping
        roles = normalize_role(raw_roles)
        
        # D. Homeroom Class and Split Fields
        homeroom = ""
        lvl_val = ""
        room_val = ""
        if level and level != 'nan':
            lvl_clean = re.sub(r'[^0-9]', '', level)
            if lvl_clean:
                lvl_val = f"ม.{lvl_clean}"
        
        if room and room != 'nan':
            room_clean = re.sub(r'[^0-9]', '', room)
            if room_clean:
                # Ensure no .0 suffix if it was read as float
                room_val = str(int(float(room_clean)))
                
        if lvl_val and room_val:
            homeroom = f"{lvl_val}/{room_val}"
        
        record = {
            "email": email,
            "prefix": prefix,
            "firstName": first_name,
            "lastName": last_name,
            "roles": "|".join(roles), # Pipe-separated for CSV
            "homeroomClass": homeroom,
            "level": lvl_val,
            "class": room_val,
            "gender": "", # Teacher CSV doesn't have gender
            "status": "active",
            "_review_flag": ""
        }
        
        # ── 3. Special Case: yuth@nr.ac.th ──
        # NOTE: This record is critical. Ensure roles ['admin', 'teacher'] 
        # are preserved or checked against Firestore before final import.
        if email == 'yuth@nr.ac.th':
             record["_review_flag"] += "manual_check_roles_firestore|"
        
        # ── 4. Validation ──
        if not prefix:
            record["_review_flag"] += "missing_prefix|"
        if not email or "@" not in email:
            record["_review_flag"] += "invalid_email|"
            
        record["_review_flag"] = record["_review_flag"].rstrip("|")
        
        if record["_review_flag"]:
            review_records.append(record)
        
        cleaned_records.append(record)

    # ── 5. Export ──
    clean_df = pd.DataFrame(cleaned_records)
    
    # Drop review flag from golden master
    col_order = ["email", "prefix", "firstName", "lastName", "roles", "homeroomClass", "level", "class", "gender", "status"]
    clean_df[col_order].to_csv(OUTPUT_CLEAN, index=False, encoding="utf-8-sig")
    
    if review_records:
        review_df = pd.DataFrame(review_records)
        review_df.to_csv(OUTPUT_REVIEW, index=False, encoding="utf-8-sig")
        print(f"⚠️  {len(review_records)} records need review.")
    
    print(f"\n✅ Cleaned Master Created: {OUTPUT_CLEAN}")
    print(f"📊 Total processed: {len(clean_df)}")

if __name__ == "__main__":
    clean_teachers()
