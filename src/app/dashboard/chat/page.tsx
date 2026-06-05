

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, runTransaction, doc, serverTimestamp, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Send, Coins, Users, Smile, Swords, Loader2, Gift, RotateCcw, Check, ArrowDown, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const DAILY_CHAT_CREDIT_LIMIT = 500;

type ChatMessage = {
    id: string;
    text?: string;
    createdAt: any;
    userId: string;
    displayName: string;
    photoURL: string;
    reactions?: { [key: string]: string[] };
    pouch?: {
        totalAmount: number;
        claimsAvailable: number;
        amountPerClaim: number;
        claimedBy: string[];
    } | null,
    systemMessage?: string;
};

type TypingUser = {
    id: string;
    photoURL: string;
    displayName: string;
}

export default function GlobalChatPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mainAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [pendingInvites, setPendingInvites] = useState<string[]>([]);
    const pouchRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    
    // Pouch Indicator State
    const [firstUnclaimedPouchId, setFirstUnclaimedPouchId] = useState<string | null>(null);
    const [pouchIndicatorVisible, setPouchIndicatorVisible] = useState(false);
    const pouchObserver = useRef<IntersectionObserver | null>(null);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

    useEffect(() => {
        if (!firestore) {
            setLoading(false);
            return;
        }

        const messagesQuery = query(collection(firestore, 'chat_messages'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            setMessages(messagesData);
            setLoading(false);
            
            const firstUnclaimed = messagesData.find(msg => user && msg.pouch && msg.pouch.claimsAvailable > 0 && !msg.pouch.claimedBy.includes(user.uid) && msg.userId !== user.uid);
            setFirstUnclaimedPouchId(firstUnclaimed?.id || null);

        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'chat_messages', operation: 'list' }));
            setLoading(false);
        });

        // Listener for typing users in global chat
        const typingQuery = query(collection(firestore, 'users'), where('typingIn', '==', 'global'));
        const unsubTyping = onSnapshot(typingQuery, (snapshot) => {
            const users = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as TypingUser))
                .filter(u => u.id !== user?.uid); // Exclude current user
            setTypingUsers(users);
        });

        return () => {
            unsubscribe();
            unsubTyping();
        }
    }, [firestore, user]);
    
     useEffect(() => {
        if (pouchObserver.current) {
            pouchObserver.current.disconnect();
        }

        if (firstUnclaimedPouchId) {
            pouchObserver.current = new IntersectionObserver(
                ([entry]) => {
                    setPouchIndicatorVisible(!entry.isIntersecting);
                },
                { root: mainAreaRef.current, threshold: 0.1 }
            );

            const pouchElement = pouchRefs.current.get(firstUnclaimedPouchId);
            if (pouchElement) {
                pouchObserver.current.observe(pouchElement);
            }
        } else {
            setPouchIndicatorVisible(false);
        }
        
        return () => {
            if (pouchObserver.current) {
                pouchObserver.current.disconnect();
            }
        };

    }, [firstUnclaimedPouchId, messages]);

    useEffect(() => {
        if (user && firestore) {
            const sentInvitesQuery = query(collection(firestore, 'tic_tac_toe_games'), where('player1Id', '==', user.uid), where('status', '==', 'pending'));
            const unsubSentInvites = onSnapshot(sentInvitesQuery, (snapshot) => {
                const pInvites = snapshot.docs.map(doc => doc.data().player2Id);
                setPendingInvites(pInvites);
            }, (error) => {
                const permissionError = new FirestorePermissionError({ path: 'tic_tac_toe_games', operation: 'list' });
                 errorEmitter.emit('permission-error', permissionError);
            });
            return () => unsubSentInvites();
        }
    }, [user, firestore]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);
    
    const handleJumpToPouch = () => {
        if (firstUnclaimedPouchId) {
            const pouchElement = pouchRefs.current.get(firstUnclaimedPouchId);
            pouchElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
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
        if (!user || !firestore || !newMessage.trim() || isSending) return;

        setIsSending(true);
        const userDocRef = doc(firestore, "users", user.uid);
        const messagesCollectionRef = collection(firestore, "chat_messages");
        const tempNewMessage = newMessage;
        setNewMessage('');

        const messageData: Partial<ChatMessage> = {
            text: tempNewMessage,
            createdAt: serverTimestamp(),
            userId: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || '',
            reactions: {}
        };

        try {
             await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const userData = userDoc.data();
                const now = new Date();
                const lastReset = userData.lastChatCreditReset?.toDate();
                let dailyCredits = userData.dailyChatCredits || 0;
                let userUpdates: any = { typingIn: null };

                if (!lastReset || now.toDateString() !== lastReset.toDateString()) {
                    dailyCredits = 0;
                    userUpdates.lastChatCreditReset = serverTimestamp();
                }

                if (dailyCredits < DAILY_CHAT_CREDIT_LIMIT) {
                    userUpdates.credits = (userData.credits || 0) + 1;
                    userUpdates.dailyChatCredits = dailyCredits + 1;
                }

                transaction.update(userDocRef, userUpdates);

                const newMessageRef = doc(messagesCollectionRef);
                transaction.set(newMessageRef, messageData);
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

    const handleBattleClick = async (otherUser: { id: string, displayName: string, photoURL: string}) => {
        if (!user || !firestore || !otherUser || pendingInvites.includes(otherUser.id)) return;
        
        const gamesCollection = collection(firestore, 'tic_tac_toe_games');
        setPendingInvites(prev => [...prev, otherUser.id]);

        try {
            const newGameRef = await addDoc(gamesCollection, {
                player1Id: user.uid,
                player2Id: otherUser.id,
                player1DisplayName: user.displayName,
                player2DisplayName: otherUser.displayName,
                player1PhotoURL: user.photoURL,
                player2PhotoURL: otherUser.photoURL,
                playerX: user.uid,
                playerO: otherUser.id,
                status: 'pending',
                board: Array(9).fill(null),
                nextPlayer: user.uid,
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
                        setPendingInvites(prev => prev.filter(id => id !== otherUser.id));
                    }
                } else {
                    unsub();
                    setPendingInvites(prev => prev.filter(id => id !== otherUser.id));
                }
            }, (error) => {
                const permissionError = new FirestorePermissionError({ path: newGameRef.path, operation: 'get' });
                errorEmitter.emit('permission-error', permissionError);
                unsub(); // Stop listening on error
            });

        } catch (error: any) {
            setPendingInvites(prev => prev.filter(id => id !== otherUser.id));
            toast({ variant: 'destructive', title: 'Nabigo ang Pagpapadala ng Hamon', description: 'Hindi magawa ang sesyon ng laro.'});
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user || !firestore) return;

        const messageRef = doc(firestore, 'chat_messages', messageId);
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const isMyMessage = message.userId === user.uid;
        const userHasReactedWithThisEmoji = message.reactions?.[emoji]?.includes(user.uid);
        
        const shouldAwardCredits = !isMyMessage && !userHasReactedWithThisEmoji;
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const currentMessageDoc = await transaction.get(messageRef);
                if (!currentMessageDoc.exists()) throw new Error("Message not found.");

                const currentMessageData = currentMessageDoc.data() as ChatMessage;
                const authorRef = doc(firestore, 'users', currentMessageData.userId);

                const authorDoc = await transaction.get(authorRef);
                if (!authorDoc.exists()) throw new Error("Message author not found.");
                
                const authorData = authorDoc.data();
                let authorUpdates: any = {};
                
                if (shouldAwardCredits) {
                    const now = new Date();
                    const lastReset = authorData.lastChatCreditReset?.toDate();
                    let dailyCredits = authorData.dailyChatCredits || 0;

                    if (!lastReset || now.toDateString() !== lastReset.toDateString()) {
                        dailyCredits = 0;
                        authorUpdates.lastChatCreditReset = serverTimestamp();
                    }

                    if (dailyCredits < DAILY_CHAT_CREDIT_LIMIT) {
                        authorUpdates.credits = (authorData.credits || 0) + 2;
                        authorUpdates.dailyChatCredits = dailyCredits + 2;
                    }
                }

                const updatedReactions = { ...(currentMessageData.reactions || {}) };
                for (const key in updatedReactions) {
                    updatedReactions[key] = updatedReactions[key].filter(uid => uid !== user.uid);
                    if (updatedReactions[key].length === 0) {
                        delete updatedReactions[key];
                    }
                }
                
                if (!userHasReactedWithThisEmoji) {
                    updatedReactions[emoji] = [...(updatedReactions[emoji] || []), user.uid];
                }

                transaction.update(messageRef, { reactions: updatedReactions });
                
                if (Object.keys(authorUpdates).length > 0) {
                    transaction.update(authorRef, authorUpdates);
                }
            });

        } catch (error: any) {
             if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not apply reaction.' });
            }
        }
    };

    const handleClaimPouch = async (messageId: string) => {
        if (!user || !firestore) return;

        const messageRef = doc(firestore, 'chat_messages', messageId);
        const userRef = doc(firestore, 'users', user.uid);

        try {
            const amountClaimed = await runTransaction(firestore, async (transaction) => {
                const messageDoc = await transaction.get(messageRef);
                const userDoc = await transaction.get(userRef);

                if (!messageDoc.exists() || !userDoc.exists()) {
                    throw new Error("Game or user data not found.");
                }

                const messageData = messageDoc.data() as ChatMessage;
                const userData = userDoc.data();
                
                if (!messageData.pouch) throw new Error("This is not a pouch message.");
                if (messageData.pouch.claimedBy.includes(user.uid)) {
                    throw new Error("Na-claim mo na ang pouch na ito.");
                }
                if (messageData.pouch.claimsAvailable <= 0) throw new Error("This pouch has been fully claimed.");
                if (messageData.userId === user.uid) throw new Error("You cannot claim your own pouch.");

                const newClaimsAvailable = messageData.pouch.claimsAvailable - 1;
                const newClaimedBy = [...messageData.pouch.claimedBy, user.uid];
                const amountPerClaim = messageData.pouch.amountPerClaim;
                const newCredits = (userData.credits || 0) + amountPerClaim;
                
                const updates: any = {
                    'pouch.claimsAvailable': newClaimsAvailable,
                    'pouch.claimedBy': newClaimedBy
                };
                
                if (newClaimsAvailable === 0) {
                    updates.text = `[Pouch Ganap nang Na-claim]`;
                    updates.pouch = null;
                }

                transaction.update(messageRef, updates);
                transaction.update(userRef, { credits: newCredits });
                return amountPerClaim;
            });

            toast({ title: "Pouch Claimed!", description: `Nakatanggap ka ng ${amountClaimed} credits!` });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Claim Failed', description: error.message });
        }
    };
    
    const handleRetractPouch = async (messageId: string) => {
        if (!user || !firestore) return;
    
        const messageRef = doc(firestore, 'chat_messages', messageId);
        const userRef = doc(firestore, 'users', user.uid);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                const messageDoc = await transaction.get(messageRef);
                const userDoc = await transaction.get(userRef);
    
                if (!messageDoc.exists()) throw new Error("Pouch message not found.");
                if (!userDoc.exists()) throw new Error("User data not found.");
                
                const messageData = messageDoc.data() as ChatMessage;
                if (messageData.userId !== user.uid) throw new Error("You are not the owner of this pouch.");
                if (!messageData.pouch) throw new Error("This is not an active pouch message.");
    
                const { claimsAvailable, amountPerClaim } = messageData.pouch;
                const refundAmount = Math.floor(claimsAvailable * amountPerClaim);
    
                if (refundAmount > 0) {
                    const currentCredits = userDoc.data().credits || 0;
                    transaction.update(userRef, { credits: currentCredits + refundAmount });
                }
    
                transaction.update(messageRef, {
                    pouch: null,
                    text: `[Pouch Binawi]`,
                });
            });
    
            toast({ title: "Pouch Retracted", description: `The remaining credits have been returned to your account.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Retraction Failed', description: error.message });
        }
    };


    const renderMessage = (msg: ChatMessage, index: number) => {
        const isMyMessage = msg.userId === user?.uid;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        
        const isContinuation = prevMessage && !prevMessage.pouch && !msg.pouch && prevMessage.userId === msg.userId && msg.createdAt && prevMessage.createdAt && (msg.createdAt.toDate() - prevMessage.createdAt.toDate()) < 60000 * 2;
        
        const showDate = index === 0 || (msg.createdAt && prevMessage?.createdAt && !isSameDay(msg.createdAt.toDate(), prevMessage.createdAt.toDate()));
        const isBattleInvitePending = pendingInvites.includes(msg.userId);

        if (msg.pouch) {
            const isPouchCreator = msg.userId === user?.uid;
            const hasClaimed = msg.pouch.claimedBy.includes(user?.uid || '');

            return (
                <div key={msg.id} ref={el => { if (el) pouchRefs.current.set(msg.id, el); }} className="w-full flex justify-center my-2">
                    <div className="w-full max-w-xs p-3 rounded-lg bg-gradient-to-br from-yellow-300 to-orange-400 text-yellow-900 shadow-lg border border-yellow-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6 border-2 border-yellow-600">
                                <AvatarImage src={msg.photoURL} />
                                <AvatarFallback>{msg.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold text-sm">{isPouchCreator ? "Nag-drop ka ng credit pouch!" : `${msg.displayName} nag-drop ng credit pouch!`}</p>
                        </div>
                        <div className="text-center my-2">
                            <p className="text-2xl font-bold">{msg.pouch.amountPerClaim.toLocaleString()} <span className="text-lg">Credits</span></p>
                            <p className="text-xs">per claim</p>
                        </div>
                        {isPouchCreator ? (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="w-full h-9 bg-yellow-700 hover:bg-yellow-800 text-white text-sm">
                                        <RotateCcw className="mr-2 h-4 w-4"/> Bawiin ang Pouch
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Bawiin ang Credit Pouch?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Ang mga natitirang credits ay ibabalik sa iyong account at ang pouch ay aalisin sa chat. Sigurado ka ba?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Kanselahin</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRetractPouch(msg.id)}>Oo, Bawiin</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                             <Button 
                                className="w-full h-9 bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                                disabled={hasClaimed}
                                onClick={() => handleClaimPouch(msg.id)}
                            >
                                {hasClaimed ? "Na-claim mo na ang pouch na ito" : "I-claim"}
                            </Button>
                        )}
                       
                        <p className="text-center text-xs mt-2 opacity-80">{msg.pouch.claimsAvailable} / {(msg.pouch.claimsAvailable + msg.pouch.claimedBy.length)} natitira</p>
                    </div>
                </div>
            )
        }
        
        const isSystemMessage = msg.text?.startsWith('[') && msg.text?.endsWith(']');

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
                             {!isContinuation && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={msg.photoURL} />
                                    <AvatarFallback>{msg.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                             )}
                        </div>
                     )}
                     <div className={cn("flex flex-col gap-1.5", isMyMessage ? "items-end" : "items-start")}>
                         {!isMyMessage && !isContinuation && (
                             <p className="text-xs text-muted-foreground -mb-1 ml-2">{msg.displayName}</p>
                         )}
                        <div className={cn(
                            "max-w-xs md:max-w-md p-3 rounded-2xl group relative", 
                            isMyMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none",
                            isSystemMessage && "bg-transparent p-1 text-center w-full"
                        )}>
                            <p className={cn("break-words", isSystemMessage && "italic text-gray-500 text-sm")}>
                                {msg.text}
                            </p>
                            {!isSystemMessage && (
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
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleBattleClick({id: msg.userId, displayName: msg.displayName, photoURL: msg.photoURL})} disabled={isBattleInvitePending}>
                                            {isBattleInvitePending ? <Check className="h-4 w-4 text-green-500" /> : <Swords className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        {!isSystemMessage && (
                            <div className="flex items-center gap-2 px-2">
                                <p className="text-xs text-muted-foreground">
                                {msg.createdAt ? format(msg.createdAt.toDate(), 'p') : ''}
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
                        )}
                    </div>
                 </div>
             </React.Fragment>
        )
    }
    
    const renderTypingIndicator = () => {
        if (typingUsers.length === 0) return null;

        const visibleTypers = typingUsers.slice(0, 3);
        const remainingCount = typingUsers.length - visibleTypers.length;

        return (
            <div className="flex items-center gap-2 px-4 pb-1">
                <div className="flex -space-x-2">
                    {visibleTypers.map(u => (
                        <Avatar key={u.id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
                 <div className="flex items-center gap-1.5 px-3 py-2 bg-muted rounded-full">
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                </div>
                {remainingCount > 0 && (
                    <span className="text-xs text-muted-foreground">+{remainingCount} more</span>
                )}
            </div>
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
                    <h1 className="text-base font-bold text-primary flex items-center gap-2 justify-center"><Users /> Global Chat</h1>
                </div>
                <div className="w-10 h-10"></div>
            </header>

            <main ref={mainAreaRef} className="flex-1 overflow-y-auto p-4 pt-20 pb-2 flex flex-col">
                 <div className="flex-1 space-y-4">
                    {pouchIndicatorVisible && (
                        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20">
                            <Button onClick={handleJumpToPouch} variant="secondary" size="sm" className="h-auto px-2 py-1 rounded-full shadow-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-yellow-900">
                               <Gift className="mr-1.5 h-4 w-4"/>
                               <span className="text-xs font-semibold">Unclaimed Pouch</span>
                            </Button>
                        </div>
                    )}
                    {loading && <div className="flex justify-center pt-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
                    {!loading && messages.length === 0 && <p className="text-center text-muted-foreground pt-10">No messages yet. Be the first to say something!</p>}
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                 </div>
                 {renderTypingIndicator()}
            </main>
             <footer className="p-2 border-t bg-background sticky bottom-0 z-10">
                 <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                     <PouchDialog />
                     <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onFocus={() => updateTypingStatus('global')}
                        onBlur={() => updateTypingStatus(null)}
                        placeholder={isSending ? "Nagpapadala..." : "Magpadala ng mensahe sa lahat..."}
                        autoComplete="off"
                        disabled={!user || isSending}
                        className="flex-1 rounded-full px-4 py-2 h-10"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || !user || isSending} className="rounded-full w-10 h-10">
                         {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
                <p className="text-xs text-center text-muted-foreground mt-2">You earn <Coins className="h-3 w-3 text-accent inline-block" /> 1 credit for every message and 2 credits when others react to your message. (Up to 500 daily)</p>
            </footer>
        </div>
    );
}

function PouchDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [totalAmount, setTotalAmount] = useState('');
    const [userCount, setUserCount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const user = useUser();
    const { firestore } = useFirestore();
    const { toast } = useToast();

    const handleSendPouch = async () => {
        if (!user || !firestore) return;

        const amount = parseInt(totalAmount);
        const count = parseInt(userCount);

        if (isNaN(amount) || amount <= 0 || isNaN(count) || count <= 0) {
            toast({ title: "Invalid Input", description: "Please enter valid numbers for amount and users.", variant: 'destructive' });
            return;
        }
        if (amount < count) {
            toast({ title: "Invalid Amount", description: "Total amount must be at least 1 credit per user.", variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const userDocRef = doc(firestore, "users", user.uid);
        const messagesCollectionRef = collection(firestore, "chat_messages");

        const amountPerClaim = Math.floor(amount / count);
        const finalTotalAmount = amountPerClaim * count;

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const currentCredits = userDoc.data().credits || 0;
                if (currentCredits < finalTotalAmount) throw new Error("Insufficient credits to send this pouch.");

                transaction.update(userDocRef, { credits: currentCredits - finalTotalAmount });

                const newMessageRef = doc(messagesCollectionRef);
                transaction.set(newMessageRef, {
                    createdAt: serverTimestamp(),
                    userId: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    photoURL: user.photoURL || '',
                    pouch: {
                        totalAmount: finalTotalAmount,
                        claimsAvailable: count,
                        amountPerClaim: amountPerClaim,
                        claimedBy: []
                    }
                });
            });
            setIsOpen(false);
            setTotalAmount('');
            setUserCount('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Sending Pouch', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const amountPerUser = (parseInt(totalAmount) > 0 && parseInt(userCount) > 0) 
        ? Math.floor(parseInt(totalAmount) / parseInt(userCount)) 
        : 0;
    
    const actualTotal = amountPerUser * (parseInt(userCount) || 0);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full w-10 h-10">
                    <Gift className="h-5 w-5 text-accent" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a Credit Pouch</DialogTitle>
                    <DialogDescription>Share credits with other users in the global chat. Your balance will be deducted by the total amount.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="totalAmount">Total Credits to Send</Label>
                        <Input id="totalAmount" type="number" placeholder="e.g., 1000" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="userCount">Number of Users to Claim</Label>
                        <Input id="userCount" type="number" placeholder="e.g., 20" value={userCount} onChange={(e) => setUserCount(e.target.value)} />
                    </div>
                     {amountPerUser > 0 && (
                        <div className="text-center text-sm text-muted-foreground pt-2 space-y-1">
                            <p>
                                Each user will receive <span className="font-bold text-primary">{amountPerUser.toLocaleString()}</span> credits.
                            </p>
                            <p>
                                Total cost will be <span className="font-bold text-primary">{actualTotal.toLocaleString()}</span> credits.
                            </p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSendPouch} disabled={isSubmitting || actualTotal <= 0}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : `Send Pouch`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    

    
