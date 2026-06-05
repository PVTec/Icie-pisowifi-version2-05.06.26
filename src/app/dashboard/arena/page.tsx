
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, onSnapshot, getDoc, updateDoc, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Swords, Gamepad2, AlertTriangle, ShieldQuestion, Skull, Gem, X, ArrowLeft, Cherry, Star, Crown, Banana, Bomb, HelpCircle, Sparkles, Coins, Users } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/context/loading-context';

// --- GAME ECONOMY CONFIG ---
const LUCKY_DRAW_COST = 10;
const MULTIPLIER_BET_COST = 15;
const WITCH_HUNT_COST = 15;
const REWARDS_POOL_CONFIG = [
    { type: 80, chance: 1.30 }, { type: 50, chance: 3.40 }, 
    { type: 35, chance: 14.30 }, { type: 25, chance: 31.00 },
];
const TERMINAL_CODE_COST = 20;
const balanceLevels = {
    easy: { cost: 10, speed: 1.8, zoneWidth: 6, reward: 15 },
    medium: { cost: 20, speed: 2.1, zoneWidth: 4.5, reward: 35 },
    hard: { cost: 35, speed: 2.5, zoneWidth: 4, reward: 120 }
};
const lastStandLevels = {
    easy: { cost: 15, time: 12, targetSize: 50, spawnRate: 500, pointsPerHit: 2 },
    medium: { cost: 25, time: 10, targetSize: 40, spawnRate: 400, pointsPerHit: 4 },
    hard: { cost: 35, time: 8, targetSize: 30, spawnRate: 300, pointsPerHit: 6 }
};

const luckyDrawIcons = [
    { id: 'bomb', icon: Bomb, chance: 65, reward3: 25, reward2: 20 },
    { id: 'cherry', icon: Cherry, chance: 15, reward3: 30, reward2: 25 },
    { id: 'banana', icon: Banana, chance: 10, reward3: 35, reward2: 30 },
    { id: 'star', icon: Star, chance: 7, reward3: 55, reward2: 45 },
    { id: 'gem', icon: Gem, chance: 2, reward3: 85, reward2: 60 },
    { id: 'crown', icon: Crown, chance: 1, reward3: 120, reward2: 85 },
];

const multipliers = [
    { value: 0, icon: X, chance: 50 },
    { value: 2, icon: () => <>X2</>, chance: 18 },
    { value: 3, icon: () => <>X3</>, chance: 13 },
    { value: 4, icon: () => <>X4</>, chance: 10 },
    { value: 5, icon: () => <>X5</>, chance: 5 },
    { value: 10, icon: () => <>X10</>, chance: 4 },
];

const eventGoals = [
    { id: 'arena-200', requirement: 200 },
    { id: 'arena-350', requirement: 350 },
    { id: 'arena-500', requirement: 500 },
    { id: 'arena-1000', requirement: 1000 },
    { id: 'arena-2500', requirement: 2500 },
    { id: 'arena-5500', requirement: 5500 },
    { id: 'arena-10500', requirement: 10500 },
    { id: 'arena-25500', requirement: 25500 },
    { id: 'arena-50000', requirement: 50000 },
];

// --- Game Components ---

