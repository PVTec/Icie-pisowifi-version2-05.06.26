
'use client';
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Coins, LogOut, User as UserIcon, Ticket, Swords, ShoppingCart, Router, Heart, Download, Home, Inbox, Banknote, UserCheck, Info, Wifi, Settings, MessageSquare, Briefcase, Trophy, Menu, MoreHorizontal, Users, Bell, Zap, Gamepad2, Palette } from "lucide-react";
import { Logo } from "@/components/logo";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { doc, onSnapshot, Timestamp, collection, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { cn } from "@/lib/utils";
import { BgmPlayer } from "@/components/bgm-player";
import { GameInviteNotifier } from "@/components/game-invite-notifier";
import { RedeemCreditsDialog } from "@/components/redeem-credits-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useMemoFirebase } from "@/hooks/use-memo-firebase";
import { ChatNotifier } from "@/components/chat-notifier";
import { useLoading } from "@/context/loading-context";
import { TopLoadingBar } from "@/components/top-loading-bar";

type UserProfile = {
    displayName: string;
    email: string;
    credits: number;
    photoURL: string;
    pinEnabled?: boolean;
    lastSeen?: Timestamp;
    hasMadePurchase?: boolean;
    notificationsEnabled?: boolean;
    monthlyEvent?: {
        month: string;
        arenaCreditsWon: number;
        vouchersPurchased: number;
        claimedRewards: string[];
    };
     conversations?: {
        [key: string]: {
            unreadCount: number;
            lastMessage: string;
            lastMessageTimestamp: Timestamp;
        }
    };
};

const PIN_VERIFIED_SESSION_KEY = 'pin_verified_session';

const NavLinkContent = ({ href, icon: Icon, label, pathname, hasNotification, onClick }: { href: string; icon: React.ElementType; label: string; pathname: string, hasNotification?: boolean, onClick: (e: React.MouseEvent) => void }) => {
    const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
    return (
        <Link href={href} onClick={onClick} className={cn("relative flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-primary transition-colors py-2", isActive && "text-primary")}>
             {hasNotification && (
                <span className="absolute top-0 right-3.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
            )}
            <Icon className="h-6 w-6"/>
            <span className="text-xs font-medium">{label}</span>
        </Link>
    );
};

const NavLink = ({ href, icon, label, pathname, hasNotification }: { href: string; icon: React.ElementType; label: string; pathname: string, hasNotification?: boolean }) => {
    const { showLoading } = useLoading();
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        showLoading('bar');
        router.push(href);
    };

    return <NavLinkContent href={href} icon={icon} label={label} pathname={pathname} hasNotification={hasNotification} onClick={handleClick} />;
};


