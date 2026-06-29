"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    ChevronLeft, BookOpen, Terminal, Shield, Video, 
    Database, Server, Lock, Search, PlayCircle, Users, Activity,
    Code2, Globe, Cpu, Zap
} from 'lucide-react';
import LandingHeader from '../../components/LandingHeader';

// --- Animated Real-Time Typing Component ---
const RealtimeCollaborationPreview = () => {
    const [dev1Text, setDev1Text] = useState('');
    const [dev2Text, setDev2Text] = useState('');

    const code1 = "import { verifyToken } from './auth';\nimport { createSecureContainer } from './docker';\n\nconst initSecureSession = async (req, res) => {\n  // Verifying admin credentials...\n  const isValid = verifyToken(req.headers.authorization);\n  if (!isValid) return res.status(401).json({ error: 'Unauthorized' });\n\n  // Spin up isolated environment\n  const container = await createSecureContainer(req.user.id);\n  res.json({ containerId: container.id, status: 'Active' });\n};\n";
    const code2 = "\n// Live terminal socket established.\n// Handshake verified with military-grade encryption.\n// Booting container...\n// ✓ Filesystem mounted.\n// ✓ Network isolated.\n// → Waiting for commands.\n";

    useEffect(() => {
        let i1 = 0;
        let i2 = 0;
        const interval = setInterval(() => {
            if (i1 < code1.length) {
                setDev1Text(code1.slice(0, i1 + 1));
                i1++;
            }
            if (i1 > 30 && i2 < code2.length) {
                setDev2Text(code2.slice(0, i2 + 1));
                i2++;
            }
            if (i1 >= code1.length && i2 >= code2.length) {
                // Loop the animation
                setTimeout(() => { i1 = 0; i2 = 0; }, 4000);
            }
        }, 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full bg-[#050810] rounded-xl border border-slate-700/50 flex flex-col overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.1)] relative group mt-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />
            
            {/* Fake Window Header */}
            <div className="h-10 bg-[#0a0f1c]/80 backdrop-blur-md border-b border-slate-800 flex items-center px-4 space-x-2 shrink-0 z-10">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <span className="text-slate-500 text-[11px] ml-4 font-mono flex items-center"><Shield className="w-3 h-3 mr-1" /> secure-session.ts</span>
            </div>
            
            <div className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-[11px] sm:text-xs min-h-[250px] relative z-10">
                {/* Dev 1 (Code Editor) */}
                <div className="flex flex-col relative">
                    <div className="absolute top-0 right-0 bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-md text-[10px] flex items-center space-x-1.5 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                        <span className="font-sans font-medium">Developer 1 (Editor)</span>
                    </div>
                    <pre className="text-blue-300 mt-8 whitespace-pre-wrap leading-relaxed">
                        <span className="text-pink-400">import</span> {'{'} verifyToken {'}'} <span className="text-pink-400">from</span> <span className="text-emerald-300">'./auth'</span>;
                        {'\n'}
                        {dev1Text.substring(37)}
                        <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                    </pre>
                </div>
                
                {/* Dev 2 (Terminal) */}
                <div className="flex flex-col relative sm:border-l sm:border-slate-800/50 sm:pl-6 pt-6 sm:pt-0 border-t border-slate-800/50 sm:border-t-0 mt-6 sm:mt-0">
                    <div className="absolute top-0 right-0 bg-purple-500/20 border border-purple-500/30 text-purple-400 px-2.5 py-1 rounded-md text-[10px] flex items-center space-x-1.5 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>
                        <span className="font-sans font-medium">Developer 2 (Terminal)</span>
                    </div>
                    <pre className="text-purple-300/80 mt-8 whitespace-pre-wrap leading-relaxed">
                        {dev2Text}
                        {dev1Text.length > 30 && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>}
                    </pre>
                </div>
            </div>
            <div className="absolute inset-0 border border-blue-500/0 group-hover:border-blue-500/30 rounded-xl transition-colors pointer-events-none duration-700"></div>
        </div>
    );
};

const docsSections = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: <BookOpen className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />,
        content: (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] font-medium mb-2">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    <span>Welcome to Secure Code</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Introduction to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Secure Code Server</span></h2>
                <p className="text-slate-400 leading-relaxed text-lg">
                    Secure Code Server is a cutting-edge platform designed to provide highly secure, containerized, and fully trackable development environments directly within your web browser. 
                    It bridges the gap between local development speed and enterprise-grade security.
                </p>
                <div className="bg-gradient-to-br from-blue-900/20 to-[#0a0f1c] border border-blue-500/20 rounded-2xl p-6 mt-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Cpu className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="text-xl text-white font-bold">Core Philosophy</h3>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                            No code should ever touch an unmanaged device. By running the IDE, file system, and terminal inside isolated containers, we eliminate the risk of source code leaks while offering real-time monitoring and instant provisioning.
                        </p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'architecture',
        title: 'Architecture & Security',
        icon: <Shield className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />,
        content: (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[12px] font-medium mb-2">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Impenetrable Design</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Bank-Grade <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Security Architecture</span></h2>
                <p className="text-slate-400 leading-relaxed text-lg">
                    Every project runs in its own tightly controlled Docker container. The backend orchestrates these environments, ensuring complete isolation and protection from lateral movement.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-gradient-to-br from-[#0a0f1c] to-[#050810] border border-slate-800 hover:border-emerald-500/40 transition-colors duration-500 rounded-2xl p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Lock className="w-16 h-16 text-emerald-400" /></div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 relative z-10">
                            <Lock className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h4 className="text-lg text-white font-bold mb-2 relative z-10">Network Isolation</h4>
                        <p className="text-slate-500 text-sm leading-relaxed relative z-10">Containers cannot communicate with each other. All external traffic is routed through our strict internal proxy firewall.</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#0a0f1c] to-[#050810] border border-slate-800 hover:border-pink-500/40 transition-colors duration-500 rounded-2xl p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Server className="w-16 h-16 text-pink-400" /></div>
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4 relative z-10">
                            <Server className="w-6 h-6 text-pink-400" />
                        </div>
                        <h4 className="text-lg text-white font-bold mb-2 relative z-10">Ephemeral Storage</h4>
                        <p className="text-slate-500 text-sm leading-relaxed relative z-10">Environments self-destruct after sessions end. When the container stops, it leaves absolutely zero trace on the host disk.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'monitoring',
        title: 'Session & Audit Monitoring',
        icon: <Video className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />,
        content: (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] font-medium mb-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Always Watching</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Total <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Visibility</span></h2>
                <p className="text-slate-400 leading-relaxed text-lg mb-8">
                    Administrators have an unprecedented level of insight into exactly what is happening across all active development environments, mitigating insider threats.
                </p>
                
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 rounded-2xl bg-gradient-to-r from-slate-800/20 to-transparent border border-slate-800/50 hover:border-emerald-500/30 transition-all duration-300 group">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                            <PlayCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-xl text-white font-bold">Visual Session Replays (RRWeb)</h4>
                            <p className="text-slate-400 mt-2 leading-relaxed">Every click, scroll, and keystroke inside the browser IDE is recorded as DOM events. Admins can seamlessly replay any developer's session exactly as it happened like a high-definition video playback.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 rounded-2xl bg-gradient-to-r from-slate-800/20 to-transparent border border-slate-800/50 hover:border-amber-500/30 transition-all duration-300 group">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                            <Activity className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-xl text-white font-bold">Real-Time Audit Logs</h4>
                            <p className="text-slate-400 mt-2 leading-relaxed">System events, logins, deployments, file transfers, and security threats are logged instantaneously. Filter through massive datasets instantly by date or action type.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'collaboration',
        title: 'Real-Time Collaboration',
        icon: <Users className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />,
        content: (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-medium mb-2">
                    <Code2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Multiplayer Coding</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Pair Programming, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Reimagined.</span></h2>
                <p className="text-slate-400 leading-relaxed text-lg">
                    Multiple developers can connect to the exact same isolated project container. Write code, run terminal commands, and view port previews concurrently in true real-time.
                </p>
                
                {/* Beautiful Typing Effect Animation */}
                <RealtimeCollaborationPreview />

            </div>
        )
    }
];

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState(docsSections[0].id);

    return (
        <div className="min-h-screen bg-[#050810] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[10000ms]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[12000ms]" />
            </div>

            <LandingHeader />

            <div className="max-w-[1500px] mx-auto px-6 lg:px-12 pt-28 pb-24 relative z-10 flex flex-col lg:flex-row gap-12">
                
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-80 shrink-0 animate-in fade-in slide-in-from-left-8 duration-700">
                    <Link href="/" className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800/30 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-white transition-all mb-10 group shadow-sm">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-semibold">Back to Home</span>
                    </Link>

                    <div className="bg-[#0a0f1c]/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sticky top-28 shadow-2xl">
                        <div className="mb-6 px-3 flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-blue-400" />
                            </div>
                            <h3 className="text-sm font-bold text-white tracking-wide">Documentation</h3>
                        </div>
                        <nav className="space-y-2">
                            {docsSections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl text-left text-sm transition-all group overflow-hidden relative ${
                                        activeSection === section.id 
                                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-white font-bold border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                                    }`}
                                >
                                    {activeSection === section.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                    )}
                                    <div className={`transition-transform duration-500 ${activeSection === section.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {section.icon}
                                    </div>
                                    <span className="relative z-10">{section.title}</span>
                                </button>
                            ))}
                        </nav>


                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 max-w-5xl min-h-[70vh]">
                    <div className="bg-gradient-to-b from-[#0a0f1c]/80 to-[#050810]/80 backdrop-blur-xl border border-slate-800/80 rounded-[2rem] p-8 sm:p-12 lg:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
                        
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />

                        {docsSections.map((section) => (
                            activeSection === section.id && (
                                <div 
                                    key={section.id} 
                                    className="relative z-10"
                                >
                                    {section.content}
                                </div>
                            )
                        ))}

                    </div>
                    
                    {/* Navigation Footer (Circular) */}
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/50 pt-8 gap-4">
                        <button 
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-[#0a0f1c] hover:bg-[#121b2f] border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white font-medium transition-all group"
                            onClick={() => {
                                const currentIndex = docsSections.findIndex(s => s.id === activeSection);
                                if (currentIndex > 0) {
                                    setActiveSection(docsSections[currentIndex - 1].id);
                                } else {
                                    setActiveSection(docsSections[docsSections.length - 1].id); // Wrap to end
                                }
                            }}
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span>Previous Section</span>
                        </button>
                        <button 
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all group"
                            onClick={() => {
                                const currentIndex = docsSections.findIndex(s => s.id === activeSection);
                                if (currentIndex < docsSections.length - 1) {
                                    setActiveSection(docsSections[currentIndex + 1].id);
                                } else {
                                    setActiveSection(docsSections[0].id); // Wrap to start
                                }
                            }}
                        >
                            <span>Next Section</span>
                            <ChevronLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
