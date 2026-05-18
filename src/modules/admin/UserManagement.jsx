import React, { useState, useEffect, useRef } from 'react';
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
    Upload, 
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
    X
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
        level: '', gender: ''
    });

    // Confirmation Modals
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
            toast.error("Failed to load user data.");
        } finally {
            setLoading(false);
        }
    };

    // --- CONSOLIDATED STRICT FILTERING ---
    const filteredUsers = (users || []).filter((u) => {
        // 1. Search
        const search = searchTerm.toLowerCase().trim();
        if (search && !((u.name || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search))) return false;

        // 2. Role
        if (filterRole !== 'all') {
            if (!u.roles?.some(r => r.toLowerCase() === filterRole.toLowerCase())) return false;
        }

        // 3. Status
        if (filterStatus !== 'all' && (u.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;

        // 4. Level (Normalized for combinable filtering)
        const normLvl = (v) => String(v || '').replace(/[^0-9]/g, '').trim();
        if (filterLevel !== 'all' && normLvl(u.level) !== normLvl(filterLevel)) return false;

        // 5. Class/Room (Normalized for combinable filtering)
        const normRoom = (v) => String(v || '').split('/').pop().replace(/[^0-9]/g, '').trim();
        if (filterClass !== 'all' && normRoom(u.class) !== normRoom(filterClass)) return false;

        // 6. Gender (Inference Logic Integrated)
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
            gender: user.gender || ''
        });
        setIsFormModalOpen(true);
    };

    const handleDeleteRequest = (ids) => {
        setUserToDelete(ids);
        setIsDeleteModalOpen(true);
    };

    const handleStatusUpdateRequest = (status) => {
        if (selectedIds.length === 0) {
            toast.error("Please select users first.");
            return;
        };
        setStatusToUpdate(status);
        setIsStatusModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        const toastId = toast.loading('Purging records...');
        try {
            if (Array.isArray(userToDelete)) await bulkDeleteUsers(userToDelete);
            else await deleteUser(userToDelete);
            toast.success('Records purged!', { id: toastId });
            setSelectedIds([]);
            setIsDeleteModalOpen(false);
            loadUsers();
        } catch (error) {
            toast.error('Purge failed.', { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmStatusUpdate = async () => {
        setIsUpdatingStatus(true);
        try {
            await bulkUpdateUserStatus(selectedIds, statusToUpdate);
            toast.success(`Updated to ${statusToUpdate}`);
            setSelectedIds([]);
            setIsStatusModalOpen(false);
            loadUsers();
        } catch (error) {
            toast.error('Update failed');
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
            toast.success('Database updated!');
            setIsFormModalOpen(false);
            loadUsers();
        } catch (error) {
            toast.error('Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
    const [isPromoting, setIsPromoting] = useState(false);

    const handlePromotionLevel = async (from, to) => {
        if (!window.confirm(`Promote all students from ${from} to ${to}?`)) return;
        
        setIsPromoting(true);
        const toastId = toast.loading(`Transitioning ${from} to ${to}...`);
        try {
            const count = await promoteLevel(from, to);
            toast.success(`Successfully transitioned ${count} students!`, { id: toastId });
            setIsPromoteModalOpen(false); // Auto-close on success
            loadUsers();
        } catch (error) {
            toast.error('Transition failed: ' + error.message, { id: toastId });
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
                    toast.error('CSV file is empty or missing data.');
                    return;
                }

                const headerRow = allRows[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
                const dataRows = allRows.slice(1);

                // Helper to find column index by multiple possible names
                const findIdx = (possibleNames) => {
                    return headerRow.findIndex(h => possibleNames.includes(h));
                };

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
                    // Handle quoted commas properly if needed, but simple split for now
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

                    // 1. Infer Gender/Prefix if missing
                    const infer = (p, n) => {
                        const combined = (p || '') + (n || '');
                        if (combined.startsWith('เด็กชาย') || combined.startsWith('นาย')) return { g: 'ชาย', p: p || (combined.startsWith('นาย') ? 'นาย' : 'เด็กชาย') };
                        if (combined.startsWith('เด็กหญิง') || combined.startsWith('นางสาว') || combined.startsWith('นาง')) return { g: 'หญิง', p: p || (combined.startsWith('นางสาว') ? 'นางสาว' : (combined.startsWith('นาง') ? 'นาง' : 'เด็กหญิง')) };
                        return { g: '', p: p };
                    };

                    const inferred = infer(prefix, firstName || fullName);
                    if (!gender) gender = inferred.g;
                    if (!prefix) prefix = inferred.p;

                    // 2. Construct Full Name if missing or incomplete
                    if (!fullName) {
                        fullName = `${prefix}${firstName} ${lastName}`.trim();
                    } else if (prefix && !fullName.startsWith(prefix)) {
                        fullName = `${prefix}${fullName}`.trim();
                    }

                    // 3. Normalize Level/Room
                    if (level && !level.startsWith('ม.')) level = `ม.${level}`;
                    if (room === '10032008') room = ''; // Safety from old bug

                    if (!email && !studentId) return null;

                    return { 
                        name: fullName,
                        email: (email || '').toLowerCase(), 
                        studentId: studentId,
                        class: room, 
                        batchYear: '2568', 
                        level: level, 
                        gender: gender, 
                        citizenId: citizenId,
                        roles: ['student'], 
                        status: 'active' 
                    };
                }).filter(u => u !== null);

                if (data.length === 0) {
                    toast.error('No valid user data found in CSV.');
                    return;
                }

                await bulkAddUsers(data);
                toast.success(`Successfully processed ${data.length} users!`);
                loadUsers();
            } catch (err) {
                console.error("Import error:", err);
                toast.error('Import failed: ' + err.message);
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

    const getRoleBadgeColor = (r) => {
        const c = r.toLowerCase();
        if (c === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
        if (c === 'teacher') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans pb-20">
            <Navbar showBack={true} />
            
            <div className="max-w-7xl mx-auto px-6 py-12">
                
                {/* 1. HERO HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-200">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{t('user_management')}</h1>
                            <div className="flex items-center gap-2 text-slate-500 font-bold mt-1">
                                <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] uppercase tracking-widest text-slate-600">Sync Active</span>
                                <p>{t('user_mgmt_desc')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsPromoteModalOpen(true)} className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 font-black text-white hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0">
                            <GraduationCap size={20} />
                            PROMOTE STUDENTS
                        </button>
                        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-8 py-3.5 bg-white border-2 border-slate-100 rounded-2xl shadow-xl shadow-slate-200 font-black text-slate-600 hover:bg-slate-50 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50">
                            <Upload size={20} />
                            IMPORT MASTER
                        </button>
                        <button onClick={() => { setUserToEdit(null); setFormData({ name: '', email: '', roles: ['student'], class: '', batchYear: new Date().getFullYear().toString(), status: 'active', level: '', gender: '' }); setIsFormModalOpen(true); }} className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 rounded-2xl shadow-2xl shadow-slate-300 font-black text-white hover:bg-slate-800 hover:-translate-y-1 transition-all active:translate-y-0">
                            <UserPlus size={20} />
                            REGISTER NEW
                        </button>
                    </div>
                </div>

                {/* 2. COMMAND CENTER (FILTERS) */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10">
                    <div className="flex flex-col xl:flex-row items-center gap-6">
                        <div className="relative w-full xl:w-[400px]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Filter by identity (name/email)..." 
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-slate-700"
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            {[
                                { val: filterLevel, set: setFilterLevel, opt: levels, label: 'LEVEL' },
                                { val: filterClass, set: setFilterClass, opt: rooms, label: 'ROOM', prefix: 'R.' },
                                { val: filterGender, set: setFilterGender, opt: genders, label: 'GENDER' },
                                { val: filterRole, set: setFilterRole, opt: ['student', 'teacher', 'admin'], label: 'ROLE' }
                            ].map((f, i) => (
                                <div key={i} className="flex-grow md:flex-grow-0">
                                    <select value={f.val} onChange={(e) => f.set(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] text-xs font-black text-slate-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer appearance-none hover:bg-slate-100 transition-colors tracking-widest">
                                        <option value="all">{f.label}: ALL</option>
                                        {f.opt.map(o => <option key={o} value={o} className="font-bold text-slate-800">{f.prefix || ''}{o}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] xl:ml-auto shadow-inner">
                            {['active', 'alumni', 'all'].map(s => (
                                <button key={s} onClick={() => setFilterStatus(s)} className={`px-6 py-2.5 rounded-[1rem] text-[10px] font-black tracking-widest transition-all ${filterStatus === s ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {s.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. SELECTION ACTIONS */}
                {selectedIds.length > 0 && (
                    <div className="bg-emerald-600 text-white p-6 rounded-[2.5rem] mb-10 flex flex-col md:flex-row justify-between items-center shadow-2xl shadow-emerald-200 animate-in slide-in-from-top-10 duration-500">
                        <div className="flex items-center gap-5 mb-4 md:mb-0">
                            <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">{selectedIds.length}</div>
                            <div>
                                <h4 className="font-black text-lg leading-tight uppercase tracking-tight">Accounts Selected</h4>
                                <p className="text-emerald-100 text-xs font-bold">Apply batch operations to multiple records</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => handleStatusUpdateRequest('alumni')} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-sm transition-all border border-white/20">SET ALUMNI</button>
                            <button onClick={() => handleStatusUpdateRequest('active')} className="px-6 py-3 bg-emerald-400 text-emerald-900 rounded-2xl font-black text-sm transition-all hover:bg-emerald-300">ACTIVATE ALL</button>
                            <button onClick={() => handleDeleteRequest(selectedIds)} className="px-6 py-3 bg-red-500 hover:bg-red-400 rounded-2xl font-black text-sm shadow-xl transition-all">TERMINATE</button>
                        </div>
                    </div>
                )}

                {/* 4. MASTER TABLE */}
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-10 py-6 w-12 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-6 h-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm" 
                                            onChange={handleSelectAll} 
                                            checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length} 
                                        />
                                    </th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Identity</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Level</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Room</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Gender</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">State</th>
                                    <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="py-40 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-16 h-16 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black tracking-widest text-slate-900">SYNCHRONIZING</h3>
                                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Merging local records with master database</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className={`group transition-all duration-300 ${selectedIds.includes(u.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}`}>
                                            <td className="px-10 py-7 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-6 h-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all cursor-pointer" 
                                                    checked={selectedIds.includes(u.id)} 
                                                    onChange={() => handleSelectRow(u.id)} 
                                                />
                                            </td>
                                            <td className="px-6 py-7 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`h-14 w-14 rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-xl transition-all group-hover:rotate-6 group-hover:scale-110 ${u.uid ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        {(u.name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-5">
                                                        <div className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight mb-0.5">{u.name}</div>
                                                        <div className="text-xs font-bold text-slate-400 tracking-tight">{u.email}</div>
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
                                                        {u.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => setSelectedUser(u)} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-xl rounded-2xl transition-all" title="View Report"><Eye size={20} /></button>
                                                    <button onClick={() => handleEdit(u)} className="p-3 text-blue-500 hover:text-blue-700 hover:bg-white hover:shadow-xl rounded-2xl transition-all" title="Modify Access"><Edit3 size={20} /></button>
                                                    <button onClick={() => handleDeleteRequest(u.id)} className="p-3 text-red-400 hover:text-red-700 hover:bg-white hover:shadow-xl rounded-2xl transition-all" title="Purge Record"><Trash2 size={20} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-48 text-center">
                                            <div className="flex flex-col items-center opacity-30 scale-125">
                                                <div className="w-32 h-32 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                                                    <Filter className="w-16 h-16 text-slate-300" />
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-400 italic mb-3 tracking-tighter">NO ENTRIES FOUND</h3>
                                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Adjust master filters to synchronize view</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-12 flex justify-between items-center text-slate-400 px-4">
                    <div className="flex items-center gap-3">
                        <Clock size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Last Master Sync: {new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Authorized by</span>
                        <div className="h-6 w-6 bg-slate-200 rounded-md" />
                    </div>
                </div>
            </div>

            {/* 5. USER FORM MODAL */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-12 relative my-12 animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsFormModalOpen(false)} className="absolute top-10 right-10 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <X size={30} />
                        </button>
                        
                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-20 h-20 bg-emerald-100 rounded-[1.75rem] flex items-center justify-center text-emerald-600 shadow-inner">
                                {userToEdit ? <Edit3 size={36} /> : <UserPlus size={36} />}
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{userToEdit ? 'Modify Access' : 'Create Identity'}</h2>
                                <p className="text-slate-500 font-bold text-lg">{userToEdit ? 'Update security clearances and metadata' : 'Register a new member to the school network'}</p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Display Name</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full px-6 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all placeholder:text-slate-300" placeholder="Full legal name" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Email Identity</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled={!!userToEdit} className="w-full px-6 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-800 transition-all disabled:opacity-50 placeholder:text-slate-300" placeholder="user@nr.ac.th" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { name: 'level', label: 'LEVEL', opt: levels },
                                    { name: 'class', label: 'ROOM', opt: rooms },
                                    { name: 'gender', label: 'GENDER', opt: ['ชาย', 'หญิง'] }
                                ].map(f => (
                                    <div key={f.name} className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{f.label}</label>
                                        <select value={formData[f.name]} onChange={(e) => setFormData({...formData, [f.name]: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all appearance-none cursor-pointer text-slate-800">
                                            <option value="">N/A</option>
                                            {f.opt.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">BATCH</label>
                                    <input type="text" value={formData.batchYear} onChange={(e) => setFormData({...formData, batchYear: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-[1.25rem] focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm transition-all text-slate-800" placeholder="2568" />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Access Role Clearances</label>
                                <div className="flex flex-wrap gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                                    {['student', 'teacher', 'admin'].map(role => (
                                        <label key={role} className={`flex items-center gap-4 px-7 py-4 rounded-[1.5rem] border-2 transition-all cursor-pointer ${formData.roles.includes(role) ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-200' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200 hover:text-slate-400'}`}>
                                            <input type="checkbox" checked={formData.roles.includes(role)} onChange={(e) => {
                                                const updated = e.target.checked ? [...formData.roles, role] : formData.roles.filter(r => r !== role);
                                                setFormData({...formData, roles: updated});
                                            }} className="hidden" />
                                            <ShieldCheck size={22} className={formData.roles.includes(role) ? 'text-white' : 'text-slate-100'} />
                                            <span className="text-sm font-black uppercase tracking-[0.1em]">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            {formData.roles.includes('teacher') && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">สิทธิ์พิเศษ (Special Permissions)</label>
                                    <div className="p-6 bg-amber-50/50 rounded-[2rem] border border-amber-100/50">
                                        <label className={`flex items-center gap-4 px-7 py-4 rounded-[1.5rem] border-2 transition-all cursor-pointer ${formData.permissions.includes('discipline.write') ? 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-100' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200 hover:text-slate-400'}`}>
                                            <input type="checkbox" checked={formData.permissions.includes('discipline.write')} onChange={(e) => {
                                                const updated = e.target.checked ? [...formData.permissions, 'discipline.write'] : formData.permissions.filter(p => p !== 'discipline.write');
                                                setFormData({...formData, permissions: updated});
                                            }} className="hidden" />
                                            <Clock size={22} className={formData.permissions.includes('discipline.write') ? 'text-white' : 'text-slate-100'} />
                                            <div>
                                                <span className="text-sm font-black uppercase tracking-[0.1em] block">ตัดและแก้ไขคะแนนพฤติกรรม</span>
                                                <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest leading-none">discipline.write</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex flex-col md:flex-row justify-end gap-4 pt-10 border-t border-slate-100">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-10 py-5 rounded-[1.5rem] text-slate-400 font-black hover:text-slate-900 transition-all uppercase text-xs tracking-[0.2em]">ABORT MISSION</button>
                                <button type="submit" disabled={loading} className="px-14 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl shadow-slate-300 hover:bg-emerald-600 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 uppercase text-xs tracking-[0.2em]">
                                    {loading ? 'Processing...' : userToEdit ? 'Push Updates' : 'Commit to Database'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. DETAILS PANEL */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-2xl p-4">
                    <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg p-14 relative overflow-hidden animate-in fade-in zoom-in duration-500">
                        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg" />
                        
                        <button onClick={() => setSelectedUser(null)} className="absolute top-10 right-10 p-3 bg-white/20 text-white hover:bg-red-500 hover:text-white rounded-full transition-all">
                            <X size={28} />
                        </button>
                        
                        <div className="relative mt-12 text-center mb-12">
                            <div className="w-36 h-36 rounded-[2.5rem] bg-white p-2 shadow-2xl mx-auto mb-8 transform rotate-3">
                                <div className={`w-full h-full rounded-[2rem] flex items-center justify-center font-black text-5xl shadow-inner ${selectedUser.uid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                                    {(selectedUser.name || '?').charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 leading-tight mb-2 tracking-tighter">{selectedUser.name}</h2>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full">
                                <div className={`w-2 h-2 rounded-full ${selectedUser.uid ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedUser.email}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">PLACEMENT</span>
                                <div className="text-lg font-black text-slate-800 leading-none">Room {selectedUser.class || '-'}</div>
                                <div className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-wide">{selectedUser.level || '-'}</div>
                            </div>
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">IDENTIFIERS</span>
                                <div className="text-lg font-black text-slate-800 leading-none">{selectedUser.gender || 'Unknown'}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">ID: {selectedUser.studentId || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] mb-12 shadow-2xl shadow-slate-300">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Clearances</span>
                                <ShieldCheck size={16} className="text-emerald-500" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedUser.roles?.map(role => (
                                    <span key={role} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border border-emerald-500/20">
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <button onClick={() => setSelectedUser(null)} className="w-full bg-slate-900 text-white rounded-[1.5rem] py-6 font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-emerald-600 hover:-translate-y-1 transition-all active:scale-95">CLOSE ACCESS</button>
                    </div>
                </div>
            )} 
            
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Confirm Purge" message="This action will permanently erase this identity from the school network. This cannot be undone." confirmText="PURGE NOW" isLoading={isDeleting} />
            <ConfirmationModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onConfirm={confirmStatusUpdate} title="Lifecycle Transition" message={`Move selected users to the ${statusToUpdate} state?`} confirmText="CONFIRM" isLoading={isUpdatingStatus} />

            {/* 7. PROMOTION MODAL (STEP-BY-STEP) */}
            {isPromoteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-12 relative animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsPromoteModalOpen(false)} className="absolute top-10 right-10 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                            <X size={30} />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">Academic Year Promotion</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Select a specific transition to execute</p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <button disabled={isPromoting} onClick={() => handlePromotionLevel("ม.6", "alumni")} className="p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl text-left hover:bg-rose-100 transition-all group">
                                    <div className="text-rose-600 font-black text-lg">ม.6 → ALUMNI</div>
                                    <div className="text-rose-400 text-[10px] font-bold uppercase mt-1">Graduate Senior High</div>
                                </button>
                                <button disabled={isPromoting} onClick={() => handlePromotionLevel("ม.3", "alumni")} className="p-6 bg-orange-50 border-2 border-orange-100 rounded-3xl text-left hover:bg-orange-100 transition-all group">
                                    <div className="text-orange-600 font-black text-lg">ม.3 → ALUMNI</div>
                                    <div className="text-orange-400 text-[10px] font-bold uppercase mt-1">Graduate Junior High</div>
                                </button>
                            </div>

                            <div className="h-px bg-slate-100 my-4" />

                            <div className="grid grid-cols-2 gap-4">
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
                                        className="p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-left hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                                    >
                                        <div className="text-slate-900 font-black text-base group-hover:text-indigo-600">{step.f} → {step.t}</div>
                                        <div className="text-slate-400 text-[9px] font-bold uppercase mt-0.5">Promotion Step</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={24} />
                            <p className="text-amber-800 text-xs font-bold leading-relaxed">
                                RECOMMENDED: Start from the highest grade (M.6) and work downwards to prevent data overlapping.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;