import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { logoutUser } from '../../services/auth';
import LanguageSwitcher from './LanguageSwitcher';
import { Home, LogOut, ArrowLeft, LayoutGrid, User } from 'lucide-react';

const Navbar = ({ showBack = false }) => {
    const { user, roles } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (!window.confirm(t('confirm_action'))) return;
        await logoutUser();
        navigate('/login');
    };

    const getDashboardPath = () => {
        if (roles.includes('admin')) return '/admin-dashboard';
        if (roles.includes('teacher')) return '/teacher';
        if (roles.includes('student')) return '/student';
        return '/hub';
    };

    return (
        <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-[100] border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex justify-between h-20 items-center">
                    <div className="flex items-center gap-4">
                        {showBack ? (
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all group"
                            >
                                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <Link to="/hub" className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
                                <LayoutGrid className="w-6 h-6" />
                            </Link>
                        )}
                        
                        <Link to={getDashboardPath()} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-200 group-hover:rotate-6 transition-transform">
                                N
                            </div>
                            <div className="hidden sm:block">
                                <span className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">
                                    NR <span className="text-emerald-600">Nexus</span>
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 md:gap-6">
                        <div className="hidden md:block">
                            <LanguageSwitcher />
                        </div>

                        {user && (
                            <div className="flex items-center gap-4 pl-4 md:pl-6 border-l border-slate-100">
                                <div className="hidden lg:block text-right">
                                    <div className="text-sm font-black text-slate-900 leading-none mb-1 uppercase italic">{user.name || user.displayName}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                        {roles[0]}
                                    </div>
                                </div>
                                
                                <Link 
                                    to={roles.includes('student') ? '/student' : getDashboardPath()}
                                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 shadow-inner"
                                >
                                    <User size={20} />
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all group"
                                    title={t('logout')}
                                >
                                    <LogOut className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
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
