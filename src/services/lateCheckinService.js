import { db } from "./firebase";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    serverTimestamp,
    orderBy,
    onSnapshot,
    runTransaction
} from "firebase/firestore";

/**
 * Calculates deduction based on time.
 */
export const getLateDeduction = (now = new Date()) => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const start800 = 8 * 60;
    const end829 = 8 * 60 + 29;
    const start830 = 8 * 60 + 30;

    if (totalMinutes >= start800 && totalMinutes <= end829) {
        return { points: 5, status: "late_minor", label: "08:00 - 08:29 (สายระยะแรก)" };
    } else if (totalMinutes >= start830) {
        return { points: 10, status: "late_major", label: "08:30 เป็นต้นไป (สายมาก)" };
    }
    return { points: 0, status: "early", label: "ยังไม่ถึงเวลาเช็คสาย" };
};

/**
 * Checks if the student has already checked in today.
 */
export const checkTodayRecord = async (uid) => {
    const date = new Date().toISOString().split('T')[0];
    const docId = `${uid}_${date}`;
    const docRef = doc(db, "late_checkins", docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
};

/**
 * Positive reinforcement messages for warnings.
 */
export const positiveMessages = [
    "วันนี้มาช้านิดหน่อย แต่ยังมาอยู่ ถือว่าเก่งมากเลยนะ! 💪",
    "ทุกวันใหม่คือโอกาสใหม่ วันพรุ่งนี้ลองตื่นเร็วขึ้นอีกนิดนะ 🌅",
    "การมาโรงเรียนทุกวันคือก้าวสำคัญของความสำเร็จ เดินหน้าต่อไปนะ! ⭐",
    "วันนี้ขอบคุณที่พยายามมาถึงโรงเรียนนะ พรุ่งนี้เอาใหม่ สู้ๆ! ✌️",
    "เก่งมากที่มาถึง พรุ่งนี้ลองขยับเวลาเร็วขึ้น 5 นาทีดูนะ ⏰",
    "วินัยเริ่มจากเรื่องเล็กๆ วันนี้เริ่มแล้ว พรุ่งนี้ทำให้ดีขึ้นนะ! 📈",
    "วันนี้อาจจะช้าไปบ้าง แต่ความตั้งใจที่จะมาเรียนคือเรื่องดีที่สุด 🌟",
    "มาช้ายังดีกว่าไม่มา ขอบคุณที่ให้ความสำคัญกับการเรียนนะ 🙏",
    "วันนี้พักผ่อนให้เพียงพอ พรุ่งนี้เช้าจะได้สดใสและมาเร็วกว่าเดิม 😴",
    "เราเชื่อว่าคุณทำได้ พรุ่งนี้มาเช็คอินให้ทันเวลานะ เป็นกำลังใจให้! ❤️"
];

/**
 * Counts late records for the student in the current month.
 */
export const getMonthLateCount = async (uid) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;

    const q = query(
        collection(db, "late_checkins"), 
        where("studentId", "==", uid),
        where("date", ">=", `${monthPrefix}-01`),
        where("date", "<=", `${monthPrefix}-31`)
    );
    
    const snap = await getDocs(q);
    return snap.size;
};

/**
 * Atomic transaction operation to record late check-in and update behavior score.
 */
