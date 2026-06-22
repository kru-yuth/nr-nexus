import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { 
    getSubjectsByTeacher, 
    createSubject, 
    updateSubject,
    deleteSubject,
    findSubjectNameByCode 
} from '../../services/attendanceService';
import { updateUser } from '../../services/userService';
import Navbar from '../../components/common/Navbar';
import { 
    BookOpen, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    ChevronRight, 
    X,
    UserCircle,
    Save,
    Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

const SubjectSetup = () => {
    const { user, userData } = useAuth();
    const { t } = useLanguage();
    const [subjects, setUsersSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Profile Completion State
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileData, setProfileData] = useState({
        prefix: '',
        firstName: '',
        lastName: ''
    });

    // Sync profileData when Firestore data becomes available
    useEffect(() => {
        if (userData) {
            setProfileData({
                prefix: userData.prefix || userData.Prefix || userData.Title || '',
                firstName: userData.firstName || userData.FirstName || '',
                lastName: userData.lastName || userData.LastName || ''
            });
        }
    }, [userData]);

    // Subject Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSubjectId, setEditingSubjectId] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        rooms: [] // Array of {level, class}
    });
    const [newRoom, setNewRoom] = useState({ level: 'ม.1', class: '1' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadSubjects = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getSubjectsByTeacher(user.uid);
            setUsersSubjects(data);
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [user?.uid, t]);

    useEffect(() => {
        if (userData) {
            // Bug Fix: Unified robust name check
            const hasName = 
                userData.firstName?.trim() || 
                userData.FirstName?.trim() || 
                (userData.name && userData.name !== "Unknown");
            
            if (!hasName) {
                setShowProfileModal(true);
            }
            loadSubjects();
        }
    }, [userData, loadSubjects]);

    const handleEdit = (subject) => {
        setEditingSubjectId(subject.id);
        setFormData({
            code: subject.code,
            name: subject.name,
            rooms: subject.rooms || []
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (subjectId) => {
        if (!window.confirm("ยืนยันการลบวิชานี้? ข้อมูลการเช็คชื่อที่ผ่านมาจะยังคงอยู่")) return;

        try {
            await deleteSubject(subjectId);
            toast.success(t('delete_success'));
            loadSubjects();
        } catch {
            toast.error(t('operation_failed'));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            const fullName = `${profileData.prefix}${profileData.firstName} ${profileData.lastName}`.trim();
            await updateUser(user.uid, {
                ...profileData,
                name: fullName,
                displayName: fullName
            });
            toast.success(t('update_success'));
            setShowProfileModal(false);
        } catch {
            toast.error(t('operation_failed'));
        }
    };

    const handleCodeBlur = async () => {
        if (!formData.code || formData.name) return;
        const existingName = await findSubjectNameByCode(formData.code);
        if (existingName) {
            setFormData(prev => ({ ...prev, name: existingName }));
            toast.success(t('subject_auto_filled'));
        }
    };

    const addRoomToForm = () => {
        // Check for duplicates
        if (formData.rooms.some(r => r.level === newRoom.level && r.class === newRoom.class)) {
            toast.error(t('room_duplicate_error'));
            return;
        }
        setFormData(prev => ({
            ...prev,
            rooms: [...prev.rooms, { ...newRoom }]
        }));
    };

    const removeRoomFromForm = (idx) => {
        setFormData(prev => ({
            ...prev,
            rooms: prev.rooms.filter((_, i) => i !== idx)
        }));
    };

    const handleSubjectSubmit = async (e) => {
        e.preventDefault();
        if (formData.rooms.length === 0) {
            toast.error(t('at_least_one_room_error'));
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingSubjectId) {
                // Update existing subject
                await updateSubject(editingSubjectId, {
                    name: formData.name,
                    rooms: formData.rooms
                });
                toast.success(t('update_success'));
            } else {
                // Create new subject
                const subjectData = {
                    ...formData,
                    teacherUid: user.uid,
                    teacherName: user.name || user.displayName
                };
                await createSubject(subjectData);
                toast.success(t('update_success'));
            }
            setIsFormOpen(false);
            setEditingSubjectId(null);
            setFormData({ code: '', name: '', rooms: [] });
            loadSubjects();
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const levels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const rooms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar showBack={true} />

            <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 text-white">
                            <BookOpen size={36} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{t('my_subjects')}</h1>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">{t('setup_subject')}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            setEditingSubjectId(null);
                            setFormData({ code: '', name: '', rooms: [] });
                            setIsFormOpen(true);
                        }}
                        className="w-full md:w-auto flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-600 hover:-translate-y-1 transition-all active:translate-y-0"
                    >
                        <Plus size={18} /> {t('register_new')}
                    </button>
                </div>

                {/* Subject List */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="py-20 text-center animate-pulse">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="font-black text-xs text-slate-300 uppercase tracking-widest">{t('loading')}</p>
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="bg-white rounded-[3rem] p-20 text-center border border-slate-100 shadow-xl flex flex-col items-center opacity-40">
                            <BookOpen size={64} className="text-slate-200 mb-6" />
                            <h3 className="text-xl font-black text-slate-400 uppercase italic">{t('no_subjects')}</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {subjects.map((s) => (
                                <div key={s.id} className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 group hover:border-indigo-200 transition-all duration-500">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner group-hover:bg-indigo-50 transition-colors">
                                            {s.code.slice(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1 italic">{s.code}</h3>
                                            <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{s.name}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 flex-1 md:justify-center">
                                        {s.rooms?.map((r, i) => (
                                            <span key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100/50">
                                                {r.level}/{r.class}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button 
                                            type="button"
                                            onClick={() => handleEdit(s)}
                                            className="flex-1 md:flex-none p-4 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-2xl transition-all"
                                        >
                                            <Edit3 size={20} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleDelete(s.id)}
                                            className="flex-1 md:flex-none p-4 text-slate-300 hover:text-rose-500 hover:bg-slate-50 rounded-2xl transition-all"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Completion Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 relative animate-in zoom-in-95 duration-500">
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6">
                                <UserCircle size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic mb-2">ข้อมูลไม่สมบูรณ์</h2>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">
                                {t('missing_profile_name')}
                            </p>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('prefix_label')}</label>
                                <select 
                                    value={profileData.prefix} 
                                    onChange={(e) => setProfileData({...profileData, prefix: e.target.value})}
                                    required
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800"
                                >
                                    <option value="">เลือก...</option>
                                    <option value="นาย">นาย</option>
                                    <option value="นาง">นาง</option>
                                    <option value="นางสาว">นางสาว</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('first_name_label')}</label>
                                    <input type="text" value={profileData.firstName} onChange={(e) => setProfileData({...profileData, firstName: e.target.value})} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800" placeholder="ภาษาไทย" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('last_name_label')}</label>
                                    <input type="text" value={profileData.lastName} onChange={(e) => setProfileData({...profileData, lastName: e.target.value})} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800" placeholder="ภาษาไทย" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all mt-4">
                                {t('save')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Subject Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-10 md:p-14 relative my-8 animate-in zoom-in-95 duration-500">
                        <button 
                            onClick={() => {
                                setIsFormOpen(false);
                                setEditingSubjectId(null);
                                setFormData({ code: '', name: '', rooms: [] });
                            }} 
                            className="absolute top-10 right-10 p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                                <Plus size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">
                                    {editingSubjectId ? t('edit_job') : t('register_new')}
                                </h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{t('setup_subject')}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubjectSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('subject_code')}</label>
                                    <input 
                                        type="text" 
                                        value={formData.code} 
                                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                                        onBlur={handleCodeBlur}
                                        required 
                                        disabled={!!editingSubjectId}
                                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 disabled:opacity-50" 
                                        placeholder="เช่น MA101" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('subject_name')}</label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                        required 
                                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800" 
                                        placeholder="ชื่อวิชาภาษาไทย" 
                                    />
                                </div>
                            </div>

                            {/* Room Manager */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('add_room')}</label>
                                <div className="flex gap-3 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
                                    <select value={newRoom.level} onChange={(e) => setNewRoom({...newRoom, level: e.target.value})} className="flex-1 bg-white border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20">
                                        {levels.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <select value={newRoom.class} onChange={(e) => setNewRoom({...newRoom, class: e.target.value})} className="flex-1 bg-white border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20">
                                        {rooms.map(r => <option key={r} value={r}>{t('room_label')} {r}</option>)}
                                    </select>
                                    <button type="button" onClick={addRoomToForm} className="p-4 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {formData.rooms.map((r, i) => (
                                        <div key={i} className="flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                                            {r.level}/{r.class}
                                            <button type="button" onClick={() => removeRoomFromForm(i)} className="text-indigo-300 hover:text-rose-500 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-end gap-4 pt-10 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsFormOpen(false);
                                        setEditingSubjectId(null);
                                        setFormData({ code: '', name: '', rooms: [] });
                                    }} 
                                    className="px-10 py-5 rounded-[1.5rem] text-slate-400 font-black hover:text-slate-900 transition-all uppercase text-[10px] tracking-widest"
                                >
                                    {t('cancel_btn')}
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-14 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.2em]">
                                    {isSubmitting ? t('loading') : <><Save size={18} /> {t('save')}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectSetup;
