'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type UserProfile = {
    universalAccessRequestedAt?: Timestamp;
};

export default function RequestAccessPage() {
  const { toast } = useToast();
  const user = useUser();
  const { firestore } = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
        }
    });
    return () => unsubscribe();
  }, [user, firestore]);

  const handleRequestAccess = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }

    setIsLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
      await updateDoc(userDocRef, { universalAccessRequestedAt: serverTimestamp() });
      toast({
        title: 'Request Sent!',
        description: 'The owner has been notified. Please wait for approval.',
        className: 'bg-green-100 border-green-300 text-green-800',
      });
    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
            errorEmitter.emit('permission-error', error);
        } else {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send request. Please try again.' });
        }
    } finally {
        setIsLoading(false);
    }
  };

  const isRequestPending = !!profile?.universalAccessRequestedAt;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center mb-8">
          <Button variant="outline" size="icon" className="mr-4" asChild>
              <Link href="/dashboard/arena">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back to Arena</span>
              </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline text-primary">Request Universal Access</h1>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Request Temporary Access</CardTitle>
            <CardDescription>
                If you are unable to connect to the "Icie Wifi" network, you can send a request to the owner for temporary universal access.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button onClick={handleRequestAccess} disabled={isLoading || isRequestPending} className="w-full">
                {isLoading 
                    ? 'Sending...' 
                    : isRequestPending 
                    ? <><Clock className="mr-2"/> Request Pending</>
                    : <><Send className="mr-2"/> Send Access Request</>
                }
            </Button>
             {isRequestPending && (
                <p className="text-sm text-center text-muted-foreground">
                    Your request has been sent. The owner will review it shortly. You will be notified when your request is approved or denied.
                </p>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
