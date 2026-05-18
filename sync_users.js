import fs from 'fs';
import { db } from './src/services/firebase.js';
import { collection, getDocs, doc, setDoc, query, where, writeBatch } from 'firebase/firestore';

// Configuration
const CSV_PATH = './imported_students_ready2.csv';

const syncUsers = async () => {
    console.log("🚀 Starting Master Data Sync...");
    
    try {
        const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        const header = lines[0].split(',');
        const rows = lines.slice(1);

        console.log(`📊 Found ${rows.length} records in CSV.`);

        // 1. Fetch current users to prevent overwriting critical fields (like UID or custom roles)
        const currentUsersSnap = await getDocs(collection(db, "users"));
        const existingUsersByEmail = {};
        currentUsersSnap.forEach(doc => {
            const data = doc.data();
            const email = (data.email || "").toLowerCase().trim();
            if (email) {
                if (!existingUsersByEmail[email]) existingUsersByEmail[email] = [];
                existingUsersByEmail[email].push({ id: doc.id, ...data });
            }
        });

        const batch = writeBatch(db);
        let count = 0;

        for (const row of rows) {
            // Basic CSV parsing (handles quotes if any)
            const values = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
            if (values.length < 5) continue;

            const studentId = values[1];
            const email = values[3].toLowerCase().trim();
            const prefix = values[4];
            const firstNameTh = values[6];
            const lastNameTh = values[7];
            const birthDate = values[10]; // YYYY-MM-DD
            const genderRaw = values[11]; // MALE / FEMALE
            const level = values[14]; // Study year (e.g. 1)

            if (!email || !email.includes('@')) continue;

            // Normalize data
            const cleanGender = genderRaw.toLowerCase() === 'male' ? 'ชาย' : 'หญิง';
            const cleanLevel = `ม.${level}`;
            const fullName = `${prefix}${firstNameTh} ${lastNameTh}`;

            // Check if user already exists
            const existingInstances = existingUsersByEmail[email] || [];
            
            // Prefer UID-based document if it exists, otherwise use email-safe ID
            let targetId = email.replace(/[@.]/g, '_');
            let baseData = { roles: ['student'], status: 'active' };

            if (existingInstances.length > 0) {
                // Find instance with UID if possible
                const withUid = existingInstances.find(u => u.uid);
                if (withUid) {
                    targetId = withUid.id;
                    baseData = { ...withUid };
                } else {
                    // Just take the first one
                    baseData = { ...existingInstances[0] };
                    targetId = existingInstances[0].id;
                }
            }

            const updatedUser = {
                ...baseData,
                email: email,
                studentId: studentId,
                name: fullName,
                firstName: firstNameTh,
                lastName: lastNameTh,
                gender: cleanGender,
                level: cleanLevel,
                birthDate: birthDate,
                roles: baseData.roles || ['student'],
                role: baseData.roles ? baseData.roles[0] : 'student', // Backward compatibility
                Role: baseData.roles ? baseData.roles[0] : 'student', // Backward compatibility
                updatedAt: new Date().toISOString()
            };

            const userRef = doc(db, "users", targetId);
            batch.set(userRef, updatedUser, { merge: true });
            count++;

            // Commit in chunks of 400 (Firebase limit is 500)
            if (count % 400 === 0) {
                await batch.commit();
                console.log(`✅ Progress: ${count} users synced...`);
            }
        }

        await batch.commit();
        console.log(`✨ SYNC COMPLETE! Total users processed: ${count}`);

    } catch (error) {
        console.error("❌ Sync Failed:", error);
    }
};

// Note: This is a template for the sync script. 
// In a real CLI environment, we'd handle Firebase Admin or Auth differently.
// For this session, I will simulate this cleanup via the userService.
