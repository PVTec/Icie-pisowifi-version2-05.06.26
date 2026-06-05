
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, runTransaction, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { Loader2, Coins, Gift, Palette, CheckCircle, HelpCircle } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Separator } from '@/components/ui/separator';


type UserProfile = {
    credits: number;
    purchasedThemes?: string[];
};

type CreditCode = {
    id: string;
    credits: number;
    status: 'active' | 'redeemed';
    themeId?: string;
};

type RedeemCreditsDialogProps = {
  profile: UserProfile | null;
  children: React.ReactNode;
};

type RedemptionResult = {
    credits: number;
    themeId?: string;
    themeName?: string;
};

const themes = [
    { id: 'light', name: 'Default Light' },
    { id: 'dark', name: 'Default Dark' },
    { id: 'bubbles-light', name: 'Bubbles Light' },
    { id: 'golden', name: 'Golden Theme' },
    { id: 'takedown', name: 'Takedown Theme' },
    { id: 'howitsdone', name: "How It's Done Theme" },
    { id: 'christmas', name: 'Christmas Theme' },
];


export function RedeemCreditsDialog({ profile, children }: RedeemCreditsDialogProps) {
  const user = useUser();
  const { firestore } = useFirestore();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);

  const handleRedeem = async () => {
    if (!user || !firestore || !code.trim()) return;
    setIsRedeeming(true);

    const codesRef = collection(firestore, 'credit_codes');
    const q = query(codesRef, where('code', '==', code.trim().toUpperCase()));

    try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid code.");
        }

        const codeDoc = querySnapshot.docs[0];
        const codeData = codeDoc.data() as CreditCode;

        if (codeData.status !== 'active') {
            throw new Error("This code has already been redeemed.");
        }

        await runTransaction(firestore, async (transaction) => {
            const userDocRef = doc(firestore, "users", user.uid);
            const userDoc = await transaction.get(userDocRef);

            if (!userDoc.exists()) throw new Error("User not found.");

            const userData = userDoc.data() as UserProfile;
            const updates: any = {
                credits: userData.credits + codeData.credits
            };

            if (codeData.themeId) {
                const currentThemes = userData.purchasedThemes || [];
                if (!currentThemes.includes(codeData.themeId)) {
                    updates.purchasedThemes = [...currentThemes, codeData.themeId];
                }
            }
            
            transaction.update(userDocRef, updates);

            transaction.update(codeDoc.ref, {
                status: 'redeemed',
                redeemedAt: serverTimestamp(),
                redeemedBy: user.uid,
            });

            const transactionRef = doc(collection(firestore, "users", user.uid, "transactions"));
            transaction.set(transactionRef, {
                type: 'redeem',
                description: `Redeemed code: ${code.trim().toUpperCase()}`,
                amount: codeData.credits,
                createdAt: serverTimestamp()
            });
        });
        
        const themeName = themes.find(t => t.id === codeData.themeId)?.name;
        setRedemptionResult({
            credits: codeData.credits,
            themeId: codeData.themeId,
            themeName: themeName,
        });

        setCode('');
        setIsOpen(false); // Close the redemption dialog

    } catch (error: any) {
        if (error.message.includes('permission-denied')) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `credit_codes or users/${user.uid}`,
                operation: 'write',
                requestResourceData: { code: code.trim().toUpperCase() }
            }));
        } else {
          toast({
              variant: "destructive",
              title: "Redemption Failed",
              description: error.message,
          });
        }
    } finally {
        setIsRedeeming(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mag-redeem ng Credits</DialogTitle>
            <DialogDescription>
              Ilagay ang iyong credit code dito para madagdagan ang iyong balanse.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
              <div className="space-y-2">
                  <Label htmlFor="redeem-code">Code</Label>
                  <Input 
                      id="redeem-code" 
                      placeholder="Ilagay ang redeem code" 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)}
                      className="font-mono"
                  />
              </div>
              
               <div className="rounded-lg border p-4 text-sm">
                  <h3 className="font-semibold text-foreground mb-2">Bumili ng Credits mula sa Owner</h3>
                   <div className="space-y-1 text-muted-foreground">
                      <div className="flex justify-between"><span>7,500 credits</span><span>₱5.00</span></div>
                      <div className="flex justify-between"><span>15,000 credits</span><span>₱10.00</span></div>
                      <div className="flex justify-between"><span>22,500 credits</span><span>₱15.00</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground/80 mt-3">
                      Tandaan: Ang pagbili ng credit ay dapat gawin nang direkta sa may-ari. Ang mga opsyon sa itaas ay para lamang sa impormasyon ng presyo.
                  </p>
              </div>
              
          </div>
          <Button onClick={handleRedeem} disabled={isRedeeming || !code.trim()} className="w-full">
              {isRedeeming ? <Loader2 className="animate-spin" /> : 'Redeem'}
          </Button>
        </DialogContent>
      </Dialog>
      
      {/* Success Modal */}
      <Dialog open={!!redemptionResult} onOpenChange={(open) => !open && setRedemptionResult(null)}>
        <DialogContent>
            <DialogHeader>
                 <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                </div>
                <DialogTitle className="text-center text-2xl">Rewards Claimed!</DialogTitle>
                <DialogDescription className="text-center pt-2">
                    Congratulations! Here's what you've received.
                </DialogDescription>
            </DialogHeader>
             <div className="py-4 space-y-4">
                <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-secondary">
                    <Coins className="h-8 w-8 text-yellow-500" />
                    <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">+{redemptionResult?.credits.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Credits Added</p>
                    </div>
                </div>
                {redemptionResult?.themeId && (
                     <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-secondary">
                        <Palette className="h-8 w-8 text-purple-500" />
                        <div className="text-center">
                            <p className="text-lg font-bold text-foreground">Unlocked: "{redemptionResult.themeName}"</p>
                            <p className="text-sm text-muted-foreground">New theme available in your profile!</p>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button className="w-full">Awesome!</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
