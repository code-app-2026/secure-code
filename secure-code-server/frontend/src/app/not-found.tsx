"use client";

import React from 'react';
import Link from 'next/link';
import { Home, ShieldAlert, Code2 } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#040814] text-slate-200 font-sans">

            {/* Background Gradient */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(15,35,90,0.8),_transparent_60%),radial-gradient(circle_at_80%_80%,_rgba(10,25,70,0.6),_transparent_40%)]" />

            {/* 404 Container */}
            <div className="relative z-10 w-full max-w-[500px] px-8 py-10 mx-4 bg-[#0a0f1c]/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col items-center">

                {/* Header Icon */}
                <div className="w-[5.5rem] h-[5.5rem] mb-6 rounded-full bg-[#050b1a]/80 flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] relative">
                    <ShieldAlert className="w-12 h-12 text-red-400" strokeWidth={1.5} />
                </div>

                {/* Big 404 */}
                <div className="relative">
                    <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        404
                    </h1>
                    <div className="absolute -inset-x-6 top-1/2 -translate-y-1/2 h-1 bg-red-500/20 blur-sm transform -rotate-6"></div>
                    <div className="absolute -inset-x-6 top-1/2 -translate-y-1/2 h-px bg-red-400/50 transform -rotate-6"></div>
                </div>

                {/* Text Details */}
                <h2 className="text-2xl font-bold text-white mt-4 mb-2 tracking-wide text-center">Page Not Found</h2>
                <p className="text-[15px] text-slate-400 text-center leading-relaxed mb-10 max-w-[340px]">
                    The resource or route you are looking for does not exist, has been moved, or you don't have access.
                </p>

                {/* Buttons */}
                <div className="w-full flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                        onClick={() => window.history.back()}
                        className="flex-1 py-3.5 bg-transparent border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2"
                    >
                        <span>Go Back</span>
                    </button>
                    <Link
                        href="/"
                        className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                    >
                        <Home className="w-4 h-4" />
                        <span>Home</span>
                    </Link>
                </div>
            </div>

            {/* Footer Branding */}
            <div className="absolute bottom-8 flex flex-col items-center opacity-40">
                <div className="flex items-center space-x-1.5 mb-1 text-slate-400">
                    <span className="text-xs font-mono">&lt;</span>
                    <Code2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">&gt;</span>
                </div>
                <span className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold">SecureCode Platform</span>
            </div>

        </div>
    );
}
