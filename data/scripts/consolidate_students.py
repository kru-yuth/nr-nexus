import csv

def normalize_prefix(name, prefix):
    # Remove prefix from name if it exists to avoid duplication
    prefixes = ['นาย', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'นาง', 'เด็กชาย ', 'เด็กหญิง ']
    for p in prefixes:
        if name.startswith(p):
            name = name[len(p):].strip()
    return name

def merge_student_data():
    # 1. Load data from 'รายชื่อนักเรียน 1_2568 - ชีต1.csv' as the Primary source for Rooms and Email fallback
    room_map = {}
    try:
        # Use utf-8-sig to handle BOM if present
        with open('รายชื่อนักเรียน 1_2568 - ชีต1.csv', mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader) # Skip header
            for row in reader:
                if len(row) >= 7:
                    student_id = row[1].strip()
                    if student_id:
                        room_map[student_id] = {
                            "class": row[6].strip(),
                            "level": row[5].strip(),
                            "email_fallback": row[8].strip() if len(row) > 8 else ""
                        }
    except Exception as e:
        print(f"Error reading Room CSV: {e}")

    # 2. Load data from 'imported_students_ready2.csv'
    seen_emails = set()
    seen_ids = set()
    final_data = []
    
    try:
        with open('imported_students_ready2.csv', mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            for row in reader:
                if len(row) < 20: continue
                
                email = row[3].strip().lower()
                student_id = row[1].strip()

                # Get Room and Email Fallback from map using Student ID
                # Default to Level from identity if room map fails
                room_info = room_map.get(student_id, {"class": "", "level": f"ม.{row[14].strip()}", "email_fallback": ""})
                
                # If email is missing, use fallback
                if not email:
                    email = room_info["email_fallback"].strip().lower()
                
                # Skip duplicates
                if email and email in seen_emails:
                    print(f"Skipping duplicate email: {email}")
                    continue
                if student_id and student_id in seen_ids:
                    print(f"Skipping duplicate ID: {student_id}")
                    continue
                
                if email: seen_emails.add(email)
                if student_id: seen_ids.add(student_id)

                prefix = row[4].strip()
                first_name = row[6].strip()
                last_name = row[7].strip()
                gender = "ชาย" if row[11].strip().upper() == "MALE" else "หญิง"
                level_raw = row[14].strip()
                
                # Citizen ID or Passport ID fallback
                citizen_id = row[19].strip()
                if not citizen_id and len(row) > 20:
                    citizen_id = row[20].strip()

                # Clean email
                email = email.replace("*", "").strip()

                # Normalize Name
                first_name = normalize_prefix(first_name, prefix)
                
                final_data.append({
                    "email": email,
                    "studentId": student_id,
                    "prefix": prefix,
                    "name": f"{prefix}{first_name} {last_name}",
                    "firstName": first_name,
                    "lastName": last_name,
                    "gender": gender,
                    "level": room_info["level"],
                    "class": room_info["class"],
                    "citizenId": citizen_id,
                    "status": "active"
                })
    except Exception as e:
        print(f"Error reading Identity CSV: {e}")

    # 3. Write to Golden Master CSV
    output_file = 'golden_master_students.csv'
    if not final_data:
        print("❌ No data to write!")
        return

    keys = final_data[0].keys()
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        dict_writer = csv.DictWriter(f, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(final_data)
    
    print(f"✅ Success! Created {output_file} with {len(final_data)} records.")

if __name__ == "__main__":
    merge_student_data()
