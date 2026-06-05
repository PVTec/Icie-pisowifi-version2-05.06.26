
'use client';

import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { DropdownMenuItem } from './ui/dropdown-menu';
import Link from 'next/link';
import { usePwaInstall } from '@/context/pwa-install-context';


export const PwaInstallButton = ({ isInsideSheet = false }: { isInsideSheet?: boolean }) => {
  const { canInstall, triggerInstall } = usePwaInstall();

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    triggerInstall();
  };

  if (!canInstall) {
    return null;
  }

  if (isInsideSheet) {
     return (
        <a href="#" onClick={handleInstallClick} className="flex items-center text-lg font-medium text-muted-foreground hover:text-primary">
            <Download className="mr-2 h-5 w-5" />
            Install App
        </a>
     )
  }

  return (
    <DropdownMenuItem onClick={handleInstallClick}>
      <Download className="mr-2 h-4 w-4" />
      <span>Install App</span>
    </DropdownMenuItem>
  );
};
