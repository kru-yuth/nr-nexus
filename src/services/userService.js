import { db } from "./firebase";
import {
    collection,
    getDocs,
    getDoc,
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
    
    // If 'roles' array exists and is NOT empty, it is the SOURCE OF TRUTH.
    if (Array.isArray(data.roles) && data.roles.length > 0) {
        return [...new Set(data.roles
            .map(r => r ? String(r).toLowerCase().trim() : '')
            .filter(r => r !== '')
        )];
    }
    
    // Fallback logic for legacy data or if 'roles' array is missing/empty
    let roles = [];
    if (typeof data.roles === 'string') roles.push(data.roles);
    if (data.role && typeof data.role === 'string') roles.push(data.role);
    if (data.Role && typeof data.Role === 'string') roles.push(data.Role);
    
    return [...new Set(roles
        .map(r => r ? String(r).toLowerCase().trim() : '')
        .filter(r => r !== '')
    )];
};

/**
 * Normalizes raw Firestore data into a consistent user schema.
 * Handles legacy field names (UpperCase) and provides sensible defaults.
 */
export const normalizeUserData = (docId, rawData) => {
    if (!rawData) return null;

    const email = (rawData.email || rawData.Email || "").toLowerCase().trim();
    const roles = normalizeRoles(rawData);
    const prefix = (rawData.prefix || rawData.Title || "").toString().trim();
    const firstName = (rawData.firstName || rawData.FirstName || "").toString().trim();
    const lastName = (rawData.lastName || rawData.LastName || "").toString().trim();
    
    // Construct name if missing, handle all variants
    const name = rawData.name || rawData.displayName || rawData.Name || 
                 `${prefix}${firstName} ${lastName}`.trim() || "Unknown";

    return {
        id: docId,
        uid: rawData.uid || (docId.length > 20 ? docId : null),
        email,
        name,
        displayName: name,
        roles,
        permissions: Array.isArray(rawData.permissions) ? rawData.permissions : [],
        status: (rawData.status || "active").toLowerCase(),
        level: (rawData.level || rawData.Level || "").toString().trim(),
        class: (rawData.class || rawData.LevelRoom || "").toString().trim(),
        gender: (rawData.gender || rawData.Gender || "").toString().trim(),
        prefix,
        firstName,
        lastName,
        studentId: (rawData.studentId || rawData.StudentID || "").toString().trim(),
        batchYear: (rawData.batchYear || "").toString().trim(),
        citizenId: (rawData.citizenId || "").toString().trim(),
        updatedAt: rawData.updatedAt || null
    };
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
        
        const normalizedEmail = email.toLowerCase().trim();

        // 1. First, check if a document with the UID already exists
        const directDoc = await getDoc(doc(db, "users", uid));
        if (directDoc.exists()) {
            console.log(`Email-based lookup: Found existing UID document for ${normalizedEmail}`);
            return normalizeUserData(directDoc.id, directDoc.data());
        }

        // 2. If not, search for whitelisted documents (by email or Email field)
        const q = query(collection(db, "users"), where("email", "==", normalizedEmail), limit(1));
        let querySnapshot = await getDocs(q);

        // Fallback for legacy 'Email' field if 'email' search fails
        if (querySnapshot.empty) {
            const qLegacy = query(collection(db, "users"), where("Email", "==", normalizedEmail), limit(1));
            querySnapshot = await getDocs(qLegacy);
        }

        if (querySnapshot.empty) {
            console.warn(`Email-based lookup: No whitelisted user found for email: ${normalizedEmail}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // Normalize whitelisted data before saving
        const normalized = normalizeUserData(userDoc.id, userData);

        const userRef = doc(db, "users", uid);
        const updates = {
            ...normalized,
            uid: uid,
            updatedAt: new Date().toISOString()
        };
        
        // Link to UID document
        await setDoc(userRef, updates, { merge: true });
        console.log(`Email-based lookup: Linked UID ${uid} and normalized roles for ${email}`);

        return updates;

    } catch (error) {
        console.error("Error in fetchUserByEmailAndLinkUID:", error);
        throw error;
    }
};

/**
 * Fetches all users and performs a strict merge based on email.
 */
export const fetchAllUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const mergedMap = {};

        querySnapshot.docs.forEach(docSnap => {
            const userData = normalizeUserData(docSnap.id, docSnap.data());
            const email = userData.email;
            if (!email) return;

            // Smart Merge Logic
            if (!mergedMap[email]) {
                mergedMap[email] = {
                    ...userData,
                    allDocIds: [docSnap.id]
                };
            } else {
                const existing = mergedMap[email];
                existing.allDocIds.push(docSnap.id);

                // Combine roles
                existing.roles = [...new Set([...existing.roles, ...userData.roles])];
                
                // Prioritize UID documents as the 'ID' for React keys
                if (userData.uid && !existing.uid) {
                    existing.uid = userData.uid;
                    existing.id = userData.id; 
                }

                // Status Synchronization: Trust the most recently updated document
                if (!existing.updatedAt || (userData.updatedAt && userData.updatedAt > existing.updatedAt)) {
                    existing.status = userData.status;
                    existing.updatedAt = userData.updatedAt;
                    // Also prioritize level/class from the most recent doc if available
                    if (userData.level) existing.level = userData.level;
                    if (userData.class) existing.class = userData.class;
                } else if (userData.status === 'alumni' && existing.status === 'active') {
                    existing.status = 'alumni';
                }

                // Fill in gaps (Field accumulation)
                const fieldsToMerge = ['level', 'class', 'gender', 'prefix', 'firstName', 'lastName', 'studentId', 'citizenId', 'uid'];
                fieldsToMerge.forEach(field => {
                    if (!existing[field] && userData[field]) {
                        existing[field] = userData[field];
                    }
                });
            }
        });

        // Sort by email for consistency
        return Object.values(mergedMap).sort((a, b) => a.email.localeCompare(b.email));
    } catch (error) {
        console.error("Critical error in fetchAllUsers:", error);
        throw error;
    }
};

/**
 * Adds a new user to the unified 'users' collection with clean structure.
 */
export const addNewUser = async (userData) => {
    try {
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'student'];
        const cleanRoles = [...new Set(roles.map(r => r ? String(r).toLowerCase().trim() : '').filter(r => r !== ''))];
        
        const primaryRole = cleanRoles.length > 0 ? cleanRoles[0] : 'student';

        const newUser = {
            displayName: userData.name || userData.displayName,
            email: userData.email,
            roles: cleanRoles,
            permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
            role: primaryRole, // Sync legacy field
            Role: primaryRole, // Sync legacy field
            status: userData.status || 'active',
            batchYear: userData.batchYear || '',
            class: userData.class || '',
            level: userData.level || '',
            gender: userData.gender || '',
            uid: userData.uid || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = doc(collection(db, "users"));
        await setDoc(docRef, newUser);
        return { id: docRef.id, ...newUser };
    } catch (error) {
        console.error("Error adding new user:", error);
        throw error;
    }
};

/**
 * Updates an existing user's data.
 */
export const updateUser = async (userId, userData) => {
    try {
        const roles = Array.isArray(userData.roles) ? userData.roles : [userData.role || 'student'];
        const cleanRoles = [...new Set(roles.map(r => r ? String(r).toLowerCase().trim() : '').filter(r => r !== ''))];
        
        const primaryRole = cleanRoles.length > 0 ? cleanRoles[0] : 'student';

        const updates = {
            displayName: userData.name || userData.displayName,
            email: userData.email,
            roles: cleanRoles,
            permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
            role: primaryRole, // Sync legacy field
            Role: primaryRole, // Sync legacy field
            status: userData.status,
            batchYear: userData.batchYear || '',
            class: userData.class || '',
            level: userData.level || '',
            gender: userData.gender || '',
            updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, "users", userId), updates);
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
};

/**
 * Promotes students of a specific level to the next level or to alumni status.
 */
export const promoteLevel = async (fromLevel, toLevel) => {
    try {
        const allUsers = await fetchAllUsers();
        const targets = allUsers.filter(u => u.level === fromLevel && u.roles.includes('student'));

        if (targets.length === 0) {
            console.log(`No students found in level ${fromLevel}`);
            return 0;
        }

        const batch = writeBatch(db);
        let count = 0;
        const timestamp = new Date().toISOString();

        targets.forEach(user => {
            const docIds = user.allDocIds || [user.id];
            docIds.forEach(docId => {
                const updates = { updatedAt: timestamp };

                if (toLevel === "alumni") {
                    updates.status = "alumni";
                } else {
                    updates.level = toLevel;
                    updates.status = "active";
                }

                batch.update(doc(db, "users", docId), updates);
            });
            count++;
        });

        await batch.commit();
        console.log(`✅ Atomic Transition: ${count} students moved from ${fromLevel} to ${toLevel}.`);
        return count;
    } catch (error) {
        console.error(`Error in atomic promotion for ${fromLevel}:`, error);
        throw error;
    }
};

/**
 * Bulk adds users using writeBatch with clean 'roles' structure.
 */
export const bulkAddUsers = async (usersArray) => {
    const CHUNK_SIZE = 450;
    const timestamp = new Date().toISOString();
    
    const validUsers = usersArray.filter(user => user && user.email && typeof user.email === 'string');
    
    if (validUsers.length === 0) {
        console.warn("bulkAddUsers: No valid users to add.");
        return;
    }

    for (let i = 0; i < validUsers.length; i += CHUNK_SIZE) {
        const chunk = validUsers.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(user => {
            const targetId = user.email.toLowerCase().trim().replace(/[@.]/g, '_');
            const userRef = doc(db, "users", targetId);

            const roles = Array.isArray(user.roles) ? user.roles : [user.role || 'student'];
            const cleanRoles = [...new Set(roles.map(r => String(r || '').toLowerCase().trim()).filter(r => r !== ''))];

            const data = {
                displayName: user.name || "Unknown",
                email: user.email.toLowerCase().trim(),
                roles: cleanRoles,
                status: user.status || 'active',
                class: (user.class || '').toString(),
                batchYear: (user.batchYear || '2568').toString(),
                level: (user.level || '').toString(),
                gender: (user.gender || '').toString(),
                studentId: (user.studentId || '').toString(),
                citizenId: (user.citizenId || '').toString(),
                uid: user.uid || "",
                createdAt: user.createdAt || timestamp,
                updatedAt: timestamp
            };

            batch.set(userRef, data, { merge: true });
        });

        await batch.commit();
        console.log(`✅ Bulk Import: Processed chunk ${Math.floor(i / CHUNK_SIZE) + 1}`);
    }
};

/**
 * Bulk updates status for multiple users.
 */
export const bulkUpdateUserStatus = async (usersToUpdate, status) => {
    try {
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        usersToUpdate.forEach(user => {
            const docIds = user.allDocIds || [user.id || user.uid];
            docIds.forEach(id => {
                if (!id) return;
                batch.update(doc(db, "users", id), {
                    status: status,
                    updatedAt: timestamp
                });
            });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error in atomic status update:", error);
        throw error;
    }
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
