import { db } from "./firebase.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    writeBatch,
    arrayUnion,
    Timestamp,
    runTransaction
} from "firebase/firestore";
import { normalizeUserData } from "./userService.js";


// Helper to remove undefined or null values from an object before Firestore operations
const removeUndefined = (obj) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
    );

// ==========================================
// SECTION 1: SDQ Scoring Engine
// ==========================================

// SDQ_CONFIG — Changing this object dynamically adapts mappings and thresholds once the official license is obtained.
export const SDQ_CONFIG = {
    totalItems: 25,
    subscales: {
        emotional: {
            items: [2, 7, 12, 15, 23],
            reverseItems: [],
        },
        conduct: {
            items: [4, 6, 11, 17, 21],
            reverseItems: [6],
        },
        hyperactivity: {
            items: [1, 9, 14, 20, 24],
            reverseItems: [20, 24],
        },
        peer: {
            items: [5, 10, 13, 18, 22],
            reverseItems: [10, 13],
        },
        prosocial: {
            items: [0, 3, 8, 16, 19],
            reverseItems: [],
        },
    },
    
    // Impact configuration structure for Part 2 Form
    impactConfig: {
        hasImpactProblemsOptions: ['no', 'minor', 'definite', 'severe'],
        fourPointScale: ['not_at_all', 'only_a_little', 'quite_a_lot', 'a_great_deal'],
        durationOptions: ['less_than_1_month', '1_to_5_months', '6_to_12_months', 'more_than_1_year'],
        socialImpairmentDomains: {
            teacher: ['peer', 'classroom'],
            parent: ['home', 'peer', 'classroom', 'leisure'],
            student: ['home', 'peer', 'classroom', 'leisure'],
        },
    },

    // Band thresholds — separated by informantType (DMH ranges)
    bands: {
        parent: {
            totalDifficulty: { normal: [0, 13], risk: [14, 16], problem: [17, 40] },
            emotional:       { normal: [0, 4],  risk: [5, 5],   problem: [6, 10] },
            conduct:         { normal: [0, 2],  risk: [3, 3],   problem: [4, 10] },
            hyperactivity:   { normal: [0, 5],  risk: [6, 6],   problem: [7, 10] },
            peer:            { normal: [0, 2],  risk: [3, 3],   problem: [4, 10] },
            prosocial:       { normal: [6, 10], risk: [5, 5],   problem: [0, 4] },
        },
        teacher: {
            totalDifficulty: { normal: [0, 11], risk: [12, 15], problem: [16, 40] },
            emotional:       { normal: [0, 4],  risk: [5, 5],   problem: [6, 10] },
            conduct:         { normal: [0, 2],  risk: [3, 3],   problem: [4, 10] },
            hyperactivity:   { normal: [0, 5],  risk: [6, 6],   problem: [7, 10] },
            peer:            { normal: [0, 3],  risk: [4, 4],   problem: [5, 10] },
            prosocial:       { normal: [6, 10], risk: [5, 5],   problem: [0, 4] },
        },
        student: {
            totalDifficulty: { normal: [0, 15], risk: [16, 19], problem: [20, 40] },
            emotional:       { normal: [0, 5],  risk: [6, 6],   problem: [7, 10] },
            conduct:         { normal: [0, 3],  risk: [4, 4],   problem: [5, 10] },
            hyperactivity:   { normal: [0, 5],  risk: [6, 6],   problem: [7, 10] },
            peer:            { normal: [0, 3],  risk: [4, 5],   problem: [6, 10] },
            prosocial:       { normal: [6, 10], risk: [5, 5],   problem: [0, 4] },
        },
    },

    // requires9Q trigger
    requires9QThreshold: {
        emotional: 5,   // emotional subscale >= threshold -> requires9Q
    },
};

// เรียกครั้งเดียวตอน module load — throw error ทันทีถ้า config ผิด
function validateSDQConfigIntegrity(config) {
    const allItems = Object.values(config.subscales).flatMap(s => s.items);
    const uniqueItems = new Set(allItems);
    if (allItems.length !== uniqueItems.size) {
        throw new Error(
            'SDQ_CONFIG error: item index ซ้ำกันข้าม subscale — ตรวจสอบ mapping ใหม่'
        );
    }
    if (uniqueItems.size !== config.totalItems) {
        console.warn(
            `SDQ_CONFIG warning: ใช้ item index ${uniqueItems.size}/${config.totalItems} เท่านั้น`
        );
    }
}
validateSDQConfigIntegrity(SDQ_CONFIG);

