"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Code2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function LandingHeader() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    // Handle scroll effect for header
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Always show background on login pages so it doesn't overlap text awkwardly
    const forceBackground = pathname !== '/';

    return (
        <header
            className={`${pathname === '/' ? 'sticky' : 'fixed'} top-0 left-0 right-0 z-[100] transition-all duration-300 border-b ${isScrolled || forceBackground
                    ? 'bg-[#0a0f1c]/80 backdrop-blur-xl border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] py-4'
                    : 'bg-transparent border-transparent py-6'
                }`}
        >
            <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="flex items-center space-x-3 group cursor-pointer">
                    <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all">
                        <Code2 className="w-6 h-6 text-white absolute" />
                        <div className="absolute inset-0 bg-blue-400/20 rounded-lg animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[20px] font-bold text-white tracking-wide leading-none">
                            <span className="text-blue-500">&lt;</span>Secure<span className="text-blue-500">Code/&gt;</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-1">Server Platform</span>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center space-x-2 bg-[#0f1525]/80 backdrop-blur-md border border-slate-700/50 rounded-full p-1.5 shadow-inner">
                    <Link
                        href="/"
                        className={`px-5 py-2 rounded-full font-medium text-[14px] transition-all ${pathname === '/' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                    >
                        Home
                    </Link>
                    <Link
                        href="/admin/login"
                        className={`px-5 py-2 rounded-full font-medium text-[14px] transition-all ${pathname === '/admin/login' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                    >
                        Admin
                    </Link>
                    <Link
                        href="/developer/login"
                        className={`px-5 py-2 rounded-full font-medium text-[14px] transition-all ${pathname === '/developer/login' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                    >
                        Developer
                    </Link>
                    <Link
                        href="/viewer/login"
                        className={`px-5 py-2 rounded-full font-medium text-[14px] transition-all ${pathname === '/viewer/login' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                    >
                        Viewer
                    </Link>
                </nav>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button
                        className="text-slate-300 hover:text-white transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-[#0a0f1c]/95 backdrop-blur-xl border-b border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <nav className="flex flex-col p-4 space-y-2">
                        <Link
                            href="/"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`px-5 py-3 rounded-xl font-medium text-[15px] transition-all ${pathname === '/' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/admin/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`px-5 py-3 rounded-xl font-medium text-[15px] transition-all ${pathname === '/admin/login' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            Admin
                        </Link>
                        <Link
                            href="/developer/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`px-5 py-3 rounded-xl font-medium text-[15px] transition-all ${pathname === '/developer/login' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            Developer
                        </Link>
                        <Link
                            href="/viewer/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`px-5 py-3 rounded-xl font-medium text-[15px] transition-all ${pathname === '/viewer/login' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            Viewer
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}
