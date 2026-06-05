
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useFirestore } from "@/firebase";
import { CalendarDays, Coins, Gift, ShoppingCart, Star, Ticket, Copy, ArrowRight, Percent, Check, Loader2, X, Palette, Sparkles, Clock, Shield, Zap, Info, Router } from "lucide-react";
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
import { doc, runTransaction, collection, serverTimestamp, onSnapshot, Timestamp, query, orderBy, getDocs, where, writeBatch, updateDoc, limit } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { useMemoFirebase } from "@/hooks/use-memo-firebase";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

type VoucherTemplate = {
  id: string;
  title: string;
  price: number;
  description: string;
};

type UserProfile = {
    hasMadePurchase?: boolean;
    credits: number;
    purchasedThemes?: string[];
    activeTheme?: string;
    purchasedBubbleEffect?: boolean;
    bubbleEffectActive?: boolean;
    bubbleEffectTrialClaimed?: boolean;
    bubbleEffectTrialExpiresAt?: Timestamp;
    bgmThemeTrialExpiresAt?: Timestamp;
    investmentBuffs?: { [key: string]: { qty: number, purchaseCount: number } };
    lastPurchased_WIN_50?: Timestamp;
};

const themes = [
    { id: 'light', name: 'Default Light', price: 0, description: 'The clean, default light theme.' },
    { id: 'dark', name: 'Default Dark', price: 1450, description: 'A sleek, eye-friendly dark theme.' },
    { id: 'bubbles-light', name: 'Bubbles Light', price: 2500, description: 'A light theme with a playful, animated bubble background.', isSpecial: true },
    { id: 'golden', name: 'Golden Theme', price: 1850, description: 'An exclusive, luxurious theme synced with its own BGM.', isSpecial: true },
    { id: 'takedown', name: 'Takedown Theme', price: 2550, description: 'A high-energy, vibrant theme for the pros.', isSpecial: true },
    { id: 'howitsdone', name: "How It's Done Theme", price: 3250, description: 'A stylish, modern theme with a unique vibe.', isSpecial: true },
    { id: 'christmas', name: 'Christmas Theme', price: 0, description: 'A festive theme for the holiday season!', isSpecial: true },
];

const investmentBuffsList = [
    { id: 'WIN_17', name: '+17% Win Chance', price: 300, growthRate: 1.045, availability: 'always', note: "Available every flash sale." },
    { id: 'WIN_25', name: '+25% Win Chance', price: 500, growthRate: 1.125, availability: 'twice_daily', note: "Available twice daily at random times." },
    { id: 'WIN_50', name: '+50% Win Chance', price: 1000, growthRate: 1.25, availability: 'once_daily_cooldown', note: "Available once a day for 15 minutes between 10PM-11PM, after 14-day cooldown." },
];


function Countdown({ onEnd, saleDurationMinutes = 30, cycleHours = 3, className }: { onEnd: () => void, saleDurationMinutes?: number, cycleHours?: number, className?: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      
      const nextSaleHour = (Math.floor(currentHour / cycleHours) + 1) * cycleHours;
      const saleEndsAt = new Date(now);
      saleEndsAt.setHours(nextSaleHour, 0, 0, 0);
      
      let diff = saleEndsAt.getTime() - now.getTime();

      // If we are in a sale period, calculate time to the *next* sale period
      if (currentHour % cycleHours === 0 && currentMinute < saleDurationMinutes) {
          saleEndsAt.setHours(currentHour + cycleHours);
          diff = saleEndsAt.getTime() - now.getTime();
      }

      if (diff < 0) {
        // This case should ideally not be hit frequently with the logic above but acts as a fallback
        setTimeLeft('Soon...');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

      
    }, 1000);

    return () => clearInterval(timer);
  }, [onEnd, saleDurationMinutes, cycleHours]);

  return <span className={cn("font-mono", className)}>{timeLeft}</span>;
}

function CooldownTimer50({ expiresAt }: { expiresAt: Date }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = expiresAt.getTime() - now;

            if (distance < 0) {
                setTimeLeft('Available Soon!');
                clearInterval(timer);
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            
            setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        }, 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    return (
        <Button variant="outline" disabled className="w-full bg-secondary/50">
            <Clock className="mr-2 h-4 w-4"/>
            Available in: <span className="font-semibold ml-1">{timeLeft}</span>
        </Button>
    );
}

