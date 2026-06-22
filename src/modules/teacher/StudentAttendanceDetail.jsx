import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getStudentAttendanceHistory } from '../../services/attendanceService';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Navbar from '../../components/common/Navbar';
import { 
    User, 
    ChevronLeft, 
    Calendar, 
    BookOpen, 
    PieChart, 
    History,
    CheckCircle2,
    XCircle,
    Clock,
    UserMinus,
    ShieldAlert,
    TrendingUp,
    Slash
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentAttendanceDetail = () => {
    const { studentId } = useParams();
    const { t } = useLanguage();

    const [student, setStudent] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Dates for term (May 1st onwards)
            const now = new Date();
            const termStart = new Date(now.getFullYear(), 4, 1).toISOString().split('T')[0];
            const today = now.toISOString().split('T')[0];

            const [studentDoc, history] = await Promise.all([
                getDoc(doc(db, 'users', studentId)),
                getStudentAttendanceHistory(studentId, termStart, today)
            ]);

            if (studentDoc.exists()) {
                setStudent(studentDoc.data());
            }
            setRecords(history);
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [studentId, t]);

    useEffect(() => {
        if (studentId) loadData();
    }, [studentId, loadData]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
    );

    // Grouping & Analysis
    const subjects = [...new Set(records.map(r => r.subjectCode))];
    const subjectStats = subjects.map(code => {
        const sRecs = records.filter(r => r.subjectCode === code);
        const total = sRecs.length;
        const present = sRecs.filter(r => r.status === 'present').length;
        const absent = sRecs.filter(r => r.status === 'absent').length;
        const late = sRecs.filter(r => r.status === 'late').length;
        const leave_personal = sRecs.filter(r => r.status === 'leave_personal').length;
        const leave_sick = sRecs.filter(r => r.status === 'leave_sick').length;
        const rate = total > 0 ? (present / total) * 100 : 100;
        return { code, total, present, absent, late, leave_personal, leave_sick, rate };
    });

    const overallRate = records.length > 0 
        ? (records.filter(r => r.status === 'present').length / records.length) * 100 
        : 100;

    const statusIcons = {
        present: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: t('present') },
        absent: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50', label: t('absent') },
        late: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: t('late') },
        leave_personal: { icon: UserMinus, color: 'text-indigo-500', bg: 'bg-indigo-50', label: t('leave_personal') },
        leave_sick: { icon: ShieldAlert, color: 'text-blue-500', bg: 'bg-blue-50', label: t('leave_sick') }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={true} />

            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Profile Header */}
                <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 mb-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-indigo-100 rotate-3">
                        {(student?.name || '?').charAt(0)}
                    </div>
                    
                    <div className="text-center md:text-left flex-1">
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">{student?.name}</h1>
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                {student?.level}/{student?.class}
                            </span>
                        </div>
                        <div className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-3 justify-center md:justify-start">
                            <span>ID: {student?.studentId}</span>
                            <Slash size={10} className="rotate-12" />
                            <span>{student?.email}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2rem] text-center min-w-[180px]">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('attendance_rate')}</div>
                        <div className={`text-4xl font-black italic tabular-nums ${overallRate < 80 ? 'text-rose-500' : 'text-indigo-600'}`}>
                            {overallRate.toFixed(1)}%
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Subject Breakdown */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center gap-4 ml-4">
                            <BookOpen size={20} className="text-indigo-600" />
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">{t('subject_breakdown')}</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {subjectStats.map(s => (
                                <div key={s.code} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 group hover:border-indigo-200 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 italic mb-1">{s.code}</h3>
                                            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.total} {t('total_sessions')}</div>
                                        </div>
                                        <div className={`text-xl font-black tabular-nums ${s.absent > 3 ? 'text-rose-500' : 'text-emerald-500'}`}>{s.rate.toFixed(0)}%</div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                        {[
                                            { label: t('present'), val: s.present, color: 'emerald' },
                                            { label: t('absent'), val: s.absent, color: 'rose' },
                                            { label: t('late'), val: s.late, color: 'amber' },
                                            { label: t('leave_personal'), val: s.leave_personal, color: 'indigo' },
                                            { label: t('leave_sick'), val: s.leave_sick, color: 'blue' }
                                        ].map(m => (
                                            <div key={m.label} className={`bg-${m.color}-50/50 p-3 rounded-2xl text-center`}>
                                                <div className={`font-black text-sm text-${m.color}-600`}>{m.val}</div>
                                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{m.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-4 ml-4">
                            <History size={20} className="text-indigo-600" />
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">{t('timeline')}</h2>
                        </div>

                        <div className="space-y-4">
                            {records.map(r => {
                                const st = statusIcons[r.status] || statusIcons.present;
                                return (
                                    <div key={r.id} className="bg-white p-6 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-slate-50 flex items-center gap-5 group">
                                        <div className={`w-10 h-10 rounded-xl ${st.bg} ${st.color} flex items-center justify-center shrink-0`}>
                                            <st.icon size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-black text-slate-800 text-sm italic">{r.subjectCode}</h4>
                                                <span className="text-[9px] font-bold text-slate-300 tabular-nums">{r.date}</span>
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${st.color}`}>{st.label}</p>
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

export default StudentAttendanceDetail;
