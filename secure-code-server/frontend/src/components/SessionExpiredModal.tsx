"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function SessionExpiredModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('expired') === 'true') {
        setShow(true);
      }
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('expired');
    const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
    window.history.replaceState({}, '', newUrl);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-[400px] p-8 mx-4 bg-[#0a0f1c]/95 border border-red-500/30 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.15)] relative flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-[22px] font-bold text-white mb-2">Session Expired</h2>
        <p className="text-[14px] text-slate-300 mb-8">
          Your session has expired due to inactivity. Please log in again to continue.
        </p>
        <button 
          onClick={handleClose}
          className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-all shadow-[0_4px_15px_rgba(220,38,38,0.3)]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
