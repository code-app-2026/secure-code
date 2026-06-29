"use client";

import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Code2, Globe } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LandingHeader from '@/components/LandingHeader';
import { api } from '@/lib/api';

export default function DeveloperLogin() {
    const router = useRouter();

    // Interactive States
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [popupInfo, setPopupInfo] = useState<{ type: 'suspended' | 'blocked' | 'ip_blocked' | 'maintenance', message: string } | null>(null);
    const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number | null>(null);

    React.useEffect(() => {
        let timer: NodeJS.Timeout;
        if (lockoutTimeLeft !== null && lockoutTimeLeft > 0) {
            timer = setInterval(() => {
                setLockoutTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [lockoutTimeLeft]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setErrorMsg('Please enter both username and password.');
            return;
        }

        setErrorMsg('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { username, password });
            
            if (response.role?.trim().toLowerCase() !== 'developer' && response.role?.trim().toLowerCase() !== 'admin') {
                setIsLoading(false);
                setErrorMsg('Access denied: You must be a developer to log in here.');
                setTimeout(() => setErrorMsg(''), 5000);
                return;
            }

            document.cookie = `developer_accessToken=${response.access_token}; path=/; max-age=86400`;
            document.cookie = `developer_userRole=${response.role}; path=/; max-age=86400`;
            sessionStorage.setItem('developer_accessToken', response.access_token);
            sessionStorage.setItem('developer_userRole', response.role);

            // Wait 2.5 seconds to show off the beautiful alternating brackets animation
            setTimeout(() => {
                window.location.href = '/developer/dashboard';
            }, 2500);
        } catch (err: any) {
            setIsLoading(false);
            const msg = err.message || '';
            
            if (err.lockoutUntil) {
                const diff = new Date(err.lockoutUntil).getTime() - Date.now();
                if (diff > 0) setLockoutTimeLeft(Math.ceil(diff / 1000));
            } else if (msg.includes('suspended')) {
                setPopupInfo({ type: 'suspended', message: msg });
            } else if (msg.includes('blocked')) {
                setPopupInfo({ type: 'blocked', message: msg });
            } else if (msg.toLowerCase().includes('ip address')) {
                setPopupInfo({ type: 'ip_blocked', message: msg });
            } else if (msg.toLowerCase().includes('maintenance')) {
                setPopupInfo({ type: 'maintenance', message: msg });
            } else {
                setErrorMsg(msg || 'Invalid credentials.');
            }
        }
    };

    return (
        <div className="relative h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-slate-200 font-sans">

            <LandingHeader />

            {/* Lockout Timer Overlay */}
            {lockoutTimeLeft !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#050810]/95 backdrop-blur-xl p-4 transition-all duration-300">
                    <div className="relative w-full max-w-md bg-[#0a0f1c] border border-blue-500/30 rounded-3xl shadow-[0_0_80px_rgba(59,130,246,0.15)] overflow-hidden">
                        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse"></div>
                        <div className="p-10 flex flex-col items-center text-center relative">
                            {/* Decorative Background Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-blue-500/20 bg-[#0d1526] relative z-10">
                                <Lock className="w-10 h-10 text-blue-500" />
                            </div>

                            <h2 className="text-[26px] font-bold text-white mb-2 tracking-wide relative z-10">
                                {lockoutTimeLeft > 0 ? 'Account Locked' : 'Time Out Completed'}
                            </h2>

                            <p className="text-slate-400 text-[15px] leading-relaxed mb-8 relative z-10">
                                {lockoutTimeLeft > 0 
                                    ? 'Too many failed login attempts. Please wait before trying again to protect your account.'
                                    : 'You may now attempt to login again.'}
                            </p>

                            {/* Timer Display */}
                            {lockoutTimeLeft > 0 && (
                                <div className="mb-10 w-full bg-[#050810]/50 border border-slate-800/80 rounded-2xl p-6 relative z-10 shadow-inner">
                                    <div className="text-[48px] font-mono font-light text-blue-400 tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                        {String(Math.floor(lockoutTimeLeft / 60)).padStart(2, '0')}:
                                        {String(lockoutTimeLeft % 60).padStart(2, '0')}
                                    </div>
                                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mt-2 font-semibold">
                                        Remaining Time
                                    </div>
                                </div>
                            )}

                            {lockoutTimeLeft === 0 && (
                                <button
                                    onClick={() => setLockoutTimeLeft(null)}
                                    className="w-full py-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_4px_20px_rgba(59,130,246,0.3)] active:scale-[0.98] relative z-10"
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Suspension / Blocked Popup Overlay */}
            {popupInfo && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#050810]/90 backdrop-blur-md p-4 transition-all duration-300">
                    <div className="relative w-full max-w-md bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                        {/* Top Bar */}
                        <div className={`h-1.5 w-full ${popupInfo.type === 'suspended' ? 'bg-amber-500' : popupInfo.type === 'ip_blocked' ? 'bg-blue-500' : popupInfo.type === 'maintenance' ? 'bg-orange-500' : 'bg-red-500'}`}></div>

                        <div className="p-8 flex flex-col items-center text-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-[#0a0f1c] ${popupInfo.type === 'suspended' ? 'bg-amber-500/10 text-amber-500 shadow-amber-500/20' : popupInfo.type === 'ip_blocked' ? 'bg-blue-500/10 text-blue-500 shadow-blue-500/20' : popupInfo.type === 'maintenance' ? 'bg-orange-500/10 text-orange-500 shadow-orange-500/20' : 'bg-red-500/10 text-red-500 shadow-red-500/20'}`}>
                                {popupInfo.type === 'suspended' ? <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> : popupInfo.type === 'ip_blocked' ? <Globe className="w-10 h-10" /> : popupInfo.type === 'maintenance' ? <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> : <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>}
                            </div>

                            <h2 className="text-[22px] font-bold text-white mb-2 tracking-wide">
                                {popupInfo.type === 'suspended' ? 'Account Suspended' : popupInfo.type === 'ip_blocked' ? 'Network Access Denied' : popupInfo.type === 'maintenance' ? 'System Maintenance' : 'Account Blocked'}
                            </h2>

                            <p className="text-slate-400 text-[15px] leading-relaxed mb-8">
                                {popupInfo.message}
                            </p>

                            <button
                                onClick={() => setPopupInfo(null)}
                                className={`w-full py-3.5 rounded-xl font-medium text-white transition-all shadow-lg active:scale-[0.98] ${popupInfo.type === 'suspended' ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.3)]' : popupInfo.type === 'ip_blocked' ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : popupInfo.type === 'maintenance' ? 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]'}`}
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CUSTOM BRACKET ANIMATION OVERLAY --- */}
            {isLoading && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050b1a]/60 backdrop-blur-md transition-all duration-500">
                    <div className="relative flex items-center justify-center w-64 h-64">
                        <div className="absolute text-[12rem] font-light text-blue-500 opacity-0 animate-[bracketFade_1s_ease-in-out_infinite] left-0 -translate-x-4">
                            &#123;
                        </div>
                        <div className="absolute text-[12rem] font-light text-blue-500 opacity-0 animate-[bracketFade_1s_ease-in-out_infinite_0.5s] right-0 translate-x-4">
                            &#125;
                        </div>
                    </div>
                </div>
            )}

            {/* Background Image Container */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/bg.png"
                    alt="Secure Code Background"
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                {/* Subtle dark overlay to ensure text readability */}
                <div className="absolute inset-0 bg-slate-950/40 mix-blend-multiply" />
            </div>

            {/* Login Box */}
            <div className="relative z-10 w-full max-w-[420px] px-8 py-8 mx-4 mt-16 bg-[#0a0f1c]/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">

                {/* Header Section */}
                <div className="flex flex-col items-center mb-4">
                    <div className="mb-2 flex items-center justify-center w-[3.5rem] h-[4.5rem]">
                        <span className="text-blue-500 text-[64px] font-bold tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]">&lt;/&gt;</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-wide">Developer Login</h1>
                    <p className="text-[14px] text-slate-300 mt-1">Access your developer dashboard</p>
                    <div className="h-[2px] w-12 bg-gradient-to-r from-blue-400 to-indigo-600 mt-3 rounded-full drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                </div>

                {/* Error Message */}
                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                        {errorMsg}
                    </div>
                )}

                {/* Form Section */}
                <form className="space-y-5" onSubmit={handleLogin}>

                    {/* Username Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="w-full pl-12 pr-4 py-2.5 bg-[#0d1326]/60 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner text-sm"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full pl-12 pr-12 py-2.5 bg-[#0d1326]/60 border border-slate-700/60 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-2.5 mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl text-sm font-medium shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all flex items-center justify-center space-x-2 active:scale-[0.98] ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        <span>{isLoading ? 'Authenticating...' : 'Login'}</span>
                        {!isLoading && <ArrowRight className="w-5 h-5" />}
                    </button>
                </form>

                {/* Footer Badge */}
                <div className="mt-8 flex items-center justify-center space-x-2 opacity-50">
                    <Code2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-400 tracking-wide uppercase font-semibold">Secure Developer Authentication</span>
                </div>

            </div>

            {/* Custom Keyframes for Brackets */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes bracketFade {
          0%, 100% {
            opacity: 0.1;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
            text-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4);
          }
        }
      `}} />
        </div>
    );
}