/**
 * Calculates a single subscale score.
 * @param {number[]} responses - Responses array (0-based)
 * @param {string} subscaleKey - Key from SDQ_CONFIG.subscales
 * @returns {number} The calculated score
 */
export function calcSubscaleScore(responses, subscaleKey) {
    const subscale = SDQ_CONFIG.subscales[subscaleKey];
    if (!subscale) return 0;

    let score = 0;
    for (const itemIdx of subscale.items) {
        const val = responses[itemIdx] ?? 0;
        if (subscale.reverseItems.includes(itemIdx)) {
            score += (2 - val);
        } else {
            score += val;
        }
    }
    return score;
}

/**
 * Calculates Impact Score from impactAssessment object.
 * @param {Object} impactAssessment - The impact assessment data object
 * @param {string} informantType - 'teacher' | 'parent' | 'student'
 * @returns {number} The calculated score
 */
export function calculateImpactScore(impactAssessment, informantType) {
    if (!impactAssessment || impactAssessment.hasImpactProblems === 'no') {
        return 0;
    }

    let score = 0;
    const scoreMap = { 
        not_at_all: 0, 
        only_a_little: 0, 
        quite_a_lot: 1, 
        a_great_deal: 1 
    };

    score += scoreMap[impactAssessment.distress] || 0;
    score += scoreMap[impactAssessment.burdenOnOthers] || 0;

    const domains = informantType === 'teacher'
        ? ['peer', 'classroom']
        : ['home', 'peer', 'classroom', 'leisure'];

    domains.forEach(domain => {
        score += scoreMap[impactAssessment.socialImpairment?.[domain]] || 0;
    });

    return score;
}

/**
 * Calculates all subscales, total difficulty score, impact score, bands, and 9Q requirement trigger.
 * @param {number[]} responses - Responses array (0-based)
 * @param {string} informantType - 'teacher' | 'parent' | 'student'
 * @param {Object} impactAssessment - Impact assessment details
 * @returns {Object} Calculated result metadata
 */
export function calculateSDQResult(responses, informantType, impactAssessment = null) {
    const emotional = calcSubscaleScore(responses, 'emotional');
    const conduct = calcSubscaleScore(responses, 'conduct');
    const hyperactivity = calcSubscaleScore(responses, 'hyperactivity');
    const peer = calcSubscaleScore(responses, 'peer');
    const prosocial = calcSubscaleScore(responses, 'prosocial');

    const totalDifficultyScore = emotional + conduct + hyperactivity + peer;
    const impactScore = calculateImpactScore(impactAssessment, informantType);

    const thresholds = SDQ_CONFIG.bands[informantType];
    if (!thresholds) {
        throw new Error(`Invalid informantType: ${informantType}`);
    }

    const getSubscaleBand = (score, threshold) => {
        if (score >= threshold.problem[0] && score <= threshold.problem[1]) return 'abnormal';
        if (score >= threshold.risk[0] && score <= threshold.risk[1]) return 'borderline';
        return 'normal';
    };

    const subscaleBands = {
        emotional: getSubscaleBand(emotional, thresholds.emotional),
        conduct: getSubscaleBand(conduct, thresholds.conduct),
        hyperactivity: getSubscaleBand(hyperactivity, thresholds.hyperactivity),
        peer: getSubscaleBand(peer, thresholds.peer),
        prosocial: getSubscaleBand(prosocial, thresholds.prosocial),
    };

    // Calculate overall band
    const totalThreshold = thresholds.totalDifficulty;
    let band = 'normal';
    if (totalDifficultyScore >= totalThreshold.problem[0] && totalDifficultyScore <= totalThreshold.problem[1]) {
        band = 'abnormal';
    } else if (totalDifficultyScore >= totalThreshold.risk[0] && totalDifficultyScore <= totalThreshold.risk[1]) {
        band = 'borderline';
    }

    // requires9Q trigger
    const requires9QEmotional = emotional >= SDQ_CONFIG.requires9QThreshold.emotional;
    const impactThreshold = informantType === 'teacher' ? 1 : 2;
    const requires9QImpact = impactScore >= impactThreshold;
    const requires9Q = requires9QEmotional || requires9QImpact;

    const reasons = [];
    if (requires9QEmotional) reasons.push("emotional");
    if (requires9QImpact) reasons.push("impact");
    const requires9QReason = reasons.length > 0 ? reasons.join(",") : null;

    return {
        emotional,
        conduct,
        hyperactivity,
        peer,
        prosocial,
        totalDifficultyScore,
        impactScore,
        band,
        requires9Q,
        requires9QReason,
        subscaleBands
    };
}

