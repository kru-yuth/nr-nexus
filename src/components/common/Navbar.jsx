import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { logoutUser } from '../../services/auth';
import LanguageSwitcher from './LanguageSwitcher';
import { Home, LogOut, ArrowLeft } from 'lucide-react';

const Navbar = ({ showBack = false }) => {
    const { user, role } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    const getDashboardPath = () => {
        switch (role) {
            case 'admin':
            case 'teacher':
                return '/admin-dashboard';
            case 'student':
                return '/volunteer-gallery';
            case 'parent':
                return '/parent';
            default:
                return '/';
        }
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-4">
                        {showBack && (
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium transition"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">{t('back_to_home')}</span>
                            </button>
                        )}
                        <Link to={getDashboardPath()} className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
                                N
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 hidden sm:block">
                                NR Nexus
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <LanguageSwitcher />

                        {user && (
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                                <div className="hidden md:block text-right">
                                    <div className="text-sm font-bold text-gray-800 leading-none">{user.displayName}</div>
                                    <div className="text-xs text-gray-500 capitalize">{role}</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                    title={t('logout')}
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
