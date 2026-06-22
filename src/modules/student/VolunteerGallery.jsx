import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchAvailableJobs, fetchStudentApplications, applyForJob } from '../../services/volunteerService';
import Navbar from '../../components/common/Navbar';
import { Calendar, MapPin, Users, Star, RefreshCw, CheckCircle, Clock, HeartHandshake, ChevronRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const VolunteerGallery = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' | 'my-jobs'
    const [jobs, setJobs] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applyingId, setApplyingId] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedJobs, fetchedApps] = await Promise.all([
                fetchAvailableJobs(),
                user?.id ? fetchStudentApplications(user.id) : []
            ]);
            setJobs(fetchedJobs);
            setMyApplications(fetchedApps);
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error(t('load_jobs_error'));
        } finally {
            setLoading(false);
        }
    }, [user?.id, t]);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id, loadData]);

    const handleApply = async (job) => {
        if (!user?.id) return;

        setApplyingId(job.id);
        const toastId = toast.loading(t('processing'));
        try {
            const studentName = user.name || user.email;
            await applyForJob(job.id, user.id, studentName);
            toast.success(t('application_success'), { id: toastId });
            await loadData();
        } catch (error) {
            console.error("Application failed:", error);
            toast.error(typeof error === 'string' ? error : t('app_error_generic'), { id: toastId });
        } finally {
            setApplyingId(null);
        }
    };

    const isJobApplied = (jobId) => {
        return myApplications.some(app => app.jobId === jobId);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={true} />
            
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-200 text-white">
                            <HeartHandshake size={40} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{t('volunteer_opportunities')}</h1>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">{t('discover_jobs_desc')}</p>
                        </div>
                    </div>

                    <div className="flex items-center w-full lg:w-auto p-1.5 bg-slate-200/50 rounded-2xl md:rounded-[1.5rem] shadow-inner backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('gallery')}
                            className={`flex-1 lg:px-8 py-3 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'gallery' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t('gallery')}
                        </button>
                        <button
                            onClick={() => setActiveTab('my-jobs')}
                            className={`flex-1 lg:px-8 py-3 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'my-jobs' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t('my_jobs')} ({myApplications.length})
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="mb-8 flex justify-end">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-all shadow-sm"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {t('refresh_data')}
                    </button>
                </div>

                {loading && jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 opacity-30 animate-pulse">
                        <Sparkles size={64} className="mb-6 text-slate-300" />
                        <p className="font-black text-xs uppercase tracking-[0.3em]">{t('loading')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {activeTab === 'gallery' ? (
                            jobs.map((job, idx) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    applied={isJobApplied(job.id)}
                                    onApply={() => handleApply(job)}
                                    applying={applyingId === job.id}
                                    t={t}
                                    idx={idx}
                                />
                            ))
                        ) : (
                            myApplications.map((app, idx) => {
                                const job = jobs.find(j => j.id === app.jobId);
                                return job ? (
                                    <JobCard key={app.id} job={job} applied={true} readOnly={true} t={t} idx={idx} />
                                ) : (
                                    <div key={app.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-6">
                                            <XCircle size={32} />
                                        </div>
                                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest mb-2 italic">Job details unavailable</p>
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{t('applied_on')}: {app.appliedAt?.toDate().toLocaleDateString()}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {!loading && activeTab === 'gallery' && jobs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20">
                        <HeartHandshake size={80} className="mb-8" />
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic">{t('no_active_jobs')}</h3>
                        <p className="font-bold text-xs uppercase tracking-[0.2em] mt-2">{t('check_back_later')}</p>
                    </div>
                )}

                {!loading && activeTab === 'my-jobs' && myApplications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20">
                        <Calendar size={80} className="mb-8" />
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic">{t('no_applications_yet')}</h3>
                        <p className="font-bold text-xs uppercase tracking-[0.2em] mt-2">{t('browse_gallery')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Touch-friendly Job Card
const JobCard = ({ job, applied, onApply, applying, readOnly = false, t, idx }) => {
    const isFull = job.remainingSlots <= 0;
    const canApply = !applied && !isFull && !readOnly;

    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 hover:shadow-emerald-100 hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col group animate-in slide-in-from-bottom-8 fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="p-8 md:p-10 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <Sparkles size={20} />
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black shadow-sm group-hover:scale-110 transition-transform">
                        <Star size={12} fill="currentColor" />
                        +{job.points} {t('points')}
                    </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-8 group-hover:text-emerald-700 transition-colors line-clamp-3 italic uppercase">{job.title}</h3>

                <div className="space-y-4 mt-auto">
                    <div className="flex items-center gap-4 text-slate-400 group-hover:text-slate-600 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                            <Users size={14} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 leading-none mb-1">{t('supervisor_label')}</span>
                            <span className="text-xs font-black uppercase tracking-tight">{job.supervisor || "N/A"}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-slate-400 group-hover:text-slate-600 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                            <MapPin size={14} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 leading-none mb-1">{t('location')}</span>
                            <span className="text-xs font-black uppercase tracking-tight truncate max-w-[200px]">{job.location || "TBA"}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 group-hover:text-slate-600 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                            <Clock size={14} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 leading-none mb-1">{t('date_time')}</span>
                            <span className="text-xs font-black uppercase tracking-tight italic">{job.date || "Date TBA"}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50/80 px-8 py-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 group-hover:bg-emerald-50/30 transition-colors">
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{t('remaining_slots')}</span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-black tabular-nums ${isFull ? 'text-rose-500' : 'text-emerald-600'}`}>{job.remainingSlots}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ {job.totalSlots || "?"} {t('slots')}</span>
                    </div>
                </div>

                {!readOnly && (
                    <button
                        onClick={onApply}
                        disabled={!canApply || applying}
                        className={`w-full sm:w-auto px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl
                            ${applied
                                ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed shadow-none'
                                : isFull
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-slate-900 text-white hover:bg-emerald-600 hover:-translate-y-1 active:translate-y-0 active:scale-95'
                            }
                            ${applying ? 'opacity-70 cursor-wait' : ''}
                        `}
                    >
                        {applying ? t('processing') : applied ? t('applied_status') : isFull ? t('full_status') : t('apply_now')}
                    </button>
                )}

                {readOnly && (
                    <div className="w-full sm:w-auto px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-100 text-emerald-700 flex items-center justify-center gap-3 italic">
                        <CheckCircle size={16} /> {t('registered_status')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VolunteerGallery;
