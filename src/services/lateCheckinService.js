import { db } from "./firebase";
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    writeBatch, 
    serverTimestamp,
    orderBy,
    limit,
    onSnapshot
} from "firebase/firestore";

/**
 * Calculates deduction based on time.
 * 08.00 - 08.29 -> 5 pts (late_minor)
 * 08.30 - 09.29 -> 10 pts (late_major)
 * 09.30+ -> closed
 */
export const getLateDeduction = (now = new Date()) => {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const start800 = 8 * 60;
    const end829 = 8 * 60 + 29;
    const start830 = 8 * 60 + 30;
    const end929 = 9 * 60 + 29;

    if (totalMinutes >= start800 && totalMinutes <= end829) {
        return { points: 5, status: "late_minor", label: "08:00 - 08:29 (สายระยะแรก)" };
    } else if (totalMinutes >= start830 && totalMinutes <= end929) {
        return { points: 10, status: "late_major", label: "08:30 - 09:29 (สายมาก)" };
    } else if (totalMinutes >= 9 * 60 + 30) {
        return { points: null, status: "closed", label: "หมดเวลาเช็คสาย (09:30+)" };
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
    const monthPrefix = `${year}-${month}`; // e.g. "2026-05"

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
 * Atomic batch operation to record late check-in and update behavior score.
 * Implements 3-warning grace period for 08:00-08:29.
 */
export const processLateCheckin = async (user) => {
    const { points: rawPoints, status: rawStatus } = getLateDeduction();
    
    if (rawStatus === "closed") throw new Error("Check-in is closed after 09:30.");
    if (rawStatus === "early") throw new Error("Check-in opens at 08:00.");

    const date = new Date().toISOString().split('T')[0];
    const docId = `${user.uid}_${date}`;
    
    // 0. Grace Period Logic
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

    const batch = writeBatch(db);
    
    // 1. Create Late Check-in Record
    const checkinRef = doc(db, "late_checkins", docId);
    batch.set(checkinRef, {
        studentId: user.uid,
        studentEmail: user.email,
        date: date,
        checkInTime: serverTimestamp(),
        deductedScore: points,
        status: status,
        recordedBy: "self",
        note: isWarning ? `Warning ${warningCount + 1}/3` : ""
    });

    // 2. Behavior Score Management
    const scoreRef = doc(db, "behavior_scores", user.uid);
    const scoreSnap = await getDoc(scoreRef);
    
    let currentScore = 100;
    if (scoreSnap.exists()) {
        currentScore = scoreSnap.data().currentScore;
        batch.update(scoreRef, {
            currentScore: currentScore - points,
            updatedAt: serverTimestamp()
        });
    } else {
        // First time initialization
        batch.set(scoreRef, {
            currentScore: 100 - points,
            updatedAt: serverTimestamp()
        });
    }

    // 3. Add History Entry
    const historyRef = doc(collection(db, "behavior_scores", user.uid, "history"));
    batch.set(historyRef, {
        date: date,
        change: -points,
        reason: isWarning ? `มาสาย (เตือนครั้งที่ ${warningCount + 1}/3)` : `เช็คชื่อมาสาย (${status === "late_major" ? "10 คะแนน" : "5 คะแนน"})`,
        recordedBy: "self",
        note: isWarning ? positiveMessages[Math.floor(Math.random() * positiveMessages.length)] : "",
        createdAt: serverTimestamp()
    });

    await batch.commit();
    return { 
        oldScore: currentScore,
        newScore: currentScore - points, 
        deduction: points,
        status: status,
        warningCount: isWarning ? warningCount + 1 : null,
        message: isWarning ? positiveMessages[Math.floor(Math.random() * positiveMessages.length)] : null
    };
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
 * Admin/Discipline: Records a manual late check-in for a student.
 */
export const recordManualLateCheckin = async (targetUser, status, note = "", adminUid) => {
    const { points } = status === 'late_minor' ? { points: 5 } : 
                       status === 'late_major' ? { points: 10 } : { points: 0 };

    const date = new Date().toISOString().split('T')[0];
    const docId = `${targetUser.id || targetUser.uid}_${date}`;
    
    const batch = writeBatch(db);
    
    // 1. Create/Update Late Check-in Record
    const checkinRef = doc(db, "late_checkins", docId);
    batch.set(checkinRef, {
        studentId: targetUser.id || targetUser.uid,
        studentEmail: targetUser.email,
        date: date,
        checkInTime: serverTimestamp(),
        deductedScore: points,
        status: status,
        recordedBy: "discipline",
        recordedByUid: adminUid,
        note: note
    }, { merge: true });

    // 2. Behavior Score Management
    const scoreRef = doc(db, "behavior_scores", targetUser.id || targetUser.uid);
    const scoreSnap = await getDoc(scoreRef);
    
    let currentScore = 100;
    if (scoreSnap.exists()) {
        currentScore = scoreSnap.data().currentScore;
        batch.update(scoreRef, {
            currentScore: currentScore - points,
            updatedAt: serverTimestamp()
        });
    } else {
        batch.set(scoreRef, {
            currentScore: 100 - points,
            updatedAt: serverTimestamp()
        });
    }

    // 3. Add History Entry
    const historyRef = doc(collection(db, "behavior_scores", targetUser.id || targetUser.uid, "history"));
    batch.set(historyRef, {
        date: date,
        change: -points,
        reason: `บันทึกโดยฝ่ายปกครอง: ${status === 'late_minor' ? 'สายระยะแรก' : 'สายมาก'}`,
        recordedBy: "discipline",
        note: note,
        createdAt: serverTimestamp()
    });

    await batch.commit();
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
