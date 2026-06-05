
'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Swords } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GameInvite = {
  id: string;
  player1Id: string;
  player1DisplayName: string;
  player1PhotoURL: string;
  status: 'pending' | 'accepted' | 'declined';
};

export function GameInviteNotifier() {
  const user = useUser();
  const { firestore } = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [incomingInvite, setIncomingInvite] = useState<GameInvite | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      return;
    }

    const invitesQuery = query(
      collection(firestore, 'tic_tac_toe_games'),
      where('player2Id', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const invite = snapshot.docs[0].data() as GameInvite;
        invite.id = snapshot.docs[0].id;
        // Only show if the user is not already in a game
        if (!router.pathname?.includes('/dashboard/arena/tic-tac-toe/')) {
            setIncomingInvite(invite);
        }
      } else {
        setIncomingInvite(null);
      }
    });

    return () => unsubscribe();
  }, [user, firestore, router.pathname]);

  const handleAccept = async () => {
    if (!incomingInvite || !firestore) return;
    const gameDocRef = doc(firestore, 'tic_tac_toe_games', incomingInvite.id);
    try {
        await updateDoc(gameDocRef, { status: 'betting' });
        router.push(`/dashboard/arena/tic-tac-toe/${incomingInvite.id}`);
        setIncomingInvite(null);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not accept the battle invitation.' });
    }
  };

  const handleDecline = async () => {
    if (!incomingInvite || !firestore) return;
    const gameDocRef = doc(firestore, 'tic_tac_toe_games', incomingInvite.id);
    try {
        await updateDoc(gameDocRef, { status: 'declined' });
        setIncomingInvite(null);
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error', description: 'Could not decline the invitation.' });
    }
  };

  if (!incomingInvite) {
    return null;
  }

  return (
    <Dialog open={!!incomingInvite} onOpenChange={() => {}}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={handleDecline}>
        <DialogHeader>
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary border-2 border-primary/20">
                <Swords className="h-10 w-10" />
            </div>
            <DialogTitle className="text-2xl font-bold font-headline">Hamon sa Laban!</DialogTitle>
            <DialogDescription className="mt-2 flex flex-col items-center gap-2">
                <Avatar className="h-12 w-12 border-2">
                    <AvatarImage src={incomingInvite.player1PhotoURL} />
                    <AvatarFallback>{incomingInvite.player1DisplayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">{incomingInvite.player1DisplayName}</span> hinahamon ka sa isang laban ng Tic-Tac-Toe!
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-6 sm:justify-center gap-2">
          <Button variant="outline" onClick={handleDecline}>Tanggihan</Button>
          <Button onClick={handleAccept}>Tanggapin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
