"use client";

import React, { useState } from 'react';
import ViewerHeader from '@/components/ViewerHeader';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import { api } from '@/lib/api';

export default function ViewerPasswordPage() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const passwordCriteria = {
        length: newPassword.length >= 8,
        lower: /[a-z]/.test(newPassword),
        upper: /[A-Z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[^a-zA-Z0-9]/.test(newPassword)
    };

    const isPasswordValid = passwordCriteria.length && passwordCriteria.lower && passwordCriteria.upper && passwordCriteria.number && passwordCriteria.special;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!oldPassword || !newPassword || !confirmPassword) {
            setErrorMsg('Please fill in all fields');
            setTimeout(() => setErrorMsg(''), 5000);
            return;
        }
        if (newPassword === oldPassword) {
            setErrorMsg('New password cannot be same as old password');
            setTimeout(() => setErrorMsg(''), 5000);
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            setTimeout(() => setErrorMsg(''), 5000);
            return;
        }

        setIsLoading(true);

        try {
            await api.patch('/users/profile', {
                oldPassword,
                newPassword
            });
            setShowSuccessModal(true);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update password');
            setTimeout(() => setErrorMsg(''), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050810] text-slate-200 font-sans flex flex-col">
            <ViewerHeader />

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-6 relative">

                {/* Subtle background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

                {/* Change Password Card */}
                <div className="relative z-10 w-full max-w-[440px] p-8 md:p-10 bg-[#0a0f1c]/80 backdrop-blur-xl border border-slate-800/60 rounded-3xl shadow-2xl flex flex-col items-center">

                    {/* Lock Icon Header */}
                    <div className="w-16 h-16 rounded-full bg-[#0d152a] border border-blue-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
                        <Lock className="w-7 h-7 text-blue-500" strokeWidth={1.5} />
                    </div>

                    <h2 className="text-[24px] font-bold text-white mb-2 tracking-wide text-center">Set New Password</h2>
                    <p className="text-[13.5px] text-slate-400 text-center max-w-[280px] leading-relaxed mb-8">
                        Your new password must be different from previous used passwords.
                    </p>

                    {/* Modal Error Message */}
                    {errorMsg && (
                        <div className="w-full mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center animate-in fade-in zoom-in-95">
                            {errorMsg}
                        </div>
                    )}

                    <form className="w-full space-y-4" onSubmit={handleSave}>

                        {/* Old Password */}
                        <div className="relative group bg-[#0b1220] border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div className="pl-12 pr-12 py-2.5 flex flex-col justify-center min-h-[64px]">
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5 group-focus-within:text-blue-400/80 transition-colors">Old password</label>
                                <input
                                    type={showOld ? "text" : "password"}
                                    value={oldPassword}
                                    onChange={(e) => {
                                        setOldPassword(e.target.value);
                                        if (errorMsg) setErrorMsg('');
                                    }}
                                    placeholder="Enter your old password"
                                    className="w-full bg-transparent text-[14.5px] text-white placeholder:text-slate-600 focus:outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowOld(!showOld)}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                            >
                                {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* New Password */}
                        <div className="relative group bg-[#0b1220] border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div className="pl-12 pr-12 py-2.5 flex flex-col justify-center min-h-[64px]">
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5 group-focus-within:text-blue-400/80 transition-colors">New password</label>
                                <input
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        if (errorMsg) setErrorMsg('');
                                    }}
                                    placeholder="Enter your new password"
                                    className="w-full bg-transparent text-[14.5px] text-white placeholder:text-slate-600 focus:outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                            >
                                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {newPassword.length > 0 && (
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

                        {/* Confirm Password */}
                        <div className="relative group bg-[#0b1220] border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div className="pl-12 pr-12 py-2.5 flex flex-col justify-center min-h-[64px]">
                                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5 group-focus-within:text-blue-400/80 transition-colors">Confirm password</label>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (errorMsg) setErrorMsg('');
                                    }}
                                    placeholder="Confirm your new password"
                                    className="w-full bg-transparent text-[14.5px] text-white placeholder:text-slate-600 focus:outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                            >
                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Save Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !isPasswordValid || newPassword !== confirmPassword || newPassword === oldPassword}
                            className={`w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-[15px] font-semibold shadow-[0_4px_20px_0_rgba(37,99,235,0.4)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center active:scale-[0.98] ${isLoading || !isPasswordValid || newPassword !== confirmPassword || newPassword === oldPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>

                    </form>
                </div>
            </div>

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
    );
}
