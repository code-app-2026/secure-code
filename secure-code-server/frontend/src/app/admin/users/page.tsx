"use client";

import React, { useState, useEffect } from 'react';
import AdminHeader from '@/components/AdminHeader';
import { Users, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle, X, Eye, EyeOff, Check } from 'lucide-react';
import { api } from '../../../lib/api';

export default function UsersPage() {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createPasswordVisible, setCreatePasswordVisible] = useState(false);
    const [activeUser, setActiveUser] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

    const [users, setUsers] = useState<any[]>([]);
    const [createUsername, setCreateUsername] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createRole, setCreateRole] = useState('');
    const [createStatus, setCreateStatus] = useState('');
    const [createAllowIp, setCreateAllowIp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorPopup, setDeleteErrorPopup] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [timeTick, setTimeTick] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    // Force re-render every minute to keep relative times (like "Just now" -> "1 min ago") continuously fresh
    useEffect(() => {
        const timer = setInterval(() => setTimeTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchUsers = async () => {
        try {
            const data = await api.get('/users');
            setUsers(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
        const interval = setInterval(fetchUsers, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async () => {
        /* WireGuard IP Check Disabled
        const ipRegex = /^10\.8\.0\.([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
        if (!ipRegex.test(createAllowIp)) {
            showToast('Invalid IP Format. Must be a WireGuard IP (e.g., 10.8.0.2)', 'error');
            return;
        }
        */

        if (modalMode === 'edit') {
            if (!createUsername || !createRole || !createStatus) {
                showToast('Please fill out username, role, and status', 'error');
                return;
            }
            setIsSubmitting(true);
            try {
                await api.patch(`/users/${activeUser.id}`, {
                    username: createUsername,
                    role: createRole,
                    status: createStatus,
                    allowIp: createAllowIp
                });
                showToast('User updated successfully');
                setShowCreateModal(false);
                fetchUsers();
            } catch (err: any) {
                showToast(err.message || 'Failed to update user', 'error');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (!createUsername || !createPassword || !createRole || !createStatus) {
            showToast('Please fill out username, password, role, and status', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users', {
                username: createUsername,
                password: createPassword,
                role: createRole,
                status: createStatus,
                allowIp: createAllowIp
            });
            showToast('User created successfully');
            setShowCreateModal(false);
            setCreateUsername('');
            setCreatePassword('');
            setCreateRole('');
            setCreateStatus('');
            setCreateAllowIp('');
            fetchUsers();
        } catch (err: any) {
            showToast(err.message || 'Failed to create user', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (user: any) => {
        setActiveUser(user);
        setShowDeleteModal(true);
    };

    const handleEditClick = (user: any) => {
        setActiveUser(user);
        setCreateUsername(user.username || '');
        setCreatePassword(''); // Leave blank by default, but allow them to type a new one
        setCreateRole(user.role || '');
        setCreateStatus(user.status || '');
        setCreateAllowIp(user.allowIp || '');
        setModalMode('edit');
        setShowCreateModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!activeUser) return;
        setIsDeleting(true);
        try {
            await api.delete(`/users/${activeUser.id}`);
            showToast('User deleted successfully');
            setShowDeleteModal(false);
            fetchUsers();
        } catch (err: any) {
            setShowDeleteModal(false);
            setDeleteErrorPopup(err.message || 'Failed to delete user');
        } finally {
            setIsDeleting(false);
        }
    };

    const getRoleStyle = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'developer': return 'bg-[#251543] text-[#9d63f5] border-[#311c59]';
            case 'viewer': return 'bg-[#0f244a] text-[#3b82f6] border-[#133062]';
            case 'admin': return 'bg-[#3b1238] text-[#ec4899] border-[#551a51]';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-700';
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return { dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]', text: 'text-emerald-500' };
            case 'suspended':
                return { dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]', text: 'text-amber-500' };
            case 'blocked':
                return { dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]', text: 'text-red-500' };
            default:
                return { dot: 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.8)]', text: 'text-slate-400' };
        }
    };

    const formatRelativeTime = (dateString: string) => {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    };

    const totalPages = Math.max(1, Math.ceil(users.length / itemsPerPage));
    const currentUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const passwordCriteria = {
        length: createPassword.length >= 8,
        lower: /[a-z]/.test(createPassword),
        upper: /[A-Z]/.test(createPassword),
        number: /[0-9]/.test(createPassword),
        special: /[^a-zA-Z0-9]/.test(createPassword)
    };

    const isPasswordValid = modalMode === 'edit' || (passwordCriteria.length && passwordCriteria.lower && passwordCriteria.upper && passwordCriteria.number && passwordCriteria.special);
    // const ipRegex = /^10\.8\.0\.([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    const isFormValid = createUsername && createRole && createStatus && (modalMode === 'edit' || (createPassword && isPasswordValid));

    return (
        <div className="min-h-screen bg-[#050810] text-slate-200 font-sans">
            <AdminHeader />

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 transition-opacity duration-300 ${toast.type === 'success' ? 'bg-[#0f2e20]/95 border border-emerald-500/30' : 'bg-[#2e0f0f]/95 border border-red-500/30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {toast.type === 'success' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <p className={`text-[14px] font-medium ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-4 text-slate-400 hover:text-white focus:outline-none"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="max-w-[1400px] mx-auto p-8 mt-4">

                {/* Header Row */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <Users className="w-8 h-8 text-indigo-500" fill="currentColor" />
                        <h1 className="text-[26px] font-bold text-white tracking-wide">USERS</h1>
                    </div>
                    <button
                        onClick={() => {
                            setModalMode('create');
                            setActiveUser(null);
                            setCreateUsername('');
                            setCreatePassword('');
                            setCreateRole('');
                            setCreateStatus('');
                            setCreateAllowIp('');
                            setShowCreateModal(true);
                        }}
                        className="flex items-center space-x-2 bg-gradient-to-b from-[#4f46e5] to-[#3730a3] hover:from-[#4338ca] hover:to-[#312e81] text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create User</span>
                    </button>
                </div>

                {/* Table Container */}
                <div className="bg-[#0b1220] border border-slate-800/60 rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800/80 text-[14px] text-slate-200 bg-[#070b14]">
                                    <th className="px-8 py-5 font-semibold tracking-wide">Username</th>
                                    {/* <th className="px-8 py-5 font-semibold tracking-wide">IP Address</th> */}
                                    <th className="px-8 py-5 font-semibold tracking-wide">Project</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide text-center">Role</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Status</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Last Active</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentUsers.map((user, idx) => (
                                    <tr key={idx} className="border-b border-slate-800/60 hover:bg-[#0f172a]/30 transition-colors bg-[#080d18]">
                                        <td className="px-8 py-6 text-[15px] font-medium text-slate-200">{user.username}</td>
                                        {/* <td className="px-8 py-6 text-[15px] text-slate-400">{user.allowIp || 'N/A'}</td> */}
                                        <td className="px-8 py-6 text-[15px] text-slate-400">
                                            {user.role === 'Admin' ? 'All Projects' : `${user.projects?.length || 0} Project${user.projects?.length === 1 ? '' : 's'}`}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className={`px-4 py-1.5 border rounded-md text-[13px] font-medium tracking-wide capitalize ${getRoleStyle(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-[14px] font-medium capitalize ${getStatusStyle(user.status).text}`}>{user.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-[14px]">
                                            {user.isOnline ? (
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
                                                    <span className="text-emerald-400 font-medium tracking-wide">Online</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                                                    <span className="text-red-400/90 font-medium tracking-wide">
                                                        Offline <span className="text-slate-500 font-normal">({user.lastActive ? formatRelativeTime(user.lastActive) : 'Never'})</span>
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center items-center space-x-3">
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="flex items-center space-x-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-[#0f172a] hover:text-white transition-all bg-[#080d18]"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    <span className="text-[13px] font-medium">Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(user)}
                                                    className="flex items-center space-x-2 px-4 py-2 border border-[#7f1d1d] rounded-lg text-red-500 hover:bg-[#7f1d1d]/30 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span className="text-[13px] font-medium">Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center mt-8 space-x-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg border border-slate-700 bg-[#0b1220] transition-colors ${currentPage === 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-10 h-10 rounded-lg font-medium flex items-center justify-center transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'border border-slate-700 bg-[#0b1220] text-slate-400 hover:text-white hover:bg-[#0f172a]'}`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg border border-slate-700 bg-[#0b1220] transition-colors ${currentPage === totalPages ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-[400px] p-8 mx-4 bg-[#0a0f1c] border border-red-500/30 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.15)] relative flex flex-col items-center">

                        {/* Warning Icon */}
                        <div className="w-16 h-16 mt-2 mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={2} />
                        </div>

                        <h2 className="text-[24px] font-bold text-white mb-3 tracking-wide">Delete</h2>
                        <p className="text-center text-[14px] text-slate-400 mb-8 leading-relaxed">
                            Do you want to delete the user <span className="text-white font-semibold">{activeUser?.username}</span>?
                        </p>

                        {/* Buttons */}
                        <div className="flex w-full space-x-4">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3.5 bg-[#111827] hover:bg-[#1f2937] border border-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
                            >
                                No
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 py-3.5 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border border-red-500/50 text-white font-semibold rounded-xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.3)] active:scale-[0.98] disabled:opacity-80 flex items-center justify-center"
                            >
                                {isDeleting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Yes'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Delete Error Modal */}
            {deleteErrorPopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-[400px] p-8 mx-4 bg-[#0a0f1c] border border-red-500/30 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.15)] relative flex flex-col items-center">
                        <div className="w-16 h-16 mt-2 mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={2} />
                        </div>
                        <h2 className="text-[24px] font-bold text-white mb-3 tracking-wide">Action Denied</h2>
                        <p className="text-center text-[14px] text-slate-400 mb-8 leading-relaxed">
                            {deleteErrorPopup}
                        </p>
                        <button
                            onClick={() => setDeleteErrorPopup(null)}
                            className="w-full py-3.5 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border border-red-500/50 text-white font-semibold rounded-xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.3)] active:scale-[0.98] flex items-center justify-center"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 py-6">
                    <div className="w-full max-w-[480px] p-8 mx-4 bg-[#0a0f1c]/95 border border-slate-800/80 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col max-h-full overflow-y-auto">

                        {/* Close Button */}
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none bg-blue-500/10 p-1.5 rounded-full border border-blue-500/20"
                        >
                            <X className="w-5 h-5 text-blue-400" />
                        </button>

                        <h2 className="text-[22px] font-bold text-white mb-8 tracking-wide text-center mt-2">
                            {modalMode === 'edit' ? 'Edit User' : 'Create User'}
                        </h2>

                        <div className="w-full space-y-4">

                            {/* Username */}
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    value={createUsername}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^[a-z][a-z0-9]*$/.test(val)) {
                                            setCreateUsername(val);
                                        }
                                    }}
                                    placeholder="Username"
                                    className="w-full bg-[#050810] border border-slate-800/60 rounded-xl px-4 py-3.5 text-[14px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner"
                                />
                            </div>

                            {/* Password */}
                            <div className="flex flex-col space-y-2">
                                <div className="relative">
                                    <input
                                        type={createPasswordVisible ? "text" : "password"}
                                        value={modalMode === 'edit' ? '*'.repeat(activeUser?.passwordLength || 8) : createPassword}
                                        onChange={(e) => setCreatePassword(e.target.value)}
                                        disabled={modalMode === 'edit'}
                                        placeholder="Password"
                                        className={`w-full bg-[#050810] border border-slate-800/60 rounded-xl px-4 py-3.5 pr-12 text-[14px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner ${modalMode === 'edit' ? 'opacity-50 cursor-not-allowed text-slate-500' : ''}`}
                                    />
                                    {modalMode !== 'edit' && (
                                        <button
                                            onClick={() => setCreatePasswordVisible(!createPasswordVisible)}
                                            className="absolute right-4 top-[14px] text-slate-500 hover:text-slate-400 focus:outline-none"
                                        >
                                            {createPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    )}
                                </div>
                                {modalMode === 'create' && createPassword.length > 0 && (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 px-1">
                                        <div className="flex items-center space-x-1.5">
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${passwordCriteria.length ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-transparent'}`}>
                                                <Check className="w-2 h-2" />
                                            </div>
                                            <span className={`text-[11px] ${passwordCriteria.length ? 'text-emerald-400' : 'text-slate-500'}`}>Min 8 chars</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${passwordCriteria.lower ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-transparent'}`}>
                                                <Check className="w-2 h-2" />
                                            </div>
                                            <span className={`text-[11px] ${passwordCriteria.lower ? 'text-emerald-400' : 'text-slate-500'}`}>1 small letter</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${passwordCriteria.upper ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-transparent'}`}>
                                                <Check className="w-2 h-2" />
                                            </div>
                                            <span className={`text-[11px] ${passwordCriteria.upper ? 'text-emerald-400' : 'text-slate-500'}`}>1 capital</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${passwordCriteria.number ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-transparent'}`}>
                                                <Check className="w-2 h-2" />
                                            </div>
                                            <span className={`text-[11px] ${passwordCriteria.number ? 'text-emerald-400' : 'text-slate-500'}`}>1 number</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${passwordCriteria.special ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-transparent'}`}>
                                                <Check className="w-2 h-2" />
                                            </div>
                                            <span className={`text-[11px] ${passwordCriteria.special ? 'text-emerald-400' : 'text-slate-500'}`}>1 special char</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Role Dropdown */}
                            <div className="flex flex-col relative">
                                <select
                                    value={createRole}
                                    onChange={(e) => setCreateRole(e.target.value)}
                                    className="w-full bg-[#050810] border border-slate-800/60 rounded-xl px-4 py-3.5 text-[14px] text-slate-200 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    <option value="" disabled hidden>Role</option>
                                    <option value="Admin" className="bg-[#0b1220]">Admin</option>
                                    <option value="Developer" className="bg-[#0b1220]">Developer</option>
                                    <option value="Viewer" className="bg-[#0b1220]">Viewer</option>
                                </select>
                                <div className="absolute right-4 top-[14px] pointer-events-none text-slate-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>

                            {/* Status Dropdown */}
                            <div className="flex flex-col relative">
                                <select
                                    value={createStatus}
                                    onChange={(e) => setCreateStatus(e.target.value)}
                                    className="w-full bg-[#050810] border border-slate-800/60 rounded-xl px-4 py-3.5 text-[14px] text-slate-200 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    <option value="" disabled hidden>Status</option>
                                    <option value="Active" className="bg-[#0b1220]">Active (Full access)</option>
                                    <option value="Suspended" className="bg-[#0b1220]">Suspended (Temporarily disabled)</option>
                                    <option value="Blocked" className="bg-[#0b1220]">Blocked (Permanently disabled)</option>
                                </select>
                                <div className="absolute right-4 top-[14px] pointer-events-none text-slate-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>

                            {/* Allow IP (Temporarily Disabled for Cloudflare Tunnel) */}
                            {/* 
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    value={createAllowIp}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        // Auto-prefix 10.8.0. if they start typing a number directly
                                        if (val.length > 0 && !val.startsWith('10.8.0.')) {
                                            if (val.startsWith('10')) {
                                                // Let them type it manually if they know what they are doing
                                            } else {
                                                val = '10.8.0.' + val.replace(/[^0-9]/g, '');
                                            }
                                        }
                                        setCreateAllowIp(val);
                                    }}
                                    placeholder="Allow IP (e.g. 10.8.0.2) *"
                                    className="w-full bg-[#050810] border border-slate-800/60 rounded-xl px-4 py-3.5 text-[14px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner"
                                />
                            </div>
                            */}

                        </div>

                        {/* Submit Button */}
                        <div className="w-full mt-8">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isFormValid}
                                className="w-full flex items-center justify-center py-4 bg-gradient-to-b from-[#1442a8] to-[#041133] hover:from-[#1b50c4] hover:to-[#081e55] border border-blue-500/20 text-white font-medium text-[15px] rounded-xl transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (modalMode === 'edit' ? 'Update' : 'Create')}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
