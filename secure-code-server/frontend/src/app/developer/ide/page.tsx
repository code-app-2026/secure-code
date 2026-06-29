"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const IDEWorkspace = dynamic(() => import('@/components/ide/IDEWorkspace'), { 
  ssr: false,
  loading: () => <div className="flex w-full h-screen items-center justify-center bg-[#1e1e1e] text-white">Loading IDE Workspace...</div>
});

export default function DeveloperIDE() {
  return (
    <main className="w-full h-screen overflow-hidden m-0 p-0 bg-[#1e1e1e]">
      <Suspense fallback={<div className="flex w-full h-screen items-center justify-center bg-[#1e1e1e] text-white">Loading IDE Workspace...</div>}>
        <IDEWorkspace />
      </Suspense>
    </main>
  );
}
