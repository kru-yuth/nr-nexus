import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getSchoolAttendance } from '../../services/attendanceService';
import Navbar from '../../components/common/Navbar';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    LineChart, 
    Line,
    Legend,
    Cell
} from 'recharts';
import { 
    TrendingUp, 
    BarChart3, 
    Users, 
    AlertCircle, 
    Clock, 
    ChevronRight,
    Search,
    Calendar,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    UserMinus,
    ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

const AttendanceAdminDashboard = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateMode, setDateRange] = useState('weekly'); // 'daily', 'weekly', 'monthly'

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const now = new Date();
            let start = new Date();
            
            if (dateMode === 'daily') start = now; // Only today
            else if (dateMode === 'weekly') start.setDate(now.getDate() - 7);
            else start.setMonth(now.getMonth() - 1);

            const startDate = start.toISOString().split('T')[0];
            const endDate = now.toISOString().split('T')[0];

            const data = await getSchoolAttendance(startDate, endDate);
            setRecords(data);
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [dateMode, t]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- Aggregation Logic ---

    // 1. Daily Trend
    const dates = [...new Set(records.map(r => r.date))].sort();
    const trendData = dates.map(d => {
        const dRecs = records.filter(r => r.date === d);
        const present = dRecs.filter(r => r.status === 'present').length;
        const total = dRecs.length;
        return {
            date: d.slice(5), // MM-DD
            rate: total > 0 ? Math.round((present / total) * 100) : 100
        };
    });

    // 2. Level Comparison
    const levels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const levelData = levels.map(lvl => {
        const lRecs = records.filter(r => r.level === lvl);
        const present = lRecs.filter(r => r.status === 'present').length;
        const total = lRecs.length;
        return {
            name: lvl,
            rate: total > 0 ? Math.round((present / total) * 100) : 100
        };
    });

    // 3. Leaderboards (Top 10)
    const studentMap = {};
    records.forEach(r => {
        if (!studentMap[r.studentId]) studentMap[r.studentId] = { id: r.studentId, name: r.studentName, absent: 0, late: 0 };
        if (r.status === 'absent') studentMap[r.studentId].absent++;
        if (r.status === 'late') studentMap[r.studentId].late++;
    });

    const topAbsentees = Object.values(studentMap)
        .sort((a, b) => b.absent - a.absent)
        .filter(s => s.absent > 0)
        .slice(0, 5);

    const topLates = Object.values(studentMap)
        .sort((a, b) => b.late - a.late)
        .filter(s => s.late > 0)
        .slice(0, 5);

    const overallRate = records.length > 0 
        ? (records.filter(r => r.status === 'present').length / records.length) * 100 
        : 100;

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <Navbar showBack={true} />

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight italic uppercase mb-2">
                            {t('attendance_analytics')}
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">{t('school_overview')}</p>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
                        {['daily', 'weekly', 'monthly'].map(m => (
                            <button 
                                key={m}
                                onClick={() => setDateRange(m)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${dateMode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t(m)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50" />
                        <TrendingUp className="text-emerald-500 mb-4" size={24} />
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('attendance_rate')}</div>
                        <div className="flex items-end gap-3">
                            <div className="text-5xl font-black text-slate-900 tabular-nums italic">{overallRate.toFixed(1)}%</div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50" />
                        <AlertCircle className="text-rose-500 mb-4" size={24} />
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('absent')}</div>
                        <div className="text-5xl font-black text-slate-900 tabular-nums italic">{records.filter(r => r.status === 'absent').length}</div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50" />
                        <Clock className="text-amber-500 mb-4" size={24} />
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('late')}</div>
                        <div className="text-5xl font-black text-slate-900 tabular-nums italic">{records.filter(r => r.status === 'late').length}</div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50" />
                        <UserMinus className="text-indigo-500 mb-4" size={24} />
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('leave_personal')}</div>
                        <div className="text-5xl font-black text-slate-900 tabular-nums italic">{records.filter(r => r.status === 'leave_personal').length}</div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50" />
                        <ShieldAlert className="text-blue-500 mb-4" size={24} />
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('leave_sick')}</div>
                        <div className="text-5xl font-black text-slate-900 tabular-nums italic">{records.filter(r => r.status === 'leave_sick').length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                    {/* Chart 1: Daily Trend */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">{t('daily_trend')}</h2>
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><TrendingUp size={20} /></div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                        labelStyle={{ fontWeight: 'black', marginBottom: '0.5rem' }}
                                    />
                                    <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={4} dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chart 2: Level Comparison */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">{t('level_comparison')}</h2>
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><BarChart3 size={20} /></div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={levelData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} domain={[0, 100]} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                    />
                                    <Bar dataKey="rate" radius={[10, 10, 0, 0]}>
                                        {levelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.rate < 80 ? '#f43f5e' : '#10b981'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Top 10 Absentees */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
                        <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight mb-8">{t('top_absentees')}</h2>
                        <div className="space-y-4">
                            {topAbsentees.map((s, i) => (
                                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-rose-50 transition-all cursor-pointer" onClick={() => navigate(`/teacher/homeroom/student/${s.id}`)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-xs text-slate-400 group-hover:text-rose-500 shadow-sm">{i+1}</div>
                                        <span className="font-black text-slate-800 text-sm">{s.name}</span>
                                    </div>
                                    <div className="text-rose-600 font-black tabular-nums">{s.absent} <span className="text-[8px] uppercase tracking-widest text-rose-300 ml-1">{t('absent')}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top 10 Lates */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
                        <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight mb-8">{t('top_lates')}</h2>
                        <div className="space-y-4">
                            {topLates.map((s, i) => (
                                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-amber-50 transition-all cursor-pointer" onClick={() => navigate(`/teacher/homeroom/student/${s.id}`)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-xs text-slate-400 group-hover:text-amber-500 shadow-sm">{i+1}</div>
                                        <span className="font-black text-slate-800 text-sm">{s.name}</span>
                                    </div>
                                    <div className="text-amber-600 font-black tabular-nums">{s.late} <span className="text-[8px] uppercase tracking-widest text-amber-300 ml-1">{t('late')}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceAdminDashboard;
