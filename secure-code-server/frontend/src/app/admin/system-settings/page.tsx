"use client";

import React, { useState, useEffect } from 'react';
import { Save, Settings, Shield, Terminal, Globe, AlertTriangle, RefreshCcw, Bell, HardDrive, Trash2, Check, X } from 'lucide-react';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

    // Local state for the form inputs
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [blockedCommands, setBlockedCommands] = useState("");
    const [systemMessage, setSystemMessage] = useState("");
    const [showSystemMessage, setShowSystemMessage] = useState(false);

    // Storage States
    const [diskMetrics, setDiskMetrics] = useState({ total: 0, free: 0 });
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [clearProgress, setClearProgress] = useState(0);
    const [clearComplete, setClearComplete] = useState(false);

    useEffect(() => {
        const eventSource = new EventSource('/api/system/metrics/stream');
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.diskTotal && data.diskFree) {
                    setDiskMetrics({
                        total: data.diskTotal,
                        free: data.diskFree
                    });
                }
            } catch (err) {}
        };
        return () => {
            eventSource.close();
        };
    }, []);

    const handleClearStorage = async () => {
        setIsClearing(true);
        setClearProgress(1);
        
        const interval = setInterval(() => {
            setClearProgress(prev => {
                if (prev >= 95) return 95;
                return prev + Math.floor(Math.random() * 5) + 1;
            });
        }, 300);

        try {
            await api.post('/settings/clear-storage', {});
            
            clearInterval(interval);
            setClearProgress(100);
            
            setTimeout(() => {
                setClearComplete(true);
                setIsClearing(false);
            }, 500);

        } catch (err) {
            clearInterval(interval);
            setIsClearing(false);
            setShowStorageModal(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes || bytes === 0) return 'N/A';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };

    const usedBytes = Math.max(0, diskMetrics.total - diskMetrics.free);
    const usedPercent = diskMetrics.total ? Math.round((usedBytes / diskMetrics.total) * 100) : 0;

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.get('/settings');
                setSettings(data);
                if (data.maintenanceMode !== undefined) setMaintenanceMode(data.maintenanceMode);
                if (data.blockedCommands !== undefined) setBlockedCommands(data.blockedCommands);
                if (data.systemMessage !== undefined) setSystemMessage(data.systemMessage);
                if (data.showSystemMessage !== undefined) setShowSystemMessage(data.showSystemMessage);
            } catch (err) {
                console.error("Failed to load settings:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage({ text: '', type: '' });
        try {
            const payload = {
                maintenanceMode,
                blockedCommands,
                systemMessage,
                showSystemMessage
            };
            await api.patch('/settings', payload);
            setSaveMessage({ text: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setSaveMessage({ text: err.message || 'Failed to save settings', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#040814] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.4),_transparent_50%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.3),_transparent_50%)]" />

            <AdminHeader />

            <div className="relative z-10 max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center">
                            <Settings className="w-6 h-6 mr-3 text-indigo-400" />
                            System Settings
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Manage global configuration for the entire IDE platform.</p>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={isLoading || isSaving}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save Changes</span>
                    </button>
                </div>

                {/* Toast Notification */}
                {saveMessage.text && (
                    <div className={`fixed top-20 right-6 z-[200] p-4 rounded-xl flex items-center space-x-3 text-sm font-medium shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${
                        saveMessage.type === 'success' ? 'bg-[#062415] text-emerald-400 border border-emerald-500/30' : 'bg-[#2a0c0c] text-red-400 border border-red-500/30'
                    }`}>
                        {saveMessage.type === 'success' ? <Shield className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span>{saveMessage.text}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <RefreshCcw className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* Storage Section */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden relative shadow-lg">
                            {/* Glowing Background Accent */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600/10 rounded-full blur-[50px] pointer-events-none" />
                            
                            <div className="px-6 py-4 border-b border-slate-800 bg-[#080d1a] flex items-center space-x-3">
                                <HardDrive className="w-5 h-5 text-blue-400" />
                                <h2 className="text-lg font-medium text-slate-200">System Storage</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[28px] font-bold text-white">{formatBytes(usedBytes)} <span className="text-[14px] font-normal text-slate-500">used</span></span>
                                    <span className="text-[14px] text-slate-400 font-medium">{formatBytes(diskMetrics.total)} total</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-3 bg-[#050810] rounded-full overflow-hidden border border-slate-800/80 mb-6 shadow-inner relative">
                                    <div 
                                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${usedPercent > 80 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}
                                        style={{ width: diskMetrics.total === 0 ? '0%' : `${Math.max(2, usedPercent)}%` }}
                                    />
                                </div>

                                <button
                                    onClick={() => setShowStorageModal(true)}
                                    className="px-6 py-3 bg-[#050810] hover:bg-[#0a0f1c] border border-red-500/20 hover:border-red-500/50 text-slate-200 font-medium rounded-xl transition-all flex items-center justify-center space-x-2 active:scale-[0.98] shadow-[0_0_15px_rgba(239,68,68,0.05)] w-full sm:w-auto"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                    <span className="text-[14px]">Clear Storage Cache</span>
                                </button>
                            </div>
                        </div>

                        {/* Security Section */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-800 bg-[#080d1a] flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-lg font-medium text-slate-200">Security & Access</h2>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Toggle Maintenance Mode */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-200">Maintenance Mode</h3>
                                        <p className="text-xs text-slate-500 mt-1">When active, only Admins can log in. Other users see a maintenance screen.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={maintenanceMode}
                                            onChange={(e) => setMaintenanceMode(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Terminal Restrictions Section */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-800 bg-[#080d1a] flex items-center space-x-3">
                                <Terminal className="w-5 h-5 text-amber-400" />
                                <h2 className="text-lg font-medium text-slate-200">Terminal Control</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-200 mb-2">Blocked Commands Regex</label>
                                    <p className="text-xs text-slate-500 mb-3">Any command matching these words will be intercepted and logged as a security threat.</p>
                                    <textarea
                                        value={blockedCommands}
                                        onChange={(e) => setBlockedCommands(e.target.value)}
                                        className="w-full bg-[#050810] border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors h-32 font-mono"
                                        placeholder="e.g. ^(sudo|apt|wget|curl|rm -rf|chmod)"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Announcements Section */}
                        <div className="bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-800 bg-[#080d1a] flex items-center space-x-3">
                                <Bell className="w-5 h-5 text-blue-400" />
                                <h2 className="text-lg font-medium text-slate-200">Global Announcements</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-200 mb-2">System Message</label>
                                    <p className="text-xs text-slate-500 mb-3">This message will be displayed prominently to all users.</p>
                                    <input
                                        type="text"
                                        value={systemMessage}
                                        onChange={(e) => setSystemMessage(e.target.value)}
                                        className="w-full bg-[#050810] border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors mb-5"
                                        placeholder="e.g. System maintenance scheduled for Saturday 2AM UTC."
                                    />
                                    
                                    <div className="flex items-center justify-between mt-4 border-t border-slate-800 pt-5">
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-200">Show Announcement Banner</h3>
                                            <p className="text-xs text-slate-500 mt-1">Toggle to display or hide the banner without losing the message text above.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={showSystemMessage}
                                                onChange={(e) => setShowSystemMessage(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Storage Clear Modal */}
                {showStorageModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
                        <div className="w-full max-w-[420px] p-8 mx-4 bg-[#0a0f1c]/95 border border-slate-800/80 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col items-center">
                            
                            {!isClearing && !clearComplete && (
                                <button
                                    onClick={() => setShowStorageModal(false)}
                                    className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            )}

                            <div className={`w-[4rem] h-[4rem] mt-2 mb-6 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)] border ${clearComplete ? 'bg-emerald-500/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-[#1a0f12] border-red-500/20'}`}>
                                {clearComplete ? (
                                    <Check className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
                                ) : (
                                    <Trash2 className="w-7 h-7 text-red-500" strokeWidth={2} />
                                )}
                            </div>

                            <h2 className="text-[20px] font-bold text-white mb-3 tracking-wide text-center">
                                {clearComplete ? 'Storage Cleared!' : 'Clear System Storage?'}
                            </h2>
                            
                            {!isClearing && !clearComplete && (
                                <>
                                    <p className="text-[14px] text-slate-400 text-center mb-8 leading-relaxed">
                                        This will safely clear your unused system cache, dangling images, and <span className="text-white font-medium">not running</span> containers. 
                                        <br/><br/>
                                        <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[13px] block mt-2 shadow-[0_0_15px_rgba(37,99,235,0.1)]">Active developer workspaces and data will not be deleted.</span>
                                    </p>
                                    <div className="flex space-x-3 w-full">
                                        <button
                                            onClick={() => setShowStorageModal(false)}
                                            className="flex-1 py-3.5 bg-[#0f172a] hover:bg-slate-800 border border-slate-700/50 text-white font-medium rounded-xl transition-all active:scale-[0.98]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleClearStorage}
                                            className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-[0.98]"
                                        >
                                            Yes, Clear
                                        </button>
                                    </div>
                                </>
                            )}

                            {(isClearing || clearComplete) && (
                                <div className="w-full flex flex-col items-center mt-2">
                                    <div className="w-full h-3 bg-[#050810] rounded-full overflow-hidden border border-slate-800/80 mb-4 shadow-inner relative">
                                        <div 
                                            className={`absolute top-0 left-0 h-full ${clearComplete ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]'} transition-all duration-300 ease-linear`}
                                            style={{ width: `${clearProgress}%` }}
                                        >
                                            {!clearComplete && (
                                                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between w-full mb-8">
                                        <span className={`text-[13px] font-medium ${clearComplete ? 'text-emerald-400' : 'text-blue-400 animate-pulse'}`}>
                                            {clearComplete ? 'Optimization complete' : 'Clearing cache...'}
                                        </span>
                                        <span className="text-[13px] font-bold text-white">{clearProgress}%</span>
                                    </div>

                                    {clearComplete && (
                                        <button
                                            onClick={() => {
                                                setShowStorageModal(false);
                                                setClearComplete(false);
                                                setClearProgress(0);
                                            }}
                                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                                        >
                                            OK
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