/**
 * Resolves assessment band and requires9Q flag into traffic light status.
 * @param {string} band - 'normal' | 'borderline' | 'abnormal'
 * @param {boolean} requires9Q - Whether 9Q is required
 * @returns {string} 'green' | 'yellow' | 'red'
 */
export function getTrafficLight(band, requires9Q) {
    if (band === 'abnormal' || requires9Q) return 'red';
    if (band === 'borderline') return 'yellow';
    return 'green';
}

/**
 * Aggregates SDQ results for parent, teacher, and student for comparison reports/PDFs.
 * @param {Array} sdqAssessments - Array of assessment document snapshots
 * @returns {Object} Unified aggregated object
 */
export function aggregateSDQResults(sdqAssessments) {
    if (!Array.isArray(sdqAssessments)) {
        return {
            byInformant: { teacher: null, parent: null, student: null },
            overallTrafficLight: 'green',
            requiresAttention: false
        };
    }

    const getTimestampMs = (val) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds ?? 0) / 1000000;
        if (val instanceof Date) return val.getTime();
        return new Date(val).getTime();
    };

    // Sort descending by completion time to find the newest assessment per informant
    const sorted = [...sdqAssessments].sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));

    const byInformant = { teacher: null, parent: null, student: null };
    for (const ass of sorted) {
        const inf = ass.informantType;
        if (inf && byInformant[inf] === null) {
            byInformant[inf] = ass;
        }
    }

    const lights = [];
    for (const inf of ['teacher', 'parent', 'student']) {
        const ass = byInformant[inf];
        if (ass && ass.result) {
            const light = getTrafficLight(ass.result.band, ass.result.requires9Q);
            lights.push(light);
        }
    }

    let overallTrafficLight = 'green';
    let requiresAttention = false;

    if (lights.includes('red')) {
        overallTrafficLight = 'red';
        requiresAttention = true;
    } else if (lights.includes('yellow')) {
        overallTrafficLight = 'yellow';
        requiresAttention = true;
    }

    return {
        byInformant,
        overallTrafficLight,
        requiresAttention
    };
}

// ==========================================
// SECTION 2: CareCase CRUD
// ==========================================

/**
 * Initiates a new CareCase.
 * @param {Object} data - { studentId, schoolYear, category, notes?, batchId? }
 * @param {Object} currentUser - Current authenticated user details
 * @returns {Promise<string>} Created case ID
 */
export async function createCareCase(data, currentUser) {
    try {
        if (!data.studentId || !data.schoolYear || !data.category) {
            throw new Error("Missing required fields: studentId, schoolYear, category");
        }

        const docRef = doc(collection(db, "careCases"));
        const initiatedBy = currentUser.uid || currentUser.id || "unknown";
        const initiatedByRole = currentUser.roles?.[0] || currentUser.role || 'teacher';

        await setDoc(docRef, removeUndefined({
            studentId: data.studentId,
            schoolYear: data.schoolYear,
            category: data.category,
            notes: data.notes || null,
            batchId: data.batchId || null,
            initiatedBy,
            initiatedByRole,
            status: 'active',
            sharedWith: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }));

        return docRef.id;
    } catch (error) {
        console.error("Error in createCareCase:", error);
        throw error;
    }
}

/**
 * Returns all care cases associated with a single student.
 * @param {string} studentId - Target student ID
 * @returns {Promise<Array>} Array of student care cases
 */
export async function getStudentCareCases(studentId) {
    try {
        const q = query(
            collection(db, "careCases"),
            where("studentId", "==", studentId)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort client-side by createdAt descending to avoid requiring a composite index
        docs.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeB - timeA;
        });
        
        return docs;
    } catch (error) {
        console.error("Error in getStudentCareCases:", error);
        throw error;
    }
}

/**
 * Helper to parse homeroomClass (e.g. "ม.4/2") into level ("ม.4") and class ("2")
 */
function parseHomeroomClass(homeroomClass) {
    if (!homeroomClass) {
        return { level: "", class: "" };
    }
    if (homeroomClass.includes('/')) {
        const [lvl, cls] = homeroomClass.split('/');
        return { level: lvl.trim(), class: cls.trim() };
    }
    return { level: "", class: homeroomClass.trim() };
}

/**
 * Fetches all care cases in a specific classroom homeroom for an academic year.
 * @param {string} homeroomClass - e.g., "ม.4/2"
 * @param {string} schoolYear - Academic year
 * @returns {Promise<Array>} List of classroom care cases
 */
