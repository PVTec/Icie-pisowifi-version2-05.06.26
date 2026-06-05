
'use client';
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser, useFirestore } from "@/firebase";
import { CalendarDays, Coins, Gift, ShoppingCart, Star, Ticket, Copy, ArrowRight, Percent, Check, Loader2, X, Palette, Warehouse, Sparkles, Clock, Shield, Info, Trophy, Zap, Wallet, BarChart2, Briefcase, Menu, MoreHorizontal, MessageSquare, Users, Plus } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, runTransaction, collection, serverTimestamp, onSnapshot, Timestamp, query, orderBy, limit, getDocs, where, writeBatch, updateDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { useMemoFirebase } from "@/hooks/use-memo-firebase";
import { useCollection } from "@/firebase/provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RedeemCreditsDialog } from "@/components/redeem-credits-dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useLoading } from "@/context/loading-context";
import { useRouter } from "next/navigation";


type UserProfile = {
    displayName: string;
    email: string;
    credits: number;
    photoURL: string;
    lastBonusClaimedAt?: Timestamp;
    welcomeBonusClaimed?: boolean;
    hasMadePurchase?: boolean;
    monthlyEvent?: MonthlyEventProgress;
    purchasedThemes?: string[];
    activeTheme?: string;
    purchasedBubbleEffect?: boolean;
    bubbleEffectActive?: boolean;
    bubbleEffectTrialClaimed?: boolean;
    bubbleEffectTrialExpiresAt?: Timestamp;
    bgmThemeTrialExpiresAt?: Timestamp;
    investmentBuffs?: { [key: string]: number | Timestamp };
    investment?: {
        isActive?: boolean;
    }
};

type Transaction = {
    type: string;
    description: string;
    amount: number;
    createdAt: Timestamp;
}

type VoucherTemplate = {
  id: string;
  title: string;
  price: number;
  description: string;
};

type MonthlyEventProgress = {
    month: string; // "YYYY-MM"
    arenaCreditsWon: number;
    vouchersPurchased: number;
    claimedRewards: string[]; // e.g., ['arena-200', 'purchase-1500']
}

const carouselItems = [
  {
    href: "/dashboard/inbox",
    src: "/avatars/global.jpg",
    title: "Manatiling Konektado",
    description: "Sumali sa global chat o magpadala ng private message."
  },
  {
    href: "/dashboard/arena",
    src: "/avatars/sulit.jpg",
    title: "Sulitin ang Laro!",
    description: "Maglaro sa Arena para manalo ng malalaking premyo."
  },
  {
    href: "/dashboard/invest",
    src: "/avatars/invest.jpg",
    title: "Palaguin ang Credits",
    description: "Subukan ang Investment Hub at palakihin ang iyong yaman."
  },
  {
    href: "/dashboard/online",
    src: "/avatars/welcome.jpg",
    title: "Kumusta & Connect",
    description: "Tingnan kung sino ang online at magsimula ng chat!"
  }
];

const arenaGoals = [
    { id: 'arena-200', requirement: 200 }, { id: 'arena-350', requirement: 350 },
    { id: 'arena-500', requirement: 500 }, { id: 'arena-1000', requirement: 1000 },
    { id: 'arena-2500', requirement: 2500 }, { id: 'arena-5500', requirement: 5500 },
    { id: 'arena-10500', requirement: 10500 }, { id: 'arena-25500', requirement: 25500 },
    { id: 'arena-50000', requirement: 50000 },
];
const purchaseGoals = [
    { id: 'purchase-5', requirement: 5 }, { id: 'purchase-10', requirement: 10 },
    { id: 'purchase-20', requirement: 20 },
];


