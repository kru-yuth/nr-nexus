import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, History, Home } from 'lucide-react';

const CheckinSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const result = location.state?.result;

    if (!result) return <Navigate to="/student/late-checkin" replace />;

    return (
        <div className="min-h-screen bg-[#1a5c38] flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CheckCircle2 size={56} className="text-[#1a5c38]" />
                </div>
                
                <h1 className="text-4xl font-black text-slate-900 mb-2 uppercase italic tracking-tight">บันทึกสำเร็จ</h1>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-10">ระบบหักคะแนนพฤติกรรมเรียบร้อยแล้ว</p>

                <div className="bg-slate-50 rounded-3xl p-8 mb-8 space-y-6">
                    <div className="flex justify-between items-center text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะมาสาย</span>
                        <span className="text-sm font-black text-rose-600 uppercase">
                            {result.status === 'late_minor' ? 'สายระยะแรก' : 'สายมาก'}
                        </span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-end">
                        <div className="text-left">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">หักคะแนน</span>
                            <div className="text-2xl font-black text-rose-500">-{result.deduction}</div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">คะแนนคงเหลือ</span>
                            <div className="text-3xl font-black text-slate-900 tabular-nums">
                                {result.newScore}<span className="text-sm text-slate-300 ml-1">/100</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* New Score Progress */}
                <div className="mb-10">
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={`h-full transition-all duration-1000 ${result.newScore > 80 ? 'bg-emerald-500' : result.newScore > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${result.newScore}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button 
                        onClick={() => navigate('/hub')}
                        className="w-full bg-[#1a5c38] text-white rounded-2xl py-5 font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                    >
                        <Home size={16} /> RETURN TO HUB
                    </button>
                    <button 
                        onClick={() => navigate('/student/behavior-history')}
                        className="w-full bg-white border-2 border-slate-100 text-slate-400 rounded-2xl py-5 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-3"
                    >
                        <History size={16} /> VIEW SCORE HISTORY
                    </button>
                </div>
            </div>

            <p className="mt-12 text-emerald-100/40 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                <CheckCircle2 size={14} /> ครูฝ่ายปกครองได้รับแจ้งเตือนแล้ว
            </p>
        </div>
    );
};

export default CheckinSuccess;
