import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';

import { LayoutGrid, Clock, Users, HeartHandshake, Settings, BarChart3 } from 'lucide-react';

const AdminDashboard = () => {
    const { user, roles } = useAuth();
    const { t } = useLanguage();
    
    const isAdmin = roles.includes('admin');
    const isTeacher = roles.includes('teacher');
    const hasDisciplineRead = user?.permissions?.includes('discipline.read');
    const hasDisciplineWrite = user?.permissions?.includes('discipline.write');
    const hasAttendanceRead = user?.permissions?.includes('attendance.read');
    
    const canViewDiscipline = isAdmin || isTeacher || hasDisciplineRead || hasDisciplineWrite;
    const canViewAttendanceAdmin = isAdmin || isTeacher || hasAttendanceRead;

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="max-w-7xl mx-auto p-8">
                <div className="bg-white rounded-[1.5rem] md:rounded-lg shadow p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight italic uppercase">{isAdmin ? t('admin_dashboard') : t('staff_dashboard') || 'Staff Dashboard'}</h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* App Hub Widget (Portal) */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border-2 border-emerald-50 hover:border-emerald-500 transition-all group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                                <LayoutGrid size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight italic">{t('app_hub_title')}</h3>
                        </div>
                        <p className="text-slate-400 mb-6 text-sm font-bold uppercase tracking-wider">{t('app_hub_subtitle')}</p>
                        <Link to="/hub" className="inline-flex items-center text-emerald-600 font-black hover:underline uppercase text-xs tracking-widest">
                            {t('launch_app')} &rarr;
                        </Link>
                    </div>

                    {/* Attendance Analytics Widget */}
                    {canViewAttendanceAdmin && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border-2 border-indigo-50 hover:border-indigo-500 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                    <BarChart3 size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight italic">{t('attendance_analytics')}</h3>
                            </div>
                            <p className="text-slate-400 mb-6 text-sm font-bold uppercase tracking-wider">{t('school_overview')}</p>
                            <Link to="/admin-dashboard/attendance" className="inline-flex items-center text-indigo-600 font-black hover:underline uppercase text-xs tracking-widest">
                                {t('view')} &rarr;
                            </Link>
                        </div>
                    )}

                    {/* Late Check-in Monitor Widget */}
                    {canViewDiscipline && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border-2 border-[#1a5c38]/5 hover:border-[#1a5c38] transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-[#1a5c38] group-hover:scale-110 transition-transform">
                                    <Clock size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight italic">{t('late_checkin_title')}</h3>
                            </div>
                            <p className="text-slate-400 mb-6 text-sm font-bold uppercase tracking-wider">{t('late_checkin_monitor_desc') || "Monitor student attendance."}</p>
                            <Link to="/admin-dashboard/late-checkin" className="inline-flex items-center text-[#1a5c38] font-black hover:underline uppercase text-xs tracking-widest">
                                {t('monitor_live') || "Monitor Live"} &rarr;
                            </Link>
                        </div>
                    )}

                    {/* User Management Widget */}
                    {isAdmin && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border-2 border-slate-50 hover:border-emerald-500 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-slate-100 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                                    <Users size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight italic">{t('user_management')}</h3>
                            </div>
                            <p className="text-slate-400 mb-6 text-sm font-bold uppercase tracking-wider">{t('user_mgmt_desc')}</p>
                            <Link to="/admin-dashboard/users" className="inline-flex items-center text-emerald-600 font-black hover:underline uppercase text-xs tracking-widest">
                                {t('go_to_user_mgmt')} &rarr;
                            </Link>
                        </div>
                    )}

                    {/* Volunteer Management Widget */}
                    {(isAdmin || roles.includes('teacher')) && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border-2 border-slate-50 hover:border-emerald-500 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-slate-100 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                                    <HeartHandshake size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight italic">{t('volunteer_management')}</h3>
                            </div>
                            <p className="text-slate-400 mb-6 text-sm font-bold uppercase tracking-wider">{t('post_job_desc')}</p>
                            <Link to="/admin-dashboard/volunteer" className="inline-flex items-center text-emerald-600 font-black hover:underline uppercase text-xs tracking-widest">
                                {t('go_to_volunteer_mgmt')} &rarr;
                            </Link>
                        </div>
                    )}

                    {/* System Settings Widget (Placeholder) */}
                    {isAdmin && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border-2 border-slate-50 hover:border-emerald-500 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-slate-100 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                                    <Settings size={28} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight italic">{t('system_settings')}</h3>
                            </div>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">{t('system_settings_desc')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
