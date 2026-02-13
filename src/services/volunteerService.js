import { db } from "./firebase";
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    doc, 
    runTransaction, 
    serverTimestamp 
} from "firebase/firestore";

const JOBS_COLLECTION = "volunteer_jobs";
const APPLICATIONS_COLLECTION = "volunteer_applications";

/**
 * Fetches all active volunteer jobs.
 * @returns {Promise<Array>} Array of job objects with ID.
 */
export const fetchAvailableJobs = async () => {
    try {
        const q = query(
            collection(db, JOBS_COLLECTION), 
            where("status", "==", "active")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching volunteer jobs:", error);
        throw error;
    }
};

/**
 * Fetches all applications for a specific student.
 * @param {string} studentId - The ID of the student document.
 * @returns {Promise<Array>} Array of application objects.
 */
export const fetchStudentApplications = async (studentId) => {
    try {
        const q = query(
            collection(db, APPLICATIONS_COLLECTION),
            where("studentId", "==", studentId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching student applications:", error);
        throw error;
    }
};

/**
 * Applies for a volunteer job using a transaction to ensure data integrity.
 * @param {string} jobId - The ID of the job to apply for.
 * @param {string} studentId - The ID of the student.
 * @param {string} studentName - The name of the student (for display purposes).
 * @returns {Promise<void>}
 */
export const applyForJob = async (jobId, studentId, studentName) => {
    try {
        await runTransaction(db, async (transaction) => {
            const jobRef = doc(db, JOBS_COLLECTION, jobId);
            const appRef = doc(collection(db, APPLICATIONS_COLLECTION)); // New doc for application

            // 1. Get the job document
            const jobDoc = await transaction.get(jobRef);
            if (!jobDoc.exists()) {
                throw "Job does not exist!";
            }

            const jobData = jobDoc.data();

            // 2. Check if slots are available
            if (jobData.remainingSlots <= 0) {
                throw "This job is full.";
            }

            // 3. Create the application
            transaction.set(appRef, {
                jobId,
                studentId,
                studentName,
                appliedAt: serverTimestamp(),
                status: 'pending' // Optional: if approval is needed later
            });

            // 4. Decrement the remaining slots
            transaction.update(jobRef, {
                remainingSlots: jobData.remainingSlots - 1
            });
        });
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw error;
    }
};
