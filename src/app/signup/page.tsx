
'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, ShieldAlert, Loader2, CheckCircle, Fingerprint } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/logo";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

function SetPinModal({ onPinSet }: { onPinSet: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSavePin = async () => {
    if (pin.length !== 4) {
      toast({ title: "Invalid PIN", description: "PIN must be 4 digits.", variant: "destructive" });
      return;
    }
    if (pin !== confirmPin) {
      toast({ title: "PINs do not match", description: "Please make sure your PINs match.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    await onPinSet(pin);
    setIsSaving(false);
  };

  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center flex flex-col items-center gap-4"><Fingerprint className="h-10 w-10 text-primary"/> Gumawa ng iyong Security PIN</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Ang iyong 4-digit PIN ay gagamitin para ma-access ang iyong account sa bawat session. <br/> <strong className="text-destructive">HUWAG itong kalimutan!</strong>
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
          <Button onClick={handleSavePin} className="w-full" disabled={isSaving}>
             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            I-save at Magpatuloy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[4]);
  const [deviceHasSignedUp, setDeviceHasSignedUp] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [createdUsername, setCreatedUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (localStorage.getItem('deviceSignedUp') === 'true') {
      setDeviceHasSignedUp(true);
    }
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    if (value.includes('@') || value.includes(' ')) {
      setUsernameError("Bawal gumamit ng '@' o space sa username.");
    } else {
      setUsernameError('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usernameError) {
      toast({
        variant: "destructive",
        title: "Invalid na Username",
        description: usernameError,
      });
      return;
    }

    if (!auth || !firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Authentication service is not available. Please try again later.",
        });
        return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Hindi tugma ang mga password",
        description: "Pakisigurado na pareho ang iyong password.",
      });
      return;
    }
    
    setIsSigningUp(true);
    const finalUsername = username.trim();
    const email = `${finalUsername}@iciewifi.com`;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
  
        await updateProfile(user, {
            displayName: fullName,
            photoURL: selectedAvatar
        });

        const userDocRef = doc(firestore, "users", user.uid);
        
        const userProfileData = {
            displayName: fullName,
            email: user.email,
            credits: 0,
            welcomeBonusClaimed: false,
            investmentBonusClaimed: false,
            hasMadePurchase: false,
            photoURL: selectedAvatar,
            pinEnabled: false, // Start as false, will be enabled after PIN creation
            pinCode: '',
        };

        await setDoc(userDocRef, userProfileData).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'create',
              requestResourceData: userProfileData,
            });
            errorEmitter.emit('permission-error', permissionError);
            // Throw to prevent sign-up from completing on DB error
            throw new Error("Could not create user profile in database.");
        });

        localStorage.setItem('deviceSignedUp', 'true');
        setCreatedUserId(user.uid);
        setCreatedUsername(finalUsername);
        setShowPinModal(true); // Show PIN modal instead of success modal directly

    } catch (error: any) {
      setIsSigningUp(false);
      let description = error.message;
      if (error.code === 'auth/email-already-in-use') {
        description = `Ang username na "${finalUsername}" ay gamit na. Pumili ng iba.`;
      } else if (error.code === 'auth/invalid-email') {
        description = 'Hindi wasto ang username. Gumamit lamang ng mga letra at numero.'
      } else if (error.code === 'auth/weak-password') {
        description = 'Masyadong mahina ang password. Dapat ay may hindi bababa sa 6 na characters.'
      }
      toast({
        variant: "destructive",
        title: "Hindi makapag-sign up",
        description: description,
      });
    }
  };

  const handlePinSet = async (pin: string) => {
    if (!createdUserId || !firestore) return;
    const userDocRef = doc(firestore, 'users', createdUserId);
    try {
        await setDoc(userDocRef, { pinCode: pin, pinEnabled: true }, { merge: true });
        setShowPinModal(false);
        setShowSuccessModal(true);
    } catch(error: any) {
        toast({ title: "Error Setting PIN", description: "Could not save your PIN. Please try again.", variant: 'destructive'});
    }
  };

  const handleProceedToDashboard = () => {
      router.push('/dashboard');
  }

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-blue-600 p-4">
       <div className="absolute top-8">
        <Logo className="text-white" />
      </div>
        {showPinModal && <SetPinModal onPinSet={handlePinSet} />}
        <Dialog open={showSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              </div>
              <DialogTitle className="text-center text-2xl">Tagumpay!</DialogTitle>
              <DialogDescription className="text-center pt-2">
                Nagawa na ang iyong account at security PIN! Tandaan mo ang iyong username. Ito ang gagamitin mo para mag-log in.
                <br/>
                Ang iyong login username ay: <strong className="text-primary">{createdUsername}</strong>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleProceedToDashboard} className="w-full">
                  Magpatuloy sa Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Card className="w-full max-w-md shadow-2xl">
           <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Gumawa ng Account</CardTitle>
            <CardDescription>
              Sumali para makakuha ng rewards at maglaro.
            </CardDescription>
          </CardHeader>
            <CardContent>
              {deviceHasSignedUp ? (
                <div className="text-center p-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive-foreground">
                  <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
                  <h3 className="font-bold text-lg">Isang Account Bawat Device</h3>
                  <p className="text-sm">Mayroon nang account na ginawa sa device na ito. Hindi pinapayagan ang maraming pag-sign up para masigurado ang patas na paggamit ng aming welcome bonus.</p>
                  <Button asChild className="mt-4">
                    <Link href="/login">Pumunta sa Sign In</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <form className="space-y-4" onSubmit={handleSignUp}>
                    <div className="space-y-3">
                        <Label>Pumili ng Iyong Avatar</Label>
                        <ScrollArea className="w-full">
                          <div className="flex space-x-4 pb-4">
                            {avatars.map(avatarUrl => (
                                <button type="button" key={avatarUrl} onClick={() => setSelectedAvatar(avatarUrl)} disabled={isSigningUp}>
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
                      <Label htmlFor="full-name">Buong Pangalan</Label>
                      <Input id="full-name" placeholder="Juan Dela Cruz" required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isSigningUp} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                          id="username"
                          type="text"
                          placeholder="iyong-username"
                          required
                          value={username}
                          onChange={handleUsernameChange}
                          disabled={isSigningUp}
                          className={cn(usernameError && "border-destructive focus-visible:ring-destructive")}
                        />
                        {usernameError && <p className="text-sm text-destructive mt-1">{usernameError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSigningUp} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Kumpirmahin ang Password</Label>
                      <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSigningUp} />
                    </div>
                    <div className="items-top flex space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} disabled={isSigningUp} />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="terms"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Sumasang-ayon ako sa{" "}
                            <Link href="/terms" target="_blank" className="underline text-primary hover:text-primary/80">Mga Tuntunin ng Serbisyo</Link>
                          </label>
                        </div>
                      </div>
                    <Button type="submit" className="w-full" disabled={!auth || !firestore || !agreed || isSigningUp || !!usernameError}>
                      {isSigningUp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Gumagawa ng Account...</> : 'Sign Up'}
                    </Button>
                  </form>
                  <div className="mt-6 text-center text-sm">
                    Mayroon ka nang account?{" "}
                    <Link href="/login" className="underline font-semibold text-primary">
                      Mag-sign In
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
    </div>
  );
}
