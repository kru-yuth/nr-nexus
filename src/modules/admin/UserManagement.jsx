import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    fetchAllUsers,
    addNewUser,
    updateUser,
    deleteUser,
    bulkAddUsers,
    bulkUpdateUserStatus,
    bulkDeleteUsers,
    promoteLevel
} from '../../services/userService';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { 
    Search, 
    UserPlus, 
    FileUp, 
    Trash2, 
    Edit3, 
    Eye, 
    ShieldCheck, 
    Filter,
    CheckCircle2,
    AlertCircle,
    MoreHorizontal,
    GraduationCap,
    Clock,
    X,
    Upload,
    Star,
    BookOpen,
    Trash
} from 'lucide-react';

const UserManagement = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('active');
    const [filterClass, setFilterClass] = useState('all');
    const [filterLevel, setFilterLevel] = useState('all');
    const [filterGender, setFilterGender] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const fileInputRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);

    // Form Modal State
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [formData, setFormData] = useState({
        name: '', email: '', roles: ['student'], permissions: [], class: '',
        batchYear: new Date().getFullYear().toString(), status: 'active',
        level: '', gender: '', prefix: '', studentId: ''
    });

    // Confirmation Modals
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const filteredUsers = (users || []).filter((u) => {
        const search = searchTerm.toLowerCase().trim();
        if (search && !((u.name || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search))) return false;

        if (filterRole !== 'all') {
            if (!u.roles?.some(r => r.toLowerCase() === filterRole.toLowerCase())) return false;
        }

        if (filterStatus !== 'all' && (u.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;

        const normLvl = (v) => String(v || '').replace(/[^0-9]/g, '').trim();
        if (filterLevel !== 'all' && normLvl(u.level) !== normLvl(filterLevel)) return false;

        const normRoom = (v) => String(v || '').split('/').pop().replace(/[^0-9]/g, '').trim();
        if (filterClass !== 'all' && normRoom(u.class) !== normRoom(filterClass)) return false;

        if (filterGender !== 'all') {
            let uG = String(u.gender || '').toLowerCase().trim();
            if (!uG) {
                const name = String(u.name || '');
                if (name.startsWith('เด็กชาย') || name.startsWith('นาย')) uG = 'ชาย';
                else if (name.startsWith('เด็กหญิง') || name.startsWith('นางสาว') || name.startsWith('นาง')) uG = 'หญิง';
            }
            const gMap = { 'ชาย': ['ชาย', 'male', 'm'], 'หญิง': ['หญิง', 'female', 'f'] };
            if (!(uG === filterGender || (gMap[filterGender] && gMap[filterGender].includes(uG)))) return false;
        }

        return true;
    });

    const handleSelectRow = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? filteredUsers.map(u => u.id) : []);
    };

    const handleEdit = (user) => {
        setUserToEdit(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            roles: user.roles || ['student'],
            permissions: user.permissions || [],
            class: user.class || '',
            batchYear: user.batchYear || '',
            status: user.status || 'active',
            level: user.level || '',
            gender: user.gender || '',
            prefix: user.prefix || '',
            studentId: user.studentId || '',
            homeroomClass: user.homeroomClass || null
        });
        setIsFormModalOpen(true);
    };

    const [homeroomSelection, setHomeroomSelection] = useState({ level: 'ม.1', class: '1' });
    
    // Dynamic room fetching for selection
    const getAvailableRooms = (lvl) => {
        const unique = [...new Set(users
            .filter(u => u.level === lvl && u.roles?.includes('student') && u.class)
            .map(u => u.class)
        )].sort((a, b) => parseInt(a) - parseInt(b));
        return unique.length > 0 ? unique : ['1', '2', '3', '4', '5'];
    };

    const handleDeleteRequest = (ids) => {
        setUserToDelete(ids);
        setIsDeleteModalOpen(true);
    };

    const handleStatusUpdateRequest = (status) => {
        if (selectedIds.length === 0) {
            toast.error(t('select_users_error') || "Please select users first.");
            return;
        };
        setStatusToUpdate(status);
        setIsStatusModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        const toastId = toast.loading(t('loading'));
        try {
            if (Array.isArray(userToDelete)) await bulkDeleteUsers(userToDelete);
            else await deleteUser(userToDelete);
            toast.success(t('delete_success'), { id: toastId });
            setSelectedIds([]);
            setIsDeleteModalOpen(false);
            loadUsers();
        } catch {
            toast.error(t('operation_failed'), { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmStatusUpdate = async () => {
        setIsUpdatingStatus(true);
        try {
            await bulkUpdateUserStatus(selectedIds, statusToUpdate);
            toast.success(t('update_success'));
            setSelectedIds([]);
            setIsStatusModalOpen(false);
            loadUsers();
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (userToEdit) await updateUser(userToEdit.id, formData);
            else await addNewUser(formData);
            toast.success(t('update_success'));
            setIsFormModalOpen(false);
            loadUsers();
        } catch {
            toast.error(t('operation_failed'));
        } finally {
            setLoading(false);
        }
    };

    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
    const [isPromoting, setIsPromoting] = useState(false);

    const handlePromotionLevel = async (from, to) => {
        if (!window.confirm(`${t('confirm_action')}: ${from} → ${to}?`)) return;
        
        setIsPromoting(true);
        const toastId = toast.loading(`${from} → ${to}...`);
        try {
            await promoteLevel(from, to);
            toast.success(t('update_success'), { id: toastId });
            setIsPromoteModalOpen(false);
            loadUsers();
        } catch {
            toast.error(t('operation_failed'), { id: toastId });
        } finally {
            setIsPromoting(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const text = ev.target.result;
                const allRows = text.split(/\r?\n/).filter(l => l.trim());
                if (allRows.length < 2) {
                    toast.error(t('operation_failed'));
                    return;
                }
                const headerRow = allRows[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
                const dataRows = allRows.slice(1);
                const findIdx = (possibleNames) => headerRow.findIndex(h => possibleNames.includes(h));

                const idx = {
                    email: findIdx(['email', 'อีเมล']),
                    studentId: findIdx(['studentid', 'รหัสนักเรียน', 'student_id']),
                    prefix: findIdx(['prefix', 'คำนำหน้า', 'title']),
                    firstName: findIdx(['firstname', 'ชื่อ', 'first_name']),
                    lastName: findIdx(['lastname', 'นามสกุล', 'last_name']),
                    name: findIdx(['name', 'ชื่อ-นามสกุล', 'fullname', 'displayname']),
                    gender: findIdx(['gender', 'เพศ']),
                    level: findIdx(['level', 'ชั้น', 'ระดับชั้น']),
                    class: findIdx(['class', 'ห้อง', 'class_room', 'room']),
                    citizenId: findIdx(['citizenid', 'เลขประจำตัวประชาชน', 'citizen_id'])
                };

                const data = dataRows.map(r => {
                    const v = r.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
                    const getVal = (i) => (i !== -1 && v[i]) ? v[i] : '';

                    let email = getVal(idx.email);
                    let studentId = getVal(idx.studentId);
                    let prefix = getVal(idx.prefix);
                    let firstName = getVal(idx.firstName);
                    let lastName = getVal(idx.lastName);
                    let fullName = getVal(idx.name);
                    let gender = getVal(idx.gender);
                    let level = getVal(idx.level);
                    let room = getVal(idx.class);
                    let citizenId = getVal(idx.citizenId);

                    const infer = (p, n) => {
                        const combined = (p || '') + (n || '');
                        if (combined.startsWith('เด็กชาย') || combined.startsWith('นาย')) return { g: 'ชาย', p: p || (combined.startsWith('นาย') ? 'นาย' : 'เด็กชาย') };
                        if (combined.startsWith('เด็กหญิง') || combined.startsWith('นางสาว') || combined.startsWith('นาง')) return { g: 'หญิง', p: p || (combined.startsWith('นางสาว') ? 'นางสาว' : (combined.startsWith('นาง') ? 'นาง' : 'เด็กหญิง')) };
                        return { g: '', p: p };
                    };

                    const inferred = infer(prefix, firstName || fullName);
                    if (!gender) gender = inferred.g;
                    if (!prefix) prefix = inferred.p;

                    if (!fullName) {
                        fullName = `${prefix}${firstName} ${lastName}`.trim();
                    } else if (prefix && !fullName.startsWith(prefix)) {
                        fullName = `${prefix}${fullName}`.trim();
                    }

                    if (level && !level.startsWith('ม.')) level = `ม.${level}`;
                    if (room === '10032008') room = '';

                    if (!email && !studentId) return null;

                    return { 
                        name: fullName,
                        email: (email || '').toLowerCase(), 
                        studentId: studentId,
                        class: room, 
                        batchYear: new Date().getFullYear().toString(), 
                        level: level, 
                        gender: gender, 
                        citizenId: citizenId,
                        roles: ['student'], 
                        status: 'active' 
                    };
                }).filter(u => u !== null);

                if (data.length === 0) {
                    toast.error(t('operation_failed'));
                    return;
                }

                await bulkAddUsers(data);
                toast.success(t('update_success'));
                loadUsers();
            } catch (err) {
                console.error("Import error:", err);
                toast.error(t('operation_failed'));
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const levels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const rooms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const genders = ['ชาย', 'หญิง'];

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans pb-20">
            <Navbar showBack={true} />
            
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
                
                {/* 1. HERO HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-200">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{t('user_management')}</h1>
                            <div className="flex items-center gap-2 text-slate-500 font-bold mt-1">
                                <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] uppercase tracking-widest text-slate-600 italic">Sync Active</span>
                                <p className="text-xs md:text-sm">{t('user_mgmt_desc')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <button onClick={() => setIsPromoteModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 font-black text-white hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0 text-xs tracking-widest uppercase">
                            <GraduationCap size={20} />
                            {t('promote_students')}
                        </button>
                        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-slate-100 rounded-2xl shadow-xl shadow-slate-200 font-black text-slate-600 hover:bg-slate-50 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 text-xs tracking-widest uppercase">
                            <Upload size={20} />
                            {t('import_master')}
                        </button>
                        <button onClick={() => { setUserToEdit(null); setFormData({ name: '', email: '', roles: ['student'], permissions: [], class: '', batchYear: new Date().getFullYear().toString(), status: 'active', level: '', gender: '', prefix: '', studentId: '' }); setIsFormModalOpen(true); }} className="flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 rounded-2xl shadow-2xl shadow-slate-300 font-black text-white hover:bg-slate-800 hover:-translate-y-1 transition-all active:translate-y-0 text-xs tracking-widest uppercase">
                            <UserPlus size={20} />
                            {t('register_new')}
                        </button>
                    </div>
                </div>

                {/* 2. COMMAND CENTER (FILTERS) */}
                <div className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 mb-10">
                    <div className="flex flex-col xl:flex-row items-center gap-6">
                        <div className="relative w-full xl:w-[400px]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder={t('search_placeholder')} 
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-slate-700 text-sm"
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-3 w-full xl:w-auto">
                            {[
                                { val: filterLevel, set: setFilterLevel, opt: levels, label: t('level'), map: { 'ม.1': t('m1'), 'ม.2': t('m2'), 'ม.3': t('m3'), 'ม.4': t('m4'), 'ม.5': t('m5'), 'ม.6': t('m6') } },
                                { val: filterClass, set: setFilterClass, opt: rooms, label: t('room'), prefix: 'R.' },
                                { val: filterGender, set: setFilterGender, opt: genders, label: t('gender'), map: { 'ชาย': t('male'), 'หญิง': t('female') } },
                                { val: filterRole, set: setFilterRole, opt: ['student', 'teacher', 'admin'], label: t('role'), map: { 'student': t('student'), 'teacher': t('teacher'), 'admin': t('admin') } }
                            ].map((f, i) => (
                                <div key={i} className="flex-grow md:flex-grow-0">
                                    <select value={f.val} onChange={(e) => f.set(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] text-[10px] md:text-xs font-black text-slate-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer appearance-none hover:bg-slate-100 transition-colors tracking-widest uppercase">
                                        <option value="all">{f.label}: {t('all')}</option>
                                        {f.opt.map(o => <option key={o} value={o} className="font-bold text-slate-800">{f.prefix || ''}{f.map ? f.map[o] : o}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] xl:ml-auto shadow-inner w-full sm:w-auto overflow-x-auto no-scrollbar">
                            {['active', 'alumni', 'all'].map(s => (
                                <button key={s} onClick={() => setFilterStatus(s)} className={`whitespace-nowrap px-6 py-2.5 rounded-[1rem] text-[10px] font-black tracking-widest transition-all flex-1 sm:flex-none ${filterStatus === s ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {t(s).toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. SELECTION ACTIONS */}
                {selectedIds.length > 0 && (
                    <div className="bg-emerald-600 text-white p-6 rounded-[2rem] md:rounded-[2.5rem] mb-10 flex flex-col md:flex-row justify-between items-center shadow-2xl shadow-emerald-200 animate-in slide-in-from-top-10 duration-500">
                        <div className="flex items-center gap-5 mb-6 md:mb-0">
                            <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">{selectedIds.length}</div>
                            <div>
                                <h4 className="font-black text-lg leading-tight uppercase tracking-tight">{t('accounts_selected') || "Accounts Selected"}</h4>
                                <p className="text-emerald-100 text-xs font-bold">{t('batch_operations_desc') || "Apply batch operations to multiple records"}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <button onClick={() => handleStatusUpdateRequest('alumni')} className="flex-1 sm:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs transition-all border border-white/20 uppercase tracking-widest">ALUMNI</button>
                            <button onClick={() => handleStatusUpdateRequest('active')} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-400 text-emerald-900 rounded-2xl font-black text-xs transition-all hover:bg-emerald-300 uppercase tracking-widest">ACTIVATE</button>
                            <button onClick={() => handleDeleteRequest(selectedIds)} className="flex-1 sm:flex-none px-6 py-3 bg-red-500 hover:bg-red-400 rounded-2xl font-black text-xs shadow-xl transition-all uppercase tracking-widest">TERMINATE</button>
                        </div>
                    </div>
                )}

                {/* 4. MASTER TABLE */}
                <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-8 py-6 w-12 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-6 h-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm" 
                                            onChange={handleSelectAll} 
                                            checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length} 
                                        />
                                    </th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('full_identity')}</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">{t('level')}</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">{t('room')}</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">{t('gender')}</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('state')}</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-40 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-16 h-16 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black tracking-widest text-slate-900 uppercase italic">{t('loading')}</h3>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className={`group transition-all duration-300 ${selectedIds.includes(u.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}`}>
                                            <td className="px-8 py-7 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-6 h-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all cursor-pointer" 
                                                    checked={selectedIds.includes(u.id)} 
                                                    onChange={() => handleSelectRow(u.id)} 
                                                />
                                            </td>
                                            <td className="px-6 py-7 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`h-12 w-12 md:h-14 md:w-14 rounded-[1.25rem] flex items-center justify-center font-black text-lg md:text-xl shadow-xl transition-all group-hover:rotate-6 group-hover:scale-110 ${u.uid ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        {(u.name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4 md:ml-5">
                                                        <div className="text-sm md:text-base font-black text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight mb-0.5">
                                                            {u.name}
                                                        </div>
                                                        <div className="text-[10px] md:text-xs font-bold text-slate-400 tracking-tight">
                                                            {u.email}
                                                            {u.studentId && <span className="ml-2 text-indigo-500">ID: {u.studentId}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-7 whitespace-nowrap text-center">
                                                <div className="text-sm font-black text-slate-800 leading-tight">{u.level || '-'}</div>
                                            </td>
                                            <td className="px-6 py-7 whitespace-nowrap text-center">
                                                <div className="text-sm font-black text-slate-800 leading-tight">{u.class || '-'}</div>
                                            </td>
                                            <td className="px-6 py-7 whitespace-nowrap text-center">
                                                <div className="text-sm font-black text-slate-800 leading-tight">{u.gender || '-'}</div>
                                            </td>
                                            <td className="px-6 py-7 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                    <span className={`text-[10px] font-black tracking-[0.15em] uppercase ${u.status === 'active' ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                        {t(u.status)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-7 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => setSelectedUser(u)} className="p-2 md:p-3 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-xl rounded-2xl transition-all" title="View"><Eye size={18} md:size={20} /></button>
                                                    <button onClick={() => handleEdit(u)} className="p-2 md:p-3 text-blue-500 hover:text-blue-700 hover:bg-white hover:shadow-xl rounded-2xl transition-all" title="Edit"><Edit3 size={18} md:size={20} /></button>
                                                    <button onClick={() => handleDeleteRequest(u.id)} className="p-2 md:p-3 text-red-400 hover:text-red-700 hover:bg-white hover:shadow-xl rounded-2xl transition-all" title="Delete"><Trash2 size={18} md:size={20} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-48 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                <Filter className="w-16 h-16 text-slate-300 mb-6" />
                                                <h3 className="text-xl font-black text-slate-400 italic mb-2 tracking-tighter uppercase">{t('no_records_found')}</h3>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 5. USER FORM MODAL */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-2xl p-8 md:p-12 relative my-8 md:my-12 animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsFormModalOpen(false)} className="absolute top-6 right-6 md:top-10 md:right-10 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <X size={24} md:size={30} />
                        </button>
                        
                        <div className="flex items-center gap-6 mb-10 md:mb-12">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-100 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center text-emerald-600 shadow-inner">
                                {userToEdit ? <Edit3 size={32} md:size={36} /> : <UserPlus size={32} md:size={36} />}
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">{userToEdit ? t('edit_job') : t('register_new')}</h2>
                                <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-widest mt-1">{t('user_mgmt_desc')}</p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} className="space-y-8 md:space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('prefix_label') || "Prefix"}</label>
                                    <select 
                                        value={formData.prefix} 
                                        onChange={(e) => setFormData({...formData, prefix: e.target.value})} 
                                        required 
                                        className="w-full px-6 py-4 md:py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all appearance-none cursor-pointer shadow-inner"
                                    >
                                        <option value="">เลือกคำนำหน้า</option>
                                        {(formData.roles.includes('teacher') || formData.roles.includes('admin')) ? (
                                            ['นาย', 'นาง', 'นางสาว', 'ว่าที่ร้อยตรี', 'Miss', 'Mr.'].map(p => <option key={p} value={p}>{p}</option>)
                                        ) : (
                                            ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว'].map(p => <option key={p} value={p}>{p}</option>)
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('user_name')}</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full px-6 py-4 md:py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all placeholder:text-slate-300 shadow-inner" placeholder="John Doe" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('user_email')}</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled={!!userToEdit} className="w-full px-6 py-4 md:py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all disabled:opacity-50 placeholder:text-slate-300 shadow-inner" placeholder="user@nr.ac.th" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">เลขประจำตัว</label>
                                    <input type="text" value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all text-slate-800 shadow-inner" placeholder="00000" />
                                </div>
                                {[
                                    { name: 'level', label: t('level'), opt: levels, map: { 'ม.1': t('m1'), 'ม.2': t('m2'), 'ม.3': t('m3'), 'ม.4': t('m4'), 'ม.5': t('m5'), 'ม.6': t('m6') } },
                                    { name: 'class', label: t('room'), opt: rooms },
                                    { name: 'gender', label: t('gender'), opt: genders, map: { 'ชาย': t('male'), 'หญิง': t('female') } }
                                ].map(f => (
                                    <div key={f.name} className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{f.label}</label>
                                        <select value={formData[f.name]} onChange={(e) => setFormData({...formData, [f.name]: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all appearance-none cursor-pointer text-slate-800 shadow-inner">
                                            <option value="">N/A</option>
                                            {f.opt.map(o => <option key={o} value={o}>{f.map ? f.map[o] : o}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('batch')}</label>
                                    <input type="text" value={formData.batchYear} onChange={(e) => setFormData({...formData, batchYear: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all text-slate-800 shadow-inner" placeholder="2569" />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('clearances')}</label>
                                <div className="flex flex-wrap gap-3 md:gap-4 p-4 md:p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                                    {['student', 'teacher', 'admin'].map(role => (
                                        <label key={role} className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 rounded-[1.25rem] border-2 transition-all cursor-pointer ${(formData.roles ?? []).includes(role) ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200 hover:text-slate-400'}`}>
                                            <input type="checkbox" checked={(formData.roles ?? []).includes(role)} onChange={(e) => {
                                                const updated = e.target.checked ? [...(formData.roles ?? []), role] : (formData.roles ?? []).filter(r => r !== role);
                                                setFormData({...formData, roles: updated});
                                            }} className="hidden" />
                                            <ShieldCheck size={18} className={(formData.roles ?? []).includes(role) ? 'text-white' : 'text-slate-100'} />
                                            <span className="text-xs font-black uppercase tracking-widest">{t(role)}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            {(formData.roles ?? []).includes('teacher') && (
                                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                    <div className="h-px bg-slate-100" />
                                    <div className="flex items-center gap-3 ml-2">
                                        <Star size={18} className="text-amber-500" />
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ครูที่ปรึกษา (Homeroom Advisor)</label>
                                    </div>
                                    
                                    <div className="p-6 bg-amber-50/30 rounded-[2rem] border border-amber-100/50">
                                        {formData.homeroomClass ? (
                                            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-amber-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-black italic shadow-inner">
                                                        {formData.homeroomClass}
                                                    </div>
                                                    <div className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                                        ประจำชั้น {formData.homeroomClass}
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData({...formData, homeroomClass: null})}
                                                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-3">
                                                <select 
                                                    value={homeroomSelection.level} 
                                                    onChange={(e) => setHomeroomSelection({...homeroomSelection, level: e.target.value})}
                                                    className="flex-1 px-4 py-3.5 bg-white border-2 border-amber-100 rounded-xl font-bold text-xs focus:ring-4 focus:ring-amber-500/10"
                                                >
                                                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                                <select 
                                                    value={homeroomSelection.class} 
                                                    onChange={(e) => setHomeroomSelection({...homeroomSelection, class: e.target.value})}
                                                    className="flex-1 px-4 py-3.5 bg-white border-2 border-amber-100 rounded-xl font-bold text-xs focus:ring-4 focus:ring-amber-500/10"
                                                >
                                                    {getAvailableRooms(homeroomSelection.level).map(r => <option key={r} value={r}>{t('room_label')} {r}</option>)}
                                                </select>
                                                <button 
                                                    type="button"
                                                    onClick={() => setFormData({...formData, homeroomClass: `${homeroomSelection.level}/${homeroomSelection.class}`})}
                                                    className="px-6 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg"
                                                >
                                                    กำหนด
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{t('special_permissions')}</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* discipline.read */}
                                        <label className={`flex items-center gap-4 px-6 py-4 rounded-[1.25rem] border-2 transition-all cursor-pointer ${(formData.permissions ?? []).includes('discipline.read') ? 'bg-blue-500 border-blue-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                                            <input type="checkbox" checked={(formData.permissions ?? []).includes('discipline.read')} onChange={(e) => {
                                                const updated = e.target.checked ? [...(formData.permissions ?? []), 'discipline.read'] : (formData.permissions ?? []).filter(p => p !== 'discipline.read');
                                                setFormData({...formData, permissions: updated});
                                            }} className="hidden" />
                                            <Eye size={20} className={(formData.permissions ?? []).includes('discipline.read') ? 'text-white' : 'text-slate-100'} />
                                            <div>
                                                <span className="text-xs font-black uppercase tracking-tight block">ดูรายงานพฤติกรรม</span>
                                                <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">discipline.read</span>
                                            </div>
                                        </label>

                                        {/* discipline.write */}
                                        <label className={`flex items-center gap-4 px-6 py-4 rounded-[1.25rem] border-2 transition-all cursor-pointer ${(formData.permissions ?? []).includes('discipline.write') ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                                            <input type="checkbox" checked={(formData.permissions ?? []).includes('discipline.write')} onChange={(e) => {
                                                const updated = e.target.checked ? [...(formData.permissions ?? []), 'discipline.write'] : (formData.permissions ?? []).filter(p => p !== 'discipline.write');
                                                setFormData({...formData, permissions: updated});
                                            }} className="hidden" />
                                            <Clock size={20} className={(formData.permissions ?? []).includes('discipline.write') ? 'text-white' : 'text-slate-100'} />
                                            <div>
                                                <span className="text-xs font-black uppercase tracking-tight block">{t('discipline_write')}</span>
                                                <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">discipline.write</span>
                                            </div>
                                        </label>

                                        {/* attendance.read */}
                                        <label className={`flex items-center gap-4 px-6 py-4 rounded-[1.25rem] border-2 transition-all cursor-pointer ${(formData.permissions ?? []).includes('attendance.read') ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                                            <input type="checkbox" checked={(formData.permissions ?? []).includes('attendance.read')} onChange={(e) => {
                                                const updated = e.target.checked ? [...(formData.permissions ?? []), 'attendance.read'] : (formData.permissions ?? []).filter(p => p !== 'attendance.read');
                                                setFormData({...formData, permissions: updated});
                                            }} className="hidden" />
                                            <BookOpen size={20} className={(formData.permissions ?? []).includes('attendance.read') ? 'text-white' : 'text-slate-100'} />
                                            <div>
                                                <span className="text-xs font-black uppercase tracking-tight block">ดูรายงานการเข้าเรียน</span>
                                                <span className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">attendance.read</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex flex-col md:flex-row justify-end gap-4 pt-8 border-t border-slate-100">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-10 py-5 rounded-[1.5rem] text-slate-400 font-black hover:text-slate-900 transition-all uppercase text-xs tracking-widest">{t('abort_mission')}</button>
                                <button type="submit" disabled={loading} className="px-14 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-emerald-600 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 uppercase text-xs tracking-[0.2em]">
                                    {loading ? t('loading') : userToEdit ? t('push_updates') : t('commit_to_database')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. DETAILS PANEL */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-2xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl w-full max-w-lg p-10 md:p-14 relative overflow-hidden animate-in fade-in zoom-in duration-500 my-8">
                        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg" />
                        
                        <button onClick={() => setSelectedUser(null)} className="absolute top-8 right-8 p-3 bg-white/20 text-white hover:bg-red-500 hover:text-white rounded-full transition-all">
                            <X size={24} />
                        </button>
                        
                        <div className="relative mt-12 text-center mb-10 md:mb-12">
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-white p-2 shadow-2xl mx-auto mb-6 transform rotate-3 transition-transform hover:rotate-0 cursor-pointer">
                                <div className={`w-full h-full rounded-[2rem] flex items-center justify-center font-black text-4xl md:text-5xl shadow-inner ${selectedUser.uid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                                    {(selectedUser.name || '?').charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-2 tracking-tighter uppercase italic">{selectedUser.name}</h2>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full">
                                <div className={`w-2 h-2 rounded-full ${selectedUser.uid ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedUser.email}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-10 md:mb-12">
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">{t('placement')}</span>
                                <div className="text-lg font-black text-slate-800 leading-none">{t('room_label')} {selectedUser.class || '-'}</div>
                                <div className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-wide italic">{selectedUser.level || '-'}</div>
                            </div>
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">{t('identifiers')}</span>
                                <div className="text-lg font-black text-slate-800 leading-none">{selectedUser.gender || '-'}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">ID: {selectedUser.studentId || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] mb-10 md:mb-12 shadow-2xl shadow-slate-300">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">{t('clearances')}</span>
                                <ShieldCheck size={16} className="text-emerald-500" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(selectedUser.roles ?? []).map(role => (
                                    <span key={role} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        {t(role)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <button onClick={() => setSelectedUser(null)} className="w-full bg-slate-900 text-white rounded-[1.5rem] py-6 font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">{t('close_access')}</button>
                    </div>
                </div>
            )} 
            
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title={t('confirm_action')} message={t('confirm_delete_users')} confirmText={t('delete')} isLoading={isDeleting} />
            <ConfirmationModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onConfirm={confirmStatusUpdate} title={t('confirm_action')} message={`${t('status')}: ${t(statusToUpdate)}?`} confirmText={t('ok')} isLoading={isUpdatingStatus} />

            {/* 7. PROMOTION MODAL (STEP-BY-STEP) */}
            {isPromoteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl p-10 md:p-12 relative animate-in zoom-in-95 duration-500 my-8">
                        <button onClick={() => setIsPromoteModalOpen(false)} className="absolute top-8 right-8 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <X size={24} md:size={30} />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">{t('academic_year_promotion')}</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{t('promotion_step')}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button disabled={isPromoting} onClick={() => handlePromotionLevel("ม.6", "alumni")} className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] text-left hover:bg-rose-100 transition-all group">
                                    <div className="text-rose-600 font-black text-lg italic tracking-tighter">ม.6 → ALUMNI</div>
                                    <div className="text-rose-400 text-[10px] font-bold uppercase mt-1">Graduate Senior High</div>
                                </button>
                                <button disabled={isPromoting} onClick={() => handlePromotionLevel("ม.3", "alumni")} className="p-6 bg-orange-50 border-2 border-orange-100 rounded-[2rem] text-left hover:bg-orange-100 transition-all group">
                                    <div className="text-orange-600 font-black text-lg italic tracking-tighter">ม.3 → ALUMNI</div>
                                    <div className="text-orange-400 text-[10px] font-bold uppercase mt-1">Graduate Junior High</div>
                                </button>
                            </div>

                            <div className="h-px bg-slate-100 my-4" />

                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                {[
                                    { f: "ม.5", t: "ม.6" },
                                    { f: "ม.4", t: "ม.5" },
                                    { f: "ม.2", t: "ม.3" },
                                    { f: "ม.1", t: "ม.2" }
                                ].map(step => (
                                    <button 
                                        key={step.f}
                                        disabled={isPromoting} 
                                        onClick={() => handlePromotionLevel(step.f, step.t)} 
                                        className="p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-left hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                                    >
                                        <div className="text-slate-900 font-black text-base group-hover:text-indigo-600 italic tracking-tighter">{step.f} → {step.t}</div>
                                        <div className="text-slate-400 text-[9px] font-bold uppercase mt-0.5">{t('promotion_step')}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={24} />
                            <p className="text-amber-800 text-[10px] md:text-xs font-bold leading-relaxed uppercase">
                                {t('promotion_warning')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
