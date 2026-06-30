import { auth, db } from "./firebase";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    query,
    where,
    updateDoc,
    writeBatch,
    limit,
    deleteDoc,
    serverTimestamp
} from "firebase/firestore";

// NR Nexus Permission System — Discord-style
// Format: "{module}.{action}"
// discipline.read  → view only
// discipline.write → full control (includes read)
// attendance.read  → (future)
// attendance.write → (future)
// grades.read      → (future)
// grades.write     → (future)

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
 * Derives the primary role from a user object using fallback priorities.
 * Priority order: roles array > role field > Role field > default 'student'
 * @param {Object} userData 
 * @returns {string}
 */
export const derivePrimaryRole = (userData) => {
    if (!userData) return 'student';
    if (Array.isArray(userData.roles) && userData.roles.length > 0) {
        const priorityOrder = ['admin', 'teacher', 'student'];
        const found = priorityOrder.find(r => userData.roles.includes(r));
        if (found) return found;
        return userData.roles[0];
    }
    if (userData.role) return String(userData.role).toLowerCase().trim();
    if (userData.Role) return String(userData.Role).toLowerCase().trim();
    return 'student';
};


/**
 * Normalizes raw Firestore data into a consistent user schema.
 * Handles legacy field names (UpperCase) and provides sensible defaults.
 */
const sanitizeNameField = (str) => {
    if (typeof str !== "string") return str;
    return str
        .replace(/[\u0000-\u001F]/g, " ")  // control chars -> space
        .replace(/\s{2,}/g, " ")            // collapse multiple spaces
        .trim();
};

export const normalizeUserData = (docId, rawData) => {
    if (!rawData) return null;

    const email = (rawData.email || rawData.Email || "").toLowerCase().trim();
    const roles = normalizeRoles(rawData);
    
    // Sanitize raw inputs
    const prefix = sanitizeNameField(rawData.prefix || rawData.Prefix || rawData.Title || "");
    const firstName = sanitizeNameField(rawData.firstName || rawData.FirstName || "");
    const lastName = sanitizeNameField(rawData.lastName || rawData.LastName || "");
    
    const rawName = sanitizeNameField(rawData.name || rawData.displayName || rawData.Name || "");

    // Construct name if missing, handle all variants
    let name = rawName || `${prefix}${firstName} ${lastName}`.trim() || "Unknown";
    name = sanitizeNameField(name);

    if (prefix && name && !name.startsWith(prefix)) {
        name = `${prefix}${name}`;
        name = sanitizeNameField(name);
    }

    let updatedAt = rawData.updatedAt || null;
    if (updatedAt && typeof updatedAt.toDate === 'function') {
        updatedAt = updatedAt.toDate().toISOString();
    }

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
        homeroomClass: (rawData.homeroomClass || "").toString().trim(),
        updatedAt
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

        // 1. Search for whitelisted documents first (get all matching documents to filter out the UID one)
        const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const qLegacy = query(collection(db, "users"), where("Email", "==", normalizedEmail));
            querySnapshot = await getDocs(qLegacy);
        }

        // 2. Check if the direct UID document already exists
        const directDocRef = doc(db, "users", uid);
        const directDoc = await getDoc(directDocRef);

        // Filter out the active UID document to find the actual whitelist document
        const whitelistDocs = querySnapshot.docs.filter(d => d.id !== uid);

        if (whitelistDocs.length === 0) {
            // No separate whitelist document found - use existing UID document if it exists
            if (directDoc.exists()) {
                console.log(`No whitelist found, using existing UID document for ${normalizedEmail}`);
                return normalizeUserData(directDoc.id, directDoc.data());
            }
            console.warn(`Email-based lookup: No whitelisted user found for email: ${normalizedEmail}`);
            return null;
        }

        const whitelistDoc = whitelistDocs[0];
        const whitelistData = whitelistDoc.data();
        
        // Normalize both sources to prepare for merge
        const normalizedWhitelist = normalizeUserData(whitelistDoc.id, whitelistData);
        const normalizedUid = directDoc.exists() ? normalizeUserData(directDoc.id, directDoc.data()) : {};

        // 3. Perform a safe merge - Administrative whitelist fields take precedence,
        // but we preserve existing name fields if the whitelist fields are empty/missing or default to "Unknown"
        const merged = {
            ...normalizedUid,
            ...normalizedWhitelist,
        };

        const nameFields = ['firstName', 'lastName', 'name', 'displayName'];
        nameFields.forEach(field => {
            const wVal = normalizedWhitelist[field]?.trim();
            const uVal = normalizedUid[field]?.trim();
            if ((!wVal || wVal === 'Unknown') && uVal && uVal !== 'Unknown') {
                merged[field] = normalizedUid[field];
            }
        });

        // Derive primary role fields for legacy compatibility
        const primary = derivePrimaryRole(merged);
        merged.role = primary;
        merged.Role = primary;

        // Ensure system variables are properly constrained
        merged.uid = uid;
        merged.id = normalizedWhitelist.id || normalizedUid.id || whitelistDoc.id;
        merged.createdAt = normalizedUid.createdAt || normalizedWhitelist.createdAt || new Date().toISOString();
        merged.updatedAt = new Date().toISOString();

        // Write the merged document back to Firestore
        await setDoc(directDocRef, merged, { merge: true });
        console.log(`Synced whitelist data into UID document ${uid} for ${normalizedEmail}`);

        return merged;

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
        const roles = Array.isArray(userData.roles) && userData.roles.length > 0
            ? userData.roles
            : [derivePrimaryRole(userData)];
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
            prefix: userData.prefix || '',
            studentId: userData.studentId || '',
            homeroomClass: userData.homeroomClass || '',
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
 * Helper to remove undefined or null values from an object.
 */
