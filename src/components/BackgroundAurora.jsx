import React from 'react';

/**
 * A reusable aurora-style mesh gradient background.
 * Uses CSS blurs and animations for a smooth, performant, and "cool" aesthetic.
 */
export default function BackgroundAurora() {
  return (
    <div className="fixed inset-0 -z-30 overflow-hidden pointer-events-none select-none opacity-80 dark:opacity-40 transition-opacity duration-1000" aria-hidden="true">
      {/* Mesh Gradient style blobs - More Blue Focused */}
      <div className="absolute top-[-25%] left-[-15%] w-[80%] h-[80%] rounded-full bg-blue-500/15 blur-[140px] animate-aurora-blob" />
      <div className="absolute top-[10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-sky-400/20 blur-[150px] animate-aurora-blob-delayed" />
      <div className="absolute bottom-[-20%] left-[10%] w-[75%] h-[75%] rounded-full bg-indigo-400/15 blur-[130px] animate-aurora-blob" />
      <div className="absolute bottom-[5%] right-[-5%] w-[65%] h-[65%] rounded-full bg-blue-300/20 blur-[120px] animate-aurora-blob-delayed" />
      
      {/* Blue wash overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/10 dark:from-sky-950/10 dark:to-transparent" />
    </div>
  );
}
