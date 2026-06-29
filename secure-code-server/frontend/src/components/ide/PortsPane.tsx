import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

export interface ForwardedPort {
  id: string;
  port: number;
  label: string;
}

interface PortsPaneProps {
  ports: ForwardedPort[];
  onAddPort: (port: number, label: string) => void;
  onRemovePort: (id: string) => void;
}

export default function PortsPane({ ports, onAddPort, onRemovePort }: PortsPaneProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPort, setNewPort] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = () => {
    const p = parseInt(newPort);
    if (!isNaN(p) && p > 0 && p <= 65535) {
      onAddPort(p, newLabel || `Port ${p}`);
      setNewPort('');
      setNewLabel('');
      setIsAdding(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] font-sans text-[13px]">
      <div className="flex px-4 py-2 border-b border-[#333333] justify-between items-center">
        <span className="font-medium">Forwarded Ports</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {ports.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <p>No ports are currently forwarded.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-[#0e639c] hover:bg-[#1177bb] text-white px-4 py-1.5 rounded transition-colors"
            >
              Forward a Port
            </button>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#333333] text-slate-400">
                  <th className="pb-2 font-normal">Port</th>
                  <th className="pb-2 font-normal">Local Address</th>
                  <th className="pb-2 font-normal">Label</th>
                  <th className="pb-2 font-normal text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ports.map(p => (
                  <tr key={p.id} className="border-b border-[#2d2d2d] hover:bg-[#2a2d2e] group">
                    <td className="py-2.5 font-mono">{p.port}</td>
                    <td className="py-2.5">
                      <a 
                        href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:${p.port}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[#3794ff] hover:underline flex items-center space-x-1"
                      >
                        <span>{typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:{p.port}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="py-2.5 text-slate-300">{p.label}</td>
                    <td className="py-2.5 text-right">
                      <button 
                        onClick={() => onRemovePort(p.id)}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Stop Forwarding"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {isAdding && (
                  <tr className="border-b border-[#2d2d2d] bg-[#2a2d2e]">
                    <td className="py-2">
                      <input 
                        type="number"
                        value={newPort}
                        onChange={e => setNewPort(e.target.value)}
                        placeholder="e.g. 3000"
                        className="w-24 bg-[#3c3c3c] border border-[#007fd4] rounded px-2 py-1 outline-none text-white text-xs"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
                      />
                    </td>
                    <td className="py-2 text-slate-500 italic">remote-ip:...</td>
                    <td className="py-2">
                      <input 
                        type="text"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        placeholder="Optional label"
                        className="w-32 bg-[#3c3c3c] border border-transparent focus:border-[#007fd4] rounded px-2 py-1 outline-none text-white text-xs"
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
                      />
                    </td>
                    <td className="py-2 text-right space-x-2">
                      <button onClick={handleAdd} className="text-[#3794ff] hover:text-white text-xs font-medium">Add</button>
                      <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white text-xs">Cancel</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="mt-4 flex items-center text-slate-400 hover:text-white text-xs transition-colors"
              >
                <Plus className="w-3 h-3 mr-1" />
                Forward another port
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