export const processLateCheckin = async (user) => {
    const { points: rawPoints, status: rawStatus } = getLateDeduction();
    
    if (rawStatus === "early") throw new Error("Check-in opens at 08:00.");

    const date = new Date().toISOString().split('T')[0];
    const docId = `${user.uid}_${date}`;
    
    // Grace Period Logic
    let points = rawPoints;
    let status = rawStatus;
    let isWarning = false;
    let warningCount = 0;

    if (rawStatus === "late_minor") {
        warningCount = await getMonthLateCount(user.uid);
        if (warningCount < 3) {
            points = 0;
            status = "warning";
            isWarning = true;
        }
    }

    const checkinRef = doc(db, "late_checkins", docId);
    const scoreRef = doc(db, "behavior_scores", user.uid);
    const historyRef = doc(collection(db, "behavior_scores", user.uid, "history"));

    return await runTransaction(db, async (transaction) => {
        const scoreDoc = await transaction.get(scoreRef);
        const currentScore = scoreDoc.exists() ? scoreDoc.data().currentScore : 100;
        const newScore = Math.max(0, currentScore - points);

        // Single set handles both create and update
        transaction.set(scoreRef, {
            currentScore: newScore,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Record Late Check-in
        transaction.set(checkinRef, {
            studentId: user.uid,
            studentEmail: user.email,
            level: user.level || "",
            class: user.class || "",
            date: date,
            checkInTime: serverTimestamp(),
            deductedScore: points,
            status: status,
            recordedBy: "self",
            note: isWarning ? `Warning ${warningCount + 1}/3` : ""
        });

        // Add History Entry
        transaction.set(historyRef, {
            date: date,
            change: -points,
            reason: isWarning ? `มาสาย (เตือนครั้งที่ ${warningCount + 1}/3)` : `เช็คชื่อมาสาย (${status === "late_major" ? "10 คะแนน" : "5 คะแนน"})`,
            recordedBy: "self",
            note: isWarning ? positiveMessages[Math.floor(Math.random() * positiveMessages.length)] : "",
            createdAt: serverTimestamp()
        });

        return { 
            oldScore: currentScore,
            newScore: newScore, 
            deduction: points,
            status: status,
            warningCount: isWarning ? warningCount + 1 : null,
            message: isWarning ? positiveMessages[Math.floor(Math.random() * positiveMessages.length)] : null
        };
    });
};

/**
 * Admin/Discipline: Records a manual late check-in for a student.
 */
export const recordManualLateCheckin = async (targetUser, status, note = "", adminUid) => {
    const points = status === 'late_minor' ? 5 : status === 'late_major' ? 10 : 0;
    const date = new Date().toISOString().split('T')[0];
    const targetUid = targetUser.id || targetUser.uid;
    const docId = `${targetUid}_${date}`;
    
    const checkinRef = doc(db, "late_checkins", docId);
    const scoreRef = doc(db, "behavior_scores", targetUid);
    const historyRef = doc(collection(db, "behavior_scores", targetUid, "history"));

    await runTransaction(db, async (transaction) => {
        const scoreDoc = await transaction.get(scoreRef);
        const currentScore = scoreDoc.exists() ? scoreDoc.data().currentScore : 100;
        const newScore = Math.max(0, currentScore - points);

        transaction.set(scoreRef, {
            currentScore: newScore,
            updatedAt: serverTimestamp()
        }, { merge: true });

        transaction.set(checkinRef, {
            studentId: targetUid,
            studentEmail: targetUser.email,
            level: targetUser.level || "",
            class: targetUser.class || "",
            date: date,
            checkInTime: serverTimestamp(),
            deductedScore: points,
            status: status,
            recordedBy: "discipline",
            recordedByUid: adminUid,
            note: note
        }, { merge: true });

        transaction.set(historyRef, {
            date: date,
            change: -points,
            reason: `บันทึกโดยฝ่ายปกครอง: ${status === 'late_minor' ? 'สายระยะแรก' : 'สายมาก'}`,
            recordedBy: "discipline",
            note: note,
            createdAt: serverTimestamp()
        });
    });
};

/**
 * Fetches behavior score and history for a student.
 */
export const getBehaviorData = async (uid) => {
    const scoreRef = doc(db, "behavior_scores", uid);
    const historyRef = collection(db, "behavior_scores", uid, "history");
    const historyQuery = query(historyRef, orderBy("createdAt", "desc"));
    
    const [scoreSnap, historySnap] = await Promise.all([
        getDoc(scoreRef),
        getDocs(historyQuery)
    ]);
    
    return {
        score: scoreSnap.exists() ? scoreSnap.data().currentScore : 100,
        history: historySnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };
};

/**
 * Admin/Discipline: Updates an existing late check-in record and syncs score.
 * Handles status changes, score adjustments, and cancellations.
 */
export const updateLateCheckin = async (record, updates, adminUid) => {
    const { status: newStatus, deductedScore: newPoints, note: editNote } = updates;
    const oldPoints = record.status === 'cancelled' ? 0 : (record.deductedScore || 0);
    const effectiveNewPoints = newStatus === 'cancelled' ? 0 : newPoints;
    const studentId = record.studentId;
    
    const checkinRef = doc(db, "late_checkins", record.id);
    const scoreRef = doc(db, "behavior_scores", studentId);
    const historyRef = doc(collection(db, "behavior_scores", studentId, "history"));

    await runTransaction(db, async (transaction) => {
        const scoreDoc = await transaction.get(scoreRef);
        // If it doesn't exist, we assume 100 base
        const currentScore = scoreDoc.exists() ? scoreDoc.data().currentScore : 100;
        
        // Difference: if old was 10 and new is 5, we add 5 back (refund 10, subtract 5)
        const finalScore = currentScore + oldPoints - effectiveNewPoints;

        // 1. Update/Set Score
        transaction.set(scoreRef, {
            currentScore: finalScore,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // 2. Update Check-in Record
        transaction.update(checkinRef, {
            status: newStatus,
            deductedScore: effectiveNewPoints,
            note: editNote,
            editedBy: adminUid,
            editedAt: serverTimestamp()
        });

        // 3. Add History Entry for the edit
        transaction.set(historyRef, {
            date: new Date().toISOString().split('T')[0],
            change: oldPoints - effectiveNewPoints,
            reason: newStatus === 'cancelled' 
                ? `ยกเลิกรายการมาสาย (${record.date})` 
                : `แก้ไขรายการมาสาย (${record.date}): ${newStatus}`,
            recordedBy: "discipline",
            recordedByUid: adminUid,
            note: editNote,
            createdAt: serverTimestamp()
        });
    });
};

/**
 * Discipline Admin: Get filtered late check-ins within a date range.
 */
export const getFilteredLateCheckins = (startDate, endDate, callback) => {
    // Note: Requires composite index if we add orderBy(checkInTime)
    const q = query(
        collection(db, "late_checkins"), 
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc")
    );
    
    return onSnapshot(q, (snapshot) => {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(records);
    }, (error) => {
        console.error("Filtered Checkins Error:", error);
    });
};

/**
 * Discipline Admin: Get today's late check-ins.
 */
export const getTodayLateCheckins = (callback) => {
    const date = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "late_checkins"), where("date", "==", date));
    
    return onSnapshot(q, (snapshot) => {
        const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(records);
    });
};
