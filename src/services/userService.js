import { db } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

/**
 * Fetches all users from 'users', 'teachers', and 'students' collections.
 * Normalizes the data into a unified format.
 * @returns {Promise<Array>} Array of normalized user objects.
 */
export const fetchAllUsers = async () => {
    try {
        const usersPromise = getDocs(collection(db, "users"));
        const teachersPromise = getDocs(collection(db, "teachers"));
        const studentsPromise = getDocs(collection(db, "students"));

        const [usersSnap, teachersSnap, studentsSnap] = await Promise.all([
            usersPromise,
            teachersPromise,
            studentsPromise
        ]);

        const allUsers = [];

        // 1. Process Admins (users collection)
        usersSnap.forEach((doc) => {
            const data = doc.data();
            allUsers.push({
                id: doc.id,
                name: data.displayName || data.name || "Unknown Admin",
                email: data.email || "",
                role: 'admin',
                originalCollection: 'users',
                ...data // Spread rest just in case
            });
        });

        // 2. Process Teachers
        teachersSnap.forEach((doc) => {
            const data = doc.data();
            allUsers.push({
                id: doc.id,
                name: `${data.FirstName || ''} ${data.LastName || ''}`.trim() || "Unknown Teacher",
                email: data.Email || "", // Case sensitive as per requirements
                role: 'teacher',
                originalCollection: 'teachers',
                ...data
            });
        });

        // 3. Process Students
        studentsSnap.forEach((doc) => {
            const data = doc.data();
            allUsers.push({
                id: doc.id,
                name: `${data.FirstName || ''} ${data.LastName || ''}`.trim() || "Unknown Student",
                email: data.Email || "", // Case sensitive as per requirements
                role: 'student',
                extra: data.Level ? `Level: ${data.Level}` : '',
                originalCollection: 'students',
                ...data
            });
        });

        return allUsers;

    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};
/**
 * Adds a new user to the specific collection based on role.
 * @param {Object} userData - { name, email, role, ...customFields }
 * @returns {Promise<string>} The ID of the new document.
 */
export const addNewUser = async (userData) => {
    try {
        const { name, email, role, ...customFields } = userData;
        let collectionName = '';
        let finalData = {};

        // Split name for First/Last mapping
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        switch (role) {
            case 'admin':
                collectionName = 'users';
                finalData = {
                    displayName: name,
                    email: email, // lowercase for admins
                    role: 'admin',
                    ...customFields
                };
                break;
            case 'teacher':
                collectionName = 'teachers';
                finalData = {
                    FirstName: firstName,
                    LastName: lastName,
                    Email: email, // Case sensitive usually, but standardizing on input
                    Role: 'teacher',
                    ...customFields
                };
                break;
            case 'student':
                collectionName = 'students';
                finalData = {
                    FirstName: firstName,
                    LastName: lastName,
                    Email: email,
                    Role: 'student',
                    ...customFields
                };
                break;
            default:
                throw new Error("Invalid role selected");
        }

        const docRef = await addDoc(collection(db, collectionName), finalData);
        return docRef.id;

    } catch (error) {
        console.error("Error adding user:", error);
        throw error;
    }
};