export async function getClassCareCases(homeroomClass, schoolYear) {
    try {
        const { level: parsedLevel, class: parsedClass } = parseHomeroomClass(homeroomClass);
        // 1. Fetch all student IDs in the specified classroom homeroom
        const studentsQuery = parsedLevel ? query(
            collection(db, "users"),
            where("level", "==", parsedLevel),
            where("class", "==", parsedClass),
            where("roles", "array-contains", "student")
        ) : query(
            collection(db, "users"),
            where("class", "==", parsedClass),
            where("roles", "array-contains", "student")
        );
        const studentSnap = await getDocs(studentsQuery);
        const studentIds = studentSnap.docs.map(d => d.id);

        if (studentIds.length === 0) return [];

        // 2. Query careCases using chunking (max 30 ids per Firestore 'in' query)
        const CHUNK_SIZE = 30;
        const promises = [];
        for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
            const chunk = studentIds.slice(i, i + CHUNK_SIZE);
            const q = query(
                collection(db, "careCases"),
                where("studentId", "in", chunk),
                where("schoolYear", "==", schoolYear)
            );
            promises.push(getDocs(q));
        }

        const snapshots = await Promise.all(promises);
        const cases = [];
        snapshots.forEach(snap => {
            snap.forEach(docSnap => {
                cases.push({ id: docSnap.id, ...docSnap.data() });
            });
        });

        // Return sorted descending by creation timestamp
        return cases.sort((a, b) => {
            const tA = a.createdAt?.toMillis?.() || 0;
            const tB = b.createdAt?.toMillis?.() || 0;
            return tB - tA;
        });
    } catch (error) {
        console.error("Error in getClassCareCases:", error);
        throw error;
    }
}

/**
 * Updates status of a CareCase.
 * @param {string} caseId - Target care case ID
 * @param {string} status - 'active' | 'resolved' | 'closed'
 * @param {Object} currentUser - Current user details
 * @returns {Promise<void>}
 */
export async function updateCaseStatus(caseId, status) {
    try {
        const docRef = doc(db, "careCases", caseId);
        const updates = {
            status,
            updatedAt: serverTimestamp()
        };

        if (status === 'resolved' || status === 'closed') {
            updates.resolvedAt = serverTimestamp();
        } else {
            updates.resolvedAt = null;
        }

        await updateDoc(docRef, removeUndefined(updates));
    } catch (error) {
        console.error("Error in updateCaseStatus:", error);
        throw error;
    }
}

/**
 * Shares a CareCase with another teacher/staff member.
 * @param {string} caseId - Target care case ID
 * @param {string} userId - Target user ID to grant share access
 * @param {Object} currentUser - Current user details
 * @returns {Promise<void>}
 */
export async function shareCaseWith(caseId, userId) {
    try {
        const docRef = doc(db, "careCases", caseId);
        await updateDoc(docRef, removeUndefined({
            sharedWith: arrayUnion(userId),
            updatedAt: serverTimestamp()
        }));
    } catch (error) {
        console.error("Error in shareCaseWith:", error);
        throw error;
    }
}

// ==========================================
// SECTION 3: SDQ Assessment CRUD + Token System
// ==========================================

/**
 * Submits a new SDQ assessment.
 * @param {Object} data - { studentId, careCaseId, schoolYear, informantType, assessmentType, responses }
 * @param {Object} currentUser - Current user details
 * @returns {Promise<Object>} Created SDQ assessment metadata & results
 */
export async function submitSDQAssessment(data, currentUser) {
    try {
        if (!data.studentId || !data.schoolYear || !data.informantType || !data.assessmentType || !Array.isArray(data.responses)) {
            throw new Error("Missing required fields: studentId, schoolYear, informantType, assessmentType, responses");
        }

        let classId = "";
        try {
            const studentRef = doc(db, "users", data.studentId);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                const sData = normalizeUserData(studentSnap.id, studentSnap.data());
                classId = (sData.level && sData.class) ? `${sData.level}/${sData.class}` : '';
            }
        } catch (err) {
            console.warn("Could not fetch student details for classId computation:", err);
        }

        const result = calculateSDQResult(data.responses, data.informantType, data.impactAssessment);
        const docRef = doc(collection(db, "sdqAssessments"));

        const payload = removeUndefined({
            studentId: data.studentId,
            classId: classId || null,
            careCaseId: data.careCaseId || null,
            schoolYear: data.schoolYear,
            informantType: data.informantType,
            assessmentType: data.assessmentType,
            responses: data.responses,
            impactAssessment: data.impactAssessment || null,
            result,
            completedBy: currentUser.uid || currentUser.id || "unknown",
            completedByRole: currentUser.roles?.[0] || currentUser.role || 'teacher',
            createdAt: serverTimestamp()
        });

        await setDoc(docRef, payload);
        return { sdqId: docRef.id, result };
    } catch (error) {
        console.error("Error in submitSDQAssessment:", error);
        throw error;
    }
}

