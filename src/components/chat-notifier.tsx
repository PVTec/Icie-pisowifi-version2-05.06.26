
'use client';
import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Timestamp, collection, query, where, onSnapshot, doc, getDocs, orderBy, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { X, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type BaseNotification = {
    id: string;
    text: string;
    timestamp: Timestamp;
};

type PrivateMessageNotification = BaseNotification & {
    type: 'private';
    senderId: string;
    senderDisplayName: string;
    senderPhotoURL: string;
    conversationId: string;
};

type GlobalMessageNotification = BaseNotification & {
    type: 'global';
    senderId: string;
    senderDisplayName: string;
    senderPhotoURL: string;
};

type Notification = PrivateMessageNotification | GlobalMessageNotification;

type UserProfile = {
    notificationsEnabled?: boolean;
    conversations?: { 
        [key: string]: { 
            lastMessageTimestamp: Timestamp;
            lastMessage: string;
            unreadCount: number;
        } 
    };
    lastSeenGlobalChatTimestamp?: Timestamp;
};

type UserCache = { [key: string]: { displayName: string; photoURL: string } };

export function ChatNotifier({ profile }: { profile: UserProfile | null }) {
    const user = useUser();
    const { firestore } = useFirestore();
    const router = useRouter();
    const pathname = usePathname();
    const [notification, setNotification] = useState<Notification | null>(null);
    const userCache = useRef<UserCache>({});
    const lastDismissedTimestamp = useRef<Date | null>(null);

    const notificationsEnabled = profile?.notificationsEnabled !== false;

    // --- Global Chat Listener ---
    useEffect(() => {
        if (!firestore || !user || !notificationsEnabled || !profile) return;
        
        const q = query(
            collection(firestore, 'chat_messages'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty || pathname === '/dashboard/chat') return;

            const message = { id: snapshot.docs[0].id, ...snapshot.docs[0].data()};
            const messageTime = message.createdAt?.toDate();

            if (message.userId !== user.uid && !message.pouch && messageTime && (!lastDismissedTimestamp.current || messageTime > lastDismissedTimestamp.current)) {
                
                 if (!userCache.current[message.userId]) {
                    const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', message.userId)));
                    if (!userSnap.empty) {
                       const userData = userSnap.docs[0].data();
                       userCache.current[message.userId] = { displayName: userData.displayName, photoURL: userData.photoURL };
                    }
                }
                const sender = userCache.current[message.userId] || { displayName: 'Unknown', photoURL: '' };

                setNotification({
                    id: message.id,
                    type: 'global',
                    text: message.text,
                    timestamp: message.createdAt,
                    senderId: message.userId,
                    senderDisplayName: sender.displayName,
                    senderPhotoURL: sender.photoURL,
                } as GlobalMessageNotification);
            }
        });
        return () => unsubscribe();
    }, [firestore, user, notificationsEnabled, profile, pathname]);

    // --- Private Chat Listener ---
    useEffect(() => {
        if (!user || !firestore || !notificationsEnabled || !profile?.conversations) return;
        
        const unreadConvos = Object.entries(profile.conversations).filter(
            ([, convoData]) => convoData.unreadCount > 0
        );

        if (unreadConvos.length === 0) return;

        const latestUnreadConvo = unreadConvos.sort((a, b) => 
            b[1].lastMessageTimestamp.toMillis() - a[1].lastMessageTimestamp.toMillis()
        )[0];

        const [convoId, convoData] = latestUnreadConvo;
        const messageTime = convoData.lastMessageTimestamp.toDate();
        
        const otherUserId = convoId.split('_').find(id => id !== user.uid);
        if (!otherUserId || pathname === `/dashboard/chat/${convoId}` || (lastDismissedTimestamp.current && messageTime <= lastDismissedTimestamp.current)) return;
        
        const createNotification = async () => {
             if (!userCache.current[otherUserId]) {
                const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', otherUserId)));
                if (!userSnap.empty) {
                    const userData = userSnap.docs[0].data();
                    userCache.current[otherUserId] = { displayName: userData.displayName, photoURL: userData.photoURL };
                }
            }
            const sender = userCache.current[otherUserId] || { displayName: 'Unknown', photoURL: '' };

             setNotification({
                id: convoId, // Use convoId as a stable ID for the notification
                type: 'private',
                text: convoData.lastMessage,
                timestamp: convoData.lastMessageTimestamp,
                senderId: otherUserId,
                senderDisplayName: sender.displayName,
                senderPhotoURL: sender.photoURL,
                conversationId: convoId,
            });
        };
        
        createNotification();

    }, [firestore, user, notificationsEnabled, profile?.conversations, pathname]);
    
    const handleNotificationClick = () => {
        if (notification?.type === 'global') {
            router.push('/dashboard/chat');
        } else if (notification?.type === 'private') {
            router.push(`/dashboard/chat/${notification.conversationId}`);
        }
        if (notification) {
            lastDismissedTimestamp.current = notification.timestamp.toDate();
        }
        setNotification(null);
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (notification) {
            lastDismissedTimestamp.current = notification.timestamp.toDate();
        }
        setNotification(null);
    };
    
    if (!notification) {
        return null;
    }

    return (
        <div 
            className={cn(
                'fixed bottom-24 right-4 z-[101] w-80 max-w-[calc(100vw-2rem)] cursor-pointer rounded-xl bg-card shadow-2xl border transition-all duration-300 origin-bottom-right',
                'animate-in fade-in-0 slide-in-from-bottom-5 zoom-in-95',
            )}
            onClick={handleNotificationClick}
        >
            <div className="p-4">
                 <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2">
                        {notification.type === 'global' ? <Users className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                        {notification.type === 'global' ? 'New Global Message' : `Unread Message`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.senderPhotoURL} />
                        <AvatarFallback>{notification.senderDisplayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                         <p className="text-xs text-muted-foreground">{notification.senderDisplayName}</p>
                        <p className="text-sm font-medium truncate">{notification.text}</p>
                    </div>
                </div>
            </div>
            <button 
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
