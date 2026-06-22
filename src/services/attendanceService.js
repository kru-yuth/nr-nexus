import { db } from "./firebase";
import { 
    collection, 
    getDocs, 
    getDoc, 
    doc, 
    setDoc, 
    query, 
    where, 
    updateDoc, 
    serverTimestamp,
    addDoc,
    writeBatch,
    deleteDoc,
    orderBy
} from "firebase/firestore";
import { normalizeUserData } from "./userService";

const SUBJECTS_COLLECTION = "subjects";
const SESSIONS_COLLECTION = "attendance_sessions";
const RECORDS_COLLECTION = "attendance_records";

/**
 * Fetches all subjects taught by a specific teacher.
 */
export const getSubjectsByTeacher = async (teacherUid) => {
    try {
        const q = query(
            collection(db, SUBJECTS_COLLECTION), 
            where("teacherUid", "==", teacherUid)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching subjects:", error);
        throw error;
    }
};

/**
 * Fetches a subject by code for a specific teacher.
 */
export const getSubjectByCode = async (teacherUid, code) => {
    try {
        const q = query(
            collection(db, SUBJECTS_COLLECTION), 
            where("teacherUid", "==", teacherUid),
            where("code", "==", code.trim().toUpperCase())
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        return {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
        };
    } catch (error) {
        console.error("Error fetching subject by code:", error);
        throw error;
    }
};

/**
 * Creates a new subject document.
 */
export const createSubject = async (data) => {
    try {
        const docRef = await addDoc(collection(db, SUBJECTS_COLLECTION), {
            ...data,
            code: data.code.trim().toUpperCase(),
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error("Error creating subject:", error);
        throw error;
    }
};

/**
 * Updates a subject document.
 */
export const updateSubject = async (subjectId, data) => {
    try {
        const docRef = doc(db, SUBJECTS_COLLECTION, subjectId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating subject:", error);
        throw error;
    }
};

/**
 * Deletes a subject document.
 */
export const deleteSubject = async (subjectId) => {
    try {
        const docRef = doc(db, SUBJECTS_COLLECTION, subjectId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting subject:", error);
        throw error;
    }
};

/**
 * Updates the rooms list for a subject.
 */
export const updateSubjectRooms = async (subjectId, rooms) => {
    try {
        const docRef = doc(db, SUBJECTS_COLLECTION, subjectId);
        await updateDoc(docRef, {
            rooms: rooms,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error updating subject rooms:", error);
        throw error;
    }
};

/**
 * Fetches any subject globally by code (to auto-fill names).
 */
export const findSubjectNameByCode = async (code) => {
    try {
        const q = query(
            collection(db, SUBJECTS_COLLECTION), 
            where("code", "==", code.trim().toUpperCase())
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        // Return just the name from the first match
        return querySnapshot.docs[0].data().name;
    } catch (error) {
        console.error("Error finding subject name:", error);
        return null;
    }
};

/**
 * Creates or retrieves an attendance session.
 */
export const createSession = async (data) => {
    const { teacherUid, subjectCode, level, class: roomClass, date, period } = data;
    // Session ID: {teacherUid}_{subjectCode}_{level}_{class}_{date}_{period}
    const sessionId = `${teacherUid}_${subjectCode}_${level}_${roomClass}_${date}_${period}`.replace(/[\s./]+/g, '_');
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    
    try {
        const snap = await getDoc(sessionRef);
        if (snap.exists()) return { id: snap.id, ...snap.data() };

        const sessionData = {
            ...data,
            createdAt: serverTimestamp()
        };
        await setDoc(sessionRef, sessionData);
        return { id: sessionId, ...sessionData };
    } catch (error) {
        console.error("Error creating session:", error);
        throw error;
    }
};

/**
 * Fetches a session by ID.
 */
export const getSession = async (sessionId) => {
    try {
        const snap = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
        console.error("Error fetching session:", error);
        throw error;
    }
};

/**
 * Fetches all active students in a specific level and class with deduplication.
 */
export const getStudentsByRoom = async (level, roomClass) => {
    try {
        const q = query(
            collection(db, "users"),
            where("level", "==", level),
            where("class", "==", roomClass),
            where("status", "==", "active"),
            where("roles", "array-contains", "student")
        );
        const querySnapshot = await getDocs(q);
        
        const mergedMap = {};
        querySnapshot.docs.forEach(docSnap => {
            const userData = normalizeUserData(docSnap.id, docSnap.data());
            const email = userData.email;
            if (!email) {
                // If no email, fallback to ID for uniqueness
                mergedMap[docSnap.id] = userData;
                return;
            }

            if (!mergedMap[email]) {
                mergedMap[email] = userData;
            } else {
                const existing = mergedMap[email];
                // Priority: Use UID document if available
                if (userData.uid && !existing.uid) {
                    mergedMap[email] = userData;
                }
                // Accumulate IDs (optional, for debugging)
                if (!existing.allDocIds) existing.allDocIds = [existing.id];
                existing.allDocIds.push(docSnap.id);
            }
        });

        // Convert back to array
        return Object.values(mergedMap);
    } catch (error) {
        console.error("Error fetching students by room:", error);
        throw error;
    }
};

/**
 * Atomic batch save for attendance records.
 */
export const batchSaveRecords = async (sessionId, sessionInfo, records, adminUid) => {
    const { date, subjectCode, level, class: roomClass } = sessionInfo;
    const batch = writeBatch(db);
    const timestamp = serverTimestamp();
    
    records.forEach(rec => {
        const recordId = `${sessionId}_${rec.studentId}`;
        const recordRef = doc(db, RECORDS_COLLECTION, recordId);
        batch.set(recordRef, {
            ...rec,
            sessionId,
            date,
            subjectCode,
            level,
            class: roomClass,
            updatedAt: timestamp,
            updatedBy: adminUid
        }, { merge: true });
    });
    
    await batch.commit();
};

/**
 * Homeroom Advisor Query: Get all attendance records for a specific room.
 */
export const getHomeroomAttendance = async (level, roomClass, startDate, endDate) => {
    try {
        const q = query(
            collection(db, RECORDS_COLLECTION),
            where("level", "==", level),
            where("class", "==", roomClass),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error fetching homeroom attendance:", error);
        throw error;
    }
};

/**
 * Student Detail Query: Get full attendance history for a student.
 */
export const getStudentAttendanceHistory = async (studentId, startDate, endDate) => {
    try {
        const q = query(
            collection(db, RECORDS_COLLECTION),
            where("studentId", "==", studentId),
            where("date", ">=", startDate),
            where("date", "<=", endDate),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error fetching student attendance history:", error);
        throw error;
    }
};

/**
 * Student Personal Query: Get all attendance records for the student.
 */
export const getStudentPersonalAttendance = async (studentId, startDate, endDate) => {
    try {
        const q = query(
            collection(db, RECORDS_COLLECTION),
            where("studentId", "==", studentId),
            where("date", ">=", startDate),
            where("date", "<=", endDate),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error fetching student personal attendance:", error);
        throw error;
    }
};

/**
 * Admin Executive Query: Get school-wide attendance records.
 * Warning: High document read potential. Limit date range in UI.
 */
export const getSchoolAttendance = async (startDate, endDate) => {
    try {
        const q = query(
            collection(db, RECORDS_COLLECTION),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error fetching school-wide attendance:", error);
        throw error;
    }
};

/**
 * Fetches all attendance records for a session.
 */
export const getSessionRecords = async (sessionId) => {
    try {
        const q = query(collection(db, RECORDS_COLLECTION), where("sessionId", "==", sessionId));
        const snap = await getDocs(q);
        const map = {};
        snap.docs.forEach(d => {
            const data = d.data();
            map[data.studentId] = data;
        });
        return map;
    } catch (error) {
        console.error("Error fetching session records:", error);
        throw error;
    }
};

/**
 * Sync with Late Check-in System: Get all late records for a date and room.
 */
export const getLateCheckinsForDate = async (date, level, roomClass) => {
    try {
        const q = query(
            collection(db, "late_checkins"), 
            where("date", "==", date),
            where("level", "==", level),
            where("class", "==", roomClass)
        );
        const snap = await getDocs(q);
        const map = {};
        snap.docs.forEach(d => {
            const data = d.data();
            map[data.studentId] = data;
        });
        return map;
    } catch (error) {
        console.error("Error fetching late checkins for date:", error);
        return {};
    }
};
