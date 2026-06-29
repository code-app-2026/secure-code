"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  File as GenericFile,
  Lock,
  Settings, 
  FileText, 
  Code,
  Info, 
  CheckSquare
} from 'lucide-react';
import {
  SiPython, SiJavascript, SiTypescript, SiReact, SiHtml5, SiCss, SiMarkdown,
  SiDocker, SiC, SiCplusplus, SiGit, SiJupyter, SiPhp, SiRuby,
  SiRust, SiGo, SiSwift, SiKotlin, SiYaml, SiVuedotjs, SiSvelte,
  SiGraphql, SiMysql
} from 'react-icons/si';
import { FaJava } from 'react-icons/fa';
import { TbBrandCSharp } from 'react-icons/tb';
import { VscJson } from 'react-icons/vsc';
import { api } from '@/lib/api';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isOpen?: boolean;
}

interface FileTreeProps {
  nodes: FileNode[];
  onFileClick: (node: FileNode) => void;
  level?: number;
  projectId?: string | null;
  isViewer?: boolean;
  activeNodePaths?: Set<string>;
  onNodeSelect?: (e: React.MouseEvent, node: FileNode) => void;
  refreshToggle?: number;
  showNewItemInput?: 'file' | 'folder' | null;
  activeFolderPath?: string;
  newItemName?: string;
  setNewItemName?: (name: string) => void;
  handleCreateItem?: () => void;
  setShowNewItemInput?: (val: 'file' | 'folder' | null) => void;
  currentPath?: string;
  // Global state passed down from root FileTree to prevent localStorage race conditions
  globalExpandedNodes?: Record<string, boolean>;
  setGlobalExpandedNodes?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  globalLoadedChildren?: Record<string, FileNode[]>;
  setGlobalLoadedChildren?: React.Dispatch<React.SetStateAction<Record<string, FileNode[]>>>;
  onContextMenu?: (e: React.MouseEvent, node: FileNode) => void;
  renamingNodePath?: string | null;
  onRenameCommit?: (oldPath: string, newName: string) => void;
  onRenameCancel?: () => void;
  expandPath?: string | null;
  fileErrors?: Record<string, boolean>;
  restrictedFiles?: string[];
}

