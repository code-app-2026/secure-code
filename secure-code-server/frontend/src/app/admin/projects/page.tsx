"use client";

import React, { useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import { Hexagon, Folder, Plus, Users, Settings, Eye, ChevronLeft, ChevronRight, ChevronDown, X, Edit, UserPlus, Box, Download, Rocket, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const FileTreeNode = ({ node, allowedFiles, onToggle }: { node: any, allowedFiles: string[], onToggle: (path: string) => void }) => {
    const isChecked = allowedFiles.includes(node.path);
    const [isOpen, setIsOpen] = useState(false);

    if (node.isDirectory) {
        return (
            <div className="ml-4">
                <div className="flex items-center space-x-2 text-[13px] text-slate-300 py-0.5">
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }} className="text-slate-400 hover:text-white transition-colors focus:outline-none">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggle(node.path)}
                        className="rounded w-3.5 h-3.5 bg-[#050810] border-slate-600 accent-blue-500 cursor-pointer"
                    />
                    <span className="cursor-pointer select-none hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}>{node.name}</span>
                </div>
                {isOpen && node.children && node.children.map((child: any) => (
                    <FileTreeNode key={child.path} node={child} allowedFiles={allowedFiles} onToggle={onToggle} />
                ))}
            </div>
        );
    }
    return (
        <div className="ml-4 flex items-center space-x-2 text-[13px] text-slate-300 py-0.5">
            <div className="w-4 h-4" />
            <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(node.path)}
                className="rounded w-3.5 h-3.5 bg-[#050810] border-slate-600 accent-blue-500 cursor-pointer ml-[2px]"
            />
            <span>{node.name}</span>
        </div>
    );
};

const formatRelativeTime = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
};

