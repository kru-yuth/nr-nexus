import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';
import { 
    HeartHandshake, 
    Plus, 
    Calendar, 
    MapPin, 
    Users, 
    Award, 
    CheckCircle2, 
    XCircle,
    ChevronRight,
    Search,
    Eye,
    Trash2,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const VolunteerAdmin = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        supervisor: user?.displayName || '',
        totalSlots: '',
        points: '',
        location: '',
        date: '',
        description: ''
    });

    useEffect(() => {
        if (user?.displayName) {
            setFormData(prev => ({
                ...prev,
                supervisor: user.displayName
            }));
        }
        fetchJobs();
    }, [user, fetchJobs]);

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'volunteer_jobs'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const jobsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setJobs(jobsData);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            toast.error(t('load_jobs_error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const totalSlots = parseInt(formData.totalSlots);
            const points = parseInt(formData.points);

            await addDoc(collection(db, 'volunteer_jobs'), {
                title: formData.title,
                supervisor: formData.supervisor,
                totalSlots: totalSlots,
                remainingSlots: totalSlots,
                points: points,
                location: formData.location,
                date: formData.date,
                description: formData.description,
                status: 'active',
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });

            setFormData({
                title: '',
                supervisor: formData.supervisor,
                totalSlots: '',
                points: '',
                location: '',
                date: '',
                description: ''
            });

            fetchJobs();
            toast.success(t('job_posted_success'));

        } catch (error) {
            console.error("Error posting job:", error);
            toast.error(t('job_post_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseJob = async (jobId) => {
        if (!window.confirm(t('confirm_close_job'))) return;

        try {
            const jobRef = doc(db, 'volunteer_jobs', jobId);
            await updateDoc(jobRef, {
                status: 'closed'
            });
            fetchJobs();
            toast.success(t('job_closed_success'));
        } catch (error) {
            console.error("Error closing job:", error);
            toast.error(t('operation_failed'));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={true} />
            
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Hero Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-200">
                            <HeartHandshake className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{t('volunteer_management')}</h1>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">{t('post_job_desc')}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Post Job Form */}
                    <aside className="lg:col-span-1">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 sticky top-8">
                            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                                <Plus className="text-emerald-600" size={24} />
                                <h2 className="text-xl font-black text-slate-900 uppercase italic">{t('post_job_title')}</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('job_title')}</label>
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner" placeholder={t('job_title')} />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('supervisor')}</label>
                                    <input type="text" name="supervisor" value={formData.supervisor} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('total_slots')}</label>
                                        <input type="number" name="totalSlots" value={formData.totalSlots} onChange={handleChange} required min="1" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('points')}</label>
                                        <input type="number" name="points" value={formData.points} onChange={handleChange} required min="0" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('location')}</label>
                                    <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner" placeholder={t('location')} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('date_time')}</label>
                                    <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('description')}</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} required rows="3" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner resize-none" placeholder={t('description')} />
                                </div>

                                <button type="submit" disabled={submitting} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-emerald-600 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 uppercase text-xs tracking-[0.2em] mt-4 flex items-center justify-center gap-3">
                                    {submitting ? t('saving') : <><Plus size={18} /> {t('post_job_btn')}</>}
                                </button>
                            </form>
                        </div>
                    </aside>

                    {/* Right: Manage Jobs List */}
                    <main className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-50 overflow-hidden">
                            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
                                <h2 className="text-xl font-black text-slate-900 uppercase italic">{t('manage_jobs_title')}</h2>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full">{jobs.length} Jobs Total</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('job_title')}</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('date_time')}</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('total_slots')}</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('points')}</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('status')}</th>
                                            <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loading ? (
                                            <tr><td colSpan="6" className="py-20 text-center animate-pulse font-black text-slate-200 uppercase tracking-widest">{t('loading')}</td></tr>
                                        ) : jobs.length === 0 ? (
                                            <tr><td colSpan="6" className="py-20 text-center font-black text-slate-300 uppercase tracking-widest">{t('no_jobs_found')}</td></tr>
                                        ) : (
                                            jobs.map((job) => (
                                                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-7">
                                                        <div className="font-black text-slate-900 text-sm leading-tight mb-1">{job.title}</div>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                            <MapPin size={10} className="text-emerald-500" />
                                                            {job.location}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-7 text-center">
                                                        <div className="text-xs font-black text-slate-800 tabular-nums">{new Date(job.date).toLocaleDateString()}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(job.date).toLocaleTimeString()}</div>
                                                    </td>
                                                    <td className="px-8 py-7 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-sm font-black ${job.remainingSlots === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{job.remainingSlots}</span>
                                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">/ {job.totalSlots} {t('slots')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-7 text-center">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black shadow-sm">
                                                            <Award size={12} />
                                                            {job.points}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-7 text-center">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${job.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                            {job.status === 'active' ? 'OPEN' : 'CLOSED'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-7 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                            <button onClick={() => handleCloseJob(job.id)} disabled={job.status === 'closed'} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-white hover:shadow-xl rounded-xl transition-all disabled:opacity-30">
                                                                <XCircle size={20} />
                                                            </button>
                                                            <button className="p-3 text-slate-300 hover:text-[#1a5c38] hover:bg-white hover:shadow-xl rounded-xl transition-all">
                                                                <Eye size={20} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default VolunteerAdmin;
