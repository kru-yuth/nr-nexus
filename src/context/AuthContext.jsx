import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from "../services/firebase";
import {
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import { loginWithGoogle, fetchUserByEmailAndLinkUID } from '../services/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRoles, setUserRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    const login = async () => {
        setAuthError(null);
        localStorage.clear();
        sessionStorage.clear();

        try {
            const user = await loginWithGoogle();

            if (user.email.endsWith('@nr.ac.th')) {
                // Strict Email-based Lookup (Unified Flow)
                console.log(`Login: Searching whitelisted user for ${user.email}...`);
                const userData = await fetchUserByEmailAndLinkUID(user.email, user.uid);

                if (userData && userData.roles && userData.roles.length > 0) {
                    console.log("Login: User verified via email lookup and linked.");
                    // Merge Firebase Auth user with Firestore Profile Data
                    const combinedUser = { ...user, ...userData };
                    setCurrentUser(combinedUser);
                    setUserRoles(userData.roles);
                    return { user: combinedUser, roles: userData.roles };
                } else {
                    console.error("Login: Email not found in whitelist. Signing out.");
                    await signOut(auth);
                    setCurrentUser(null);
                    setUserRoles([]);
                    setAuthError("whitelist_error");
                    return null;
                }
            } else {
                await signOut(auth);
                setAuthError("domain_error");
                return null;
            }

        } catch (error) {
            console.error("Login Context Error:", error);
            if (error.message === 'Unauthorized domain') {
                setAuthError("domain_error");
            } else if (!authError) {
                setAuthError("login_error");
            }
            throw error;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.email.endsWith('@nr.ac.th')) {
                try {
                    // Always try to fetch latest roles/status
                    const userData = await fetchUserByEmailAndLinkUID(user.email, user.uid);
                    if (userData && userData.roles && userData.roles.length > 0) {
                        const combinedUser = { ...user, ...userData };
                        setCurrentUser(combinedUser);
                        setUserRoles(userData.roles);
                    } else {
                        console.warn("Session restore: User not in whitelist. Signing out.");
                        await signOut(auth);
                        setCurrentUser(null);
                        setUserRoles([]);
                    }
                } catch (e) {
                    console.error("Auth Listener Fetch Error:", e);
                    // Fallback to basic user if fetch fails
                    setCurrentUser(user);
                    if (e.code === 'permission-denied') {
                        setAuthError("permission_error");
                    }
                }
            } else {
                setCurrentUser(null);
                setUserRoles([]);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        user: currentUser,
        roles: userRoles,
        role: userRoles[0] || null, // For backward compatibility
        loading,
        authError,
        login,
        logout: () => {
            localStorage.clear();
            sessionStorage.clear();
            return signOut(auth);
        }
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
