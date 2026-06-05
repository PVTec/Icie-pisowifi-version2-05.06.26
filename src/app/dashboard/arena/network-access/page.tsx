'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const UNIVERSAL_ACCESS_CODE = 'VINCE_PERMITTED_GRANTACCESS-BETAXDAVIS';

export default function NetworkAccessPage() {
  const [accessCode, setAccessCode] = useState('');
  const { toast } = useToast();
  const user = useUser();
  const { firestore } = useFirestore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGrantAccess = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }
    if (accessCode !== UNIVERSAL_ACCESS_CODE) {
      toast({ variant: 'destructive', title: 'Invalid Access Code' });
      return;
    }

    setIsLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const now = new Date();
    const expires = new Date(now.getTime() + 36 * 60 * 60 * 1000); // 36 hours from now

    try {
      await updateDoc(userDocRef, { universalAccessExpiresAt: expires });
      toast({
        title: 'Universal Access Granted!',
        description: 'You can now access protected features from any network for 36 hours.',
        className: 'bg-green-100 border-green-300 text-green-800',
      });
      router.push('/dashboard/arena');
    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
            errorEmitter.emit('permission-error', error);
        } else {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not grant access. Please try again.' });
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center mb-8">
          <Button variant="outline" size="icon" className="mr-4" asChild>
              <Link href="/dashboard/arena">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back to Arena</span>
              </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline text-primary">Network Access</h1>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound/> Universal Access</CardTitle>
            <CardDescription>
                Enter a valid code here to gain temporary (36 hours) access to the Arena and Chat features from any network, including mobile data.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="access-code">Universal Access Code</Label>
                <Input
                    id="access-code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter your code here"
                    disabled={isLoading}
                />
            </div>
            <Button onClick={handleGrantAccess} disabled={isLoading || !accessCode} className="w-full">
                {isLoading ? 'Granting...' : <><CheckCircle className="mr-2"/> Grant Access</>}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
