import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

const ProtectedRoute = ({ children, allowedRoles, allowedPermissions }) => {
    const { user, roles, loading } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
                <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-300">{t('loading')}</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role-based Access
    const hasRoleAccess = allowedRoles ? (roles ?? []).some(role => allowedRoles.includes(role)) : true;
    
    // Permission-based Access
    const hasPermissionAccess = allowedPermissions 
        ? (user?.permissions ?? []).some(p => allowedPermissions.includes(p)) 
        : false;

    if (!hasRoleAccess && !hasPermissionAccess) {
        // Redirect to their appropriate dashboard if they try to access unauthorized page
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
