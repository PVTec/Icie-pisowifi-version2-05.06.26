

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, runTransaction, serverTimestamp, Timestamp, collection, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft, Banknote, Coins, TrendingUp, TrendingDown, Info, Zap, ArrowDown, Wallet as WalletIcon, ArrowUp, Power, Clock, Gift, Lock, Sparkles, Shield, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INVESTMENT_TICK_RATE = 4000; // 4 seconds
const WALLET_WITHDRAWAL_FEE_PERCENT = 25;
const BANK_WITHDRAWAL_FEE_PERCENT = 15;
const DISCONNECT_PENALTY_PERCENT = 45;

const riskLevels = [
    { level: 10, durationMinutes: 3, multiplier: 1.5, maxGrowth: 0.0065, maxLoss: -0.003, minLoss: -0.0015 },
    { level: 25, durationMinutes: 3, multiplier: 2.5, maxGrowth: 0.0215, maxLoss: -0.009, minLoss: -0.0045 },
    { level: 50, durationMinutes: 3, multiplier: 5, maxGrowth: 0.0315, maxLoss: -0.019, minLoss: -0.0095 },
    { level: 65, durationMinutes: 3, multiplier: 6.5, maxGrowth: 0.0375, maxLoss: -0.025, minLoss: -0.0125 },
    { level: 70, durationMinutes: 3, multiplier: 7, maxGrowth: 0.0395, maxLoss: -0.027, minLoss: -0.0135 },
];

const investmentBuffsList = [
    { id: 'WIN_17', name: '+17% Win Chance', price: 300, value: 0.17 },
    { id: 'WIN_25', name: '+25% Win Chance', price: 500, value: 0.25 },
    { id: 'WIN_30', name: '+30% Win Chance (Free)', value: 0.30 },
    { id: 'WIN_50', name: '+50% Win Chance', price: 1000, value: 0.50 },
];


type Investment = {
    isActive: boolean;
    history: { change: number; timestamp: Timestamp }[];
    growthTarget?: number;
    initialInvestmentAmount?: number;
    activeInvestmentLevel?: number;
    investmentStartedAt?: Timestamp;
    investmentEndsAt?: Timestamp;
    buffCode?: string;
    activeBuff?: string;
};

type UserProfile = {
    credits: number;
    walletBalance?: number;
    bankBalance?: number;
    investment?: Investment;
    investmentBonusClaimed?: boolean;
    hasMadePurchase?: boolean;
    investmentBuffs?: { [key: string]: { qty: number; purchaseCount: number } | number | Timestamp };
    freeBuffClaimed?: boolean;
};

// --- Investment Logic ---

const getInvestmentTick = (riskLevel: number, initialInvestment: number, startedAt: Timestamp | undefined, buffCode?: string, activeBuff?: string): number => {
    if (initialInvestment <= 0) return 0;

    const config = riskLevels.find(rl => rl.level === riskLevel) || riskLevels[0];
    let { maxGrowth, maxLoss, minLoss } = config;
    let winChance = 0.35; // 35% base win chance

    // Apply active buff from inventory
    if(activeBuff) {
        const buffConfig = investmentBuffsList.find(b => b.id === activeBuff);
        if (buffConfig) {
            winChance += buffConfig.value;
        }
    }

    // Apply buff code
    if (buffCode === 'LU¢K!$GOOD') {
        winChance += 0.15; // +15% win chance
    } else if (buffCode === 'LU¢KYMË') {
        winChance += 0.30; // +30% win chance
    }
    
    // Dynamic adjustment based on duration
    if (startedAt) {
        const now = new Date();
        const startTime = startedAt.toDate();
        const secondsElapsed = (now.getTime() - startTime.getTime()) / 1000;

        const threeMinuteIntervals = Math.floor(secondsElapsed / 180);
        const tenSecondIntervals = Math.floor(secondsElapsed / 10);
        
        // Lucky State Buff (2% bonus twice an hour)
        const minutesInHour = now.getMinutes();
        if ((minutesInHour >= 0 && minutesInHour < 10) || (minutesInHour >= 20 && minutesInHour < 30)) {
            winChance += 0.13; // +13% win chance
        }


        if (threeMinuteIntervals > 0) {
            const growthBonus = threeMinuteIntervals * 0.0005; // 0.05% per 3 mins
            maxGrowth += growthBonus;

            const lossBonusThreeMin = threeMinuteIntervals * 0.000501; // 0.0501% per 3 mins
            maxLoss += lossBonusThreeMin;
            minLoss += lossBonusThreeMin / 2; // Also scale minLoss proportionally
        }

        if (tenSecondIntervals > 0) {
            const lossBonusTenSec = tenSecondIntervals * 0.000001; // 0.0001% per 10 secs
            maxLoss += lossBonusTenSec;
            minLoss += lossBonusTenSec / 2;
        }
    }

    const rand = Math.random();
    
    // Check for win based on final calculated chance
    if (rand < winChance) {
        // Calculate gain based on percentage of initial investment
        return Math.random() * (initialInvestment * maxGrowth);
    }
    
    // Calculate loss within the min/max range based on percentage of initial investment
    const lossRange = maxLoss - minLoss;
    const randomLossFactor = minLoss + Math.random() * lossRange;
    return initialInvestment * randomLossFactor;
};