export default function ProjectsPage() {
    const router = useRouter();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
    const [openSettingsMenuId, setOpenSettingsMenuId] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showGitModal, setShowGitModal] = useState(false);
    const [gitUrl, setGitUrl] = useState('');
    const [gitBranch, setGitBranch] = useState('');
    const [isGitLoading, setIsGitLoading] = useState(false);
    const [gitProgress, setGitProgress] = useState<number | null>(null);
    const [gitError, setGitError] = useState('');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [activeProject, setActiveProject] = useState<any | null>(null);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [projects, setProjects] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newProjectName, setNewProjectName] = useState('');
    const [newMemberUsername, setNewMemberUsername] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [createError, setCreateError] = useState('');
    const [downloadingProjectId, setDownloadingProjectId] = useState<string | null>(null);

    const [newTerminalCommand, setNewTerminalCommand] = useState('');
    const [newFilePath, setNewFilePath] = useState('');
    const [fileTree, setFileTree] = useState<any[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(3);
    const [showPerPageDropdown, setShowPerPageDropdown] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const showAccessModalRef = React.useRef(showAccessModal);
    const showCreateModalRef = React.useRef(showCreateModal);
    
    React.useEffect(() => {
        showAccessModalRef.current = showAccessModal;
        showCreateModalRef.current = showCreateModal;
    }, [showAccessModal, showCreateModal]);

    React.useEffect(() => {
        fetchProjects();
        const interval = setInterval(() => {
            if (!showAccessModalRef.current && !showCreateModalRef.current) {
                fetchProjects();
            }
        }, 5000);
        fetchAllUsers();
        return () => clearInterval(interval);
    }, []);

    const fetchAllUsers = async () => {
        try {
            const res = await api.get('/users');
            setAllUsers(res || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchFileTree = async (projectId: string) => {
        try {
            const res = await api.get(`/editor/tree?projectId=${projectId}&recursive=true`);
            setFileTree(res || []);
        } catch (err) {
            console.error('Failed to fetch tree', err);
            setFileTree([]);
        }
    };

    const handleGitPull = async () => {
        if (!activeProject) return;
        setGitError('');

        if (!gitUrl) {
            setGitError('Please enter a GitHub or GitLab repository URL.');
            setTimeout(() => setGitError(''), 5000);
            return;
        }
        if (!gitBranch) {
            setGitError('Please select a branch to pull.');
            setTimeout(() => setGitError(''), 5000);
            return;
        }

        setIsGitLoading(true);
        setGitProgress(0);
        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            const response = await fetch(`/api/projects/${activeProject.id}/git-pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ url: gitUrl, branch: gitBranch })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'API request failed');
            }

            const reader = response.body?.getReader();
            if (reader) {
                const decoder = new TextDecoder();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(Boolean);
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.type === 'progress') {
                                setGitProgress(data.percentage);
                            } else if (data.type === 'error') {
                                setAlertMessage(data.message || 'Git clone failed. Please check the repository URL and branch.');
                                setIsGitLoading(false);
                                setGitProgress(null);
                                return;
                            } else if (data.type === 'complete') {
                                setShowGitModal(false);
                                setGitUrl('');
                                setGitBranch('');
                                setGitProgress(null);
                                fetchProjects();
                            }
                        } catch (e) {
                            // Ignore JSON parse errors for incomplete chunks
                        }
                    }
                }
            }
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to pull git repository');
        } finally {
            setIsGitLoading(false);
            setGitProgress(null);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleCreateProject = async () => {
        setCreateError('');
        if (!newProjectName.trim()) {
            setCreateError('Project name cannot be empty');
            return;
        }

        const exists = projects.some(p => p.name.toLowerCase() === newProjectName.trim().toLowerCase());

        if (modalMode === 'create') {
            if (exists) {
                setCreateError('Project name already exists');
                return;
            }
            try {
                await api.post('/projects', { name: newProjectName.trim() });
                setShowCreateModal(false);
                setNewProjectName('');
                fetchProjects();
            } catch (e: any) {
                console.error(e);
                setCreateError(e.message || 'Failed to create project');
            }
        } else if (modalMode === 'edit') {
            // Allow saving if the name hasn't changed (no-op)
            if (activeProject && newProjectName.trim().toLowerCase() === activeProject.name.toLowerCase()) {
                setShowCreateModal(false);
                setNewProjectName('');
                return;
            }
            if (exists) {
                setCreateError('Project name already exists');
                return;
            }
            try {
                if (activeProject?.id) {
                    await api.patch(`/projects/${activeProject.id}`, { name: newProjectName.trim() });
                    setShowCreateModal(false);
                    setNewProjectName('');
                    fetchProjects();
                }
            } catch (e: any) {
                console.error(e);
                setCreateError(e.message || 'Failed to rename project');
            }
        }
    };

    const handleDeleteProject = async () => {
        try {
            if (activeProject?.id) {
                await api.delete(`/projects/${activeProject.id}`);
                setShowDeleteModal(false);
                fetchProjects();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddMember = async () => {
        try {
            if (activeProject?.id && newMemberUsername) {
                await api.post(`/projects/${activeProject.id}/users/username`, { username: newMemberUsername });
                setNewMemberUsername('');
                await fetchProjects();
                // Update active project with the new fetched version
                const res = await api.get('/projects');
                const updatedProj = res.find((p: any) => p.id === activeProject.id);
                if (updatedProj) setActiveProject(updatedProj);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to add member: ' + (e as any).message);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            if (activeProject?.id) {
                await api.delete(`/projects/${activeProject.id}/users/${userId}`);
                await fetchProjects();
                // Update active project
                const res = await api.get('/projects');
                const updatedProj = res.find((p: any) => p.id === activeProject.id);
                if (updatedProj) setActiveProject(updatedProj);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject?.id) return;

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Send the file to the backend through the Next.js proxy
            await fetch(`/api/projects/${activeProject.id}/import`, {
                method: 'POST',
                headers: {
                    ...(document.cookie.includes('accessToken') 
                        ? { 'Authorization': `Bearer ${document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1]}` }
                        : {})
                },
                body: formData,
            });
            fetchProjects();
        } catch (err) {
            console.error('Import failed', err);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setOpenSettingsMenuId(null);
        }
    };

    const handleDownloadZip = async (project: any) => {
        try {
            setDownloadingProjectId(project.id);
            await api.download(`/projects/${project.id}/export`, `${project.name}.zip`);
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download project zip');
        } finally {
            setDownloadingProjectId(null);
            setOpenSettingsMenuId(null);
        }
    };

    const getActiveCommands = () => {
        if (!activeProject) return [];
        if (selectedMemberId && activeProject.memberRestrictions?.[selectedMemberId]) {
            return activeProject.memberRestrictions[selectedMemberId].allowedCommands || [];
        }
        return activeProject.allowedCommands || [];
    };

    const getActiveFiles = () => {
        if (!activeProject) return [];
        if (selectedMemberId && activeProject.memberRestrictions?.[selectedMemberId]) {
            return activeProject.memberRestrictions[selectedMemberId].allowedFiles || [];
        }
        return activeProject.allowedFiles || [];
    };

    const handleUpdateProjectAccess = async (updatedProject: any) => {
        try {
            await api.patch(`/projects/${updatedProject.id}`, {
                allowedCommands: updatedProject.allowedCommands,
                allowedFiles: updatedProject.allowedFiles,
                memberRestrictions: updatedProject.memberRestrictions
            });
            setActiveProject(updatedProject);
            setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
        } catch (e) {
            console.error('Failed to update project access', e);
        }
    };

    const handleAddCommand = () => {
        if (!newTerminalCommand.trim() || !activeProject) return;
        const updated = JSON.parse(JSON.stringify(activeProject));
        if (!updated.memberRestrictions) updated.memberRestrictions = {};
        
        if (selectedMemberId) {
            if (!updated.memberRestrictions[selectedMemberId]) {
                updated.memberRestrictions[selectedMemberId] = { allowedCommands: [], allowedFiles: [] };
            }
            if (updated.memberRestrictions[selectedMemberId].allowedCommands.includes(newTerminalCommand)) return;
            updated.memberRestrictions[selectedMemberId].allowedCommands.push(newTerminalCommand);
        } else {
            if (!updated.allowedCommands) updated.allowedCommands = [];
            if (updated.allowedCommands.includes(newTerminalCommand)) return;
            updated.allowedCommands.push(newTerminalCommand);
        }
        
        handleUpdateProjectAccess(updated);
        setNewTerminalCommand('');
    };

    const handleRemoveCommand = (cmd: string) => {
        if (!activeProject) return;
        const updated = JSON.parse(JSON.stringify(activeProject));
        if (!updated.memberRestrictions) updated.memberRestrictions = {};

        if (selectedMemberId && updated.memberRestrictions[selectedMemberId]) {
            updated.memberRestrictions[selectedMemberId].allowedCommands = updated.memberRestrictions[selectedMemberId].allowedCommands.filter((c: string) => c !== cmd);
        } else if (!selectedMemberId) {
            updated.allowedCommands = (updated.allowedCommands || []).filter((c: string) => c !== cmd);
        }
        handleUpdateProjectAccess(updated);
    };

    const handleAddFile = (pathStr?: string) => {
        let p = typeof pathStr === 'string' ? pathStr : newFilePath;
        if (!p.trim() || !activeProject) return;
        const updated = JSON.parse(JSON.stringify(activeProject));
        if (!updated.memberRestrictions) updated.memberRestrictions = {};
        
        if (selectedMemberId) {
            if (!updated.memberRestrictions[selectedMemberId]) {
                updated.memberRestrictions[selectedMemberId] = { allowedCommands: [], allowedFiles: [] };
            }
            if (updated.memberRestrictions[selectedMemberId].allowedFiles.includes(p)) return;
            updated.memberRestrictions[selectedMemberId].allowedFiles.push(p);
        } else {
            if (!updated.allowedFiles) updated.allowedFiles = [];
            if (updated.allowedFiles.includes(p)) return;
            updated.allowedFiles.push(p);
        }

        handleUpdateProjectAccess(updated);
        if (p === newFilePath) setNewFilePath('');
    };

    const handleRemoveFile = (pathStr: string) => {
        if (!activeProject) return;
        const updated = JSON.parse(JSON.stringify(activeProject));
        if (!updated.memberRestrictions) updated.memberRestrictions = {};

        if (selectedMemberId && updated.memberRestrictions[selectedMemberId]) {
            updated.memberRestrictions[selectedMemberId].allowedFiles = updated.memberRestrictions[selectedMemberId].allowedFiles.filter((f: string) => f !== pathStr);
        } else if (!selectedMemberId) {
            updated.allowedFiles = (updated.allowedFiles || []).filter((f: string) => f !== pathStr);
        }
        handleUpdateProjectAccess(updated);
    };

    const handleToggleFile = (pathStr: string) => {
        if (!activeProject) return;
        const files = getActiveFiles();
        if (files.includes(pathStr)) {
            handleRemoveFile(pathStr);
        } else {
            handleAddFile(pathStr);
        }
    };

    // Pagination Logic
    const totalProjects = projects.length;
    const totalPages = Math.ceil(totalProjects / itemsPerPage) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const startIndex = (validPage - 1) * itemsPerPage;
    const displayedProjects = projects.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="min-h-screen bg-[#050810] text-slate-200 font-sans">
            <AdminHeader />

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
                <div className="bg-[#0b1220] border border-slate-800/60 rounded-xl shadow-2xl">

                    {/* Table Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-slate-800/80 gap-4">
                        <div className="flex items-center space-x-3 bg-[#242646] px-5 py-2.5 rounded-lg border border-[#30335e]">
                            <Folder className="w-5 h-5 text-slate-300" strokeWidth={2} />
                            <span className="text-white font-medium text-[14px]">Projects</span>
                        </div>
                        <button
                            onClick={() => {
                                setModalMode('create');
                                setActiveProject(null);
                                setNewProjectName('');
                                setCreateError('');
                                setShowCreateModal(true);
                            }}
                            className="flex items-center space-x-2 bg-gradient-to-b from-[#5c3ceb] to-[#452ab5] hover:from-[#5135cf] hover:to-[#382294] text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-[0_4px_15px_rgba(92,60,235,0.3)] active:scale-[0.98]"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-[14px]">New Project</span>
                        </button>
                    </div>

                    <div className="w-full relative overflow-visible">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-800/80 text-[14px] text-slate-300 bg-[#070b14]">
                                    <th className="px-8 py-5 font-semibold tracking-wide">Project Name</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Storage</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Team</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Online</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Last Deploy</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Status</th>
                                    <th className="px-8 py-5 font-semibold tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedProjects.map((project, idx) => (
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

                                        {/* Storage */}
                                        <td className="px-8 py-6 text-[15px] text-slate-400">{formatBytes(Number(project.storageBytes) || 0)}</td>

                                        {/* Team */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-2">
                                                <Users className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
                                                <span className="text-[15px] font-medium text-slate-200">{project.users?.length || 0}</span>
                                            </div>
                                        </td>

                                        {/* Online */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${project.onlineUsers && project.onlineUsers > 0 ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                                                <span className={`text-[14px] font-medium ${project.onlineUsers && project.onlineUsers > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                                    {project.onlineUsers || 0} User{(project.onlineUsers || 0) === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Last Deploy */}
                                        <td className="px-8 py-6 text-[14px] text-slate-400">
                                            {project.lastDeploy ? formatRelativeTime(project.lastDeploy) : 'Never'}
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

                                        {/* Actions */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-4">

                                                {/* Settings Dropdown Container */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenSettingsMenuId(openSettingsMenuId === idx ? null : idx)}
                                                        className={`transition-colors focus:outline-none ${openSettingsMenuId === idx ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                                    >
                                                        <Settings className="w-5 h-5" strokeWidth={2} />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {openSettingsMenuId === idx && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-40"
                                                                onClick={() => setOpenSettingsMenuId(null)}
                                                            ></div>
                                                            <div className={`absolute right-0 w-48 max-h-[180px] overflow-y-auto bg-[#0a0f1c]/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-[60] animate-in fade-in zoom-in-95 duration-200 custom-scrollbar ${displayedProjects.length > 2 && idx >= displayedProjects.length - 2 ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'}`}>
                                                                <div className="py-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setModalMode('edit');
                                                                            setActiveProject(project);
                                                                            setNewProjectName(project.name);
                                                                            setCreateError('');
                                                                            setShowCreateModal(true);
                                                                            setOpenSettingsMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-[#141b2d] transition-colors"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                        <span>Edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveProject(project);
                                                                            setShowAccessModal(true);
                                                                            setOpenSettingsMenuId(null);
                                                                            fetchFileTree(project.id);
                                                                        }}
                                                                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-[#141b2d] transition-colors"
                                                                    >
                                                                        <UserPlus className="w-4 h-4" />
                                                                        <span>Add Member</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveProject(project);
                                                                            handleImportClick();
                                                                        }}
                                                                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-[#141b2d] transition-colors"
                                                                    >
                                                                        <Box className="w-4 h-4 text-blue-400" />
                                                                        <span>Import Project</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownloadZip(project)}
                                                                        disabled={downloadingProjectId === project.id}
                                                                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-[#141b2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {downloadingProjectId === project.id ? (
                                                                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
                                                                        ) : (
                                                                            <Download className="w-4 h-4" />
                                                                        )}
                                                                        <span>{downloadingProjectId === project.id ? 'Downloading...' : 'Download Zip'}</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveProject(project);
                                                                            setShowGitModal(true);
                                                                            setOpenSettingsMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-[#141b2d] transition-colors"
                                                                    >
                                                                        <Rocket className="w-4 h-4 text-orange-400" />
                                                                        <span>Github/Gitlab</span>
                                                                    </button>
                                                                    <div className="h-px bg-slate-800/80 my-1.5"></div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveProject(project);
                                                                            setShowDeleteModal(true);
                                                                            setOpenSettingsMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-[13.5px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        <span>Delete</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setLoadingProjectId(project.id);
                                                        router.push(`/developer/ide?projectId=${project.id}&projectName=${encodeURIComponent(project.name)}&asAdmin=true`);
                                                    }}
                                                    disabled={loadingProjectId === project.id}
                                                    className="flex items-center space-x-2 px-4 py-1.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-[#1e293b] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {loadingProjectId === project.id ? (
                                                        <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-white animate-spin" />
                                                    ) : (
                                                        <Eye className="w-4 h-4" />
                                                    )}
                                                    <span className="text-[13px] font-medium">{loadingProjectId === project.id ? 'Opening...' : 'View'}</span>
                                                </button>
                                            </div>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="flex items-center justify-between p-6 bg-[#090d19] border-t border-slate-800/80 rounded-b-xl relative">
                        <span className="text-[14px] text-slate-400">
                            Showing {totalProjects === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalProjects)} of {totalProjects} projects
                        </span>

                        <div className="flex flex-1 justify-center">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={validPage === 1}
                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${validPage === 1 ? 'bg-[#0b1220] border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-[#141b2d] border-slate-700 text-slate-400 hover:text-white'}`}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button className="w-9 h-9 rounded-lg bg-gradient-to-b from-[#5c3ceb] to-[#452ab5] text-white font-medium flex items-center justify-center shadow-[0_2px_10px_rgba(92,60,235,0.4)]">
                                    {validPage}
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={validPage >= totalPages}
                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${validPage >= totalPages ? 'bg-[#0b1220] border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-[#141b2d] border-slate-700 text-slate-400 hover:text-white'}`}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <div
                                onClick={() => setShowPerPageDropdown(!showPerPageDropdown)}
                                className="flex items-center space-x-3 border border-slate-700 bg-[#0b1220] rounded-lg px-4 py-2 cursor-pointer hover:bg-[#141b2d] transition-colors"
                            >
                                <span className="text-[13px] text-slate-300 font-medium">{itemsPerPage} per page</span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </div>

                            {showPerPageDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowPerPageDropdown(false)}></div>
                                    <div className="absolute right-0 bottom-full mb-2 w-full bg-[#0a0f1c] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                        {[3, 5, 10, 15, 25].map(num => (
                                            <div
                                                key={num}
                                                onClick={() => {
                                                    setItemsPerPage(num);
                                                    setCurrentPage(1);
                                                    setShowPerPageDropdown(false);
                                                }}
                                                className="px-4 py-2.5 hover:bg-[#141b2d] cursor-pointer text-[13px] text-slate-300 text-center transition-colors"
                                            >
                                                {num}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Hidden File Input for Zip */}
                    <input
                        type="file"
                        accept=".zip"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Upload Progress Overlay */}
                    {isUploading && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                            <div className="bg-[#0b1220] p-8 rounded-2xl border border-slate-700 max-w-sm w-full shadow-2xl flex flex-col items-center">
                                <Box className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
                                <h3 className="text-white text-lg font-bold mb-2">Importing Project...</h3>
                                <p className="text-slate-400 text-sm text-center mb-6">Please wait while we upload and extract your files to the server workspace.</p>

                                <div className="w-full bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
                                    <div className="bg-blue-500 h-2 rounded-full animate-[progress_2s_ease-in-out_infinite] w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    )}

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
            </div>

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 py-6">
                    <div className="w-full max-w-[480px] p-8 mx-4 bg-[#0a0f1c]/95 border border-slate-800/80 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col max-h-full overflow-y-auto">

                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setShowCreateModal(false);
                                setCreateError('');
                            }}
                            className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none bg-blue-500/10 p-1.5 rounded-full border border-blue-500/20"
                        >
                            <X className="w-5 h-5 text-blue-400" />
                        </button>

                        <h2 className="text-[22px] font-bold text-white mb-8 tracking-wide text-center mt-2">
                            {modalMode === 'edit' ? 'Edit Project' : 'Create Project'}
                        </h2>

                        <div className="w-full space-y-4">

                            {/* Project Name */}
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={newProjectName}
                                    onChange={(e) => {
                                        setNewProjectName(e.target.value);
                                        setCreateError('');
                                    }}
                                    className={`w-full bg-[#050810] border ${createError ? 'border-red-500/50' : 'border-slate-800/60'} rounded-xl px-4 py-3.5 text-[14px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner`}
                                />
                                {createError && <span className="text-red-500 text-[12px] mt-2 ml-1">{createError}</span>}
                            </div>

                        </div>

                        {/* Submit Button */}
                        <div className="w-full mt-8">
                            <button
                                onClick={handleCreateProject}
                                className="w-full py-4 bg-gradient-to-b from-[#1442a8] to-[#041133] hover:from-[#1b50c4] hover:to-[#081e55] border border-blue-500/20 text-white font-medium text-[15px] rounded-xl transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                            >
                                {modalMode === 'edit' ? 'Update' : 'Create'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-[400px] p-8 mx-4 bg-[#0a0f1c] border border-red-500/30 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.15)] relative flex flex-col items-center">

                        {/* Warning Icon */}
                        <div className="w-16 h-16 mt-2 mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={2} />
                        </div>

                        <h2 className="text-[24px] font-bold text-white mb-3 tracking-wide">Delete</h2>
                        <p className="text-center text-[14px] text-slate-400 mb-8 leading-relaxed">
                            Do you want to delete the project <span className="text-white font-semibold">{activeProject?.name}</span>?
                        </p>

                        {/* Buttons */}
                        <div className="flex w-full space-x-4">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3.5 bg-[#111827] hover:bg-[#1f2937] border border-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
                            >
                                No
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                className="flex-1 py-3.5 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border border-red-500/50 text-white font-semibold rounded-xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.3)] active:scale-[0.98]"
                            >
                                Yes
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Github/Gitlab Configuration Modal */}
            {showGitModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 py-6">
                    <div className="w-full max-w-[480px] p-8 mx-4 bg-[#0a0f1c]/95 border border-slate-800/80 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col">

                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setShowGitModal(false);
                                setGitUrl('');
                                setGitBranch('');
                                setGitError('');
                            }}
                            className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none bg-blue-500/10 p-1.5 rounded-full border border-blue-500/20"
                        >
                            <X className="w-5 h-5 text-blue-400" />
                        </button>

                        <h2 className="text-[20px] font-bold text-white mb-6 tracking-wide text-center mt-2">github/gitlab Configuration</h2>

                        {gitError && (
                            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span className="leading-tight">{gitError}</span>
                            </div>
                        )}

                        <div className="w-full space-y-4">

                            {/* URL */}
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    value={gitUrl}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setGitUrl(val);
                                        if (val.length > 0) {
                                            const isValid = /^git@(github\.com|gitlab\.com):[^\/]+\/[^\/]+/.test(val);
                                            if (!isValid) {
                                                setGitError('Invalid format. Please use a valid SSH URL (e.g. git@github.com:user/repo.git)');
                                                setTimeout(() => setGitError(''), 5000);
                                            } else {
                                                setGitError('');
                                            }
                                        } else {
                                            setGitError('');
                                        }
                                    }}
                                    placeholder="Git/Gitlab SSH URL (git@github.com:...)"
                                    className="w-full bg-[#050810] border border-slate-800/60 rounded-xl px-4 py-3.5 text-[14px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner"
                                />
                            </div>

                            {/* Branch Dropdown */}
                            <div className="flex flex-col relative">
                                <select
                                    value={gitBranch}
                                    onChange={(e) => setGitBranch(e.target.value)}
                                    className="w-full bg-[#050810] border border-slate-800/60 rounded-xl px-4 py-3.5 text-[14px] text-slate-200 focus:outline-none focus:border-blue-500/50 focus:bg-[#070b14] transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    <option value="" disabled hidden>Branch</option>
                                    <option value="main" className="bg-[#0b1220]">Main</option>
                                    <option value="master" className="bg-[#0b1220]">Master</option>
                                    <option value="test" className="bg-[#0b1220]">Test</option>
                                    <option value="dev" className="bg-[#0b1220]">Dev</option>
                                </select>
                                <div className="absolute right-4 top-[14px] pointer-events-none text-slate-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>

                        </div>

                        {/* Submit Button */}
                        <div className="w-full mt-8">
                            <button
                                onClick={handleGitPull}
                                disabled={isGitLoading}
                                className="w-full py-4 bg-gradient-to-b from-[#1442a8] to-[#041133] hover:from-[#1b50c4] hover:to-[#081e55] disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/20 text-white font-medium text-[15px] rounded-xl transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                            >
                                {isGitLoading ? `Cloning... ${gitProgress !== null ? gitProgress + '%' : ''}` : 'Clone'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Access Member Modal */}
            {showAccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 py-6">
                    <div className="w-full max-w-[1100px] p-8 mx-4 bg-[#0a0f1c]/95 border border-slate-800/80 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[95vh] overflow-hidden">

                        {/* Close Button */}
                        <button
                            onClick={() => { setShowAccessModal(false); setSelectedMemberId(null); }}
                            className="absolute top-6 right-6 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none bg-blue-500/10 p-1.5 rounded-full border border-blue-500/20"
                        >
                            <X className="w-5 h-5 text-blue-400" />
                        </button>

                        <h2 className="text-[24px] font-bold text-white mb-8 tracking-wide mt-2">Access Member</h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Member Column */}
                            <div className="border border-slate-700/60 rounded-xl p-5 relative pt-6 flex flex-col h-[500px]">
                                <span className="absolute -top-3 left-4 bg-[#0a0f1c] px-2 text-[14px] font-semibold text-slate-300">Member</span>

                                <div className="relative mb-6">
                                    <div className="flex items-center bg-[#050810] border border-slate-700/60 rounded-lg p-1.5">
                                        <input
                                            type="text"
                                            placeholder="Username"
                                            value={newMemberUsername}
                                            onChange={(e) => {
                                                setNewMemberUsername(e.target.value);
                                                setShowUserDropdown(true);
                                            }}
                                            onFocus={() => setShowUserDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                                            className="flex-1 bg-transparent border-none text-[13.5px] px-3 focus:outline-none text-slate-200"
                                        />
                                        <button
                                            onClick={handleAddMember}
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-[13px] px-5 py-2 rounded-md font-medium transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {/* Dropdown for matched users */}
                                    {showUserDropdown && newMemberUsername.trim() !== '' && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0f1c] border border-slate-700/60 rounded-lg shadow-lg z-50 overflow-hidden">
                                            {allUsers.filter(u => u.role !== 'Admin' && u.username.toLowerCase().includes(newMemberUsername.toLowerCase())).length > 0 ? (
                                                allUsers.filter(u => u.role !== 'Admin' && u.username.toLowerCase().includes(newMemberUsername.toLowerCase())).map(u => (
                                                    <div
                                                        key={u.id}
                                                        className="px-4 py-2 hover:bg-[#141b2d] cursor-pointer text-[13.5px] text-slate-300 transition-colors"
                                                        onClick={() => {
                                                            setNewMemberUsername(u.username);
                                                            setShowUserDropdown(false);
                                                        }}
                                                    >
                                                        {u.username} <span className="text-xs text-slate-500 ml-2">({u.role})</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-[13px] text-slate-500 text-center">Not found</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-2">
                                    {(activeProject as any)?.users?.map((user: any) => (
                                        <div key={user.id} onClick={() => setSelectedMemberId(user.id)} className={`flex items-center justify-between p-3.5 rounded-xl transition-colors border cursor-pointer ${selectedMemberId === user.id ? 'bg-[#1b2b4d] border-blue-500' : 'hover:bg-[#141b2d] border-transparent'}`}>
                                            <span className="text-[13.5px] text-slate-300">{user.username}</span>
                                            <div className="flex items-center space-x-4">
                                                <span className={`text-[13px] font-bold ${user.role === 'Viewer' ? 'text-blue-400' : 'text-slate-400'}`}>{user.role}</span>
                                                <Trash2
                                                    onClick={() => handleRemoveMember(user.id)}
                                                    className={`w-4 h-4 cursor-pointer ${user.role === 'Viewer' ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-400'}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {!(activeProject as any)?.users?.length && (
                                        <p className="text-slate-500 text-xs text-center mt-4">No members assigned.</p>
                                    )}
                                </div>
                            </div>

                            {/* Terminal Column */}
                            <div className="border border-slate-700/60 rounded-xl p-5 relative pt-6 flex flex-col h-[500px]">
                                <span className="absolute -top-3 left-4 bg-[#0a0f1c] px-2 text-[14px] font-semibold text-slate-300">Terminal</span>

                                <div className="flex items-center bg-[#050810] border border-slate-700/60 rounded-lg p-1.5 mb-6">
                                    <input type="text" value={newTerminalCommand} onChange={(e) => setNewTerminalCommand(e.target.value)} placeholder="Commands" className="flex-1 bg-transparent border-none text-[13.5px] px-3 focus:outline-none text-slate-200" />
                                    <button onClick={handleAddCommand} className="bg-blue-600 hover:bg-blue-500 text-white text-[13px] px-5 py-2 rounded-md font-medium transition-colors">Add</button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                    {getActiveCommands().map((cmd: string) => (
                                        <div key={cmd} className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b1220] border border-slate-800 transition-colors shadow-inner">
                                            <span className="text-[13px] text-slate-400 font-mono">{cmd}</span>
                                            <Trash2 onClick={() => handleRemoveCommand(cmd)} className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400 flex-shrink-0 ml-3" />
                                        </div>
                                    ))}
                                    {getActiveCommands().length === 0 && (
                                        <p className="text-slate-500 text-xs text-center mt-4">No restricted commands set.</p>
                                    )}
                                </div>
                            </div>

                            {/* File Column */}
                            <div className="border border-slate-700/60 rounded-xl p-5 relative pt-6 flex flex-col h-[500px]">
                                <span className="absolute -top-3 left-4 bg-[#0a0f1c] px-2 text-[14px] font-semibold text-slate-300">File</span>

                                <div className="flex items-center bg-[#050810] border border-slate-700/60 rounded-lg p-1.5 mb-4">
                                    <input type="text" value={newFilePath} onChange={(e) => setNewFilePath(e.target.value)} placeholder="Folder path" className="flex-1 bg-transparent border-none text-[13.5px] px-3 focus:outline-none text-slate-200" />
                                    <button onClick={() => handleAddFile()} className="bg-blue-600 hover:bg-blue-500 text-white text-[13px] px-5 py-2 rounded-md font-medium transition-colors">Add</button>
                                </div>

                                {/* File Tree */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4 pl-1 pr-2">
                                    {fileTree.length > 0 ? fileTree.map(node => (
                                        <FileTreeNode key={node.path} node={node} allowedFiles={getActiveFiles()} onToggle={handleToggleFile} />
                                    )) : (
                                        <div className="text-[13px] text-slate-500 italic ml-2">Loading workspace files...</div>
                                    )}
                                </div>

                                {/* Bottom List Item */}
                                <div className="space-y-2 mt-auto max-h-[100px] overflow-y-auto custom-scrollbar">
                                    {getActiveFiles().map((f: string) => (
                                        <div key={f} className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b1220] border border-slate-800 transition-colors shadow-inner">
                                            <span className="text-[12px] text-slate-400 font-mono truncate mr-2" title={f}>{f}</span>
                                            <Trash2 onClick={() => handleRemoveFile(f)} className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400 flex-shrink-0 ml-1" />
                                        </div>
                                    ))}
                                    {getActiveFiles().length === 0 && (
                                        <p className="text-slate-500 text-xs text-center mt-2">No file restrictions set.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* Themed Alert Modal */}
            {alertMessage && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="bg-[#1e1e1e] border border-[#333333] shadow-[0_8px_32px_rgba(0,0,0,0.8)] rounded-md w-[400px] overflow-hidden flex flex-col">
                        <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#333333]">
                            <div className="flex items-center space-x-2 text-red-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-[13px] font-medium text-[#cccccc]">Operation Blocked</span>
                            </div>
                            <X className="w-4 h-4 text-[#858585] cursor-pointer hover:text-[#cccccc]" onClick={() => setAlertMessage(null)} />
                        </div>
                        <div className="p-5 text-[13px] text-[#cccccc] leading-relaxed break-words whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                            {alertMessage}
                        </div>
                        <div className="px-4 py-3 bg-[#252526] border-t border-[#333333] flex justify-end">
                            <button
                                onClick={() => setAlertMessage(null)}
                                className="bg-[#0e639c] hover:bg-[#1177bb] text-white px-4 py-1.5 rounded text-[13px] font-medium transition-colors outline-none"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
