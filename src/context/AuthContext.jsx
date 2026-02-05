import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Re-implement lookup logic here for page refreshes (auto-login)
    // Since onAuthStateChanged only gives the Firebase User, we need to re-fetch the role.
    const fetchUserRole = async (firebaseUser) => {
        const email = firebaseUser.email;
        let foundRole = 'parent';
        let foundData = null;

        try {
            // 1. Check Admin (users)
            const adminQ = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
            const adminSnap = await getDocs(adminQ);
            if (!adminSnap.empty) {
                return { role: 'admin', data: adminSnap.docs[0].data() };
            }

            // 2. Check Teacher (teachers)
            const teacherQ = query(collection(db, "teachers"), where("Email", "==", email));
            const teacherSnap = await getDocs(teacherQ);
            if (!teacherSnap.empty) {
                // Ensure we don't accidentally match if email is undefined/null in db
                return { role: 'teacher', data: teacherSnap.docs[0].data() };
            }

            // 3. Check Student (students)
            const studentQ = query(collection(db, "students"), where("Email", "==", email));
            const studentSnap = await getDocs(studentQ);
            if (!studentSnap.empty) {
                return { role: 'student', data: studentSnap.docs[0].data() };
            }

            return { role: 'parent', data: null }; // Fallback

        } catch (err) {
            console.error("Error fetching user role on refresh:", err);
            return { role: 'parent', data: null };
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Determine role again
                const { role: fetchedRole, data: fetchedData } = await fetchUserRole(firebaseUser);
                setUser(firebaseUser);
                setRole(fetchedRole);
                setProfileData(fetchedData);
            } else {
                setUser(null);
                setRole(null);
                setProfileData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        role,
        profileData,
        loading,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
