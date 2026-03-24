import { db } from "./firebase";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    query,
    orderBy,
    where,
    updateDoc,
    writeBatch,
    limit,
    deleteDoc
} from "firebase/firestore";

/**
 * Helper function to normalize roles from various legacy formats to a single array.
 * @param {Object} data 
 * @returns {string[]}
 */
export const normalizeRoles = (data) => {
    if (!data) return [];
    let roles = [];
    if (Array.isArray(data.roles)) {
        roles = data.roles;
    } else if (data.role) {
        roles = [data.role.toLowerCase()];
    } else if (data.Role) {
        roles = [data.Role.toLowerCase()];
    }
    
    // Remove duplicates, ensure lowercase, and filter out empty strings
    return [...new Set(roles.map(r => r ? r.toString().toLowerCase().trim() : '').filter(r => r !== ''))];
};

/**
 * Finds a user by email and links their Google UID if not already linked.
 * @param {string} email 
 * @param {string} uid 
 * @returns {Promise<Object|null>} Normalized user data or null
 */
export const fetchUserByEmailAndLinkUID = async (email, uid) => {
    try {
        if (!email || !uid) return null;

        const q = query(collection(db, "users"), where("email", "==", email), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`Email-based lookup: No whitelisted user found for email: ${email}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        const roles = normalizeRoles(userData);

        const userRef = doc(db, "users", uid);
        const updates = {
            uid: uid,
            email: email,
            roles: roles,
            status: userData.status || 'active',
            updatedAt: new Date().toISOString()
        };
        
        await setDoc(userRef, updates, { merge: true });
        console.log(`Email-based lookup: Linked UID ${uid} and normalized roles for ${email}`);

        return {
            ...userData,
            ...updates
        };

    } catch (error) {
        console.error("Error in fetchUserByEmailAndLinkUID:", error);
        throw error;
    }
};

/**
 * Fetches all users from the unified 'users' collection.
 */
export const fetchAllUsers = async () => {
    try {
        const q = query(collection(db, "users"), orderBy("email"));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const roles = normalizeRoles(data);

            return {
                id: docSnap.id,
                name: data.displayName || data.Name || `${data.FirstName || ''} ${data.LastName || ''}`.trim() || "Unknown User",
                email: data.email || "",
                roles: roles,
                status: data.status || 'active',
                uid: data.uid || null,
                updatedAt: data.updatedAt || null
            };
        });
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
};

/**
 * Adds a new user to the unified 'users' collection with clean structure.
 * @param {Object} userData 
 */
export const addNewUser = async (userData) => {
    try {
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'student'];
        const cleanRoles = [...new Set(roles.map(r => r.toLowerCase().trim()))];

        const newUser = {
            displayName: userData.name,
            email: userData.email,
            roles: cleanRoles,
            status: userData.status || 'active',
            batchYear: userData.batchYear || '',
            class: userData.class || '',
            level: userData.level || '',
            gender: userData.gender || '',
            uid: userData.uid || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // If name has spaces, split into First/Last for legacy compatibility if needed
        if (userData.name && userData.name.includes(' ')) {
            const parts = userData.name.split(' ');
            newUser.FirstName = parts[0];
            newUser.LastName = parts.slice(1).join(' ');
        }

        const docRef = doc(collection(db, "users"));
        await setDoc(docRef, newUser);
        return { id: docRef.id, ...newUser };
    } catch (error) {
        console.error("Error adding new user:", error);
        throw error;
    }
};

/**
 * Updates an existing user's data, ensuring 'roles' is used and clean.
 * @param {string} userId 
 * @param {Object} userData 
 */
export const updateUser = async (userId, userData) => {
    try {
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'student'];
        const cleanRoles = [...new Set(roles.map(r => r.toLowerCase().trim()))];

        const updates = {
            displayName: userData.name || userData.displayName,
            email: userData.email,
            roles: cleanRoles,
            status: userData.status,
            batchYear: userData.batchYear || '',
            class: userData.class || '',
            level: userData.level || '',
            gender: userData.gender || '',
            updatedAt: new Date().toISOString()
        };

        // Note: We intentionally don't include 'role' or 'Role' here 
        // to slowly phase them out as users are updated.
        await updateDoc(doc(db, "users", userId), updates);
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
};

/**
 * Bulk adds users using writeBatch with clean 'roles' structure.
 * @param {Array} usersArray 
 */
export const bulkAddUsers = async (usersArray) => {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    usersArray.forEach(user => {
        // Use email-based ID for predictable bulk imports if no UID
        const targetId = user.email.replace(/[@.]/g, '_');
        const userRef = doc(db, "users", targetId);

        const roles = Array.isArray(user.roles) ? user.roles : [user.role || 'student'];
        const cleanRoles = [...new Set(roles.map(r => r.toLowerCase().trim()))];

        const data = {
            displayName: user.name,
            email: user.email,
            roles: cleanRoles,
            status: user.status || 'active',
            class: user.class || '',
            batchYear: user.batchYear || '',
            level: user.level || '',
            gender: user.gender || '',
            uid: "",
            createdAt: timestamp,
            updatedAt: timestamp
        };

        batch.set(userRef, data, { merge: true });
    });

    await batch.commit();
};

/**
 * Bulk updates status for multiple users.
 * @param {Array} userIds 
 * @param {string} status 
 */
export const bulkUpdateUserStatus = async (userIds, status) => {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    userIds.forEach(id => {
        const userRef = doc(db, "users", id);
        batch.update(userRef, {
            status: status,
            updatedAt: timestamp
        });
    });

    await batch.commit();
};

/**
 * Deletes a single user.
 */
export const deleteUser = async (userId) => {
    await deleteDoc(doc(db, "users", userId));
};

/**
 * Bulk deletes users.
 */
export const bulkDeleteUsers = async (userIds) => {
    const batch = writeBatch(db);
    userIds.forEach(id => {
        batch.delete(doc(db, "users", id));
    });
    await batch.commit();
};
