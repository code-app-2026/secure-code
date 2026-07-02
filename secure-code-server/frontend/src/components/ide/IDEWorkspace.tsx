"use client";

import React, { useState, useEffect, useRef } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import {
  ChevronDown, ChevronRight, ChevronLeft, X, Plus, Terminal as TerminalIcon,
  Search, Type, Languages, Hash, FilePlus, FolderPlus,
  RefreshCw, ChevronUp, FileText, Code, FileCode, Info,
  CheckSquare, File as GenericFile, Settings, AlertTriangle, Columns,
  Users, Files, GitBranch, Download, Box, Rocket, Trash2, Eye
} from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import * as rrweb from 'rrweb';
import FileTree, { FileNode } from './FileTree';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

import OutputPane from './OutputPane';
import PortsPane, { ForwardedPort } from './PortsPane';
import { io as socketIo, Socket } from 'socket.io-client';

const TerminalPane = dynamic(() => import('./TerminalPane'), { ssr: false });

interface OpenFile {
  path: string;
  name: string;
  content: string;
  language?: string;
  isBinary?: boolean;
  originalContent?: string;
}

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  wordWrap: 'on' as const,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontLigatures: true,
  smoothScrolling: true,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  formatOnPaste: true,
  contextmenu: false, // Disable default Monaco context menu to enforce sandbox
};

