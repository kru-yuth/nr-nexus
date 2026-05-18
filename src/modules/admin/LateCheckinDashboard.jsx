import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getTodayLateCheckins, recordManualLateCheckin } from '../../services/lateCheckinService';
import { fetchAllUsers } from '../../services/userService';
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
    User
} from 'lucide-react';
import toast from 'react-hot-toast';

const LateCheckinDashboard = () => {
    const { user, roles } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Manual Record Modal State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [lateStatus, setLateStatus] = useState('late_minor');
    const [manualNote, setManualNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasDisciplineWrite = roles.includes('admin') || user?.permissions?.includes('discipline.write');

    useEffect(() => {
        const unsubscribe = getTodayLateCheckins((data) => {
            setRecords(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const metrics = {
        total: records.length,
        major: records.filter(r => r.status === 'late_major').length,
        manual: records.filter(r => r.recordedBy === 'discipline').length,
        anomalies: records.filter(r => r.note && r.note.includes('!]')).length // Placeholder for anomaly check
    };

    const filteredRecords = records.filter(r => 
        r.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentId?.includes(searchTerm)
    );

    const handleOpenManualModal = async () => {
        setIsManualModalOpen(true);
        setSelectedStudent(null);
        setStudentSearch('');
        setManualNote('');
        
        if (allUsers.length === 0) {
            try {
                const users = await fetchAllUsers();
                // Filter only students
                setAllUsers(users.filter(u => u.roles?.includes('student')));
            } catch (err) {
                toast.error("Failed to load student list.");
            }
        }
    };

    const foundStudents = studentSearch.length >= 2 
        ? allUsers.filter(u => 
            u.name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
            u.studentId?.includes(studentSearch) ||
            u.email?.toLowerCase().includes(studentSearch.toLowerCase())
          ).slice(0, 5)
        : [];

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return toast.error("Please select a student first.");
        
        setIsSubmitting(true);
        try {
            await recordManualLateCheckin(selectedStudent, lateStatus, manualNote, user.uid);
            toast.success(`Recorded late for ${selectedStudent.name}`);
            setIsManualModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to record manual check-in.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        LATE CHECK-IN <span className="text-[#1a5c38] italic">MONITOR</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Discipline & Attendance Management</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-3 bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
                        <Filter size={16} /> FILTER RANGE
                    </button>
                    {hasDisciplineWrite && (
                        <button 
                            onClick={handleOpenManualModal}
                            className="flex items-center gap-3 bg-[#1a5c38] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-slate-900 transition-all"
                        >
                            <UserPlus size={16} /> MANUAL RECORD
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'มาสายวันนี้', val: metrics.total, color: 'emerald', icon: Clock },
                    { label: 'สายมาก (Major)', val: metrics.major, color: 'rose', icon: AlertCircle },
                    { label: 'บันทึกโดยครู', val: metrics.manual, color: 'amber', icon: UserPlus },
                    { label: 'พบความผิดปกติ', val: metrics.anomalies, color: 'slate', icon: ShieldCheck },
                ].map((m, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-100 border border-slate-50 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${m.color}-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
                        <m.icon className={`text-${m.color}-500 mb-4 relative z-10`} size={24} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{m.label}</p>
                        <h3 className="text-4xl font-black text-slate-900 mt-1 relative z-10 tabular-nums">{m.val}</h3>
                    </div>
                ))}
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by ID or Email..."
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-[#1a5c38]/5 font-bold text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                        Showing {filteredRecords.length} entries for Today
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Arrival Time</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                                {hasDisciplineWrite && <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={hasDisciplineWrite ? 5 : 4} className="py-20 text-center animate-pulse font-black text-slate-200 uppercase tracking-[0.3em]">Syncing Live Records...</td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan={hasDisciplineWrite ? 5 : 4} className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.3em]">No records found</td></tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors group ${r.status === 'late_major' ? 'bg-rose-50/20' : ''}`}>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs shadow-inner">
                                                    {r.studentId?.slice(-2)}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900 text-sm">{r.studentEmail}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {r.studentId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="font-black text-slate-800 tabular-nums">
                                                {new Date(r.checkInTime?.seconds * 1000).toLocaleTimeString()}
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{r.date}</div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                r.status === 'late_minor' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                r.status === 'warning' ? 'bg-emerald-50 text-[#1a5c38] border-emerald-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {r.status === 'late_minor' ? 'สายระยะแรก' : r.status === 'warning' ? 'เตือน' : 'สายมาก'}
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
                                        {hasDisciplineWrite && (
                                            <td className="px-8 py-6 text-right">
                                                <button className="p-3 text-slate-300 hover:text-[#1a5c38] hover:bg-white hover:shadow-xl rounded-xl transition-all">
                                                    <Edit3 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Record Modal */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-12 relative my-12 animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsManualModalOpen(false)} className="absolute top-10 right-10 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <X size={30} />
                        </button>
                        
                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-20 h-20 bg-emerald-100 rounded-[1.75rem] flex items-center justify-center text-emerald-600 shadow-inner">
                                <UserPlus size={36} />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight italic">Manual Record</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Discipline Intervention</p>
                            </div>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-10">
                            {/* Student Search */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Search Student</label>
                                {!selectedStudent ? (
                                    <div className="relative">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                        <input 
                                            type="text" 
                                            placeholder="Student ID or Name..."
                                            className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all shadow-inner"
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                        />
                                        {foundStudents.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-20">
                                                {foundStudents.map(s => (
                                                    <button 
                                                        key={s.id} 
                                                        type="button"
                                                        onClick={() => setSelectedStudent(s)}
                                                        className="w-full px-8 py-5 text-left hover:bg-emerald-50 transition-colors flex items-center gap-4 group"
                                                    >
                                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-emerald-100 group-hover:text-emerald-600">
                                                            {s.studentId?.slice(-2)}
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
                                                {selectedStudent.studentId?.slice(-2)}
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

                            {/* Status & Points */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'late_minor', label: 'สายระยะแรก', points: '-5', color: 'emerald' },
                                    { id: 'late_major', label: 'สายมาก', points: '-10', color: 'rose' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setLateStatus(opt.id)}
                                        className={`p-6 rounded-[2rem] border-2 text-center transition-all ${lateStatus === opt.id ? `bg-${opt.color}-500 border-${opt.color}-500 text-white shadow-xl shadow-${opt.color}-100` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        <div className="font-black text-lg leading-none mb-1">{opt.label}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${lateStatus === opt.id ? 'text-white/70' : 'text-slate-300'}`}>{opt.points} POINTS</div>
                                    </button>
                                ))}
                            </div>

                            {/* Note */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Internal Note (Optional)</label>
                                <textarea 
                                    className="w-full px-8 py-6 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all shadow-inner placeholder:text-slate-300 min-h-[120px]"
                                    placeholder="Add context for this disciplinary action..."
                                    value={manualNote}
                                    onChange={(e) => setManualNote(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row justify-end gap-4 pt-10 border-t border-slate-50">
                                <button type="button" onClick={() => setIsManualModalOpen(false)} className="px-10 py-5 rounded-[1.5rem] text-slate-400 font-black hover:text-slate-900 transition-all uppercase text-xs tracking-[0.2em]">Cancel</button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !selectedStudent} 
                                    className="px-14 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl shadow-slate-300 hover:bg-[#1a5c38] hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 uppercase text-xs tracking-[0.2em]"
                                >
                                    {isSubmitting ? 'Recording...' : 'Record Disciplinary Action'}
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
