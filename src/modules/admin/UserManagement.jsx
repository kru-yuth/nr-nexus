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
} from '../../services/userService';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/common/Navbar';
import ConfirmationModal from '../../components/common/ConfirmationModal';

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
        name: '', email: '', roles: ['student'], class: '',
        batchYear: new Date().getFullYear().toString(), status: 'active',
        level: '', gender: ''
    });

    // Delete Confirmation Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Status Update Confirmation Modal State
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

    const filteredUsers = users.filter((user) => {
        const searchText = searchTerm.toLowerCase();
        const matchesSearch = 
            (user.name || '').toLowerCase().includes(searchText) ||
            (user.email || '').toLowerCase().includes(searchText);
        const matchesRole = filterRole === 'all' || (user.roles && user.roles.includes(filterRole));
        const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
        const matchesClass = filterClass === 'all' || (user.class && user.class.toString().toLowerCase().trim() == filterClass.toLowerCase().trim());
        const matchesLevel = filterLevel === 'all' || (user.level && user.level.toString().toLowerCase().trim() == filterLevel.toLowerCase().trim());
        const matchesGender = filterGender === 'all' || (user.gender && user.gender.toString().toLowerCase().trim() == filterGender.toLowerCase().trim());
        
        return matchesSearch && matchesRole && matchesStatus && matchesClass && matchesLevel && matchesGender;
    });

    const handleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const filteredUserIds = filteredUsers.map(u => u.id);
            setSelectedIds(filteredUserIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleEdit = (user) => {
        setUserToEdit(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            roles: user.roles || ['student'],
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
            toast.error("Please select users to update.");
            return;
        };
        setStatusToUpdate(status);
        setIsStatusModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        const toastId = toast.loading('Deleting user(s)...');
        try {
            if (Array.isArray(userToDelete)) {
                await bulkDeleteUsers(userToDelete);
                toast.success(`Successfully deleted ${userToDelete.length} users.`, { id: toastId });
                setSelectedIds([]);
            } else {
                await deleteUser(userToDelete);
                toast.success('User deleted successfully.', { id: toastId });
            }
            setUserToDelete(null);
            setIsDeleteModalOpen(false);
            loadUsers();
        } catch (error) {
            console.error("Failed to delete user(s):", error);
            toast.error("Failed to delete user(s).", { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const confirmStatusUpdate = async () => {
        if (selectedIds.length === 0 || !statusToUpdate) return;
        
        setIsUpdatingStatus(true);
        const toastId = toast.loading(`Updating status to ${statusToUpdate}...`);
        try {
            await bulkUpdateUserStatus(selectedIds, statusToUpdate);
            toast.success("Users updated successfully!", { id: toastId });
            setSelectedIds([]);
            setStatusToUpdate(null);
            setIsStatusModalOpen(false);
            await loadUsers();
        } catch (error) {
            console.error("Bulk update failed:", error);
            toast.error("Failed to update users.", { id: toastId });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name === 'roles') {
            const updatedRoles = checked
                ? [...formData.roles, value]
                : formData.roles.filter(r => r !== value);
            setFormData(prev => ({ ...prev, roles: updatedRoles }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email.includes('@')) {
            toast.error("Valid email is required");
            return;
        }

        const isEditing = !!userToEdit;
        const toastId = toast.loading(isEditing ? 'Updating user...' : 'Adding user...');
        setLoading(true);

        try {
            const userData = {
                displayName: formData.name,
                email: formData.email,
                roles: formData.roles,
                class: formData.class,
                batchYear: formData.batchYear,
                status: formData.status,
                level: formData.level,
                gender: formData.gender
            };

            if (isEditing) {
                await updateUser(userToEdit.id, userData);
                toast.success('User updated successfully!', { id: toastId });
            } else {
                await addNewUser({ name: formData.name, ...userData });
                toast.success('User added successfully!', { id: toastId });
            }
            setIsFormModalOpen(false);
            loadUsers();
        } catch (error) {
            console.error("Form submission failed:", error);
            toast.error("Form submission failed.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading('Importing CSV file...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                if (lines.length <= 1) {
                    throw new Error("CSV is empty or has only a header.");
                }
                
                const dataToImport = lines.slice(1).map(line => {
                    const values = line.split(',');
                    return {
                        name: values[0]?.trim(),
                        email: values[1]?.trim(),
                        class: values[2]?.trim() || '',
                        batchYear: values[3]?.trim() || '',
                        level: values[4]?.trim() || '',
                        gender: values[5]?.trim() || '',
                        roles: ['student'],
                        status: 'active'
                    };
                });

                if (dataToImport.some(d => !d.name || !d.email)) {
                    throw new Error("Some rows are missing required 'name' or 'email' values.");
                }

                await bulkAddUsers(dataToImport);
                toast.success(`Successfully imported ${dataToImport.length} users!`, { id: toastId });
                loadUsers();
            } catch (error) {
                console.error("Import failed:", error);
                toast.error(`Import failed: ${error.message}`, { id: toastId });
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    // กำหนดค่าตัวเลือกแบบคงที่
    const levels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const rooms = ['1', '2', '3'];
    const genders = ['ชาย', 'หญิง'];

    const getRoleBadgeColor = (role) => ({'admin': 'bg-purple-100 text-purple-800', 'teacher': 'bg-blue-100 text-blue-800', 'student': 'bg-green-100 text-green-800'}[role] || 'bg-gray-100 text-gray-800');
    const getStatusBadgeColor = (status) => ({'active': 'bg-green-100 text-green-700', 'alumni': 'bg-amber-100 text-amber-700', 'inactive': 'bg-red-100 text-red-700'}[status] || 'bg-gray-100 text-gray-700');

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar showBack={true} />
            <div className="max-w-7xl mx-auto p-8">
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{t('user_management')}</h1>
                        <p className="text-gray-500 mt-2">{t('user_mgmt_desc')}</p>
                    </div>
                    <div className="flex gap-2">
                        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition disabled:opacity-50">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
                            {isImporting ? "Importing..." : "Import CSV"}
                        </button>
                        <button onClick={() => { 
                            setUserToEdit(null); 
                            setFormData({ name: '', email: '', roles: ['student'], class: '', batchYear: new Date().getFullYear().toString(), status: 'active', level: '', gender: '' }); 
                            setIsFormModalOpen(true);
                        }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Add User
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg></div>
                        <input type="text" placeholder="Search users..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-green-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[120px]">
                            <option value="all">ระดับชั้น: ทั้งหมด</option>
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[120px]">
                            <option value="all">ห้อง: ทั้งหมด</option>
                            {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                        </select>
                        <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[100px]">
                            <option value="all">เพศ: ทั้งหมด</option>
                            {genders.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[120px]">
                            <option value="all">บทบาท: ทั้งหมด</option>
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg ml-auto">
                        {['active', 'alumni', 'all'].map(s => (<button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${filterStatus === s ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{s.toUpperCase()}</button>))}
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4 flex justify-between items-center animate-in fade-in slide-in-from-top-4">
                        <span className="text-green-800 text-sm font-medium">{selectedIds.length} users selected</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleStatusUpdateRequest('alumni')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded shadow-sm font-bold transition">Set as Alumni</button>
                            <button onClick={() => handleStatusUpdateRequest('active')} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded shadow-sm font-bold transition">Set as Active</button>
                            <button onClick={() => handleDeleteRequest(selectedIds)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded shadow-sm font-bold transition">Delete Selected</button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left"><input type="checkbox" className="rounded border-gray-300 text-green-600" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredUsers.length} /></th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Class / Batch</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Level / Gender</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (<tr><td colSpan="7" className="p-10 text-center text-gray-400">Loading...</td></tr>) : filteredUsers.length > 0 ? (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(u.id) ? 'bg-green-50/50' : ''}`}>
                                        <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300 text-green-600" checked={selectedIds.includes(u.id)} onChange={() => handleSelectRow(u.id)} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${u.uid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{(u.name || u.email).charAt(0).toUpperCase()}</div>
                                                <div className="ml-4"><div className="text-sm font-bold text-gray-900">{u.name}</div><div className="text-xs text-gray-500">{u.email}</div></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 font-medium">{u.level || '-'}</div><div className="text-xs text-gray-500">{u.class ? `ห้อง ${u.class}` : ''}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900 font-medium">{u.batchYear || '-'}</div><div className="text-xs text-gray-500">{u.gender || ''}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-wrap gap-1">{u.roles?.map(role => (<span key={role} className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${getRoleBadgeColor(role)}`}>{role}</span>))}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${getStatusBadgeColor(u.status)}`}>{u.status}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => setSelectedUser(u)} className="text-gray-600 hover:text-gray-900 font-bold px-2 py-1 rounded-md hover:bg-gray-100 transition">{t('view')}</button>
                                            <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-900 font-bold px-2 py-1 rounded-md hover:bg-blue-50 transition">{t('edit')}</button>
                                            <button onClick={() => handleDeleteRequest(u.id)} className="text-red-600 hover:text-red-900 font-bold px-2 py-1 rounded-md hover:bg-red-50 transition">{t('delete')}</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (<tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">No users found matching your filters.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative my-8">
                        <button 
                            onClick={() => setIsFormModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            {userToEdit ? 'Edit User' : 'Add New User'}
                        </h2>
                        
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    disabled={!!userToEdit}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="john@example.com"
                                />
                                {userToEdit && <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed after creation.</p>}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Level (ระดับชั้น)</label>
                                    <select
                                        name="level"
                                        value={formData.level}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                    >
                                        <option value="">เลือกระดับชั้น</option>
                                        {levels.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Gender (เพศ)</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                    >
                                        <option value="">เลือกเพศ</option>
                                        {genders.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Room (ห้อง)</label>
                                    <select
                                        name="class"
                                        value={formData.class}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                    >
                                        <option value="">เลือกห้อง</option>
                                        {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Batch Year</label>
                                    <input
                                        type="text"
                                        name="batchYear"
                                        value={formData.batchYear}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="เช่น 2024"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Roles</label>
                                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg">
                                    {['student', 'teacher', 'admin'].map(role => (
                                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="roles"
                                                value={role}
                                                checked={formData.roles.includes(role)}
                                                onChange={handleChange}
                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4"
                                            />
                                            <span className="text-sm text-gray-700 capitalize">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                                >
                                    <option value="active">Active</option>
                                    <option value="alumni">Alumni</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsFormModalOpen(false)}
                                    className="px-6 py-2 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-md disabled:bg-green-400"
                                >
                                    {loading ? 'Saving...' : userToEdit ? 'Update User' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
                        <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <div className="text-center mb-6">
                            <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center font-bold ${selectedUser.uid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {(selectedUser.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">{selectedUser.name || 'Anonymous'}</h2>
                            <p className="text-gray-500">{selectedUser.email}</p>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Status</span>
                                    <span className={`text-sm font-bold uppercase ${getStatusBadgeColor(selectedUser.status).split(' ')[1]}`}>
                                        {selectedUser.status}
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Class / Batch</span>
                                    <span className="text-sm font-bold text-gray-700">
                                        {selectedUser.class || 'N/A'} {selectedUser.batchYear ? `(${selectedUser.batchYear})` : ''}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Roles</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedUser.roles?.map(role => (
                                        <span key={role} className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${getRoleBadgeColor(role)}`}>
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Account Link Status</span>
                                {selectedUser.uid ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-bold text-green-700">Linked to Google Account</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-bold text-amber-700">Pending First Login</span>
                                    </div>
                                )}
                            </div>
                            
                            {selectedUser.updatedAt && (
                                <div className="text-[10px] text-gray-400 text-center">
                                    Last Updated: {new Date(selectedUser.updatedAt).toLocaleString()}
                                </div>
                            )}

                            {/* แสดงข้อมูลเพิ่มเติมอื่นๆ ทั้งหมดที่มีใน Database */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <span className="text-[10px] text-gray-400 uppercase font-bold block mb-2">Detailed Data</span>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.entries(selectedUser)
                                        .filter(([key, value]) => 
                                            !['id', 'uid', 'name', 'displayName', 'email', 'roles', 'role', 'status', 'class', 'batchYear', 'updatedAt', 'createdAt', 'FirstName', 'LastName'].includes(key) &&
                                            typeof value !== 'object' && 
                                            value !== '' && 
                                            value !== null
                                        )
                                        .map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-center text-xs bg-gray-50/50 p-2 rounded">
                                                <span className="text-gray-500 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                                <span className="text-gray-800 font-bold">{value.toString()}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                        
                        <button onClick={() => setSelectedUser(null)} className="w-full bg-gray-900 text-white rounded-xl py-3 font-bold hover:bg-gray-800 transition">Close</button>
                    </div>
                </div>
            )} 
            
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Confirm Deletion" message={Array.isArray(userToDelete) ? `Are you sure you want to delete ${userToDelete.length} selected users? This action cannot be undone.` : "Are you sure you want to delete this user? This action cannot be undone."} confirmText="Delete" isLoading={isDeleting} />
            
            <ConfirmationModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onConfirm={confirmStatusUpdate} title="Confirm Status Update" message={`Are you sure you want to update ${selectedIds.length} users to '${statusToUpdate}'?`} confirmText="Update" isLoading={isUpdatingStatus} />
        </div>
    );
};

export default UserManagement;