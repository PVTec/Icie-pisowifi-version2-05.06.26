
'use client';

import { useUser, useFirestore } from "@/firebase";
import { doc, onSnapshot, runTransaction, Timestamp, collection, serverTimestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, CheckCircle, Gift, Loader2, Trophy, Ticket } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { cn } from "@/lib/utils";

type MonthlyEventProgress = {
    month: string; // "YYYY-MM"
    arenaCreditsWon: number;
    vouchersPurchased: number;
    claimedRewards: string[]; // e.g., ['arena-200', 'purchase-1500']
}

type UserProfile = {
    monthlyEvent?: MonthlyEventProgress;
};

const arenaGoals = [
    { id: 'arena-200', requirement: 200, reward: 50, description: "Earn 50 credits" },
    { id: 'arena-350', requirement: 350, reward: 75, description: "Earn 75 credits" },
    { id: 'arena-500', requirement: 500, reward: 100, description: "Earn 100 credits" },
    { id: 'arena-1000', requirement: 1000, reward: 150, description: "Earn 150 credits" },
    { id: 'arena-2500', requirement: 2500, reward: 250, description: "Earn 250 credits" },
    { id: 'arena-5500', requirement: 5500, reward: 400, description: "Earn 400 credits" },
    { id: 'arena-10500', requirement: 10500, reward: 750, description: "Earn 750 credits" },
    { id: 'arena-25500', requirement: 25500, reward: 1500, description: "Earn 1.5k credits" },
    { id: 'arena-50000', requirement: 50000, reward: 3000, description: "Earn 3k credits" },
];

const purchaseGoals = [
    { id: 'purchase-5', requirement: 5, reward: 200, description: "Earn 200 credits" },
    { id: 'purchase-10', requirement: 10, reward: 500, description: "Earn 500 credits" },
    { id: 'purchase-20', requirement: 20, reward: 1200, description: "Earn 1.2k credits" },
];

export default function EventsPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!user || !firestore) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            setProfile(docSnap.data() as UserProfile);
            setLoading(false);
        }, (error) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get'
            });
            errorEmitter.emit('permission-error', permissionError);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, firestore]);

    const handleClaimReward = async (goalId: string, rewardAmount: number, type: 'arena' | 'purchase') => {
        if (!user || !firestore) return;
        
        setIsClaiming(goalId);
        const userDocRef = doc(firestore, "users", user.uid);

        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found.");

                const currentData = userDoc.data() as UserProfile;
                const currentMonth = new Date().toISOString().slice(0, 7);
                const eventProgress = currentData.monthlyEvent;

                if (!eventProgress || eventProgress.month !== currentMonth) {
                    throw new Error("Event data is outdated or missing.");
                }

                if (eventProgress.claimedRewards?.includes(goalId)) {
                    throw new Error("Reward already claimed.");
                }
                
                const goal = type === 'arena' 
                    ? arenaGoals.find(g => g.id === goalId)
                    : purchaseGoals.find(g => g.id === goalId);
                    
                if (!goal) throw new Error("Goal not found");
                
                const currentProgress = type === 'arena' ? eventProgress.arenaCreditsWon : eventProgress.vouchersPurchased;
                
                if (currentProgress < goal.requirement) {
                    throw new Error("Goal not yet met.");
                }

                const newCredits = (currentData as any).credits + rewardAmount;
                const newClaimedRewards = [...(eventProgress.claimedRewards || []), goalId];

                transaction.update(userDocRef, {
                    credits: newCredits,
                    'monthlyEvent.claimedRewards': newClaimedRewards
                });
                
                const transactionRef = doc(collection(firestore, `users/${user.uid}/transactions`));
                transaction.set(transactionRef, {
                    type: 'bonus',
                    description: `Claimed event reward: ${goal.description}`,
                    amount: rewardAmount,
                    createdAt: serverTimestamp()
                });
            });

            toast({
                title: "Reward Claimed!",
                description: `You've received ${rewardAmount} credits.`
            });

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Claim Failed",
                description: error.message,
            });
        } finally {
            setIsClaiming(null);
        }
    }
    
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    const currentMonth = new Date().toISOString().slice(0, 7);
    const eventData = profile?.monthlyEvent?.month === currentMonth ? profile.monthlyEvent : { arenaCreditsWon: 0, vouchersPurchased: 0, claimedRewards: [] };


    const renderGoalList = (title: string, goals: typeof arenaGoals, currentProgress: number = 0, type: 'arena' | 'purchase', icon: React.ReactNode) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
                <CardDescription>Complete these goals this month to earn rewards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {goals.map(goal => {
                    const isCompleted = currentProgress >= goal.requirement;
                    const isClaimed = eventData.claimedRewards.includes(goal.id);
                    const progressValue = Math.min((currentProgress / goal.requirement) * 100, 100);

                    return (
                        <div key={goal.id} className="p-4 border rounded-lg bg-secondary/50">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                <div className="flex-1">
                                    <p className="font-semibold">Reach {goal.requirement.toLocaleString()} {type === 'arena' ? 'credits won' : 'vouchers purchased'}</p>
                                    <p className="text-sm text-primary flex items-center gap-1"><Gift size={16} /> {goal.description}</p>
                                </div>
                                <div className="mt-2 sm:mt-0">
                                    <Button
                                        onClick={() => handleClaimReward(goal.id, goal.reward, type)}
                                        disabled={!isCompleted || isClaimed || isClaiming === goal.id}
                                        size="sm"
                                        className={cn(isClaimed && "bg-green-600 hover:bg-green-700")}
                                    >
                                        {isClaiming === goal.id && <Loader2 className="animate-spin mr-2"/>}
                                        {isClaimed ? <><CheckCircle className="mr-2"/>Claimed</> : 'Claim'}
                                    </Button>
                                </div>
                            </div>
                            <Progress value={progressValue} className="mt-3 h-2" />
                            <p className="text-xs text-right text-muted-foreground mt-1">{currentProgress.toLocaleString()} / {goal.requirement.toLocaleString()}</p>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    );

    if (loading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <header className="flex items-center mb-8">
                 <Button variant="outline" size="icon" className="mr-4" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Dashboard</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Monthly Events</h1>
                    <p className="text-muted-foreground">Complete goals for {currentMonthName} to earn bonus credits!</p>
                </div>
            </header>

            <div className="space-y-8">
                {renderGoalList("Arena Wins", arenaGoals, eventData.arenaCreditsWon, 'arena', <Trophy />)}
                {renderGoalList("Voucher Purchases", purchaseGoals, eventData.vouchersPurchased, 'purchase', <Ticket />)}
            </div>
        </div>
    );
}
