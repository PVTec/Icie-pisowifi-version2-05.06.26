
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface PwaInstallContextType {
  canInstall: boolean;
  triggerInstall: () => void;
}

const PwaInstallContext = createContext<PwaInstallContextType | undefined>(undefined);

export const PwaInstallProvider = ({ children }: { children: ReactNode }) => {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installPrompt) {
      alert("To install the app, look for the 'Add to Home Screen' or 'Install App' option in your browser's menu.");
      return;
    }
    const promptEvent = installPrompt as any;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPrompt(null);
  };

  const value = {
    canInstall: !!installPrompt,
    triggerInstall,
  };

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
};

export const usePwaInstall = () => {
  const context = useContext(PwaInstallContext);
  if (context === undefined) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider');
  }
  return context;
};