/**
 * Returns all SDQ assessments completed within a care case context.
 * @param {string} careCaseId - Associated care case ID
 * @returns {Promise<Array>} List of SDQ assessments
 */
export async function getCaseSDQAssessments(careCaseId) {
    try {
        const q = query(
            collection(db, "sdqAssessments"),
            where("careCaseId", "==", careCaseId)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort client-side by createdAt descending to avoid index requirement
        docs.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeB - timeA;
        });
        
        return docs;
    } catch (error) {
        console.error("Error in getCaseSDQAssessments:", error);
        throw error;
    }
}

/**
 * Returns all SDQ assessments for a student in a specific school year.
 * @param {string} studentId - Student ID
 * @param {string} schoolYear - Academic school year
 * @returns {Promise<Array>} List of SDQ assessments
 */
export async function getStudentSDQAssessments(studentId, schoolYear, classId = null) {
    try {
        const constraints = [
            where("studentId", "==", studentId),
            where("schoolYear", "==", schoolYear)
        ];
        if (classId) {
            constraints.push(where("classId", "==", classId));
        }
        const q = query(collection(db, "sdqAssessments"), ...constraints);
        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort client-side by createdAt descending to avoid index requirement
        docs.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeB - timeA;
        });
        
        return docs;
    } catch (error) {
        console.error("Error in getStudentSDQAssessments:", error);
        throw error;
    }
}

/**
 * Links one or more SDQ assessments to a CareCase.
 * @param {Array<string>} sdqIds - SDQ Assessment IDs to link
 * @param {string} careCaseId - CareCase ID to link to
 * @param {Object} currentUser - Current user details
 * @returns {Promise<void>}
 */
export async function linkSDQToCase(sdqIds, careCaseId) {
    try {
        if (!Array.isArray(sdqIds) || sdqIds.length === 0) return;
        const batch = writeBatch(db);
        
        for (const sdqId of sdqIds) {
            const docRef = doc(db, "sdqAssessments", sdqId);
            batch.update(docRef, {
                careCaseId: careCaseId,
                updatedAt: serverTimestamp()
            });
        }
        
        await batch.commit();
    } catch (error) {
        console.error("Error in linkSDQToCase:", error);
        throw error;
    }
}

/**
 * Generates an access token and secure submission URL for parents to complete SDQ anonymously.
 * @param {string} studentId - Student ID
 * @param {Object} currentUser - Current user details
 * @param {string|null} careCaseId - Associated care case ID (optional)
 * @param {string} schoolYear - Academic year (default "2569")
 * @param {number} expiresInDays - Expiration buffer (default 30 days)
 * @returns {Promise<Object>} Token details and url
 */
export async function generateParentSDQToken(studentId, currentUser, careCaseId = null, schoolYear = "2569", expiresInDays = 30) {
    try {
        const token = crypto.randomUUID();
        const tokenRef = doc(db, "sdqTokens", token);
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000));

        let studentName = "";
        let classId = "";
        try {
            const studentRef = doc(db, "users", studentId);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                const sData = normalizeUserData(studentSnap.id, studentSnap.data());
                studentName = sData.name || sData.displayName || "";
                classId = (sData.level && sData.class) ? `${sData.level}/${sData.class}` : '';
            }
        } catch (err) {
            console.warn("Could not fetch student details for token generation:", err);
        }

        await setDoc(tokenRef, removeUndefined({
            token,
            careCaseId: careCaseId || null,
            studentId,
            studentName: studentName || null,
            classId: classId || null,
            schoolYear,
            generatedBy: currentUser.uid || currentUser.id || "unknown",
            createdAt: serverTimestamp(),
            expiresAt,
            usedAt: null
        }));

        return {
            token,
            url: `${window.location.origin}/sdq/parent/${token}`
        };
    } catch (error) {
        console.error("Error in generateParentSDQToken:", error);
        throw error;
    }
}

/**
 * Retrieves the active, unused, unexpired parent SDQ token link for a student.
 * @param {string} studentId - Target student ID
 * @param {string} schoolYear - Academic year
 * @returns {Promise<Object|null>} Token URL and metadata or null
 */
