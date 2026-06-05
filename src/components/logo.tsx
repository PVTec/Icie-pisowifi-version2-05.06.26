import { Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-xl font-bold text-primary transition-opacity hover:opacity-80", className)}>
      <Wifi className="h-6 w-6" />
      <span className="font-headline">Icie Wifi Portal</span>
    </Link>
  );
}
