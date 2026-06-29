"use client";

import React, { useState, useEffect } from 'react';
import { User, Key, ArrowRight, Shield, Lock, Eye, EyeOff, CheckCircle2, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminRecovery() {
    const [username, setUsername] = useState('');
    const [backupCode, setBackupCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Set Password Modal State
    const [showSetPassword, setShowSetPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const router = useRouter();

    const passwordCriteria = {
        length: newPassword.length >= 8,
        lower: /[a-z]/.test(newPassword),
        upper: /[A-Z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        special: /[^a-zA-Z0-9]/.test(newPassword)
    };

    const isPasswordValid = passwordCriteria.length && passwordCriteria.lower && passwordCriteria.upper && passwordCriteria.number && passwordCriteria.special;


    // Auto-clear error message after 5 seconds
    useEffect(() => {
        if (errorMsg) {
            const timer = setTimeout(() => setErrorMsg(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMsg]);

    const handleBackupCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Strip everything except A-Z and 0-9
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        // Limit to 16 pure characters
        if (value.length > 16) {
            value = value.slice(0, 16);
        }
        // Group by 4 and join with hyphen
        const formatted = value.match(/.{1,4}/g)?.join('-') || value;
        setBackupCode(formatted);
    };

    const handleNext = async () => {
        setErrorMsg('');
        if (!username || !backupCode) {
            setErrorMsg('Please enter both username and backup code');
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post('/auth/verify-backup-code', { username, backupCode });
            if (res && res.resetToken) {
                sessionStorage.setItem('resetToken', res.data?.resetToken || res.resetToken);
                setShowSetPassword(true);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Invalid username or backup code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePassword = async () => {
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
            sessionStorage.removeItem('resetToken');
            setShowSetPassword(false);
            setShowSuccessModal(true);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccessOk = () => {
        setShowSuccessModal(false);
        setUsername('');
        setBackupCode('');
        setNewPassword('');
        setConfirmPassword('');
        router.push('/admin/login');
    };
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#040814] text-slate-200 font-sans">

            {/* Background Gradient (No Laptop Image) */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.8),_transparent_40%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.6),_transparent_40%)]" />

            {/* Recovery Box */}
            <div className="relative z-10 w-full max-w-[420px] px-8 py-8 mx-4 bg-[#0a0f1c]/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">

                {/* Header Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-[4.5rem] h-[4.5rem] mb-5 rounded-full bg-[#050b1a]/80 flex items-center justify-center border border-blue-500/50 shadow-[0_0_25px_rgba(37,99,235,0.3)] relative">
                        <Shield className="w-10 h-10 text-blue-400" strokeWidth={1.8} />
                        <Lock className="w-[1.15rem] h-[1.15rem] text-blue-400 absolute mt-[2px]" strokeWidth={2.2} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-wide">Account Recovery</h1>
                    <p className="text-[15px] text-slate-300 mt-2 text-center">Recover your account by verifying your identity.</p>
                </div>

                {/* Form Section */}
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                            {errorMsg}
                        </div>
                    )}

                    {/* Username Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="w-full pl-12 pr-4 py-3.5 bg-[#0d1326]/60 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Backup Code Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Backup Code</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Key className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={backupCode}
                                onChange={handleBackupCodeChange}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                maxLength={19}
                                className="w-full pl-12 pr-4 py-3.5 bg-[#0d1326]/60 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner tracking-widest font-mono"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="w-full block mt-4">
                        <button
                            type="submit"
                            disabled={isLoading || !username || backupCode.length !== 19}
                            className={`w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl font-medium shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all flex items-center justify-center space-x-2 active:scale-[0.98] ${isLoading || !username || backupCode.length !== 19 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span>{isLoading ? 'Verifying...' : 'Next'}</span>
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </div>
                </form>

                {/* Divider & Back to Login */}
                <div className="mt-8 flex flex-col items-center">
                    <div className="flex items-center w-full mb-6 opacity-40">
                        <div className="flex-1 border-t border-slate-600"></div>
                        <span className="px-3 text-[11px] text-slate-300 uppercase tracking-widest font-semibold">OR</span>
                        <div className="flex-1 border-t border-slate-600"></div>
                    </div>

                    <p className="text-sm text-slate-400">
                        Remember your password? <Link href="/admin/login" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">Login</Link>
                    </p>
                </div>

            </div>

            {/* SET PASSWORD OVERLAY */}
            {showSetPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050b1a]/60 backdrop-blur-md transition-all">
                    <div className="relative z-10 w-full max-w-[420px] px-8 py-10 mx-4 bg-[#0a0f1c]/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-[4.5rem] h-[4.5rem] mb-6 rounded-full bg-[#050b1a]/80 flex items-center justify-center border border-blue-500/50 shadow-[0_0_25px_rgba(37,99,235,0.25)] relative">
                                <Lock className="w-8 h-8 text-blue-500" strokeWidth={2} />
                            </div>
                            <h1 className="text-3xl font-bold text-white tracking-wide mb-3">Set New Password</h1>
                            <p className="text-[15px] text-slate-400 text-center leading-relaxed max-w-[280px]">
                                Your new password must be different from previous used passwords.
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSavePassword(); }}>
                            {/* Error Message inside modal */}
                            {errorMsg && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                                    {errorMsg}
                                </div>
                            )}

                            {/* New Password */}
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

                            {/* Confirm Password */}
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

                            <div className="w-full flex space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowSetPassword(false)}
                                    className="flex-1 py-4 bg-transparent border border-slate-600 hover:bg-slate-800 text-white rounded-xl font-medium transition-all flex items-center justify-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !isPasswordValid || newPassword !== confirmPassword}
                                    className={`flex-1 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all flex items-center justify-center active:scale-[0.98] ${isLoading || !isPasswordValid || newPassword !== confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span>{isLoading ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SUCCESS MODAL OVERLAY */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050b1a]/80 backdrop-blur-md transition-all duration-300">
                    <div className="bg-[#0a0f1c] border border-emerald-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.15)] flex flex-col items-center max-w-sm w-full mx-4 transform scale-100 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
                        <p className="text-slate-400 text-center mb-6">
                            The password has been changed successfully.
                        </p>
                        <button
                            onClick={handleSuccessOk}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
