
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot, runTransaction, doc, serverTimestamp, getDoc, writeBatch, getDocs, where, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Send, Coins, Check, CheckCheck, Smile, Swords, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useParams, useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const DAILY_CHAT_CREDIT_LIMIT = 500;


type PrivateMessage = {
    id: string;
    text: string;
    createdAt: any;
    senderId: string;
    receiverId: string;
    isRead: boolean;
    reactions?: { [key: string]: string[] };
};

type OtherUser = {
    id: string;
    displayName: string;
    photoURL: string;
    typingIn?: string | null;
};

type CurrentUserProfile = {
    displayName: string;
    photoURL: string;
    dailyChatCredits?: number;
    lastChatCreditReset?: Timestamp;
};

export default function PrivateChatPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();
    const conversationId = params.conversationId as string;
    const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
    const [pendingInvite, setPendingInvite] = useState<string | null>(null);

    const otherUserId = conversationId?.split('_').find(id => id !== user?.uid);
    const isOtherUserTyping = otherUser?.typingIn === conversationId;

    useEffect(() => {
        if (!firestore || !otherUserId) return;
        
        const userDocRef = doc(firestore, 'users', otherUserId);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setOtherUser({
                    id: docSnap.id,
                    displayName: data.displayName,
                    photoURL: data.photoURL,
                    typingIn: data.typingIn,
                });
            }
        }, (error) => {
            console.error("Error fetching other user's profile:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get'
            }));
        });
    
        if(user) {
             const currentUserDocRef = doc(firestore, 'users', user.uid);
             const unsubCurrentUser = onSnapshot(currentUserDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCurrentUserProfile({ 
                        displayName: data.displayName, 
                        photoURL: data.photoURL,
                        dailyChatCredits: data.dailyChatCredits,
                        lastChatCreditReset: data.lastChatCreditReset,
                    });
                }
            }, (error) => {
                console.error("Error fetching current user's profile:", error);
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: currentUserDocRef.path,
                    operation: 'get'
                }));
            });
            return () => {
                unsubCurrentUser();
                unsubscribe();
            };
        }
    
        return () => unsubscribe();
    }, [firestore, otherUserId, user]);


    useEffect(() => {
        if (!firestore || !conversationId) {
            setLoading(false);
            return;
        };

        const messagesQuery = query(collection(firestore, `private_chats/${conversationId}/messages`), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrivateMessage));
            setMessages(messagesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages: ", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `private_chats/${conversationId}/messages`,
                operation: 'list'
            }));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, conversationId]);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOtherUserTyping]);
    
    useEffect(() => {
        const markAsRead = async () => {
            if (!firestore || !user || !conversationId) return;

            const unreadMessages = messages.filter(msg => msg.receiverId === user.uid && !msg.isRead);
            if (unreadMessages.length === 0) return;

            const batch = writeBatch(firestore);
            
            unreadMessages.forEach(msg => {
                const msgRef = doc(firestore, `private_chats/${conversationId}/messages`, msg.id);
                batch.update(msgRef, { isRead: true });
            });

            const userDocRef = doc(firestore, 'users', user.uid);
            batch.set(userDocRef, { 
                conversations: { 
                    [conversationId]: { unreadCount: 0 } 
                } 
            }, { merge: true });
            
            try {
                await batch.commit();
            } catch(e) {
                console.error("Error marking messages as read:", e);
            }
        };

        if (messages.length > 0 && document.hasFocus()) {
            const timeoutId = setTimeout(markAsRead, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [messages, firestore, user, conversationId]);

    const updateTypingStatus = async (status: string | null) => {
        if (!user || !firestore) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userDocRef, { typingIn: status });
        } catch (error) {
            console.error("Error updating typing status:", error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore || !otherUserId || !newMessage.trim() || isSending) return;

        setIsSending(true);
        const senderRef = doc(firestore, "users", user.uid);
        const receiverRef = doc(firestore, "users", otherUserId);
        const messagesCollectionRef = collection(firestore, `private_chats/${conversationId}/messages`);
        const tempNewMessage = newMessage;
        setNewMessage('');
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const senderDoc = await transaction.get(senderRef);
                const receiverDoc = await transaction.get(receiverRef);

                if (!senderDoc.exists() || !receiverDoc.exists()) throw new Error("User not found");

                const senderData = senderDoc.data();
                const receiverData = receiverDoc.data();

                // Daily credit limit logic
                const now = new Date();
                const lastReset = senderData.lastChatCreditReset?.toDate();
                let dailyCredits = senderData.dailyChatCredits || 0;
                let userUpdates: any = {};

                if (!lastReset || now.toDateString() !== lastReset.toDateString()) {
                    dailyCredits = 0;
                    userUpdates.lastChatCreditReset = serverTimestamp();
                }

                if (dailyCredits < DAILY_CHAT_CREDIT_LIMIT) {
                    const creditsToAdd = 2;
                    userUpdates.credits = (senderData.credits || 0) + creditsToAdd;
                    userUpdates.dailyChatCredits = dailyCredits + creditsToAdd;
                }
                
                transaction.update(senderRef, userUpdates);

                const newMessageRef = doc(messagesCollectionRef);
                transaction.set(newMessageRef, {
                    text: tempNewMessage,
                    createdAt: serverTimestamp(),
                    senderId: user.uid,
                    receiverId: otherUserId,
                    isRead: false,
                    reactions: {}
                });

                const timestamp = new Date();
                transaction.set(senderRef, {
                    conversations: {
                        [conversationId]: {
                            lastMessage: `You: ${tempNewMessage}`,
                            lastMessageTimestamp: timestamp,
                        }
                    },
                    typingIn: null, // Clear typing status on send
                }, { merge: true });
                
                transaction.set(receiverRef, {
                    conversations: {
                        [conversationId]: {
                            lastMessage: tempNewMessage,
                            lastMessageTimestamp: timestamp,
                            unreadCount: (receiverData.conversations?.[conversationId]?.unreadCount || 0) + 1,
                        }
                    }
                }, { merge: true });
            });
        } catch (error: any) {
             if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: 'destructive', title: 'Error sending message', description: error.message });
            }
             setNewMessage(tempNewMessage); // Restore message on error
        } finally {
            setIsSending(false);
            updateTypingStatus(null);
        }
    };
    
    // Clean up typing status on unmount
    useEffect(() => {
        return () => {
            if (user && firestore) {
                updateTypingStatus(null);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, firestore]);

    const handleBattleClick = async () => {
        if (!user || !currentUserProfile || !firestore || !otherUser || pendingInvite) return;
        
        const gamesCollection = collection(firestore, 'tic_tac_toe_games');
        setPendingInvite(otherUser.id);

        try {
            const newGameRef = await addDoc(gamesCollection, {
                player1Id: user.uid,
                player2Id: otherUser.id,
                player1DisplayName: currentUserProfile.displayName,
                player2DisplayName: otherUser.displayName,
                player1PhotoURL: currentUserProfile.photoURL,
                player2PhotoURL: otherUser.photoURL,
                playerX: user.uid, // Player 1 is X by default
                playerO: otherUser.id, // Player 2 is O
                status: 'pending',
                board: Array(9).fill(null),
                nextPlayer: user.uid, // Player X starts
                winner: null,
                createdAt: serverTimestamp(),
                betAmount: 0,
                player1Bet: null,
                player2Bet: null,
                player1Agreed: false,
                player2Agreed: false,
                player1Ready: false,
                player2Ready: false,
                negotiationRound: 1,
            });

            toast({
                title: "Naipadala ang Hamon!",
                description: `Naipadala na ang iyong imbitasyon sa laban kay ${otherUser.displayName}.`,
            });

            const unsub = onSnapshot(doc(firestore, 'tic_tac_toe_games', newGameRef.id), (docSnap) => {
                if(docSnap.exists()){
                    const gameData = docSnap.data();
                    if(gameData.status === 'betting'){
                        unsub();
                        router.push(`/dashboard/arena/tic-tac-toe/${newGameRef.id}`);
                    } else if (gameData.status === 'declined' || gameData.status === 'cancelled') {
                        unsub();
                        setPendingInvite(null); // Reset icon on decline
                    }
                } else {
                    unsub();
                    setPendingInvite(null);
                }
            }, (error) => {
                console.error("Error listening to game status:", error);
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: newGameRef.path,
                    operation: 'get'
                }));
                unsub();
            });

        } catch (error: any) {
             setPendingInvite(null);
            toast({ variant: 'destructive', title: 'Nabigo ang Pagpapadala ng Hamon', description: 'Hindi magawa ang sesyon ng laro.'});
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user || !firestore) return;

        const messageRef = doc(firestore, `private_chats/${conversationId}/messages`, messageId);
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const newReactions = { ...(message.reactions || {}) };
        
        const userHasReactedWithThisEmoji = newReactions[emoji]?.includes(user.uid);

        // Remove user's ID from all other emoji reactions
        for (const key in newReactions) {
            newReactions[key] = newReactions[key].filter(uid => uid !== user.uid);
             if (newReactions[key].length === 0) {
                delete newReactions[key];
            }
        }

        // If the user was not previously reacting with this emoji, add the new reaction
        if (!userHasReactedWithThisEmoji) {
            newReactions[emoji] = [...(newReactions[emoji] || []), user.uid];
        }
        
        try {
            await updateDoc(messageRef, { reactions: newReactions });
        } catch (error: any) {
             if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not apply reaction.' });
            }
        }
    }
    
    const renderMessage = (msg: PrivateMessage, index: number) => {
        const isMyMessage = msg.senderId === user?.uid;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        
        const isContinuation = prevMessage && prevMessage.senderId === msg.senderId && msg.createdAt && prevMessage.createdAt && (msg.createdAt.toDate() - prevMessage.createdAt.toDate()) < 60000 * 2;
        
        const showDate = index === 0 || (msg.createdAt && prevMessage?.createdAt && !isSameDay(msg.createdAt.toDate(), prevMessage.createdAt.toDate()));
        const isBattleInvitePending = pendingInvite === otherUser?.id;

        return (
            <React.Fragment key={msg.id}>
                {showDate && msg.createdAt && (
                    <div className="relative my-4">
                        <Separator />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-background px-2 text-xs text-muted-foreground">{format(msg.createdAt.toDate(), 'MMMM d, yyyy')}</span>
                        </div>
                    </div>
                )}
                <div className={cn("flex w-full items-start gap-2", isMyMessage ? "justify-end" : "justify-start")}>
                     {!isMyMessage && (
                        <div className="w-8 flex-shrink-0">
                             {!isContinuation && otherUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={otherUser.photoURL} />
                                    <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                             )}
                        </div>
                     )}
                     <div className={cn("flex flex-col gap-1.5", isMyMessage ? "items-end" : "items-start")}>
                         {!isMyMessage && !isContinuation && otherUser && (
                             <p className="text-xs text-muted-foreground -mb-1 ml-2">{otherUser.displayName}</p>
                         )}
                        <div className={cn("max-w-xs md:max-w-md p-3 rounded-2xl group relative", isMyMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none")}>
                            <p className="text-sm break-words">{msg.text}</p>
                            <div className={cn("absolute bottom-0 flex items-center gap-1 p-1 rounded-full bg-card border shadow-sm transition-opacity opacity-0 group-hover:opacity-100", isMyMessage ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2")}>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Smile className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-1">
                                        <div className="flex gap-1">
                                            {EMOJI_REACTIONS.map(emoji => (
                                                <Button key={emoji} variant="ghost" size="icon" className="h-8 w-8 text-lg" onClick={() => handleReaction(msg.id, emoji)}>
                                                    {emoji}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {!isMyMessage && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleBattleClick} disabled={isBattleInvitePending}>
                                        {isBattleInvitePending ? <Check className="h-4 w-4 text-green-500" /> : <Swords className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>
                        </div>
                         <div className={cn("flex items-center gap-2 px-2", isMyMessage ? "justify-end" : "justify-start")}>
                             <p className="text-xs text-muted-foreground">
                               {msg.createdAt ? format(msg.createdAt.toDate(), 'p') : ''}
                                {isMyMessage && (
                                    msg.isRead ? <CheckCheck className="inline-block ml-1 h-4 w-4 text-blue-500" /> : <Check className="inline-block ml-1 h-4 w-4" />
                                )}
                            </p>
                            
                             {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div className="flex gap-1">
                                    {Object.entries(msg.reactions).map(([emoji, uids]) => (
                                        uids.length > 0 && (
                                            <div key={emoji} className="flex items-center gap-1 rounded-full bg-secondary border shadow-sm px-1.5 py-0.5 text-xs cursor-pointer hover:bg-muted" onClick={() => handleReaction(msg.id, emoji)}>
                                                <span>{emoji}</span>
                                                <span className={cn("font-semibold", (uids.includes(user?.uid || '')) ? 'text-primary' : 'text-muted-foreground')}>{uids.length}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
            </React.Fragment>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-background relative">
            <header className="fixed top-0 left-0 right-0 flex items-center p-2 md:p-4 border-b bg-card z-20">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/inbox">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1 text-center">
                    {otherUser ? (
                        <div className="flex flex-col items-center">
                            <h1 className="text-base font-bold text-primary">{otherUser.displayName}</h1>
                        </div>
                    ) : (
                        <div className="h-8 w-32 bg-muted rounded-md animate-pulse mx-auto" />
                    )}
                </div>
                <Avatar className="h-9 w-9 border-2 border-primary/50">
                    <AvatarImage src={otherUser?.photoURL} />
                    <AvatarFallback>{otherUser?.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
            </header>

            <main className="flex-1 flex flex-col pt-20 pb-2">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-2">
                    {loading && <div className="flex justify-center pt-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                    {!loading && messages.length === 0 && !isOtherUserTyping && <p className="text-center text-muted-foreground pt-10">Wala pang mensahe. Kumusta!</p>}
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                </div>
                
                {isOtherUserTyping && otherUser && (
                    <div className="flex items-center gap-2 px-4 pb-1">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={otherUser.photoURL} />
                            <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted rounded-full">
                            <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
            </main>
            
            <footer className="p-2 border-t bg-background sticky bottom-0 z-10">
                 <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                     <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onFocus={() => updateTypingStatus(conversationId)}
                        onBlur={() => updateTypingStatus(null)}
                        placeholder={isSending ? "Nagpapadala..." : `Magpadala ng mensahe kay ${otherUser?.displayName || '...'}`}
                        autoComplete="off"
                        disabled={!user || isSending}
                        className="flex-1 rounded-full px-4 py-2 h-10"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || !user || isSending} className="rounded-full w-10 h-10">
                        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
                <p className="text-xs text-center text-muted-foreground mt-2">Kikita ka ng <Coins className="h-3 w-3 text-accent inline-block" /> 2 credits sa bawat mensaheng ipinadala. (Hanggang 500 kada araw)</p>
            </footer>
        </div>
    )
}
