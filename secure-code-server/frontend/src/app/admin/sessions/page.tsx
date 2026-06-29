"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User, Video, Folder, Calendar, Activity, Trash2, X, AlertTriangle, Play, Pause, FastForward, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminHeader from '../../../components/AdminHeader';
import { api } from '../../../lib/api';

import 'rrweb-player/dist/style.css';

const formatTime = (ms: number) => {
    if (isNaN(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

interface RrwebPlayerWrapperProps {
    filename: string;
    onNext: () => void;
    onPrev: () => void;
    hasNext: boolean;
    hasPrev: boolean;
}

const RrwebPlayerWrapper: React.FC<RrwebPlayerWrapperProps> = ({ filename, onNext, onPrev, hasNext, hasPrev }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const replayerRef = useRef<any>(null);
    const rafRef = useRef<number>(null);
    
    const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'playing'>('loading');
    const [isPlaying, setIsPlaying] = useState(true);
    const [totalTime, setTotalTime] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [showOverlayIcon, setShowOverlayIcon] = useState<'play' | 'pause' | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setStatus('loading');
        setIsCompleted(false);

        const loadSession = async () => {
            try {
                const data = await api.get(`/logs/sessions/${filename}`);
                if (!isMounted) return;

                if (!Array.isArray(data) || data.length < 2) {
                    setStatus('empty');
                    return;
                }

                // Ensure events are perfectly chronological, otherwise playback will halt early or skip
                const sessionEvents = [...data].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

                if (sessionEvents.length < 2) {
                    setStatus('empty');
                    return;
                }

                // Dynamically import rrweb to avoid SSR issues
                const rrweb = await import('rrweb');
                
                if (containerRef.current && isMounted) {
                    setStatus('playing');
                    
                    // Allow UI to update to 'playing' state before mounting
                    setTimeout(() => {
                        if (containerRef.current) {
                            containerRef.current.innerHTML = '';
                            
                            const replayer = new rrweb.Replayer(sessionEvents, {
                                root: containerRef.current,
                                showWarning: false,
                                skipInactive: false,
                            });
                            
                            replayer.on('finish', () => {
                                if (isMounted) {
                                    setIsCompleted(true);
                                    setIsPlaying(false);
                                }
                            });
                            
                            replayerRef.current = replayer;
                            
                            const resizePlayer = () => {
                                if (!containerRef.current || !replayer.wrapper) return;
                                const wrapper = replayer.wrapper as HTMLElement;
                                
                                const metaEvent = sessionEvents.find((e: any) => e.type === 4);
                                let recordWidth = metaEvent?.data?.width;
                                let recordHeight = metaEvent?.data?.height;
                                
                                if (!recordWidth || !recordHeight) {
                                    recordWidth = parseInt(wrapper.style.width || '1920', 10);
                                    recordHeight = parseInt(wrapper.style.height || '1080', 10);
                                }
                                
                                const containerWidth = containerRef.current.clientWidth;
                                const containerHeight = containerRef.current.clientHeight;

                                if (containerWidth > 0 && containerHeight > 0 && recordWidth > 0 && recordHeight > 0) {
                                    // Scale to perfectly fit
                                    const scale = Math.min(containerWidth / recordWidth, containerHeight / recordHeight);
                                    
                                    wrapper.style.transform = `scale(${scale})`;
                                    wrapper.style.transformOrigin = 'top left';
                                    
                                    const scaledWidth = recordWidth * scale;
                                    const scaledHeight = recordHeight * scale;
                                    const left = (containerWidth - scaledWidth) / 2;
                                    const top = (containerHeight - scaledHeight) / 2;
                                    
                                    wrapper.style.position = 'absolute';
                                    wrapper.style.left = `${left}px`;
                                    wrapper.style.top = `${top}px`;
                                }
                            };

                            setTimeout(() => {
                                resizePlayer();
                                window.addEventListener('resize', resizePlayer);
                            }, 50);

                            replayerRef.current._cleanupResize = () => window.removeEventListener('resize', resizePlayer);

                            replayer.play();
                            setIsPlaying(true);
                            setSpeed(1); // Reset speed on new session

                            const meta = replayer.getMetaData();
                            setTotalTime(meta.totalTime || 0);

                            // Setup interval for progress bar updates (100ms is smooth enough and saves performance)
                            const intervalId = setInterval(() => {
                                if (replayerRef.current) {
                                    setCurrentTime(replayerRef.current.getCurrentTime());
                                }
                            }, 100);
                            
                            // Save interval ID to rafRef so it gets cleared on unmount
                            (rafRef as any).current = intervalId;
                        }
                    }, 50);
                }
            } catch (error) {
                console.error('Failed to load session data:', error);
                if (isMounted) setStatus('error');
            }
        };

        loadSession();

        return () => {
            isMounted = false;
            if (rafRef.current) clearInterval(rafRef.current as any);
            if (replayerRef.current) {
                try {
                    if (replayerRef.current._cleanupResize) replayerRef.current._cleanupResize();
                    replayerRef.current.pause();
                    replayerRef.current.destroy();
                } catch (e) {}
                replayerRef.current = null;
            }
        };
    }, [filename]);

    const togglePlay = () => {
        if (!replayerRef.current) return;
        
        if (isCompleted) {
            replayerRef.current.play(0);
            setIsCompleted(false);
            setIsPlaying(true);
            setShowOverlayIcon('play');
            setTimeout(() => setShowOverlayIcon(null), 800);
            return;
        }

        if (isPlaying) {
            replayerRef.current.pause();
            setIsPlaying(false);
            setShowOverlayIcon('pause');
        } else {
            replayerRef.current.play(currentTime);
            setIsPlaying(true);
            setShowOverlayIcon('play');
        }
        setTimeout(() => setShowOverlayIcon(null), 800);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!replayerRef.current || totalTime === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const targetTime = Math.floor(Math.max(0, Math.min(percent * totalTime, totalTime)));
        
        if (isCompleted) setIsCompleted(false);
        
        replayerRef.current.play(targetTime);
        setCurrentTime(targetTime);
        setIsPlaying(true);
    };

    const handleSpeedChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!replayerRef.current) return;
        const nextSpeed = speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 8 : 1;
        replayerRef.current.setConfig({ speed: nextSpeed });
        setSpeed(nextSpeed);
    };

    const handleNextClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (hasNext) {
            onNext();
        } else {
            // Replay from start
            if (replayerRef.current) {
                replayerRef.current.play(0);
                setCurrentTime(0);
                setIsPlaying(true);
            }
        }
    };

    const handlePrevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (hasPrev) {
            onPrev();
        } else {
            // Replay from start
            if (replayerRef.current) {
                replayerRef.current.play(0);
                setCurrentTime(0);
                setIsPlaying(true);
            }
        }
    };

    const progressPercent = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

    return (
        <div className="w-full h-full flex flex-col justify-center items-center overflow-hidden bg-[#050810] relative group">
            
            <style dangerouslySetInnerHTML={{__html: `
                .rrweb-replayer-container > div {
                    margin: 0 auto !important;
                }
            `}} />
            
            {/* Watermark Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <span className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-800/30 rotate-[-10deg] select-none whitespace-nowrap tracking-tighter">
                    Secure Code Server
                </span>
            </div>

            {status === 'loading' && (
                <div className="z-10 flex flex-col items-center justify-center bg-[#0a0f1c]/80 backdrop-blur-xl px-10 py-8 rounded-3xl border border-slate-700/50 shadow-2xl">
                    <div className="relative w-14 h-14 mb-5">
                        <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-blue-500 animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-r-2 border-b-2 border-indigo-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center"><Video className="w-5 h-5 text-blue-400" /></div>
                    </div>
                    <div className="text-slate-200 font-semibold text-sm animate-pulse tracking-wide">Loading Session...</div>
                    <div className="text-slate-500 text-xs mt-2">Fetching session geometry</div>
                </div>
            )}
            {status === 'empty' && (
                <div className="z-10 text-slate-500 text-sm flex flex-col items-center justify-center bg-[#0a0f1c]/80 backdrop-blur-xl px-8 py-6 rounded-2xl border border-slate-800">
                    <p>Session data is incomplete or empty.</p>
                    <p className="text-xs opacity-70 mt-1">The user may have closed the window immediately.</p>
                </div>
            )}
            {status === 'error' && (
                <div className="z-10 text-red-500 text-sm flex flex-col items-center justify-center bg-red-500/10 backdrop-blur-xl px-8 py-6 rounded-2xl border border-red-500/20">
                    <p>Failed to load session data.</p>
                </div>
            )}
            
            <div 
                className={`w-full h-full relative overflow-hidden ${status === 'playing' ? 'block' : 'hidden'}`}
                onClick={togglePlay}
            >
                <div 
                    ref={containerRef} 
                    className="absolute inset-0 flex justify-center items-center rrweb-replayer-container"
                ></div>

                {/* Big Center Overlay Icon */}
                {showOverlayIcon && !isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="w-24 h-24 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center animate-out fade-out zoom-out duration-700">
                            {showOverlayIcon === 'play' ? (
                                <Play className="w-12 h-12 text-white fill-white ml-2" />
                            ) : (
                                <Pause className="w-12 h-12 text-white fill-white" />
                            )}
                        </div>
                    </div>
                )}

                {/* Session Completed Overlay */}
                {isCompleted && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                            <Video className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="text-4xl font-bold text-white tracking-tight mb-2">Session Completed</h2>
                        <p className="text-slate-400 mb-8 max-w-sm text-center">You have reached the end of this recording.</p>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-colors flex items-center space-x-2"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span>Replay</span>
                            </button>
                            {hasNext && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                                    className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-full font-medium transition-colors flex items-center space-x-2"
                                >
                                    <span>Next Session</span>
                                    <SkipForward className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Control Bar (Auto-hide) */}
            {status === 'playing' && (
                <div className="absolute bottom-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out pb-2">
                    {/* Progress Bar Area */}
                    <div className="w-full h-4 bg-slate-800 cursor-pointer relative group" onClick={handleSeek}>
                        {/* Hover/Background bar */}
                        <div className="absolute inset-y-0 left-0 bg-blue-600/30 w-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {/* Active Progress */}
                        <div 
                            className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-75"
                            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                        >
                            {/* Scrubber Knob */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow translate-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>

                    {/* Controls Area */}
                    <div className="w-full h-14 flex items-center justify-between px-6">
                        {/* Left side: Playback controls */}
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={handlePrevClick}
                                className="text-slate-400 hover:text-white transition-colors"
                                title={hasPrev ? "Previous Session" : "Replay from Start"}
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>
                            
                            <button 
                                onClick={togglePlay}
                                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-lg"
                                title={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                            </button>

                            <button 
                                onClick={handleNextClick}
                                className="text-slate-400 hover:text-white transition-colors"
                                title={hasNext ? "Next Session" : "Replay from Start"}
                            >
                                <SkipForward className="w-5 h-5" />
                            </button>

                            <div className="text-slate-400 font-mono text-xs font-medium ml-4 border-l border-slate-700 pl-4">
                                <span className="text-white">{formatTime(currentTime)}</span>
                                <span className="mx-1">/</span>
                                <span>{formatTime(totalTime)}</span>
                            </div>
                        </div>

                        {/* Right side: Tools */}
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={handleSpeedChange}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-colors border border-slate-700 flex items-center space-x-1"
                                title="Playback Speed"
                            >
                                <FastForward className="w-3.5 h-3.5 mr-1" />
                                {speed}x
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function SessionsPage() {
    const [sessionsList, setSessionsList] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, any>>({});
    const [projectsMap, setProjectsMap] = useState<Record<string, any>>({});
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [activeSessionFilename, setActiveSessionFilename] = useState<string | null>(null);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch users to map IDs to usernames
                const users = await api.get('/users').catch(() => []);
                const uMap: Record<string, any> = {};
                users.forEach((u: any) => {
                    uMap[u.id] = u;
                });
                setUsersMap(uMap);

                // Fetch projects to map IDs to project names
                const projects = await api.get('/projects').catch(() => []);
                const pMap: Record<string, any> = {};
                projects.forEach((p: any) => {
                    pMap[p.id] = p;
                });
                setProjectsMap(pMap);

                // Fetch sessions
                const sessions = await api.get('/logs/sessions').catch(() => []);
                setSessionsList(sessions);
            } catch (error) {
                console.error("Failed to fetch sessions data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    // Group sessions by User ID
    const sessionsByUser = sessionsList.reduce((acc: any, session: any) => {
        if (!acc[session.userId]) acc[session.userId] = [];
        acc[session.userId].push(session);
        return acc;
    }, {});

    // For a specific user, we want to group their sessions by projectId
    const getProjectsForUser = (userId: string) => {
        const userSessions = sessionsByUser[userId] || [];
        const projectMap = userSessions.reduce((acc: any, session: any) => {
            const pId = session.projectId || 'Unknown Project';
            if (!acc[pId]) acc[pId] = 0;
            acc[pId]++;
            return acc;
        }, {});
        return Object.entries(projectMap).map(([projectId, count]) => ({ projectId, count }));
    };

    // Sort users by most recently active (most recent session first)
    const userIds = Object.keys(sessionsByUser).sort((a, b) => {
        const mostRecentA = sessionsByUser[a][0]?.updatedAt || 0;
        const mostRecentB = sessionsByUser[b][0]?.updatedAt || 0;
        return new Date(mostRecentB).getTime() - new Date(mostRecentA).getTime();
    });

    const handlePlaySession = (filename: string) => {
        setActiveSessionFilename(filename);
    };

    const handleDeleteSession = async () => {
        if (!sessionToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/logs/sessions/${sessionToDelete}`);
            setSessionsList(prev => prev.filter(s => s.filename !== sessionToDelete));
            if (activeSessionFilename === sessionToDelete) {
                setActiveSessionFilename(null);
            }
            setSessionToDelete(null);
        } catch (error) {
            console.error('Failed to delete session', error);
            alert('Failed to delete session');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteAllSessions = async () => {
        if (!selectedProjectId) return;
        
        try {
            await api.delete(`/logs/sessions/project/${selectedProjectId}`);
            setSessionsList(prev => prev.filter(s => s.projectId !== selectedProjectId));
            if (activeSessionFilename && displayedSessions.some((s: any) => s.filename === activeSessionFilename)) {
                setActiveSessionFilename(null);
            }
            setShowDeleteAllConfirm(false);
        } catch (error) {
            console.error('Failed to delete all sessions', error);
            alert('Failed to delete all sessions');
        }
    };

    // Calculate next/prev session availability
    const currentUserSessions = selectedUserId ? sessionsByUser[selectedUserId] || [] : [];
    const displayedSessions = selectedProjectId 
        ? currentUserSessions.filter((s: any) => s.projectId === selectedProjectId)
        : currentUserSessions;
        
    const activeIndex = displayedSessions.findIndex((s: any) => s.filename === activeSessionFilename);
    const hasNext = activeIndex !== -1 && activeIndex < displayedSessions.length - 1;
    const hasPrev = activeIndex > 0;

    const onNextSession = () => {
        if (hasNext) setActiveSessionFilename(displayedSessions[activeIndex + 1].filename);
    };

    const onPrevSession = () => {
        if (hasPrev) setActiveSessionFilename(displayedSessions[activeIndex - 1].filename);
    };

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-[#050b14] font-sans text-slate-300 flex flex-col">
            
            {/* Delete All Modal */}
            {showDeleteAllConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040814]/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1121] border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center space-x-3 mb-4 text-red-400">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Delete All Sessions?</h3>
                        </div>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Are you sure you want to permanently delete ALL sessions for project <span className="text-white font-medium">{projectsMap[selectedProjectId || '']?.name || selectedProjectId}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setShowDeleteAllConfirm(false)} 
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteAllSessions} 
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-red-600/20 transition-colors"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminHeader />

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-[calc(100vh-60px)] md:h-[calc(100vh-60px)]">
                
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-slate-100 flex items-center space-x-3">
                        <Video className="w-6 h-6 text-emerald-400" />
                        <span>Session Replays</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Watch recorded user interactions and workspace activities.
                    </p>
                </div>

                {/* 2-Column Studio Layout */}
                <div className="flex-1 flex flex-col md:flex-row gap-6 md:overflow-hidden min-h-[800px] md:min-h-0">
                    
                    {/* Left Sidebar: Developers List */}
                    <div className="w-full md:w-1/3 lg:w-1/4 bg-[#0b1121] border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl shrink-0 h-[300px] md:h-auto">
                        <div className="p-4 border-b border-slate-800 bg-[#080d1a]">
                            <h3 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                                <User className="w-4 h-4 text-blue-400" />
                                <span>Recorded Developers</span>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {userIds.length === 0 ? (
                                <div className="text-center py-10">
                                    <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                                    <p className="text-slate-500 text-xs">No users have active session recordings.</p>
                                </div>
                            ) : (
                                userIds.map(userId => {
                                    const user = usersMap[userId];
                                    const projects = getProjectsForUser(userId);
                                    const projectCount = projects.length;
                                    const sessionCount = sessionsByUser[userId].length;
                                    const isSelected = selectedUserId === userId;
                                    const isExpanded = expandedUserId === userId;

                                    return (
                                        <div key={userId} className={`rounded-xl border transition-all overflow-hidden ${isSelected ? 'bg-blue-500/10 border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]' : 'bg-transparent border-transparent'}`}>
                                            <button
                                                onClick={() => {
                                                    setSelectedUserId(userId);
                                                    setExpandedUserId(isExpanded ? null : userId);
                                                    setSelectedProjectId(null); // Clear selected project when toggling developer
                                                }}
                                                className={`w-full text-left p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${isSelected ? 'bg-[#0a0f1c] border-blue-500/50' : 'bg-slate-800 border-slate-700'}`}>
                                                        <span className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
                                                            {user ? user.username.charAt(0).toUpperCase() : userId.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                                                            {user ? user.username : `User ${userId.slice(0, 8)}`}
                                                        </p>
                                                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                                                            <span>{projectCount} Projects</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                            <span>{sessionCount} Sessions</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                            </button>
                                            
                                            {/* Dropdown Projects List */}
                                            <div 
                                                className={`transition-all duration-300 ease-in-out overflow-hidden bg-[#050810]/50`}
                                                style={{ maxHeight: isExpanded ? `${projects.length * 50 + 20}px` : '0' }}
                                            >
                                                <div className="p-2 space-y-1">
                                                    {projects.map((p, idx) => {
                                                        const isProjectSelected = selectedProjectId === p.projectId && isSelected;
                                                        const projectName = projectsMap[p.projectId]?.name || p.projectId;
                                                        
                                                        return (
                                                            <button 
                                                                key={idx} 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUserId(userId);
                                                                    setSelectedProjectId(p.projectId);
                                                                }}
                                                                className={`w-full text-left flex items-center justify-between p-2 rounded-lg transition-colors group cursor-pointer ${
                                                                    isProjectSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center space-x-2 min-w-0">
                                                                    <Folder className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                                                        isProjectSelected ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400'
                                                                    }`} />
                                                                    <span className={`text-xs truncate transition-colors ${
                                                                        isProjectSelected ? 'text-emerald-400 font-medium' : 'text-slate-400 group-hover:text-slate-300'
                                                                    }`}>
                                                                        {projectName}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                                                                    isProjectSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'
                                                                }`}>
                                                                    {String(p.count)} sessions
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Main Area: Sessions & Player */}
                    <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col gap-6 md:overflow-hidden h-[500px] md:h-auto">
                        
                        {/* Player Container */}
                        <div className="flex-1 bg-[#050810] border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl relative min-h-[400px]">
                            {!activeSessionFilename ? (
                                <div className="text-center flex flex-col items-center p-6">
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700">
                                        <Video className="w-8 h-8 text-slate-500 opacity-50" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-300">No Session Selected</h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-sm">
                                        Select a developer on the left, choose a project from the dropdown, then click a session to watch the playback.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative w-full h-full bg-white flex justify-center items-center overflow-hidden">
                                    <button 
                                        onClick={() => setActiveSessionFilename(null)}
                                        className="absolute top-4 right-4 z-50 w-8 h-8 bg-slate-900/60 hover:bg-red-500 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm"
                                        title="Close Player"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <RrwebPlayerWrapper 
                                        filename={activeSessionFilename} 
                                        onNext={onNextSession}
                                        onPrev={onPrevSession}
                                        hasNext={hasNext}
                                        hasPrev={hasPrev}
                                    />
                                </div>
                            )}
                        </div>

                        {/* User's Sessions List (Bottom Strip) */}
                        {selectedUserId && selectedProjectId && displayedSessions.length > 0 && (
                            <div className="h-auto min-h-[12rem] bg-[#0b1121] border border-slate-800 rounded-xl overflow-hidden flex flex-col shrink-0 relative group">
                                <div className="p-3 border-b border-slate-800 bg-[#080d1a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 z-10">
                                    <h3 className="text-xs font-medium text-slate-300 flex items-center space-x-2">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span className="line-clamp-2">
                                            Recent Sessions for {usersMap[selectedUserId]?.username || 'User'}
                                            {selectedProjectId && ` in ${projectsMap[selectedProjectId]?.name || selectedProjectId}`}
                                        </span>
                                    </h3>
                                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                                        <button 
                                            onClick={() => setShowDeleteAllConfirm(true)}
                                            className="flex items-center space-x-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-md transition-colors border border-red-500/20"
                                            title="Delete all sessions for this project"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete All</span>
                                        </button>
                                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                                            Newest First
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Left Scroll Button */}
                                {displayedSessions.length > 3 && (
                                    <button 
                                        onClick={scrollLeft}
                                        className="absolute left-2 top-1/2 mt-2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-blue-600 flex items-center justify-center backdrop-blur-sm shadow-xl opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                )}

                                <div 
                                    ref={scrollContainerRef}
                                    className="flex-1 overflow-x-auto p-4 flex gap-4 scrollbar-hide items-center scroll-smooth"
                                    style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                                >
                                    {displayedSessions.map((session: any, idx: number) => {
                                        const isPlaying = activeSessionFilename === session.filename;
                                        const projectName = projectsMap[session.projectId]?.name || session.projectId;
                                        
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handlePlaySession(session.filename)}
                                                className={`flex-shrink-0 w-64 text-left p-4 rounded-xl border transition-all h-full flex flex-col justify-between group ${
                                                    isPlaying 
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                        : 'bg-[#050810] border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-2 relative">
                                                        <span className={`text-[11px] font-medium truncate ${isPlaying ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                            {new Date(session.updatedAt).toLocaleString(undefined, {
                                                                month: 'short', day: 'numeric', year: 'numeric'
                                                            })}
                                                        </span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                                                {new Date(session.updatedAt).toLocaleTimeString(undefined, {
                                                                    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
                                                                })}
                                                            </span>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSessionToDelete(session.filename); }}
                                                                className="text-slate-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-800 transition-colors"
                                                                title="Delete Session"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5 text-slate-400 mt-3">
                                                        <Folder className="w-3.5 h-3.5" />
                                                        <span className="text-xs truncate" title={projectName}>{projectName}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/50">
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                        {(session.size / 1024).toFixed(1)} KB
                                                    </span>
                                                    {isPlaying ? (
                                                        <span className="text-[10px] font-medium text-emerald-400 flex items-center">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                                                            Playing
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-slate-500 group-hover:text-emerald-400 transition-colors flex items-center">
                                                            <Video className="w-3 h-3 mr-1" />
                                                            Play
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Right Scroll Button */}
                                {displayedSessions.length > 3 && (
                                    <button 
                                        onClick={scrollRight}
                                        className="absolute right-2 top-1/2 mt-2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-blue-600 flex items-center justify-center backdrop-blur-sm shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* --- DELETE CONFIRMATION MODAL --- */}
                {sessionToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#040814]/80 backdrop-blur-sm" onClick={() => setSessionToDelete(null)} />
                        <div className="relative w-full max-w-md bg-[#0b1121] border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <h2 className="text-lg font-medium text-slate-200">Delete Session?</h2>
                            </div>
                            <p className="text-slate-400 text-sm mb-6 pl-13">
                                Are you sure you want to permanently delete this session recording? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setSessionToDelete(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/50 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSession}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors flex items-center"
                                >
                                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{__html: `
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}} />
        </div>
    );
}
