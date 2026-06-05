

'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useFirestore, useUser } from "@/firebase";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { doc, setDoc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { ArrowLeft, Coins, History, Bell, Shield, User as UserIcon, Music, Gift, Warehouse, Info, KeyRound, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "firebase/auth";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const avatars = [
    '/avatars/zero-two.jpg',
    '/avatars/hinata-hoshino.jpg',
    '/avatars/mei-sakurajima.jpg',
    '/avatars/killua.jpg',
    '/avatars/avatar1.jpg',
    '/avatars/avatar2.jpg',
    '/avatars/avatar3.jpg',
    '/avatars/avatar4.jpg',
    '/avatars/avatar5.jpg',
    '/avatars/mina-koyorin.jpg',
    '/avatars/cyberpunk.jpg',
];

const bgmOptions = [
    { id: 'linda-pecado', label: 'LINDA PECADO', src: '/music/bgm.mp3' },
    { id: 'zenzenzense', label: 'Zenzezense (your name)', src: '/music/icie.mp3' },
    { id: 'christmas', label: "Icie's Christmas Seasonal BGM", src: '/music/christmas.mp3', isSpecial: true },
    { id: 'last-christmas', label: 'Last Christmas', src: '/music/lastchristmas.mp3', isSpecial: true },
    { id: 'golden', label: 'Golden by Huntrix (limited)', src: '/music/golden.mp3', isSpecial: true },
    { id: 'takedown', label: 'Takedown by Huntrix (limited)', src: '/music/takedown.mp3', isSpecial: true },
    { id: 'soda-pop', label: 'Soda Pop by SAJA Boys (limited)', src: '/music/soda-pop.mp3', isSpecial: true },
    { id: 'howitsdone', label: "How It's Done by Huntrix (limited)", src: '/music/howitsdone.mp3', isSpecial: true },
];

type UserProfile = {
    displayName: string;
    email: string;
    credits: number;
    photoURL: string;
    notificationsEnabled?: boolean;
    pinEnabled?: boolean;
    pinCode?: string;
    bgmThemeTrialExpiresAt?: Timestamp;
    bgmThemeTrialClaimed?: boolean;
    purchasedThemes?: string[];
};

