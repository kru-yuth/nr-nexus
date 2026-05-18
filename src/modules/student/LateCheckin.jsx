import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
    getLateDeduction, 
    checkTodayRecord, 
    processLateCheckin,
    getBehaviorData,
    getMonthLateCount,
    positiveMessages
} from '../../services/lateCheckinService';
import { Clock, User, AlertCircle, CheckCircle2, ChevronRight, History, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LateCheckin = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [deduction, setDeduction] = useState(getLateDeduction(new Date()));
    const [todayRecord, setTodayRecord] = useState(null);
    const [behavior, setBehavior] = useState({ score: 100 });
    const [monthCount, setMonthCount] = useState(0);
    const [randomMsg] = useState(positiveMessages[Math.floor(Math.random() * positiveMessages.length)]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        // Real-time clock
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            setDeduction(getLateDeduction(now));
        }, 1000);

        // Initial Data Load
        const loadData = async () => {
            if (!user) return;
            try {
                const [record, beh, count] = await Promise.all([
                    checkTodayRecord(user.uid),
                    getBehaviorData(user.uid),
                    getMonthLateCount(user.uid)
                ]);
                setTodayRecord(record);
                setBehavior(beh);
                setMonthCount(count);
            } catch (err) {
                console.error("Error loading check-in data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
        return () => clearInterval(timer);
    }, [user]);

    const handleConfirm = async () => {
        const msg = deduction.status === 'late_minor' && monthCount < 3 
            ? "ยืนยันการบันทึกมาสาย? (คุณยังมีโควตาเตือนเหลืออยู่ ไม่หักคะแนน)"
            : "ยืนยันการบันทึกมาสายและหักคะแนนพฤติกรรม?";

        if (!window.confirm(msg)) return;
        
        setProcessing(true);
        try {
            const result = await processLateCheckin(user);
            navigate('/student/late-checkin/success', { state: { result } });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a5c38] border-t-transparent"></div>
        </div>
    );

    const isGracePeriod = deduction.status === 'late_minor' && monthCount < 3;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-[#1a5c38] text-white p-8 rounded-b-[3rem] shadow-xl">
                <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-6 bg-white/10 px-6 py-2 rounded-full backdrop-blur-md">
                        <Clock size={20} className="text-emerald-300" />
                        <span className="text-2xl font-black tracking-tighter tabular-nums">
                            {currentTime.toLocaleTimeString('th-TH')}
                        </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200/60 mb-2">
                        {currentTime.toLocaleDateString('th-TH', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </p>
                </div>
            </div>

            <main className="flex-1 max-w-md w-full mx-auto p-6 -mt-10 space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100 flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-[#1a5c38]">
                        <User size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{user.displayName}</h2>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                {user.studentId || 'No ID'}
                            </span>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                {user.level || 'N/A'} ห้อง {user.class || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Score Progress */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BEHAVIOR SCORE</span>
                        <span className="text-3xl font-black text-slate-900 leading-none tabular-nums">
                            {behavior.score}<span className="text-sm text-slate-300 ml-1">/100</span>
                        </span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={`h-full transition-all duration-1000 ${behavior.score > 80 ? 'bg-emerald-500' : behavior.score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${behavior.score}%` }}
                        />
                    </div>
                    <button 
                        onClick={() => navigate('/student/behavior-history')}
                        className="mt-6 w-full py-4 border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                        <History size={16} /> VIEW FULL HISTORY
                    </button>
                </div>

                {/* Status / Action Box */}
                {todayRecord ? (
                    <div className="bg-emerald-50 rounded-[2.5rem] p-8 border-2 border-emerald-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
                        <h3 className="text-xl font-black text-emerald-900 mb-2 uppercase italic">บันทึกสำเร็จ</h3>
                        <p className="text-emerald-700 text-sm font-bold leading-relaxed mb-6">
                            คุณทำการเช็คสายของวันที่ {todayRecord.date} เรียบร้อยแล้ว <br/>
                            <span className="text-xs opacity-60">
                                สถานะ: {todayRecord.status === 'warning' ? `เตือนครั้งที่ ${todayRecord.note?.split(' ')[1] || '?'}` : todayRecord.status === 'late_minor' ? 'สายระยะแรก (-5)' : 'สายมาก (-10)'}
                            </span>
                        </p>
                        <div className="p-4 bg-white/50 rounded-2xl text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                            Recorded at {new Date(todayRecord.checkInTime?.seconds * 1000).toLocaleTimeString()}
                        </div>
                    </div>
                ) : deduction.status === 'closed' ? (
                    <div className="bg-rose-50 rounded-[2.5rem] p-8 border-2 border-rose-100 text-center">
                        <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
                        <h3 className="text-xl font-black text-rose-900 mb-2 uppercase">ระบบปิดแล้ว</h3>
                        <p className="text-rose-700 text-sm font-bold leading-relaxed">
                            ขณะนี้เวลา {currentTime.toLocaleTimeString()} <br/>
                            หมดเวลาการเช็คสายด้วยตัวเอง <br/>
                            <span className="underline italic">โปรดติดต่อครูฝ่ายปกครองทันที</span>
                        </p>
                    </div>
                ) : deduction.status === 'early' ? (
                    <div className="bg-indigo-50 rounded-[2.5rem] p-8 border-2 border-indigo-100 text-center">
                        <Clock className="mx-auto text-indigo-500 mb-4" size={48} />
                        <h3 className="text-xl font-black text-indigo-900 mb-2 uppercase">ยังไม่ถึงเวลา</h3>
                        <p className="text-indigo-700 text-sm font-bold leading-relaxed">
                            ระบบเช็คมาสายจะเปิดให้ใช้งานในเวลา <br/>
                            <span className="text-lg font-black underline italic">08:00 เป็นต้นไป</span>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {isGracePeriod ? (
                            <div className="bg-emerald-50 rounded-[2.5rem] p-8 border-2 border-emerald-100 flex gap-4">
                                <Sparkles className="text-emerald-600 shrink-0" size={24} />
                                <div>
                                    <h4 className="text-emerald-900 font-black text-sm uppercase tracking-wider mb-1">สิทธิ์ละเว้นการหักคะแนน</h4>
                                    <p className="text-emerald-800 text-xs font-bold leading-relaxed">
                                        {randomMsg} <br/>
                                        <span className="mt-2 block font-black text-[#1a5c38] px-3 py-1 bg-white inline-block rounded-full">
                                            เตือนครั้งที่ {monthCount + 1}/3 ของเดือนนี้
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-50 rounded-[2.5rem] p-8 border-2 border-amber-100 flex gap-4">
                                <AlertCircle className="text-amber-600 shrink-0" size={24} />
                                <div>
                                    <h4 className="text-amber-900 font-black text-sm uppercase tracking-wider mb-1">แจ้งเตือนสถานะมาสาย</h4>
                                    <p className="text-amber-800 text-xs font-bold leading-relaxed">
                                        ตรวจพบว่าคุณมาถึงสถานศึกษาในช่วงเวลา <br/>
                                        <span className="font-black underline italic">{deduction.label}</span> <br/>
                                        ระบบจะทำการหัก <span className="font-black text-rose-600">{deduction.points} คะแนน</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        <button 
                            disabled={processing}
                            onClick={handleConfirm}
                            className="w-full bg-[#1a5c38] text-white rounded-[2.5rem] py-8 font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-emerald-200 hover:bg-slate-900 hover:-translate-y-2 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
                        >
                            {processing ? 'Processing...' : (
                                <>
                                    ยืนยันการเช็คสาย 
                                    <ChevronRight className="group-hover:translate-x-2 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </main>

            <footer className="p-8 text-center text-slate-300 text-[9px] font-bold uppercase tracking-[0.3em]">
                NR DISCIPLINE &bull; RITTHINARONGRON SCHOOL
            </footer>
        </div>
    );
};

export default LateCheckin;
