
'use client';

import { useLoading } from '@/context/loading-context';
import { cn } from '@/lib/utils';
import React from 'react';

export function TopLoadingBar() {
  const { loading, progress } = useLoading();

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 h-1 z-50 transition-opacity duration-300',
        loading ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-200 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
