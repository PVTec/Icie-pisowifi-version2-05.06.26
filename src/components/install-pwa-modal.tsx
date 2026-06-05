
'use client';

import { useState, useEffect } from 'react';
import { usePwaInstall } from '@/context/pwa-install-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { DownloadCloud, Smartphone } from 'lucide-react';
import Image from 'next/image';

const SESSION_STORAGE_KEY = 'pwaInstallDismissed';

export function InstallPwaModal() {
  const { canInstall, triggerInstall } = usePwaInstall();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show the modal if PWA can be installed and it hasn't been dismissed this session
    if (canInstall && sessionStorage.getItem(SESSION_STORAGE_KEY) !== 'true') {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000); // Wait 5 seconds before showing

      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  const handleInstall = () => {
    triggerInstall();
    setIsOpen(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={handleDismiss}>
        <DialogHeader>
          <div className="flex flex-col items-center text-center">
             <div className="mx-auto bg-primary/10 rounded-full h-24 w-24 flex items-center justify-center p-2 mb-4 border-2 border-primary/20">
                <Image
                    src="/avatars/icielogo.png"
                    alt="Icie Wifi Portal Logo"
                    width={80}
                    height={80}
                    className="object-cover rounded-full"
                />
            </div>
            <DialogTitle className="text-2xl font-bold font-headline text-primary">I-install ang App!</DialogTitle>
            <DialogDescription className="mt-2 text-muted-foreground">
              I-install ang Icie Wifi Portal sa iyong device para sa mas mabilis at mas magandang experience. Isang tap lang mula sa iyong home screen!
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button onClick={handleInstall} className="w-full">
            <DownloadCloud className="mr-2 h-4 w-4" />
            Install App
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            Mamaya na
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