// Lucky Draw Game
function LuckyDrawModal({ isOpen, onOpenChange, spendCredits, awardCredits, credits, setCredits }) {
    const [reels, setReels] = useState<(typeof luckyDrawIcons[0] | null)[]>([null, null, null]);
    const [reelStates, setReelStates] = useState(['idle', 'idle', 'idle']);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<{ win: boolean; message: string } | null>(null);

    // Multiplier states
    const [useMultiplier, setUseMultiplier] = useState(false);
    const [multiplierReels, setMultiplierReels] = useState<(typeof multipliers[0] | null)[]>([null, null, null]);
    const [multiplierReelStates, setMultiplierReelStates] = useState(['idle', 'idle', 'idle']);
    const [multiplierResult, setMultiplierResult] = useState<{ win: boolean; message: string } | null>(null);
    const [initialWin, setInitialWin] = useState(0);

    // Auto-spin state
    const [autoSpin, setAutoSpin] = useState(false);
    const autoSpinTimer = useRef<NodeJS.Timeout>();

    const { toast } = useToast();

    const getWeightedRandomIcon = (iconSet: typeof luckyDrawIcons) => {
        const totalChance = iconSet.reduce((sum, item) => sum + item.chance, 0);
        let rand = Math.random() * totalChance;
        for (const item of iconSet) {
            rand -= item.chance;
            if (rand <= 0) return item;
        }
        return iconSet[0];
    };
    
    const resetGame = useCallback((isNewSpin = true) => {
        if(isNewSpin) {
            setReels([null, null, null]);
        }
        setReelStates(['idle', 'idle', 'idle']);
        setResult(null);
        setInitialWin(0);
        setMultiplierReels([null, null, null]);
        setMultiplierReelStates(['idle', 'idle', 'idle']);
        setMultiplierResult(null);
    }, []);
    
    const handlePlay = useCallback(async () => {
        if (spinning) return;
        
        const totalCost = LUCKY_DRAW_COST + (useMultiplier ? MULTIPLIER_BET_COST : 0);
        if (credits !== null && credits < totalCost) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits' });
            setAutoSpin(false);
            if (autoSpinTimer.current) clearTimeout(autoSpinTimer.current);
            return;
        }

        const success = await spendCredits(totalCost, "Lucky Draw Bet");
        if (!success) {
            setAutoSpin(false);
            if (autoSpinTimer.current) clearTimeout(autoSpinTimer.current);
            return;
        }
        setCredits(c => c !== null ? c - totalCost : null);

        resetGame();
        setSpinning(true);
        setReelStates(['spinning', 'spinning', 'spinning']);

        let finalReels: (typeof luckyDrawIcons[0])[] = [];
        let calculatedReward = 0;
        let resultMessage = '';
        let isWin = false;
        
        const luckyChance = Math.random() * 100; // 15% lucky system
        const winChance = Math.random() * 100;   // 30% win chance

        const isLucky = luckyChance < 15;
        const isWinner = isLucky || winChance < 30;

        if (isWinner) {
            // 60% chance for a pair, 40% for 3-of-a-kind
            if (Math.random() < 0.6) { // 2-of-a-kind (pair)
                const pairIcon = getWeightedRandomIcon(luckyDrawIcons);
                let thirdIcon;
                do {
                    thirdIcon = getWeightedRandomIcon(luckyDrawIcons);
                } while (thirdIcon.id === pairIcon.id);
                
                const positions = [pairIcon, pairIcon, thirdIcon];
                 for (let i = positions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [positions[i], positions[j]] = [positions[j], positions[i]];
                }
                finalReels = positions;
                calculatedReward = pairIcon.reward2;
                isWin = calculatedReward > 0;
                resultMessage = isWin ? `ASTIG, MAY PARES! Panalo ka ng ${calculatedReward} credits.` : `PARES NG BOMBA! Panalo ka ng ${calculatedReward} credits.`;

            } else { // 3-of-a-kind
                const winningIcon = getWeightedRandomIcon(luckyDrawIcons);
                finalReels = [winningIcon, winningIcon, winningIcon];
                calculatedReward = winningIcon.reward3;
                isWin = calculatedReward > 0;
                resultMessage = isWin ? `3 OF A KIND! Panalo ka ng ${calculatedReward} credits.` : `3 BOMBA! Panalo ka ng ${calculatedReward} credits.`;
            }
        } else { // No match
            let icon1, icon2, icon3;
            icon1 = getWeightedRandomIcon(luckyDrawIcons);
            do { icon2 = getWeightedRandomIcon(luckyDrawIcons); } while (icon2.id === icon1.id);
            do { icon3 = getWeightedRandomIcon(luckyDrawIcons); } while (icon3.id === icon1.id || icon3.id === icon2.id);
            finalReels = [icon1, icon2, icon3];
            calculatedReward = 0;
            resultMessage = 'WALANG TUGMA! Better luck next time.';
            isWin = false;
        }

        if (isLucky && !isWin) {
            resultMessage = 'LUCKY SPIN! ' + resultMessage;
        }
        
        const finishSpin = () => {
            setSpinning(false);
            if (autoSpin && isOpen && (window as any)._isAutoSpinEnabled) {
                if (autoSpinTimer.current) clearTimeout(autoSpinTimer.current);
                autoSpinTimer.current = setTimeout(() => {
                    if ((window as any)._isAutoSpinEnabled && (window as any)._handleLuckyDrawPlay) {
                        (window as any)._handleLuckyDrawPlay();
                    }
                }, 2000);
            }
        };

        const handleMultiplierSpin = async (currentWin: number) => {
            setMultiplierReelStates(['spinning', 'spinning', 'spinning']);
            
            const outcomeRand = Math.random() * 100;
            let finalMultiplierValue = 0;
            
            let winningMultiplier;
            if (outcomeRand < 50) { winningMultiplier = multipliers.find(m => m.value === 0); }
            else if (outcomeRand < 68) { winningMultiplier = multipliers.find(m => m.value === 2); }
            else if (outcomeRand < 81) { winningMultiplier = multipliers.find(m => m.value === 3); }
            else if (outcomeRand < 91) { winningMultiplier = multipliers.find(m => m.value === 4); }
            else if (outcomeRand < 96) { winningMultiplier = multipliers.find(m => m.value === 5); }
            else { winningMultiplier = multipliers.find(m => m.value === 10); }

            finalMultiplierValue = winningMultiplier!.value;
            const finalMultiplierReels = [winningMultiplier, winningMultiplier, winningMultiplier];
            
            setTimeout(() => setMultiplierReelStates(prev => { const next = [...prev]; next[0] = 'stopped'; setMultiplierReels(r => [finalMultiplierReels[0], r[1], r[2]]); return next; }), 1000);
            setTimeout(() => setMultiplierReelStates(prev => { const next = [...prev]; next[1] = 'stopped'; setMultiplierReels(r => [r[0], finalMultiplierReels[1], r[2]]); return next; }), 1800);
            setTimeout(async () => {
                setMultiplierReelStates(['stopped', 'stopped', 'stopped']);
                setMultiplierReels(finalMultiplierReels as any);
                
                let finalPrize = 0;
                let multiplierMessage = '';
                
                if (finalMultiplierValue > 0) {
                    finalPrize = currentWin * finalMultiplierValue;
                    multiplierMessage = `Multiplier Panalo! Prize mo ay x${finalMultiplierValue}! Total: ${finalPrize} credits.`;
                    await awardCredits(finalPrize);
                    setCredits(c => c !== null ? c + finalPrize : null);
                    toast({ title: `Multiplier x${finalMultiplierValue}!`, description: `Total na napanalunan: ${finalPrize} credits!` });
                } else {
                    finalPrize = currentWin;
                    multiplierMessage = 'Walang Multiplier! Makukuha mo pa rin ang unang premyo.';
                     if (!result?.win) {
                        await awardCredits(currentWin);
                        setCredits(c => c !== null ? c + currentWin : null);
                     }
                    toast({ title: 'Walang Multiplier!', description: `Napanatili mo ang iyong ${currentWin} credits.` });
                }
                
                setMultiplierResult({ win: finalMultiplierValue > 0, message: multiplierMessage });
                finishSpin();
            }, 2500);
        };

        setTimeout(() => setReelStates(prev => { const next = [...prev]; next[0] = 'stopped'; setReels(r => [finalReels[0], r[1], r[2]]); return next; }), 1000);
        setTimeout(() => setReelStates(prev => { const next = [...prev]; next[1] = 'stopped'; setReels(r => [r[0], finalReels[1], r[2]]); return next; }), 1800);
        setTimeout(async () => {
            setReelStates(['stopped', 'stopped', 'stopped']);
            setReels(finalReels);
            setResult({ win: isWin, message: resultMessage });
            setInitialWin(calculatedReward);

            if (useMultiplier && calculatedReward > 0) {
                await handleMultiplierSpin(calculatedReward);
            } else {
                 if (calculatedReward > 0) {
                    await awardCredits(calculatedReward);
                    setCredits(c => c !== null ? c + calculatedReward : null);
                    toast({ title: 'Panalo ka!', description: `+${calculatedReward} credits mula sa Lucky Draw!` });
                } else if(resultMessage.includes('WALANG TUGMA')) {
                     toast({ title: 'Talo ka!', description: 'Walang napanalunang credits.', variant: 'destructive' });
                } else if (resultMessage.includes('BOMBA')) {
                     await awardCredits(calculatedReward);
                     setCredits(c => c !== null ? c + calculatedReward : null);
                     toast({ title: 'Premyo sa Bomba!', description: `Panalo ka ng ${calculatedReward} credits.` });
                }
                 finishSpin();
            }
        }, 2500); 
    }, [spinning, credits, useMultiplier, spendCredits, setCredits, resetGame, awardCredits, toast, result, isOpen, autoSpin]);


    useEffect(() => {
        (window as any)._handleLuckyDrawPlay = handlePlay;
        (window as any)._isAutoSpinEnabled = autoSpin;
        return () => {
            delete (window as any)._handleLuckyDrawPlay;
            delete (window as any)._isAutoSpinEnabled;
        };
    }, [handlePlay, autoSpin]);


    useEffect(() => {
        if (!isOpen) {
            if (autoSpinTimer.current) {
                clearTimeout(autoSpinTimer.current);
                autoSpinTimer.current = undefined;
            }
            setAutoSpin(false); 
            resetGame();
        }
    }, [isOpen, resetGame]);

    
    const Reel = ({ item, state, isMultiplier = false }: { item: any, state: string, isMultiplier?: boolean }) => {
        const getIconColor = () => {
            if (isMultiplier) {
                return item?.value > 0 ? 'text-accent' : 'text-gray-500';
            }
            // Always return a solid color for game icons to avoid theme gradient issues.
            return item?.id === 'bomb' ? 'text-destructive' : 'text-accent';
        };

        return (
            <div className={cn("rounded-lg overflow-hidden flex items-center justify-center border-4 border-primary/20", isMultiplier ? "w-16 h-20" : "w-24 h-32")}>
                {state === 'spinning' ? (
                    <div className="animate-spin text-accent"><Sparkles size={isMultiplier ? 32 : 48} /></div>
                ) : state === 'stopped' && item ? (
                    <div className={cn("flex flex-col items-center gap-1", getIconColor())}>
                        {isMultiplier ? (
                            typeof item.icon === 'function' ? <item.icon /> : <item.icon />
                        ) : (
                            <item.icon size={48} />
                        )}
                    </div>
                ) : (
                    <div className={cn("text-primary/50", isMultiplier ? "text-accent/50" : "text-primary/50")}>
                        {isMultiplier ? <Sparkles size={32} /> : <HelpCircle size={48} />}
                    </div>
                )}
            </div>
        );
    };
    
    const currentCost = LUCKY_DRAW_COST + (useMultiplier ? MULTIPLIER_BET_COST : 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                 if (autoSpinTimer.current) {
                    clearTimeout(autoSpinTimer.current);
                    autoSpinTimer.current = undefined;
                 }
                 setAutoSpin(false);
            }
            onOpenChange(open);
        }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Lucky Draw!</DialogTitle>
                    <DialogDescription className="flex justify-between items-center">
                        <span>Itugma ang mga icon para manalo. Bayad: {currentCost} credits.</span>
                         <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                            <Coins className="h-4 w-4 text-accent" />
                            {credits !== null ? (
                                <span>{credits}</span>
                            ) : (
                                <span className="w-8 h-4 bg-muted rounded animate-pulse" />
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center items-center gap-4 my-8">
                    <Reel item={reels[0]} state={reelStates[0]} />
                    <Reel item={reels[1]} state={reelStates[1]} />
                    <Reel item={reels[2]} state={reelStates[2]} />
                </div>
                
                {useMultiplier && initialWin > 0 && reelStates.every(s => s === 'stopped') && (
                     <div className="mt-4">
                        <h3 className="text-center font-bold text-accent mb-2">Multiplier Round!</h3>
                        <div className="flex justify-center items-center gap-2 my-4">
                           <Reel item={multiplierReels[0]} state={multiplierReelStates[0]} isMultiplier={true} />
                           <Reel item={multiplierReels[1]} state={multiplierReelStates[1]} isMultiplier={true} />
                           <Reel item={multiplierReels[2]} state={multiplierReelStates[2]} isMultiplier={true} />
                        </div>
                    </div>
                )}

                {result && (
                    <div className={cn("text-center font-bold p-2 rounded", result.win ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                        {result.message}
                    </div>
                )}

                {multiplierResult && (
                     <div className={cn("text-center font-bold p-2 rounded mt-2", multiplierResult.win ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800')}>
                        {multiplierResult.message}
                    </div>
                )}


                <DialogFooter className="mt-4 flex flex-col gap-4">
                    <div className="flex items-center space-x-4 justify-center bg-muted p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                           <Switch id="multiplier-switch" checked={useMultiplier} onCheckedChange={setUseMultiplier} disabled={spinning}/>
                           <Label htmlFor="multiplier-switch" className="font-bold text-accent">Multiplier (+{MULTIPLIER_BET_COST}cr)</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                           <Switch id="autospin-switch" checked={autoSpin} onCheckedChange={(checked) => {
                               setAutoSpin(checked);
                                if (!checked && autoSpinTimer.current) {
                                    clearTimeout(autoSpinTimer.current);
                                    autoSpinTimer.current = undefined;
                                }
                           }} disabled={spinning && autoSpin}/>
                           <Label htmlFor="autospin-switch" className="font-bold">Auto Spin</Label>
                        </div>
                    </div>
                    <Button onClick={handlePlay} disabled={spinning || (credits !== null && credits < currentCost) || (autoSpin && spinning)} className="w-full">
                        {spinning ? 'Umiikot...' : (autoSpin ? 'Simulan ang Auto-Spin' : `Paikutin para sa ${currentCost}cr!`)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// Witch Hunt Game
function WitchHuntModal({ isOpen, onOpenChange, spendCredits, awardCredits, credits, setCredits }) {
    const [cards, setCards] = useState<any[]>([]);
    const [revealed, setRevealed] = useState(false);
    const [result, setResult] = useState<{win: boolean, message: string} | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const { toast } = useToast();

    const getWeightedRandomReward = () => {
        const totalRewardChance = REWARDS_POOL_CONFIG.reduce((sum, item) => sum + item.chance, 0);
        const rand = Math.random() * totalRewardChance;
        let cumulativeChance = 0;
        for (const item of REWARDS_POOL_CONFIG) {
            cumulativeChance += item.chance;
            if (rand < cumulativeChance) return item.type;
        }
        return REWARDS_POOL_CONFIG[REWARDS_POOL_CONFIG.length - 1].type;
    };
    
    const shuffleCards = useCallback(() => {
        setIsShuffling(true);
        setCards([]); // Clear cards immediately
        setResult(null);

        setTimeout(() => {
            let rewards = Array.from({ length: 4 }, () => getWeightedRandomReward());
            let newCards = rewards.map(r => ({ type: 'reward', value: r, flipped: false }))
                .concat(Array(5).fill(null).map(() => ({ type: 'joker', value: 0, flipped: false })));
            
            for (let i = newCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
            }
            setCards(newCards);
            setRevealed(false);
            setIsShuffling(false);
        }, 500); // Increased delay for animation
    }, []);

    useEffect(() => {
        if (isOpen) {
            shuffleCards();
        }
    }, [isOpen, shuffleCards]);

    const handleCardClick = async (index: number) => {
        if (revealed || cards[index].flipped || isShuffling) return;

        // Prevent further clicks until the round is over
        setRevealed(true);
    
        // 1. Flip the selected card only
        const newCards = [...cards];
        newCards[index] = { ...newCards[index], flipped: true };
        setCards(newCards);
    
        const clickedCard = newCards[index];
    
        // 2. Award credits/show result message based on the selected card
        if (clickedCard.type === 'reward') {
            const success = await awardCredits(clickedCard.value);
            if (success) {
                setCredits(c => c !== null ? c + clickedCard.value : null);
                setResult({ win: true, message: `PANALO KA! ${clickedCard.value} Credits nakuha.` });
                toast({ title: 'Panalo ka!', description: `+${clickedCard.value} credits mula sa Witch Hunt!`});
            }
        } else {
            setResult({ win: false, message: 'TAPOS ANG LARO. Nakapili ka ng Joker.' });
            toast({ title: 'Talo ka!', description: `Walang napanalunang credits mula sa Witch Hunt.`, variant: 'destructive'});
        }
    
        // 3. After a delay, reveal all other cards
        setTimeout(() => {
            setCards(prevCards => prevCards.map(card => ({ ...card, flipped: true })));
        }, 1000); // 1-second delay
    };

    const handlePlayAgain = async () => {
        if (credits !== null && credits < WITCH_HUNT_COST) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits' });
            return;
        }
        const success = await spendCredits(WITCH_HUNT_COST, 'Witch Hunt');
        if (success) {
            setCredits(c => c !== null ? c - WITCH_HUNT_COST : null);
            shuffleCards();
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Witch Hunt</DialogTitle>
                    <DialogDescription className="flex justify-between items-center">
                        <span>5 Joker, 4 Premyo. Hanapin ang premyo para manalo!</span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                           <Coins className="h-4 w-4 text-accent" />
                            {credits !== null ? (
                                <span>{credits}</span>
                            ) : (
                                <span className="w-8 h-4 bg-muted rounded animate-pulse" />
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2 md:gap-4 my-4">
                    {isShuffling ? (
                         Array.from({ length: 9 }).map((_, index) => (
                            <div key={index} className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
                        ))
                    ) : cards.map((card, index) => (
                        <div key={index} className="[perspective:1000px]" onClick={() => handleCardClick(index)}>
                            <div className={cn("relative w-full aspect-[2/3] [transform-style:preserve-3d] transition-transform duration-700", card.flipped ? '[transform:rotateY(180deg)]' : '', revealed ? "cursor-default" : "cursor-pointer")}>
                                {/* Card Front (Hidden State) */}
                                <div className="absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-4xl">
                                    <HelpCircle className="h-10 w-10" />
                                </div>
                                
                                {/* Card Back (Revealed State) */}
                                <div className={cn(
                                    "absolute w-full h-full [backface-visibility:hidden] flex flex-col items-center justify-center rounded-lg [transform:rotateY(180deg)]",
                                    card.type === 'reward' ? 'bg-green-500 text-white' : 'bg-destructive text-destructive-foreground'
                                )}>
                                    {card.type === 'reward' ? <Gem size={40} /> : <Skull size={40} />}
                                    {card.type === 'reward' && <span className="font-bold text-lg mt-2">{card.value}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {result && (
                    <div className={cn("text-center font-bold p-2 rounded", result.win ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                        {result.message}
                    </div>
                )}
                 <DialogFooter className="mt-4">
                    <Button onClick={handlePlayAgain} disabled={!revealed || isShuffling || (credits !== null && credits < WITCH_HUNT_COST)}>
                        Laro Ulit ({WITCH_HUNT_COST}cr)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Terminal Code Game
function TerminalCodeModal({ isOpen, onOpenChange, spendCredits, awardCredits, credits, setCredits }) {
    const [secretCode, setSecretCode] = useState('');
    const [attempts, setAttempts] = useState(5);
    const [guess, setGuess] = useState('');
    const [history, setHistory] = useState<{guess: string; correct: number}[]>([]);
    const [result, setResult] = useState<{win: boolean, message: string} | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const startGame = useCallback(() => {
        setSecretCode(String(Math.floor(100 + Math.random() * 900)));
        setAttempts(5);
        setGuess('');
        setHistory([]);
        setResult(null);
    }, []);

    useEffect(() => {
        if (isOpen) {
            startGame();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, startGame]);
    
    const handleGuess = async () => {
        if (guess.length !== 3) return;

        const newHistory = [...history, {guess, correct: 0}];
        let correctDigits = 0;
        for (let i = 0; i < 3; i++) {
            if (guess[i] === secretCode[i]) correctDigits++;
        }
        newHistory[newHistory.length-1].correct = correctDigits;

        if(guess === secretCode) {
            const attemptNum = 6 - attempts;
            let reward = 0;
            if (attemptNum === 1) reward = 150;
            else if (attemptNum === 2) reward = 100;
            else if (attemptNum === 3) reward = 60;
            else if (attemptNum === 4) reward = 40;
            else reward = 30;
            await awardCredits(reward);
            setCredits(c => c !== null ? c + reward : null);
            setResult({win: true, message: `ACCESS GRANTED! Panalo ka ng ${reward} credits.`});
            toast({ title: 'Panalo ka!', description: `+${reward} credits mula sa Terminal Code!`});
        } else if (attempts - 1 === 0) {
            const maxCorrect = Math.max(...newHistory.map(h => h.correct));
            let consolation = 0;
            if(maxCorrect === 2) consolation = 35;
            else if(maxCorrect === 1) consolation = 15;

            if (consolation > 0) {
                await awardCredits(consolation);
                setCredits(c => c !== null ? c + consolation : null);
                setResult({win: true, message: `SAYANG! Ang code: ${secretCode}. Consolation prize: ${consolation} credits.`});
                toast({ title: 'Consolation Prize!', description: `+${consolation} credits mula sa Terminal Code.`});
            } else {
                setResult({win: false, message: `SYSTEM LOCKDOWN. Ang code ay ${secretCode}.`});
                toast({ title: 'Talo ka!', description: `Walang napanalunang credits.`, variant: 'destructive'});
            }
        }
        
        setHistory(newHistory);
        setAttempts(a => a - 1);
        setGuess('');
    };

    const handlePlayAgain = async () => {
        if (credits !== null && credits < TERMINAL_CODE_COST) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits' });
            return;
        }
        const success = await spendCredits(TERMINAL_CODE_COST, 'Terminal Code');
        if (success) {
            setCredits(c => c !== null ? c - TERMINAL_CODE_COST : null);
            startGame();
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Terminal Code</DialogTitle>
                    <DialogDescription className="flex justify-between items-center">
                        <span>Hulaan ang 3-digit code. Mayroon kang {attempts} na pagsubok.</span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                           <Coins className="h-4 w-4 text-accent" />
                            {credits !== null ? (
                                <span>{credits}</span>
                            ) : (
                                <span className="w-8 h-4 bg-muted rounded animate-pulse" />
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex flex-col items-center gap-4 my-4">
                    <div className="flex gap-2">
                         <Input
                            ref={inputRef}
                            type="tel"
                            maxLength="3"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
                            className="w-24 h-16 text-center text-3xl font-mono tracking-widest"
                            disabled={!!result || attempts === 0}
                        />
                    </div>
                     <Button onClick={handleGuess} disabled={!!result || attempts === 0 || guess.length !== 3}>Ipasa ang Hula</Button>
                </div>
                <div className="h-24 overflow-y-auto bg-muted p-2 rounded-md text-sm font-mono">
                    {history.length === 0 ? <p className="text-muted-foreground">History ng mga hula...</p> : history.map((h, i) => (
                        <p key={i}>&gt; Hula {i+1}: {h.guess} - {h.correct} tama.</p>
                    ))}
                </div>
                 {result && (
                    <div className={cn("text-center font-bold p-2 rounded mt-2", result.win ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                        {result.message}
                    </div>
                )}
                 <DialogFooter className="mt-4">
                    <Button onClick={handlePlayAgain} disabled={!result || (credits !== null && credits < TERMINAL_CODE_COST)}>
                        Laro Ulit ({TERMINAL_CODE_COST}cr)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Power Balance Game
function PowerBalanceModal({ isOpen, onOpenChange, level, spendCredits, awardCredits, credits, setCredits }) {
    const [barPosition, setBarPosition] = useState(0);
    const [gameActive, setGameActive] = useState(false);
    const [result, setResult] = useState<{win: boolean, message: string} | null>(null);
    const animationRef = useRef<number>();
    const { toast } = useToast();

    const settings = balanceLevels[level];

    const startGame = useCallback(() => {
        setBarPosition(0);
        setResult(null);
        setGameActive(true);
    }, []);

    useEffect(() => {
        if(isOpen) startGame();
        else setGameActive(false);
    }, [isOpen, startGame]);

    useEffect(() => {
        let direction = 1;
        const moveBar = () => {
            setBarPosition(pos => {
                let newPos = pos + direction * settings.speed;
                if (newPos > 100 || newPos < 0) {
                    direction *= -1;
                    newPos = Math.max(0, Math.min(100, newPos));
                }
                return newPos;
            });
            animationRef.current = requestAnimationFrame(moveBar);
        };

        if (gameActive) {
            animationRef.current = requestAnimationFrame(moveBar);
        }

        return () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
          }
        };
    }, [gameActive, settings.speed]);

    const stopBar = async () => {
        if (!gameActive) return;
        setGameActive(false);

        const safeZoneStart = 50 - settings.zoneWidth / 2;
        const safeZoneEnd = 50 + settings.zoneWidth / 2;

        if (barPosition >= safeZoneStart && barPosition <= safeZoneEnd) {
            await awardCredits(settings.reward);
            setCredits(c => c !== null ? c + settings.reward : null);
            setResult({ win: true, message: `SAKTO! Panalo ka ng ${settings.reward} credits.`});
            toast({ title: 'Panalo ka!', description: `+${settings.reward} credits mula sa Power Balance!`});
        } else {
            setResult({ win: false, message: 'SYSTEM OVERLOAD. Lumagpas ka sa zone.' });
            toast({ title: 'Talo ka!', description: `Walang napanalunang credits.`, variant: 'destructive'});
        }
    };

    const handlePlayAgain = async () => {
         if (credits !== null && credits < settings.cost) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits' });
            return;
        }
        const success = await spendCredits(settings.cost, `Power Balance (${level})`);
        if (success) {
            setCredits(c => c !== null ? c - settings.cost : null);
            startGame();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Power Balance - {level.charAt(0).toUpperCase() + level.slice(1)}</DialogTitle>
                     <DialogDescription className="flex justify-between items-center">
                        <span>Pindutin kahit saan para itigil ang bar sa green zone.</span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                           <Coins className="h-4 w-4 text-accent" />
                            {credits !== null ? (
                                <span>{credits}</span>
                            ) : (
                                <span className="w-8 h-4 bg-muted rounded animate-pulse" />
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="my-8 cursor-pointer" onClick={stopBar}>
                    <div className="relative w-full h-10 bg-muted rounded-full overflow-hidden border-2 border-border">
                        <div className="absolute h-full bg-green-500/50" style={{ width: `${settings.zoneWidth}%`, left: `${50 - settings.zoneWidth/2}%`}}></div>
                        <div className={cn("absolute h-full w-1.5", result ? (result.win ? 'bg-green-500' : 'bg-destructive') : 'bg-primary')} style={{ left: `${barPosition}%`}}></div>
                    </div>
                </div>
                 {result && (
                    <div className={cn("text-center font-bold p-2 rounded", result.win ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                        {result.message}
                    </div>
                )}
                 <DialogFooter className="mt-4">
                    <Button onClick={handlePlayAgain} disabled={!result || (credits !== null && credits < settings.cost)}>
                        Laro Ulit ({settings.cost}cr)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Last Stand Game
function LastStandModal({ isOpen, onOpenChange, level, spendCredits, awardCredits, credits, setCredits }) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [score, setScore] = useState(0);
    const [gameActive, setGameActive] = useState(false);
    const [result, setResult] = useState<{win: boolean, message: string} | null>(null);
    const [target, setTarget] = useState({ active: false, x: 0, y: 0 });
    const timerRef = useRef<NodeJS.Timeout>();
    const spawnRef = useRef<NodeJS.Timeout>();
    const { toast } = useToast();

    const settings = lastStandLevels[level];

    const startGame = useCallback(() => {
        setTimeLeft(settings.time);
        setScore(0);
        setResult(null);
        setGameActive(true);
    }, [settings]);

    useEffect(() => {
        if(isOpen) startGame();
        else setGameActive(false);
    }, [isOpen, startGame]);
    
    const spawnTarget = useCallback(() => {
        if (!gameActive) return;
        const x = Math.random() * (100 - (settings.targetSize / 4)); // %
        const y = Math.random() * (100 - (settings.targetSize / 4)); // %
        setTarget({ active: true, x, y });
    }, [gameActive, settings.targetSize]);

    useEffect(() => {
        if (gameActive) {
            spawnTarget();
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t > 0) return t - 1;
                    return 0;
                });
            }, 1000);
        }
        return () => {
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
        };
    }, [gameActive, spawnTarget]);

    useEffect(() => {
        const endGame = async () => {
            setGameActive(false);
            const totalPoints = score * settings.pointsPerHit;
            if (totalPoints > 0) {
                await awardCredits(totalPoints);
                setCredits(c => c !== null ? c + totalPoints : null);
                setResult({win: true, message: `UBOS NA ANG ORAS! Nakatama ka ng ${score} target, at kumita ng ${totalPoints} credits.`});
                toast({ title: 'Tapos na ang Oras!', description: `Kumita ka ng ${totalPoints} credits!` });
            } else {
                setResult({win: false, message: `UBOS NA ANG ORAS! Wala kang natamaang target.`});
                toast({ title: 'Tapos na ang Oras!', description: `Walang napanalunang credits.`, variant: 'destructive' });
            }
        };

        if (timeLeft === 0 && gameActive) {
            endGame();
        }
    }, [timeLeft, gameActive, score, settings, awardCredits, level, toast, setCredits]);

    const handleTargetClick = () => {
        if (!gameActive) return;
        setScore(s => s + 1);
        setTarget(t => ({...t, active: false}));
        if(spawnRef.current) clearTimeout(spawnRef.current);
        spawnRef.current = setTimeout(spawnTarget, settings.spawnRate / 2);
    };
    
    const handlePlayAgain = async () => {
         if (credits !== null && credits < settings.cost) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits' });
            return;
        }
        const success = await spendCredits(settings.cost, `Last Stand (${level})`);
        if (success) {
            setCredits(c => c !== null ? c - settings.cost : null);
            startGame();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Last Stand - {level.charAt(0).toUpperCase() + level.slice(1)}</DialogTitle>
                     <div className="flex justify-around text-lg font-mono">
                        <div>ORAS: <span className={cn(timeLeft <= 3 && 'text-destructive font-bold animate-pulse')}>{timeLeft}s</span></div>
                        <div>TAMA: <span>{score}</span></div>
                    </div>
                </DialogHeader>
                <div className="relative w-full h-64 bg-muted rounded-md cursor-crosshair overflow-hidden" onClick={() => {}}>
                    {target.active && (
                         <div 
                            className="absolute bg-destructive rounded-full" 
                            style={{
                                width: `${settings.targetSize}px`,
                                height: `${settings.targetSize}px`,
                                left: `${target.x}%`,
                                top: `${target.y}%`,
                                transition: 'transform 0.1s ease-out'
                            }}
                            onClick={(e) => { e.stopPropagation(); handleTargetClick(); }}
                        />
                    )}
                </div>
                 {result && (
                    <div className={cn("text-center font-bold p-2 rounded mt-2", result.win ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                        {result.message}
                    </div>
                )}
                 <DialogFooter className="mt-4">
                     <div className="flex items-center gap-1 text-sm font-semibold text-primary mr-auto">
                           <Coins className="h-4 w-4 text-accent" />
                            {credits !== null ? (
                                <span>{credits}</span>
                            ) : (
                                <span className="w-8 h-4 bg-muted rounded animate-pulse" />
                            )}
                        </div>
                    <Button onClick={handlePlayAgain} disabled={!result || (credits !== null && credits < settings.cost)}>
                        Laro Ulit ({settings.cost}cr)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function EventPrizeModal({ isOpen, onOpenChange, goal, router }: { isOpen: boolean, onOpenChange: (open: boolean) => void, goal: { id: string, requirement: number } | null, router: any }) {
    const { showLoading } = useLoading();
    if (!goal) return null;

    const handleClaim = () => {
        showLoading('bar');
        router.push('/dashboard/events');
        onOpenChange(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Naabot mo na ang Event Goal!</DialogTitle>
                     <DialogDescription>
                        Congratulations! Nanalo ka na ng mahigit <span className="font-bold text-primary">{goal.requirement}</span> credits sa Arena ngayong buwan.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-center">
                    <p className="text-lg">Pumunta sa <span className="font-bold text-accent">Events tab</span> para i-claim ang iyong premyo!</p>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="outline">Isara</Button>
                    <Button onClick={handleClaim}>Pumunta sa Events</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Main Arena Page
export default function ArenaPage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const { showLoading } = useLoading();
    const [activeGame, setActiveGame] = useState<{ name: string | null, level: string }>({ name: null, level: 'easy' });
    
    const [credits, setCredits] = useState<number | null>(null);
    const [onlineUserCount, setOnlineUserCount] = useState(0);
    
    const [eventPrizeModal, setEventPrizeModal] = useState<{ isOpen: boolean; goal: {id: string, requirement: number} | null }>({ isOpen: false, goal: null });


    // Fetch initial user data and set up a listener
    useEffect(() => {
        if (user && firestore) {
            const userDocRef = doc(firestore, "users", user.uid);
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCredits(data.credits);
                } else {
                    setCredits(null);
                }
            }, (error) => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'get'
                });
                errorEmitter.emit('permission-error', permissionError);
            });
            return () => unsubscribe();
        }
    }, [user, firestore]);
    
    // Listen for online users
    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return query(
            collection(firestore, 'users'),
            where('lastSeen', '>', fiveMinutesAgo)
        );
    }, [firestore, user]);

    useEffect(() => {
        if (!usersQuery || !user) return;
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const onlineCount = snapshot.docs.filter(doc => doc.id !== user.uid).length;
            setOnlineUserCount(onlineCount);
        },
        async (error) => {
          const permissionError = new FirestorePermissionError({
            path: (usersQuery as any).path,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        });

        return () => unsubscribe();
    }, [usersQuery, user]);

    const handleCredits = async (amount: number, description: string = 'Game Reward') => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Hindi naka-log in ang user.' });
            return false;
        }

        const userDocRef = doc(firestore, "users", user.uid);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User not found");

                const currentData = userDoc.data();
                const currentCredits = currentData.credits || 0;
                
                if (amount < 0 && currentCredits < Math.abs(amount)) {
                    throw new Error("Kulang ang credits");
                }
                
                const newCredits = currentCredits + amount;
                const updateData: any = { credits: newCredits };
                
                // If it's a win, update monthly event progress
                if (amount > 0) {
                    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
                    const eventProgress = currentData.monthlyEvent || { month: '1970-01', arenaCreditsWon: 0, hasMadeVoucherPurchase: false, claimedRewards: [] };
                    
                    const oldArenaCreditsWon = eventProgress.arenaCreditsWon || 0;
                    const newArenaCreditsWon = oldArenaCreditsWon + amount;
                    
                    if (eventProgress.month !== currentMonth) {
                        // Reset for new month and add current win
                        updateData.monthlyEvent = {
                            month: currentMonth,
                            arenaCreditsWon: amount,
                            hasMadeVoucherPurchase: false,
                            claimedRewards: [],
                        };
                    } else {
                        // Increment for current month
                        updateData['monthlyEvent.arenaCreditsWon'] = newArenaCreditsWon;
                    }

                    // Check for milestone completion and notify
                    for (const goal of eventGoals) {
                         const notifiedGoals = JSON.parse(sessionStorage.getItem('notifiedEventGoals') || '{}');
                        if (oldArenaCreditsWon < goal.requirement && newArenaCreditsWon >= goal.requirement && !notifiedGoals[goal.id]) {
                            setEventPrizeModal({isOpen: true, goal});
                            notifiedGoals[goal.id] = true;
                            sessionStorage.setItem('notifiedEventGoals', JSON.stringify(notifiedGoals));
                            break; // Show one modal at a time
                        }
                    }
                }
                
                transaction.update(userDocRef, updateData);
            });
            return true;
        } catch (error: any) {
            if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: 'destructive', title: 'Nabigo ang Transaksyon', description: error.message });
            }
            return false;
        }
    };
    
    const spendCredits = (cost: number, gameName: string) => handleCredits(-cost, `Played ${gameName}`);
    const awardCredits = (reward: number) => handleCredits(reward);
    
    const openGame = async (name: string, level = 'easy') => {
        let cost = 0;
        switch (name) {
            case 'lucky-draw': cost = 0; break; // Cost handled inside modal
            case 'witch-hunt': cost = WITCH_HUNT_COST; break;
            case 'terminal-code': cost = TERMINAL_CODE_COST; break;
            case 'power-balance': cost = balanceLevels[level as keyof typeof balanceLevels].cost; break;
            case 'last-stand': cost = lastStandLevels[level as keyof typeof lastStandLevels].cost; break;
        }
        
        if (credits !== null && credits < cost) {
            toast({ variant: 'destructive', title: 'Kulang ang Credits' });
            return;
        }

        // For games other than lucky draw, spend credits before opening
        if(name !== 'lucky-draw') {
            const success = await spendCredits(cost, `Play ${name}`);
            if (!success) {
                return;
            }
            // Manually deduct credits from local state for immediate feedback
            setCredits(c => c !== null ? c - cost : null);
        }
        
        setActiveGame({ name, level });
    };

    const gameCards = [
        { id: 'lucky-draw', title: 'Lucky Draw!', difficulty: 'J ♥', description: 'Slot machine ng kapalaran. Paikutin ang reels at itugma ang mga icon para manalo ng malalaking premyo.', cost: LUCKY_DRAW_COST, reward: '0-1200', popular: true, onPlay: () => setActiveGame({ name: 'lucky-draw', level: 'easy' }) },
        { id: 'witch-hunt', title: 'Witch Hunt', difficulty: '♥ 9', description: 'Laro ng swerte. Hanapin ang isa sa 4 na premyo sa gitna ng 5 Joker para manalo.', cost: WITCH_HUNT_COST, reward: '25-80', onPlay: () => openGame('witch-hunt') },
        { id: 'terminal-code', title: 'Terminal Code', difficulty: '♦ 8', description: 'Subok sa lohika. Hulaan ang 3-digit code sa loob ng 5 pagkakataon. Mas malaki ang premyo sa mas mabilis na hula.', cost: TERMINAL_CODE_COST, reward: '15-150', onPlay: () => openGame('terminal-code') },
        { id: 'power-balance', title: 'Power Balance', difficulty: '♣ 6-9', description: 'Laro ng tamang tiyempo. Itigil ang bar sa green zone. Mas mahirap, mas malaking premyo.', levels: ['easy', 'medium', 'hard'] },
        { id: 'last-stand', title: 'Last Stand', difficulty: '♠ 5-9', description: 'Subok sa bilis. Tamaan ang pinakamaraming target bago maubos ang oras para kumita ng credits.', levels: ['easy', 'medium', 'hard'] },
    ];
    
    const handleOnlineClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        showLoading('bar');
        router.push('/dashboard/online');
    }

    return (
        <>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="text-center mb-12">
                    <div className="flex justify-center items-center relative mb-4">
                        <Button variant="outline" size="icon" className="absolute left-0" asChild>
                            <Link href="/dashboard" onClick={(e) => { e.preventDefault(); showLoading('bar'); router.push('/dashboard'); }}>
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Balik sa Dashboard</span>
                            </Link>
                        </Button>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold text-primary tracking-tighter leading-tight">
                            Icie Arena
                        </h1>
                    </div>
                     <p className="text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
                        Ang WiFi mo, Laro na Ngayon. Maglaro para kumita ng mas maraming credits!
                    </p>
                    <Card className="max-w-md mx-auto mt-4 p-4">
                        <CardContent className="p-0 flex items-center justify-between">
                            <div className="text-left">
                                <h3 className="font-semibold text-primary">Tingnan Kung Sino ang Online</h3>
                                <p className="text-sm text-muted-foreground">Maghanap ng ibang player para ka-chat o ka-battle.</p>
                            </div>
                            <Button asChild className="relative">
                                <Link href="/dashboard/online" onClick={handleOnlineClick}>
                                     {onlineUserCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                        </span>
                                    )}
                                    <Users className="mr-2" /> Tingnan ang Players
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </header>

                <main className="relative">
                    <div className={"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                       {gameCards.map(game => (
                            <Card key={game.id} className="flex flex-col relative">
                                {game.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Pinakasikat</Badge>}
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-2xl">{game.title}</CardTitle>
                                        <div className="font-mono text-lg font-bold text-destructive">{game.difficulty}</div>
                                    </div>
                                    <CardDescription>{game.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    {game.levels ? (
                                        <div className="space-y-2">
                                            {game.id === 'power-balance' && 
                                                ['easy', 'medium', 'hard'].map(lvl => (
                                                <div key={lvl} className="flex justify-between items-center text-sm"><span>Premyo ({lvl.charAt(0).toUpperCase() + lvl.slice(1)}):</span> <span className="font-bold text-green-600">{balanceLevels[lvl as keyof typeof balanceLevels].reward} credits</span></div>
                                            ))}
                                            {game.id === 'last-stand' &&
                                                 ['easy', 'medium', 'hard'].map(lvl => (
                                                <div key={lvl} className="flex justify-between items-center text-sm"><span>Credits bawat Tama ({lvl.charAt(0).toUpperCase() + lvl.slice(1)}):</span> <span className="font-bold text-green-600">{lastStandLevels[lvl as keyof typeof lastStandLevels].pointsPerHit}</span></div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center text-sm"><span>Posibleng Premyo:</span> <span className="font-bold text-green-600">{game.reward} credits</span></div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex-col items-stretch gap-2">
                                    {game.levels ? (
                                        <>
                                            <p className="text-center text-sm font-medium text-muted-foreground">Pumili ng Hirap at Maglaro:</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {game.id === 'power-balance' && ['easy', 'medium', 'hard'].map(lvl => (
                                                    <Button key={lvl} variant="secondary" onClick={() => openGame('power-balance', lvl)}>
                                                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)} ({balanceLevels[lvl as keyof typeof balanceLevels].cost}cr)
                                                    </Button>
                                                ))}
                                                {game.id === 'last-stand' && ['easy', 'medium', 'hard'].map(lvl => (
                                                    <Button key={lvl} variant="secondary" onClick={() => openGame('last-stand', lvl)}>
                                                         {lvl.charAt(0).toUpperCase() + lvl.slice(1)} ({lastStandLevels[lvl as keyof typeof lastStandLevels].cost}cr)
                                                    </Button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <Button onClick={game.onPlay}>
                                            {game.id === 'lucky-draw' ? 'Maglaro' : `Maglaro (${game.cost}cr)`}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                       ))}
                    </div>
                </main>
            </div>

             {/* Game Modals */}
             <LuckyDrawModal
                isOpen={activeGame.name === 'lucky-draw'}
                onOpenChange={(open) => setActiveGame({ name: open ? 'lucky-draw' : null, level: 'easy'})}
                spendCredits={spendCredits}
                awardCredits={awardCredits}
                credits={credits}
                setCredits={setCredits}
             />
             <WitchHuntModal
                isOpen={activeGame.name === 'witch-hunt'}
                onOpenChange={() => setActiveGame({ name: null, level: 'easy'})}
                spendCredits={spendCredits}
                awardCredits={awardCredits}
                credits={credits}
                setCredits={setCredits}
            />
            <TerminalCodeModal
                 isOpen={activeGame.name === 'terminal-code'}
                 onOpenChange={() => setActiveGame({ name: null, level: 'easy'})}
                 spendCredits={spendCredits}
                 awardCredits={awardCredits}
                 credits={credits}
                 setCredits={setCredits}
            />
            <PowerBalanceModal
                isOpen={activeGame.name === 'power-balance'}
                onOpenChange={() => setActiveGame({ name: null, level: 'easy'})}
                level={activeGame.level}
                spendCredits={spendCredits}
                awardCredits={awardCredits}
                credits={credits}
                setCredits={setCredits}
            />
            <LastStandModal
                isOpen={activeGame.name === 'last-stand'}
                onOpenChange={() => setActiveGame({ name: null, level: 'easy'})}
                level={activeGame.level}
                spendCredits={spendCredits}
                awardCredits={awardCredits}
                credits={credits}
                setCredits={setCredits}
            />
            <EventPrizeModal 
                isOpen={eventPrizeModal.isOpen} 
                onOpenChange={(open) => setEventPrizeModal({ isOpen: open, goal: null })}
                goal={eventPrizeModal.goal}
                router={router}
            />
        </>
    );
}
