import { auth, db } from "../services/firebase";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import {
    getDoc,
    doc
} from "firebase/firestore";
import { fetchUserByEmailAndLinkUID } from './userService';

export { fetchUserByEmailAndLinkUID };

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: "nr.ac.th", prompt: "select_account" });

/**
 * Initiates Google Login via Popup.
 * Returns the user object if domain matches.
 */
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Requirement: Strict local domain check
        if (!user.email.endsWith('@nr.ac.th')) {
            await signOut(auth);
            throw new Error('Unauthorized domain');
        }

        return user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

/**
 * Fetches user roles from unified 'users' collection using UID.
 * Strictly uses the 'roles' array format.
 * @param {string} uid 
 * @returns {Promise<string[]>}
 */
export const fetchUserRoles = async (uid) => {
    if (!uid) return [];

    try {
        console.log(`Fetching roles for UID: ${uid}`);
        const userDoc = await getDoc(doc(db, "users", uid));

        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Standardize to array
            if (Array.isArray(data.roles)) {
                return data.roles;
            } else if (data.role) {
                return [data.role.toLowerCase()];
            } else if (data.Role) {
                return [data.Role.toLowerCase()];
            }
            
            return ['student']; // Default role
        } else {
            console.warn(`No user document found for UID: ${uid}`);
            return [];
        }
    } catch (error) {
        console.error(`Error fetching roles for UID ${uid}:`, error.code, error.message);
        return [];
    }
};

export const logoutUser = () => {
    localStorage.clear();
    sessionStorage.clear();
    return signOut(auth);
};
