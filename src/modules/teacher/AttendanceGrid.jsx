import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { 
    getSession, 
    getSessionRecords, 
    batchSaveRecords,
    getLateCheckinsForDate,
    getStudentsByRoom 
} from '../../services/attendanceService';
import Navbar from '../../components/common/Navbar';
import { 
    Users, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    UserMinus, 
    ShieldAlert, 
    Save, 
    ChevronLeft,
    Search,
    User,
    Slash,
    ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const AttendanceGrid = () => {
    const { sessionId } = useParams();
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [session, setSession] = useState(null);
    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState({}); // studentId -> record
    const [lateSyncMap, setLateSyncMap] = useState({}); // studentId -> lateRecord
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const sess = await getSession(sessionId);
            if (!sess) {
                toast.error("ไม่พบข้อมูลเซสชัน");
                navigate('/teacher/attendance-setup');
                return;
            }
            setSession(sess);

            // Fetch Students & Records & Late Sync (if Period 0)
            const [classStudents, existingRecords, lateSync] = await Promise.all([
                getStudentsByRoom(sess.level, sess.class),
                getSessionRecords(sessionId),
                sess.period === '0' ? getLateCheckinsForDate(sess.date, sess.level, sess.class) : Promise.resolve({})
            ]);

            setStudents(classStudents);
            setRecords(existingRecords);
            setLateSyncMap(lateSync);

            // If new session (no records), pre-fill Period 0 from Late Sync
            if (Object.keys(existingRecords).length === 0 && sess.period === '0') {
                const initial = {};
                classStudents.forEach(s => {
                    if (lateSync[s.uid || s.id]) {
                        initial[s.uid || s.id] = { status: 'late' };
                    } else {
                        initial[s.uid || s.id] = { status: 'present' };
                    }
                });
                setRecords(initial);
            } else if (Object.keys(existingRecords).length === 0) {
                // Pre-fill everyone as 'present' for convenience
                const initial = {};
                classStudents.forEach(s => { initial[s.uid || s.id] = { status: 'present' }; });
                setRecords(initial);
            }

        } catch (err) {
            console.error(err);
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [sessionId, navigate, t]);

    useEffect(() => {
        if (sessionId) loadData();
    }, [sessionId, loadData]);

    const toggleStatus = (studentId, status) => {
        setRecords(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const recordsToSave = students.map(s => {
                const id = s.uid || s.id;
                return {
                    studentId: id,
                    studentName: s.name,
                    status: records[id]?.status || 'present'
                };
            });

            await batchSaveRecords(sessionId, session, recordsToSave, user.uid);
            toast.success(t('update_success'));
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s => 
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.studentId || '').includes(searchTerm)
    );

    const stats = students.reduce((acc, s) => {
        const sid = s.uid || s.id;
        const status = records[sid]?.status || 'present';
        if (status === 'present') acc.present++;
        else if (status === 'absent') acc.absent++;
        else if (status === 'late') acc.late++;
        else if (status === 'leave_personal') acc.leave_personal++;
        else if (status === 'leave_sick') acc.leave_sick++;
        return acc;
    }, { present: 0, absent: 0, late: 0, leave_personal: 0, leave_sick: 0 });

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a5c38] border-t-transparent"></div>
        </div>
    );

    const statuses = [
        { id: 'present', label: t('present'), color: 'emerald', icon: CheckCircle2 },
        { id: 'absent', label: t('absent'), color: 'rose', icon: XCircle },
        { id: 'late', label: t('late'), color: 'amber', icon: Clock },
        { id: 'leave_personal', label: t('leave_personal'), color: 'indigo', icon: UserMinus },
        { id: 'leave_sick', label: t('leave_sick'), color: 'blue', icon: ShieldAlert }
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            <Navbar showBack={true} />
            
            {/* Session Header */}
            <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <button onClick={() => navigate('/teacher/attendance-setup')} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all">
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{session?.subjectCode}</h1>
                                    <Slash size={12} className="text-slate-200 rotate-12" />
                                    <span className="text-lg font-black text-emerald-600">{session?.level}/{session?.class}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span>{session?.date}</span>
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span>{session?.period === '0' ? t('flag_period') : `${t('period_label')} ${session?.period}`}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
                            {statuses.map(st => {
                                const count = st.id === 'leave_personal' ? stats.leave_personal 
                                            : st.id === 'leave_sick' ? stats.leave_sick 
                                            : stats[st.id];
                                
                                return (
                                    <div key={st.id} className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-${st.color}-50 border border-${st.color}-100 shrink-0`}>
                                        <div className={`w-2 h-2 rounded-full bg-${st.color}-500`} />
                                        <span className={`text-[10px] font-black text-${st.color}-700 uppercase tracking-widest whitespace-nowrap`}>
                                            {st.label}: {count || 0}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Search & Bulk Actions */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                            type="text" 
                            placeholder="ค้นหารหัส หรือ ชื่อนักเรียน..."
                            className="w-full pl-12 pr-6 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-[#1a5c38]/10 font-bold text-sm shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center justify-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#1a5c38] transition-all disabled:opacity-50"
                    >
                        {saving ? t('saving') : <><Save size={18} /> {t('save_all')}</>}
                    </button>
                </div>

                {/* Students List/Table */}
                <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto md:overflow-visible">
                        <table className="w-full text-left border-collapse">
                            <thead className="hidden md:table-header-group">
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20 text-center">No.</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">{t('student_id')}</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('full_identity')}</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">{t('attendance_status')}</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group divide-y divide-slate-100">
                                {(() => {
                                    const sortedStudents = [...filteredStudents].sort((a, b) => {
                                        const isMale = (s) => s.gender === 'ชาย' || (!s.gender && (s.name?.startsWith('เด็กชาย') || s.name?.startsWith('นาย')));
                                        const gA = isMale(a) ? 1 : 2;
                                        const gB = isMale(b) ? 1 : 2;
                                        if (gA !== gB) return gA - gB;
                                        return (a.studentId || '').localeCompare(b.studentId || '', undefined, {numeric: true});
                                    });

                                    return sortedStudents.map((s, idx) => {
                                        const sid = s.uid || s.id;
                                        const currentStatus = records[sid]?.status || 'present';
                                        const isLateSynced = lateSyncMap[sid];
                                        const isMale = (u) => u.gender === 'ชาย' || (!u.gender && (u.name?.startsWith('เด็กชาย') || u.name?.startsWith('นาย')));
                                        const currentGender = isMale(s) ? 'ชาย' : 'หญิง';
                                        
                                        let showGenderHeader = false;
                                        if (idx === 0) showGenderHeader = true;
                                        else {
                                            const prevStudent = sortedStudents[idx - 1];
                                            if (currentGender !== (isMale(prevStudent) ? 'ชาย' : 'หญิง')) showGenderHeader = true;
                                        }

                                        return (
                                            <React.Fragment key={sid}>
                                                {showGenderHeader && (
                                                    <tr className="block md:table-row bg-slate-50/30">
                                                        <td colSpan="4" className="block md:table-cell px-8 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${currentGender === 'ชาย' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                                                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                                                                    {currentGender === 'ชาย' ? t('male') : t('female')}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr className={`block md:table-row group transition-all duration-300 hover:bg-slate-50/70 ${currentStatus !== 'present' ? 'bg-slate-50/30' : ''}`}>
                                                    <td className="hidden md:table-cell px-8 py-5 text-center text-xs font-black text-slate-300 italic">{idx + 1}</td>
                                                    <td className="hidden md:table-cell px-6 py-5">
                                                        <div className="text-sm font-black text-slate-500 tracking-tighter">{s.studentId}</div>
                                                    </td>
                                                    <td className="block md:table-cell px-6 md:px-6 py-5">
                                                        <div className="flex items-center justify-between md:justify-start gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="md:hidden text-[10px] font-black text-slate-300 italic w-6">{idx + 1}</div>
                                                                <div className="relative">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm transition-all group-hover:rotate-6 ${s.uid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                                                                        {(s.name || '?').charAt(0)}
                                                                    </div>
                                                                    {isLateSynced && (
                                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm" title={t('checked_late_badge')}>
                                                                            <Clock size={10} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-black text-slate-900 leading-tight">{s.name}</div>
                                                                    <div className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.studentId}</div>
                                                                    {isLateSynced && (
                                                                        <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest block mt-0.5">{t('late_checkin_auto')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Mobile Mini Status Badge */}
                                                            <div className="md:hidden">
                                                                <div className={`w-3 h-3 rounded-full bg-${statuses.find(st => st.id === currentStatus)?.color}-500 shadow-sm`} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="block md:table-cell px-4 md:px-8 py-4 md:py-5 border-t border-slate-50 md:border-none">
                                                        <div className="flex justify-between md:justify-center items-center gap-1">
                                                            {statuses.map(st => (
                                                                <button 
                                                                    key={st.id}
                                                                    onClick={() => toggleStatus(sid, st.id)}
                                                                    className={`flex-1 md:flex-none p-2 md:p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 min-w-[58px] md:min-w-[64px] ${
                                                                        currentStatus === st.id 
                                                                        ? `bg-${st.color}-500 border-${st.color}-500 text-white shadow-lg scale-105 z-10` 
                                                                        : 'bg-white border-slate-50 text-slate-300 hover:border-slate-100 hover:text-slate-400'
                                                                    }`}
                                                                >
                                                                    <st.icon size={16} className="md:w-[18px] md:h-[18px]" />
                                                                    <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest ${currentStatus === st.id ? 'text-white' : 'text-slate-400'}`}>
                                                                        {st.label}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    });
                                })()}
                                {filteredStudents.length === 0 && (
                                    <tr className="block md:table-row">
                                        <td colSpan="4" className="block md:table-cell py-20 text-center opacity-40">
                                            <Users size={48} className="mx-auto mb-4 text-slate-200" />
                                            <p className="font-black text-xs text-slate-400 uppercase tracking-widest">{t('no_students')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceGrid;
