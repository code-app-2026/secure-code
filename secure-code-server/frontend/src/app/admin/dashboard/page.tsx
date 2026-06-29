"use client";

import React, { useState, useEffect } from 'react';
import {
    Users, Folder, Box, Activity, Heart, AlertCircle, AlertTriangle,
    Terminal, RotateCcw, Copy, Check, DownloadCloud, UploadCloud, X, Trash2, Video
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

import 'rrweb-player/dist/style.css';

// Reusable SVG Graph Component
const GraphCard = ({
    title, subtitle, value, valueColor, strokeColor, fillFrom, pathD, yLabels, onViewAll
}: {
    title: string; subtitle: string; value: string; valueColor: string;
    strokeColor: string; fillFrom: string; pathD: string; yLabels: string[]; onViewAll?: () => void;
}) => (
    <div className="bg-[#0b1121]/80 backdrop-blur-sm border border-slate-800/80 rounded-xl p-4 flex flex-col relative overflow-hidden h-[200px]">
        <div className="flex justify-between items-start mb-2 z-10 relative">
            <h3 className="text-slate-300 font-medium text-sm">{title} <span className="text-slate-500 text-xs ml-1 font-normal">{subtitle}</span></h3>
            {onViewAll && (
                <button onClick={(e) => { e.preventDefault(); onViewAll(); }} className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">View all</button>
            )}
        </div>

        <div className="absolute right-4 top-10 z-20">
            <div className={`px-2.5 py-1 rounded-full bg-${valueColor}-500/10 text-${valueColor}-400 text-xs font-medium border border-${valueColor}-500/20 shadow-[0_0_10px_rgba(var(--tw-colors-${valueColor}-500),0.2)]`}>
                {value}
            </div>
        </div>

        {/* Y Axis labels */}
        <div className="absolute left-4 bottom-8 flex flex-col justify-between h-[90px] text-[10px] text-slate-600 z-10 font-mono">
            {yLabels.map((lbl, i) => <span key={i}>{lbl}</span>)}
        </div>

        {/* X Axis labels */}
        <div className="absolute bottom-3 left-14 right-6 flex justify-between text-[10px] text-slate-600 z-10 font-mono">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
        </div>

        {/* SVG Graph Background */}
        <div className="absolute bottom-8 left-12 right-0 h-[100px] w-[calc(100%-3rem)]">
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={fillFrom} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={fillFrom} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={pathD} fill={`url(#grad-${title.replace(/\s+/g, '')})`} stroke={strokeColor} strokeWidth="2.5" className="drop-shadow-[0_0_8px_rgba(currentColor,0.5)]" />
            </svg>
        </div>
    </div>
);

const generateSvgPath = (dataPoints: number[]) => {
    if (!dataPoints || dataPoints.length === 0) return '';
    const width = 400;
    const height = 100;
    const step = width / (dataPoints.length - 1);
    
    let path = `M 0 ${Math.max(0, Math.min(100, 100 - dataPoints[0]))}`;
    for (let i = 1; i < dataPoints.length; i++) {
        const prevX = (i - 1) * step;
        const prevY = Math.max(0, Math.min(100, 100 - dataPoints[i - 1]));
        const currX = i * step;
        const currY = Math.max(0, Math.min(100, 100 - dataPoints[i]));
        const controlX1 = prevX + step / 2;
        const controlX2 = currX - step / 2;
        path += ` C ${controlX1} ${prevY}, ${controlX2} ${currY}, ${currX} ${currY}`;
    }
    path += ` L ${width} ${height} L 0 ${height} Z`;
    return path;
};

export default function AdminDashboard() {
    const [deployments, setDeployments] = useState<any[]>([]);
    const [securityLogs, setSecurityLogs] = useState<any[]>([]);
    const [sessionsList, setSessionsList] = useState<any[]>([]);
    const [isDeploymentsModalOpen, setIsDeploymentsModalOpen] = useState(false);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
    const [activeSessionFilename, setActiveSessionFilename] = useState<string | null>(null);
    const [logToDelete, setLogToDelete] = useState<any | null>(null);
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isGeneratingSsh, setIsGeneratingSsh] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [showSshConfirm, setShowSshConfirm] = useState(false);

    // Backup Code State
    const [backupCode, setBackupCode] = useState<string | null>(null);
    const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
    const [isExportingBackup, setIsExportingBackup] = useState(false);
    const [isBackupCopied, setIsBackupCopied] = useState(false);
    const [showBackupConfirm, setShowBackupConfirm] = useState(false);
    const [isBackupsModalOpen, setIsBackupsModalOpen] = useState(false);
    const [availableBackups, setAvailableBackups] = useState<any[]>([]);
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
    const [isRestoringBackup, setIsRestoringBackup] = useState(false);
    const [showJobAlert, setShowJobAlert] = useState<{ id: string, type: string } | null>(null);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [jobProgress, setJobProgress] = useState<number>(0);
    const [jobStatus, setJobStatus] = useState<string>('RUNNING');
    const [jobType, setJobType] = useState<string>('');
    const [backupToDelete, setBackupToDelete] = useState<string | null>(null);

    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
    const [metricsModalCategory, setMetricsModalCategory] = useState<'CPU' | 'RAM' | 'Network' | 'Response'>('CPU');

    const [metricsData, setMetricsData] = useState({
        cpu: Array(20).fill(0),
        ram: Array(20).fill(0),
        network: Array(20).fill(0),
        response: Array(20).fill(0),
    });
    const [currentMetrics, setCurrentMetrics] = useState({
        cpuUsage: 0,
        cpuCores: 0,
        ramUsage: 0,
        totalRam: 0,
        networkTraffic: 0,
        responseTime: 0,
        error: null as string | null,
        containerCpu: [] as any[],
        containerRam: [] as any[],
        containerNetwork: [] as any[],
        containerResponse: [] as any[],
    });

    const [stats, setStats] = useState({ 
        roles: { admin: 0, developer: 0, viewer: 0 }, 
        online: 0, 
        totalUsers: 0, 
        usersThisWeek: 0,
        totalProjects: 0,
        projectsThisWeek: 0,
        runningServices: 0,
        servicesThisWeek: 0,
        requestsToday: 0,
        requestsYesterday: 0,
        systemHealth: 100,
        healthStatus: 'Excellent'
    });

    useEffect(() => {
        const eventSource = new EventSource('/api/system/metrics/stream');
        
        eventSource.onmessage = (event) => {
            try {
                const metrics = JSON.parse(event.data);
                
                setCurrentMetrics({
                    cpuUsage: metrics.cpuUsage || 0,
                    cpuCores: metrics.cpuCores || 0,
                    ramUsage: metrics.ramUsage || 0,
                    totalRam: metrics.totalRam || 0,
                    networkTraffic: metrics.networkTraffic || 0,
                    responseTime: metrics.responseTime || 0,
                    error: metrics.error || null,
                    containerCpu: metrics.containerCpu || [],
                    containerRam: metrics.containerRam || [],
                    containerNetwork: metrics.containerNetwork || [],
                    containerResponse: metrics.containerResponse || [],
                });

                setMetricsData(prev => ({
                    cpu: [...prev.cpu.slice(1), metrics.cpuUsage || 0],
                    ram: [...prev.ram.slice(1), metrics.ramUsage || 0],
                    network: [...prev.network.slice(1), metrics.networkTraffic ? Math.min(100, (metrics.networkTraffic / 1000000) * 100) : 0],
                    response: [...prev.response.slice(1), metrics.responseTime ? Math.min(100, (metrics.responseTime / 200) * 100) : 0]
                }));
            } catch (err) {
                console.error("Failed to parse metrics", err);
            }
        };

        return () => {
            eventSource.close();
        };
    }, []);

    useEffect(() => {
        const fetchData = () => {
            Promise.all([
                api.get('/users/stats').catch(() => null),
                api.get('/users').catch(() => []),
                api.get('/projects').catch(() => []),
                api.get('/projects/deployments/all').catch(() => []),
                api.get('/users/ssh-key/public').catch(() => ({ publicKey: null })),
                api.get('/users/backup-code').catch(() => ({ backupCode: null })),
                api.get('/logs').catch(() => []),
                api.get('/logs/sessions').catch(() => [])
            ]).then(([statsData, users, projects, deps, sshData, backupData, logsData, sessionsData]) => {
                const now = new Date();
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
                
                const usersThisWeek = (users || []).filter((u: any) => new Date(u.createdAt) > oneWeekAgo).length;
                const projectsThisWeek = (projects || []).filter((p: any) => new Date(p.createdAt) > oneWeekAgo).length;

                // Running Services: Unique projects that have a 'Success' deployment
                const successfulDeps = (deps || []).filter((d: any) => d.status === 'Success');
                
                const getIdentifier = (d: any) => d.project?.id || d.projectId || d.project?.name || d.id;
                
                const runningServicesCount = new Set(successfulDeps.map(getIdentifier)).size;
                const depsThisWeek = successfulDeps.filter((d: any) => new Date(d.createdAt) > oneWeekAgo);
                const servicesThisWeek = new Set(depsThisWeek.map(getIdentifier)).size;

                // Requests Today
                const requestsToday = (logsData || []).filter((l: any) => new Date(l.createdAt) >= todayStart).length;
                const requestsYesterday = (logsData || []).filter((l: any) => {
                    const d = new Date(l.createdAt);
                    return d >= yesterdayStart && d < todayStart;
                }).length;

                // System Health
                let systemHealth = 100;
                let healthStatus = 'Excellent';
                const logsToday = (logsData || []).filter((l: any) => new Date(l.createdAt) >= todayStart);
                if (logsToday.length > 0) {
                    const threats = logsToday.filter((l: any) => l.action?.includes('THREAT') || l.action?.includes('BLOCKED')).length;
                    systemHealth = Math.max(0, 100 - (threats / logsToday.length) * 100);
                    if (systemHealth < 95) healthStatus = 'Good';
                    if (systemHealth < 85) healthStatus = 'Warning';
                    if (systemHealth < 70) healthStatus = 'Critical';
                }

                setStats({
                    roles: statsData?.roles || { admin: 0, developer: 0, viewer: 0 },
                    online: statsData?.online || 0,
                    totalUsers: users?.length || 0,
                    usersThisWeek,
                    totalProjects: projects?.length || 0,
                    projectsThisWeek,
                    runningServices: runningServicesCount,
                    servicesThisWeek,
                    requestsToday,
                    requestsYesterday,
                    systemHealth: parseFloat(systemHealth.toFixed(1)),
                    healthStatus
                });
                setDeployments(deps || []);
                setProjectsList(projects || []);
                setSecurityLogs(logsData || []);
                setSessionsList(sessionsData || []);
                if (sshData?.publicKey) setPublicKey(sshData.publicKey);
                if (backupData?.backupCode !== undefined && backupData?.backupCode !== null) {
                    setBackupCode(backupData.backupCode || null);
                }
            }).catch(console.error);
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isBackupsModalOpen) {
            api.get('/backups').then(data => {
                if (data) setAvailableBackups(data);
            }).catch(console.error);
        }
    }, [isBackupsModalOpen]);

    useEffect(() => {
        if (!activeJobId) return;

        const pollJob = async () => {
            try {
                const res = await api.get(`/backups/job/${activeJobId}`);
                if (res && res.status) {
                    setJobProgress(res.progress || 0);
                    setJobStatus(res.status);
                    
                    if (res.status === 'completed' || res.status === 'failed') {
                        setJobProgress(res.status === 'completed' ? 100 : 0);
                        setIsToastVisible(true);
                        setTimeout(() => {
                            setIsToastVisible(false);
                            setActiveJobId(null);
                        }, 5000);
                        return true; // Stop polling
                    }
                }
            } catch (err) {
                console.error(err);
            }
            return false;
        };

        const interval = setInterval(async () => {
            const shouldStop = await pollJob();
            if (shouldStop) clearInterval(interval);
        }, 1000);

        return () => clearInterval(interval);
    }, [activeJobId]);

    const handleGenerateSshKey = async () => {
        setShowSshConfirm(false);
        setIsGeneratingSsh(true);
        try {
            const res = await api.post('/users/ssh-key/generate', {});
            if (res.publicKey) {
                setPublicKey(res.publicKey);
            }
        } catch (error) {
            console.error('Failed to generate SSH key', error);
        } finally {
            setIsGeneratingSsh(false);
        }
    };

    const handleCopySshKey = async () => {
        if (publicKey) {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(publicKey);
                } else {
                    const textArea = document.createElement("textarea");
                    textArea.value = publicKey;
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                }
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (error) {
                console.error('Failed to copy text', error);
            }
        }
    };

    const handleGenerateBackupCode = async () => {
        setIsGeneratingBackup(true);
        try {
            // Generate a random 16 character alphanumeric string
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newCode = '';
            for (let i = 0; i < 16; i++) {
                newCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            // Format to XXXX-XXXX-XXXX-XXXX
            const formattedCode = newCode.match(/.{1,4}/g)?.join('-') || newCode;

            await api.patch('/users/backup-code', { backupCode: formattedCode });
            setBackupCode(formattedCode);
            setShowBackupConfirm(false);
            
            // Re-trigger the copy button style effect if needed
            setIsBackupCopied(false);
        } catch (error) {
            console.error('Failed to generate backup code', error);
        } finally {
            setIsGeneratingBackup(false);
        }
    };

    const handleCopyBackupCode = async () => {
        if (!backupCode || backupCode === 'RECOVERED') return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(backupCode);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = backupCode;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setIsBackupCopied(true);
            setTimeout(() => setIsBackupCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDeleteLog = async () => {
        if (!logToDelete) return;
        try {
            await api.delete(`/logs/${logToDelete.id}`);
            setSecurityLogs(prev => prev.filter(l => l.id !== logToDelete.id));
            setLogToDelete(null);
        } catch (error) {
            console.error('Failed to delete security log', error);
        }
    };

    const handleExportBackup = async () => {
        setIsExportingBackup(true);
        try {
            const res = await api.post('/backups/export', {});
            if (res.success) {
                setShowJobAlert({ id: res.jobId, type: 'EXPORT' });
            } else {
                alert('Failed to start backup export.');
            }
        } catch (error) {
            console.error('Export backup failed', error);
            alert('Failed to export backup. Please check your permissions.');
        } finally {
            setIsExportingBackup(false);
        }
    };

    const handleRestoreBackup = async () => {
        if (!selectedBackup) return;
        setIsRestoringBackup(true);
        try {
            const res = await api.post('/backups/restore', { filename: selectedBackup });
            if (res.success) {
                setSelectedBackup(null);
                setShowJobAlert({ id: res.jobId, type: 'RESTORE' });
            } else {
                alert('Failed to start backup restore.');
            }
        } catch (error) {
            console.error('Restore backup failed', error);
            alert('Failed to restore backup.');
        } finally {
            setIsRestoringBackup(false);
        }
    };

    const handleDeleteBackup = async () => {
        if (!backupToDelete) return;
        try {
            const res = await api.delete(`/backups/${backupToDelete}`);
            if (res.success) {
                setAvailableBackups(prev => prev.filter(b => b.filename !== backupToDelete));
                if (selectedBackup === backupToDelete) setSelectedBackup(null);
            } else {
                alert(res.message || 'Failed to delete backup.');
            }
        } catch (error) {
            console.error('Failed to delete backup', error);
            alert('Failed to delete backup.');
        } finally {
            setBackupToDelete(null);
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const fetchSessionData = async (filename: string) => {
        try {
            const data = await api.get(`/logs/sessions/${filename}`);
            if (data && data.length > 0) {
                setActiveSessionFilename(filename);
                setTimeout(async () => {
                    const playerEl = document.getElementById('rrweb-player-container');
                    if (playerEl) {
                        playerEl.innerHTML = ''; // clear previous
                        const rrwebPlayerModule = await import('rrweb-player');
                        const RrwebPlayer = rrwebPlayerModule.default || rrwebPlayerModule;
                        
                        new RrwebPlayer({
                            target: playerEl,
                            props: {
                                events: data,
                                width: 800,
                                height: 500,
                            },
                        });
                    }
                }, 500);
            }
        } catch (e) {
            console.error("Failed to load session", e);
        }
    };

    return (
        <div className="min-h-screen bg-[#040814] text-slate-200 font-sans selection:bg-blue-500/30">

            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.4),_transparent_50%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.3),_transparent_50%)]" />

            <AdminHeader />

            {/* --- MAIN DASHBOARD CONTENT --- */}
            <div className="relative z-10 max-w-[1600px] mx-auto p-6 space-y-4">

                {/* --- TOP ROW: METRICS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

                    {/* Active Users */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Active Users</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3>
                            <p className="text-emerald-400 text-xs mt-1 font-medium">+{stats.usersThisWeek} this week</p>
                        </div>
                    </div>

                    {/* Active Projects */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <Folder className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Active Projects</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">{stats.totalProjects}</h3>
                            <p className="text-emerald-400 text-xs mt-1 font-medium">+{stats.projectsThisWeek} this week</p>
                        </div>
                    </div>

                    {/* Running Services */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Box className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Running Services</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">{stats.runningServices}</h3>
                            <p className="text-emerald-400 text-xs mt-1 font-medium">+{stats.servicesThisWeek} this week</p>
                        </div>
                    </div>

                    {/* Requests Today */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-amber-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Requests Today</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">
                                {stats.requestsToday >= 1000 ? (stats.requestsToday / 1000).toFixed(1) + 'k' : stats.requestsToday.toLocaleString()}
                            </h3>
                            <p className={`${stats.requestsToday >= stats.requestsYesterday ? 'text-emerald-400' : 'text-red-400'} text-xs mt-1 font-medium`}>
                                {stats.requestsYesterday > 0 
                                    ? `${stats.requestsToday >= stats.requestsYesterday ? '+' : ''}${(((stats.requestsToday - stats.requestsYesterday) / stats.requestsYesterday) * 100).toFixed(1)}% than yesterday`
                                    : '+100% than yesterday'}
                            </p>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <Heart className="w-4 h-4 text-cyan-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">System Health</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-2xl font-bold text-white">{stats.systemHealth}%</h3>
                            <p className={`${stats.healthStatus === 'Excellent' || stats.healthStatus === 'Good' ? 'text-emerald-500' : stats.healthStatus === 'Warning' ? 'text-amber-500' : 'text-red-500'} text-xs mt-1 font-medium`}>
                                {stats.healthStatus}
                            </p>
                        </div>
                    </div>

                    {/* Active Alerts */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                            </div>
                            <span className="text-slate-400 text-xs font-medium">Active Alerts</span>
                        </div>
                        <div className="mt-3 flex items-end justify-between">
                            <h3 className="text-2xl font-bold text-white">
                                {securityLogs.length >= 1000 ? (securityLogs.length / 1000).toFixed(1) + 'k' : securityLogs.length}
                            </h3>
                            <button onClick={(e) => { e.preventDefault(); setIsAlertsModalOpen(true); }} className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors">View Alerts &rarr;</button>
                        </div>
                    </div>

                </div>

                {/* --- MIDDLE ROW: GRAPHS AND TEAM --- */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <GraphCard
                            title="CPU Usage" subtitle={`${currentMetrics.cpuCores} Cores`} value={`${Math.round(currentMetrics.cpuUsage || 0)}%`} valueColor="purple"
                            strokeColor="#a855f7" fillFrom="#a855f7"
                            yLabels={['100%', '75%', '50%', '25%', '0%']}
                            pathD={generateSvgPath(metricsData.cpu)}
                            onViewAll={() => { setMetricsModalCategory('CPU'); setIsMetricsModalOpen(true); }}
                        />
                        <GraphCard
                            title="RAM Usage" subtitle={`${(currentMetrics.totalRam / (1024 * 1024 * 1024)).toFixed(1)} GB`} value={`${Math.round(currentMetrics.ramUsage || 0)}%`} valueColor="blue"
                            strokeColor="#3b82f6" fillFrom="#3b82f6"
                            yLabels={['100%', '75%', '50%', '25%', '0%']}
                            pathD={generateSvgPath(metricsData.ram)}
                            onViewAll={() => { setMetricsModalCategory('RAM'); setIsMetricsModalOpen(true); }}
                        />
                        <GraphCard
                            title="Network Traffic" subtitle={`${(currentMetrics.networkTraffic / (1024 * 1024)).toFixed(1)} MB/s`} value={`${Math.round(currentMetrics.networkTraffic / (1024 * 1024))}Mb/s`} valueColor="emerald"
                            strokeColor="#10b981" fillFrom="#10b981"
                            yLabels={['100Mb/s', '75Mb/s', '50Mb/s', '25Mb/s', '0Mb/s']}
                            pathD={generateSvgPath(metricsData.network)}
                            onViewAll={() => { setMetricsModalCategory('Network'); setIsMetricsModalOpen(true); }}
                        />
                        <GraphCard
                            title="Response Time" subtitle={`${Math.round(currentMetrics.responseTime)} MS`} value={`${Math.round(currentMetrics.responseTime)}ms`} valueColor="amber"
                            strokeColor="#f59e0b" fillFrom="#f59e0b"
                            yLabels={['200ms', '150ms', '100ms', '50ms', '0ms']}
                            pathD={generateSvgPath(metricsData.response)}
                            onViewAll={() => { setMetricsModalCategory('Response'); setIsMetricsModalOpen(true); }}
                        />
                    </div>

                    <div className="lg:col-span-1 bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-slate-200 font-medium">Team Members</h3>
                            <Link href="/admin/users" className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">View All</Link>
                        </div>
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <UserIcon /> <span className="text-sm">Admins</span>
                                </div>
                                <span className="text-white font-medium">{stats.roles.admin || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <UserIcon /> <span className="text-sm">Developers</span>
                                </div>
                                <span className="text-white font-medium">{stats.roles.developer || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <UserIcon /> <span className="text-sm">Viewers</span>
                                </div>
                                <span className="text-white font-medium">{stats.roles.viewer || 0}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-medium">Online</span>
                            </div>
                            <span className="text-white font-medium">{stats.online || 0}</span>
                        </div>
                    </div>

                </div>

                {/* --- BOTTOM ROW: MISC --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Recent Deployments */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex flex-col max-h-[350px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-200 font-medium">Recent Deployments</h3>
                            <button onClick={() => setIsDeploymentsModalOpen(true)} className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">
                                View all
                            </button>
                        </div>
                        <div className="space-y-3 overflow-hidden flex-1">
                            {deployments.length === 0 ? (
                                <p className="text-slate-500 text-sm italic">No recent deployments</p>
                            ) : deployments.slice(0, 3).map((dep, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                                    <div className="flex items-center space-x-3 truncate">
                                        <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                            <Terminal className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-slate-200 text-sm font-medium truncate">{dep.project?.name || 'Unknown Project'}</p>
                                            <p className="text-slate-500 text-xs truncate" title={dep.commitMessage}>{dep.commitMessage}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4 shrink-0 ml-4">
                                        <span className="text-slate-500 text-xs whitespace-nowrap">{formatRelativeTime(dep.createdAt)}</span>
                                        <span className={`px-2 py-1 ${dep.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} text-xs font-medium rounded-md border`}>
                                            {dep.status} {">"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SSH Key */}
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-slate-200 font-medium">Your Public SSH Key</h3>
                                <button 
                                    onClick={() => setShowSshConfirm(true)}
                                    disabled={isGeneratingSsh}
                                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-md transition-colors border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <RotateCcw className={`w-3 h-3 ${isGeneratingSsh ? 'animate-spin' : ''}`} />
                                    <span>{isGeneratingSsh ? 'Generating...' : 'Generate Key'}</span>
                                </button>
                            </div>
                            <p className="text-slate-500 text-xs mb-4">Copy this key and add it to your GitLab or GitHub</p>
                        </div>

                        <div className="bg-[#050810] border border-slate-800 rounded-lg p-4 relative group min-h-[100px] flex items-center justify-center">
                            {publicKey ? (
                                <pre className="text-slate-400 text-xs font-mono break-all whitespace-pre-wrap leading-relaxed w-full">
                                    {publicKey}
                                </pre>
                            ) : (
                                <p className="text-slate-600 text-xs text-center">No SSH key generated yet.</p>
                            )}
                            {publicKey && (
                                <button 
                                    onClick={handleCopySshKey}
                                    disabled={isCopied}
                                    className="absolute bottom-3 right-3 flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors shadow-lg disabled:bg-emerald-700 disabled:cursor-not-allowed">
                                    {isCopied ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Backup Code & Backups */}
                    <div className="flex flex-col space-y-4">

                        {/* Backup Code */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-slate-200 font-medium text-sm">Your Backup Code</h3>
                                <button 
                                    onClick={() => setShowBackupConfirm(true)}
                                    className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded-md transition-colors border border-emerald-500/20"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Generate Code</span>
                                </button>
                            </div>
                            <p className="text-slate-600 text-[10px] mb-3">This code can only be used once.</p>

                            <div className="flex items-center justify-between bg-[#050810] border border-slate-800 rounded-lg px-3 py-2 min-h-[40px]">
                                {!backupCode ? (
                                    <span className="text-slate-500 text-xs italic">No Backup Code generated yet.</span>
                                ) : backupCode === 'RECOVERED' ? (
                                    <span className="text-amber-500/80 text-xs italic font-medium">Account Recovered. Click to generate new backup code.</span>
                                ) : (
                                    <>
                                        <code className="text-slate-300 text-xs font-mono tracking-wider">{backupCode}</code>
                                        <button 
                                            onClick={handleCopyBackupCode}
                                            disabled={isBackupCopied}
                                            className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-medium rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {isBackupCopied ? (
                                                <>
                                                    <Check className="w-3 h-3" />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Backups */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-5 flex-1 flex flex-col justify-center">
                            <div className="flex items-center space-x-2 mb-1">
                                <DownloadCloud className="w-4 h-4 text-indigo-400" />
                                <h3 className="text-slate-200 font-medium text-sm">Backups</h3>
                            </div>
                            <p className="text-slate-600 text-[10px] mb-4">Manage and secure your data backups</p>

                            <div className="flex space-x-2 mt-2">
                                <button 
                                    onClick={handleExportBackup}
                                    disabled={isExportingBackup}
                                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-[11px] font-medium rounded-lg border border-emerald-500/20 transition-colors disabled:opacity-50"
                                >
                                    <UploadCloud className={`w-3.5 h-3.5 ${isExportingBackup ? 'animate-bounce' : ''}`} />
                                    <span>{isExportingBackup ? 'Exporting...' : 'Export'}</span>
                                </button>
                                <button 
                                    onClick={() => selectedBackup ? setSelectedBackup(null) : setIsBackupsModalOpen(true)}
                                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-[11px] font-medium rounded-lg border border-blue-500/20 transition-colors group"
                                >
                                    {selectedBackup ? (
                                        <>
                                            <span className="truncate max-w-[60px]">{selectedBackup}</span>
                                            <X className="w-3.5 h-3.5 text-red-400 opacity-50 group-hover:opacity-100" />
                                        </>
                                    ) : (
                                        <>
                                            <DownloadCloud className="w-3.5 h-3.5" />
                                            <span>Import</span>
                                        </>
                                    )}
                                </button>
                                <button 
                                    onClick={handleRestoreBackup}
                                    disabled={!selectedBackup || isRestoringBackup}
                                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 text-[11px] font-medium rounded-lg border border-purple-500/20 transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoringBackup ? 'animate-spin' : ''}`} />
                                    <span>{isRestoringBackup ? 'Restoring...' : 'Restore'}</span>
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

                {/* --- JOB ALERT POPUP --- */}
                {showJobAlert && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#040814]/80 backdrop-blur-sm" />
                        <div className="relative w-full max-w-sm bg-[#0b1121] border border-slate-800 rounded-2xl shadow-2xl p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                <Activity className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-200 mb-2">Job {showJobAlert.type} Started</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Job ID: <span className="font-mono text-indigo-400">{showJobAlert.id}</span>
                            </p>
                            <button
                                onClick={() => {
                                    setJobType(showJobAlert.type);
                                    setActiveJobId(showJobAlert.id);
                                    setIsToastVisible(true);
                                    setJobStatus('RUNNING');
                                    setJobProgress(0);
                                    setShowJobAlert(null);
                                }}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}

                {/* --- REAL-TIME PROGRESS TOAST --- */}
                {isToastVisible && activeJobId && (
                    <div className="fixed top-24 right-6 z-[110] w-80 bg-[#0b1121] border border-slate-700 shadow-2xl rounded-xl p-4 animate-in slide-in-from-right-8">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                                {jobStatus === 'completed' ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                ) : jobStatus === 'failed' ? (
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                ) : (
                                    <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                                )}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-200">
                                        {jobStatus === 'completed' 
                                            ? (jobType === 'RESTORE' ? 'Restore Complete' : 'Export Complete') 
                                            : jobStatus === 'failed' 
                                                ? (jobType === 'RESTORE' ? 'Restore Failed' : 'Export Failed') 
                                                : (jobType === 'RESTORE' ? 'Restoring Backup' : 'Exporting Backup')
                                        }
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Job ID: {activeJobId}</p>
                                </div>
                            </div>
                            {jobStatus !== 'completed' && jobStatus !== 'failed' && (
                                <button onClick={() => setIsToastVisible(false)} className="text-slate-500 hover:text-slate-300">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1.5 overflow-hidden">
                            <div 
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                    jobStatus === 'completed' ? 'bg-emerald-500' : jobStatus === 'failed' ? 'bg-red-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${jobProgress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                            <span className={jobStatus === 'completed' ? 'text-emerald-400' : jobStatus === 'failed' ? 'text-red-400' : 'text-slate-400'}>
                                {jobStatus === 'completed' ? 'Success!' : jobStatus === 'failed' ? 'Failed' : 'Processing...'}
                            </span>
                            <span className="text-slate-500 font-mono">{jobProgress}%</span>
                        </div>
                    </div>
                )}

                {/* --- BACKUPS MODAL --- */}
                {isBackupsModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <div 
                            className="absolute inset-0 bg-[#040814]/80 backdrop-blur-sm"
                            onClick={() => setIsBackupsModalOpen(false)}
                        />
                        <div className="relative w-full max-w-2xl bg-[#0b1121] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#080d1a]">
                                <div className="flex items-center space-x-3">
                                    <Folder className="w-5 h-5 text-blue-400" />
                                    <h2 className="text-lg font-medium text-slate-200">Available Backups</h2>
                                </div>
                                <button 
                                    onClick={() => setIsBackupsModalOpen(false)}
                                    className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {availableBackups.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        No backups available. Export one first.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {availableBackups.map((bkp, i) => (
                                            <div 
                                                key={i} 
                                                className="flex items-center justify-between p-3 rounded-xl border border-slate-800/50 bg-[#0b1121] hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group"
                                            >
                                                <div 
                                                    className="flex items-center space-x-3 cursor-pointer flex-1"
                                                    onClick={() => {
                                                        setSelectedBackup(bkp.filename);
                                                        setIsBackupsModalOpen(false);
                                                    }}
                                                >
                                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                        <Box className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-300 group-hover:text-blue-400">{bkp.filename}</p>
                                                        <p className="text-xs text-slate-500">{(bkp.size / 1024 / 1024).toFixed(2)} MB • {new Date(bkp.updatedAt).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setBackupToDelete(bkp.filename);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors ml-4 shrink-0"
                                                    title="Delete Backup"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ALERTS MODAL --- */}
                {isAlertsModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <div 
                            className="absolute inset-0 bg-[#040814]/80 backdrop-blur-sm"
                            onClick={() => setIsAlertsModalOpen(false)}
                        />
                        <div className="relative w-full max-w-5xl max-h-[85vh] bg-[#0b1121] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#080d1a]">
                                <div className="flex items-center space-x-3">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    <h2 className="text-lg font-medium text-slate-200">Recent Security Threats</h2>
                                </div>
                                <button 
                                    onClick={() => setIsAlertsModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {/* Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#060a16] z-10 shadow-sm">
                                        <tr className="border-b border-slate-800 text-slate-500 text-[11px] uppercase tracking-wider">
                                            <th className="px-6 py-4 font-medium">Time</th>
                                            <th className="px-6 py-4 font-medium">User</th>
                                            <th className="px-6 py-4 font-medium">Action</th>
                                            <th className="px-6 py-4 font-medium">Details</th>
                                            <th className="px-6 py-4 font-medium">IP Address</th>
                                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-800/50">
                                        {securityLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm italic">
                                                    No security threats logged.
                                                </td>
                                            </tr>
                                        ) : (
                                            securityLogs.map((log: any, i) => (
                                                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                                                        {formatRelativeTime(log.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-400">
                                                                <UserIcon />
                                                            </div>
                                                            <span className="text-slate-300 font-medium">{log.username || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-[10px] font-semibold tracking-wider uppercase rounded border border-red-500/20">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-xs">
                                                        {(() => {
                                                            const match = log.details?.match(/in project ([a-f0-9\-]{36})/);
                                                            let formattedDetails = log.details;
                                                            if (match) {
                                                                const pId = match[1];
                                                                const p = projectsList.find(proj => proj.id === pId);
                                                                formattedDetails = formattedDetails.replace(pId, p ? `"${p.name}"` : `${pId.substring(0,8)}...`);
                                                            }
                                                            return formattedDetails;
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                                        {log.ipAddress?.replace(/^::ffff:/, '') || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => setLogToDelete(log)}
                                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Delete threat log"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- DEPLOYMENTS MODAL --- */}
            {isDeploymentsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-[#040814]/80 backdrop-blur-sm"
                        onClick={() => setIsDeploymentsModalOpen(false)}
                    />
                    <div className="relative w-full max-w-6xl h-[80vh] bg-[#0b1121] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <h2 className="text-lg font-medium text-slate-200">All Deployments</h2>
                            <button 
                                onClick={() => setIsDeploymentsModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body (2 Panes) */}
                        <div className="flex flex-1 overflow-hidden">
                            
                            {/* Left Pane: Projects */}
                            <div className="w-1/3 border-r border-slate-800 flex flex-col bg-[#080d1a]">
                                <div className="p-4 border-b border-slate-800/50">
                                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Projects</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                    {Array.from(new Set(deployments.map(d => d.projectId))).map(projectId => {
                                        const projectDeps = deployments.filter(d => d.projectId === projectId);
                                        const project = projectDeps[0]?.project;
                                        const isSelected = selectedProjectId === projectId;

                                        return (
                                            <button
                                                key={projectId}
                                                onClick={() => setSelectedProjectId(projectId)}
                                                className={`w-full text-left p-3 rounded-xl transition-all border ${
                                                    isSelected 
                                                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' 
                                                        : 'bg-transparent border-transparent hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                                                        <Folder className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                            {project?.name || 'Unknown Project'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{projectDeps.length} deployments</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {deployments.length === 0 && (
                                        <p className="text-slate-500 text-sm italic text-center py-8">No projects with deployments</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Pane: Deployments */}
                            <div className="w-2/3 flex flex-col bg-[#0b1121]">
                                <div className="p-4 border-b border-slate-800/50 flex justify-between items-center">
                                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                                        Deployment History {selectedProjectId ? '' : '(Select a project)'}
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {!selectedProjectId ? (
                                        <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                                            Select a project from the left pane to view its deployments.
                                        </div>
                                    ) : (
                                        deployments.filter(d => d.projectId === selectedProjectId).map((dep, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-[#080d1a] border border-slate-800/60 rounded-xl hover:border-slate-700 transition-colors">
                                                <div className="flex items-center space-x-4 min-w-0">
                                                    <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                        <Terminal className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-slate-200 text-sm font-medium truncate mb-1">{dep.commitMessage}</p>
                                                        <div className="flex items-center space-x-3 text-xs text-slate-500">
                                                            <span className="flex items-center"><Users className="w-3 h-3 mr-1"/> {dep.user?.username || 'System'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                            <span>{dep.environment}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 ml-4 space-y-2">
                                                    <span className="text-slate-400 text-xs">{formatRelativeTime(dep.createdAt)}</span>
                                                    <span className={`px-2.5 py-1 ${dep.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} text-[10px] font-medium rounded-md border uppercase tracking-wider`}>
                                                        {dep.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE LOG MODAL */}
            {logToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050810]/90 backdrop-blur-md p-4 transition-all duration-300">
                    <div className="relative w-full max-w-sm bg-[#0a0f1c] border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="h-1.5 w-full bg-red-500"></div>
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-[#0a0f1c] bg-red-500/10 text-red-500 shadow-red-500/20">
                                <Trash2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-[22px] font-bold text-white mb-2 tracking-wide">Delete Threat Log</h2>
                            <p className="text-slate-400 text-[15px] leading-relaxed mb-8">
                                Are you sure you want to permanently delete this security log? This action cannot be undone.
                            </p>
                            <div className="w-full flex space-x-3">
                                <button
                                    onClick={() => setLogToDelete(null)}
                                    className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteLog}
                                    className="flex-1 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all active:scale-[0.98]"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SSH Key Confirmation Modal */}
            {showSshConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-200">Generate New SSH Key?</h2>
                            </div>
                            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
                                <p>
                                    Are you sure you want to generate a new SSH public key?
                                </p>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400">
                                    <p className="font-semibold mb-1">Warning: Connection will be broken</p>
                                    <p className="text-red-400/80">
                                        If you generate a new key, the connection between your currently connected GitHub account will be disconnected. You will have to copy the new key and add it to GitHub again.
                                    </p>
                                </div>
                                <p className="text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                    This single-key usage architecture is for security purposes. Only one company GitHub account should be used to store and pull code, ensuring no individual can directly access or download the code.
                                </p>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => setShowSshConfirm(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                                >
                                    No, Cancel
                                </button>
                                <button
                                    onClick={handleGenerateSshKey}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-red-900/20"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Yes, Generate Key</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Backup Code Confirmation Modal */}
            {showBackupConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                    <AlertCircle className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-200">Generate New Backup Code?</h2>
                            </div>
                            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
                                <p>
                                    Are you sure you want to change your Backup Code?
                                </p>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-400">
                                    <p className="font-semibold mb-1">Warning: Old code will be invalid</p>
                                    <p className="text-emerald-400/80">
                                        If you generate a new code, your previous backup code will instantly stop working. Make sure to save the new one in a secure place.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => setShowBackupConfirm(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                                >
                                    No, Cancel
                                </button>
                                <button
                                    onClick={handleGenerateBackupCode}
                                    disabled={isGeneratingBackup}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-4 h-4 ${isGeneratingBackup ? 'animate-spin' : ''}`} />
                                    <span>{isGeneratingBackup ? 'Generating...' : 'Yes, Generate Code'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Backup Delete Confirmation Modal */}
            {backupToDelete && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-200 mb-2">Delete Backup?</h2>
                            <p className="text-sm text-slate-400 mb-1">
                                Are you sure you want to permanently delete:
                            </p>
                            <p className="text-xs font-mono text-slate-300 break-all bg-[#080d1a] border border-slate-800 p-2 rounded-lg w-full mb-6">
                                {backupToDelete}
                            </p>
                            
                            <div className="flex w-full space-x-3">
                                <button
                                    onClick={() => setBackupToDelete(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteBackup}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Modal */}
            {isMetricsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1121] border border-slate-800 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center p-5 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-slate-200">Container {metricsModalCategory} Breakdown</h2>
                            <button onClick={() => setIsMetricsModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {currentMetrics[`container${metricsModalCategory}` as keyof typeof currentMetrics] && (currentMetrics[`container${metricsModalCategory}` as keyof typeof currentMetrics] as any[]).length > 0 ? (
                                <div className="space-y-2">
                                    {(currentMetrics[`container${metricsModalCategory}` as keyof typeof currentMetrics] as any[]).map((c, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-800/50 bg-[#080d1a] hover:border-slate-700 transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                                                    <Box className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-300">{c.name.replace(/^\//, '')}</p>
                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">Docker Container</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-200">
                                                    {metricsModalCategory === 'CPU' && `${c.value.toFixed(1)}%`}
                                                    {metricsModalCategory === 'RAM' && `${(c.value / (1024 * 1024)).toFixed(1)} MB`}
                                                    {metricsModalCategory === 'Network' && `${(c.value / 1024).toFixed(1)} KB/s`}
                                                    {metricsModalCategory === 'Response' && `${c.value} ms`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-500">
                                    <Activity className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                                    No container-level metrics available. Make sure cadvisor is running.
                                </div>
                            )}
                        </div>
                        
                        <div className="p-5 border-t border-slate-800 bg-[#080d1a] flex justify-end">
                            <button
                                onClick={() => setIsMetricsModalOpen(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple wrapper for the repeating User icon
const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
