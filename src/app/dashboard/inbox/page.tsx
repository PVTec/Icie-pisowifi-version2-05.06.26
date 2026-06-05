
'use client';

import { useFirestore, useUser } from '@/firebase';
import { onSnapshot, doc, Timestamp, getDoc, collection, query, where, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Users, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useLoading } from '@/context/loading-context';


type ConversationInfo = {
    id: string; // The conversation ID
    otherUserId: string;
    otherUserDisplayName: string;
    otherUserPhotoURL: string;
    lastMessage: string;
    lastMessageTimestamp: Timestamp;
    unreadCount: number;
};

type UserProfile = {
    conversations?: {
        [key: string]: {
            unreadCount: number;
            lastMessage: string;
            lastMessageTimestamp: Timestamp;
        }
    };
    lastSeenGlobalChatTimestamp?: Timestamp;
};

type UserCache = {
    [key: string]: {
        displayName: string;
        photoURL: string;
    } | null
}

type TicTacToeGame = {
    id: string;
    player1Id: string;
    player1DisplayName: string;
    player1PhotoURL: string;
    status: 'pending' | 'betting' | 'playing' | 'finished';
}

type ChatMessage = {
    createdAt: Timestamp;
}

export default function InboxPage() {
    const { firestore } = useFirestore();
    const currentUser = useUser();
    const [conversations, setConversations] = useState<ConversationInfo[]>([]);
    const [battleInvites, setBattleInvites] = useState<TicTacToeGame[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();
    const [hasNewGlobalMessages, setHasNewGlobalMessages] = useState(false);
    const { showLoading } = useLoading();

    useEffect(() => {
        if (!firestore || !currentUser) {
            setLoading(false);
            return;
        };

        const userDocRef = doc(firestore, 'users', currentUser.uid);

        // --- Listener for Global Chat notifications ---
        const lastGlobalMessageQuery = query(collection(firestore, 'chat_messages'), orderBy('createdAt', 'desc'), limit(1));
        const unsubLastMessage = onSnapshot(lastGlobalMessageQuery, (snapshot) => {
            if (!snapshot.empty) {
                const lastMessage = snapshot.docs[0].data() as ChatMessage;
                getDoc(userDocRef).then(userSnap => {
                    if (userSnap.exists()) {
                        const userData = userSnap.data() as UserProfile;
                        const lastSeen = userData.lastSeenGlobalChatTimestamp?.toDate();
                        const lastMessageTime = lastMessage.createdAt?.toDate();
                        if (lastMessageTime && (!lastSeen || lastMessageTime > lastSeen)) {
                            setHasNewGlobalMessages(true);
                        } else {
                            setHasNewGlobalMessages(false);
                        }
                    }
                });
            }
        }, (error) => {
            console.error("Error fetching last global message:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'chat_messages',
                operation: 'list'
            }));
        });


        // Listener for battle invitations
        const gamesQuery = query(
            collection(firestore, 'tic_tac_toe_games'),
            where('player2Id', '==', currentUser.uid),
            where('status', '==', 'pending')
        );

        const unsubGames = onSnapshot(gamesQuery, (snapshot) => {
            const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicTacToeGame));
            setBattleInvites(invites);
        }, (error) => {
            console.error("Error fetching battle invites:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'tic_tac_toe_games',
                operation: 'list'
            }));
        });

        // Listener for conversations
        const userCache: UserCache = {};
        const fetchUserDetails = async (userId: string) => {
            if (userCache[userId] !== undefined) return userCache[userId];
            try {
                const userDocDetailsRef = doc(firestore, 'users', userId);
                const docSnap = await getDoc(userDocDetailsRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    userCache[userId] = { displayName: data.displayName, photoURL: data.photoURL };
                    return userCache[userId];
                }
            } catch (error) { console.error("Error fetching user details:", error); }
            userCache[userId] = null;
            return null;
        };
        
        const unsubConversations = onSnapshot(userDocRef, async (snapshot) => {
            setLoading(true);
            if (!snapshot.exists()) {
                setLoading(false);
                return;
            }

            const profile = snapshot.data() as UserProfile;
            if (!profile.conversations) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const convosData = await Promise.all(
                Object.entries(profile.conversations).map(async ([convoId, data]) => {
                    const otherUserId = convoId.split('_').find(id => id !== currentUser.uid);
                    if (!otherUserId) return null;

                    const otherUserDetails = await fetchUserDetails(otherUserId);
                    return {
                        id: convoId,
                        otherUserId,
                        otherUserDisplayName: otherUserDetails?.displayName || 'Unknown User',
                        otherUserPhotoURL: otherUserDetails?.photoURL || '',
                        ...data,
                    };
                })
            );

            const validConvos = convosData.filter(c => c !== null) as ConversationInfo[];
            validConvos.sort((a, b) => b.lastMessageTimestamp.toMillis() - a.lastMessageTimestamp.toMillis());

            setConversations(validConvos);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching conversations:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get'
            }));
            setLoading(false);
        });

        return () => {
            unsubGames();
            unsubConversations();
            unsubLastMessage();
        };
    }, [firestore, currentUser]);

    const handleAcceptBattle = async (game: TicTacToeGame) => {
        if (!firestore) return;
        const gameDocRef = doc(firestore, 'tic_tac_toe_games', game.id);
        try {
            await updateDoc(gameDocRef, { status: 'betting' });
            router.push(`/dashboard/arena/tic-tac-toe/${game.id}`);
        } catch (error) {
            console.error("Failed to accept battle:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not accept the battle invitation.'});
        }
    };

    const handleDeclineBattle = async (gameId: string) => {
        if (!firestore) return;
        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
        try {
            // Instead of deleting, update the status to 'declined'
            await updateDoc(gameDocRef, { status: 'declined' });
            toast({ title: 'Invitation Declined' });
        } catch (error) {
            console.error("Failed to decline battle:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not decline the invitation.'});
        }
    };

    const handleConvoClick = (convoId: string) => {
        showLoading('bar');
        router.push(`/dashboard/chat/${convoId}`);
    }

    const handleGlobalChatClick = async () => {
        if (currentUser && firestore) {
            const userDocRef = doc(firestore, 'users', currentUser.uid);
            try {
                showLoading('bar');
                await updateDoc(userDocRef, {
                    lastSeenGlobalChatTimestamp: Timestamp.now()
                });
                router.push('/dashboard/chat');
            } catch (e) {
                console.error("Error updating last seen timestamp", e);
                router.push('/dashboard/chat');
            }
        }
    }
    
    const handleNavigationClick = (e: React.MouseEvent, href: string) => {
        e.preventDefault();
        showLoading('bar');
        router.push(href);
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center mb-8">
                <Button variant="outline" size="icon" className="mr-4" asChild>
                    <Link href="/dashboard" onClick={(e) => handleNavigationClick(e, '/dashboard')}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Dashboard</span>
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline text-primary">Inbox</h1>
            </div>

            {battleInvites.length > 0 && (
                <Card className="mb-6 bg-accent/10 border-accent">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Swords className="text-accent"/> Battle Invitations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {battleInvites.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={invite.player1PhotoURL} />
                                        <AvatarFallback>{invite.player1DisplayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{invite.player1DisplayName}</p>
                                        <p className="text-sm text-muted-foreground">has challenged you to a battle!</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleAcceptBattle(invite)}>Accept</Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeclineBattle(invite.id)}>Decline</Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                            <CardTitle>Your Conversations</CardTitle>
                            <CardDescription>All your private messages are here.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button onClick={handleGlobalChatClick} variant="secondary" size="sm" className="h-9 px-3 md:h-10 md:px-4 md:py-2 text-xs md:text-sm relative">
                                {hasNewGlobalMessages && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                    </span>
                                )}
                                <Users className="mr-2 h-4 w-4"/> Global Chat
                            </Button>
                            <Button asChild variant="secondary" size="sm" className="h-9 px-3 md:h-10 md:px-4 md:py-2 text-xs md:text-sm">
                                <Link href="/dashboard/online" onClick={(e) => handleNavigationClick(e, '/dashboard/online')}><Users className="mr-2 h-4 w-4"/> View Online</Link>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading && (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg bg-muted animate-pulse">
                                    <div className="h-12 w-12 rounded-full bg-background" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-1/4 bg-background rounded" />
                                        <div className="h-4 w-2/3 bg-background rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && conversations.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-lg font-semibold">Your inbox is empty.</p>
                            <p className="text-muted-foreground mt-2">Find someone online and start a conversation!</p>
                             <Button asChild className="mt-4">
                                <Link href="/dashboard/online" onClick={(e) => handleNavigationClick(e, '/dashboard/online')}>View Online Players</Link>
                            </Button>
                        </div>
                    )}
                    {!loading && conversations.length > 0 && (
                        <div className="space-y-2">
                            {conversations.map(convo => (
                                <div
                                    key={convo.id}
                                    className={cn("flex items-center gap-4 p-4 rounded-lg border cursor-pointer hover:bg-secondary/50", convo.unreadCount > 0 && "bg-primary/10")}
                                    onClick={() => handleConvoClick(convo.id)}
                                >
                                    <Avatar className="h-12 w-12 border-2 border-primary/50">
                                        <AvatarImage src={convo.otherUserPhotoURL} alt={convo.otherUserDisplayName} />
                                        <AvatarFallback>{convo.otherUserDisplayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 truncate">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold truncate">{convo.otherUserDisplayName}</p>
                                            {convo.lastMessageTimestamp && (
                                                <p className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                                    {formatDistanceToNow(convo.lastMessageTimestamp.toDate(), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <p className={cn("text-sm truncate", convo.unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground")}>{convo.lastMessage}</p>
                                            {convo.unreadCount > 0 && (
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                                                    {convo.unreadCount}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
