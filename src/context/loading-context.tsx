
'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useRef, useEffect } from 'react';

type LoadingVariant = 'full' | 'bar';

interface LoadingContextType {
  loading: boolean;
  progress: number;
  variant: LoadingVariant;
  showLoading: (variant: LoadingVariant) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [variant, setVariant] = useState<LoadingVariant>('bar');
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const startProgress = useCallback(() => {
    setProgress(10); // Initial jump
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          if(progressInterval.current) clearInterval(progressInterval.current);
          return 95;
        }
        // Slow down as it gets closer to 90
        const increment = prev < 80 ? 5 : 1;
        return prev + increment;
      });
    }, 200);
  }, []);

  const finishProgress = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      // Reset progress after fade out
      setTimeout(() => setProgress(0), 500);
    }, 500);
  }, []);

  const showLoading = useCallback((variant: LoadingVariant) => {
    setVariant(variant);
    setLoading(true);
    startProgress();
  }, [startProgress]);

  const hideLoading = useCallback(() => {
    finishProgress();
  }, [finishProgress]);
  
  useEffect(() => {
    return () => {
        if(progressInterval.current) {
            clearInterval(progressInterval.current)
        }
    }
  }, []);

  const value = {
    loading,
    progress,
    variant,
    showLoading,
    hideLoading
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
