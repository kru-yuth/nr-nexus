import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { getSubjectsByTeacher, createSession } from '../../services/attendanceService';
import Navbar from '../../components/common/Navbar';
import { 
    Calendar, 
    BookOpen, 
    Users, 
    Clock, 
    ChevronRight, 
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    MessageSquare,
    Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

const AttendanceSetup = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [backfillReason, setBackfillReason] = useState('');
    const [selectedPeriods, setSelectedPeriods] = useState([]); // Array of numbers

    // Bug 2: Auto-detect homeroom for Period 0
    useEffect(() => {
        if (selectedPeriods.includes(0) && user?.homeroomClass) {
            try {
                const [lvl, cls] = user.homeroomClass.split('/');
                setSelectedRoom({ level: lvl, class: cls });
                setSelectedSubject(null);
            } catch (e) {
                console.error("Error parsing homeroomClass:", e);
            }
        }
    }, [selectedPeriods, user]);

    const loadSubjects = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getSubjectsByTeacher(user.uid);
            setSubjects(data);
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [user?.uid, t]);

    useEffect(() => {
        if (user) loadSubjects();
    }, [user, loadSubjects]);

    const isPastDate = date < new Date().toISOString().split('T')[0];

    const togglePeriod = (p) => {
        if (selectedPeriods.includes(p)) {
            setSelectedPeriods(prev => prev.filter(x => x !== p));
            return;
        }

        // Business Rule: Period 0 is solo
        if (p === 0) {
            setSelectedPeriods([0]);
            setSelectedSubject(null); // Assembly is a special case
            return;
        }
        if (selectedPeriods.includes(0)) {
            setSelectedPeriods([p]);
            return;
        }

        // Business Rule: Max 2 consecutive
        if (selectedPeriods.length >= 2) {
            toast.error("เลือกได้สูงสุด 2 คาบติดกัน");
            return;
        }

        if (selectedPeriods.length === 1) {
            const first = selectedPeriods[0];
            if (Math.abs(first - p) !== 1) {
                toast.error("กรุณาเลือกคาบที่ติดต่อกัน");
                return;
            }
        }

        setSelectedPeriods(prev => [...prev, p].sort((a, b) => a - b));
    };

    const handleStart = async () => {
        const isFlag = selectedPeriods.includes(0);
        
        if (!isFlag && !selectedSubject) {
            toast.error("กรุณาเลือกวิชา");
            return;
        }
        if (!selectedRoom || selectedPeriods.length === 0) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }
        if (isPastDate && !backfillReason.trim()) {
            toast.error("กรุณาระบุเหตุผลการบันทึกย้อนหลัง");
            return;
        }

        const periodStr = selectedPeriods.join('-');
        try {
            const sessionData = {
                teacherUid: user.uid,
                teacherName: user.name || user.displayName,
                subjectId: isFlag ? 'ASSEMBLY' : selectedSubject.id,
                subjectCode: isFlag ? 'ASSEMBLY' : selectedSubject.code,
                subjectName: isFlag ? 'กิจกรรมหน้าเสาธง' : selectedSubject.name,
                level: selectedRoom.level,
                class: selectedRoom.class,
                date,
                period: periodStr,
                backfillReason: isPastDate ? backfillReason : ''
            };
            const session = await createSession(sessionData);
            navigate(`/teacher/attendance/${session.id}`);
        } catch {
            toast.error(t('operation_failed'));
        }
    };

    const periods = [0, 1, 2, 3, 4, 5, 6, 7, 8];

    // UI Bridge if no subjects
    if (!loading && subjects.length === 0 && !selectedPeriods.includes(0)) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar showBack={true} />
                <div className="max-w-xl mx-auto px-4 py-20 text-center">
                    <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-inner">
                            <BookOpen size={48} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase italic mb-4">ยังไม่มีรายวิชา</h2>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest leading-loose mb-10">
                            กรุณาตั้งค่ารายวิชาที่คุณสอน<br/>ก่อนเริ่มบันทึกการเช็คชื่อ
                        </p>
                        <button 
                            onClick={() => navigate('/teacher/subjects')}
                            className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-4"
                        >
                            <Plus size={20} />
                            เพิ่มรายวิชาแรก
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={true} />
            
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-4">
                        <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-100">
                            <Clock size={24} />
                        </div>
                        {t('start_attendance')}
                    </h1>

                    {/* Period 0 Shortcut */}
                    <button 
                        onClick={() => {
                            setSelectedPeriods([0]);
                            setSelectedSubject(null);
                        }}
                        className={`px-8 py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${selectedPeriods.includes(0) ? 'bg-[#1a5c38] border-[#1a5c38] text-white shadow-xl shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400 hover:border-[#1a5c38]'}`}
                    >
                        ⚡ กิจกรรมหน้าเสาธง (คาบ 0)
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Step 1: Subject (Only if not period 0) */}
                    {!selectedPeriods.includes(0) && (
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-slate-200 border border-slate-100 animate-in fade-in duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">1</div>
                                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight italic">{t('select_subject')}</h2>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                                {subjects.map(s => (
                                    <button 
                                        key={s.id} 
                                        onClick={() => { setSelectedSubject(s); setSelectedRoom(null); }}
                                        className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 text-left transition-all ${selectedSubject?.id === s.id ? 'bg-indigo-500 border-indigo-500 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                                    >
                                        <div className="font-black text-sm md:text-lg italic leading-tight mb-1">{s.code}</div>
                                        <div className={`text-[10px] md:text-xs font-bold uppercase tracking-wide truncate ${selectedSubject?.id === s.id ? 'text-white/80' : 'text-slate-400'}`}>{s.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Room (Always visible but level/room logic varies) */}
                    {(selectedSubject || selectedPeriods.includes(0)) && (
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-slate-200 border border-slate-100 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-black text-xs">
                                    {selectedPeriods.includes(0) ? '1' : '2'}
                                </div>
                                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight italic">{t('select_room')}</h2>
                            </div>

                            <div className="flex flex-wrap gap-2 md:gap-3">
                                {selectedPeriods.includes(0) ? (
                                    user?.homeroomClass ? (
                                        <div className="w-full p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">ห้องเรียนที่รับผิดชอบ</div>
                                                <div className="text-2xl font-black text-emerald-700 italic">{user.homeroomClass}</div>
                                            </div>
                                            <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200">
                                                จากโปรไฟล์
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full flex flex-col sm:flex-row gap-3">
                                            <select 
                                                value={selectedRoom?.level || ''}
                                                onChange={(e) => setSelectedRoom({...selectedRoom, level: e.target.value})}
                                                className="flex-1 px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-800 text-sm"
                                            >
                                                <option value="">เลือกระดับชั้น...</option>
                                                {['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                            <select 
                                                value={selectedRoom?.class || ''}
                                                onChange={(e) => setSelectedRoom({...selectedRoom, class: e.target.value})}
                                                className="flex-1 px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-800 text-sm"
                                            >
                                                <option value="">เลือกห้อง...</option>
                                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                                            </select>
                                        </div>
                                    )
                                ) : (
                                    selectedSubject.rooms?.map((r, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setSelectedRoom(r)}
                                            className={`px-6 py-3.5 rounded-xl md:rounded-2xl border-2 font-black text-xs md:text-sm transition-all ${selectedRoom?.level === r.level && selectedRoom?.class === r.class ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                        >
                                            {r.level}/{r.class}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Date & Periods */}
                    {selectedRoom && selectedRoom.level && selectedRoom.class && (
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-slate-200 border border-slate-100 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 font-black text-xs">
                                    {selectedPeriods.includes(0) ? '2' : '3'}
                                </div>
                                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight italic">{t('select_date')} & {t('select_period')}</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-6 mb-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('select_date')}</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input 
                                            type="date" 
                                            value={date} 
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-4 focus:ring-amber-500/10 font-bold text-slate-800 text-sm" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('select_period')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {periods.map(p => (
                                            <button 
                                                key={p} 
                                                type="button"
                                                onClick={() => togglePeriod(p)}
                                                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl border-2 font-black text-[10px] md:text-xs transition-all ${selectedPeriods.includes(p) ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white border-slate-100 text-slate-300 hover:border-amber-200'}`}
                                            >
                                                {p === 0 ? 'ธง' : p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {isPastDate && (
                                <div className="space-y-3 animate-in fade-in duration-500">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 ml-2 flex items-center gap-2">
                                        <AlertCircle size={14} /> {t('backfill_reason')}
                                    </label>
                                    <div className="relative">
                                        <MessageSquare className="absolute left-6 top-6 text-rose-300" size={18} />
                                        <textarea 
                                            value={backfillReason} 
                                            onChange={(e) => setBackfillReason(e.target.value)}
                                            placeholder="ทำไมจึงต้องบันทึกย้อนหลัง?"
                                            className="w-full pl-14 pr-6 py-5 bg-rose-50/50 border-none rounded-2xl focus:ring-4 focus:ring-rose-500/10 font-bold text-slate-800 min-h-[100px]" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-6">
                        <button 
                            onClick={handleStart}
                            disabled={(!selectedSubject && !selectedPeriods.includes(0)) || !selectedRoom || selectedPeriods.length === 0 || (isPastDate && !backfillReason)}
                            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl hover:bg-emerald-600 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 flex items-center justify-center gap-4 group"
                        >
                            {t('start_attendance')}
                            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceSetup;