function BgmTrialClaimModal({ isOpen, onOpenChange, onConfirm }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent border-2 border-accent/20">
                    <Gift className="h-10 w-10" />
                </div>
                <DialogTitle className="text-2xl font-bold font-headline">I-unlock ang Exclusive BGM Themes!</DialogTitle>
                <DialogDescription className="mt-2">
                    I-claim ang iyong isang beses na 36-oras na trial para ma-access ang mga limitadong-edisyon na background music at ang mga katugmang tema nito.
                </DialogDescription>
            </div>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Mamaya na</Button>
          <Button onClick={onConfirm}>I-claim ang Trial Ngayon</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PinCodeDialog({ onSave, currentPinEnabled }: { onSave: (pin: string, enabled: boolean) => Promise<void>, currentPinEnabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (pin.length !== 4) {
            toast({ title: "Hindi Valid na PIN", description: "Ang PIN ay dapat may 4 na numero.", variant: 'destructive' });
            return;
        }
        if (pin !== confirmPin) {
            toast({ title: "Hindi Tugma ang mga PIN", description: "Ang mga inilagay mong PIN ay hindi magkatugma.", variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        await onSave(pin, true);
        setIsSaving(false);
        setIsOpen(false);
        setPin('');
        setConfirmPin('');
    };

    const handleToggle = async (enabled: boolean) => {
        if (enabled) {
            setIsOpen(true);
        } else {
             setIsSaving(true);
             await onSave('', false);
             setIsSaving(false);
        }
    };

    return (
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-md border p-4 gap-4">
                <div className="flex-grow">
                    <p className="font-medium flex items-center gap-2"><KeyRound/> PIN Code</p>
                    <p className="text-sm text-muted-foreground">Magdagdag ng 4-digit PIN para sa dagdag na seguridad sa iyong account.</p>
                </div>
                <Switch
                    checked={currentPinEnabled}
                    onCheckedChange={handleToggle}
                    disabled={isSaving}
                />
            </div>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gumawa ng iyong Security PIN</DialogTitle>
                    <DialogDescription>
                        Ang iyong 4-digit PIN ay gagamitin para ma-access ang iyong account.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="pin">Bagong PIN</Label>
                        <Input id="pin" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="confirm-pin">Kumpirmahin ang PIN</Label>
                        <Input id="confirm-pin" type="password" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Kanselahin</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        I-save ang PIN
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ProfilePage() {
    const user = useUser();
    const { firestore } = useFirestore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [selectedBgm, setSelectedBgm] = useState('linda-pecado');
    const { toast } = useToast();
    const [hasNewVoucher, setHasNewVoucher] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isBgmTrialModalOpen, setIsBgmTrialModalOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && sessionStorage.getItem('newVoucherPurchased') === 'true') {
            setHasNewVoucher(true);
        }
    }, [isClient]);

    useEffect(() => {
        const isChristmasSeason = new Date() < new Date('2026-01-10');
        const defaultBgm = isChristmasSeason ? 'christmas' : 'linda-pecado';
        const savedBgm = localStorage.getItem('selectedBgmId') || defaultBgm;
        setSelectedBgm(savedBgm);
        
        if (user && firestore) {
            const userDocRef = doc(firestore, "users", user.uid);
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfile;
                    setProfile(data);
                    setDisplayName(data.displayName);
                    setSelectedAvatar(data.photoURL || user.photoURL || '');
                    setNotificationsEnabled(data.notificationsEnabled !== false);
                    
                    if (!data.bgmThemeTrialExpiresAt && data.bgmThemeTrialClaimed !== true) {
                        setTimeout(() => setIsBgmTrialModalOpen(true), 2000);
                    }

                }
            }, (error) => {
                const permissionError = new FirestorePermissionError({ path: userDocRef.path, operation: 'get' });
                errorEmitter.emit('permission-error', permissionError);
            });
            return () => unsubscribe();
        }
    }, [user, firestore]);
    
    const handleBgmChange = (value: string) => {
        const selectedOption = bgmOptions.find(bgm => bgm.id === value);
        if (!selectedOption || !profile) return;

        const isBgmTrialActive = profile.bgmThemeTrialExpiresAt && profile.bgmThemeTrialExpiresAt.toDate() > new Date();
        const isPurchased = (profile.purchasedThemes || []).includes(selectedOption.id);

        if (selectedOption.isSpecial && !isBgmTrialActive && !isPurchased) {
             if ((selectedOption.id === 'christmas' || selectedOption.id === 'last-christmas') && new Date() < new Date('2026-01-10')) {
                // Allow Christmas BGM during the event
            } else {
                toast({
                    title: "Kailangan ng Trial o Pagbili",
                    description: "Kailangan mong i-activate ang trial o bilhin ang tema para magamit ang kantang ito.",
                    variant: "destructive"
                });
                return;
            }
        }

        setSelectedBgm(value);
        localStorage.setItem('selectedBgmId', value);
        window.dispatchEvent(new CustomEvent('bgm-change', { detail: { src: selectedOption.src, id: selectedOption.id }}));
        toast({ title: "Napalitan ang Musika!", description: "Magpe-play na ang iyong bagong background music." });
    };

    const handleClaimBgmTrial = async () => {
        if (!user || !firestore) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        const now = new Date();
        const expires = new Date(now.getTime() + 36 * 60 * 60 * 1000); // 36 hours

        try {
            await updateDoc(userDocRef, {
                bgmThemeTrialExpiresAt: expires,
                bgmThemeTrialClaimed: true // Mark as claimed so modal doesn't re-appear
            });
            toast({ title: 'Sinimulan na ang Trial!', description: 'Na-unlock mo na ang mga exclusive BGM themes sa loob ng 36 oras.' });
            setIsBgmTrialModalOpen(false);
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Hindi ma-activate ang trial', description: e.message });
        }
    };


    const handleSaveChanges = async () => {
        if (user && firestore && profile) {
            const hasProfileChanged = displayName !== profile.displayName || selectedAvatar !== (profile.photoURL || user.photoURL);
            const hasNotificationChanged = notificationsEnabled !== (profile.notificationsEnabled !== false);

            if (!hasProfileChanged && !hasNotificationChanged) {
                toast({ title: "Walang pagbabagong ise-save." });
                return;
            }
            
            const userDocRef = doc(firestore, "users", user.uid);
            const updatedData: Partial<UserProfile> = {};

            if(hasProfileChanged) {
                updatedData.displayName = displayName;
                updatedData.photoURL = selectedAvatar;
            }
            if(hasNotificationChanged) {
                updatedData.notificationsEnabled = notificationsEnabled;
            }

            try {
                // Update auth profile if needed
                if(hasProfileChanged){
                    await updateProfile(user, { displayName, photoURL: selectedAvatar });
                }

                // Then update firestore
                await setDoc(userDocRef, updatedData, { merge: true });
                
                toast({
                    title: "Nai-update ang profile!",
                    description: "Nai-save na ang iyong mga pagbabago.",
                });

            } catch(error: any) {
                 if (error instanceof FirestorePermissionError) {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                      path: userDocRef.path,
                      operation: 'update',
                      requestResourceData: updatedData,
                    }));
                 } else {
                    toast({
                        variant: "destructive",
                        title: "Error sa pag-update ng profile",
                        description: error.message
                    });
                 }
            }
        }
    };
    
    const handleSavePin = async (pin: string, enabled: boolean) => {
        if (!user || !firestore) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userDocRef, {
                pinCode: pin,
                pinEnabled: enabled
            });
            toast({ title: `PIN Code ${enabled ? 'Enabled' : 'Disabled'}`, description: `Matagumpay na ${enabled ? 'isinagawa' : 'in-off'} ang iyong PIN code.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'PIN Update Failed', description: error.message });
        }
    };

    if (!profile || !user) {
        return <div className="flex items-center justify-center h-screen">Nilo-load ang profile...</div>;
    }

    const isBgmTrialActive = profile.bgmThemeTrialExpiresAt && profile.bgmThemeTrialExpiresAt.toDate() > new Date();
    const canClaimTrial = !profile.bgmThemeTrialExpiresAt && !profile.bgmThemeTrialClaimed;

    return (
        <div className="container mx-auto px-2 sm:px-6 lg:px-8 py-8">
            <BgmTrialClaimModal 
                isOpen={isBgmTrialModalOpen} 
                onOpenChange={setIsBgmTrialModalOpen} 
                onConfirm={handleClaimBgmTrial} 
            />

            <div className="flex items-center mb-8">
                <Button variant="outline" size="icon" className="mr-4" asChild>
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Balik sa Dashboard</span>
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline text-primary">Aking Profile</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-8">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 border-4 border-primary">
                                <AvatarImage src={selectedAvatar} alt="User Avatar" />
                                <AvatarFallback>{profile.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-bold mt-4">{profile.displayName}</h2>
                            <p className="text-muted-foreground text-sm">{profile.email}</p>
                            <div className="mt-4 flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-lg font-semibold text-primary">
                                <Coins className="h-6 w-6 text-accent" />
                                <span>{profile.credits}</span>
                                <span className="font-normal text-muted-foreground ml-1">Credits</span>
                            </div>
                        </CardContent>
                    </Card>

                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Impormasyon ng Account</CardTitle>
                            <CardDescription>I-update ang iyong personal na detalye dito.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Pumili ng Iyong Avatar</Label>
                                <ScrollArea className="w-full">
                                  <div className="flex space-x-4 pb-4">
                                    {avatars.map(avatarUrl => (
                                        <button type="button" key={avatarUrl} onClick={() => setSelectedAvatar(avatarUrl)}>
                                            <Avatar className={cn("h-16 w-16 border-2 transition-all", selectedAvatar === avatarUrl ? 'border-primary scale-110' : 'border-transparent')}>
                                                <AvatarImage src={avatarUrl} />
                                                <AvatarFallback>{avatarUrl.slice(9,11)}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                    ))}
                                  </div>
                                  <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                             </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullName">Display Name</Label>
                                <Input id="fullName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={profile.email} disabled />
                            </div>
                             <div className="flex justify-end">
                                <Button onClick={handleSaveChanges} disabled={!firestore}>I-save ang mga Pagbabago</Button>
                            </div>
                            <Separator />
                             <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg flex items-center"><Music className="mr-2 h-5 w-5"/> Background Music</h3>
                                    {canClaimTrial && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-accent animate-pulse" onClick={() => setIsBgmTrialModalOpen(true)}>
                                            <Gift />
                                        </Button>
                                    )}
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                <Info />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>About Background Music</DialogTitle>
                                                <DialogDescription>
                                                    Pumili ng kanta para sa iyong portal experience.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 space-y-4 text-sm">
                                                <h4 className="font-semibold text-primary">New Feature! (from v1.9.8)</h4>
                                                <p className="text-muted-foreground">Maaari mo nang i-long press (pindutin nang matagal) ang music button sa kanang-ibaba ng screen para mabilis na buksan ang playlist at palitan ang kanta anumang oras!</p>
                                                <h4 className="font-semibold text-primary mt-4">Exclusive BGM Themes</h4>
                                                <p className="text-muted-foreground">Ang ilang kanta (minarkahan bilang "limited") ay naka-sync sa mga exclusive visual themes. I-claim ang iyong 36-hour free trial para ma-experience ang mga ito.</p>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                 <RadioGroup value={selectedBgm} onValueChange={handleBgmChange} className="rounded-md border p-4 space-y-2">
                                     {bgmOptions.map(option => {
                                         const isChristmasEvent = (option.id === 'christmas' || option.id === 'last-christmas') && new Date() < new Date('2026-01-10');
                                         const isPurchased = (profile.purchasedThemes || []).includes(option.id);
                                         const isDisabled = option.isSpecial && !isBgmTrialActive && !isPurchased && !isChristmasEvent;
                                         
                                         return (
                                             <div key={option.id} className={cn("flex items-center space-x-2", isDisabled && "opacity-50")}>
                                                <RadioGroupItem value={option.id} id={option.id} disabled={isDisabled} />
                                                <Label htmlFor={option.id} className={cn("font-normal", 
                                                    option.id === 'golden' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-pulse",
                                                    option.id === 'soda-pop' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500",
                                                    option.id === 'takedown' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400",
                                                    option.id === 'howitsdone' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-pink-400 to-blue-400 animate-pulse",
                                                    (option.id === 'christmas' || option.id === 'last-christmas') && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-500 to-red-500",
                                                    isDisabled && "cursor-not-allowed"
                                                )}>
                                                    {option.label}
                                                </Label>
                                             </div>
                                         );
                                    })}
                                </RadioGroup>
                            </div>
                             <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center"><Bell className="mr-2 h-5 w-5"/> Notifications</h3>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-md border p-4 gap-4">
                                    <div className="flex-grow">
                                        <p className="font-medium">In-App Notifications</p>
                                        <p className="text-sm text-muted-foreground">Makatanggap ng mga alerto para sa mga event, deal, at resulta ng laro.</p>
                                    </div>
                                    <Switch
                                        checked={notificationsEnabled}
                                        onCheckedChange={setNotificationsEnabled}
                                    />
                                </div>
                            </div>
                             <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center"><Shield className="mr-2 h-5 w-5"/> Seguridad</h3>
                                <PinCodeDialog onSave={handleSavePin} currentPinEnabled={!!profile.pinEnabled} />
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-md border p-4 gap-4">
                                    <div className="flex-grow">
                                        <p className="font-medium">Palitan ang Password</p>
                                        <p className="text-sm text-muted-foreground">I-update ang iyong password para mapanatiling secure ang iyong account.</p>
                                    </div>
                                    <Button variant="outline" className="w-full sm:w-auto">Palitan</Button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center"><Warehouse className="mr-2 h-5 w-5"/> Aking mga Voucher</h3>
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-md border p-4 gap-4">
                                    <div className="flex-grow">
                                        <p className="font-medium">Tingnan ang mga Biniling Voucher</p>
                                        <p className="text-sm text-muted-foreground">Tingnan ang lahat ng iyong mga nabili na voucher code.</p>
                                    </div>
                                    <Button variant="outline" asChild className="w-full sm:w-auto relative">
                                        <Link href="/dashboard/profile/vouchers">
                                            {isClient && hasNewVoucher && (
                                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                                </span>
                                            )}
                                            Tingnan ang Vouchers
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
