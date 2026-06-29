"use client";

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../lib/api';

export default function IdleTimer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Set to 15 minutes (15 * 60 seconds * 1000 ms)
  const TIMEOUT_MS = 15 * 60 * 1000;
  // Heartbeat every 1 minute to keep lastActive fresh
  const HEARTBEAT_MS = 1 * 60 * 1000;

  // Do not track idle time on the login page or landing page
  const isLoginPage = pathname === '/' || pathname === '/admin/login' || pathname === '/developer/login' || pathname === '/viewer/login';

  const logoutUser = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      console.error(e);
    }

    // Clear cookies based on context
    let tokenName = 'accessToken';
    let roleName = 'userRole';
    let loginUrl = '/admin/login';

    if (pathname.startsWith('/admin')) {
      tokenName = 'admin_accessToken';
      roleName = 'admin_userRole';
    } else if (pathname.startsWith('/developer')) {
      tokenName = 'developer_accessToken';
      roleName = 'developer_userRole';
      loginUrl = '/developer/login';
    } else if (pathname.startsWith('/viewer')) {
      tokenName = 'viewer_accessToken';
      roleName = 'viewer_userRole';
      loginUrl = '/viewer/login';
    }

    document.cookie = `${tokenName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${roleName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

    sessionStorage.removeItem(tokenName);
    sessionStorage.removeItem(roleName);

    // Redirect to login if not already there
    if (!isLoginPage) {
      window.location.href = `${loginUrl}?expired=true`;
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isLoginPage) {
      timeoutRef.current = setTimeout(() => {
        logoutUser();
      }, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (isLoginPage) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    // Initialize idle timer
    resetTimer();

    // Start heartbeat — pings backend immediately and then every 1 minute to keep lastActive fresh.
    // If the browser is closed without logout, the backend auto-marks user offline within 3 minutes.
    const sendHeartbeat = () => {
      api.post('/auth/heartbeat', {}).catch(() => {});
    };
    
    // Send immediate heartbeat on mount or navigation
    sendHeartbeat();
    
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_MS);

    // Event listeners for user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [pathname, isLoginPage]);

  return <>{children}</>;
}
