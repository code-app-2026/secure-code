"use client";

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, X, User, Check } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import { api } from '../../../lib/api';

export default function AccountSettings() {
    const [oldPassword, setOldPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [modalErrorMsg, setModalErrorMsg] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const passwordCriteria = {
        length: newPassword.length >= 8,
        lower: /[a-z]/.test(newPassword),
        upper: /[A-Z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[^a-zA-Z0-9]/.test(newPassword)
    };

    const isPasswordValid = passwordCriteria.length && passwordCriteria.lower && passwordCriteria.upper && passwordCriteria.number && passwordCriteria.special;


    const handleVerify = async () => {
        if (!oldPassword) return;
        setIsVerifying(true);
        setErrorMsg('');
        try {
            await api.post('/users/verify-password', { password: oldPassword });
            setShowUpdateModal(true);
            setIsVerifying(false);
        } catch (err: any) {
            setErrorMsg(err.message || 'Incorrect old password');
            setTimeout(() => setErrorMsg(''), 5000);
            setIsVerifying(false);
        }
    };

    const handleSave = async () => {
        setModalErrorMsg('');
        if (!newPassword || !confirmPassword) {
            setModalErrorMsg('Please enter and confirm your new password');
            setTimeout(() => setModalErrorMsg(''), 5000);
            return;
        }
        if (newPassword === oldPassword) {
            setModalErrorMsg('New password cannot be same as old password');
            setTimeout(() => setModalErrorMsg(''), 5000);
            return;
        }
        if (newPassword !== confirmPassword) {
            setModalErrorMsg('Passwords do not match');
            setTimeout(() => setModalErrorMsg(''), 5000);
            return;
        }

        setIsSaving(true);
        try {
            await api.patch('/users/profile', {
                oldPassword,
                newPassword
            });
            setShowSuccessModal(true);
            setIsSaving(false);
        } catch (err: any) {
            setModalErrorMsg(err.message || 'Failed to update password');
            setTimeout(() => setModalErrorMsg(''), 5000);
            setIsSaving(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#020617] text-slate-200 font-sans">

            {/* Background Glowing Orbs */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[20%] left-[-10%] w-[50%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <AdminHeader />

            {/* Main Content Centered */}
            <div className="flex-1 flex items-center justify-center w-full px-4 relative z-10">
                <div className="w-full max-w-[480px] p-8 bg-[#050914]/80 backdrop-blur-xl border border-slate-800/60 rounded-[1.5rem] shadow-2xl flex flex-col items-center">

                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-4 w-full">
                        {/* Circular Lock Icon */}
                        <div className="w-[4.5rem] h-[4.5rem] mb-6 rounded-full bg-[#0d1526] flex items-center justify-center border border-slate-700/20 shadow-inner">
                            <Lock className="w-6 h-6 text-blue-500" strokeWidth={2} />
                        </div>

                        <h1 className="text-[28px] font-bold text-white mb-2 tracking-wide">Account Settings</h1>
                        <p className="text-[14px] text-slate-400">Secure your account with a strong password.</p>

                        {/* Glowing Separator Line */}
                        <div className="w-full mt-6 relative flex justify-center h-4 overflow-hidden mb-2">
                            <div className="absolute top-0 w-[120%] h-[100px] border-t border-blue-500/20 rounded-[100%] shadow-[0_-5px_15px_rgba(37,99,235,0.15)] blur-[0.5px]" />
                            <div className="absolute top-[-1px] w-1/5 h-[2px] bg-blue-400/80 blur-[2px]" />
                            <div className="absolute top-[-1px] w-[10%] h-[1px] bg-blue-300" />
                        </div>
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="w-full mt-2 mb-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center animate-in fade-in zoom-in-95">
                            {errorMsg}
                        </div>
                    )}

                    {/* Form Section */}
                    <div className="w-full mt-4 space-y-6">

                        {/* Old Password Input Box */}
                        <div className="bg-[#0f172a]/40 border border-slate-800/80 rounded-xl p-5">
                            <label className="text-[13px] font-medium text-slate-200 block mb-4">Old password</label>
                            <div className="flex items-center space-x-4">
                                {/* Left Lock Icon */}
                                <Lock className="w-5 h-5 text-slate-400" />

                                {/* Center Input Box */}
                                <div className="flex-1">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={oldPassword}
                                        onChange={(e) => {
                                            setOldPassword(e.target.value);
                                            if (errorMsg) setErrorMsg(''); // Clear error when typing
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && oldPassword && !isVerifying) {
                                                handleVerify();
                                            }
                                        }}
                                        placeholder="Enter your old password"
                                        className="w-full bg-[#0a0f1c] border border-slate-800/80 rounded-lg py-2.5 px-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                                    />
                                </div>

                                {/* Right Eye Icon */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-400 hover:text-slate-300 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Next Button */}
                        <div className="pt-2">
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying || !oldPassword}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-xl transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center justify-center"
                            >
                                {isVerifying ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                ) : (
                                    "Next"
                                )}
                            </button>
                        </div>

                    </div>
                </div>

                {/* Account Settings Update Modal */}
                {showUpdateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
                        <div className="w-full max-w-[480px] p-10 mx-4 bg-[#0a0f1c]/95 border border-slate-800/80 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col items-center">

                            {/* Close Button */}
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Circular Lock Icon */}
                            <div className="w-[4.5rem] h-[4.5rem] mt-2 mb-6 rounded-full bg-[#0b1224] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.1)] border border-slate-700/20">
                                <Lock className="w-6 h-6 text-blue-500" strokeWidth={2.5} />
                            </div>

                            <h2 className="text-[22px] font-bold text-white mb-8 tracking-wide">Account Settings Update</h2>

                            {/* Modal Error Message */}
                            {modalErrorMsg && (
                                <div className="w-full mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center animate-in fade-in zoom-in-95">
                                    {modalErrorMsg}
                                </div>
                            )}

                            <div className="w-full space-y-5">

                                {/* New Password */}
                                <div className="bg-[#050810] border border-slate-800/60 rounded-xl flex items-center p-1.5 shadow-inner relative">
                                    <div className="pl-4 pr-5 py-3 border-r border-slate-800/60">
                                        <Lock className="w-7 h-7 text-slate-500" fill="currentColor" />
                                    </div>
                                    <div className="flex-1 px-5 py-1 pr-12">
                                        <label className="block text-[13px] font-bold text-white mb-1">New Password</label>
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => {
                                                setNewPassword(e.target.value);
                                                if (modalErrorMsg) setModalErrorMsg('');
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !isSaving) {
                                                    handleSave();
                                                }
                                            }}
                                            placeholder="Enter new password"
                                            className="w-full bg-transparent text-[14px] text-slate-300 placeholder:text-slate-600 focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-5 text-slate-500 hover:text-slate-400 focus:outline-none"
                                    >
                                        {showNewPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                    </button>
                                </div>
                                {newPassword.length > 0 && (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-2">
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

                                {/* Confirm Password */}
                                <div className="bg-[#050810] border border-slate-800/60 rounded-xl flex items-center p-1.5 shadow-inner relative">
                                    <div className="pl-4 pr-5 py-3 border-r border-slate-800/60">
                                        <Lock className="w-7 h-7 text-slate-500" fill="currentColor" />
                                    </div>
                                    <div className="flex-1 px-5 py-1 pr-12">
                                        <label className="block text-[13px] font-bold text-white mb-1">Confirm Password</label>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                if (modalErrorMsg) setModalErrorMsg('');
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !isSaving) {
                                                    handleSave();
                                                }
                                            }}
                                            placeholder="Confirm new password"
                                            className="w-full bg-transparent text-[14px] text-slate-300 placeholder:text-slate-600 focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-5 text-slate-500 hover:text-slate-400 focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                    </button>
                                </div>

                            </div>

                            {/* Save Button */}
                            <div className="w-full mt-10 px-8">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !isPasswordValid || newPassword !== confirmPassword || newPassword === oldPassword}
                                    className="w-full py-4 flex items-center justify-center space-x-2 bg-gradient-to-b from-[#1442a8] to-[#041133] hover:from-[#1b50c4] hover:to-[#081e55] border border-blue-500/20 text-white font-medium text-lg rounded-xl transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <span>Save</span>}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* Success Popup Modal */}
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
                        <div className="w-full max-w-[400px] p-8 mx-4 bg-[#0a0f1c]/95 border border-emerald-500/50 rounded-[2rem] shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col items-center animate-in zoom-in-95">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h2 className="text-[20px] font-bold text-white mb-4 text-center tracking-wide">Success!</h2>
                            <p className="text-slate-300 text-center text-[15px] mb-8">The password has been changed successfully.</p>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setShowUpdateModal(false);
                                    setOldPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