export default function IDEWorkspace() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectName = searchParams.get('projectName') || 'APP';

  const [tree, setTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [showTerminalMenu, setShowTerminalMenu] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'output' | 'ports'>('terminal');
  const [systemLogs, setSystemLogs] = useState<string[]>(['IDE initialized. Workspace ready.']);
  const [forwardedPorts, setForwardedPorts] = useState<ForwardedPort[]>([]);
  const [userRole, setUserRole] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [restrictedFiles, setRestrictedFiles] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [renamingNodePath, setRenamingNodePath] = useState<string | null>(null);
  const [activeNodePaths, setActiveNodePaths] = useState<Set<string>>(new Set());
  const [activeFolderPath, setActiveFolderPath] = useState<string>('');
  const [refreshToggle, setRefreshToggle] = useState<number>(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, boolean>>({});
  const hasWorkspaceErrors = Object.values(fileErrors).some(v => v);

  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isDiffMode, setIsDiffMode] = useState(false);

  const activeFile = openFiles.find(f => f.path === activeFilePath) || null;
  const isViewer = userRole.toLowerCase() === 'viewer';
  // Admin is a read-only observer in the editor — they see real-time cursors but cannot edit
  const isAdmin = userRole.toLowerCase() === 'admin';

  const [terminals, setTerminals] = useState([{ id: 'term-1', active: true }]);
  const [showNewItemInput, setShowNewItemInput] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [fileClipboard, setFileClipboard] = useState<{ paths: string[]; action: 'copy' | 'cut' } | null>(null);

  // CI/CD Pipeline Simulation State
  const [pipelineStage, setPipelineStage] = useState<'code' | 'build' | 'test' | 'deploy' | 'live'>('code');
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);

  // Sidebar Navigation State
  const [activeSidebar, setActiveSidebar] = useState<'files' | 'search' | 'git' | 'activity'>('files');

  // Global Presence State
  const [activeUsers, setActiveUsers] = useState<Array<{ userId: string; username: string; role: string; activeFile: string | null }>>([]);
  const presenceSocketRef = useRef<Socket | null>(null);
  // Ref that always holds the latest activeFilePath — readable in socket callbacks without stale closures
  const activeFilePathRef = useRef<string | null>(null);

  // Keep ref in sync so socket callbacks always read latest path
  useEffect(() => {
    activeFilePathRef.current = activeFilePath;
  }, [activeFilePath]);

  // ── Dedicated Presence Socket (always-alive, independent of terminal) ────────
  useEffect(() => {
    if (!projectId || !accessToken) return;

    const defaultApiUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}/api`
      : 'http://localhost:3001';
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || defaultApiUrl;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      apiUrl = apiUrl.replace('http://', 'https://').replace('ws://', 'wss://').replace(':3001', '');
    }
    const backendUrl = apiUrl.replace('/api', '');

    const socket = socketIo(backendUrl, {
      query: { projectId, token: accessToken },
      transports: ['websocket'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });
    presenceSocketRef.current = socket;

    socket.on('connect', () => {
      // Use ref to read the CURRENT activeFilePath, not the stale closure value
      // (the socket connects before localStorage state is restored on first load)
      socket.emit('user.active_file', { activeFile: activeFilePathRef.current || null });
    });

    socket.on('project.activeUsers', (users: Array<{ userId: string; username: string; role: string; activeFile: string | null }>) => {
      setActiveUsers(users);
    });

    return () => {
      socket.disconnect();
      presenceSocketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, accessToken]);

  // Emit active file to presence socket whenever it changes.
  // Retries with backoff if socket is not yet connected (handles the race where
  // localStorage state is restored before the socket handshake completes).
  useEffect(() => {
    const socket = presenceSocketRef.current;
    if (!socket) return;

    if (socket.connected) {
      socket.emit('user.active_file', { activeFile: activeFilePath || null });
      return;
    }

    // Not connected yet — retry once the socket connects
    const onConnect = () => {
      socket.emit('user.active_file', { activeFile: activeFilePath || null });
    };
    socket.once('connect', onConnect);
    return () => { socket.off('connect', onConnect); };
  }, [activeFilePath]);


  const handleApiError = (action: string, err: any, itemName?: string) => {
    console.error(`Failed to ${action}`, err);
    const backendMessage = err.response?.data?.message || err.response?.data?.error || err.message;
    const msgStr = typeof backendMessage === 'string' ? backendMessage : JSON.stringify(backendMessage);

    const namePrefix = itemName ? `"${itemName}" ` : '';

    if (msgStr.toLowerCase().includes('restrict') || msgStr.toLowerCase().includes('denied')) {
      setAlertMessage(`${namePrefix}is restricted by the admin.`);
      window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: `Restricted File Operation Attempted: ${action} ${itemName || ''}` } }));
    } else if (msgStr.toLowerCase().includes('already exists') || msgStr.toLowerCase().includes('exists')) {
      setAlertMessage(`${namePrefix}already exists.`);
    } else {
      setAlertMessage(`Could not ${action} ${itemName ? `"${itemName}"` : 'item'}: ${msgStr || 'See console for details.'}`);
    }
  };

  const executeGitPush = async () => {
    if (!commitMessage.trim()) return;

    setShowCommitModal(false);
    if (isPipelineRunning) return;
    setIsPipelineRunning(true);
    setPipelineStage('deploy');

    try {
      await api.post('/editor/git/push', {
        projectId,
        commitMessage
      });
      setPipelineStage('deploy');
      setSystemLogs(prev => [...prev, `[Git] Successfully pushed with message: "${commitMessage}"`]);
      setCommitMessage('');

      // Simulate live deploy completion after a short delay
      setTimeout(() => {
        setPipelineStage('live');
        setIsPipelineRunning(false);
      }, 2000);

    } catch (err: any) {
      setIsPipelineRunning(false);
      setPipelineStage('code');
      setCommitMessage('');
      setAlertMessage(err?.message || 'Git push failed. Ensure backend has Git and access to the repository.');
    }
  };

  const startPipeline = () => {
    setShowCommitModal(true);
  };

  const terminalPanelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Yjs References
  const editorRef = useRef<any>(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const yDocRef = useRef<Y.Doc | null>(null);
  // Use a ref for userInfo so changes don't tear down the Yjs connection
  const userInfoRef = useRef<any>(null);

  // Panel sizes in percent
  const [sidebarWidth, setSidebarWidth] = useState(20);
  const [terminalHeight, setTerminalHeight] = useState(35);

  // Drag handlers for sidebar (horizontal)
  const startHDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const totalW = containerRef.current.offsetWidth;
      const delta = ((ev.clientX - startX) / totalW) * 100;
      setSidebarWidth(w => Math.min(60, Math.max(10, startW + delta)));
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Drag handlers for terminal (vertical)
  const startVDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;
    const onMove = (ev: MouseEvent) => {
      if (!mainAreaRef.current) return;
      const totalH = mainAreaRef.current.offsetHeight;
      const delta = (-(ev.clientY - startY) / totalH) * 100;
      setTerminalHeight(h => Math.min(85, Math.max(15, startH + delta)));
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const toggleTerminalMaximized = () => {
    setTerminalHeight(h => h > 70 ? 35 : 85);
  };

  const addTerminal = () => {
    const newId = `term-${Date.now()}`;
    setTerminals(prev => [...prev.map(t => ({ ...t, active: false })), { id: newId, active: true }]);
    setTerminalOpen(true);
  };

  const switchTerminal = (id: string) => {
    setTerminals(prev => prev.map(t => ({ ...t, active: t.id === id })));
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTerminals(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length > 0 && !filtered.find(t => t.active)) {
        filtered[filtered.length - 1].active = true;
      }
      return filtered;
    });
  };


  const handleCreateItem = async () => {
    if (!newItemName.trim()) {
      setShowNewItemInput(null);
      return;
    }
    try {
      const endpoint = showNewItemInput === 'file' ? '/editor/file/new' : '/editor/folder';
      const finalPath = activeFolderPath ? `${activeFolderPath}/${newItemName}` : newItemName;
      await api.post(endpoint, {
        path: finalPath,
        projectId: projectId || ''
      });
      setRefreshToggle(prev => prev + 1);
      const treeEndpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
      api.get(treeEndpoint).then(data => setTree(data)).catch(() => { });
    } catch (err: any) {
      handleApiError(`create ${showNewItemInput === 'file' ? 'file' : 'folder'}`, err, newItemName);
    } finally {
      setShowNewItemInput(null);
      setNewItemName('');
    }
  };

  const handleNodeSelect = (e: React.MouseEvent, node: FileNode) => {
    setActiveNodePaths(prev => {
      const next = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        if (next.has(node.path)) next.delete(node.path);
        else next.add(node.path);
      } else {
        next.clear();
        next.add(node.path);
      }
      return next;
    });

    if (node.isDirectory) {
      setActiveFolderPath(node.path);
    } else {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      setActiveFolderPath(parentPath);
    }
  };

  const handleContextMenuAction = async (action: string) => {
    if (!contextMenu || (isViewer && action !== 'open')) return;
    const { node } = contextMenu;
    setContextMenu(null);

    try {
      if (action === 'open') {
        if (!node.isDirectory) {
          handleFileClick(node);
        } else {
          const el = document.getElementById(`tree-node-${node.path}`);
          if (el) el.click();
        }
      } else if (action === 'copy' || action === 'cut') {
        const paths = Array.from(activeNodePaths);
        if (paths.length > 0) {
          setFileClipboard({ paths, action });
          setSystemLogs(prev => [...prev, `${action === 'copy' ? 'Copied' : 'Cut'}: ${paths.join(', ')}`]);
        }
      } else if (action === 'paste') {
        if (!fileClipboard || fileClipboard.paths.length === 0) return;
        const isCut = fileClipboard.action === 'cut';
        const targetDir = node.isDirectory ? node.path : node.path.substring(0, node.path.lastIndexOf('/'));

        try {
          await Promise.all(fileClipboard.paths.map(async (srcPath) => {
            const sourceName = srcPath.split('/').pop()!;
            const finalPath = targetDir ? `${targetDir}/${sourceName}` : sourceName;

            if (srcPath === finalPath) return;

            if (isCut) {
              await api.post('/editor/rename', { oldPath: srcPath, newPath: finalPath, projectId: projectId || '' });
            } else {
              await api.post('/editor/copy', { srcPath: srcPath, destPath: finalPath, projectId: projectId || '' });
            }
          }));

          if (isCut) setFileClipboard(null);
          setRefreshToggle(prev => prev + 1);
          const endpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
          const data = await api.get(endpoint);
          setTree(data);
        } catch (err: any) {
          handleApiError('paste items', err);
        }
      } else if (action === 'rename') {
        setRenamingNodePath(node.path);
      } else if (action === 'delete') {
        handleDeleteItem();
      }
    } catch (err: any) {
      handleApiError(action, err, node.name);
    }
  };

  const handleDeleteItem = async (targetNode?: FileNode) => {
    const pathsToDelete = targetNode ? [targetNode.path] : Array.from(activeNodePaths);
    if (pathsToDelete.length === 0) return;
    
    // SECURITY TRIGGER: Mass deletion or core folder deletion
    const isCoreFolder = pathsToDelete.some(p => 
      p === 'src' || p === 'backend' || p === 'frontend' || 
      p.endsWith('package.json') || p.endsWith('.env')
    );
    if (pathsToDelete.length > 3 || isCoreFolder) {
       window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: `Suspicious File Tree Deletion: ${pathsToDelete.join(', ')}` } }));
    }
    
    const msg = pathsToDelete.length === 1 ? `Are you sure you want to delete "${pathsToDelete[0].split('/').pop()}"?` : `Are you sure you want to delete ${pathsToDelete.length} items?`;

    setConfirmDialog({
      message: msg,
      onConfirm: async () => {
        try {
          await Promise.all(pathsToDelete.map(p => api.delete(`/editor/item?path=${encodeURIComponent(p)}&projectId=${projectId || ''}`)));
          const deletedSet = new Set(pathsToDelete);
          setOpenFiles(prev => prev.filter(f => !deletedSet.has(f.path)));
          setActiveNodePaths(new Set());
          setRefreshToggle(prev => prev + 1);
          const treeEndpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
          const data = await api.get(treeEndpoint);
          setTree(data);
          setSystemLogs(prev => [...prev, `Deleted: ${pathsToDelete.join(', ')}`]);
        } catch (err: any) {
          handleApiError('delete', err);
        }
      }
    });
  };

  const handleRenameCommit = async (oldPath: string, newName: string) => {
    setRenamingNodePath(null);
    const oldName = oldPath.split('/').pop();
    if (!newName || newName === oldName) return;

    try {
      const parentFolder = oldPath.split('/').slice(0, -1).join('/');
      const finalPath = parentFolder ? `${parentFolder}/${newName}` : newName;
      await api.post('/editor/rename', { oldPath: oldPath, newPath: finalPath, projectId: projectId || '' });

      setOpenFiles(prev => prev.map(f => f.path === oldPath ? { ...f, path: finalPath, name: newName } : f));
      if (activeFilePath === oldPath) setActiveFilePath(finalPath);

      setRefreshToggle(prev => prev + 1);
      const treeEndpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
      api.get(treeEndpoint).then(data => setTree(data)).catch(console.error);
    } catch (err: any) {
      handleApiError('rename', err, oldName);
    }
  };

  const handleRenameCancel = () => setRenamingNodePath(null);

  // ── Auto-Close Restricted Files ──────────────────────────────────────────────
  useEffect(() => {
    if (restrictedFiles.length === 0 || openFiles.length === 0) return;

    let filesToClose: string[] = [];
    for (const file of openFiles) {
      const isRestrictedPath = restrictedFiles.some(r => {
        const trimmedR = r.trim().replace(/\\/g, '/').replace(/\/$/, '');
        const normalizedNodePath = file.path.replace(/\\/g, '/').replace(/\/$/, '');
        return normalizedNodePath === trimmedR || 
        normalizedNodePath.startsWith(trimmedR + '/') || 
        normalizedNodePath.endsWith('/' + trimmedR) || 
        normalizedNodePath.includes('/' + trimmedR + '/');
      });
      if (isRestrictedPath) {
        filesToClose.push(file.path);
      }
    }

    if (filesToClose.length > 0) {
      setOpenFiles(prev => prev.filter(f => !filesToClose.includes(f.path)));
      if (activeFilePath && filesToClose.includes(activeFilePath)) {
        const remainingFiles = openFiles.filter(f => !filesToClose.includes(f.path));
        setActiveFilePath(remainingFiles.length > 0 ? remainingFiles[remainingFiles.length - 1].path : null);
      }
    }
  }, [restrictedFiles, openFiles, activeFilePath]);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // ── Workspace State Persistence (VS Code style) ─────────────────────────
  const stateKey = projectId ? `ide-workspace-${projectId}` : null;
  const hasRestoredState = useRef(false);

  // Save state to localStorage whenever anything meaningful changes
  useEffect(() => {
    if (!stateKey || !hasRestoredState.current) return;
    const state = {
      openFilePaths: openFiles.map(f => f.path),
      activeFilePath,
      terminalOpen,
      sidebarWidth,
      terminalHeight,
    };
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch { /* quota exceeded – ignore */ }
  }, [openFiles, activeFilePath, terminalOpen, sidebarWidth, terminalHeight, stateKey]);

  useEffect(() => {
    // Determine context based on URL
    const isViewerRoute = window.location.pathname.startsWith('/viewer');

    let currentUserRole = '';

    // Find all cookies
    const cookies = document.cookie.split('; ').reduce((acc, row) => {
      const [key, value] = row.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    if (isViewerRoute) {
      if (cookies['viewer_userRole']) { setUserRole(cookies['viewer_userRole']); currentUserRole = cookies['viewer_userRole']; }
      const token = sessionStorage.getItem('viewer_accessToken') || cookies['viewer_accessToken'];
      if (token) {
        setAccessToken(token);
        try {
          const parsed = JSON.parse(atob(token.split('.')[1]));
          setUserInfo(parsed);
          userInfoRef.current = parsed;
          if (parsed.role) { setUserRole(parsed.role); currentUserRole = parsed.role; }
        } catch (e) { }
      }
    } else {
      // Developer route - prioritize Admin ONLY if asAdmin=true is in URL, otherwise use Developer
      const isAsAdmin = window.location.search.includes('asAdmin=true');
      const devToken = sessionStorage.getItem('developer_accessToken') || cookies['developer_accessToken'];
      const adminToken = sessionStorage.getItem('admin_accessToken') || cookies['admin_accessToken'];
      const token = (isAsAdmin && adminToken) ? adminToken : devToken;
      if (token) {
        setAccessToken(token);
        try {
          const parsed = JSON.parse(atob(token.split('.')[1]));
          setUserInfo(parsed);
          userInfoRef.current = parsed;
          if (parsed.role) { setUserRole(parsed.role); currentUserRole = parsed.role; }
        } catch (e) { }
      }
    }
    
    let isDisposed = false;

    const fetchRestrictions = () => {
      if (projectId) {
        api.get(`/projects/${projectId}`).then(proj => {
          if (isDisposed) return;
          let files = [...(proj.allowedFiles || [])];
          
          if (proj.memberRestrictions) {
            let restrictions = proj.memberRestrictions;
            if (typeof restrictions === 'string') {
              try { restrictions = JSON.parse(restrictions); } catch(e) {}
            }
            
            if (currentUserRole !== 'Admin') {
              let userId = '';
              const token = isViewerRoute 
                ? (sessionStorage.getItem('viewer_accessToken') || cookies['viewer_accessToken'])
                : ((window.location.search.includes('asAdmin=true') && (sessionStorage.getItem('admin_accessToken') || cookies['admin_accessToken'])) 
                   ? (sessionStorage.getItem('admin_accessToken') || cookies['admin_accessToken']) 
                   : (sessionStorage.getItem('developer_accessToken') || cookies['developer_accessToken']));
              if (token) {
                try {
                  const parsed = JSON.parse(atob(token.split('.')[1]));
                  userId = parsed.sub || parsed.id;
                } catch (e) {}
              }
              if (userId && restrictions[userId]) {
                files = [...files, ...(restrictions[userId].allowedFiles || [])];
              }
            }
          }
          
          setRestrictedFiles(files);
        }).catch(() => {});
      }
    };

    const fetchFullTree = () => {
      const endpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
      api.get(endpoint).then(data => {
        if (isDisposed) return;
        setTree(data || []);
        setRefreshToggle(prev => prev + 1); // Triggers FileTree to also refresh expanded sub-folders
        if (projectId) {
          api.patch(`/projects/${projectId}/recalculate-storage`, {}).catch(() => {});
        }
      }).catch(err => console.error('Failed to fetch tree', err));
    };

    fetchFullTree();
    fetchRestrictions();
    
    // Fast poll ONLY for restrictions (2.5 seconds) - very lightweight DB check
    const restrictionsInterval = setInterval(fetchRestrictions, 2500);
    // Slow poll for full file tree (15 seconds) - heavy disk check
    const treeInterval = setInterval(fetchFullTree, 15000);

    // Initialize rrweb session recording - Event-Based 5 Minute Rolling Buffer
    let rrwebStopFn: any = null;
    let pruneInterval: any = null;
    let eventsBuffer: any[] = [];
    const currentSessionId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

    let flushTimeout: any = null;
    let pendingReason: string | null = null;

    const executeFlush = (reason: string, isUnload: boolean = false) => {
      const isThreat = reason && reason !== 'Manual Trigger' && !reason.includes('Manual Trigger (Unload)');
      
      if (eventsBuffer.length > 0 || isThreat) {
        let payload = [...eventsBuffer];
        eventsBuffer = []; // Clear buffer so subsequent flushes don't duplicate events
        
        // Calculate the raw stringified payload size
        const stringifiedEvents = JSON.stringify(payload);
        const sizeInBytes = new Blob([stringifiedEvents]).size;
        
        // Discard sessions smaller than 400KB (409,600 bytes) to save storage and prevent unplayable videos
        if (sizeInBytes < 409600) {
          if (!isThreat) {
            console.log(`Session discarded because it was only ${(sizeInBytes / 1024).toFixed(1)} KB (minimum 400 KB required)`);
            return;
          } else {
            // It IS a threat, but the video is too small to play. Send empty events so backend only saves the Threat Log.
            payload = [];
          }
        }

        const data = {
          projectId: projectId || 'default',
          sessionId: `${currentSessionId}_${Date.now()}`,
          events: payload,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          reason: reason
        };

        if (isUnload) {
            let apiUrl = '/api';
            apiUrl = apiUrl.replace('http://', 'https://').replace(':3001', '');
          
          try {
             // keepalive is limited to 64KB, which videos exceed. 
             // We just fire a regular async fetch. We pause the tab close via beforeunload UI prompt.
             fetch(`${apiUrl}/logs/session`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken || ''}`
                },
                body: JSON.stringify(data)
             }).catch(() => {});
          } catch (e) {
             console.error('Failed to flush on unload', e);
          }
        } else {
          api.post('/logs/session', data).catch(() => { });
        }
      }
    };

    const flushTriggeredEvents = (e?: any) => {
      if (currentUserRole === 'Admin') return; // Admins are exempt
      
      const reason = e?.detail?.reason || 'Manual Trigger';
      
      if (flushTimeout) {
        pendingReason = pendingReason ? `${pendingReason} | ${reason}` : reason;
        return; 
      }
      pendingReason = reason;

      // Flush immediately so the admin sees the log and video instantly
      flushTimeout = setTimeout(() => {
        executeFlush(pendingReason || 'Manual Trigger');
        flushTimeout = null;
        pendingReason = null;
      }, 0);
    };

    const handleBeforeUnload = (e?: BeforeUnloadEvent) => {
      if (flushTimeout) {
        clearTimeout(flushTimeout);
        executeFlush(pendingReason || 'Manual Trigger (Unload)', true);
        flushTimeout = null;
        pendingReason = null;
        
        if (e) {
          // Pause tab close so the fetch request has time to finish!
          e.preventDefault();
          e.returnValue = '';
          return '';
        }
      }
    };

    const startRecording = () => {
      if (currentUserRole === 'Admin') return;
      if (!rrwebStopFn) {
        try {
          rrwebStopFn = rrweb.record({
            recordCanvas: true,
            collectFonts: true,
            inlineImages: true,
            emit(event) {
              eventsBuffer.push(event);
            },
          });
        } catch (err) {
          console.warn("Could not start rrweb recording", err);
        }
      }
    };

    const stopRecording = () => {
      if (rrwebStopFn) {
        try {
          rrwebStopFn();
        } catch (e) {}
        rrwebStopFn = null;
      }
    };

    startRecording();

      // Prune events older than 5 minutes (300,000 ms)
      pruneInterval = setInterval(() => {
        const cutoff = Date.now() - (5 * 60 * 1000);
        // CRITICAL: We must NEVER delete the Meta (type 4) and FullSnapshot (type 2) events
        // otherwise rrweb Replayer will crash when trying to playback the session.
        eventsBuffer = eventsBuffer.filter(e => e.type === 2 || e.type === 4 || e.timestamp > cutoff);
      }, 10000); // Run pruner every 10 seconds

      // Listen for custom trigger events from anywhere in the app
      window.addEventListener('session-record-trigger', flushTriggeredEvents);

      // Keyboard interceptors for Screenshots / Print Dialog
      let metaHeld = false;
      let shiftHeld = false;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (currentUserRole === 'Admin') return;
        
        if (e.key === 'Meta' || e.key === 'OS') metaHeld = true;
        if (e.key === 'Shift') shiftHeld = true;

        let isScreenshot = false;
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen') isScreenshot = true;
        if (e.metaKey && e.shiftKey && ['3', '4', '5', 's', 'S'].includes(e.key)) isScreenshot = true;
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) isScreenshot = true;

        if (isScreenshot) {
          e.preventDefault();
          
          // INSTANT BLACKOUT on keydown to beat the OS screen freeze!
          if (!document.getElementById('security-blackout-screen')) {
            const blackout = document.createElement('div');
            blackout.id = 'security-blackout-screen';
            blackout.style.position = 'fixed';
            blackout.style.top = '0';
            blackout.style.left = '0';
            blackout.style.width = '100vw';
            blackout.style.height = '100vh';
            blackout.style.backgroundColor = '#000000';
            blackout.style.zIndex = '2147483647';
            blackout.style.display = 'flex';
            blackout.style.flexDirection = 'column';
            blackout.style.alignItems = 'center';
            blackout.style.justifyContent = 'center';
            blackout.innerHTML = `
              <div style="color: #ef4444; font-family: monospace; font-size: 24px; font-weight: bold; margin-bottom: 16px;">
                [SECURITY ALERT]
              </div>
              <div style="color: #94a3b8; font-family: sans-serif; font-size: 14px; margin-bottom: 24px;">
                Screen capture tools and backgrounding are prohibited.
              </div>
              <div style="color: #ffffff; font-family: sans-serif; font-size: 16px; font-weight: bold; cursor: pointer; padding: 12px 24px; border: 1px solid #ef4444; border-radius: 6px; background-color: rgba(239, 68, 68, 0.1);">
                Click anywhere to return to the IDE
              </div>
            `;
            
            // Require a click to dismiss
            blackout.onclick = () => {
              blackout.remove();
            };
            
            document.body.appendChild(blackout);
          }
          
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('').catch(() => {});
          }
          
          setAlertMessage("Cannot take Screen Shot due to the security policy.");
          window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: `Screen Capture Attempt: ${e.key}` } }));
        }
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
        if (currentUserRole === 'Admin') return;

        if (e.key === 'Meta' || e.key === 'OS') metaHeld = false;
        if (e.key === 'Shift') shiftHeld = false;

        let isScreenshot = false;
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen') isScreenshot = true;

        if (isScreenshot) {
          e.preventDefault();
          
          if (!document.getElementById('security-blackout-screen')) {
            const blackout = document.createElement('div');
            blackout.id = 'security-blackout-screen';
            blackout.style.position = 'fixed';
            blackout.style.top = '0';
            blackout.style.left = '0';
            blackout.style.width = '100vw';
            blackout.style.height = '100vh';
            blackout.style.backgroundColor = '#000000';
            blackout.style.zIndex = '2147483647';
            blackout.style.display = 'flex';
            blackout.style.flexDirection = 'column';
            blackout.style.alignItems = 'center';
            blackout.style.justifyContent = 'center';
            blackout.innerHTML = `
              <div style="color: #ef4444; font-family: monospace; font-size: 24px; font-weight: bold; margin-bottom: 16px;">
                [SECURITY ALERT]
              </div>
              <div style="color: #94a3b8; font-family: sans-serif; font-size: 14px; margin-bottom: 24px;">
                Screen capture tools and backgrounding are prohibited.
              </div>
              <div style="color: #ffffff; font-family: sans-serif; font-size: 16px; font-weight: bold; cursor: pointer; padding: 12px 24px; border: 1px solid #ef4444; border-radius: 6px; background-color: rgba(239, 68, 68, 0.1);">
                Click anywhere to return to the IDE
              </div>
            `;
            
            blackout.onclick = () => {
              blackout.remove();
            };
            
            document.body.appendChild(blackout);
          }
          
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('').catch(() => {});
          }
          
          setAlertMessage("Cannot take Screen Shot due to the security policy.");
          window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: `Screen Capture Attempt: ${e.key}` } }));
        }
      };

      // Detect Windows Snipping Tool taking focus
      const handleBlur = () => {
        if (currentUserRole === 'Admin') return;
        
        // Stop session recording completely while tabbed out
        stopRecording();

        // Auto-blackout on ANY blur to block taskbar scissor icon
        if (!document.getElementById('security-blackout-screen')) {
          const blackout = document.createElement('div');
          blackout.id = 'security-blackout-screen';
          blackout.style.position = 'fixed';
          blackout.style.top = '0';
          blackout.style.left = '0';
          blackout.style.width = '100vw';
          blackout.style.height = '100vh';
          blackout.style.backgroundColor = '#000000';
          blackout.style.zIndex = '2147483647';
          blackout.style.display = 'flex';
          blackout.style.flexDirection = 'column';
          blackout.style.alignItems = 'center';
          blackout.style.justifyContent = 'center';
          blackout.innerHTML = `
            <div style="color: #ef4444; font-family: monospace; font-size: 24px; font-weight: bold; margin-bottom: 16px;">
              [SECURITY ALERT]
            </div>
            <div style="color: #94a3b8; font-family: sans-serif; font-size: 14px; margin-bottom: 24px;">
              Screen is hidden while out of focus to prevent background capturing.
            </div>
            <div style="color: #ffffff; font-family: sans-serif; font-size: 16px; font-weight: bold; cursor: pointer; padding: 12px 24px; border: 1px solid #ef4444; border-radius: 6px; background-color: rgba(239, 68, 68, 0.1); transition: all 0.2s;" onmouseover="this.style.backgroundColor='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.backgroundColor='rgba(239, 68, 68, 0.1)'">
              Click anywhere to Continue
            </div>
          `;
          
          blackout.onclick = () => {
            blackout.remove();
          };
          
          document.body.appendChild(blackout);
        }

        /* 
        // ONLY log if they used the actual Snipping tool keyboard shortcut
        if (metaHeld && shiftHeld) {
          window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: `External Snipping Tool Overlay Detected` } }));
        }
        */
      };

      const handleFocus = () => {
        // Resume session recording
        startRecording();

        // We DO NOT automatically remove the blackout screen anymore. The user MUST click to dismiss it.


        // Aggressively wipe clipboard when returning to the IDE to destroy any snip they just took!
        if (currentUserRole !== 'Admin') {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('').catch(() => {});
          }
        }
      };

      // Allow Minimizing / Tab Switching without logging
      const handleVisibilityChange = () => {
        // We no longer trigger blackout or logs on normal tab switching
      };

      // Intercept browser extension screen recorders
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = async (constraints) => {
          window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: `Browser Extension Screen Recording Started` } }));
          return originalGetDisplayMedia(constraints);
        };
      }

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Cleanup
      (window as any)._rrwebCleanup = () => {
        window.removeEventListener('session-record-trigger', flushTriggeredEvents);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        const blackout = document.getElementById('security-blackout-screen');
        if (blackout) blackout.remove();
        if (flushTimeout) clearTimeout(flushTimeout);
      };
    // Listen to custom terminal pipeline events
    const handlePipelineEvent = (e: any) => {
      if (isViewer) return;
      const newStage = e.detail;
      setPipelineStage(newStage);
    };
    window.addEventListener('pipeline-state-change', handlePipelineEvent);

    // Restore saved workspace state
    if (!stateKey) {
      hasRestoredState.current = true;
      return;
    }
    let savedState: { openFilePaths?: string[]; activeFilePath?: string | null; terminalOpen?: boolean; sidebarWidth?: number; terminalHeight?: number } | null = null;
    try {
      const raw = localStorage.getItem(stateKey);
      if (raw) savedState = JSON.parse(raw);
    } catch { savedState = null; }

    if (!savedState) {
      hasRestoredState.current = true;
      return;
    }

    // Restore panel sizes immediately (no async needed)
    if (typeof savedState.sidebarWidth === 'number') setSidebarWidth(savedState.sidebarWidth);
    if (typeof savedState.terminalHeight === 'number') setTerminalHeight(savedState.terminalHeight);
    if (typeof savedState.terminalOpen === 'boolean') setTerminalOpen(savedState.terminalOpen);

    // Re-open files from saved paths
    const pathsToRestore = savedState.openFilePaths || [];
    const savedActivePath = savedState.activeFilePath || null;
    if (pathsToRestore.length === 0) {
      hasRestoredState.current = true;
      return;
    }

    Promise.all(
      pathsToRestore.map(async (filePath) => {
        try {
          const fileExt = filePath.split('.').pop() || '';
          if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(fileExt.toLowerCase())) {
            let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
              apiUrl = apiUrl.replace('http://', 'https://').replace(':3001', '');
            }
            const url = `${apiUrl}/editor/file-blob?path=${encodeURIComponent(filePath)}&projectId=${projectId}`;
            const resp = await fetch(url);
            const blob = await resp.blob();
            const objectUrl = URL.createObjectURL(blob);
            const name = filePath.split('/').pop() || filePath;
            return { path: filePath, name, content: objectUrl, isBinary: true, originalContent: '' } as OpenFile;
          } else {
            const ep = projectId
              ? `/editor/file?path=${encodeURIComponent(filePath)}&projectId=${projectId}`
              : `/editor/file?path=${encodeURIComponent(filePath)}`;
            const data = await api.get(ep);
            const name = filePath.split('/').pop() || filePath;
            const n = name.toLowerCase();
            let language = 'plaintext';
            if (n.endsWith('.ts') || n.endsWith('.tsx')) language = 'typescript';
            else if (n.endsWith('.js') || n.endsWith('.jsx')) language = 'javascript';
            else if (n.endsWith('.json')) language = 'json';
            else if (n.endsWith('.md')) language = 'markdown';
            else if (n.endsWith('.html') || n.endsWith('.htm')) language = 'html';
            else if (n.endsWith('.css')) language = 'css';
            else if (n.endsWith('.py')) language = 'python';
            else if (n.endsWith('.java')) language = 'java';
            else if (n.endsWith('.c') || n.endsWith('.h')) language = 'c';
            else if (n.endsWith('.cpp') || n.endsWith('.cc') || n.endsWith('.cxx')) language = 'cpp';
            else if (n.endsWith('.cs')) language = 'csharp';
            else if (n.endsWith('.go')) language = 'go';
            else if (n.endsWith('.rs')) language = 'rust';
            else if (n.endsWith('.php')) language = 'php';
            else if (n.endsWith('.rb')) language = 'ruby';
            else if (n.endsWith('.sql')) language = 'sql';
            else if (n.endsWith('.xml')) language = 'xml';
            else if (n.endsWith('.yaml') || n.endsWith('.yml')) language = 'yaml';
            else if (n.endsWith('.sh') || n.endsWith('.bash')) language = 'shell';
            else if (n.endsWith('.dockerfile') || n === 'dockerfile') language = 'dockerfile';
            else if (n.endsWith('.graphql') || n.endsWith('.gql')) language = 'graphql';
            else if (n.endsWith('.kt') || n.endsWith('.kts')) language = 'kotlin';
            else if (n.endsWith('.swift')) language = 'swift';
            return { path: filePath, name, content: data.content, originalContent: data.content, language } as OpenFile;
          }
        } catch {
          return null; // File may have been deleted — silently skip
        }
      })
    ).then(results => {
      const validFiles = results.filter(Boolean) as OpenFile[];
      if (validFiles.length > 0) {
        setOpenFiles(validFiles);
        // Restore active tab — default to last valid file if saved path is gone
        const restoredActive = savedActivePath && validFiles.find(f => f.path === savedActivePath)
          ? savedActivePath
          : validFiles[validFiles.length - 1].path;
        setActiveFilePath(restoredActive);
        if (restoredActive) {
          setActiveNodePaths(new Set([restoredActive]));
        }
      }
      hasRestoredState.current = true;
    }).catch(() => {
      hasRestoredState.current = true;
    });

    return () => {
      isDisposed = true;
      clearInterval(restrictionsInterval);
      clearInterval(treeInterval);
      if (pruneInterval) clearInterval(pruneInterval);
      if (rrwebStopFn) rrwebStopFn();
      handleBeforeUnload(); // force flush if unmounting while waiting
      if ((window as any)._rrwebCleanup) (window as any)._rrwebCleanup();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [projectId]);


  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory) return;

    const alreadyOpen = openFiles.find(f => f.path === node.path);
    if (alreadyOpen) {
      setActiveNodePaths(new Set([node.path]));
      setActiveFilePath(node.path);
      return;
    }

    try {
      const fileExt = node.path.split('.').pop() || '';

      if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(fileExt.toLowerCase())) {
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
          apiUrl = apiUrl.replace('http://', 'https://').replace(':3001', '');
        }
        const url = `${apiUrl}/editor/file-blob?path=${encodeURIComponent(node.path)}&projectId=${projectId}`;
        const resp = await fetch(url);
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);

        const newFile: OpenFile = { path: node.path, name: node.name, content: objectUrl, isBinary: true, originalContent: '' };
        setOpenFiles(prev => {
          if (prev.find(f => f.path === node.path)) return prev;
          return [...prev, newFile];
        });
        setActiveNodePaths(new Set([node.path]));
        setActiveFilePath(node.path);
        setSystemLogs(prev => [...prev, `Opened binary file: ${node.name}`]);
      } else {
        const endpoint = projectId
          ? `/editor/file?path=${encodeURIComponent(node.path)}&projectId=${projectId}`
          : `/editor/file?path=${encodeURIComponent(node.path)}`;
        const data = await api.get(endpoint);

        let language = 'plaintext';
        const name = node.name.toLowerCase();
        if (name.endsWith('.ts') || name.endsWith('.tsx')) language = 'typescript';
        else if (name.endsWith('.js') || name.endsWith('.jsx')) language = 'javascript';
        else if (name.endsWith('.json') || name.endsWith('.ipynb')) language = 'json';
        else if (name.endsWith('.md')) language = 'markdown';
        else if (name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.vue') || name.endsWith('.svelte')) language = 'html';
        else if (name.endsWith('.css')) language = 'css';
        else if (name.endsWith('.py')) language = 'python';
        else if (name.endsWith('.java')) language = 'java';
        else if (name.endsWith('.c') || name.endsWith('.h')) language = 'c';
        else if (name.endsWith('.cpp') || name.endsWith('.hpp') || name.endsWith('.cc') || name.endsWith('.cxx')) language = 'cpp';
        else if (name.endsWith('.cs')) language = 'csharp';
        else if (name.endsWith('.go')) language = 'go';
        else if (name.endsWith('.rs')) language = 'rust';
        else if (name.endsWith('.php')) language = 'php';
        else if (name.endsWith('.rb')) language = 'ruby';
        else if (name.endsWith('.sql')) language = 'sql';
        else if (name.endsWith('.xml')) language = 'xml';
        else if (name.endsWith('.yaml') || name.endsWith('.yml')) language = 'yaml';
        else if (name.endsWith('.sh') || name.endsWith('.bash')) language = 'shell';
        else if (name.endsWith('.dockerfile') || name === 'dockerfile') language = 'dockerfile';
        else if (name.endsWith('.graphql') || name.endsWith('.gql')) language = 'graphql';
        else if (name.endsWith('.kt') || name.endsWith('.kts')) language = 'kotlin';
        else if (name.endsWith('.swift')) language = 'swift';

        const newFile: OpenFile = {
          path: node.path,
          name: node.name,
          content: data.content,
          originalContent: data.content,
          language
        };

        setOpenFiles(prev => [...prev, newFile]);
        setActiveNodePaths(new Set([node.path]));
        setActiveFilePath(node.path);
        setSystemLogs(prev => [...prev, `Opened file: ${node.name}`]);
      }
    } catch (err: any) {
      handleApiError('open file', err, node.name);
    }
  };

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newOpen = openFiles.filter(f => f.path !== path);
    setOpenFiles(newOpen);
    if (activeNodePaths.has(path)) {
      const nextActive = newOpen.length > 0 ? newOpen[newOpen.length - 1].path : null;
      setActiveNodePaths(nextActive ? new Set([nextActive]) : new Set());
      setActiveFilePath(nextActive);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFile || value === undefined) return;

    if (!isViewer && pipelineStage !== 'code' && value !== activeFile.content) {
      setPipelineStage('code');
    }

    setOpenFiles(prev => prev.map(f => {
      if (f.path === activeFilePath) {
        return { ...f, content: value };
      }
      return f;
    }));
  };

  const handleSave = async () => {
    if (!activeFile || isViewer) return;
    try {
      await api.post('/editor/file', {
        projectId,
        path: activeFile.path,
        content: activeFile.content
      });
      setOpenFiles(prev => prev.map(f =>
        f.path === activeFile.path ? { ...f, originalContent: activeFile.content } : f
      ));
    } catch (err: any) {
      handleApiError('save file', err, activeFile.name);
    }
  };

  // Keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, isViewer]);

  // Global Copy/Paste Interception
  useEffect(() => {
    // Sandbox navigator.clipboard so Monaco cannot use the modern Clipboard API to bypass the sandbox
    const mockClipboard = {
      writeText: async (text: string) => {
        (window as any).__internalClipboard = { text, source: 'editor' };
        return Promise.resolve();
      },
      readText: async () => {
        const clip = (window as any).__internalClipboard;
        return Promise.resolve(clip ? clip.text : '');
      }
    };

    // Correctly mock the Clipboard API by patching its prototype, as navigator.clipboard is read-only
    if (typeof window !== 'undefined' && (window as any).Clipboard) {
      const ClipboardProto = (window as any).Clipboard.prototype;
      ClipboardProto.writeText = mockClipboard.writeText;
      ClipboardProto.readText = mockClipboard.readText;
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // Fallback for older browsers
      try {
        (navigator.clipboard as any).writeText = mockClipboard.writeText;
        (navigator.clipboard as any).readText = mockClipboard.readText;
      } catch (e) { }
    }

    // Apply to ALL roles (including admin), and immediately on mount.
    // This sandboxes the IDE so code cannot leak to the host OS.
    const blockEvent = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation(); // Ensure no native OS clipboard access outside sandbox

      const target = e.target as HTMLElement;

      // If we are copying/cutting, grab the active selection we've been tracking
      if (e.type === 'copy' || e.type === 'cut') {
        const termSel = (window as any).__currentTerminalSelection;
        const edSel = (window as any).__currentEditorSelection;

        // Determine source based on where focus likely is, or which has selection
        if (target && target.closest('.terminal-container') && termSel) {
          (window as any).__internalClipboard = { text: termSel, source: 'terminal' };
        } else if (edSel) {
          (window as any).__internalClipboard = { text: edSel, source: 'editor' };
          if (e.type === 'cut' && (window as any).__executeEditorCut) {
            (window as any).__executeEditorCut();
          }
        }
      }
      // If we are pasting, check where we are pasting
      else if (e.type === 'paste') {
        const clip = (window as any).__internalClipboard;
        if (!clip || !clip.text) return;

        // Is it the terminal?
        if (target && target.closest('.terminal-container')) {
          if (clip.source === 'editor') {
            const event = new CustomEvent('terminal-paste-restricted');
            window.dispatchEvent(event);
          } else if ((window as any).__executeTerminalPaste) {
            (window as any).__executeTerminalPaste(clip.text);
          }
        }
        // Is it the editor? (Or context menu which implies editor since terminal context menu is native)
        else {
          if ((window as any).__executeEditorPaste) {
            (window as any).__executeEditorPaste(clip.text);
          }
        }
      }
    };

    // Use capture phase to intercept before Monaco handles it natively
    document.addEventListener('copy', blockEvent, true);
    document.addEventListener('cut', blockEvent, true);
    document.addEventListener('paste', blockEvent, true);

    const handleRestrictedPaste = () => {
      setAlertMessage("Pasting code from the file editor into the terminal is restricted.");
    };
    window.addEventListener('terminal-paste-restricted', handleRestrictedPaste);

    return () => {
      document.removeEventListener('copy', blockEvent, true);
      document.removeEventListener('cut', blockEvent, true);
      document.removeEventListener('paste', blockEvent, true);
      window.removeEventListener('terminal-paste-restricted', handleRestrictedPaste);
    };
  }, []);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Enable strict checking for JavaScript so undefined variables show as red errors
    if (monaco.languages?.typescript?.javascriptDefaults) {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        checkJs: false,
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX
      });

      monaco.languages.typescript.javascriptDefaults.addExtraLib(`
        declare module "*.svg" {
          const content: any;
          export default content;
        }
        declare module "*.css" {
          const content: any;
          export default content;
        }
      `, 'ambient.d.ts');
    }

    // Optional: Log validation markers (syntax errors) locally
    // The actual onValidate event handles our global state.

    setIsEditorMounted(true);

    // Always intercept copy/cut/paste and route them to __internalClipboard.
    // We do this for everyone (even admin) because we don't want code to leak
    // to the host OS clipboard, and userRole might be empty on initial mount.
    editor.onKeyDown((e: any) => {
      // SECURITY TRIGGER: Mass Deletion via Backspace or Delete
      if (e.keyCode === monaco.KeyCode.Backspace || e.keyCode === monaco.KeyCode.Delete) {
        const selection = editor.getModel().getValueInRange(editor.getSelection());
        if (selection && selection.length > 500) {
           window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: 'Massive code deletion in editor' } }));
        }
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (isCtrlOrMeta) {
        if (e.keyCode === monaco.KeyCode.KeyC) {
          e.preventDefault();
          e.stopPropagation();
          if (isViewer) return; // Block Ctrl+C for viewer
          const selection = editor.getModel().getValueInRange(editor.getSelection());
          if (selection && selection.length > 500) {
            window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: 'Massive code copy from editor' } }));
          }
          (window as any).__internalClipboard = { text: selection, source: 'editor' };
        } else if (e.keyCode === monaco.KeyCode.KeyX) {
          e.preventDefault();
          e.stopPropagation();
          if (isViewer) return; // Block Ctrl+X for viewer
          const selection = editor.getModel().getValueInRange(editor.getSelection());
          if (selection && selection.length > 500) {
            window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: 'Massive code cut from editor' } }));
          }
          (window as any).__internalClipboard = { text: selection, source: 'editor' };
          editor.executeEdits('cut', [{ range: editor.getSelection(), text: '' }]);
        } else if (e.keyCode === monaco.KeyCode.KeyV) {
          e.preventDefault();
          e.stopPropagation();
          if (isViewer) return; // Block Ctrl+V for viewer
          const clip = (window as any).__internalClipboard;
          if (clip && clip.text) {
            if (clip.text.length > 500) {
               window.dispatchEvent(new CustomEvent('session-record-trigger', { detail: { reason: 'Massive code paste in editor' } }));
            }
            editor.executeEdits('paste', [{ range: editor.getSelection(), text: clip.text }]);
          }
        }
      }
    });

    // Track selection continuously for context-menu operations
    editor.onDidChangeCursorSelection(() => {
      (window as any).__currentEditorSelection = editor.getModel().getValueInRange(editor.getSelection());
    });

    // Expose executor functions for the global clipboard handler (used by context menu)
    (window as any).__executeEditorPaste = (text: string) => {
      editor.executeEdits('paste', [{ range: editor.getSelection(), text }]);
    };
    (window as any).__executeEditorCut = () => {
      editor.executeEdits('cut', [{ range: editor.getSelection(), text: '' }]);
    };

    // Custom Context Menu implementation to strictly use internal sandbox
    editor.onContextMenu((e: any) => {
      e.event.preventDefault();
      setEditorContextMenu({ x: e.event.posx, y: e.event.posy });
    });
  };

  // Close context menus on global click
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) setContextMenu(null);
      if (editorContextMenu) setEditorContextMenu(null);
    };
    const handlePipelineEvent = (e: any) => {
      setPipelineStage(e.detail);
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('pipeline-state-change', handlePipelineEvent);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('pipeline-state-change', handlePipelineEvent);
    };
  }, [contextMenu, editorContextMenu]);

  const cursorColors = [
    'hsl(10, 80%, 40%)', 'hsl(120, 80%, 35%)', 'hsl(220, 80%, 45%)',
    'hsl(300, 80%, 40%)', 'hsl(180, 80%, 35%)', 'hsl(50, 90%, 35%)',
    'hsl(25, 90%, 40%)', 'hsl(270, 80%, 45%)'
  ];

  // Cleanup Yjs
  const destroyYjs = () => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (yDocRef.current) {
      yDocRef.current.destroy();
      yDocRef.current = null;
    }
  };

  // Initialize Yjs whenever active file or editor changes
  // NOTE: userInfo is read from a ref so that changes to it (e.g., after login completes)
  // do NOT tear down and recreate the Yjs connection, which would break collaboration.
  useEffect(() => {
    if (!editorRef.current || !activeFilePath) return;

    destroyYjs();

    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;

    const yText = yDoc.getText('monaco');

    const defaultWsUrl = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      : 'ws://localhost:3001';
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;

    // Automatically upgrade to wss:// and remove port 3001 if served over https
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      wsUrl = wsUrl.replace('ws://', 'wss://').replace('http://', 'https://').replace(':3001', '');
    }
    const yjsUrl = wsUrl.endsWith('/') ? `${wsUrl}yjs` : `${wsUrl}/yjs`;

    // Unique room name per project + file — all users on same file join same room
    const roomName = `room-${projectId || 'default'}-${activeFilePath}`;

    const provider = new WebsocketProvider(yjsUrl, roomName, yDoc, {
      connect: true,
      resyncInterval: 5000, // Re-sync every 5s to handle dropped messages
    } as any);
    providerRef.current = provider;

    // Resolve the current user's display name from the JWT (stored in ref to avoid re-runs)
    const info = userInfoRef.current;
    const baseUsername = info?.username || info?.name || info?.email?.split('@')[0] || 'Guest';
    // Append role tag for admin so developers know they're being observed
    const username = isAdmin ? `${baseUsername} (Admin)` : baseUsername;

    // Assign a consistent color per username
    const getHashColor = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return cursorColors[Math.abs(hash) % cursorColors.length];
    };
    const color = getHashColor(username);

    // Set awareness immediately — broadcast presence to all users in the room right away
    const announcePresence = () => {
      provider.awareness.setLocalStateField('user', { name: username, color });
    };
    announcePresence();

    // Inject dynamic CSS for remote cursors/selections
    let styleEl = document.getElementById('yjs-awareness-styles') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'yjs-awareness-styles';
      document.head.appendChild(styleEl);
    }

    const updateAwarenessStyles = () => {
      const states = provider.awareness.getStates();
      let css = '';
      states.forEach((state: any, clientID: number) => {
        // Skip own client — Monaco already renders the local cursor
        if (clientID === provider.awareness.clientID) return;
        if (!state.user) return;
        const ucolor = state.user.color || '#ff8c33';
        const uname = (state.user.name || 'Anonymous').replace(/'/g, "\\'");
        css += `
          .yRemoteSelection-${clientID} {
            background-color: ${ucolor}55 !important;
          }
          .yRemoteSelectionHead-${clientID} {
            position: absolute !important;
            border-left: 2px solid ${ucolor} !important;
            height: 100% !important;
            box-sizing: border-box !important;
            z-index: 99 !important;
          }
          .yRemoteSelectionHead-${clientID}::after {
            content: '${uname}' !important;
            position: absolute !important;
            top: -16px !important;
            left: -1px !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            font-family: 'Inter', 'Segoe UI', sans-serif !important;
            background: ${ucolor} !important;
            color: #fff !important;
            padding: 1px 5px !important;
            border-radius: 3px 3px 3px 0 !important;
            white-space: nowrap !important;
            opacity: 1 !important;
            pointer-events: none !important;
            z-index: 100 !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4) !important;
          }
        `;
      });
      if (styleEl) styleEl.innerHTML = css;
    };

    provider.awareness.on('change', updateAwarenessStyles);
    updateAwarenessStyles();

    // Periodically re-announce presence so admin cursor stays visible even after
    // other users disconnect/reconnect (awareness states can be cleared by reconnects)
    const awarenessInterval = setInterval(() => {
      if (provider.wsconnected) announcePresence();
    }, 5000);

    // ─── Core Binding Setup ────────────────────────────────────────────────
    // Creates the two-way MonacoBinding between the editor model and the Yjs doc.
    // Must be called AFTER the Yjs doc is synced with the server so that existing
    // content (from other users already in the room) is applied to the editor.
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const initBinding = () => {
      // Guard: don't create a second binding if one already exists
      if (bindingRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;
      const model = editor.getModel();
      if (!model) return;

      // Only seed the Yjs doc with file content when this is the FIRST user opening
      // the file (room is empty). If other users are already editing, their content
      // is already in the doc — we must NOT overwrite it.
      if (yText.toString() === '') {
        const val = model.getValue();
        if (val) {
          yDoc.transact(() => { yText.insert(0, val); });
        }
      }

      // Bind Monaco model ↔ Yjs doc (two-way: local edits → Yjs, Yjs changes → Monaco)
      const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
      bindingRef.current = binding;

      // Re-announce presence after binding so cursor position gets broadcast
      announcePresence();
    };

    // FIX 1: Check if already synced (fast local network can sync before listener registers)
    if ((provider as any).synced) {
      initBinding();
    }

    // FIX 2: Standard sync event listener
    provider.on('sync', (isSynced: boolean) => {
      if (isSynced) initBinding();
    });

    // FIX 3: Fallback via status event — if 'sync' fired too early and was missed,
    // try again 300ms after the WebSocket reports 'connected'
    provider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(() => {
          if (!bindingRef.current) initBinding();
        }, 300);
      }
    });

    return () => {
      clearInterval(awarenessInterval);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      provider.awareness.off('change', updateAwarenessStyles);
      destroyYjs();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilePath, projectId, isEditorMounted]);

  return (
    <div ref={containerRef} className="flex h-screen w-full bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans select-none relative">

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-200">
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] shadow-[0_8px_32px_rgba(0,0,0,0.8)] rounded-lg p-6 min-w-[380px] max-w-[500px] flex flex-col transform transition-transform duration-200 scale-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 bg-red-500/10 p-2 rounded-full">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-gray-100 text-lg font-medium tracking-wide">Notification</h3>
            </div>
            <p className="text-gray-300 mb-8 pl-1 leading-relaxed text-[15px]">{alertMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMessage(null)}
                className="bg-[#007fd4] hover:bg-[#006bb3] focus:ring-2 focus:ring-[#007fd4]/50 outline-none text-white px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ease-in-out"
              >
                Okay, understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-200">
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] shadow-[0_8px_32px_rgba(0,0,0,0.8)] rounded-lg p-6 min-w-[380px] max-w-[500px] flex flex-col transform transition-transform duration-200 scale-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 bg-yellow-500/10 p-2 rounded-full">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-gray-100 text-lg font-medium tracking-wide">Confirm Action</h3>
            </div>
            <p className="text-gray-300 mb-8 pl-1 leading-relaxed text-[15px]">{confirmDialog.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#4d4d4d] text-gray-200 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ease-in-out outline-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ease-in-out outline-none shadow-sm shadow-red-900/50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watermark Overlay */}
      {userInfo && userRole.toLowerCase() !== 'admin' && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-wrap items-center justify-center overflow-hidden opacity-[0.03]">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="text-[#ffffff] text-3xl font-bold p-12 whitespace-nowrap"
              style={{ transform: 'rotate(-30deg)' }}
            >
              {userInfo.username || userInfo.email || 'Developer'} • {userInfo.id?.substring(0, 8)}
            </div>
          ))}
        </div>
      )}

      {/* Activity Bar (Icon Rail) */}
      <div className="w-14 bg-[#2c2c2c] border-r border-[#1a1a1a] flex flex-col items-center py-3 shrink-0 gap-1">
        {/* Explorer */}
        <button
          title="Explorer"
          onClick={() => setActiveSidebar('files')}
          className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 ${
            activeSidebar === 'files' ? 'bg-[#007acc] text-white shadow-md shadow-[#007acc]/30' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Files className="w-5 h-5" />
        </button>

        {/* Search */}
        <button
          title="Search"
          onClick={() => setActiveSidebar('search')}
          className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 ${
            activeSidebar === 'search' ? 'bg-[#007acc] text-white shadow-md shadow-[#007acc]/30' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Source Control */}
        <button
          title="Source Control"
          onClick={() => setActiveSidebar('git')}
          className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 ${
            activeSidebar === 'git' ? 'bg-[#007acc] text-white shadow-md shadow-[#007acc]/30' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <GitBranch className="w-5 h-5" />
        </button>

        {/* Live Activity (Admin only) */}
        {userRole === 'Admin' && (
          <button
            title={`Live Activity${activeUsers.length > 0 ? ` (${activeUsers.length} online)` : ''}`}
            onClick={() => setActiveSidebar('activity')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 ${
              activeSidebar === 'activity' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-400 hover:text-emerald-400 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" />
            {activeUsers.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-[9px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center leading-none shadow">
                {activeUsers.length > 9 ? '9+' : activeUsers.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Sidebar Panel */}
      <div style={{ width: `${sidebarWidth}%`, minWidth: '10%', maxWidth: '60%', flexShrink: 0 }} className="flex flex-col bg-[#252526] border-r border-[#3c3c3c]">

        {/* ── EXPLORER ── */}
        {activeSidebar === 'files' && (
          <>
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c]">
              <span className="text-xs font-semibold text-slate-300 tracking-wider">EXPLORER</span>
              <div className="flex space-x-1">
                <FilePlus
                  className={`w-4 h-4 text-slate-400 ${isViewer ? 'opacity-30 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                  onClick={() => !isViewer && setShowNewItemInput('file')}
                />
                <FolderPlus
                  className={`w-4 h-4 text-slate-400 ${isViewer ? 'opacity-30 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                  onClick={() => !isViewer && setShowNewItemInput('folder')}
                />
                <div className="relative flex items-center">
                  <div
                    className="flex items-center cursor-pointer hover:bg-white/10 rounded px-1.5 py-0.5"
                    onClick={() => setShowTerminalMenu(!showTerminalMenu)}
                    title="Terminal Options"
                  >
                    {showTerminalMenu ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 hover:text-white" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 hover:text-white" />
                    )}
                  </div>
                  {showTerminalMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowTerminalMenu(false)} />
                      <div className="absolute top-6 right-0 z-50 bg-[#252526] border border-[#454545] rounded shadow-xl py-1 min-w-[140px]">
                        <button
                          className="w-full text-left px-3 py-1.5 text-[12px] text-slate-300 hover:bg-[#094771] hover:text-white flex items-center"
                          onClick={() => {
                            const newId = `term-${Date.now()}`;
                            if (!terminalOpen) {
                              setTerminals([{ id: newId, active: true }]);
                              setTerminalOpen(true);
                            } else {
                              setTerminals(prev => [...prev.map(t => ({ ...t, active: false })), { id: newId, active: true }]);
                            }
                            setShowTerminalMenu(false);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-2" />
                          New Terminal
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <RefreshCw className={`w-4 h-4 text-slate-400 hover:text-white cursor-pointer ${isManualRefreshing ? 'animate-spin text-white' : ''}`} onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (isManualRefreshing) return;
                  setIsManualRefreshing(true);
                  const endpoint = projectId ? `/editor/tree?path=&projectId=${projectId}` : `/editor/tree?path=`;
                  api.get(endpoint).then(data => {
                    setTree(data || []);
                    setRefreshToggle(prev => prev + 1);
                    if (projectId) {
                      api.patch(`/projects/${projectId}/recalculate-storage`, {}).catch(() => {});
                    }
                  }).catch(console.error).finally(() => {
                    setTimeout(() => setIsManualRefreshing(false), 500);
                  });
                }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2" onClick={(e) => {
              if (e.target === e.currentTarget) {
                setActiveNodePaths(new Set());
                setActiveFolderPath('');
              }
            }}>
              <FileTree
                nodes={tree}
                onFileClick={handleFileClick}
                projectId={projectId || ''}
                isViewer={isViewer}
                restrictedFiles={restrictedFiles}
                activeNodePaths={activeNodePaths}
                onNodeSelect={handleNodeSelect}
                refreshToggle={refreshToggle}
                showNewItemInput={showNewItemInput}
                activeFolderPath={activeFolderPath}
                newItemName={newItemName}
                setNewItemName={setNewItemName}
                handleCreateItem={handleCreateItem}
                setShowNewItemInput={setShowNewItemInput}
                onContextMenu={(e, node) => {
                  e.preventDefault();
                  if (!activeNodePaths.has(node.path)) {
                    setActiveNodePaths(new Set([node.path]));
                  }
                  if (node.isDirectory) setActiveFolderPath(node.path);
                  else setActiveFolderPath(node.path.substring(0, node.path.lastIndexOf('/')));
                  setContextMenu({ x: e.clientX, y: e.clientY, node });
                }}
                renamingNodePath={renamingNodePath}
                onRenameCommit={handleRenameCommit}
                onRenameCancel={handleRenameCancel}
                expandPath={activeFilePath}
                fileErrors={fileErrors}
              />
            </div>
          </>
        )}

        {/* ── LIVE ACTIVITY (Admin only) ── */}
        {activeSidebar === 'activity' && userRole === 'Admin' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-[9px] bg-[#2d2d2d] border-b border-[#3c3c3c] flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">Live Activity</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  activeUsers.length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'
                }`}>
                  {activeUsers.length} online
                </span>
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#2a2a2a] border border-[#3c3c3c] flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-[12px] text-slate-500 font-medium">No users online</p>
                  <p className="text-[11px] text-slate-600 mt-1">Users will appear here when they open the project IDE</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {activeUsers.map((u, i) => {
                    const initials = u.username
                      ? u.username.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                      : '??';
                    const colors = [
                      ['#6366f1','#312e81'], ['#0ea5e9','#0c4a6e'], ['#10b981','#064e3b'],
                      ['#f59e0b','#78350f'], ['#ef4444','#7f1d1d'], ['#a855f7','#4a044e'],
                    ];
                    const [fgColor, bgColorDark] = colors[i % colors.length];
                    const fileName = u.activeFile ? u.activeFile.split('/').pop() : null;

                    return (
                      <div
                        key={u.userId}
                        onClick={() => {
                          if (u.activeFile) {
                            // Navigate to the file and switch to the editor view
                            handleFileClick({ path: u.activeFile, name: fileName || u.activeFile, isDirectory: false });
                            // Switch sidebar away from activity panel so the editor is visible
                            setActiveSidebar('files');
                          }
                        }}
                        className={`group flex items-start gap-3 p-3 rounded-lg border transition-all duration-150 ${
                          u.activeFile
                            ? 'border-[#3c3c3c] hover:border-[#555] bg-[#1e1e1e] hover:bg-[#252525] cursor-pointer'
                            : 'border-[#2e2e2e] bg-[#1a1a1a] cursor-default'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm"
                            style={{ backgroundColor: bgColorDark, color: fgColor, border: `1.5px solid ${fgColor}33` }}
                          >
                            {initials}
                          </div>
                          {/* Online pulse */}
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#1e1e1e] rounded-full">
                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <p className="text-[12px] font-semibold text-slate-200 truncate">{u.username}</p>
                              {u.role && u.role !== 'Admin' && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50">
                                  {u.role}
                                </span>
                              )}
                            </div>
                            {u.activeFile && (
                              <span className="text-[9px] text-slate-500 group-hover:text-emerald-400 transition-colors ml-1 flex-shrink-0">Click to follow →</span>
                            )}
                          </div>

                          {u.activeFile ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <FileCode className="w-3 h-3 text-blue-400 flex-shrink-0" />
                              <p className="text-[11px] text-blue-400 group-hover:text-blue-300 truncate font-mono transition-colors" title={u.activeFile}>
                                {fileName}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-600 mt-0.5">Idle — no file open</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom File Tree Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[500] bg-[#252526] border border-[#454545] shadow-lg rounded py-1 min-w-[160px] text-[#cccccc] text-[13px] select-none"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group" onClick={() => handleContextMenuAction('open')}>
            <span>Open</span>
          </div>
          {!isViewer && (
            <>
              <div className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group" onClick={() => handleContextMenuAction('rename')}>
                <span>Rename</span><span className="text-[#888] group-hover:text-[#ccc]">F2</span>
              </div>
              <div className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group" onClick={() => handleContextMenuAction('delete')}>
                <span>Delete</span><span className="text-[#888] group-hover:text-[#ccc]">Del</span>
              </div>
              <div className="h-[1px] bg-[#454545] my-1" />
              <div className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group" onClick={() => handleContextMenuAction('copy')}>
                <span>Copy</span><span className="text-[#888] group-hover:text-[#ccc]">Ctrl+C</span>
              </div>
              <div className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group" onClick={() => handleContextMenuAction('cut')}>
                <span>Cut</span><span className="text-[#888] group-hover:text-[#ccc]">Ctrl+X</span>
              </div>
              <div
                onClick={() => {
                  if (fileClipboard && fileClipboard.paths.length > 0 && (contextMenu.node.isDirectory || contextMenu.node.path === '')) handleContextMenuAction('paste');
                }}
                className={`px-4 py-1.5 flex justify-between group ${fileClipboard && fileClipboard.paths.length > 0 && (contextMenu.node.isDirectory || contextMenu.node.path === '') ? 'hover:bg-[#094771] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <span>Paste</span><span className="text-[#888] group-hover:text-[#ccc]">Ctrl+V</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Custom Editor Context Menu */}
      {!isViewer && editorContextMenu && (
        <div
          className="fixed z-[500] bg-[#252526] border border-[#454545] shadow-lg rounded py-1 min-w-[160px] text-[#cccccc] text-[13px] select-none"
          style={{ top: editorContextMenu.y, left: editorContextMenu.x }}
          onClick={(e) => {
            e.stopPropagation();
            setEditorContextMenu(null);
          }}
        >
          <div
            className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group"
            onClick={() => {
              const edSel = (window as any).__currentEditorSelection;
              if (edSel) (window as any).__internalClipboard = { text: edSel, source: 'editor' };
            }}
          >
            <span>Copy</span><span className="text-[#888] group-hover:text-[#ccc]">Ctrl+C</span>
          </div>
          <div
            className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group"
            onClick={() => {
              const edSel = (window as any).__currentEditorSelection;
              if (edSel) {
                (window as any).__internalClipboard = { text: edSel, source: 'editor' };
                if ((window as any).__executeEditorCut) (window as any).__executeEditorCut();
              }
            }}
          >
            <span>Cut</span><span className="text-[#888] group-hover:text-[#ccc]">Ctrl+X</span>
          </div>
          <div className="h-[1px] bg-[#454545] my-1" />
          <div
            className="px-4 py-1.5 hover:bg-[#094771] cursor-pointer flex justify-between group"
            onClick={() => {
              const clip = (window as any).__internalClipboard;
              if (clip && clip.text && (window as any).__executeEditorPaste) {
                (window as any).__executeEditorPaste(clip.text);
              }
            }}
          >
            <span>Paste</span><span className="text-[#888] group-hover:text-[#ccc]">Ctrl+V</span>
          </div>
        </div>
      )}

      {/* Horizontal Resize Handle */}
      <div
        onMouseDown={startHDrag}
        className="w-[3px] flex-shrink-0 bg-[#333] hover:bg-[#007fd4] cursor-col-resize z-50 transition-colors"
      />

      {/* Main Editor & Terminal Area */}
      <div ref={mainAreaRef} className="flex flex-col flex-1 min-w-0 bg-[#1e1e1e] relative">

        {/* Floating Top Right Tools (CI/CD Pipeline) */}
        <div className="absolute top-2 right-4 z-50 flex flex-col items-end pointer-events-none">
          {/* Status Lights - Hidden for Viewers */}
          {!isViewer && (
            <div className="flex items-center space-x-1 bg-[#1e1e1e]/90 backdrop-blur border border-[#333] rounded-full px-2 py-1.5 mb-2 pointer-events-auto shadow-lg">
              {/* Code */}
              <div className="flex flex-col items-center px-2 hover:bg-white/10 rounded transition-colors">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mb-0.5 transition-all ${pipelineStage === 'code' ? 'border-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.7)]' : 'border-[#00FF00]/40'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${pipelineStage === 'code' ? 'bg-[#00FF00] shadow-[0_0_6px_rgba(0,255,0,1)] scale-100' : 'bg-[#00FF00]/40 scale-75'}`}></div>
                </div>
                <span className="text-[9px] text-slate-300 font-medium">Code</span>
              </div>

              {/* Build */}
              <div className="flex flex-col items-center px-2 hover:bg-white/10 rounded transition-colors">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mb-0.5 transition-all ${pipelineStage === 'build' ? 'border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]' : 'border-blue-400/40'} ${pipelineStage === 'build' && isPipelineRunning ? 'animate-spin' : ''}`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${pipelineStage === 'build' ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,1)] scale-100' : 'bg-blue-400/40 scale-75'}`}></div>
                </div>
                <span className="text-[9px] text-slate-300 font-medium">Build</span>
              </div>

              {/* Test */}
              <div className="flex flex-col items-center px-2 hover:bg-white/10 rounded transition-colors">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mb-0.5 transition-all ${pipelineStage === 'test' ? 'border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.7)]' : 'border-purple-400/40'} ${pipelineStage === 'test' && isPipelineRunning ? 'animate-pulse' : ''}`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${pipelineStage === 'test' ? 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,1)] scale-100' : 'bg-purple-400/40 scale-75'}`}></div>
                </div>
                <span className="text-[9px] text-slate-300 font-medium">Test</span>
              </div>

              {/* Deploy */}
              <div className="flex flex-col items-center px-2 hover:bg-white/10 rounded transition-colors">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mb-0.5 transition-all ${pipelineStage === 'deploy' ? 'border-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.7)]' : 'border-pink-400/40'} ${pipelineStage === 'deploy' && isPipelineRunning ? 'animate-ping' : ''}`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${pipelineStage === 'deploy' ? 'bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,1)] scale-100' : 'bg-pink-400/40 scale-75'}`}></div>
                </div>
                <span className="text-[9px] text-slate-300 font-medium">Deploy</span>
              </div>

              {/* Live */}
              <div className="flex flex-col items-center px-2 hover:bg-white/10 rounded transition-colors">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mb-0.5 transition-all ${pipelineStage === 'live' ? 'border-[#ff9800] shadow-[0_0_10px_rgba(255,152,0,0.7)]' : 'border-[#ff9800]/40'} ${pipelineStage === 'live' && isPipelineRunning ? 'animate-pulse' : ''}`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${pipelineStage === 'live' ? 'bg-[#ff9800] shadow-[0_0_6px_rgba(255,152,0,1)] scale-100' : 'bg-[#ff9800]/40 scale-75'}`}></div>
                </div>
                <span className="text-[9px] text-slate-300 font-medium">Live</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pointer-events-auto mt-1 mr-2">
            {!isViewer && (
              <button
                onClick={startPipeline}
                disabled={isPipelineRunning}
                className={`px-4 py-1.5 rounded text-white text-[12px] font-bold shadow-md transition-all ${isPipelineRunning ? 'bg-[#295ed9]/50 cursor-not-allowed' : 'bg-[#295ed9] hover:bg-[#346df0] active:scale-95'}`}
              >
                {isPipelineRunning ? 'pushing...' : 'code push'}
              </button>
            )}
            <button
              onClick={() => {
                setPipelineStage('live');
                document.cookie = `preview_project_id=${projectId}; path=/; max-age=3600; Secure; SameSite=None`;
                window.open('https://' + window.location.hostname + ':3000', '_blank');
              }}
              className="px-4 py-1.5 rounded text-white text-[12px] font-bold shadow-md transition-transform bg-[#295ed9] hover:bg-[#346df0] active:scale-95"
            >
              Live link
            </button>
          </div>
        </div>

        {/* Editor Panel */}
        <div
          style={{ height: terminalOpen ? `${100 - terminalHeight}%` : '100%' }}
          className="flex flex-col min-h-0 bg-[#1e1e1e] overflow-hidden"
        >
          {/* Editor Tabs & Compare Bar */}
          <div className="flex bg-[#2d2d2d] h-[35px] border-b border-[#1e1e1e] flex-shrink-0 relative group pr-[280px]">
            {/* Left Scroll Arrow */}
            <button
              onClick={() => scrollTabs('left')}
              className="px-1 hidden group-hover:flex items-center justify-center bg-[#2d2d2d]/90 hover:bg-[#4d4d4d] border-r border-[#1e1e1e] z-10"
              title="Scroll Tabs Left"
            >
              <ChevronLeft className="w-4 h-4 text-[#cccccc]" />
            </button>

            {/* Scrollable Tabs */}
            <div
              ref={tabsContainerRef}
              className="flex-1 flex overflow-x-auto overflow-y-hidden scrollbar-hide no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {openFiles.map((file) => {
                const isActive = activeFilePath === file.path;
                return (
                  <div
                    key={file.path}
                    onClick={() => {
                      setActiveFilePath(file.path);
                      setActiveNodePaths(new Set([file.path]));
                    }}
                    className={`flex items-center px-3 h-full cursor-pointer group border-r border-[#1e1e1e] flex-shrink-0 min-w-fit ${activeNodePaths.has(file.path) ? 'bg-[#1e1e1e] text-white border-t border-t-blue-500' : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2b2b2b]'}`}
                  >
                    <span className={`text-[13px] mr-2 ${fileErrors[file.path] ? 'text-red-500' : ''}`}>{file.name}</span>
                    {file.content !== file.originalContent && (
                      <div className="w-2 h-2 rounded-full bg-white mr-2" title="Unsaved changes" />
                    )}
                    <div
                      className={`w-5 h-5 flex items-center justify-center rounded-md hover:bg-[#4d4d4d] group-tab ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      onClick={(e) => closeFile(e, file.path)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fixed Right Elements (Scroll Arrow + Compare Icon) */}
            <div className="flex items-center h-full flex-shrink-0">
              {/* Right Scroll Arrow */}
              <button
                onClick={() => scrollTabs('right')}
                className="px-1 hidden group-hover:flex items-center justify-center bg-[#2d2d2d]/90 hover:bg-[#4d4d4d] border-l border-[#1e1e1e] z-10 h-full"
                title="Scroll Tabs Right"
              >
                <ChevronRight className="w-4 h-4 text-[#cccccc]" />
              </button>

              {/* Compare Icon */}
              {!isViewer && (
                <div
                  className={`flex items-center justify-center px-3 border-l border-[#1e1e1e] h-full cursor-pointer transition-colors ${isDiffMode ? 'bg-[#ff9800] text-white' : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#4d4d4d] hover:text-white'}`}
                  onClick={() => setIsDiffMode(!isDiffMode)}
                  title={isDiffMode ? "Exit Compare Mode" : "Compare"}
                >
                  <Columns className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumbs */}
          {activeFile && (
            <div className="flex items-center justify-between px-4 h-[22px] bg-[#1e1e1e] flex-shrink-0">
              <span className="text-[#cccccc] text-[12px] opacity-80 truncate">{activeFile.path.split('/').join(' > ')}</span>
            </div>
          )}

          {/* Admin Observer Mode Banner */}
          {isAdmin && activeFile && activeUsers.some(u => u.activeFile === activeFile.path) && (
            <div className="flex items-center gap-2 px-4 py-1 bg-amber-500/10 border-b border-amber-500/30 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <span className="text-[11px] text-amber-400 font-medium">
                Observer Mode — watching live edits on this file
              </span>
              <span className="ml-auto text-[10px] text-amber-500/70">
                {activeUsers.filter(u => u.activeFile === activeFile.path).map(u => u.username).join(', ')} editing
              </span>
            </div>
          )}

          {/* Monaco Editor */}
          <div className="flex-1 relative border-t border-[#2d2d2d] min-h-0">
            {activeFile ? (
              isDiffMode ? (
                <DiffEditor
                  height="100%"
                  language={activeFile.language}
                  theme="vs-dark"
                  original={activeFile.originalContent || ''}
                  modified={activeFile.content || ''}
                  options={{ ...EDITOR_OPTIONS, readOnly: true }}
                />
              ) : (
                <Editor
                  height="100%"
                  language={activeFile.language}
                  theme="vs-dark"
                  path={activeFile.path}
                  defaultValue={activeFile.content}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  onValidate={(markers) => {
                    const hasError = markers.some(m => m.severity === 8); // 8 is Monaco's severity enum for Error
                    setFileErrors(prev => {
                      if (!!prev[activeFile.path] !== hasError) {
                        return { ...prev, [activeFile.path]: hasError };
                      }
                      return prev;
                    });
                  }}
                  options={{ ...EDITOR_OPTIONS, ...(isViewer ? { domReadOnly: true } : {}) }}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-slate-600 text-3xl font-light">
                Select a file to edit
              </div>
            )}
          </div>
        </div>

        {/* Vertical Resize Handle */}
        {terminalOpen && (
          <div
            onMouseDown={startVDrag}
            className="h-[3px] flex-shrink-0 bg-[#333] hover:bg-[#007fd4] cursor-row-resize z-50 transition-colors"
          />
        )}
        {/* Terminal Panel */}
        {terminalOpen && (
          <div
            style={{ height: `${terminalHeight}%` }}
            className="flex flex-shrink-0 min-h-0 bg-[#1e1e1e] overflow-hidden"
          >
            {/* Terminal Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex px-4 h-[35px] border-b border-[#333333] flex-shrink-0">
                <div className="flex space-x-6 text-[11px] font-medium tracking-wide items-center pt-2">
                  <button
                    className={`h-full flex items-start border-b ${activeBottomTab === 'terminal' ? 'text-white border-[#007acc]' : 'text-[#cccccc] hover:text-white border-transparent'}`}
                    onClick={() => setActiveBottomTab('terminal')}
                  >TERMINAL</button>
                  <button
                    className={`h-full flex items-start border-b ${activeBottomTab === 'output' ? 'text-white border-[#007acc]' : 'text-[#cccccc] hover:text-white border-transparent'}`}
                    onClick={() => setActiveBottomTab('output')}
                  >OUTPUT</button>
                  <button
                    className={`h-full flex items-start border-b ${activeBottomTab === 'ports' ? 'text-white border-[#007acc]' : 'text-[#cccccc] hover:text-white border-transparent'}`}
                    onClick={() => setActiveBottomTab('ports')}
                  >PORTS</button>
                </div>
              </div>
              <div className="flex-1 p-0 bg-[#1e1e1e] min-h-0 overflow-hidden relative">
                {activeBottomTab === 'terminal' && (
                  <div className="w-full h-full relative">
                    {terminals.map(term => (
                      <div key={term.id} className="w-full h-full absolute inset-0 p-2" style={{ visibility: term.active ? 'visible' : 'hidden', pointerEvents: term.active ? 'auto' : 'none' }}>
                        {accessToken && <TerminalPane projectId={projectId} isViewer={isViewer} accessToken={accessToken} hasWorkspaceErrors={hasWorkspaceErrors} />}
                      </div>
                    ))}
                  </div>
                )}
                {activeBottomTab === 'output' && <OutputPane logs={systemLogs} />}
                {activeBottomTab === 'ports' && (
                  <PortsPane
                    ports={forwardedPorts}
                    onAddPort={(port, label) => setForwardedPorts(prev => [...prev, { id: `port-${Date.now()}`, port, label }])}
                    onRemovePort={(id) => setForwardedPorts(prev => prev.filter(p => p.id !== id))}
                  />
                )}
              </div>
            </div>

            {/* Terminal Sidebar (Right) */}
            {activeBottomTab === 'terminal' && (
              <div className="w-[150px] border-l border-[#333333] flex flex-col flex-shrink-0">
                <div className="flex justify-end p-2 space-x-2 text-[#cccccc]">
                  <Plus className="w-4 h-4 cursor-pointer hover:text-white" onClick={addTerminal} />
                  <ChevronUp className="w-4 h-4 cursor-pointer hover:text-white" onClick={toggleTerminalMaximized} />
                  <X className="w-4 h-4 cursor-pointer hover:text-white" onClick={() => setTerminalOpen(false)} />
                </div>
                <div className="flex flex-col px-2 space-y-1">
                  {terminals.map((term, idx) => (
                    <div
                      key={term.id}
                      onClick={() => switchTerminal(term.id)}
                      className={`flex items-center justify-between text-[#cccccc] hover:bg-[#2a2d2e] cursor-pointer px-1 py-0.5 rounded ${term.active ? 'bg-[#37373d]' : ''}`}
                    >
                      <div className="flex items-center">
                        <TerminalIcon className="w-3.5 h-3.5 mr-2" />
                        <span className="text-[12px]">powershell {idx + 1}</span>
                      </div>
                      {terminals.length > 1 && (
                        <X className="w-3 h-3 hover:text-red-400 opacity-50 hover:opacity-100" onClick={(e) => closeTerminal(term.id, e)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Commit Message Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-200">
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] shadow-[0_8px_32px_rgba(0,0,0,0.8)] rounded-lg w-[420px] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[#3c3c3c] flex items-center space-x-3">
              <div className="bg-[#007fd4]/10 p-2 rounded-full">
                <Code className="w-5 h-5 text-[#007fd4]" />
              </div>
              <h3 className="text-gray-100 text-base font-semibold tracking-wide">Git Commit & Push</h3>
            </div>
            <div className="p-5 flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-gray-400 text-xs font-medium">COMMIT MESSAGE</label>
                <span className={`text-xs font-medium ${30 - commitMessage.length === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {30 - commitMessage.length}
                </span>
              </div>
              <textarea
                value={commitMessage}
                onChange={(e) => {
                  if (e.target.value.length <= 30) {
                    setCommitMessage(e.target.value);
                  }
                }}
                maxLength={30}
                placeholder="Enter your commit message..."
                className="w-full bg-[#181818] border border-[#3c3c3c] rounded text-gray-200 text-sm px-3 py-2 outline-none focus:border-[#007fd4] resize-none h-24"
                autoFocus
              />
            </div>
            <div className="px-5 py-4 bg-[#252526] border-t border-[#3c3c3c] flex justify-end space-x-3">
              <button
                onClick={() => { setShowCommitModal(false); setCommitMessage(''); }}
                className="px-4 py-1.5 rounded text-sm font-medium text-gray-300 hover:text-white hover:bg-[#333333] transition-colors outline-none"
              >
                Cancel
              </button>
              <button
                onClick={executeGitPush}
                disabled={!commitMessage.trim()}
                className={`px-4 py-1.5 rounded text-sm font-medium text-white transition-all outline-none shadow-sm ${!commitMessage.trim() ? 'bg-[#0e639c]/50 cursor-not-allowed text-white/50' : 'bg-[#007fd4] hover:bg-[#006bb3]'}`}
              >
                Commit & Push
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
