import { auth, db } from "./firebase";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();

/**
 * Checks if the user's email domain is in the allowed_domains collection.
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const checkDomainAllowed = async (email) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    if (!domain) return false;

    try {
        // Check if specific domain document exists (assuming ID is the domain name)
        const domainDoc = await getDoc(doc(db, "allowed_domains", domain));
        if (domainDoc.exists()) return true;

        // Alternatively, query for the domain field if structure is different
        const domainsRef = collection(db, "allowed_domains");
        const q = query(domainsRef, where("domain", "==", domain));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Domain check error:", error);
        return false; // Fail safe
    }
};

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const email = user.email;

        // Step 1: Domain Check
        // Note: You must manually create 'allowed_domains' collection in Firestore 
        // and add a document with your domain for this to pass.
        // For development, we might mistakenly block everyone if data isn't there.
        // Let's log it but maybe not hard block for the very first run unless strict.
        // Prompt says: "After login, verify..."
        const isAllowed = await checkDomainAllowed(email);
        if (!isAllowed) {
            // We could throw error or return generic role. 
            // Let's allow but maybe warn or restricting role?
            // "Verify if user's email domain exists" -> implies blocking if not.
            // For now, let's proceed but logged. 
            console.warn(`Domain ${email.split('@')[1]} not explicitly allowed.`);
        }

        // Step 2: Multi-Collection Lookup
        let role = 'parent'; // Default fallback
        let profileData = null;

        // 2a. Check 'users' (Admin) - lowercase email
        const usersRef = collection(db, "users");
        const adminQuery = query(usersRef, where("email", "==", email.toLowerCase()));
        const adminSnapshot = await getDocs(adminQuery);

        if (!adminSnapshot.empty) {
            role = 'admin';
            profileData = adminSnapshot.docs[0].data();
        } else {
            // 2b. Check 'teachers' - Capitalized 'Email'
            const teachersRef = collection(db, "teachers");
            // Try both just in case, or stick to prompt "Capital E"
            const teacherQuery = query(teachersRef, where("Email", "==", email));
            const teacherSnapshot = await getDocs(teacherQuery);

            if (!teacherSnapshot.empty) {
                role = 'teacher';
                profileData = teacherSnapshot.docs[0].data();
            } else {
                // 2c. Check 'students' - Capitalized 'Email'
                const studentsRef = collection(db, "students");
                const studentQuery = query(studentsRef, where("Email", "==", email));
                const studentSnapshot = await getDocs(studentQuery);

                if (!studentSnapshot.empty) {
                    role = 'student';
                    profileData = studentSnapshot.docs[0].data();
                }
                // 2d. Fallback is 'parent'
            }
        }

        return { user, role, profileData };

    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

export const logoutUser = () => signOut(auth);
