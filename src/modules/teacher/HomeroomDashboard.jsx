import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { getHomeroomAttendance, getStudentsByRoom } from '../../services/attendanceService';
import Navbar from '../../components/common/Navbar';
import { 
    Users, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    UserMinus, 
    AlertCircle, 
    TrendingUp, 
    ChevronRight,
    Search,
    Calendar,
    LayoutGrid,
    AlertTriangle,
    Info,
    ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

const HomeroomDashboard = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [allRecords, setAllRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filter State
    const [dateRange, setDateRange] = useState('weekly'); // 'weekly', 'monthly', 'term'
    const [subjectFilter, setSubjectFilter] = useState('all');

    // Parse Homeroom Level/Class
    const room = useMemo(() => {
        if (!user?.homeroomClass) return null;
        // Handles "ม.1/1" or "1" (with assumed level from profile)
        if (user.homeroomClass.includes('/')) {
            const [l, c] = user.homeroomClass.split('/');
            return { level: l, class: c };
        }
        return { level: user.level, class: user.homeroomClass };
    }, [user]);

    const loadData = useCallback(async () => {
        if (!room) return;
        try {
            setLoading(true);
            const { level, class: roomClass } = room;
            
            // Calculate Dates
            const now = new Date();
            let start = new Date();
            if (dateRange === 'weekly') start.setDate(now.getDate() - 7);
            else if (dateRange === 'monthly') start.setMonth(now.getMonth() - 1);
            else start = new Date(now.getFullYear(), 4, 1); // Mock term start May 1st

            const startDate = start.toISOString().split('T')[0];
            const endDate = now.toISOString().split('T')[0];

            const [records, homeroomStudents] = await Promise.all([
                getHomeroomAttendance(level, roomClass, startDate, endDate),
                getStudentsByRoom(level, roomClass)
            ]);
            
            setAllRecords(records);
            setStudents(homeroomStudents);
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [room, dateRange, t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (!room) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] p-12 text-center shadow-xl border border-slate-100 max-w-sm">
                <Info size={48} className="text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-black text-slate-400 uppercase italic">{t('no_homeroom_assigned')}</h3>
            </div>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
    );

    // Derived Data
    const uniqueSubjects = [...new Set(allRecords.map(r => r.subjectCode))];
    const filteredRecords = subjectFilter === 'all' ? allRecords : allRecords.filter(r => r.subjectCode === subjectFilter);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = allRecords.filter(r => r.date === todayStr);

    const metrics = {
        present: todayRecords.filter(r => r.status === 'present').length,
        absent: todayRecords.filter(r => r.status === 'absent').length,
        late: todayRecords.filter(r => r.status === 'late').length,
        leave_personal: todayRecords.filter(r => r.status === 'leave_personal').length,
        leave_sick: todayRecords.filter(r => r.status === 'leave_sick').length
    };

    // Calculate Student Summaries
    const studentStats = students.map(s => {
        const sid = s.uid || s.id;
        const sRecs = filteredRecords.filter(r => r.studentId === sid);
        const total = sRecs.length;
        const presentCount = sRecs.filter(r => r.status === 'present').length;
        const absentCount = sRecs.filter(r => r.status === 'absent').length;
        const lateCount = sRecs.filter(r => r.status === 'late').length;
        
        // Red Alert: Absent > 3 in ANY subject (if in 'all' filter, check per subject)
        let redAlert = false;
        if (subjectFilter === 'all') {
            uniqueSubjects.forEach(code => {
                const subRecs = sRecs.filter(r => r.subjectCode === code);
                if (subRecs.filter(r => r.status === 'absent').length > 3) redAlert = true;
            });
        } else {
            if (absentCount > 3) redAlert = true;
        }

        const rate = total > 0 ? (presentCount / total) * 100 : 100;
        const yellowAlert = total > 5 && rate < 80;

        return { ...s, total, presentCount, absentCount, lateCount, rate, redAlert, yellowAlert };
    });

    const displayStudents = studentStats.filter(s => 
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.studentId || '').includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <Navbar showBack={true} />

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Header & Quick Stats */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight italic uppercase mb-2">
                            {t('homeroom_dashboard')} <span className="text-indigo-600">{room.level}/{room.class}</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">{t('current_standing')}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 w-full lg:w-auto">
                        {[
                            { label: t('present'), val: metrics.present, color: 'emerald', icon: CheckCircle2 },
                            { label: t('absent'), val: metrics.absent, color: 'rose', icon: XCircle },
                            { label: t('late'), val: metrics.late, color: 'amber', icon: Clock },
                            { label: t('leave_personal'), val: metrics.leave_personal, color: 'indigo', icon: UserMinus },
                            { label: t('leave_sick'), val: metrics.leave_sick, color: 'blue', icon: ShieldAlert }
                        ].map((m, i) => (
                            <div key={i} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 min-w-[140px]">
                                <m.icon className={`text-${m.color}-500 mb-2`} size={18} />
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.label} (วันนี้)</div>
                                <div className="text-2xl font-black text-slate-900 tabular-nums">{m.val}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 md:p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 mb-10">
                    <div className="flex flex-col xl:flex-row gap-6 items-center">
                        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-full xl:w-auto">
                            {[
                                { id: 'weekly', label: t('filter_weekly') },
                                { id: 'monthly', label: t('filter_monthly') },
                                { id: 'term', label: t('filter_term') }
                            ].map(m => (
                                <button 
                                    key={m.id}
                                    onClick={() => setDateRange(m.id)}
                                    className={`px-6 py-2.5 rounded-[1.15rem] text-[10px] font-black tracking-widest transition-all flex-1 xl:flex-none ${dateRange === m.id ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <select 
                            value={subjectFilter} 
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="w-full xl:w-64 px-6 py-3.5 bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer uppercase tracking-widest"
                        >
                            <option value="all">{t('all_subjects')}</option>
                            {uniqueSubjects.map(code => <option key={code} value={code}>{code}</option>)}
                        </select>

                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                                type="text" 
                                placeholder={t('search_student_placeholder')}
                                className="w-full pl-14 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-xs transition-all shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('student')}</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('attendance_rate')}</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('absent')} / {t('late')}</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('total_sessions')}</th>
                                    <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {displayStudents.map((s) => (
                                    <tr 
                                        key={s.id} 
                                        onClick={() => navigate(`/teacher/homeroom/student/${s.uid || s.id}`)}
                                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm group-hover:scale-110 transition-transform shadow-inner">
                                                    {(s.name || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900 text-base leading-tight mb-1 flex items-center gap-3">
                                                        {s.name}
                                                        {s.redAlert && <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.studentId}</span>
                                                        {s.redAlert && <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">{t('absent_limit_warning')}</span>}
                                                        {s.yellowAlert && !s.redAlert && <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">{t('low_attendance_warning')}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className={`text-lg font-black tabular-nums ${s.redAlert ? 'text-rose-600' : s.yellowAlert ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {s.rate.toFixed(1)}%
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mx-auto mt-2 overflow-hidden shadow-inner">
                                                <div className={`h-full rounded-full ${s.redAlert ? 'bg-rose-500' : s.yellowAlert ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${s.rate}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex justify-center gap-4">
                                                <div>
                                                    <div className={`font-black text-sm ${s.absentCount > 0 ? 'text-rose-500' : 'text-slate-300'}`}>{s.absentCount}</div>
                                                    <div className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{t('absent')}</div>
                                                </div>
                                                <div className="w-px h-8 bg-slate-100" />
                                                <div>
                                                    <div className={`font-black text-sm ${s.lateCount > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{s.lateCount}</div>
                                                    <div className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{t('late')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="font-black text-slate-700 tabular-nums">{s.total}</div>
                                            <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{t('slots')}</div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <ChevronRight className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" size={24} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeroomDashboard;