const removeUndefined = (obj) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
    );

export const updateUser = async (userId, userData) => {
    try {
        const userRef = doc(db, "users", userId);
        
        // Fetch existing data to preserve fields like status
        const snap = await getDoc(userRef);
        const existing = snap.exists() ? snap.data() : {};

        // Merge roles if provided, otherwise keep existing
        let cleanRoles = existing.roles || [];
        let primaryRole = derivePrimaryRole(existing);

        if (userData.roles || userData.role || userData.Role) {
            const rolesInput = Array.isArray(userData.roles) ? userData.roles : [derivePrimaryRole(userData)];
            cleanRoles = [...new Set(rolesInput.map(r => r ? String(r).toLowerCase().trim() : '').filter(r => r !== ''))];
            if (cleanRoles.length > 0) primaryRole = cleanRoles[0];
        }

        const updateData = removeUndefined({
            displayName: userData.name || userData.displayName,
            email: userData.email || (userData.email === undefined ? auth.currentUser?.email : undefined),
            roles: cleanRoles.length > 0 ? cleanRoles : undefined,
            role: primaryRole,
            Role: primaryRole,
            permissions: userData.permissions,
            status: userData.status ?? existing.status ?? "active",
            batchYear: userData.batchYear,
            class: userData.class,
            level: userData.level,
            gender: userData.gender,
            prefix: userData.prefix,
            studentId: userData.studentId,
            citizenId: userData.citizenId,
            homeroomClass: userData.homeroomClass === null ? "" : userData.homeroomClass,
            updatedAt: serverTimestamp()
        });

        const email = (existing.email || existing.Email || userData.email || '').toLowerCase().trim();
        const batch = writeBatch(db);

        // Write updates to the main document being edited
        batch.set(userRef, updateData, { merge: true });

        // Find the paired document (whitelist or UID) and write to sync it
        if (email) {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            const pairedDocs = querySnapshot.docs.filter(d => d.id !== userId);

            // Fallback for Email (legacy field) if no new email matched
            if (pairedDocs.length === 0) {
                const qLegacy = query(collection(db, "users"), where("Email", "==", email));
                const legacySnap = await getDocs(qLegacy);
                legacySnap.docs.filter(d => d.id !== userId).forEach(d => pairedDocs.push(d));
            }

            pairedDocs.forEach(pairedDoc => {
                const pairedRef = doc(db, "users", pairedDoc.id);
                // Exclude fields that are specific to the document (like uid, id, createdAt)
                const { uid: _ignoreUid, id: _ignoreId, createdAt: _ignoreCreatedAt, ...syncableUpdates } = updateData;
                batch.set(pairedRef, syncableUpdates, { merge: true });
            });
        }

        await batch.commit();
        return updateData;
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

            const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [derivePrimaryRole(user)];
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
                prefix: (user.prefix || '').toString(),
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