function DailyBonusCountdown({ lastBonusClaimedAt, onClaim, isClaimable }: { lastBonusClaimedAt?: Timestamp, onClaim: () => void, isClaimable: boolean }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!lastBonusClaimedAt || isClaimable) {
            setTimeLeft('Available now!');
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const lastClaim = lastBonusClaimedAt.toDate();
            const cooldown = 36 * 60 * 60 * 1000;
            const timeSinceLastClaim = now.getTime() - lastClaim.getTime();

            if (timeSinceLastClaim >= cooldown) {
                setTimeLeft('Available now!');
                clearInterval(interval);
            } else {
                const remainingTime = cooldown - timeSinceLastClaim;
                const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
                const seconds = Math.floor((remainingTime / 1000) % 60);
                setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastBonusClaimedAt, isClaimable]);

    return (
         <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            {isClaimable ? (
                <Button size="sm" onClick={onClaim} className="bg-white/20 hover:bg-white/30 text-white h-auto py-1 px-3">
                    <Gift className="mr-2 h-4 w-4" />
                    Claim 50 Credits
                </Button>
            ) : (
                <>
                    <Clock className="h-4 w-4" />
                    <span>Next bonus in {timeLeft}</span>
                </>
            )}
        </div>
    );
}

function RecentActivity({ user }: { user: any }) {
    const { firestore } = useFirestore();
    const [activities, setActivities] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore) return;
        const q = query(
            collection(firestore, `users/${user.uid}/transactions`),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const acts = snapshot.docs.map(doc => doc.data() as Transaction);
            setActivities(acts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, firestore]);

    const ICONS: { [key: string]: React.ReactNode } = {
        'voucher_purchase': <Ticket className="text-red-500" />,
        'redeem': <Gift className="text-green-500" />,
        'bonus': <Star className="text-yellow-500" />,
        'investment_deposit': <Wallet className="text-blue-500" />,
        'investment_cashout': <Coins className="text-green-500" />,
        'investment_start': <Zap className="text-purple-500" />,
        'investment_withdraw': <BarChart2 className="text-blue-500" />,
        'chat': <MessageSquare className="text-blue-500" />,
        'private_chat': <MessageSquare className="text-blue-500" />,
        'default': <Coins className="text-gray-500" />,
    }

    const getIcon = (type: string) => {
         if (type.includes('arena') || type.includes('game') || type.includes('Claimed event reward')) return <Trophy className="text-green-500" />;
         return ICONS[type] || ICONS.default;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
            </div>
            <div className="space-y-3">
                {loading && Array.from({ length: 3 }).map((_, i) => (
                     <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-card animate-pulse">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-muted rounded" />
                            <div className="h-3 w-1/4 bg-muted rounded" />
                        </div>
                        <div className="h-5 w-10 bg-muted rounded" />
                    </div>
                ))}
                {!loading && activities.map((act, i) => (
                    <Card key={i}>
                        <CardContent className="p-3 flex items-center gap-4">
                             <div className="p-2 bg-secondary rounded-full">
                                {getIcon(act.type)}
                             </div>
                             <div className="flex-1">
                                <p className="font-medium text-sm">{act.description}</p>
                                {act.createdAt && <p className="text-xs text-muted-foreground">{act.createdAt.toDate().toLocaleDateString()}</p>}
                             </div>
                             <p className={cn("font-semibold text-sm", act.amount >= 0 ? "text-green-600" : "text-red-600")}>
                                {act.amount > 0 ? '+' : ''}{act.amount}
                             </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

const LoadingLink = ({ href, children, className }: { href: string; children: React.ReactNode, className?: string }) => {
    const { showLoading } = useLoading();
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        showLoading('bar');
        router.push(href);
    };

    return <Link href={href} onClick={handleClick} className={className}>{children}</Link>;
};


export default function DashboardPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [onlineUserCount, setOnlineUserCount] = useState(0);
    const [showWelcomeBonusModal, setShowWelcomeBonusModal] = useState(false);
    const { toast } = useToast();
    const { showLoading } = useLoading();
    const router = useRouter();
    
    // Notification states
    const [hasUnclaimedRewards, setHasUnclaimedRewards] = useState(false);
    const [hasInvestmentUpdate, setHasInvestmentUpdate] = useState(false);
    const prevInvestmentState = React.useRef<boolean | undefined>();

  // Voucher templates state
    const [voucherTemplates, setVoucherTemplates] = useState<VoucherTemplate[]>([]);
    const [loadingVouchers, setLoadingVouchers] = useState(true);

  const templatesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'voucher_templates'), orderBy('price', 'asc'));
    }, [firestore]);

    useEffect(() => {
        if (!templatesQuery) {
            setLoadingVouchers(false);
            return;
        };
        const unsub = onSnapshot(templatesQuery, (snapshot) => {
            const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoucherTemplate));
            setVoucherTemplates(templates.slice(0, 3)); // Get top 3
            setLoadingVouchers(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `voucher_templates`, operation: 'list'}));
            setLoadingVouchers(false);
        });
        return () => unsub();
    }, [templatesQuery]);

    useEffect(() => {
        if (user && firestore) {
            const userDocRef = doc(firestore, "users", user.uid);
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const newProfile = docSnap.data() as UserProfile;
                    setProfile(newProfile);

                    // Check for investment updates
                    const currentInvestmentActive = newProfile.investment?.isActive;
                    if (prevInvestmentState.current === true && currentInvestmentActive === false) {
                        setHasInvestmentUpdate(true);
                        sessionStorage.setItem(`investmentUpdate_${user.uid}`, 'true');
                    }
                    prevInvestmentState.current = currentInvestmentActive;

                } else {
                    setProfile(null);
                }
            },
            (error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({path: `users/${user.uid}`, operation: 'get'}));
            });

            const usersQuery = query(
                collection(firestore, 'users'),
                where('lastSeen', '>', new Date(Date.now() - 5 * 60 * 1000))
            );
            const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
                setOnlineUserCount(snapshot.size);
            });

            return () => {
                unsubscribe();
                unsubUsers();
            };
        }
    }, [user, firestore]);
    
    useEffect(() => {
        if(sessionStorage.getItem(`investmentUpdate_${user?.uid}`) === 'true') {
            setHasInvestmentUpdate(true);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (profile?.monthlyEvent) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const eventData = profile.monthlyEvent;

            if (eventData.month === currentMonth) {
                const claimed = eventData.claimedRewards || [];
                const arenaProgress = eventData.arenaCreditsWon || 0;
                const purchaseProgress = eventData.vouchersPurchased || 0;
                
                const hasUnclaimedArena = arenaGoals.some(goal => arenaProgress >= goal.requirement && !claimed.includes(goal.id));
                const hasUnclaimedPurchase = purchaseGoals.some(goal => purchaseProgress >= goal.requirement && !claimed.includes(goal.id));
                
                setHasUnclaimedRewards(hasUnclaimedArena || hasUnclaimedPurchase);
            } else {
                setHasUnclaimedRewards(false);
            }
        }
        
        if (profile?.investment?.isActive === false) {
            if (sessionStorage.getItem(`investmentUpdate_${user?.uid}`) === 'true') {
                setHasInvestmentUpdate(true);
            }
        } else {
            setHasInvestmentUpdate(false);
            sessionStorage.removeItem(`investmentUpdate_${user?.uid}`);
        }
    }, [profile, user?.uid]);

    const handleClaimWelcomeBonus = async () => {
        if (!user || !firestore || profile?.welcomeBonusClaimed) return;
        
        const userDocRef = doc(firestore, "users", user.uid);

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const data = userDoc.data() as UserProfile;
                if(data.welcomeBonusClaimed) throw new Error("Bonus already claimed.");

                const newCredits = (data.credits || 0) + 300;
                transaction.update(userDocRef, { 
                    credits: newCredits,
                    welcomeBonusClaimed: true 
                });
                 const transactionRef = doc(collection(firestore, "users", user.uid, "transactions"));
                 transaction.set(transactionRef, {
                    type: 'bonus',
                    description: 'Welcome Bonus',
                    amount: 300,
                    createdAt: serverTimestamp()
                });
            });
            setShowWelcomeBonusModal(true);
        } catch (error: any) {
             if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `users/${user.uid}`,
                    operation: 'update',
                    requestResourceData: { welcomeBonusClaimed: true }
                }));
             } else {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
             }
        }
    };

    const handleClaimDailyBonus = async () => {
        if (!user || !firestore || !profile) return;

        const userDocRef = doc(firestore, "users", user.uid);

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const data = userDoc.data();
                const now = new Date();
                const lastClaimed = data.lastBonusClaimedAt?.toDate();
                const cooldown = 36 * 60 * 60 * 1000;
                
                if (lastClaimed && (now.getTime() - lastClaimed.getTime()) < cooldown) {
                    throw new Error("You have already claimed your daily bonus.");
                }

                const newCredits = data.credits + 50;
                transaction.update(userDocRef, {
                    credits: newCredits,
                    lastBonusClaimedAt: serverTimestamp()
                });
                
                const transactionRef = doc(collection(firestore, "users", user.uid, "transactions"));
                transaction.set(transactionRef, {
                    type: 'bonus',
                    description: 'Daily Login Bonus',
                    amount: 50,
                    createdAt: serverTimestamp()
                });
            });
            toast({
                title: "Bonus Claimed!",
                description: "You've received 50 credits.",
            });
        } catch (error: any) {
            if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: "destructive", title: "Claim Failed", description: error.message });
            }
        }
    };
    
     useEffect(() => {
        if(profile && profile.welcomeBonusClaimed === false) {
            handleClaimWelcomeBonus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    if (!profile) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        )
    }

    const isFirstPurchase = profile?.hasMadePurchase === false;
    const isBonusClaimable = !profile.lastBonusClaimedAt || (new Date().getTime() - profile.lastBonusClaimedAt.toDate().getTime()) >= 36 * 60 * 60 * 1000;


    return (
        <div className="bg-secondary/30 min-h-full">
            <Dialog open={showWelcomeBonusModal} onOpenChange={setShowWelcomeBonusModal}>
                <DialogContent>
                    <DialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                          <Gift className="h-6 w-6 text-green-600" />
                        </div>
                        <DialogTitle className="text-center">Welcome Bonus!</DialogTitle>
                        <DialogDescription className="text-center">
                            You have received 300 free credits to start your journey!
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button className="w-full">Awesome!</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="container mx-auto px-4 py-6 space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border-2 border-primary">
                            <AvatarImage src={profile.photoURL} />
                            <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">{profile.displayName}</h1>
                          <p className="text-xs text-muted-foreground">v6.9.2</p>
                        </div>
                    </div>
                </div>

                {/* Credits Card */}
                <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg overflow-hidden">
                    <CardContent className="p-5 relative">
                        <Star className="absolute top-2 right-10 h-8 w-8 opacity-20" />
                        <Sparkles className="absolute top-8 right-4 h-6 w-6 opacity-30" />
                        <Star className="absolute bottom-2 right-2 h-5 w-5 opacity-10" />
                        
                        <p className="text-sm opacity-80">Your Credits</p>
                        <div className="flex items-end justify-between gap-4 mt-1">
                            <div className="flex items-center gap-2">
                                <p className="text-4xl font-bold">{profile.credits.toLocaleString()}</p>
                                <Coins size={24} className="opacity-90"/>
                            </div>
                            <LoadingLink href="/dashboard/cash-in">
                                <Button className="bg-white text-primary dark:text-primary-foreground shadow-lg rounded-full h-9 px-4">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Cash In
                                </Button>
                            </LoadingLink>
                        </div>
                        <div className="mt-3">
                            <DailyBonusCountdown lastBonusClaimedAt={profile.lastBonusClaimedAt} onClaim={handleClaimDailyBonus} isClaimable={isBonusClaimable} />
                        </div>
                    </CardContent>
                </Card>
                
                {/* First Purchase Card */}
                {isFirstPurchase && (
                    <LoadingLink href="/dashboard/shop">
                        <Card className="hover:bg-secondary transition-colors">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-2 bg-blue-100 text-primary rounded-full">
                                    <Percent size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-primary">First Purchase Discount!</p>
                                    <p className="text-sm text-muted-foreground">Get 90% off your first voucher.</p>
                                </div>
                                <ArrowRight className="text-muted-foreground"/>
                            </CardContent>
                        </Card>
                    </LoadingLink>
                )}
                
                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-4 text-center">
                    <LoadingLink href="/dashboard/shop" className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-card">
                         <div className="p-3 bg-card rounded-full shadow-sm"><Ticket className="text-primary"/></div>
                         <span className="text-xs font-medium">Buy Voucher</span>
                    </LoadingLink>
                     <RedeemCreditsDialog profile={profile}>
                        <div className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-card">
                             <div className="p-3 bg-card rounded-full shadow-sm"><Gift className="text-primary"/></div>
                             <span className="text-xs font-medium">Redeem Code</span>
                        </div>
                    </RedeemCreditsDialog>
                    <LoadingLink href="/dashboard/events" className="relative flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-card">
                        {hasUnclaimedRewards && (
                            <span className="absolute top-1 right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                            </span>
                        )}
                        <div className="p-3 bg-card rounded-full shadow-sm"><Trophy className="text-primary"/></div>
                        <span className="text-xs font-medium">Events</span>
                    </LoadingLink>
                    <LoadingLink href="/dashboard/invest" className="relative flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-card">
                         {hasInvestmentUpdate && (
                            <span className="absolute top-1 right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                            </span>
                        )}
                        <div className="p-3 bg-card rounded-full shadow-sm"><Zap className="text-primary"/></div>
                        <span className="text-xs font-medium">Investment</span>
                    </LoadingLink>
                </div>
                
                {/* Active Players */}
                <LoadingLink href="/dashboard/online">
                    <Card className="hover:bg-secondary/60">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 text-green-600">
                                    <Users />
                                </div>
                                <div>
                                    <p className="font-bold">Active Players</p>
                                    <p className="text-sm text-muted-foreground">See who's online</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">{onlineUserCount} Online</Badge>
                        </CardContent>
                    </Card>
                </LoadingLink>

              {/* Voucher Rates */}
                <Card>
                    <CardHeader>
                        <CardTitle>Voucher Rates</CardTitle>
                        <CardDescription>A quick look at our most popular voucher prices.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                       {loadingVouchers && Array.from({length: 3}).map((_, i) => (
                           <div key={i} className="flex justify-between items-center text-sm p-3 bg-secondary/50 rounded-md animate-pulse">
                               <Skeleton className="h-5 w-24" />
                               <Skeleton className="h-5 w-16" />
                           </div>
                       ))}
                       {!loadingVouchers && voucherTemplates.map(template => {
                            const finalPrice = isFirstPurchase ? Math.ceil(template.price * 0.1) : template.price;
                            return (
                                <div key={template.id} className="flex justify-between items-center text-sm p-3 bg-secondary/50 rounded-md">
                                    <span className="font-medium">{template.title}</span>
                                    <div className="flex items-baseline gap-2">
                                       {isFirstPurchase && <span className="text-sm font-semibold text-muted-foreground line-through">{template.price.toLocaleString()}</span>}
                                        <span className="font-semibold text-primary">{finalPrice.toLocaleString()} credits</span>
                                    </div>
                                </div>
                            );
                       })}
                    </CardContent>
                    <CardContent>
                        <LoadingLink href="/dashboard/shop">
                            <Button className="w-full">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Buy Voucher
                            </Button>
                        </LoadingLink>
                    </CardContent>
                </Card>

                {/* Explore Carousel */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Explore the App</h2>
                  <Carousel
                    opts={{
                      align: "start",
                      loop: true,
                    }}
                    className="w-full"
                  >
                    <CarouselContent>
                      {carouselItems.map((item, index) => (
                        <CarouselItem key={index} className="basis-11/12 md:basis-1/2">
                          <div className="p-1">
                            <LoadingLink href={item.href}>
                              <Card className="overflow-hidden">
                                <CardContent className="p-0">
                                  <Image
                                    src={item.src}
                                    alt={item.title}
                                    width={400}
                                    height={225}
                                    className="aspect-video w-full object-cover"
                                  />
                                  <div className="p-3">
                                      <h3 className="font-semibold text-primary text-sm">{item.title}</h3>
                                      <p className="text-xs text-muted-foreground">{item.description}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            </LoadingLink>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </div>
                
                {/* Recent Activity */}
                <RecentActivity user={user} />
            </div>
        </div>
    );
}
