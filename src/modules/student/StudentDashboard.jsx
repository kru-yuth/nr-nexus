import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { logoutUser } from '../../services/auth';
import Navbar from '../../components/common/Navbar';
import { GraduationCap, Star, HeartHandshake, ChevronRight, LogOut, Sparkles, BookOpen, Clock, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={false} />
            
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Welcome Header */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 mb-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-1 shadow-2xl rotate-3 transition-transform hover:rotate-0">
                            <div className="w-full h-full rounded-[2.25rem] bg-white flex items-center justify-center font-black text-4xl md:text-5xl text-emerald-600 shadow-inner">
                                {(user?.name || user?.displayName || '?').charAt(0)}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-2 italic">{t('welcome')}</p>
                            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">
                                {user?.name && user.name !== 'Unknown' ? user.name : (user?.displayName || 'Unknown')}
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{user?.studentId || t('no_id')}</span>
                                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">{user?.level} {t('room_label')} {user?.class}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            if(window.confirm(t('confirm_action'))) logoutUser().then(() => navigate('/login'));
                        }}
                        className="relative z-10 p-5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-[2rem] transition-all shadow-xl shadow-rose-100/50 group"
                    >
                        <LogOut size={28} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Attendance Tracker Widget */}
                    <div 
                        onClick={() => navigate('/student/attendance')}
                        className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-indigo-500 hover:-translate-y-1 transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <BookOpen size={28} />
                            </div>
                            <ChevronRight className="text-slate-100 group-hover:text-indigo-500 group-hover:translate-x-2 transition-all" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase mb-2">{t('my_attendance')}</h2>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{t('personal_performance')}</p>
                    </div>

                    {/* Late Check-in Widget */}
                    <div 
                        onClick={() => navigate('/student/late-checkin')}
                        className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-emerald-500 hover:-translate-y-1 transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 bg-[#1a5c38]/5 rounded-2xl text-[#1a5c38] group-hover:bg-[#1a5c38] group-hover:text-white transition-all">
                                <Clock size={28} />
                            </div>
                            <ChevronRight className="text-slate-100 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase mb-2">{t('late_checkin_title')}</h2>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{t('late_checkin_app_desc')}</p>
                    </div>

                    {/* SDQ Assessment Widget */}
                    <div 
                        onClick={() => navigate('/student-care/sdq/student')}
                        className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-rose-500 hover:-translate-y-1 transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
                                <Heart size={28} className="fill-rose-100 group-hover:fill-rose-500" />
                            </div>
                            <ChevronRight className="text-slate-100 group-hover:text-rose-500 group-hover:translate-x-2 transition-all" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase mb-2">{t('sdq_title') || 'แบบประเมินตนเอง (SDQ)'}</h2>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{t('sdq_app_desc') || 'แบบประเมินจุดแข็งและจุดอ่อน'}</p>
                    </div>

                    {/* Volunteer Section */}
                    <div 
                        onClick={() => navigate('/student/volunteer')}
                        className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group cursor-pointer hover:border-emerald-500 hover:-translate-y-2 transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <HeartHandshake size={28} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase group-hover:text-emerald-700">{t('volunteer_jobs')}</h2>
                            </div>
                            <ChevronRight className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" size={32} />
                        </div>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-wide leading-relaxed mb-8">{t('volunteer_opps_desc')}</p>
                        <div className="mt-auto inline-flex items-center text-emerald-600 font-black uppercase text-xs tracking-[0.2em] group-hover:underline">
                            {t('view_gallery')} &rarr;
                        </div>
                    </div>

                    {/* Academic Section */}
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col group grayscale opacity-40">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-slate-100 rounded-2xl text-slate-400 group-hover:scale-110 transition-transform">
                                <GraduationCap size={28} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">{t('current_grades')}</h2>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Sparkles size={64} className="mb-4 text-slate-300" />
                            <p className="font-black text-xs uppercase tracking-[0.2em]">{t('no_grades')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