// Simple seeded random number generator
const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};


function ShopPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const [voucherTemplates, setVoucherTemplates] = useState<VoucherTemplate[]>([]);
    const [loadingVouchers, setLoadingVouchers] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
    const [purchasedVoucherCode, setPurchasedVoucherCode] = useState<string | null>(null);
    const [wasFirstPurchase, setWasFirstPurchase] = useState(false);
    const [showInvestmentUnlockedModal, setShowInvestmentUnlockedModal] = useState(false);
    const [hasCopiedCode, setHasCopiedCode] = useState(false);
    
    // Flash Sale States
    const [isFlashSaleActive, setIsFlashSaleActive] = useState(false);
    const [hasPurchasedThisSale, setHasPurchasedThisSale] = useState(false);
    
    // Get two "random" but deterministic hours for the 25% buff
    const [specialBuffHours, setSpecialBuffHours] = useState<number[]>([]);
     const [specialBuffMinute, setSpecialBuffMinute] = useState<number>(0);

    useEffect(() => {
        const today = new Date();
        const dayOfYear = getDayOfYear(today);
        const seed = dayOfYear + today.getFullYear(); // Make seed vary by year too
        const random = mulberry32(seed);
        
        const hour1 = Math.floor(random() * 24);
        let hour2;
        do {
            hour2 = Math.floor(random() * 24);
        } while (hour1 === hour2);
        
        setSpecialBuffHours([hour1, hour2]);

        // For the 50% buff
        setSpecialBuffMinute(Math.floor(random() * 60)); // Random minute between 0-59
    }, []);


    // --- Profile & Voucher Data Fetching ---
    useEffect(() => {
        if (!user || !firestore) return;
        const unsub = onSnapshot(doc(firestore, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
            }
        });
        return () => unsub();
    }, [user, firestore]);

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
            setVoucherTemplates(templates);
            setLoadingVouchers(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `voucher_templates`, operation: 'list'}));
            setLoadingVouchers(false);
        });
        return () => unsub();
    }, [templatesQuery]);
    
    // --- Flash Sale Logic ---
    useEffect(() => {
        const checkSaleStatus = () => {
            const now = new Date();
            const hour = now.getHours();
            const minutes = now.getMinutes();
            // Sale is active for 30 mins every 3 hours (e.g., 12:00-12:30, 3:00-3:30, etc.)
            const saleIsActive = hour % 3 === 0 && minutes < 30;

            if (saleIsActive !== isFlashSaleActive) {
                setIsFlashSaleActive(saleIsActive);
                if (saleIsActive) {
                    setHasPurchasedThisSale(false); // Reset purchase flag at the start of a new sale
                }
            }
        };

        checkSaleStatus();
        const interval = setInterval(checkSaleStatus, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [isFlashSaleActive]);


    // --- Purchase Logic ---
    const handlePurchase = async (template: VoucherTemplate) => {
        if (!user || !firestore || !profile) return;
        
        const isFirstPurchase = profile.hasMadePurchase === false;
        const finalPrice = isFirstPurchase ? Math.ceil(template.price * 0.1) : template.price;

        if (profile.credits < finalPrice) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits', description: 'Wala kang sapat na credits para bilhin ito.' });
            return;
        }

        setIsPurchasing(template.id);
        setHasCopiedCode(false); // Reset copy state on new purchase

        try {
            const generatedCode = await runTransaction(firestore, async (transaction) => {
                const userDocRef = doc(firestore, "users", user.uid);
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");

                const currentCredits = userDoc.data().credits;
                if (currentCredits < finalPrice) throw new Error("Kulang ang credits");

                const codesCollectionRef = collection(firestore, `voucher_templates/${template.id}/voucher_codes`);
                const codesQuery = query(codesCollectionRef, where('status', '==', 'active'), limit(1));
                const availableCodesSnap = await getDocs(codesQuery);

                if (availableCodesSnap.empty) {
                    throw new Error(`Walang available na voucher codes para sa "${template.title}". Pakisabi sa admin.`);
                }

                const voucherCodeDoc = availableCodesSnap.docs[0];
                const newCode = voucherCodeDoc.data().code;
                
                const userUpdateData: any = { credits: currentCredits - finalPrice };
                if (isFirstPurchase) userUpdateData.hasMadePurchase = true;
                
                const currentMonth = new Date().toISOString().slice(0, 7);
                const eventProgress = userDoc.data().monthlyEvent || { month: '1970-01' };
                
                if (eventProgress.month !== currentMonth) {
                    userUpdateData.monthlyEvent = { month: currentMonth, vouchersPurchased: 1, arenaCreditsWon: 0, claimedRewards: [] };
                } else {
                    userUpdateData['monthlyEvent.vouchersPurchased'] = (eventProgress.vouchersPurchased || 0) + 1;
                }

                transaction.update(userDocRef, userUpdateData);
                transaction.update(voucherCodeDoc.ref, { status: 'used', usedAt: serverTimestamp(), usedBy: user.uid });
                const transactionRef = doc(collection(firestore, "users", user.uid, "transactions"));
                transaction.set(transactionRef, {
                    type: 'voucher_purchase',
                    description: `Purchased "${template.title}" voucher${isFirstPurchase ? ' (First Purchase Discount)' : ''}`,
                    amount: -finalPrice,
                    createdAt: serverTimestamp(),
                    voucherCode: newCode
                });

                return newCode;
            });
            
            sessionStorage.setItem('newVoucherPurchased', 'true');
            if (isFirstPurchase) {
                sessionStorage.setItem('showBattleUnlock', 'true');
                setWasFirstPurchase(true);
            }
            setPurchasedVoucherCode(generatedCode);

        } catch (error: any) {
            if (error.message.includes('permission-denied')) {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `voucher_templates/.../voucher_codes`, operation: 'write' }));
            }
            toast({ variant: "destructive", title: "Nabigo ang Pagbili", description: error.message });
        } finally {
            setIsPurchasing(null);
        }
    };
    
    const handleCopyCode = () => {
        if (purchasedVoucherCode) {
            navigator.clipboard.writeText(purchasedVoucherCode);
            setHasCopiedCode(true);
            toast({ title: "Nai-kopya ang Voucher Code!" });
        }
    };

    const handleBuyCosmetic = async (item: { id: string, name: string, price: number, type: 'theme' | 'buff', growthRate?: number }) => {
        if (!user || !firestore || !profile) return;
        
        let finalPrice = item.price;
        
        if (item.type === 'buff') {
            if (hasPurchasedThisSale) {
                toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can only purchase one buff per flash sale.' });
                return;
            }
            if (item.growthRate) {
                const buffData = profile.investmentBuffs?.[item.id];
                const purchaseCount = (buffData?.purchaseCount || 0);
                finalPrice = Math.round(item.price * Math.pow(item.growthRate, purchaseCount));
            }
        }
        
        if (profile.credits < finalPrice) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits' });
            return;
        }

        setIsPurchasing(item.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDocRef = doc(firestore, 'users', user.uid);
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");

                const userData = userDoc.data();
                if (userData.credits < finalPrice) throw new Error("Kulang ang credits");

                const updates: any = { credits: userData.credits - finalPrice };
                
                if (item.type === 'theme') {
                    updates.purchasedThemes = [...(profile.purchasedThemes || []), item.id];
                } else if (item.type === 'buff') {
                    const currentBuffs = userData.investmentBuffs || {};
                    const currentBuffData = currentBuffs[item.id];
                    const currentQty = (currentBuffData?.qty || 0);
                    const currentPurchaseCount = (currentBuffData?.purchaseCount || 0);
                    
                    updates.investmentBuffs = {
                        ...currentBuffs,
                        [item.id]: {
                            qty: currentQty + 1,
                            purchaseCount: currentPurchaseCount + 1
                        }
                    };

                    if (item.id === 'WIN_50') {
                        updates.lastPurchased_WIN_50 = serverTimestamp();
                    }
                }
                
                transaction.update(userDocRef, updates);

                const transacRef = doc(collection(firestore, "users", user.uid, "transactions"));
                transaction.set(transacRef, {
                    type: item.type === 'theme' ? 'theme_purchase' : 'buff_purchase',
                    description: `Purchased ${item.name}`,
                    amount: -finalPrice,
                    createdAt: serverTimestamp(),
                });
            });
            if(item.type === 'buff') {
                setHasPurchasedThisSale(true);
            }
            toast({ title: 'Tagumpay!', description: `Successfully purchased ${item.name}!` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Purchase Failed', description: error.message });
        } finally {
            setIsPurchasing(null);
        }
    };
    
    const handleEquipTheme = async (themeId: string) => {
        if (!user || !firestore) return;
        await updateDoc(doc(firestore, 'users', user.uid), { activeTheme: themeId });
        toast({ title: 'Theme Equipped!', description: `The ${themes.find(t=>t.id===themeId)?.name} is now active.` });
    };

    
    if (!profile) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    // --- BUFF AVAILABILITY LOGIC ---
    const isBuffAvailable = (buff: typeof investmentBuffsList[0]) => {
        if (hasPurchasedThisSale) return false;
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        switch(buff.availability) {
            case 'always':
                return true;
            case 'twice_daily': {
                 return specialBuffHours.includes(currentHour);
            }
            case 'once_daily_cooldown': {
                const last50PurchaseDate = profile?.lastPurchased_WIN_50?.toDate();
                if (last50PurchaseDate) {
                    const cooldown = 14 * 24 * 60 * 60 * 1000;
                    if (now.getTime() - last50PurchaseDate.getTime() < cooldown) return false;
                }
                // Check for the 15-minute window between 10 PM and 11 PM
                const isSaleHour = currentHour === 22; // 10 PM
                const isSaleWindow = currentMinute >= specialBuffMinute && currentMinute < specialBuffMinute + 15;
                return isSaleHour && isSaleWindow;
            }
            default:
                return false;
        }
    };


    return (
        <div className="container mx-auto px-4 py-8">
            <Dialog
                open={!!purchasedVoucherCode}
                onOpenChange={(open) => {
                    if (!open) {
                        setPurchasedVoucherCode(null);
                        setHasCopiedCode(false);
                        if (wasFirstPurchase) {
                            setShowInvestmentUnlockedModal(true);
                            setWasFirstPurchase(false);
                        }
                    }
                }}
            >
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                          <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <DialogTitle className="text-center">Tagumpay ang Pagbili!</DialogTitle>
                        <DialogDescription className="text-center">
                            Ito ang iyong bagong voucher code. I-copy ito at i-enter sa iyong WiFi portal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-4 flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-secondary p-4">
                        <p className="text-2xl font-bold font-mono text-primary">{purchasedVoucherCode}</p>
                        <Button variant="ghost" size="icon" onClick={handleCopyCode}><Copy/></Button>
                    </div>
                    
                    {!hasCopiedCode && (
                        <div className="text-center text-xs text-destructive font-medium p-2 bg-destructive/10 rounded-md">
                           Kopyahin muna ang code para ma-enable ang mga button.
                        </div>
                    )}
                    
                    <div className="rounded-md border bg-muted p-3 text-center text-sm text-muted-foreground">
                        <Info className="inline h-4 w-4 mr-2"/>
                        I-paste ang code na ito sa "Voucher Code" input sa WiFi portal para ma-claim ang iyong internet access.
                    </div>
                     <div className="text-xs text-center text-muted-foreground mt-2">
                        <p>Nakalimutan i-claim? Huwag mag-alala!</p>
                        <p>Makikita mo ang code na ito sa iyong <Link href="/dashboard/profile/vouchers" className="underline font-semibold text-primary">Profile > Aking mga Voucher</Link>.</p>
                    </div>
                    <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
                         <Button variant="outline" onClick={() => setPurchasedVoucherCode(null)} disabled={!hasCopiedCode}>Isara</Button>
                        <Button asChild disabled={!hasCopiedCode}>
                           <a href="http://10.0.0.1/" target="_blank" rel="noopener noreferrer">
                               <Router className="mr-2 h-4 w-4" />
                               Pumunta sa Portal
                           </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showInvestmentUnlockedModal} onOpenChange={setShowInvestmentUnlockedModal}>
                <DialogContent>
                    <DialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                          <Zap className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-center">Investment Hub Unlocked!</DialogTitle>
                        <DialogDescription className="text-center">
                            Congratulations! Dahil sa iyong unang pagbili, na-unlock mo na ang Investment Hub. Palaguin ang iyong credits ngayon!
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button variant="outline" onClick={() => setShowInvestmentUnlockedModal(false)}>Mamaya na</Button>
                        <Button onClick={() => {
                            setShowInvestmentUnlockedModal(false);
                            router.push('/dashboard/invest');
                        }}>
                           Pumunta sa Invest Hub
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <header className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">Shop</h1>
                        <p className="text-muted-foreground">Gamitin ang iyong credits para bumili ng vouchers at iba pa.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-lg font-semibold text-primary">
                        <Coins className="h-5 w-5 text-accent" />
                        <span>{profile.credits.toLocaleString()}</span>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="vouchers">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="vouchers"><Ticket className="mr-2"/> Vouchers</TabsTrigger>
                    <TabsTrigger value="themes"><Palette className="mr-2"/> Themes & Effects</TabsTrigger>
                    <TabsTrigger value="buffs" className="relative">
                        {isFlashSaleActive && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span></span>}
                        <Shield className="mr-2"/> Buffs
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="vouchers" className="mt-6">
                    {profile.hasMadePurchase === false && (
                        <Card className="mb-6 bg-accent/10 border-accent">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-accent/20 rounded-full text-accent"><Percent size={28}/></div>
                                <div>
                                    <h3 className="font-bold text-primary">90% First Purchase Discount!</h3>
                                    <p className="text-sm text-muted-foreground">Bilang bagong user, mayroon kang 90% discount sa iyong unang pagbili ng voucher. Piliin ang iyong voucher sa ibaba para magamit ito!</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loadingVouchers && Array.from({length: 3}).map((_, i) => (
                             <Card key={i} className="animate-pulse"><CardHeader className="h-24 bg-muted rounded-t-lg"/><CardContent className="pt-6 h-24 bg-muted rounded-b-lg"/></Card>
                        ))}
                        {voucherTemplates.map(template => {
                            const isFirstPurchase = profile.hasMadePurchase === false;
                            const finalPrice = isFirstPurchase ? Math.ceil(template.price * 0.1) : template.price;
                            
                            return (
                            <Card key={template.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{template.title}</CardTitle>
                                    <CardDescription>{template.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="flex items-baseline gap-2">
                                        {isFirstPurchase && <span className="text-xl font-bold text-muted-foreground line-through">{template.price.toLocaleString()}</span>}
                                        <p className="text-4xl font-bold text-primary">{finalPrice.toLocaleString()}</p>
                                        <p className="text-muted-foreground">credits</p>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" onClick={() => handlePurchase(template)} disabled={isPurchasing === template.id}>
                                        {isPurchasing === template.id && <Loader2 className="animate-spin mr-2"/>}
                                        {isPurchasing === template.id ? 'Pinoproseso...' : 'Buy Now'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )})}
                    </div>
                </TabsContent>
                
                <TabsContent value="themes" className="mt-6 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette/> Visual Themes</CardTitle>
                            <CardDescription>Baguhin ang hitsura at pakiramdam ng portal.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {themes.map(theme => {
                                const isPurchased = (profile.purchasedThemes || []).includes(theme.id);
                                const isActive = profile.activeTheme === theme.id;
                                const isBgmTrialActive = profile.bgmThemeTrialExpiresAt && profile.bgmThemeTrialExpiresAt.toDate() > new Date();

                                return (
                                    <Card key={theme.id} className={cn("flex flex-col p-4", isActive && "border-primary ring-2 ring-primary")}>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg">{theme.name}</h3>
                                                <p className="font-semibold text-primary">{theme.price > 0 ? `${theme.price.toLocaleString()}cr` : 'Libre'}</p>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
                                            {theme.isSpecial && (isBgmTrialActive || isPurchased) && (
                                                <div className="text-xs text-accent font-semibold mt-2 flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3"/> BGM Synced
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            {isPurchased || theme.price === 0 ? (
                                                <Button className="w-full" variant={isActive ? "secondary" : "default"} onClick={() => handleEquipTheme(theme.id)} disabled={isActive}>
                                                    {isActive ? 'Equipped' : 'Equip'}
                                                </Button>
                                            ) : (
                                                <Button className="w-full" onClick={() => handleBuyCosmetic({ ...theme, type: 'theme' })} disabled={isPurchasing === theme.id}>
                                                    {isPurchasing === theme.id && <Loader2 className="animate-spin mr-2"/>} Buy
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                )
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="buffs" className="mt-6 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield/> Investment Buffs</CardTitle>
                            <CardDescription className="text-primary font-semibold border-l-4 border-primary pl-3 py-1">
                                Paunawa: Maaari ka lang bumili ng ISANG buff bawat flash sale. Ang presyo ng bawat buff ay tumataas sa tuwing bibili ka nito.
                            </CardDescription>
                             {isFlashSaleActive ? (
                                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-center">
                                    <h3 className="font-bold text-accent animate-pulse text-lg">FLASH SALE IS LIVE!</h3>
                                    <p className="text-sm text-muted-foreground">Ends in <Countdown className="font-bold text-accent" onEnd={() => {}} saleDurationMinutes={30} /></p>
                                </div>
                             ) : (
                                <div className="p-3 rounded-lg bg-secondary text-center">
                                    <h3 className="font-semibold text-muted-foreground">No Active Flash Sale</h3>
                                    <p className="text-sm text-muted-foreground">Next sale in <Countdown className="font-bold text-primary" onEnd={() => {}} cycleHours={3} /></p>
                                </div>
                             )}
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {investmentBuffsList.map(buff => {
                                const buffData = profile.investmentBuffs?.[buff.id];
                                const buffsOwned = (buffData?.qty || 0);
                                const purchaseCount = (buffData?.purchaseCount || 0);
                                
                                const currentPrice = Math.round(buff.price * Math.pow(buff.growthRate, purchaseCount));
                                const canBuy = isFlashSaleActive && isBuffAvailable(buff);
                                
                                const last50PurchaseDate = profile?.lastPurchased_WIN_50?.toDate();
                                let cooldownEndDate: Date | null = null;
                                if(last50PurchaseDate && buff.id === 'WIN_50'){
                                    cooldownEndDate = new Date(last50PurchaseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                                }
                                const isOnCooldown = cooldownEndDate && cooldownEndDate > new Date();

                                return (
                                    <Card key={buff.id} className={cn("p-4 flex flex-col relative overflow-hidden", !canBuy && !isOnCooldown && "bg-muted/50")}>
                                        {canBuy && <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground animate-pulse shadow-lg">Flash Sale</Badge>}
                                        <div className={cn("flex-grow", !canBuy && !isOnCooldown && "opacity-50")}>
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg">{buff.name}</h3>
                                                <p className="font-semibold text-primary">{currentPrice.toLocaleString()}cr</p>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">Gives you a one-time boost for an investment session.</p>
                                            <p className="text-xs text-primary font-medium mt-1">({buff.note})</p>
                                            <Badge variant="outline" className="mt-2">You own: {buffsOwned}</Badge>
                                        </div>
                                        <div className="mt-4">
                                            {isOnCooldown && cooldownEndDate ? (
                                                <CooldownTimer50 expiresAt={cooldownEndDate} />
                                            ) : (
                                                canBuy ? (
                                                    <Button 
                                                        className="w-full" 
                                                        onClick={() => handleBuyCosmetic({ ...buff, price: currentPrice, type: 'buff' })} 
                                                        disabled={isPurchasing === buff.id || hasPurchasedThisSale}
                                                    >
                                                        {isPurchasing === buff.id && <Loader2 className="animate-spin mr-2"/>} 
                                                        {hasPurchasedThisSale ? 'Purchased' : 'Buy Now'}
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" disabled className="w-full bg-secondary/50">Unavailable</Button>
                                                )
                                            )}
                                        </div>
                                    </Card>
                                )
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default ShopPage;
