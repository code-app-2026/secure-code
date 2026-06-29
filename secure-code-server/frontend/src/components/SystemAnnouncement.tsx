"use client";

import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { api } from '@/lib/api';

export default function SystemAnnouncement() {
    const [message, setMessage] = useState('');
    const [showSystemMessage, setShowSystemMessage] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // api.get uses standard fetch. We can use it directly if no token is needed,
                // but since the endpoint is public, it works flawlessly.
                // Add cache buster to prevent stale browser cache on VM restarts
                const data = await api.get(`/settings/public?_t=${new Date().getTime()}`);
                if (data) {
                    if (data.systemMessage !== undefined) setMessage(data.systemMessage);
                    if (data.showSystemMessage !== undefined) {
                        setShowSystemMessage(data.showSystemMessage === true || data.showSystemMessage === 'true');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch system announcement", err);
            }
        };
        fetchSettings();
    }, []);

    if (!message || !showSystemMessage) return null;

    return (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white w-full shadow-[0_4px_20px_rgba(37,99,235,0.2)] relative z-[100] animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="max-w-[1400px] mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="flex items-center space-x-3 sm:space-x-4 justify-center w-full">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full backdrop-blur-sm shadow-inner relative">
                        <Megaphone className="w-4 h-4 text-white animate-pulse" />
                        <span className="absolute top-0 right-0 w-2 h-2 bg-blue-300 rounded-full animate-ping"></span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-bold text-blue-200 uppercase tracking-widest text-xs mr-3 hidden sm:block">System Update</span>
                        <span className="font-bold text-sm bg-white/10 border border-white/20 text-white px-5 py-1.5 rounded-full backdrop-blur-md shadow-inner tracking-wide">
                            {message}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
