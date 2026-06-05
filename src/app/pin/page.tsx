
'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Fingerprint, Delete, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { useLoading } from '@/context/loading-context';

const PIN_VERIFIED_SESSION_KEY = 'pin_verified_session';

type UserProfile = {
  pinCode?: string;
  pinEnabled?: boolean;
};

export default function PinPage() {
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const user = useUser();
  const { firestore } = useFirestore();
  const { auth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { hideLoading } = useLoading();
  
  useEffect(() => {
    hideLoading();
  }, [hideLoading]);

  useEffect(() => {
    if (user === null) {
      router.replace('/');
      return;
    }
    if (sessionStorage.getItem(PIN_VERIFIED_SESSION_KEY) === 'true') {
      router.replace('/dashboard');
      return;
    }

    // While auth state is being determined, do nothing.
    if (user === undefined) {
      return;
    }

    // If we have a user but firestore isn't ready, wait.
    if (!firestore) {
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        if (!data.pinEnabled) {
          // If PIN somehow got disabled while session was active, let them in.
          sessionStorage.setItem(PIN_VERIFIED_SESSION_KEY, 'true');
          router.replace('/dashboard');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore, router]);
  
   const handlePinChange = async (value: string) => {
    if (pin.length >= 4) return;
    const newPin = [...pin, value];
    setPin(newPin);

    if (newPin.length === 4) {
      if (newPin.join('') === profile?.pinCode) {
        sessionStorage.setItem(PIN_VERIFIED_SESSION_KEY, 'true');
        router.replace('/dashboard');
      } else {
        setError(true);
        setTimeout(() => {
            setPin([]);
            setError(false);
        }, 1000);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (auth) {
      await signOut(auth);
      sessionStorage.removeItem(PIN_VERIFIED_SESSION_KEY);
      router.push('/login');
    } else {
      toast({
        title: "Error",
        description: "Could not log out. Authentication service not available.",
        variant: "destructive"
      })
      setIsLoggingOut(false);
    }
  };
  
  const renderPinDots = () => {
    return Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className={cn(
          'h-4 w-4 rounded-full border-2',
          error ? 'border-destructive bg-destructive/50 animate-in shake' : 'border-primary/50',
          pin.length > index && 'bg-primary'
        )}
      />
    ));
  };


  if (loading || user === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="text-center mb-10">
            <div className="inline-block p-4 bg-primary/10 rounded-full border-2 border-primary/20 mb-2">
                <Fingerprint className="h-10 w-10 text-primary"/>
            </div>
            <p className="text-xs text-muted-foreground mb-4">v6.9.2:01.29.26</p>
            <h1 className="text-2xl font-bold">Ilagay ang iyong PIN</h1>
            <p className="text-muted-foreground">Para sa iyong seguridad, kumpirmahin ang iyong PIN para magpatuloy.</p>
            <Button variant="link" onClick={handleLogout} className="text-muted-foreground mt-4" disabled={isLoggingOut}>
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Nag-log out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Mag-log in sa ibang account
                </>
              )}
            </Button>
        </div>

        <div className="flex items-center gap-4 mb-10">
            {renderPinDots()}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button key={num} variant="outline" className="h-16 text-2xl hover:bg-background" onClick={() => handlePinChange(num.toString())}>
                    {num}
                </Button>
            ))}
            <div />
             <Button variant="outline" className="h-16 text-2xl hover:bg-background" onClick={() => handlePinChange('0')}>
                0
            </Button>
             <Button variant="ghost" className="h-16 hover:bg-background" onClick={handleDelete}>
                <Delete className="h-8 w-8"/>
            </Button>
        </div>
    </div>
  );
}
