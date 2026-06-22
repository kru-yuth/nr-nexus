import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { getStudentPersonalAttendance } from '../../services/attendanceService';
import Navbar from '../../components/common/Navbar';
import { 
    TrendingUp, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    UserMinus, 
    ShieldAlert, 
    Calendar,
    BookOpen,
    History,
    ChevronRight,
    Slash
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentAttendance = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('monthly'); // 'weekly', 'monthly', 'term'

    useEffect(() => {
        if (user) loadData();
    }, [loadData, user]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const now = new Date();
            let start = new Date();
            if (dateRange === 'weekly') start.setDate(now.getDate() - 7);
            else if (dateRange === 'monthly') start.setMonth(now.getMonth() - 1);
            else start = new Date(now.getFullYear(), 4, 1); // Mock term start May 1st

            const startDate = start.toISOString().split('T')[0];
            const endDate = now.toISOString().split('T')[0];

            const data = await getStudentPersonalAttendance(user.uid, startDate, endDate);
            setRecords(data);
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [user, dateRange, t]);

    // Derived Metrics
    const total = records.length;
    const counts = {
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        leave_personal: records.filter(r => r.status === 'leave_personal').length,
        leave_sick: records.filter(r => r.status === 'leave_sick').length
    };
    const rate = total > 0 ? (counts.present / total) * 100 : 100;

    // Per Subject Breakdown
    const subjects = [...new Set(records.map(r => r.subjectCode))];
    const subjectBreakdown = subjects.map(code => {
        const sRecs = records.filter(r => r.subjectCode === code);
        const sTotal = sRecs.length;
        const sPresent = sRecs.filter(r => r.status === 'present').length;
        const sRate = sTotal > 0 ? (sPresent / sTotal) * 100 : 100;
        return { code, total: sTotal, present: sPresent, rate: sRate };
    });

    const statusMap = {
        present: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: t('present') },
        absent: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', label: t('absent') },
        late: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: t('late') },
        leave_personal: { icon: UserMinus, color: 'text-indigo-500', bg: 'bg-indigo-50', label: t('leave_personal') },
        leave_sick: { icon: ShieldAlert, color: 'text-blue-500', bg: 'bg-blue-50', label: t('leave_sick') }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <Navbar showBack={true} />

            <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase mb-2">
                            {t('my_attendance')}
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">{t('academic_standing')}</p>
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
                        {[
                            { id: 'weekly', label: t('filter_weekly') },
                            { id: 'monthly', label: t('filter_monthly') },
                            { id: 'term', label: t('filter_term') }
                        ].map(m => (
                            <button 
                                key={m.id}
                                onClick={() => setDateRange(m.id)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${dateRange === m.id ? 'bg-[#1a5c38] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Overall Score Card */}
                <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden mb-10 group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="w-40 h-40 rounded-full border-[10px] border-emerald-50 flex items-center justify-center relative">
                            <svg className="w-full h-full -rotate-90">
                                <circle 
                                    cx="80" cy="80" r="70" 
                                    fill="transparent" 
                                    stroke="#10b981" 
                                    strokeWidth="10" 
                                    strokeDasharray="440" 
                                    strokeDashoffset={440 - (440 * rate) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-slate-900 italic tabular-nums">{rate.toFixed(0)}%</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('attendance_rate')}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 flex-1 w-full">
                            {[
                                { id: 'present', label: t('present'), val: counts.present, color: 'emerald' },
                                { id: 'absent', label: t('absent'), val: counts.absent, color: 'rose' },
                                { id: 'late', label: t('late'), val: counts.late, color: 'amber' },
                                { id: 'leave_personal', label: t('leave_personal'), val: counts.leave_personal, color: 'indigo' },
                                { id: 'leave_sick', label: t('leave_sick'), val: counts.leave_sick, color: 'blue' }
                            ].map(m => (
                                <div key={m.id} className={`bg-${m.color}-50/30 p-5 rounded-3xl border border-${m.color}-100/50 text-center`}>
                                    <div className={`text-2xl font-black text-${m.color}-600 tabular-nums`}>{m.val}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Subject Performance */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 ml-4">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                <BookOpen size={18} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">{t('subject_breakdown')}</h2>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                <div className="p-10 text-center animate-pulse text-slate-200">Loading...</div>
                            ) : subjectBreakdown.length === 0 ? (
                                <div className="p-10 text-center text-slate-300 italic uppercase text-[10px] tracking-widest font-black">No records found</div>
                            ) : (
                                subjectBreakdown.map(s => (
                                    <div key={s.code} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all">
                                        <div>
                                            <h3 className="font-black text-slate-900 italic text-lg leading-none mb-1">{s.code}</h3>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.total} {t('total_sessions')}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-xl font-black tabular-nums ${s.rate < 80 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {s.rate.toFixed(0)}%
                                            </div>
                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden shadow-inner">
                                                <div className={`h-full ${s.rate < 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${s.rate}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent History Timeline */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 ml-4">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                <History size={18} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">{t('timeline')}</h2>
                        </div>

                        <div className="space-y-4">
                            {records.slice(0, 10).map(r => {
                                const st = statusMap[r.status] || statusMap.present;
                                return (
                                    <div key={r.id} className="bg-white p-5 rounded-[1.75rem] shadow-lg shadow-slate-200/50 border border-slate-50 flex items-center gap-5">
                                        <div className={`w-10 h-10 rounded-xl ${st.bg} ${st.color} flex items-center justify-center shrink-0`}>
                                            <st.icon size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-black text-slate-800 text-sm italic">{r.subjectCode}</h4>
                                                <span className="text-[9px] font-bold text-slate-300 tabular-nums">{r.date}</span>
                                            </div>
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${st.color}`}>{st.label}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendance;
