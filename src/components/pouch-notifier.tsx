
'use client';
import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { X, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type PouchMessage = {
    id: string;
    createdAt: Timestamp;
    userId: string;
    displayName: string;
    photoURL: string;
    pouch: {
        amountPerClaim: number;
    }
};

export function PouchNotifier() {
    const user = useUser(); // Can be null if logged out
    const { firestore } = useFirestore();
    const router = useRouter();
    const [incomingPouch, setIncomingPouch] = useState<PouchMessage | null>(null);
    const lastSeenPouchId = useRef<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        // Firestore listener should run for everyone, logged in or not
        if (!firestore || !isClient) {
            return;
        }

        const q = query(collection(firestore, 'chat_messages'), orderBy('createdAt', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) return;

            const latestMessage = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PouchMessage;

            // Check if it's a pouch message and it's a new pouch
            if (latestMessage.pouch && latestMessage.id !== lastSeenPouchId.current) {
                // If the current user sent it, don't show notification
                if (user && latestMessage.userId === user.uid) {
                    lastSeenPouchId.current = latestMessage.id; // Still update to prevent re-showing on hot-reload
                    return;
                }
                
                lastSeenPouchId.current = latestMessage.id;
                setIncomingPouch(latestMessage);
            }
        }, (error) => {
            console.error("Error fetching latest message for pouch notifier:", error);
            // Non-critical, so we don't emit a global error
        });

        return () => unsubscribe();
    }, [firestore, user, isClient]);

    const handleNotificationClick = () => {
        // Persist the notification until clicked
    };

    const handleClaimClick = () => {
        if (incomingPouch) {
            router.push(`/dashboard/chat`);
            setIncomingPouch(null);
        }
    }

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIncomingPouch(null);
    }

    if (!incomingPouch || !isClient) {
        return null;
    }

    return (
        <div 
            className={cn(
                'fixed bottom-24 right-4 z-[101] w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-yellow-900 shadow-2xl border-2 border-yellow-500 transition-all duration-300 origin-bottom-right',
                'animate-in fade-in-0 slide-in-from-bottom-5 zoom-in-95',
                !incomingPouch && 'opacity-0 scale-95 pointer-events-none'
            )}
            onClick={handleClaimClick}
        >
            <div className="p-4 cursor-pointer">
                 <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Credit Pouch Dropped!
                    </p>
                    <p className="text-xs opacity-80">
                        {formatDistanceToNow(incomingPouch.createdAt.toDate(), { addSuffix: true })}
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border-2 border-yellow-600">
                        <AvatarImage src={incomingPouch.photoURL} />
                        <AvatarFallback>{incomingPouch.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate pt-1">
                        <p className="text-sm font-medium truncate">
                            <span className="font-bold">{incomingPouch.displayName}</span> dropped a pouch!
                        </p>
                         <p className="text-xs">Hurry and claim your share.</p>
                    </div>
                </div>
            </div>
            <button 
                onClick={handleDismiss}
                className="absolute top-1 right-1 p-1 text-yellow-800/70 hover:text-yellow-900 rounded-full hover:bg-white/20"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
