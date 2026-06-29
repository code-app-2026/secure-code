import React, { useEffect, useRef } from 'react';

interface OutputPaneProps {
  logs: string[];
}

export default function OutputPane({ logs }: OutputPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] font-mono text-[13px] relative">
      <div className="flex px-4 py-2 border-b border-[#333333] justify-between items-center">
        <select className="bg-[#2d2d2d] border border-[#3c3c3c] rounded text-xs px-2 py-1 outline-none text-[#cccccc]">
          <option>IDE System Logs</option>
          <option>Window</option>
        </select>
        <div className="flex space-x-3 text-slate-400">
          <button className="hover:text-white" title="Clear Output">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/></svg>
          </button>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 whitespace-pre-wrap break-words leading-relaxed custom-scrollbar">
        {logs.length === 0 ? (
          <span className="italic text-slate-500">No output logs yet...</span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="hover:bg-white/5 px-2 -mx-2 rounded flex">
              <span className="text-slate-500 w-16 flex-shrink-0 select-none">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
              <span>{log}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
