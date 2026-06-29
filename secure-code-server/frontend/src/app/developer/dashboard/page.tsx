"use client";

import React, { useState, useEffect } from 'react';
import DeveloperHeader from '../../../components/DeveloperHeader';
import { Hexagon, Eye, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import SystemAnnouncement from '../../../components/SystemAnnouncement';

export default function DeveloperDashboardPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(3);

    useEffect(() => {
        fetchAssignedProjects();
        const interval = setInterval(() => {
            fetchAssignedProjects();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchAssignedProjects = async () => {
        try {
            const res = await api.get('/projects/assigned');
            setProjects(res || []);
        } catch (e) {
            console.error(e);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const totalProjects = projects.length;
    const totalPages = Math.ceil(totalProjects / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentProjects = projects.slice(startIndex, startIndex + itemsPerPage);

    const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

    return (
        <div className="min-h-screen bg-[#050810] text-slate-200 font-sans">
            <SystemAnnouncement />
            <DeveloperHeader />

            <div className="max-w-[1400px] mx-auto p-8 mt-4">

                {/* Page Title */}
                <div className="flex items-center space-x-4 mb-8">
                    <div className="relative flex items-center justify-center w-10 h-10 text-[#7128f6]">
                        <Hexagon className="absolute w-10 h-10 stroke-[1.5px]" fill="#2a1254" />
                        <span className="relative z-10 text-[14px] font-bold text-[#8946ff]">P</span>
                    </div>
                    <h1 className="text-[26px] font-bold text-white tracking-wide">Projects</h1>
                </div>

                {/* Table Container */}
                <div className="bg-[#0b1220] border border-slate-800/60 rounded-xl shadow-2xl overflow-hidden">

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800/80 text-[14px] text-slate-300 bg-[#070b14]">
                                    <th className="px-8 py-5 font-semibold tracking-wide">Project Name</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Storage Size</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Online</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Status</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentProjects.map((project, idx) => (
                                    <tr key={idx} className="border-b border-slate-800/60 hover:bg-[#0f172a]/30 transition-colors bg-[#080d18]">

                                        {/* Project Name */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="relative flex items-center justify-center w-8 h-8 text-[#7128f6]">
                                                    <Hexagon className="absolute w-8 h-8 stroke-[1.5px]" fill="#2a1254" />
                                                    <span className="relative z-10 text-[11px] font-bold text-[#8946ff]">P</span>
                                                </div>
                                                <span className="text-[15px] font-medium text-slate-200">{project.name}</span>
                                            </div>
                                        </td>

                                        {/* Storage Size */}
                                        <td className="px-8 py-6 text-[14px] text-slate-400">{formatBytes(project.storageBytes || 0)}</td>

                                        {/* Online */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${project.onlineUsers && project.onlineUsers > 0 ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                                                <span className={`text-[14px] font-medium ${project.onlineUsers && project.onlineUsers > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                                    {project.onlineUsers || 0} User{(project.onlineUsers || 0) === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-8 py-6">
                                            {project.status === 'Running' ? (
                                                <span className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#06331e] border border-[#0d5533] text-[#10b981] text-[13px] font-medium">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                                                    <span>Running</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#3d0e0e] border border-[#6b1616] text-[#ef4444] text-[13px] font-medium">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div>
                                                    <span>Stopped</span>
                                                </span>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="px-8 py-6">
                                            <button
                                                onClick={() => {
                                                    setLoadingProjectId(project.id);
                                                    router.push(`/developer/ide?projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`);
                                                }}
                                                disabled={loadingProjectId === project.id}
                                                className="flex items-center space-x-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 text-blue-400 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loadingProjectId === project.id ? (
                                                    <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                                <span>{loadingProjectId === project.id ? 'Opening...' : 'View'}</span>
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="flex items-center justify-between p-6 bg-[#090d19] border-t border-slate-800/80">
                        <span className="text-[14px] text-slate-400">
                            Showing {totalProjects === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalProjects)} of {totalProjects} projects
                        </span>

                        <div className="flex flex-1 justify-center">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                    className="w-9 h-9 rounded-lg bg-[#141b2d] border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button className="w-9 h-9 rounded-lg bg-gradient-to-b from-[#5c3ceb] to-[#452ab5] text-white font-medium flex items-center justify-center shadow-[0_2px_10px_rgba(92,60,235,0.4)]">
                                    {currentPage}
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="w-9 h-9 rounded-lg bg-[#141b2d] border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="relative flex items-center">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="appearance-none bg-[#0b1220] border border-slate-700 text-slate-300 text-[13px] font-medium rounded-lg pl-4 pr-10 py-2 cursor-pointer hover:bg-[#141b2d] transition-colors focus:outline-none"
                            >
                                <option value={3}>3 per page</option>
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={15}>15 per page</option>
                                <option value={25}>25 per page</option>
                            </select>
                            <div className="absolute right-3 pointer-events-none text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* IDE Loading Overlay */}
            {loadingProjectId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1220] p-8 rounded-2xl border border-blue-500/30 max-w-sm w-full shadow-[0_0_50px_rgba(37,99,235,0.15)] flex flex-col items-center">
                        <Hexagon className="w-12 h-12 text-blue-500 animate-pulse mb-4" strokeWidth={1.5} />
                        <h3 className="text-white text-lg font-bold mb-2">Opening Secure IDE</h3>
                        <p className="text-slate-400 text-sm text-center mb-6">Connecting to {projects.find(p => p.id === loadingProjectId)?.name || 'workspace'}...</p>

                        <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 h-2 rounded-full w-full animate-[pulse_1s_ease-in-out_infinite]"></div>
                        </div>
                        <span className="text-blue-400 text-xs mt-2 animate-pulse">Establishing connection...</span>
                    </div>
                </div>
            )}

        </div>
    );
}