export async function getActiveParentToken(studentId, schoolYear = "2569") {
    try {
        if (!studentId) return null;
        const q = query(
            collection(db, "sdqTokens"),
            where("studentId", "==", studentId),
            where("schoolYear", "==", schoolYear)
        );
        const snap = await getDocs(q);
        const now = new Date();
        
        const active = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .find(tData => {
                const isUsed = !!tData.usedAt;
                const expiresDate = tData.expiresAt?.toDate 
                    ? tData.expiresAt.toDate() 
                    : new Date(tData.expiresAt);
                const isExpired = expiresDate < now;
                return !isUsed && !isExpired;
            });

        if (active) {
            return {
                token: active.token,
                url: `${window.location.origin}/sdq/parent/${active.token}`,
                expiresAt: active.expiresAt
            };
        }
        return null;
    } catch (error) {
        console.error("Error in getActiveParentToken:", error);
        return null;
    }
}

/**
 * Validates a parent SDQ completion token link.
 * @param {string} token - Target link token
 * @returns {Promise<Object>} Validity status and reason/metadata
 */
export async function validateSDQToken(token) {
    try {
        if (!token) return { valid: false, reason: "tokenInvalid" };

        const tokenRef = doc(db, "sdqTokens", token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            return { valid: false, reason: "tokenInvalid" };
        }

        const data = tokenSnap.data();

        if (data.usedAt) {
            return { valid: false, reason: "tokenUsed" };
        }

        const now = new Date();
        const expiresAtDate = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAtDate < now) {
            return { valid: false, reason: "tokenExpired" };
        }

        return {
            valid: true,
            studentId: data.studentId,
            studentName: data.studentName || null,
            careCaseId: data.careCaseId || null,
            schoolYear: data.schoolYear || "2569"
        };
    } catch (error) {
        console.error("Error in validateSDQToken:", error);
        return { valid: false, reason: "tokenInvalid" };
    }
}

/**
 * Submits parent SDQ anonymously using validation metadata inside a transaction.
 * @param {string} token - Secure linkage token
 * @param {number[]} responses - SDQ answers array
 * @returns {Promise<Object>} Submission status and result
 */
export async function submitParentSDQ(token, responses, impactAssessment = null) {
    try {
        const tokenRef = doc(db, 'sdqTokens', token);

        const result = await runTransaction(db, async (transaction) => {
            // 1. Read token within transaction
            const tokenSnap = await transaction.get(tokenRef);

            if (!tokenSnap.exists()) {
                throw new Error('tokenInvalid');
            }
            const tokenData = tokenSnap.data();

            if (tokenData.usedAt) {
                throw new Error('tokenUsed');
            }

            const now = new Date();
            const expiresAtDate = tokenData.expiresAt?.toDate
                ? tokenData.expiresAt.toDate()
                : new Date(tokenData.expiresAt);
            if (expiresAtDate < now) {
                throw new Error('tokenExpired');
            }

            // 2. Calculate SDQ result (pure function)
            const sdqResult = calculateSDQResult(responses, 'parent', impactAssessment);

            // 3. Create document reference for assessment
            const sdqRef = doc(collection(db, 'sdqAssessments'));

            // 4. Write assessment within the transaction
            transaction.set(sdqRef, removeUndefined({
                studentId: tokenData.studentId,
                classId: tokenData.classId || null,
                careCaseId: tokenData.careCaseId || null,
                schoolYear: tokenData.schoolYear || "2569",
                informantType: 'parent',
                assessmentType: tokenData.assessmentType || 'initial',
                completedBy: 'parent_token',
                responses,
                impactAssessment: impactAssessment || null,
                ...sdqResult,
                completedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            }));

            // 5. Invalidate/close token within the transaction
            transaction.update(tokenRef, {
                usedAt: serverTimestamp(),
            });

            return { sdqId: sdqRef.id, result: sdqResult };
        });

        return { success: true, ...result };
    } catch (error) {
        const knownReasons = ['tokenInvalid', 'tokenUsed', 'tokenExpired'];
        const reason = knownReasons.includes(error.message)
            ? error.message
            : 'tokenInvalid';
        console.error('Error in submitParentSDQ:', error);
        return { success: false, reason };
    }
}

// ==========================================
// SECTION 4: HomeVisit CRUD
// ==========================================

/**
 * Records a home visit event.
 * @param {Object} data - { studentId, schoolYear, visitType, careCaseId?, visitorIds, visitDate }
 * @param {Object} currentUser - Current user details
 * @returns {Promise<string>} Created home visit document ID
 */
