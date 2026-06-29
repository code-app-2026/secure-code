"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Shield, FileText, Search, UserIcon, Trash2, Calendar, Database, RefreshCcw } from 'lucide-react';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("ALL");
    
    // New states
    const [filterDate, setFilterDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage, setLogsPerPage] = useState(25);
    const [logToDelete, setLogToDelete] = useState<string | null>(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterAction, filterDate, logsPerPage]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await api.get('/logs');
            setLogs(data || []);
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDeleteLog = async () => {
        if (!logToDelete) return;
        try {
            await api.delete(`/logs/${logToDelete}`);
            setLogs(prev => prev.filter(l => l.id !== logToDelete));
        } catch (error) {
            console.error('Failed to delete log', error);
        } finally {
            setLogToDelete(null);
        }
    };

    const handleDeleteAllLogs = async () => {
        try {
            await api.delete('/logs/all');
            setLogs([]);
            setShowDeleteAllConfirm(false);
        } catch (error) {
            console.error('Failed to delete all logs', error);
            alert('Failed to delete all logs');
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const formatAbsoluteTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // Derived states
    const actionTypes = useMemo(() => {
        const types = new Set<string>();
        logs.forEach(l => types.add(l.action));
        return Array.from(types).sort();
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const matchesSearch = (l.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (l.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (l.ipAddress || '').includes(searchTerm);
            const matchesAction = filterAction === "ALL" || l.action === filterAction;
            
            let matchesDate = true;
            if (filterDate) {
                const logDate = new Date(l.createdAt);
                const year = logDate.getFullYear();
                const month = String(logDate.getMonth() + 1).padStart(2, '0');
                const day = String(logDate.getDate()).padStart(2, '0');
                const localDateStr = `${year}-${month}-${day}`;
                matchesDate = localDateStr === filterDate;
            }

            return matchesSearch && matchesAction && matchesDate;
        });
    }, [logs, searchTerm, filterAction, filterDate]);

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
    const currentLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

    const getActionColor = (action: string) => {
        if (action.includes('THREAT') || action.includes('BLOCKED') || action.includes('LOGOUT')) return 'red';
        if (action.includes('CREATE') || action.includes('LOGIN')) return 'emerald';
        if (action.includes('UPDATE')) return 'blue';
        if (action.includes('DELETE')) return 'orange';
        return 'slate';
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        let startPage = currentPage;
        let endPage = Math.min(startPage + 2, totalPages);

        if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - 2);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button 
                    key={i} 
                    onClick={() => setCurrentPage(i)} 
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${currentPage === i ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="flex items-center space-x-1.5">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                    disabled={currentPage === 1} 
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                >
                    &lt;
                </button>
                {pages}
                {endPage < totalPages && (
                    <>
                        <span className="text-slate-500 px-1 tracking-widest">.......</span>
                        <button 
                            onClick={() => setCurrentPage(totalPages)} 
                            className="px-3 py-1 text-sm font-medium rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            {totalPages}
                        </button>
                    </>
                )}
                <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                    disabled={currentPage === totalPages} 
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                >
                    &gt;
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#040814] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,_rgba(15,35,90,0.4),_transparent_50%),radial-gradient(circle_at_80%_70%,_rgba(10,25,70,0.3),_transparent_50%)]" />

            {/* Delete Modal */}
            {logToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040814]/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1121] border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center space-x-3 mb-4 text-red-400">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Delete Log Entry?</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Are you sure you want to permanently delete this audit log? This action cannot be undone and will remove it from the database completely.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setLogToDelete(null)} 
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                No, Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteLog} 
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-red-600/20 transition-colors"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete All Modal */}
            {showDeleteAllConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040814]/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1121] border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center space-x-3 mb-4 text-red-400">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Delete ALL Logs?</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Are you sure you want to permanently delete ALL audit logs? This action cannot be undone and will completely wipe the database log table.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setShowDeleteAllConfirm(false)} 
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteAllLogs} 
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-red-600/20 transition-colors"
                            >
                                Yes, Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminHeader />

            <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center">
                            <FileText className="w-6 h-6 mr-3 text-indigo-400" />
                            System Audit Logs
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Full system-wide audit trailing (who did what, when).</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => setShowDeleteAllConfirm(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium rounded-lg transition-colors shadow-lg"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete All Logs</span>
                        </button>
                        <button 
                            onClick={fetchLogs}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#0b1121] hover:bg-[#111a30] border border-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors shadow-lg"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>Refresh Logs</span>
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-[#0b1121] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-xl">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by username, details, or IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-lg leading-5 bg-[#050810] text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                        />
                    </div>
                    
                    <div className="md:w-48">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-800 rounded-lg leading-5 bg-[#050810] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors [color-scheme:dark]"
                        />
                    </div>

                    <div className="md:w-64">
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 border border-slate-800 rounded-lg leading-5 bg-[#050810] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors appearance-none"
                        >
                            <option value="ALL">All Actions</option>
                            {actionTypes.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-[#0b1121] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#060a16] border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider">IP Address</th>
                                    <th className="px-6 py-4 text-slate-400 text-xs font-semibold uppercase tracking-wider text-right">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                                            <RefreshCcw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-4 opacity-50" />
                                            <p className="text-sm">Loading audit logs...</p>
                                        </td>
                                    </tr>
                                ) : currentLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                                            <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                                                <Search className="w-6 h-6 opacity-50" />
                                            </div>
                                            <p className="text-slate-400">No logs match your search criteria.</p>
                                            <button onClick={() => { setSearchTerm(''); setFilterDate(''); setFilterAction('ALL'); }} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">Clear all filters</button>
                                        </td>
                                    </tr>
                                ) : (
                                    currentLogs.map((log) => {
                                        const color = getActionColor(log.action);
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-300 text-sm font-medium">{formatAbsoluteTime(log.createdAt)}</span>
                                                        <span className="text-slate-500 text-xs mt-0.5 flex items-center">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {formatRelativeTime(log.createdAt)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
                                                            <UserIcon className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-slate-300 font-medium text-sm">{log.username || 'System/Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md border bg-${color}-500/10 text-${color}-400 border-${color}-500/20 shadow-sm`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-400 text-sm max-w-md line-clamp-2" title={log.details}>
                                                        {log.details}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm font-mono">
                                                    {log.ipAddress?.replace(/^::ffff:/, '') || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button 
                                                        onClick={() => setLogToDelete(log.id)}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete log"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    <div className="px-6 py-4 border-t border-slate-800 bg-[#080d1a] flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Database className="w-4 h-4 text-indigo-500/70" />
                                <span>Showing {currentLogs.length > 0 ? (currentPage - 1) * logsPerPage + 1 : 0} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} results</span>
                            </div>
                            
                            <div className="flex items-center space-x-2 pl-4 border-l border-slate-800">
                                <label htmlFor="perPage" className="text-xs">Logs per page:</label>
                                <select 
                                    id="perPage"
                                    value={logsPerPage}
                                    onChange={(e) => setLogsPerPage(Number(e.target.value))}
                                    className="bg-[#050810] border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={75}>75</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        {renderPagination()}
                    </div>
                </div>
            </div>
        </div>
    );
}