const getFileIcon = (fileName: string) => {
  const name = fileName.toLowerCase();
  if (name.includes('.env')) return <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-400" />;
  if (name.includes('readme')) return <Info className="w-3.5 h-3.5 mr-1.5 text-blue-400" />;
  if (name === 'package.json') return <VscJson className="w-3.5 h-3.5 mr-1.5 text-green-500" />;
  if (name.includes('todo')) return <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-blue-400" />;
  if (name === 'dockerfile' || name.includes('docker-compose')) return <SiDocker className="w-3.5 h-3.5 mr-1.5 text-[#2496ED]" />;
  if (name === '.gitignore') return <SiGit className="w-3.5 h-3.5 mr-1.5 text-[#F05032]" />;

  if (name.endsWith('.py')) return <SiPython className="w-3.5 h-3.5 mr-1.5 text-[#3776AB]" />;
  if (name.endsWith('.js') || name.endsWith('.mjs')) return <SiJavascript className="w-3.5 h-3.5 mr-1.5 text-[#F7DF1E]" />;
  if (name.endsWith('.ts')) return <SiTypescript className="w-3.5 h-3.5 mr-1.5 text-[#3178C6]" />;
  if (name.endsWith('.jsx') || name.endsWith('.tsx')) return <SiReact className="w-3.5 h-3.5 mr-1.5 text-[#61DAFB]" />;
  if (name.endsWith('.json')) return <VscJson className="w-3.5 h-3.5 mr-1.5 text-[#cbcb41]" />;
  if (name.endsWith('.html') || name.endsWith('.htm')) return <SiHtml5 className="w-3.5 h-3.5 mr-1.5 text-[#E34F26]" />;
  if (name.endsWith('.css')) return <SiCss className="w-3.5 h-3.5 mr-1.5 text-[#1572B6]" />;
  if (name.endsWith('.md')) return <SiMarkdown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />;
  if (name.endsWith('.txt')) return <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" />;
  if (name.endsWith('.c')) return <SiC className="w-3.5 h-3.5 mr-1.5 text-[#A8B9CC]" />;
  if (name.endsWith('.cpp') || name.endsWith('.cc') || name.endsWith('.cxx')) return <SiCplusplus className="w-3.5 h-3.5 mr-1.5 text-[#00599C]" />;
  if (name.endsWith('.sh') || name.endsWith('.bash')) return <Code className="w-3.5 h-3.5 mr-1.5 text-green-400" />;
  if (name.endsWith('.ipynb')) return <SiJupyter className="w-3.5 h-3.5 mr-1.5 text-[#F37626]" />;
  if (name.endsWith('.java')) return <FaJava className="w-3.5 h-3.5 mr-1.5 text-[#007396]" />;
  if (name.endsWith('.cs')) return <TbBrandCSharp className="w-3.5 h-3.5 mr-1.5 text-[#239120]" />;
  if (name.endsWith('.php')) return <SiPhp className="w-3.5 h-3.5 mr-1.5 text-[#777BB4]" />;
  if (name.endsWith('.rb')) return <SiRuby className="w-3.5 h-3.5 mr-1.5 text-[#CC342D]" />;
  if (name.endsWith('.rs')) return <SiRust className="w-3.5 h-3.5 mr-1.5 text-[#DEA584]" />;
  if (name.endsWith('.go')) return <SiGo className="w-3.5 h-3.5 mr-1.5 text-[#00ADD8]" />;
  if (name.endsWith('.swift')) return <SiSwift className="w-3.5 h-3.5 mr-1.5 text-[#F05138]" />;
  if (name.endsWith('.kt') || name.endsWith('.kts')) return <SiKotlin className="w-3.5 h-3.5 mr-1.5 text-[#7F52FF]" />;
  if (name.endsWith('.vue')) return <SiVuedotjs className="w-3.5 h-3.5 mr-1.5 text-[#4FC08D]" />;
  if (name.endsWith('.svelte')) return <SiSvelte className="w-3.5 h-3.5 mr-1.5 text-[#FF3E00]" />;
  if (name.endsWith('.graphql') || name.endsWith('.gql')) return <SiGraphql className="w-3.5 h-3.5 mr-1.5 text-[#E10098]" />;
  if (name.endsWith('.sql')) return <SiMysql className="w-3.5 h-3.5 mr-1.5 text-[#4479A1]" />;
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return <SiYaml className="w-3.5 h-3.5 mr-1.5 text-[#CB171E]" />;

  return <GenericFile className="w-3.5 h-3.5 mr-1.5 text-slate-500" />;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadExpandedState(projectId: string | null | undefined): Record<string, boolean> {
  if (typeof window === 'undefined' || !projectId) return {};
  try {
    const raw = localStorage.getItem(`ide-tree-${projectId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveExpandedState(projectId: string | null | undefined, state: Record<string, boolean>) {
  if (typeof window === 'undefined' || !projectId) return;
  try {
    localStorage.setItem(`ide-tree-${projectId}`, JSON.stringify(state));
  } catch { /* quota */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FileTree({
  nodes, onFileClick, level = 0, projectId, isViewer, activeNodePaths, onNodeSelect, refreshToggle,
  showNewItemInput, activeFolderPath, newItemName, setNewItemName, handleCreateItem,
  setShowNewItemInput, currentPath = '',
  globalExpandedNodes, setGlobalExpandedNodes,
  globalLoadedChildren, setGlobalLoadedChildren, onContextMenu,
  renamingNodePath, onRenameCommit, onRenameCancel, expandPath,
  fileErrors = {}, restrictedFiles = []
}: FileTreeProps) {

  // Create state only at the root level, otherwise use passed-down state
  const isRoot = level === 0;

  const [localExpandedNodes, setLocalExpandedNodes] = useState<Record<string, boolean>>(() => {
    if (!isRoot) return {};
    const saved = loadExpandedState(projectId);
    // Always ensure root node is expanded
    if (nodes && nodes.length === 1 && nodes[0].path === '') {
      saved[''] = true;
    }
    return saved;
  });

  const [localLoadedChildren, setLocalLoadedChildren] = useState<Record<string, FileNode[]>>({});

  const expandedNodes = globalExpandedNodes || localExpandedNodes;
  const setExpandedNodes = setGlobalExpandedNodes || setLocalExpandedNodes;
  const loadedChildren = globalLoadedChildren || localLoadedChildren;
  const setLoadedChildren = setGlobalLoadedChildren || setLocalLoadedChildren;

  const hasRestoredState = React.useRef(false);
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  const [localRenameValue, setLocalRenameValue] = useState('');

  useEffect(() => {
    if (renamingNodePath) {
      // Find the node being renamed in the current level's nodes
      const node = nodes.find(n => n.path === renamingNodePath);
      if (node) {
        // Only initialize the value when renaming STARTS — not on every nodes update.
        // Removing 'nodes' from deps prevents the 5-second tree refresh from
        // resetting localRenameValue back to the original name while the user is typing.
        setLocalRenameValue(node.name);
        setTimeout(() => {
          if (renameInputRef.current) {
            renameInputRef.current.focus();
            const extIndex = node.name.lastIndexOf('.');
            if (!node.isDirectory && extIndex > 0) {
              renameInputRef.current.setSelectionRange(0, extIndex);
            } else {
              renameInputRef.current.select();
            }
          }
        }, 50);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renamingNodePath]); // ← intentionally excludes 'nodes' to avoid reset on tree refresh

  // ── Persist expanded state on every change (Root only) ──────────────────────
  useEffect(() => {
    if (!isRoot || !projectId) return;
    if (!hasRestoredState.current) return;
    saveExpandedState(projectId, expandedNodes);
  }, [expandedNodes, projectId, isRoot]);

  // ── Auto-expand root node when tree data arrives (Root only) ───────────────
  useEffect(() => {
    if (!isRoot) return;
    if (nodes && nodes.length === 1 && nodes[0].path === '') {
      setExpandedNodes(prev => ({ ...prev, '': true }));
    }
  }, [nodes, isRoot, setExpandedNodes]);

  // ── Auto-expand folders when active file changes (Root only) ────────────────
  useEffect(() => {
    if (!isRoot || !expandPath) return;

    const parts = expandPath.split('/');
    parts.pop(); // remove file name
    if (parts.length === 0) return;

    let current = '';
    const toExpand: string[] = [];
    for (const p of parts) {
      current = current ? `${current}/${p}` : p;
      toExpand.push(current);
    }

    let changed = false;
    const newExpanded = { ...expandedNodes };
    const missing: string[] = [];

    toExpand.forEach(p => {
      if (!newExpanded[p]) {
        newExpanded[p] = true;
        changed = true;
      }
      if (!loadedChildren[p] && p !== '') {
        missing.push(p);
      }
    });

    if (changed) setExpandedNodes(newExpanded);

    if (missing.length > 0) {
      missing.forEach(async (p) => {
        try {
          const endpoint = projectId
            ? `/editor/tree?path=${encodeURIComponent(p)}&projectId=${projectId}`
            : `/editor/tree?path=${encodeURIComponent(p)}`;
          const data = await api.get(endpoint);
          setLoadedChildren(prev => ({ ...prev, [p]: data }));
        } catch { /* skip on error */ }
      });
    }
  }, [expandPath, isRoot, projectId]);

  // ── On mount: re-fetch children for any folders restored as expanded ─────────
  useEffect(() => {
    if (!isRoot) return;
    const expandedPaths = Object.keys(expandedNodes).filter(p => expandedNodes[p] && p !== '');
    if (expandedPaths.length === 0) {
      hasRestoredState.current = true;
      return;
    }

    Promise.all(
      expandedPaths.map(async (p) => {
        try {
          const endpoint = projectId
            ? `/editor/tree?path=${encodeURIComponent(p)}&projectId=${projectId}`
            : `/editor/tree?path=${encodeURIComponent(p)}`;
          const data = await api.get(endpoint);
          return { path: p, data };
        } catch {
          return null;
        }
      })
    ).then(results => {
      const updates: Record<string, FileNode[]> = {};
      results.forEach(res => {
        if (res) updates[res.path] = res.data;
      });
      if (Object.keys(updates).length > 0) {
        setLoadedChildren(prev => ({ ...prev, ...updates }));
      }
      hasRestoredState.current = true;
    }).catch(() => {
      hasRestoredState.current = true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refresh: reload all expanded folders (Root only) ────────────────────────
  useEffect(() => {
    if (!isRoot || !refreshToggle || refreshToggle <= 0) return;
    const paths = Object.keys(expandedNodes).filter(p => expandedNodes[p] && p !== '');
    paths.forEach(async (p) => {
      try {
        const endpoint = projectId
          ? `/editor/tree?path=${encodeURIComponent(p)}&projectId=${projectId}`
          : `/editor/tree?path=${encodeURIComponent(p)}`;
        const data = await api.get(endpoint);
        setLoadedChildren(prev => ({ ...prev, [p]: data }));
      } catch (err) {
        console.error('Failed to reload folder', err);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToggle, isRoot]);

  // ── Toggle folder open/close ─────────────────────────────────────────────────
  const toggleFolder = async (node: FileNode) => {
    const isExpanded = !!expandedNodes[node.path];
    setExpandedNodes(prev => ({ ...prev, [node.path]: !isExpanded }));

    // Root node children are pre-loaded by backend — no API call needed
    if (node.path === '') return;

    // Lazy-load children if not yet fetched
    if (!isExpanded && !loadedChildren[node.path]) {
      try {
        const endpoint = projectId
          ? `/editor/tree?path=${encodeURIComponent(node.path)}&projectId=${projectId}`
          : `/editor/tree?path=${encodeURIComponent(node.path)}`;
        const data = await api.get(endpoint);
        setLoadedChildren(prev => ({ ...prev, [node.path]: data }));
      } catch (err) {
        console.error('Failed to load folder', err);
      }
    }
  };

  // ── Helper: Check if folder contains any errors ──────────────────────────────
  const hasErrorInChildren = (folderPath: string) => {
    return Object.keys(fileErrors).some(path => fileErrors[path] && path.startsWith(folderPath + '/'));
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full">
      {showNewItemInput && activeFolderPath === currentPath && level > 0 && (
        <div className="flex items-center py-0.5" style={{ paddingLeft: `${(level * 12) + 4}px` }}>
          {showNewItemInput === 'file'
            ? <GenericFile className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            : <ChevronRight className="w-4 h-4 mr-1 opacity-80" />
          }
          <input
            autoFocus
            type="text"
            value={newItemName || ''}
            onChange={e => setNewItemName && setNewItemName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && handleCreateItem) handleCreateItem();
              if (e.key === 'Escape' && setShowNewItemInput) setShowNewItemInput(null);
            }}
            onBlur={() => setShowNewItemInput && setShowNewItemInput(null)}
            className="w-full bg-[#3c3c3c] text-white text-[14px] px-1 py-0.5 outline-none border border-[#007fd4]"
          />
        </div>
      )}

      {(nodes || []).map(node => {
        const isRestrictedPath = restrictedFiles.some(r => {
          const trimmedR = r.trim().replace(/\\/g, '/').replace(/\/$/, '');
          const normalizedNodePath = node.path.replace(/\\/g, '/').replace(/\/$/, '');
          return normalizedNodePath === trimmedR || 
          normalizedNodePath.startsWith(trimmedR + '/') || 
          normalizedNodePath.endsWith('/' + trimmedR) || 
          normalizedNodePath.includes('/' + trimmedR + '/');
        });
        const isExpanded = !!expandedNodes[node.path] && !isRestrictedPath;
        // Root node uses pre-loaded children from backend; sub-folders use lazy-loaded children
        const children = node.path === ''
          ? (node.children || [])
          : (loadedChildren[node.path] || node.children || []);

        return (
          <div key={node.path} className="flex flex-col">
            <div
              id={`tree-node-${node.path}`}
              className={`flex items-center py-0.5 cursor-pointer select-none ${activeNodePaths?.has(node.path) ? 'bg-[#37373d] text-white outline outline-1 outline-[#007fd4] outline-offset-[-1px]' : 'text-[#cccccc] hover:bg-[#2a2d2e]'} ${isRestrictedPath ? 'opacity-50 pointer-events-none' : ''}`}
              style={{ paddingLeft: `${(level * 12) + 4}px` }}
              onClick={(e) => {
                if (isRestrictedPath) {
                   e.preventDefault();
                   e.stopPropagation();
                   return;
                }
                if (onNodeSelect) onNodeSelect(e, node);
                if (!e.ctrlKey && !e.metaKey) {
                  if (node.isDirectory) toggleFolder(node);
                  else onFileClick(node);
                }
              }}
              onContextMenu={(e) => {
                if (isRestrictedPath) {
                   e.preventDefault();
                   e.stopPropagation();
                   return;
                }
                if (onContextMenu) onContextMenu(e, node);
              }}
            >
              {node.isDirectory ? (
                <>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 mr-1 opacity-80" />
                    : <ChevronRight className="w-4 h-4 mr-1 opacity-80" />
                  }
                  {isExpanded
                    ? <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                    : <Folder className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                  }
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5 mr-1 text-transparent" />
                  {getFileIcon(node.name)}
                </>
              )}
              {renamingNodePath === node.path ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={localRenameValue}
                  onChange={(e) => setLocalRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (onRenameCommit) onRenameCommit(node.path, localRenameValue);
                    } else if (e.key === 'Escape') {
                      if (onRenameCancel) onRenameCancel();
                    }
                  }}
                  onBlur={() => {
                    // Use a short delay before canceling: if focus returns to this input
                    // within 150ms (e.g. from a React re-render or tree refresh), don't cancel.
                    // This prevents spurious cancels from the 5-second tree auto-refresh.
                    setTimeout(() => {
                      if (document.activeElement !== renameInputRef.current) {
                        if (onRenameCancel) onRenameCancel();
                      }
                    }, 150);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#3c3c3c] text-white border border-[#007fd4] text-[13px] px-1 py-0 w-full outline-none"
                />
              ) : (
                <span className={`truncate text-[13px] flex-1 ${node.isDirectory ? (hasErrorInChildren(node.path) ? 'text-red-400' : '') : (fileErrors[node.path] ? 'text-red-400' : '')}`}>
                  {node.name}
                </span>
              )}
              {isRestrictedPath && <Lock className="w-3 h-3 text-red-500 mr-2 flex-shrink-0" />}
            </div>

            {node.isDirectory && (isExpanded || (showNewItemInput && activeFolderPath === node.path)) && (
              <FileTree
                nodes={children}
                onFileClick={onFileClick}
                level={level + 1}
                projectId={projectId}
                isViewer={isViewer}
                activeNodePaths={activeNodePaths}
                onNodeSelect={onNodeSelect}
                refreshToggle={refreshToggle}
                showNewItemInput={showNewItemInput}
                activeFolderPath={activeFolderPath}
                newItemName={newItemName}
                setNewItemName={setNewItemName}
                handleCreateItem={handleCreateItem}
                setShowNewItemInput={setShowNewItemInput}
                currentPath={node.path}
                globalExpandedNodes={expandedNodes}
                setGlobalExpandedNodes={setExpandedNodes}
                globalLoadedChildren={loadedChildren}
                setGlobalLoadedChildren={setLoadedChildren}
                onContextMenu={onContextMenu}
                renamingNodePath={renamingNodePath}
                onRenameCommit={onRenameCommit}
                onRenameCancel={onRenameCancel}
                expandPath={expandPath}
                fileErrors={fileErrors}
                restrictedFiles={restrictedFiles}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