function OverviewModal() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Info className="mr-2 h-4 w-4" />
                    Icie Wifi Portal Overview
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Wifi className="text-primary"/>
                        Icie Wifi Portal Overview
                    </DialogTitle>
                    <DialogDescription>
                         A quick guide to the Icie Wifi Portal.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6 text-sm text-foreground/90 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <h3 className="font-semibold text-primary mb-2">What is This?</h3>
                        <p className="text-muted-foreground">The Icie Wifi Portal is a web application designed to create an engaging and rewarding experience for wifi users. It transforms a standard internet service into an interactive platform with a virtual economy, games, and deep customization.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-primary mb-2">Key Features</h3>
                         <ul className="list-disc list-outside ml-4 space-y-3 text-muted-foreground">
                            <li><strong className="text-foreground">Credit-Based Economy:</strong> Earn "Credits" through daily logins, special codes, and events. Spend them on WiFi vouchers and exclusive cosmetic items.</li>
                            <li><strong className="text-foreground">Dynamic Shop:</strong> Purchase WiFi vouchers (with a 97% discount on your first buy!) and customize your portal with themes and animated effects.</li>
                            <li><strong className="text-foreground">Icie Arena:</strong> A play-and-earn game center where you can spend credits to play unique games and win bigger rewards.</li>
                             <li><strong className="text-foreground">Social Features:</strong> Chat with other users in the global chat, or have private conversations with friends in your inbox.</li>
                        </ul>
                    </div>
                    <div className="pt-4 border-t">
                        <h3 className="font-semibold text-destructive mb-2">Latest Update: v6.9.2 "The Quality of Life Update"</h3>
                        <p className="text-muted-foreground">
                            This update focuses on streamlining your experience with performance improvements, UI adjustments, and smart features to make your time on the portal smoother and more enjoyable.
                        </p>
                    </div>
                </div>
                 <Button asChild>
                    <Link href="/patch-notes">View Full Patch Notes</Link>
                </Button>
            </DialogContent>
        </Dialog>
    )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = useUser();
    const { firestore } = useFirestore();
    const { auth } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);
    const { hideLoading } = useLoading();
  
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient) {
            hideLoading();
        }
    }, [isClient, pathname, hideLoading]);

    useEffect(() => {
        if (isClient && user === null) {
            router.push('/login');
        }
    }, [user, isClient, router]);

    useEffect(() => {
        if (!user || !firestore) return;

        const unsubProfile = onSnapshot(doc(firestore, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const newProfile = docSnap.data() as UserProfile;
                setProfile(newProfile);
                 if (newProfile.pinEnabled && sessionStorage.getItem(PIN_VERIFIED_SESSION_KEY) !== 'true') {
                    router.push('/pin');
                }
            }
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${user.uid}`,
                operation: 'get',
            }));
        });

        const updateLastSeen = async () => {
            try {
                await updateDoc(doc(firestore, 'users', user.uid), {
                    lastSeen: serverTimestamp()
                });
            } catch (e) {
                console.warn("Could not update lastSeen timestamp:", e);
            }
        };

        updateLastSeen();
        const intervalId = setInterval(updateLastSeen, 60000);

        return () => {
            unsubProfile();
            clearInterval(intervalId);
        };
    }, [user, firestore, router]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            sessionStorage.removeItem(PIN_VERIFIED_SESSION_KEY);
            router.push('/');
        }
    };
  
    if (!isClient || user === null || user === undefined) {
        return <div className="flex items-center justify-center h-screen bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>;
    }
  
    const isSpecialPage = pathname.startsWith('/dashboard/chat') || pathname.startsWith('/dashboard/arena/tic-tac-toe') || pathname === '/pin';
    const hasUnreadMessages = profile?.conversations ? Object.values(profile.conversations).some(c => c.unreadCount > 0) : false;

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <TopLoadingBar />
        <GameInviteNotifier />
        <ChatNotifier profile={profile} />
        
        {!isSpecialPage && (
            <header className="fixed top-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Logo />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                             <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{profile?.displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuGroup>
                                <OverviewModal />
                                <DropdownMenuItem asChild><Link href="/dashboard/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href="/dashboard/online"><Users className="mr-2 h-4 w-4" />Sino ang Online</Link></DropdownMenuItem>
                                <PwaInstallButton />
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild><a href="http://10.0.0.1/" target="_blank" rel="noopener noreferrer"><Router className="mr-2 h-4 w-4" />Piso Wifi Portal</a></DropdownMenuItem>
                            <DropdownMenuItem asChild><a href="https://supportvince.vercel.app/" target="_blank" rel="noopener noreferrer"><Heart className="mr-2 h-4 w-4" />Support Vince</a></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
        )}

        <main className={cn("flex-1", !isSpecialPage && "pt-16 pb-24")}>
          <div className={cn("h-full")}>
            {children}
          </div>
        </main>
        
        {!isSpecialPage && (
          <footer className="fixed bottom-0 left-0 right-0 z-30">
              <div className="relative bg-card/95 backdrop-blur-md border-t h-[72px] shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
                 <div className="container mx-auto h-full flex justify-around items-center">
                    <NavLink href="/dashboard" icon={Home} label="Home" pathname={pathname} />
                    <NavLink href="/dashboard/shop" icon={ShoppingCart} label="Shop" pathname={pathname} />
                    <NavLink href="/dashboard/arena" icon={Gamepad2} label="Arena" pathname={pathname} />
                    <NavLink href="/dashboard/inbox" icon={MessageSquare} label="Inbox" pathname={pathname} hasNotification={hasUnreadMessages} />
                    <NavLink href="/dashboard/profile" icon={UserIcon} label="Profile" pathname={pathname} />
                 </div>
              </div>
          </footer>
        )}
        
        <div className={cn(
            "fixed right-4 z-40 transition-all duration-300",
            isSpecialPage ? "hidden" : "bottom-24"
          )}>
            <BgmPlayer />
        </div>
      </div>
  );
}