export async function createHomeVisit(data, currentUser) {
    try {
        if (!data.studentId || !data.schoolYear || !data.visitType || !data.visitDate) {
            throw new Error("Missing required fields: studentId, schoolYear, visitType, visitDate");
        }
        if (data.visitType === 'reactive' && !data.careCaseId) {
            throw new Error("Reactive visit requires a careCaseId");
        }

        const docRef = doc(collection(db, "homeVisits"));
        const createdBy = currentUser.uid || currentUser.id || "unknown";

        await setDoc(docRef, removeUndefined({
            studentId: data.studentId,
            schoolYear: data.schoolYear,
            visitType: data.visitType,
            careCaseId: data.careCaseId || null,
            visitorIds: data.visitorIds || [],
            visitDate: data.visitDate,
            createdBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }));

        return docRef.id;
    } catch (error) {
        console.error("Error in createHomeVisit:", error);
        throw error;
    }
}

/**
 * Connects a proactive home visit record to a care case post-creation.
 * @param {string} visitId - Target home visit ID
 * @param {string} careCaseId - Associated care case ID
 * @param {Object} currentUser - Current user details
 * @returns {Promise<void>}
 */
export async function linkVisitToCase(visitId, careCaseId) {
    try {
        const docRef = doc(db, "homeVisits", visitId);
        await updateDoc(docRef, removeUndefined({
            careCaseId,
            updatedAt: serverTimestamp()
        }));
    } catch (error) {
        console.error("Error in linkVisitToCase:", error);
        throw error;
    }
}

/**
 * Submits detailed findings and notes for a home visit event.
 * @param {string} visitId - Target home visit ID
 * @param {Object} data - { findings, photoUrls, followUpRequired, followUpNote }
 * @param {Object} currentUser - Current user details
 * @returns {Promise<void>}
 */
export async function submitVisitReport(visitId, data, currentUser) {
    try {
        const docRef = doc(db, "homeVisits", visitId);
        const reportSubmittedBy = currentUser.uid || currentUser.id || "unknown";

        await updateDoc(docRef, removeUndefined({
            findings: data.findings,
            photoUrls: data.photoUrls || [],
            followUpRequired: data.followUpRequired ?? false,
            followUpNote: data.followUpNote || null,
            reportSubmittedBy,
            reportSubmittedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }));
    } catch (error) {
        console.error("Error in submitVisitReport:", error);
        throw error;
    }
}

/**
 * Retrieves all home visit entries for a student in a specific school year.
 * @param {string} studentId - Student ID
 * @param {string} schoolYear - Academic year
 * @returns {Promise<Array>} List of home visits
 */
