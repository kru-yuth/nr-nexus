import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { getBehaviorData } from '../../services/lateCheckinService';
import { ShieldCheck, Calendar, ArrowDownCircle, History, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BehaviorHistory = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [data, setData] = useState({ score: 100, history: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            try {
                const res = await getBehaviorData(user.uid);
                setData(res);
            } catch (err) {
                console.error("Error loading behavior history:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a5c38] border-t-transparent"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-[#1a5c38] text-white p-12 pb-24 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                
                <button 
                    onClick={() => navigate(-1)}
                    className="absolute top-8 left-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="max-w-md mx-auto text-center relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200/60 mb-6">{t('current_standing') || "สถานะปัจจุบัน"}</p>
                    <div className="inline-flex flex-col items-center">
                        <div className="text-6xl md:text-8xl font-black tracking-tighter mb-2 leading-none">{data.score}</div>
                        <div className="h-1.5 w-24 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${data.score}%` }} />
                        </div>
                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">{t('behavior_score')} / 100</p>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-md w-full mx-auto p-4 md:p-6 -mt-16 space-y-6 pb-20">
                <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-slate-200 border border-slate-100 min-h-[400px]">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                            <History size={24} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase italic">{t('activity_log') || "บันทึกกิจกรรม"}</h2>
                    </div>

                    {data.history.length === 0 ? (
                        <div className="py-20 text-center opacity-20 flex flex-col items-center">
                            <ShieldCheck size={64} className="mb-4" />
                            <p className="font-black text-xs uppercase tracking-widest">{t('no_violations') || "ไม่พบรายการทำผิดระเบียบ"}</p>
                        </div>
                    ) : (
                        <div className="space-y-8 md:space-y-10 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-5 md:left-6 top-2 bottom-2 w-0.5 bg-slate-50" />

                            {data.history.map((log, idx) => (
                                <div key={log.id} className="flex gap-4 md:gap-6 relative group animate-in slide-in-from-bottom-4 fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl shrink-0 z-10 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${log.change < 0 ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-emerald-500 text-white shadow-emerald-200'}`}>
                                        {log.change < 0 ? <ArrowDownCircle size={18} /> : <ShieldCheck size={18} />}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-black text-slate-800 text-xs md:text-sm">{log.reason}</h3>
                                            <span className={`font-black text-xs md:text-sm ${log.change < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {log.change > 0 ? '+' : ''}{log.change}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Calendar size={10} className="shrink-0" />
                                            {log.date}
                                        </div>
                                        {log.note && (
                                            <p className="mt-3 text-[10px] md:text-xs text-slate-500 bg-slate-50 p-3 md:p-4 rounded-2xl italic border-l-4 border-slate-200">
                                                "{log.note}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="p-8 text-center text-slate-300 text-[9px] font-bold uppercase tracking-[0.3em]">
                NR DISCIPLINE &bull; RITTHINARONGRON SCHOOL
            </footer>
        </div>
    );
};

export default BehaviorHistory;
