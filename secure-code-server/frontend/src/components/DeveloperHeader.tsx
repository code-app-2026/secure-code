"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Code2, User, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';

export default function DeveloperHeader() {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [username, setUsername] = useState('Developer');
    const [role, setRole] = useState('Developer');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        try {
            const sessionToken = sessionStorage.getItem('developer_accessToken');
            const match = document.cookie.match(/(?:^|; )developer_accessToken=([^;]+)/);
            const cookieToken = match ? match[1] : null;
            const token = sessionToken || cookieToken;

            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.username) {
                    // Capitalize first letter for display
                    const displayUser = payload.username.charAt(0).toUpperCase() + payload.username.slice(1);
                    setUsername(displayUser);
                }
                if (payload.role) {
                    setRole(payload.role);
                }
            }
        } catch (e) {
            console.error('Failed to parse token for username');
        }
    }, []);

    const handleLogoutConfirm = async () => {
        setIsLoggingOut(true);
        setShowLogoutConfirm(false);
        try {
            await api.post('/auth/logout', {});
        } catch (e) {
            console.error(e);
        }
        sessionStorage.removeItem('developer_userRole');
        sessionStorage.removeItem('developer_accessToken');
        document.cookie = 'developer_userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'developer_accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        setTimeout(() => {
            router.push('/developer/login');
        }, 2500); // 2.5s for bracket animation
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full h-[60px] bg-[#0a0f1c]/95 backdrop-blur-xl border-b border-slate-800/60 flex items-center justify-between px-6 lg:px-8">

                {/* Left: Logo and Name */}
                <Link href="/developer/dashboard" className="flex items-center space-x-2.5 group cursor-pointer">
                    <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-md shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all">
                        <Code2 className="w-4 h-4 text-white absolute" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-[16px] font-bold text-white tracking-wide leading-none">
                            <span className="text-blue-500">&lt;</span>Secure<span className="text-blue-500">Code/&gt;</span>
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">Server Platform</span>
                    </div>
                </Link>

                {/* Center: Navigation Links */}
                <nav className="hidden md:flex items-center space-x-8 h-full">
                    <Link href="/developer/dashboard" className={`font-medium text-[13px] h-full flex items-center relative transition-colors ${pathname === '/developer/dashboard' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
                        Projects
                        {pathname === '/developer/dashboard' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />}
                    </Link>
                    <Link href="/developer/password" className={`font-medium text-[13px] h-full flex items-center relative transition-colors ${pathname === '/developer/password' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-200'}`}>
                        Change Password
                        {pathname === '/developer/password' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />}
                    </Link>
                </nav>

                {/* Right: Profile & Mobile Menu */}
                <div className="flex items-center space-x-4 h-full">
                    {/* Profile Dropdown */}
                    <div ref={dropdownRef} className="relative h-full flex items-center">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center space-x-3 text-slate-300 hover:text-white transition-colors focus:outline-none group"
                        >
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-[13px] font-semibold text-white">Welcome, {username}</span>
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-[2px]">{role}</span>
                            </div>
                            <div className={`w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center border transition-colors ${isProfileOpen ? 'border-blue-500/50' : 'border-slate-700/60 group-hover:border-slate-600'}`}>
                                <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300" strokeWidth={2} />
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProfileOpen ? 'rotate-180 text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
                        </button>

                        {/* Dropdown Menu */}
                        <div className={`absolute right-0 top-full mt-2 w-48 bg-[#0a0f1c]/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl transition-all duration-200 transform origin-top-right ${isProfileOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                            <div className="p-2 space-y-1">
                                <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-800 mb-1">Signed in via Console</div>
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        setShowLogoutConfirm(true);
                                    }}
                                    className="flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors w-full"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed top-[60px] left-0 w-full bg-[#0a0f1c]/95 backdrop-blur-xl border-b border-slate-800/60 z-40 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                    <nav className="flex flex-col p-4 space-y-2">
                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/developer/dashboard" className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/developer/dashboard' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300 hover:bg-slate-800/50'}`}>
                            Projects
                        </Link>
                        <Link onClick={() => setIsMobileMenuOpen(false)} href="/developer/password" className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/developer/password' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300 hover:bg-slate-800/50'}`}>
                            Change Password
                        </Link>
                    </nav>
                </div>
            )}

            {/* Logout Confirmation Dialog */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050b1a]/60 backdrop-blur-md">
                    <div className="bg-[#0b1121] border border-blue-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(37,99,235,0.15)] max-w-sm w-full mx-4 transform transition-all">
                        <div className="flex justify-center mb-4">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                <LogOut className="w-6 h-6 text-red-400" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-center text-white mb-2">Sign Out</h3>
                        <p className="text-center text-slate-400 text-sm mb-8">
                            Are you sure you want to end your session and sign out of SecureCode?
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogoutConfirm}
                                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bracket Loading Animation */}
            {isLoggingOut && (
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
        </>
    );
}
