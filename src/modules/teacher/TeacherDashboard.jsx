import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';
import { GraduationCap, Users, BookOpen, ChevronRight, Star, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeacherDashboard = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={false} />
            
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Welcome Header */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 mb-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-2xl rotate-3 transition-transform hover:rotate-0">
                            <div className="w-full h-full rounded-[2.25rem] bg-white flex items-center justify-center font-black text-4xl md:text-5xl text-indigo-600 shadow-inner">
                                {(user?.name || user?.displayName || '?').charAt(0)}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mb-2 italic">{t('welcome')}</p>
                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">
                                {user?.name && user.name !== 'Unknown' ? user.name : (user?.displayName || 'Unknown')}
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{t('teacher')}</span>
                                {user?.homeroomClass && (
                                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">{t('room_label')} {user.homeroomClass}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Courses Section */}
                    <div 
                        onClick={() => navigate('/teacher/subjects')}
                        className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-indigo-500 hover:-translate-y-1 transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <BookOpen size={28} />
                            </div>
                            <ChevronRight className="text-slate-100 group-hover:text-indigo-500 group-hover:translate-x-2 transition-all" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase mb-2">{t('my_subjects')}</h2>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{t('setup_subject')}</p>
                    </div>

                    {/* Students Section */}
                    <div 
                        onClick={() => navigate('/teacher/attendance-setup')}
                        className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-emerald-500 hover:-translate-y-1 transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <Users size={28} />
                            </div>
                            <ChevronRight className="text-slate-100 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase mb-2">Student Roster</h2>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{t('start_attendance')}</p>
                    </div>

                    {/* Homeroom Section (Conditional) */}
                    {user?.homeroomClass && (
                        <>
                            <div 
                                onClick={() => navigate('/teacher/homeroom')}
                                className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-amber-500 hover:-translate-y-1 transition-all duration-500"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                                        <Star size={28} />
                                    </div>
                                    <ChevronRight className="text-slate-100 group-hover:text-amber-500 group-hover:translate-x-2 transition-all" size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase mb-2">{t('homeroom_dashboard')}</h2>
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{user.homeroomClass}</p>
                            </div>

                            <div 
                                onClick={() => navigate('/teacher/homeroom/care')}
                                className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-emerald-500 hover:-translate-y-1 transition-all duration-500"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                        <Heart size={28} />
                                    </div>
                                    <ChevronRight className="text-slate-100 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase mb-2">{t('careCase.dashboard.title')}</h2>
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{user.homeroomClass}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
