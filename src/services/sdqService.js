import { db } from "./firebase";
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    serverTimestamp,
    runTransaction
} from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

const SDQ_COLLECTION = "sdq_assessments";

/**
 * Helper to remove undefined or null values from an object.
 */
const removeUndefined = (obj) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
    );

/**
 * 1. Calculates SDQ subscale scores and total difficulties.
 * Handles reverse scoring for questions 7, 11, 14, 21, 25.
 * @param {Object} answers - Format { q1: 0|1|2, ..., q25: 0|1|2 }
 */
export const calculateScores = (answers) => {
    const scores = {};
    const reverseItems = [7, 11, 14, 21, 25];

    // Prepare processed scores (handling reverse logic)
    const p = {};
    for (let i = 1; i <= 25; i++) {
        const val = answers[`q${i}`] ?? 0;
        p[`q${i}`] = reverseItems.includes(i) ? (2 - val) : val;
    }

    // Subscale mapping
    scores.emotional = p.q3 + p.q8 + p.q13 + p.q16 + p.q24;
    scores.conduct = p.q5 + p.q7 + p.q12 + p.q18 + p.q22;
    scores.hyperactivity = p.q2 + p.q10 + p.q15 + p.q21 + p.q25;
    scores.peer = p.q6 + p.q11 + p.q14 + p.q19 + p.q23;
    scores.prosocial = p.q1 + p.q4 + p.q9 + p.q17 + p.q20;

    // Total difficulties (excluding prosocial)
    scores.totalDifficulties = scores.emotional + scores.conduct + scores.hyperactivity + scores.peer;

    return scores;
};

/**
 * 2. Gets evaluation result string based on total difficulties score.
 */
export const getEvaluationResult = (totalDifficulties) => {
    if (totalDifficulties >= 20) return "problem";
    if (totalDifficulties >= 16) return "risk";
    return "normal";
};

/**
 * 3. Submits an SDQ assessment.
 * Write-once logic: prevents overwriting existing assessments.
 */
export const submitSDQ = async ({ 
    studentId, 
    classroomId, 
    academicYear, 
    term, 
    assessorType, 
    assessorId, 
    answers, 
    parentEmail = null, 
    parentPhone = null 
}) => {
    try {
        const docId = `${studentId}_${academicYear}_${term}_${assessorType}`;
        const docRef = doc(db, SDQ_COLLECTION, docId);

        return await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(docRef);
            if (snap.exists()) {
                const error = new Error("Assessment already exists.");
                error.code = "ALREADY_SUBMITTED";
                throw error;
            }

            const scores = calculateScores(answers);
            const evaluationResult = getEvaluationResult(scores.totalDifficulties);

            const data = removeUndefined({
                studentId,
                classroomId,
                academicYear,
                term,
                assessorType,
                assessorId,
                answers,
                scores,
                evaluationResult,
                parentEmail,
                parentPhone,
                createdAt: serverTimestamp()
            });

            transaction.set(docRef, data);
            return { id: docId, ...data };
        });
    } catch (error) {
        if (error.code !== "ALREADY_SUBMITTED") {
            console.error("Error submitting SDQ:", error);
        }
        throw error;
    }
};

/**
 * 4. Generates a unique link token for parents.
 * Updates the student's document with the parentLink object.
 */
export const generateParentToken = async (studentId, teacherId, academicYear) => {
    try {
        const token = uuidv4();
        const userRef = doc(db, "users", studentId);

        const parentLink = {
            token,
            academicYear,
            generatedAt: serverTimestamp(),
            generatedBy: teacherId,
            active: true
        };

        await updateDoc(userRef, { parentLink });
        return token;
    } catch (error) {
        console.error("Error generating parent token:", error);
        throw error;
    }
};

/**
 * 5. Verifies if a parent token is valid for a specific student and year.
 */
export const verifyParentToken = async (token, studentId, academicYear) => {
    try {
        const userRef = doc(db, "users", studentId);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) return false;
        
        const data = snap.data();
        const link = data.parentLink;

        if (!link || !link.active) return false;
        
        return link.token === token && link.academicYear === academicYear;
    } catch (error) {
        console.error("Error verifying parent token:", error);
        return false;
    }
};

/**
 * 6. Retrieves all SDQ results for a specific student in an academic year.
 */
export const getStudentSDQResults = async (studentId, academicYear) => {
    try {
        const q = query(
            collection(db, SDQ_COLLECTION),
            where("studentId", "==", studentId),
            where("academicYear", "==", academicYear)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error fetching student SDQ results:", error);
        throw error;
    }
};

/**
 * 7. Retrieves a classroom-wide SDQ report grouped by student.
 */
export const getClassroomSDQReport = async (classroomId, academicYear, term) => {
    try {
        const q = query(
            collection(db, SDQ_COLLECTION),
            where("classroomId", "==", classroomId),
            where("academicYear", "==", academicYear),
            where("term", "==", term)
        );
        const snap = await getDocs(q);
        const assessments = snap.docs.map(d => d.data());

        // Group by studentId
        const report = {};
        assessments.forEach(ass => {
            if (!report[ass.studentId]) report[ass.studentId] = [];
            report[ass.studentId].push(ass);
        });

        return report;
    } catch (error) {
        console.error("Error fetching classroom SDQ report:", error);
        throw error;
    }
};