// --- UI Components ---

function CashInOutModal({
    mode,
    title,
    description,
    balance,
    feePercent,
    onConfirm,
    children
}: {
    mode: 'in' | 'out';
    title: string;
    description: string;
    balance: number;
    feePercent?: number;
    onConfirm: (amount: number) => void;
    children: React.ReactNode;
}) {
    const [amount, setAmount] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    const fee = (mode === 'out' && feePercent && amount) ? Math.floor(parseInt(amount) * (feePercent / 100)) : 0;
    const finalAmount = (mode === 'out' && amount) ? parseInt(amount) - fee : parseInt(amount) || 0;

    const handleConfirm = () => {
        onConfirm(parseInt(amount));
        setIsOpen(false);
        setAmount('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input 
                        placeholder="Maglagay ng halaga" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} 
                        type="number"
                    />
                    {mode === 'out' && amount && (
                        <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex justify-between"><span>Halaga na i-cash out:</span> <span>{parseInt(amount).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Bayad ({feePercent}%):</span> <span className="text-destructive">-{fee.toLocaleString()}</span></div>
                             <Separator />
                            <div className="flex justify-between font-semibold text-foreground"><span>Matatanggap mo:</span> <span className="text-green-600">{finalAmount.toLocaleString()}</span></div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > balance}>
                        Kumpirmahin
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function InvestmentHubModal({ walletBalance, bankBalance, investmentBuffs, onStart }: { walletBalance: number, bankBalance: number, investmentBuffs: UserProfile['investmentBuffs'], onStart: (amount: number, risk: number, duration: number, buffCode: string, activeBuff: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [investmentAmount, setInvestmentAmount] = useState('');
    const [investmentRisk, setInvestmentRisk] = useState<number>(10);
    const [customDuration, setCustomDuration] = useState('');
    const [buffCode, setBuffCode] = useState('');
    const [activeBuff, setActiveBuff] = useState('none');
    const { toast } = useToast();
    
    const selectedRiskConfig = riskLevels.find(r => r.level === investmentRisk);
    const minDuration = 3;
    const isDurationValid = !customDuration || Number(customDuration) >= minDuration;
    
    const growthExpectation = useMemo(() => {
        const amount = Number(investmentAmount) || bankBalance;
        if (amount > 0 && selectedRiskConfig) {
            return (amount * selectedRiskConfig.multiplier).toLocaleString(undefined, { maximumFractionDigits: 0 });
        }
        return 'N/A';
    }, [investmentAmount, bankBalance, selectedRiskConfig]);

    useEffect(() => {
        if (!isOpen) {
            setInvestmentAmount('');
            setInvestmentRisk(10);
            setCustomDuration('');
            setBuffCode('');
            setActiveBuff('none');
        }
    }, [isOpen]);

    const handleStart = () => {
        const amount = Number(investmentAmount);
        const duration = Number(customDuration) || minDuration;

        if (bankBalance <= 0) {
            if(isNaN(amount) || amount <= 0 || amount > walletBalance) {
                toast({ variant: 'destructive', title: 'Hindi Valid na Halaga', description: `Mangyaring maglagay ng halaga sa pagitan ng 1 at ${walletBalance.toLocaleString()}.` });
                return;
            }
        }
        
        if (!isDurationValid) {
            toast({ variant: 'destructive', title: 'Hindi Valid na Duration', description: `Ang duration ay dapat hindi bababa sa ${minDuration} minuto.` });
            return;
        }
        
        const finalInvestmentAmount = bankBalance > 0 ? bankBalance : amount;

        onStart(finalInvestmentAmount, investmentRisk, duration, buffCode, activeBuff);
        setIsOpen(false);
    };

    const availableBuffs = Object.entries(investmentBuffs || {}).filter(
        ([key, value]) => {
            if(key.startsWith('lastPurchased')) return false;
            if(typeof value === 'object' && value !== null && 'qty' in value) {
                return value.qty > 0;
            }
            if(typeof value === 'number') {
                return value > 0;
            }
            return false;
        }
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button className="w-full">
                    <Zap className="mr-2"/> Simulan ang Investment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Zap /> Investment Hub</DialogTitle>
                    <DialogDescription>Itakda ang iyong diskarte dito. Ang iyong investment ay maki-lock sa napiling duration.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                     {bankBalance <= 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="investment-amount">Halaga na I-invest (mula sa Wallet)</Label>
                            <Input id="investment-amount" placeholder={`Max: ${walletBalance.toLocaleString()}`} value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value.replace(/\D/g, ''))} type="number" />
                        </div>
                     )}
                    <div className="space-y-2">
                        <Label>Risk Level</Label>
                        <div className="grid grid-cols-5 gap-2 mt-1">
                            {riskLevels.map(({level}) => (
                                <Button key={level} variant={investmentRisk === level ? 'default' : 'outline'} onClick={() => setInvestmentRisk(level)} className="flex flex-col h-auto py-2 text-xs sm:text-sm">
                                    <span className="font-bold text-base">{level}%</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                    {availableBuffs.length > 0 && (
                         <div className="space-y-2">
                            <Label htmlFor="active-buff">Gamitin ang Buff (Opsyonal)</Label>
                            <Select value={activeBuff} onValueChange={setActiveBuff}>
                                <SelectTrigger id="active-buff">
                                    <SelectValue placeholder="Pumili ng buff..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Walang Buff</SelectItem>
                                    {availableBuffs.map(([id, buffData]) => {
                                        const buffConfig = investmentBuffsList.find(b => b.id === id);
                                        const qty = (typeof buffData === 'object' && 'qty' in buffData) ? buffData.qty : (typeof buffData === 'number' ? buffData : 0);
                                        return (
                                            <SelectItem key={id} value={id}>
                                                {buffConfig?.name} (Natitira: {qty})
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minuto)</Label>
                        <Input id="duration" placeholder={`Minimum: ${minDuration} minuto`} value={customDuration} onChange={e => setCustomDuration(e.target.value.replace(/\D/g, ''))} type="number" />
                         {!isDurationValid && <p className="text-xs text-destructive mt-1">Ang duration ay dapat hindi bababa sa ${minDuration} minuto.</p>}
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="buff-code">Buff Code (Opsyonal)</Label>
                        <Input id="buff-code" placeholder="Ilagay ang Buff Code" value={buffCode} onChange={e => setBuffCode(e.target.value)} />
                    </div>

                    <div className="rounded-lg border bg-secondary/50 p-4 text-center">
                        <p className="text-sm text-muted-foreground">Potensyal na Kita</p>
                        <p className="text-2xl font-bold text-primary">{growthExpectation}</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleStart} disabled={(bankBalance <= 0 && !investmentAmount) || !isDurationValid}>
                        Kumpirmahin at Simulan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CountdownTimer({ endTime }: { endTime: Timestamp }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const end = endTime.toDate().getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft('00:00');
                clearInterval(timer);
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [endTime]);

    return (
        <div className="flex items-center gap-2 font-mono text-sm">
            <Clock className="h-4 w-4"/>
            <span>{timeLeft}</span>
        </div>
    );
}

// --- Main Page ---
export default function InvestPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const { toast } = useToast();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const investmentIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [isLuckyState, setIsLuckyState] = useState(false);
    const [isClaimingFreeBuff, setIsClaimingFreeBuff] = useState(false);
    const [showFreeBuffClaimedModal, setShowFreeBuffClaimedModal] = useState(false);

    const walletBalance = profile?.walletBalance || 0;
    const bankBalance = profile?.bankBalance || 0;
    const credits = profile?.credits || 0;
    const investment = profile?.investment || { isActive: false, history: [] };
    const investmentBuffs = profile?.investmentBuffs || {};
    const hasClaimedFreeBuff = profile?.freeBuffClaimed === true;
    const activeInvestmentRef = useRef(investment.isActive);

    useEffect(() => {
        activeInvestmentRef.current = investment.isActive;
    }, [investment.isActive]);

    useEffect(() => {
        if (!user || !firestore) return;

        const userDocRef = doc(firestore, 'users', user.uid);

        const claimInvestmentBonus = async () => {
             await runTransaction(firestore, async (transaction) => {
                 const userDoc = await transaction.get(userDocRef);
                 if (!userDoc.exists()) throw new Error("User not found");
                 const data = userDoc.data() as UserProfile;
                 if (data.investmentBonusClaimed) return;

                 const newWalletBalance = (data.walletBalance || 0) + 500;
                 transaction.update(userDocRef, {
                    walletBalance: newWalletBalance,
                    investmentBonusClaimed: true
                 });

                 const transactionRef = doc(collection(firestore, "users", user.uid, "transactions"));
                 transaction.set(transactionRef, {
                    type: 'bonus',
                    description: 'First-time Investment Seed Fund',
                    amount: 500,
                    createdAt: serverTimestamp()
                });
             });
             setShowBonusModal(true);
        };

        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                setProfile(data);
                if (data.hasMadePurchase && data.investmentBonusClaimed === false) {
                    claimInvestmentBonus();
                }
            }
        }, (error) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get'
            });
            errorEmitter.emit('permission-error', permissionError);
        });
        
        const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
             if (activeInvestmentRef.current) {
                e.preventDefault(); // For some browsers to show the confirmation dialog
                
                const userDoc = await runTransaction(firestore, async (transaction) => {
                    const docSnap = await transaction.get(userDocRef);
                    if (!docSnap.exists()) return null;
                    const data = docSnap.data() as UserProfile;
                    const currentBank = data.bankBalance || 0;
                    const penalty = currentBank * (DISCONNECT_PENALTY_PERCENT / 100);
                    const newBankBalance = currentBank - penalty;

                    transaction.update(userDocRef, {
                        'investment.isActive': false,
                        'bankBalance': newBankBalance
                    });
                    return docSnap;
                });

                if(userDoc) {
                    toast({
                        title: "Huminto ang Investment",
                        description: `May ${DISCONNECT_PENALTY_PERCENT}% penalty na inilapat dahil sa pag-disconnect.`,
                        variant: 'destructive',
                    });
                }
             }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', () => handleBeforeUnload);
             if (investmentIntervalRef.current) {
                clearInterval(investmentIntervalRef.current);
            }
        };
    }, [user, firestore, toast]);
    
    // Effect to check for lucky state
    useEffect(() => {
        const checkLuckyState = () => {
            const minutes = new Date().getMinutes();
             if ((minutes >= 0 && minutes < 10) || (minutes >= 20 && minutes < 30)) {
                setIsLuckyState(true);
            } else {
                setIsLuckyState(false);
            }
        };
        checkLuckyState();
        const luckyInterval = setInterval(checkLuckyState, 15000); // Check every 15 seconds
        return () => clearInterval(luckyInterval);
    }, []);

    useEffect(() => {
        const runInvestmentTick = async () => {
            if (!user || !firestore || !investment?.isActive) {
                return;
            }
            
            const currentProfile = await (async () => {
                const docSnap = await runTransaction(firestore, t => t.get(doc(firestore, 'users', user.uid)));
                return docSnap.data() as UserProfile;
            })();
            
            const currentBankBalance = currentProfile?.bankBalance || 0;
            if (currentBankBalance <= 0) {
                 if (investment?.isActive) {
                    await updateDoc(doc(firestore, 'users', user.uid), { 
                        'investment.isActive': false,
                        'bankBalance': 0 
                    });
                    toast({ title: "Naubos ang Investment", description: "Naubos na ang iyong investment sa bank.", variant: "destructive" });
                }
                return;
            }

            const endsAt = currentProfile.investment?.investmentEndsAt?.toDate();
            if (endsAt && new Date() > endsAt) {
                 toast({ title: "Natapos na ang Investment Period", description: "Tapos na ang iyong investment session." });
                 await updateDoc(doc(firestore, 'users', user.uid), { 'investment.isActive': false });
                 return;
            }

            const initialInvestmentAmount = currentProfile.investment?.initialInvestmentAmount || 0;
            const currentRiskLevel = currentProfile.investment?.activeInvestmentLevel || 10;
            const investmentStartedAt = currentProfile.investment?.investmentStartedAt;
            const buffCode = currentProfile.investment?.buffCode;
            const activeBuff = currentProfile.investment?.activeBuff;
            const change = getInvestmentTick(currentRiskLevel, initialInvestmentAmount, investmentStartedAt, buffCode, activeBuff);
            let newBankBalance = Math.max(0, currentBankBalance + change);

            try {
                const userDocRef = doc(firestore, 'users', user.uid);
                await runTransaction(firestore, async (transaction) => {
                    const userDoc = await transaction.get(userDocRef);
                    if (!userDoc.exists()) throw new Error("User not found");
                    const latestInvestment = (userDoc.data() as UserProfile).investment || { history: [] };

                    const newHistory = [
                        { change, timestamp: Timestamp.now() },
                        ...(latestInvestment.history || [])
                    ].slice(0, 20);

                    transaction.update(userDocRef, {
                        'bankBalance': newBankBalance,
                        'investment.history': newHistory,
                    });
                });
            } catch (error) {
                console.error("Error during investment tick:", error);
            }
        };

        if (investmentIntervalRef.current) {
            clearInterval(investmentIntervalRef.current);
        }

        if (investment?.isActive) {
            investmentIntervalRef.current = setInterval(runInvestmentTick, INVESTMENT_TICK_RATE);
        }

        return () => {
            if (investmentIntervalRef.current) {
                clearInterval(investmentIntervalRef.current);
            }
        };
    }, [investment, user, firestore, toast]);

    const handleTransaction = async (
        description: string,
        updates: Record<string, any>,
        transactionData: Record<string, any>
    ) => {
        if (!user || !firestore) return false;

        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                transaction.update(userDocRef, updates);
                
                const transacRef = doc(collection(firestore, "users", user.uid, "transactions"));
                transaction.set(transacRef, { ...transactionData, createdAt: serverTimestamp() });
            });
            toast({ title: 'Tagumpay!', description });
            return true;
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Nabigo ang Transaksyon', description: error.message });
            return false;
        }
    };
    
    const handleCashIn = async (amount: number) => {
        if (isNaN(amount) || amount <= 0 || amount > credits) {
            toast({ variant: 'destructive', title: 'Hindi Valid na Halaga', description: 'Mangyaring maglagay ng valid na halaga para mag-cash in.' });
            return;
        }
        await handleTransaction(
            `Nag-cash in ng ${amount.toLocaleString()} sa iyong wallet.`,
            {
                credits: credits - amount,
                walletBalance: walletBalance + amount,
            },
            {
                type: 'investment_deposit',
                description: 'Cash In sa Wallet',
                amount: -amount,
            }
        );
    };

    const handleCashOut = async (amount: number) => {
        if (isNaN(amount) || amount <= 0 || amount > walletBalance) {
            toast({ variant: 'destructive', title: 'Hindi Valid na Halaga', description: 'Hindi ka maaaring mag-cash out ng higit sa laman ng iyong wallet.' });
            return;
        }
        const fee = Math.floor(amount * (WALLET_WITHDRAWAL_FEE_PERCENT / 100));
        const finalAmount = amount - fee;

        await handleTransaction(
            `Nag-cash out ng ${finalAmount.toLocaleString()} credits mula sa iyong wallet.`,
            {
                walletBalance: walletBalance - amount,
                credits: credits + finalAmount,
            },
            {
                type: 'investment_cashout',
                description: `Cash Out mula sa Wallet (Bayad: ${fee})`,
                amount: finalAmount
            }
        );
    };

    const handleStartInvestment = async (amount: number, risk: number, duration: number, buffCode: string, activeBuff: string) => {
        const riskConfig = riskLevels.find(r => r.level === risk);
        if(!riskConfig) {
            toast({ variant: 'destructive', title: 'Hindi Valid na Risk Level' });
            return;
        }

        const now = new Date();
        const endsAt = new Date(now.getTime() + duration * 60 * 1000);
        
        const updates: Record<string, any> = {
            'investment.isActive': true,
            'investment.activeInvestmentLevel': risk,
            'investment.investmentStartedAt': serverTimestamp(),
            'investment.investmentEndsAt': Timestamp.fromDate(endsAt),
            'investment.initialInvestmentAmount': amount,
            'investment.growthTarget': amount * riskConfig.multiplier,
            'investment.buffCode': buffCode,
            'investment.activeBuff': activeBuff === "none" ? "" : activeBuff,
        };

        if (activeBuff !== "none" && profile?.investmentBuffs) {
            const buffData = profile.investmentBuffs[activeBuff];
            if (typeof buffData === 'object' && 'qty' in buffData) {
                 updates[`investmentBuffs.${activeBuff}.qty`] = buffData.qty - 1;
            } else if (typeof buffData === 'number') {
                 updates[`investmentBuffs.${activeBuff}`] = buffData - 1;
            }
        }

        const fromWallet = amount > bankBalance;
        if (fromWallet) {
            updates.walletBalance = walletBalance - amount;
            updates.bankBalance = bankBalance + amount;
        }

        await handleTransaction(
            `Nagsimula ng bagong investment.`,
            updates,
            {
                type: 'investment_start',
                description: `Nag-invest ng ${amount} sa ${risk}% risk.`,
                amount: 0
            }
        );
    };

    const handleWithdrawFromBank = async () => {
        if (bankBalance <= 0) {
             toast({ variant: 'destructive', title: 'Walang pondo sa bank.' });
            return;
        }
        const fee = Math.floor(bankBalance * (BANK_WITHDRAWAL_FEE_PERCENT / 100));
        const finalAmount = bankBalance - fee;

        await handleTransaction(
            `Nag-withdraw ng ${finalAmount.toLocaleString()} mula sa bank papunta sa wallet.`,
            {
                bankBalance: 0,
                walletBalance: walletBalance + finalAmount,
                'investment.isActive': false,
            },
            {
                type: 'investment_withdraw',
                description: `Withdraw mula sa Bank (Bayad: ${fee})`,
                amount: 0
            }
        );
    };

     const handleStopInvestment = async () => {
        if (!investment.isActive || !user || !firestore) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        const penalty = bankBalance * (DISCONNECT_PENALTY_PERCENT / 100);
        const newBankBalance = bankBalance - penalty;

        await updateDoc(userDocRef, {
            'investment.isActive': false,
            'bankBalance': newBankBalance,
        });

        toast({
            title: "Huminto ang Investment",
            description: `May ${DISCONNECT_PENALTY_PERCENT}% penalty na inilapat. Ang bagong balanse sa bangko ay ${newBankBalance.toFixed(2)}.`,
            variant: 'destructive',
        });
    };
    
    const handleClaimFreeBuff = async () => {
        if (isClaimingFreeBuff || !user || !firestore) return;
        
        setIsClaimingFreeBuff(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");
                const currentData = userDoc.data() as UserProfile;
    
                if (currentData.freeBuffClaimed) {
                    toast({ title: "Buff Already Claimed", description: "You have already claimed your free buff.", variant: "destructive" });
                    return;
                }
    
                const newBuffs = { ...(currentData.investmentBuffs || {}) };
                const currentBuffData = newBuffs['WIN_30'];
                const currentQty = (typeof currentBuffData === 'object' && 'qty' in currentBuffData) ? currentBuffData.qty : (typeof currentBuffData === 'number' ? currentBuffData : 0);

                
                newBuffs['WIN_30'] = {
                    qty: currentQty + 1,
                    purchaseCount: (typeof currentBuffData === 'object' && 'purchaseCount' in currentBuffData) ? currentBuffData.purchaseCount : 0,
                };
                
                transaction.update(userDocRef, {
                    investmentBuffs: newBuffs,
                    freeBuffClaimed: true,
                });
            });
            toast({ title: "Libreng Buff Nakuha!", description: "Isang +30% Win Chance buff ay naidagdag sa iyong imbentaryo." });
            setShowFreeBuffClaimedModal(true);
        } catch (error: any) {
            if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: 'destructive', title: 'Nabigo ang Pag-claim', description: error.message });
            }
        } finally {
            setIsClaimingFreeBuff(false);
        }
    };
    
     const renderWithdrawDialog = () => {
        const fee = Math.floor(bankBalance * (BANK_WITHDRAWAL_FEE_PERCENT / 100));
        const finalAmount = bankBalance - fee;

        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full" disabled={bankBalance <= 0 || investment.isActive}>
                        <ArrowDown className="mr-2"/> Withdraw papuntang Wallet
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Withdraw papuntang Wallet?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ililipat nito ang lahat ng pondo mula sa Bank papunta sa iyong Wallet.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <div className="text-sm text-muted-foreground space-y-1 py-4">
                        <div className="flex justify-between"><span>Halaga na i-withdraw:</span> <span>{bankBalance.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Bayad ({BANK_WITHDRAWAL_FEE_PERCENT}%):</span> <span className="text-destructive">-{fee.toLocaleString()}</span></div>
                         <Separator />
                        <div className="flex justify-between font-semibold text-foreground"><span>Matatanggap mo:</span> <span className="text-green-600">{finalAmount.toLocaleString()}</span></div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Kanselahin</AlertDialogCancel>
                        <AlertDialogAction onClick={handleWithdrawFromBank}>Kumpirmahin at Withdraw</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    const isBankDisabled = profile?.hasMadePurchase === false;

    return (
        <div className="space-y-8">
            <Dialog open={showBonusModal} onOpenChange={setShowBonusModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-bold font-headline text-primary">Binigyan ka ng Seed Fund!</DialogTitle>
                        <DialogDescription className="text-center">
                            Nagsisimula na ngayon ang iyong paglalakbay sa investment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="text-6xl font-extrabold text-accent flex items-center">
                            <Gift className="h-12 w-12 mr-4" />
                            500
                        </div>
                        <p className="text-lg text-muted-foreground mt-2">Libreng Credits na idinagdag sa iyong Wallet!</p>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button className="w-full">Astig!</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={showFreeBuffClaimedModal} onOpenChange={setShowFreeBuffClaimedModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-bold font-headline text-primary">Congratulations!</DialogTitle>
                        <DialogDescription className="text-center">
                            You've successfully claimed your free buff!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="text-6xl font-extrabold text-accent flex items-center">
                            <CheckCircle className="h-12 w-12 mr-4" />
                            +30%
                        </div>
                        <p className="text-lg text-muted-foreground mt-2">Win Chance Buff Added!</p>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button className="w-full">Awesome!</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {isLuckyState && (
                <Card className="bg-accent/10 border-accent">
                    <CardHeader className="flex flex-row items-center justify-between p-4">
                         <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                            <CardTitle className="text-base">Lucky State is Active!</CardTitle>
                        </div>
                        <p className="text-sm text-accent font-semibold">+13% Win Chance</p>
                    </CardHeader>
                </Card>
            )}
            
            {profile && !hasClaimedFreeBuff && (
                <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
                     <CardHeader className="flex flex-row items-center justify-between p-4">
                         <div className="flex items-center gap-3">
                             <Gift className="h-8 w-8" />
                            <div>
                                <CardTitle className="text-base">Claim Your Free Buff!</CardTitle>
                                <CardDescription className="text-primary-foreground/80 text-sm">Get a free +30% Win Chance buff, on us!</CardDescription>
                            </div>
                        </div>
                        <Button
                            onClick={handleClaimFreeBuff}
                            disabled={isClaimingFreeBuff}
                            variant="secondary"
                            size="sm"
                        >
                            {isClaimingFreeBuff ? <Loader2 className="animate-spin" /> : "Claim"}
                        </Button>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><WalletIcon/> Ang Wallet</CardTitle>
                            <CardDescription>Ang iyong personal na ipon. Ang pondo ay dapat nasa wallet bago mo ito ma-invest.</CardDescription>
                        </CardHeader>
                         <CardContent>
                             <p className="text-4xl font-bold">{walletBalance.toLocaleString()}</p>
                             <p className="text-muted-foreground">Credits</p>
                        </CardContent>
                        <CardFooter className="grid grid-cols-2 gap-2">
                             <CashInOutModal 
                                mode="in"
                                title="Mag-Cash In sa Wallet"
                                description={`Maglipat ng credits mula sa iyong pangunahing balanse papunta sa iyong Wallet. Max: ${credits.toLocaleString()} credits.`}
                                balance={credits} 
                                onConfirm={handleCashIn}
                            >
                                <Button variant="secondary" className="w-full">
                                    <ArrowDown className="mr-2"/> Cash In
                                </Button>
                            </CashInOutModal>
                             <CashInOutModal 
                                mode="out"
                                title="Mag-Cash Out papuntang Main Balance"
                                description={`Maglipat ng credits mula sa iyong Wallet papunta sa iyong pangunahing balanse. Isang ${WALLET_WITHDRAWAL_FEE_PERCENT}% na bayad ang ibabawas.`}
                                balance={walletBalance} 
                                feePercent={WALLET_WITHDRAWAL_FEE_PERCENT}
                                onConfirm={handleCashOut}
                            >
                                 <Button variant="outline" className="w-full">
                                    <ArrowUp className="mr-2"/> Cash Out
                                </Button>
                            </CashInOutModal>
                        </CardFooter>
                    </Card>

                     <Card className="relative">
                        {isBankDisabled && (
                             <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4 rounded-lg">
                                <Lock className="h-12 w-12 text-primary mb-4" />
                                <h3 className="text-xl font-bold">Naka-lock ang Bangko</h3>
                                <p className="text-muted-foreground">Gawin ang iyong unang pagbili ng voucher sa shop para ma-unlock ang Bangko at magsimulang mag-invest.</p>
                                <Button asChild className="mt-4">
                                    <Link href="/dashboard">Pumunta sa Shop</Link>
                                </Button>
                             </div>
                        )}
                        <div className={cn(isBankDisabled && "blur-sm")}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2"><Banknote /> Ang Bangko</CardTitle>
                                     <Badge variant={investment.isActive ? 'default' : 'secondary'} className={cn(investment.isActive && 'bg-green-600 text-white')}>
                                        {investment.isActive ? 'Aktibo' : 'Hindi Aktibo'}
                                    </Badge>
                                </div>
                                <CardDescription>Ang iyong aktibong portfolio. Ang pondo dito ay awtomatikong lalago o liliit kapag aktibo ang isang investment.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold">{bankBalance.toFixed(2)}</p>
                                <p className="text-muted-foreground">Credits</p>
                                {investment.isActive && (
                                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-muted-foreground border-t pt-4">
                                        <div className="text-center">
                                            <p className="font-bold text-base text-foreground">{(investment.initialInvestmentAmount || 0).toLocaleString()}</p>
                                            <p>Initial</p>
                                        </div>
                                        <div className="text-center">
                                             <p className="font-bold text-base text-foreground">{investment.activeInvestmentLevel || 0}%</p>
                                             <p>Risk</p>
                                        </div>
                                        <div className="text-center">
                                            {investment.investmentEndsAt ? <CountdownTimer endTime={investment.investmentEndsAt} /> : <p>--:--</p>}
                                            <p>Oras</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="grid grid-cols-1 gap-2">
                                {investment.isActive ? (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="destructive" className="w-full">
                                                <Power className="mr-2"/> Itigil ang Investment
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Itigil ang Aktibong Investment?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                     Kung ititigil mo ang investment bago matapos ang oras, may <span className="font-bold text-destructive">{DISCONNECT_PENALTY_PERCENT}% penalty</span> na ibabawas sa iyong kasalukuyang balanse sa bank. Sigurado ka ba?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Manatili</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleStopInvestment}>Itigil pa rin</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <>
                                        <InvestmentHubModal walletBalance={walletBalance} bankBalance={bankBalance} investmentBuffs={investmentBuffs} onStart={handleStartInvestment} />
                                        {renderWithdrawDialog()}
                                    </>
                                )}
                            </CardFooter>
                        </div>
                    </Card>
                </div>

                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Info /> Paano Ito Gumagana</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-4">
                           <p><strong className="text-primary">1. I-unlock ang Bangko:</strong> Bumili ng iyong unang voucher sa <Link href="/dashboard" className="underline">Shop</Link> para ma-unlock ang mga feature ng banking.</p>
                           <p><strong className="text-primary">2. Mag-Cash In:</strong> Maglipat ng credits sa iyong <b className="text-foreground">Wallet</b>.</p>
                           <p><strong className="text-primary">3. Simulan ang Investment:</strong> I-click ang 'Simulan ang Investment', pumili ng risk level at duration, pagkatapos ay kumpirmahin. Palaguin ang iyong credits hanggang 15 milyon!</p>
                           <p><strong className="text-primary">4. Ang Lock-in:</strong> Ang iyong investment ay naka-lock para sa napiling duration. Ang pag-disconnect ay magreresulta sa <b className="text-destructive">{DISCONNECT_PENALTY_PERCENT}% penalty</b> sa iyong balanse sa bank.</p>
                           <p><strong className="text-primary">5. Mag-Withdraw at Mag-Cash Out:</strong> Mag-withdraw mula sa Bank papunta sa Wallet ({BANK_WITHDRAWAL_FEE_PERCENT}% bayad), pagkatapos ay mag-Cash Out mula sa Wallet papunta sa iyong pangunahing credits ({WALLET_WITHDRAWAL_FEE_PERCENT}% bayad).</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Log ng Aktibidad sa Bangko</CardTitle>
                             <CardDescription>Ipinapakita ang huling 20 pagbabago sa investment.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {investment?.history && investment.history.length > 0 ? (
                                <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
                                    {investment.history.map((item, index) => (
                                        <li key={index} className={cn("flex justify-between p-1 rounded", item.change >= 0 ? "text-green-600" : "text-red-600")}>
                                            <span className="flex items-center gap-1">
                                                {item.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} credits
                                            </span>
                                            <span className="text-muted-foreground text-xs">
                                                {item.timestamp.toDate().toLocaleTimeString()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Wala pang aktibidad sa bangko.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
    
    
}
