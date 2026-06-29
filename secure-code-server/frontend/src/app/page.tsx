"use client";

import React from 'react';
import Link from 'next/link';
import { Terminal, Shield, Server, ChevronRight, Code2, Globe } from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import SystemAnnouncement from '../components/SystemAnnouncement';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#050810] text-slate-200 font-sans selection:bg-blue-500/30">

            {/* Background Decorative Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <SystemAnnouncement />
            <LandingHeader />

            {/* Main Content */}
            <main className="relative z-10">

                {/* Hero Section */}
                <section className="pt-8 pb-10 px-6 lg:px-12 max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-12 min-h-[70vh]">

                    {/* Hero Text */}
                    <div className="flex-1 flex flex-col items-start animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100 fill-mode-both w-full">
                        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] sm:text-[13px] font-medium mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span>Secure Code Server v2.0 is live</span>
                        </div>

                        <h1 className="text-[40px] sm:text-[52px] lg:text-[68px] font-extrabold text-white leading-[1.1] tracking-tight mb-5">
                            The Ultimate <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
                                Browser Code
                            </span> <br className="hidden sm:block" />
                            Server Environment.
                        </h1>

                        <p className="text-[15px] sm:text-[17px] text-slate-400 leading-relaxed mb-8 max-w-xl">
                            Instantly provision bank-grade secure development environments directly in your browser. Complete with terminal access, file system virtualization, and real-time collaboration.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto mt-2">
                            <Link
                                href="/admin/login"
                                className="flex items-center justify-center space-x-2 w-full sm:w-auto whitespace-nowrap px-8 py-4 bg-gradient-to-b from-[#1442a8] to-[#041133] hover:from-[#1b50c4] hover:to-[#081e55] border border-blue-500/20 text-white font-semibold rounded-xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] active:scale-[0.98] group"
                            >
                                <span>Get Started as Admin</span>
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="/docs" className="flex items-center justify-center w-full sm:w-auto whitespace-nowrap px-8 py-4 bg-[#0f172a] hover:bg-[#1e293b] border border-slate-700 text-slate-300 font-semibold rounded-xl transition-all shadow-inner">
                                View Documentation
                            </Link>
                        </div>
                    </div>

                    {/* Hero Image */}
                    <div className="flex-1 w-full relative animate-in fade-in zoom-in-95 duration-1000 delay-300 fill-mode-both">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-3xl rounded-full" />
                        <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-[1.02] transition-transform duration-500 group">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-transparent opacity-60 z-10" />

                            {/* Fake Window Controls */}
                            <div className="absolute top-0 left-0 right-0 h-8 bg-[#0a0f1c]/90 backdrop-blur-md border-b border-slate-700/50 z-20 flex items-center px-4 space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                            </div>

                            {/* Assuming landingImage.png is a standard aspect ratio, we'll render it here */}
                            <img
                                src="/landingImage.png"
                                alt="Secure Code Server Interface"
                                className="w-full h-auto object-cover pt-6 bg-[#050810]"
                                onError={(e) => {
                                    // Fallback if image not found in public folder
                                    e.currentTarget.src = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop";
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* Info / Features Section */}
                <section className="py-24 px-6 lg:px-12 bg-[#080d18] border-y border-slate-800/50 relative overflow-hidden">
                    <div className="max-w-[1400px] mx-auto relative z-10">

                        <div className="text-center mb-12 sm:mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
                            <h2 className="text-[28px] sm:text-[36px] font-bold text-white mb-4">Why Browser Secure Code Server?</h2>
                            <p className="text-[15px] sm:text-[16px] text-slate-400 max-w-2xl mx-auto px-4">
                                Built from the ground up for teams that require absolute security without sacrificing the speed and flexibility of modern web-based IDEs.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                            {/* Feature 1 */}
                            <div className="p-8 rounded-2xl bg-[#0a0f1c] border border-slate-800 hover:border-blue-500/50 transition-colors group animate-in fade-in slide-in-from-bottom-10 duration-700 delay-[600ms] fill-mode-both">
                                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Terminal className="w-7 h-7 text-blue-400" />
                                </div>
                                <h3 className="text-[20px] font-bold text-white mb-3">Live Terminal</h3>
                                <p className="text-[14px] text-slate-400 leading-relaxed">
                                    Full shell access directly in your browser. Execute commands, run scripts, and manage your isolated container seamlessly.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="p-8 rounded-2xl bg-[#0a0f1c] border border-slate-800 hover:border-purple-500/50 transition-colors group animate-in fade-in slide-in-from-bottom-10 duration-700 delay-[700ms] fill-mode-both">
                                <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Shield className="w-7 h-7 text-purple-400" />
                                </div>
                                <h3 className="text-[20px] font-bold text-white mb-3">Enterprise Security</h3>
                                <p className="text-[14px] text-slate-400 leading-relaxed">
                                    Military-grade encryption, strict IP whitelisting, and role-based access control (RBAC) keep your code completely locked down.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="p-8 rounded-2xl bg-[#0a0f1c] border border-slate-800 hover:border-emerald-500/50 transition-colors group animate-in fade-in slide-in-from-bottom-10 duration-700 delay-[800ms] fill-mode-both">
                                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Globe className="w-7 h-7 text-emerald-400" />
                                </div>
                                <h3 className="text-[20px] font-bold text-white mb-3">Anywhere Access</h3>
                                <p className="text-[14px] text-slate-400 leading-relaxed">
                                    Code from any device, anywhere in the world. Your entire development environment is hosted securely in the cloud.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="p-8 rounded-2xl bg-[#0a0f1c] border border-slate-800 hover:border-pink-500/50 transition-colors group animate-in fade-in slide-in-from-bottom-10 duration-700 delay-[900ms] fill-mode-both">
                                <div className="w-14 h-14 rounded-xl bg-pink-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Server className="w-7 h-7 text-pink-400" />
                                </div>
                                <h3 className="text-[20px] font-bold text-white mb-3">Instant Provisioning</h3>
                                <p className="text-[14px] text-slate-400 leading-relaxed">
                                    Spin up new projects, clone GitHub repositories, and assign team members in mere seconds without any DevOps overhead.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-[#050810] py-8 border-t border-slate-800">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Code2 className="w-5 h-5 text-slate-500" />
                        <span className="text-[14px] text-slate-500 font-medium">© 2026 SecureCode Platform. All rights reserved.</span>
                    </div>
                    <div className="flex space-x-6">
                        <a href="#" className="text-[14px] text-slate-500 hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="text-[14px] text-slate-500 hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="text-[14px] text-slate-500 hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>

        </div>
    );
}
