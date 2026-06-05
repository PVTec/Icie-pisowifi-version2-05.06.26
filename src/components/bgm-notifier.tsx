
'use client';
import { Music, ArrowDownRight, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { FirestorePermissionError, SecurityRuleContext } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useRouter } from 'next/navigation';

type UserProfile = {
  notificationsEnabled?: boolean;
  bgmThemeTrialExpiresAt?: Timestamp;
};

export function BgmNotifier() {
  const user = useUser();
  const { firestore } = useFirestore();
  const router = useRouter();
  const [isTrialAvailable, setIsTrialAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!user || !firestore) {
      setIsTrialAvailable(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setNotificationsEnabled(data.notificationsEnabled !== false);
          
          const hasTrialEverBeenUsed = !!data.bgmThemeTrialExpiresAt;
          setIsTrialAvailable(!hasTrialEverBeenUsed);
        } else {
          setIsTrialAvailable(false);
        }
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'get',
        } as SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  useEffect(() => {
    if (isTrialAvailable && notificationsEnabled) {
      const timer = setTimeout(() => {
        setShowNotification(true);
      }, 8000); // Show after 8 seconds
      return () => clearTimeout(timer);
    } else {
      setShowNotification(false);
    }
  }, [isTrialAvailable, notificationsEnabled]);

  const handleGoToProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/dashboard/profile');
    setShowNotification(false);
  };

  if (!showNotification) {
    return null;
  }

  return (
    <a href="/dashboard/profile"
      onClick={handleGoToProfile}
      className={cn(
        'fixed bottom-36 right-4 z-50 flex items-center gap-3 p-3 rounded-lg bg-accent/90 text-accent-foreground shadow-2xl transition-all duration-500 origin-bottom-right cursor-pointer',
        'animate-in fade-in-0 slide-in-from-bottom-5 zoom-in-95',
        showNotification ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}
    >
      <Gift className="h-5 w-5" />
      <span className="text-sm font-medium">Claim your BGM Theme trial!</span>
      <ArrowDownRight className="h-6 w-6 absolute -bottom-4 -right-2 text-accent" />
    </a>
  );
}
