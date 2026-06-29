"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminSetPassword() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = sessionStorage.getItem('resetToken');
        if (!token) {
            router.push('/admin/recovery');
        }
    }, [router]);

    const passwordCriteria = {
        length: newPassword.length >= 8,
        lower: /[a-z]/.test(newPassword),
        upper: /[A-Z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[^a-zA-Z0-9]/.test(newPassword)
    };

    const isPasswordValid = passwordCriteria.length && passwordCriteria.lower && passwordCriteria.upper && passwordCriteria.number && passwordCriteria.special;


    const handleSave = async () => {
        setErrorMsg('');
        if (!newPassword || !confirmPassword) {
            setErrorMsg('Please fill in both password fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        const resetToken = sessionStorage.getItem('resetToken');
        if (!resetToken) {
            setErrorMsg('Session expired. Please try recovering again.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/reset-password', { resetToken, newPassword });
            setSuccessMsg('Password updated successfully! Redirecting to login...');
            sessionStorage.removeItem('resetToken');
            setTimeout(() => {
                router.push('/admin/login');
            }, 2000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#040814] text-slate-200 font-sans">

            {/* Background Gradient */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.8),_transparent_40%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.6),_transparent_40%)]" />

            {/* Set Password Box */}
            <div className="relative z-10 w-full max-w-[420px] px-8 py-10 mx-4 bg-[#0a0f1c]/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">

                {/* Header Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-[4.5rem] h-[4.5rem] mb-6 rounded-full bg-[#050b1a]/80 flex items-center justify-center border border-blue-500/50 shadow-[0_0_25px_rgba(37,99,235,0.25)] relative">
                        <Lock className="w-8 h-8 text-blue-500" strokeWidth={2} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-wide mb-3">Set New Password</h1>
                    <p className="text-[15px] text-slate-400 text-center leading-relaxed max-w-[280px]">
                        Your new password must be different from previous used passwords.
                    </p>
                </div>

                {/* Form Section */}
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>

                    {/* Messages */}
                    {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                            {errorMsg}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm text-center">
                            {successMsg}
                        </div>
                    )}

                    {/* New Password Input */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <Lock className="w-5 h-5" />
                        </div>
                        <input
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full pl-12 pr-12 py-3.5 bg-[#0d1326]/60 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                        />
                        <div
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                            onClick={() => setShowNew(!showNew)}
                        >
                            {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </div>
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

                    {/* Confirm Password Input */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                            <Lock className="w-5 h-5" />
                        </div>
                        <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full pl-12 pr-12 py-3.5 bg-[#0d1326]/60 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                        />
                        <div
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                            onClick={() => setShowConfirm(!showConfirm)}
                        >
                            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="w-full block mt-8">
                        <button
                            type="submit"
                            disabled={isLoading || !isPasswordValid || newPassword !== confirmPassword}
                            className={`w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all flex items-center justify-center active:scale-[0.98] ${isLoading || !isPasswordValid || newPassword !== confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span>{isLoading ? 'Saving...' : 'Save'}</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