export async function getStudentHomeVisits(studentId, schoolYear) {
    try {
        const q = query(
            collection(db, "homeVisits"),
            where("studentId", "==", studentId),
            where("schoolYear", "==", schoolYear)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort client-side by visitDate descending
        docs.sort((a, b) => {
            const getVal = (x) => {
                if (!x) return 0;
                if (x.toMillis) return x.toMillis();
                if (x.seconds) return x.seconds * 1000;
                const parsed = Date.parse(x);
                return isNaN(parsed) ? 0 : parsed;
            };
            return getVal(b.visitDate) - getVal(a.visitDate);
        });
        
        return docs;
    } catch (error) {
        console.error("Error in getStudentHomeVisits:", error);
        throw error;
    }
}

/**
 * Calculates a classroom-wide summary of SDQ completion rates and risk statistics.
 * @param {string} homeroomClass - e.g., "ม.4/2"
 * @param {string} schoolYear - e.g., "2569"
 * @returns {Promise<Object>} Aggregated dashboard data
 */
export async function getClassSDQSummary(homeroomClass, schoolYear) {
    try {
        if (!homeroomClass || !schoolYear) {
            throw new Error("Missing required parameters: homeroomClass, schoolYear");
        }

        const { level: parsedLevel, class: parsedClass } = parseHomeroomClass(homeroomClass);

        // 1. Fetch all student users in this homeroom class
        const studentsQuery = parsedLevel ? query(
            collection(db, "users"),
            where("level", "==", parsedLevel),
            where("class", "==", parsedClass),
            where("roles", "array-contains", "student")
        ) : query(
            collection(db, "users"),
            where("class", "==", parsedClass),
            where("roles", "array-contains", "student")
        );
        const studentSnap = await getDocs(studentsQuery);
        const mergedMap = {};
        studentSnap.docs.forEach(docSnap => {
            const userData = normalizeUserData(docSnap.id, docSnap.data());
            const email = userData.email;
            if (!email) {
                mergedMap[docSnap.id] = userData;
                return;
            }
            if (!mergedMap[email]) {
                mergedMap[email] = userData;
            } else {
                const existing = mergedMap[email];
                if (userData.uid && !existing.uid) {
                    mergedMap[email] = userData;
                }
            }
        });
        const students = Object.values(mergedMap);

        const totalStudents = students.length;

        if (totalStudents === 0) {
            return {
                completionStats: {
                    teacher: { completed: 0, total: 0 },
                    parent: { completed: 0, total: 0 },
                    student: { completed: 0, total: 0 }
                },
                studentRiskList: [],
                colorCounts: { green: 0, yellow: 0, red: 0 }
            };
        }

        // 2. Fetch care cases for the classroom
        const cases = await getClassCareCases(homeroomClass, schoolYear);
        const caseMap = {};
        cases.forEach(c => {
            caseMap[c.studentId] = c;
        });

        // 3. Fetch SDQ assessments and tokens for the classroom in parallel using the classId index
        const sdqQuery = query(
            collection(db, "sdqAssessments"),
            where("classId", "==", homeroomClass),
            where("schoolYear", "==", schoolYear)
        );
        const tokenQuery = query(
            collection(db, "sdqTokens"),
            where("classId", "==", homeroomClass),
            where("schoolYear", "==", schoolYear)
        );

        const [sdqSnap, tokenSnap] = await Promise.all([
            getDocs(sdqQuery),
            getDocs(tokenQuery)
        ]);
        
        const studentAssessmentsMap = {};
        sdqSnap.forEach(docSnap => {
            const data = { id: docSnap.id, ...docSnap.data() };
            const sId = data.studentId;
            if (!studentAssessmentsMap[sId]) {
                studentAssessmentsMap[sId] = [];
            }
            studentAssessmentsMap[sId].push(data);
        });

        const tokenMap = {};
        const now = new Date();
        tokenSnap.forEach(docSnap => {
            const tData = docSnap.data();
            const sId = tData.studentId;
            const isUsed = !!tData.usedAt;
            const expiresDate = tData.expiresAt?.toDate 
                ? tData.expiresAt.toDate() 
                : new Date(tData.expiresAt);
            const isExpired = expiresDate < now;
            if (!isUsed && !isExpired) {
                tokenMap[sId] = `${window.location.origin}/sdq/parent/${tData.token}`;
            }
        });

        // 4. Calculate summaries
        let teacherCompleted = 0;
        let parentCompleted = 0;
        let studentCompleted = 0;

        let greenCount = 0;
        let yellowCount = 0;
        let redCount = 0;

        const studentRiskList = students.map(s => {
            const sCase = caseMap[s.id];
            const assessments = studentAssessmentsMap[s.id] || [];

            // Update completion counts
            const hasTeacher = assessments.some(a => a.informantType === 'teacher');
            const hasParent = assessments.some(a => a.informantType === 'parent');
            const hasStudent = assessments.some(a => a.informantType === 'student');

            if (hasTeacher) teacherCompleted++;
            if (hasParent) parentCompleted++;
            if (hasStudent) studentCompleted++;

            const aggregation = aggregateSDQResults(assessments);
            
            let trafficLight = null;
            let requires9Q = false;

            if (assessments.length > 0) {
                trafficLight = aggregation.overallTrafficLight;
                
                // Set requires9Q to true if ANY completed assessment flags requires9Q
                requires9Q = assessments.some(a => a.result?.requires9Q === true);

                if (trafficLight === 'red') redCount++;
                else if (trafficLight === 'yellow') yellowCount++;
                else if (trafficLight === 'green') greenCount++;
            }

            const riskSubscales = [];
            assessments.forEach(a => {
                if (a.result?.subscaleBands) {
                    Object.entries(a.result.subscaleBands).forEach(([subKey, band]) => {
                        if (band === 'borderline' || band === 'abnormal') {
                            if (!riskSubscales.includes(subKey)) {
                                riskSubscales.push(subKey);
                            }
                        }
                    });
                }
            });

            return {
                studentId: s.id,
                name: s.name,
                studentNo: s.studentId || '',
                trafficLight,
                requires9Q,
                caseId: sCase ? sCase.id : null,
                riskSubscales,
                parentLink: tokenMap[s.id] || null
            };
        });

        return {
            completionStats: {
                teacher: { completed: teacherCompleted, total: totalStudents },
                parent: { completed: parentCompleted, total: totalStudents },
                student: { completed: studentCompleted, total: totalStudents }
            },
            studentRiskList: studentRiskList.sort((a, b) => {
                // Default sort order: Red first, then Yellow, then Green, then No Data
                const priority = { red: 0, yellow: 1, green: 2, null: 3 };
                const pA = priority[a.trafficLight] ?? 3;
                const pB = priority[b.trafficLight] ?? 3;
                return pA - pB;
            }),
            colorCounts: {
                green: greenCount,
                yellow: yellowCount,
                red: redCount
            }
        };
    } catch (error) {
        console.error("Error in getClassSDQSummary:", error);
        throw error;
    }
}
