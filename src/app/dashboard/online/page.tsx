
'use client';

import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, onSnapshot, Timestamp, doc, addDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Swords, MessageSquare, Users, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { useLoading } from '@/context/loading-context';


type OnlineUser = {
    id: string;
    displayName: string;
    photoURL?: string;
    lastSeen?: Timestamp;
    hasMadePurchase?: boolean;
};

type CurrentUserProfile = {
    displayName: string;
    photoURL: string;
    conversations?: { [key: string]: { unreadCount: number } };
    hasMadePurchase?: boolean;
};

export default function OnlineUsersPage() {
    const { firestore } = useFirestore();
    const currentUser = useUser();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreatingGame, setIsCreatingGame] = useState<string | null>(null);
    const [pendingInvites, setPendingInvites] = useState<string[]>([]);

    const { toast } = useToast();
    const router = useRouter();
    const { showLoading } = useLoading();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return query(collection(firestore, 'users'), where('lastSeen', '>', fiveMinutesAgo));
    }, [firestore]);
    
    // Effect for fetching current user profile and listening for pending invites
    useEffect(() => {
        if (!firestore || !currentUser) {
            return;
        }
        
        const unsubProfile = onSnapshot(doc(firestore, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                setCurrentUserProfile(docSnap.data() as CurrentUserProfile);
            }
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${currentUser.uid}`, operation: 'get' }));
        });

        const sentInvitesQuery = query(collection(firestore, 'tic_tac_toe_games'), where('player1Id', '==', currentUser.uid), where('status', '==', 'pending'));
        const unsubSentInvites = onSnapshot(sentInvitesQuery, (snapshot) => {
            const pInvites = snapshot.docs.map(doc => doc.data().player2Id);
            setPendingInvites(pInvites);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'tic_tac_toe_games', operation: 'list' }));
        });

        return () => {
            unsubProfile();
            unsubSentInvites();
        };

    }, [firestore, currentUser]);

    // Effect for fetching and filtering online users
    useEffect(() => {
        if (!usersQuery || !currentUser) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OnlineUser));
            const otherOnlineUsers = usersData.filter(user => user.id !== currentUser.uid);
            setOnlineUsers(otherOnlineUsers);
            setLoading(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'users', operation: 'list' }));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [usersQuery, currentUser]);


    const handleBattleClick = async (otherUser: OnlineUser) => {
        if (!currentUser || !currentUserProfile || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in to start a battle.'});
            return;
        }

        if (currentUserProfile.hasMadePurchase === false) {
             toast({ variant: 'destructive', title: 'Kailangan munang bumili sa shop para makapaghamon.', description: 'Gawin ang iyong unang pagbili sa shop para ma-unlock ang feature na ito.'});
            return;
        }

        setIsCreatingGame(otherUser.id);
        const gamesCollection = collection(firestore, 'tic_tac_toe_games');

        try {
            const newGameRef = await addDoc(gamesCollection, {
                player1Id: currentUser.uid,
                player2Id: otherUser.id,
                player1DisplayName: currentUserProfile.displayName,
                player2DisplayName: otherUser.displayName,
                player1PhotoURL: currentUserProfile.photoURL || '',
                player2PhotoURL: otherUser.photoURL || '',
                playerX: currentUser.uid, // Player 1 is X by default
                playerO: otherUser.id, // Player 2 is O
                betAmount: 0,
                player1Bet: null,
                player2Bet: null,
                player1Agreed: false,
                player2Agreed: false,
                player1Ready: false,
                player2Ready: false,
                negotiationRound: 1,
                board: Array(9).fill(null),
                nextPlayer: currentUser.uid, // Player X starts
                status: 'pending',
                winner: null,
                createdAt: serverTimestamp()
            });

            toast({
                title: "Hamon Ipinadala!",
                description: `Naipadala na ang iyong imbitasyon sa laban kay ${otherUser.displayName}.`,
            });
            
            // Listen for the opponent to accept
            const unsub = onSnapshot(doc(firestore, 'tic_tac_toe_games', newGameRef.id), (docSnap) => {
                if(docSnap.exists()){
                    const gameData = docSnap.data();
                    if(gameData.status === 'betting'){
                        unsub(); // Stop listening
                        router.push(`/dashboard/arena/tic-tac-toe/${newGameRef.id}`);
                    } else if (gameData.status === 'declined' || gameData.status === 'cancelled') {
                        unsub(); // Stop listening
                    }
                } else {
                    unsub(); // Stop listening if game is deleted
                }
            }, (error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: newGameRef.path, operation: 'get' }));
            });
            
        } catch (error: any) {
            console.error('Error creating game:', error);
            toast({ variant: 'destructive', title: 'Nabigo ang Pagpapadala ng Hamon', description: 'Hindi magawa ang sesyon ng laro. Pakisubukan muli.'});
        } finally {
            setIsCreatingGame(null);
        }
    };
    
    const handleChatClick = (otherUserId: string) => {
        if (!currentUser) return;
        const conversationId = [currentUser.uid, otherUserId].sort().join('_');
        showLoading('bar');
        router.push(`/dashboard/chat/${conversationId}`);
    };
    
    const getUnreadCountForUser = (userId: string) => {
        if (!currentUser || !currentUserProfile?.conversations) return false;
        const conversationId = [currentUser.uid, userId].sort().join('_');
        return (currentUserProfile.conversations[conversationId]?.unreadCount || 0) > 0;
    }

    const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        showLoading('bar');
        router.push('/dashboard');
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center mb-8">
                <Button variant="outline" size="icon" className="mr-4" asChild>
                    <Link href="/dashboard" onClick={handleBackClick}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Balik sa Dashboard</span>
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline text-primary">Sino ang Online</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mga Aktibong Manlalaro</CardTitle>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <CardDescription>Mga user na aktibo sa huling 5 minuto. Hamunin sila o magsimula ng chat!</CardDescription>
                        <Button asChild variant="secondary" onClick={() => showLoading('bar')}>
                            <Link href="/dashboard/chat"><Users className="mr-2"/> Global Chat</Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading && (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg bg-muted animate-pulse">
                                    <div className="h-12 w-12 rounded-full bg-background" />
                                    <div className="h-6 w-1/3 bg-background rounded" />
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && onlineUsers.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-lg font-semibold">Tahimik dito...</p>
                            <p className="text-muted-foreground mt-2">Walang ibang manlalaro na kasalukuyang aktibo. Bakit hindi magsimula ng laro sa Arena?</p>
                        </div>
                    )}
                    {!loading && onlineUsers.length > 0 && (
                        <div className="space-y-4">
                            {onlineUsers.map(user => {
                                const hasPendingInvite = pendingInvites.includes(user.id);
                                const canChallenge = currentUserProfile?.hasMadePurchase !== false;
                                return (
                                <div key={user.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border bg-secondary/50">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Avatar className="h-12 w-12 border-2 border-primary/50">
                                            <AvatarImage src={user.photoURL} alt={user.displayName} />
                                            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-semibold truncate">{user.displayName}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleBattleClick(user)} disabled={isCreatingGame === user.id || hasPendingInvite || !canChallenge} className="relative">
                                                {hasPendingInvite && (
                                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                                    </span>
                                                )}
                                                {isCreatingGame === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Swords className="mr-2 h-4 w-4" />}
                                                {isCreatingGame === user.id ? 'Nagpapadala...' : (hasPendingInvite ? 'Nakahain' : 'Laban')}
                                            </Button>
                                            
                                            <Button variant="secondary" size="sm" onClick={() => handleChatClick(user.id)} className="relative">
                                                {getUnreadCountForUser(user.id) && (
                                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                                    </span>
                                                )}
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Chat
                                            </Button>
                                        </div>
                                         {!canChallenge && (
                                            <p className="text-xs text-muted-foreground text-center mt-1">Kailangan munang bumili sa shop para makapaghamon.</p>
                                        )}
                                    </div>
                                </div>
                                )}
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
