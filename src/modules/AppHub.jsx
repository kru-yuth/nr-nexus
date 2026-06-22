import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/common/Navbar';
import { Zap, Trash2, GraduationCap, ArrowRight, ShieldAlert, Clock, BookOpen, Heart } from 'lucide-react';

const AppHub = () => {
    const { user, roles } = useAuth();
    const { t } = useLanguage();
    const isAdmin = roles.includes('admin');
    const isTeacher = roles.includes('teacher');
    const hasDisciplineRead = user?.permissions?.includes('discipline.read');
    const hasDisciplineWrite = user?.permissions?.includes('discipline.write');
    const hasAttendanceRead = user?.permissions?.includes('attendance.read');
    
    const canViewDiscipline = isAdmin || isTeacher || hasDisciplineRead || hasDisciplineWrite;
    const canViewAttendanceAdmin = isAdmin || isTeacher || hasAttendanceRead;
    const canWriteAttendance = isAdmin || isTeacher || hasAttendanceRead || user?.permissions?.includes('attendance.write');

    const apps = [
        {
            id: 'student-care',
            name: t('sdq_app_name'),
            desc: t('sdq_app_desc'),
            icon: Heart,
            color: 'bg-rose-500',
            textColor: 'text-rose-600',
            bgLight: 'bg-rose-50',
            link: roles.includes('teacher') ? '/teacher/homeroom/care' : (roles.includes('student') ? '/student' : '/'),
            allowed: isAdmin || roles.includes('teacher') || roles.includes('student'),
            external: false
        },
        {
            id: 'attendance-checkin',
            name: t('start_attendance'),
            desc: t('late_checkin_app_desc'),
            icon: Clock,
            color: 'bg-[#1a5c38]',
            textColor: 'text-[#1a5c38]',
            bgLight: 'bg-emerald-50',
            link: '/teacher/attendance/checkin',
            allowed: canWriteAttendance,
            external: false
        },
        {
            id: 'attendance',
            name: t('attendance_analytics'),
            desc: t('school_overview'),
            icon: BookOpen,
            color: 'bg-indigo-600',
            textColor: 'text-indigo-600',
            bgLight: 'bg-indigo-50',
            link: canViewAttendanceAdmin ? '/admin-dashboard/attendance' : '/student/attendance',
            allowed: canViewAttendanceAdmin || roles.includes('student'),
            external: false
        },
        {
            id: 'late-checkin',
            name: t('late_checkin_app_name'),
            desc: t('late_checkin_app_desc'),
            icon: Clock,
            color: 'bg-[#1a5c38]',
            textColor: 'text-[#1a5c38]',
            bgLight: 'bg-emerald-50',
            link: canViewDiscipline ? '/admin-dashboard/late-checkin' : '/student/late-checkin',
            allowed: !!(canViewDiscipline || roles.includes('student')),
            external: false
        },
        {
            id: 'nexus',
            name: t('nexus_app_name'),
            desc: t('nexus_app_desc'),
            icon: GraduationCap,
            color: 'bg-green-600',
            textColor: 'text-green-600',
            bgLight: 'bg-green-50',
            link: isAdmin ? '/admin-dashboard' : (roles.includes('teacher') ? '/teacher' : (roles.includes('student') ? '/volunteer-gallery' : '/')),
            allowed: true, // Everyone logged in has basic nexus access
            external: false
        },
        {
            id: 'electricity',
            name: t('electricity_app_name'),
            desc: t('electricity_app_desc'),
            icon: Zap,
            color: 'bg-amber-500',
            textColor: 'text-amber-600',
            bgLight: 'bg-amber-50',
            link: 'http://localhost:5174',
            allowed: isAdmin || roles.includes('staff') || roles.includes('teacher'),
            external: true
        },
        {
            id: 'waste',
            name: t('waste_app_name'),
            desc: t('waste_app_desc'),
            icon: Trash2,
            color: 'bg-blue-600',
            textColor: 'text-blue-600',
            bgLight: 'bg-blue-50',
            link: 'http://localhost:5175',
            allowed: isAdmin || roles.includes('staff') || roles.includes('teacher') || roles.includes('student'),
            external: true
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            
            <main className="flex-grow container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                        {t('app_hub_title')}
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        {t('app_hub_subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {apps.map((app) => (
                        <div 
                            key={app.id}
                            className={`relative group bg-white rounded-3xl shadow-xl overflow-hidden border-2 transition-all duration-300 ${
                                app.allowed 
                                ? 'border-transparent hover:border-emerald-500 hover:-translate-y-2' 
                                : 'opacity-75 grayscale border-gray-100'
                            }`}
                        >
                            <div className={`${app.bgLight} p-8 h-full flex flex-col`}>
                                <div className={`${app.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg transform group-hover:scale-110 transition-transform`}>
                                    <app.icon size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-3">{app.name}</h2>
                                <p className="text-gray-600 mb-6 line-clamp-2 flex-grow">{app.desc}</p>
                                
                                {app.allowed ? (
                                    app.external ? (
                                        <a 
                                            href={app.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`inline-flex items-center gap-2 font-bold ${app.textColor} hover:underline`}
                                        >
                                            {t('launch_app')} <ArrowRight size={20} />
                                        </a>
                                    ) : (
                                        <Link 
                                            to={app.link}
                                            className={`inline-flex items-center gap-2 font-bold ${app.textColor} hover:underline`}
                                        >
                                            {t('launch_app')} <ArrowRight size={20} />
                                        </Link>
                                    )
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-400 font-medium mt-auto">
                                        <ShieldAlert size={20} />
                                        <span>{t('request_access')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="py-8 text-center text-gray-500">
                <p>© {new Date().getFullYear()} Narkprasit School. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default AppHub;
