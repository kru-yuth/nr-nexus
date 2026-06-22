import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { 
    getFilteredLateCheckins, 
    updateLateCheckin, 
    recordManualLateCheckin 
} from '../../services/lateCheckinService';
import { fetchAllUsers } from '../../services/userService';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
    ShieldCheck, 
    Users, 
    AlertCircle, 
    Clock, 
    Search, 
    Filter,
    Edit3,
    UserPlus,
    CheckCircle2,
    X,
    User,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Slash,
    ArrowUpDown,
    LayoutGrid
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const LateCheckinDashboard = () => {
    const { user, roles } = useAuth();
    const { t } = useLanguage();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [studentMap, setStudentMap] = useState({});

    // Filter State
    const [dateMode, setDateMode] = useState('today'); // 'today', 'week', 'month'
    const [anchorDate, setAnchorDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterClass, setFilterClass] = useState('all');

    // Manual Record Modal State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [lateStatus, setLateStatus] = useState('late_minor');
    const [manualNote, setManualNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({
        status: 'late_minor',
        deductedScore: 5,
        note: ''
    });

    const hasDisciplineWrite = roles.includes('admin') || user?.permissions?.includes('discipline.write');

    // Date Range Logic
    const getDateRange = React.useCallback(() => {
        const now = new Date(anchorDate);
        let start, end;

        if (dateMode === 'today') {
            start = anchorDate;
            end = anchorDate;
        } else if (dateMode === 'week') {
            const day = now.getDay();
            const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(new Date(now).setDate(diffToMon));
            const fri = new Date(new Date(mon).setDate(mon.getDate() + 4));
            start = mon.toISOString().split('T')[0];
            end = fri.toISOString().split('T')[0];
        } else if (dateMode === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            start = firstDay.toISOString().split('T')[0];
            end = lastDay.toISOString().split('T')[0];
        }
        return { start, end };
    }, [anchorDate, dateMode]);

    // Part 1: Batch fetch user names
    useEffect(() => {
        const fetchStudentNames = async () => {
            const sids = [...new Set(records.map(r => r.studentId))].filter(id => id && !studentMap[id]);
            if (sids.length === 0) return;

            try {
                const docs = await Promise.all(sids.map(id => getDoc(doc(db, 'users', id))));
                const newMap = {};
                docs.forEach(d => {
                    if (d.exists()) {
                        const data = d.data();
                        newMap[d.id] = `${data.prefix || data.Title || ''}${data.firstName || data.FirstName || ''} ${data.lastName || data.LastName || ''}`.trim();
                    }
                });
                setStudentMap(prev => ({ ...prev, ...newMap }));
            } catch (err) {
                console.error("Error fetching names:", err);
            }
        };

        if (records.length > 0) fetchStudentNames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records]);

    useEffect(() => {
        const { start, end } = getDateRange();
        setLoading(true);
        const unsubscribe = getFilteredLateCheckins(start, end, (data) => {
            setRecords(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [getDateRange]);

    const metrics = {
        total: records.length,
        major: records.filter(r => r.status === 'late_major').length,
        manual: records.filter(r => r.recordedBy === 'discipline').length,
        anomalies: records.filter(r => r.status === 'warning').length
    };

    const filteredRecords = records.filter(r => {
        const search = searchTerm.toLowerCase().trim();
        const studentName = studentMap[r.studentId] || "";
        const matchesSearch = !search || 
            (r.studentEmail || '').toLowerCase().includes(search) ||
            (r.studentId || '').includes(search) ||
            studentName.toLowerCase().includes(search);
        
        if (!matchesSearch) return false;
        
        // Use native fields if available, otherwise would need client-side join
        // For existing records, we might need a more complex join logic if they are missing
        if (filterLevel !== 'all' && r.level !== filterLevel) return false;
        if (filterClass !== 'all' && r.class !== filterClass) return false;

        return true;
    });

    const handleOpenManualModal = async () => {
        setIsManualModalOpen(true);
        setSelectedStudent(null);
        setStudentSearch('');
        setManualNote('');
        
        if (allUsers.length === 0) {
            try {
                const users = await fetchAllUsers();
                setAllUsers(users.filter(u => u.roles?.includes('student')));
            } catch (err) {
                console.error("Error opening manual record modal:", err);
                toast.error(t('operation_failed'));
            }
        }
    };

    const handleOpenEditModal = (record) => {
        setRecordToEdit(record);
        setEditFormData({
            status: record.status,
            deductedScore: record.deductedScore || 0,
            note: record.note || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editFormData.note.trim()) return toast.error(t('note_placeholder'));
        
        setIsSubmitting(true);
        try {
            await updateLateCheckin(recordToEdit, editFormData, user.uid);
            toast.success(t('update_success'));
            setIsEditModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error(t('operation_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const foundStudents = studentSearch.length >= 2 
        ? allUsers.filter(u => 
            (u.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || 
            (u.studentId || '').includes(studentSearch) ||
            (u.email || '').toLowerCase().includes(studentSearch.toLowerCase())
          ).slice(0, 5)
        : [];

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return toast.error(t('select_student_error'));
        
        setIsSubmitting(true);
        try {
            await recordManualLateCheckin(selectedStudent, lateStatus, manualNote, user.uid);
            toast.success(`${t('recorded_success')} ${selectedStudent.name}`);
            setIsManualModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error(t('operation_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const changeDate = (offset) => {
        const d = new Date(anchorDate);
        if (dateMode === 'today') d.setDate(d.getDate() + offset);
        else if (dateMode === 'week') d.setDate(d.getDate() + (offset * 7));
        else if (dateMode === 'month') d.setMonth(d.getMonth() + offset);
        setAnchorDate(d.toISOString().split('T')[0]);
    };

    const levels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const rooms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen pb-24">
            {/* Part 3: Back Button */}
            <div className="max-w-7xl mx-auto mb-6">
                <Link to="/hub" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-black text-[10px] uppercase tracking-widest transition-all group">
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    {t('return_to_hub')}
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4 uppercase italic">
                        {t('late_checkin_title')} <span className="text-[#1a5c38]">{t('monitor')}</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">{t('late_checkin_subtitle')}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    {hasDisciplineWrite && (
                        <button 
                            onClick={handleOpenManualModal}
                            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-[#1a5c38] text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-slate-900 transition-all hover:-translate-y-1 active:translate-y-0"
                        >
                            <UserPlus size={18} /> {t('manual_record')}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-100 border border-slate-100 mb-10 space-y-6">
                <div className="flex flex-col xl:flex-row gap-6 items-center">
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-full xl:w-auto">
                        {['today', 'week', 'month'].map(m => (
                            <button 
                                key={m}
                                onClick={() => setDateMode(m)}
                                className={`px-6 py-2.5 rounded-[1.15rem] text-[10px] font-black tracking-widest transition-all flex-1 xl:flex-none ${dateMode === m ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t(m)}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100 w-full xl:w-auto">
                        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-emerald-600 shadow-sm"><ChevronLeft size={20} /></button>
                        <div className="flex-1 text-center min-w-[150px]">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                {dateMode === 'today' ? anchorDate : 
                                 dateMode === 'week' ? `${getDateRange().start} - ${getDateRange().end}` :
                                 new Date(anchorDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-emerald-600 shadow-sm"><ChevronRight size={20} /></button>
                    </div>

                    <div className="h-px xl:h-10 w-full xl:w-px bg-slate-100 mx-2" />

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="flex-1 xl:flex-none px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer hover:bg-slate-100 transition-all uppercase tracking-widest">
                            <option value="all">{t('all_levels')}</option>
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="flex-1 xl:flex-none px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer hover:bg-slate-100 transition-all uppercase tracking-widest">
                            <option value="all">{t('all_rooms')}</option>
                            {rooms.map(r => <option key={r} value={r}>{t('room_label')} {r}</option>)}
                        </select>
                    </div>

                    <div className="relative flex-1 w-full xl:max-w-xs">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                            type="text" 
                            placeholder={t('search_placeholder')}
                            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-xs transition-all shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
                {[
                    { label: t('late_today'), val: metrics.total, color: 'emerald', icon: Clock },
                    { label: t('late_major_today'), val: metrics.major, color: 'rose', icon: AlertCircle },
                    { label: t('recorded_by_teacher'), val: metrics.manual, color: 'amber', icon: UserPlus },
                    { label: t('anomalies_found'), val: metrics.anomalies, color: 'slate', icon: ShieldCheck },
                ].map((m, i) => (
                    <div key={i} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-${m.color}-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
                        <m.icon className={`text-${m.color}-500 mb-3 md:mb-4 relative z-10`} size={20} />
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{m.label}</p>
                        <h3 className="text-2xl md:text-4xl font-black text-slate-900 mt-1 relative z-10 tabular-nums">{m.val}</h3>
                    </div>
                ))}
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                        {t('showing_entries', { count: filteredRecords.length })}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Sync Enabled</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('student')}</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('arrival_time')}</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('status')}</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('method')}</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="py-20 text-center animate-pulse font-black text-slate-200 uppercase tracking-[0.3em]">{t('loading')}</td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan="5" className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.3em]">{t('no_records_found')}</td></tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors group ${r.status === 'late_major' ? 'bg-rose-50/10' : r.status === 'cancelled' ? 'opacity-40 grayscale italic' : ''}`}>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner ${r.status === 'cancelled' ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {(studentMap[r.studentId] || r.studentEmail || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900 text-sm leading-tight mb-1">{studentMap[r.studentId] || r.studentEmail}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-2">
                                                        <span>ID: {r.studentId}</span>
                                                        {r.level && (
                                                            <>
                                                                <Slash size={8} className="rotate-12" />
                                                                <span>{r.level}/{r.class}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="font-black text-slate-800 tabular-nums">
                                                {new Date(r.checkInTime?.seconds * 1000).toLocaleTimeString('th-TH')}
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{r.date}</div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                r.status === 'late_minor' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                r.status === 'warning' ? 'bg-emerald-50 text-[#1a5c38] border-emerald-100' :
                                                r.status === 'cancelled' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {r.status === 'late_minor' ? t('late_minor') : r.status === 'warning' ? t('late_warning') : r.status === 'cancelled' ? 'CANCELLED' : t('late_major')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {r.recordedBy === 'self' ? (
                                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                                ) : (
                                                    <UserPlus size={14} className="text-amber-500" />
                                                )}
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.recordedBy}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {hasDisciplineWrite && r.status !== 'cancelled' ? (
                                                <button onClick={() => handleOpenEditModal(r)} className="p-3 text-slate-300 hover:text-[#1a5c38] hover:bg-white hover:shadow-xl rounded-xl transition-all">
                                                    <Edit3 size={18} />
                                                </button>
                                            ) : (
                                                <div className="p-3 text-slate-200"><Slash size={18} /></div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Record Modal */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-8 md:p-12 relative my-8 md:my-12 animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsManualModalOpen(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <X size={24} />
                        </button>
                        
                        <div className="flex items-center gap-6 mb-8 md:mb-12">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center text-emerald-600 shadow-inner">
                                <UserPlus size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight italic uppercase">{t('manual_record')}</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{t('discipline_intervention')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-8 md:space-y-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('search_student')}</label>
                                {!selectedStudent ? (
                                    <div className="relative">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                        <input 
                                            type="text" 
                                            placeholder={t('search_student_placeholder')}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner"
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                        />
                                        {foundStudents.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[130]">
                                                {foundStudents.map(s => (
                                                    <button 
                                                        key={s.id} 
                                                        type="button"
                                                        onClick={() => setSelectedStudent(s)}
                                                        className="w-full px-8 py-5 text-left hover:bg-emerald-50 transition-colors flex items-center gap-4 group"
                                                    >
                                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-emerald-100 group-hover:text-emerald-600">
                                                            {(s.name || '?').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-800 text-sm leading-none mb-1">{s.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.studentId} • {s.level}/{s.class}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-emerald-50 p-6 rounded-[2rem] border-2 border-emerald-100 animate-in fade-in slide-in-from-left-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm font-black italic">
                                                {(selectedStudent.name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-black text-emerald-900 text-base leading-none mb-1">{selectedStudent.name}</div>
                                                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest italic">{selectedStudent.studentId} • {selectedStudent.level}/{selectedStudent.class}</div>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setSelectedStudent(null)}
                                            className="p-2 bg-white/50 text-emerald-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'late_minor', label: t('late_minor'), time: '08:00 - 08:30', points: '-5', color: 'emerald' },
                                    { id: 'late_major', label: t('late_major'), time: '08:30 เป็นต้นไป', points: '-10', color: 'rose' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setLateStatus(opt.id)}
                                        className={`p-6 rounded-[2rem] border-2 text-center transition-all ${lateStatus === opt.id ? `bg-${opt.color}-500 border-${opt.color}-500 text-white shadow-xl shadow-${opt.color}-100` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        <div className="font-black text-lg leading-none mb-1">{opt.label}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${lateStatus === opt.id ? 'text-white/80' : 'text-slate-400'}`}>{opt.time}</div>
                                        <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${lateStatus === opt.id ? 'text-white/50' : 'text-slate-300'}`}>{opt.points} POINTS</div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('internal_note')}</label>
                                <textarea 
                                    className="w-full px-8 py-6 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all shadow-inner placeholder:text-slate-300 min-h-[120px]"
                                    placeholder={t('note_placeholder')}
                                    value={manualNote}
                                    onChange={(e) => setManualNote(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row justify-end gap-4 pt-10 border-t border-slate-50">
                                <button type="button" onClick={() => setIsManualModalOpen(false)} className="px-10 py-5 rounded-[1.5rem] text-slate-400 font-black hover:text-slate-900 transition-all uppercase text-xs tracking-[0.2em]">{t('cancel_btn')}</button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !selectedStudent} 
                                    className="px-14 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl shadow-slate-300 hover:bg-[#1a5c38] hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 uppercase text-xs tracking-[0.2em]"
                                >
                                    {isSubmitting ? t('processing') : t('record_disciplinary')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Record Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-8 md:p-12 relative my-8 md:my-12 animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <X size={24} />
                        </button>
                        
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                <Edit3 size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight italic uppercase">Edit Record</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{recordToEdit.studentEmail}</p>
                            </div>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'late_minor', label: t('late_minor'), points: 5, color: 'emerald' },
                                    { id: 'late_major', label: t('late_major'), points: 10, color: 'rose' },
                                    { id: 'warning', label: t('late_warning'), points: 0, color: 'amber' },
                                    { id: 'cancelled', label: 'CANCEL', points: 0, color: 'slate' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setEditFormData({ ...editFormData, status: opt.id, deductedScore: opt.points })}
                                        className={`p-6 rounded-[1.5rem] border-2 text-center transition-all ${editFormData.status === opt.id ? `bg-${opt.color}-500 border-${opt.color}-500 text-white shadow-xl` : 'bg-white border-slate-100 text-slate-400'}`}
                                    >
                                        <div className="font-black text-sm uppercase">{opt.label}</div>
                                        <div className="text-[10px] font-bold opacity-60">-{opt.points} PTS</div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Reason for Modification (Required)</label>
                                <textarea 
                                    className="w-full px-8 py-6 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-blue-500/10 font-bold text-sm transition-all shadow-inner placeholder:text-slate-300 min-h-[100px]"
                                    placeholder="Why is this record being updated?"
                                    required
                                    value={editFormData.note}
                                    onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row justify-end gap-4 pt-8 border-t border-slate-50">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-10 py-5 rounded-[1.5rem] text-slate-400 font-black hover:text-slate-900 transition-all uppercase text-[10px]">{t('cancel_btn')}</button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="px-14 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-[#1a5c38] transition-all disabled:opacity-50 uppercase text-[10px]"
                                >
                                    {isSubmitting ? t('processing') : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LateCheckinDashboard;
