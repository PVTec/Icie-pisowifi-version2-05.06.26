
'use client';

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Gift, Smartphone, Ticket, Users, Wifi, Heart, Router, Music, Gamepad2, Zap, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { BgmPlayer } from "@/components/bgm-player";
import React, { useState, useEffect, useContext } from "react";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { BgmContext } from "@/context/bgm-context";

const features = [
    {
        icon: Zap,
        title: "Mabilis na Koneksyon",
        description: "Mag-stream, maglaro, at magtrabaho nang walang abala sa aming maaasahan at high-speed na network."
    },
    {
        icon: Gift,
        title: "Kumita Habang Nagsu-surf",
        description: "Ang aming unique na Play & Earn system ay nagbibigay sa iyo ng credits sa paggamit ng internet."
    },
    {
        icon: Users,
        title: "Komunidad at Events",
        description: "Sumali sa mga exclusive events, tournaments, at kumonekta sa iyong mga kapitbahay."
    }
];

function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" asChild>
        <Link href="/login">Mag-sign In</Link>
      </Button>
      <Button asChild>
        <Link href="/signup">Gumawa ng Account</Link>
      </Button>
    </div>
  );
}

function PamaskoModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const bgmContext = useContext(BgmContext);
    
    const handleClose = () => {
        if (bgmContext && !bgmContext.isPlaying) {
            bgmContext.togglePlayPause();
        }
        onOpenChange(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleClose();
            } else {
                onOpenChange(true);
            }
        }}>
            <DialogContent>
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center">Welcome sa Icie Pisowifi Portal!</DialogTitle>
                    <DialogDescription className="text-center">
                        Gaya ng pangako namin sa inyo, meron kayong pamasko galing sa Icie PisoWifi!
                    </DialogDescription>
                </DialogHeader>
                <div className="text-center py-4">
                    <p>Gumawa ng account para ma-claim mo ang iyong Pamasko ng Icie Pisowifi!</p>
                </div>
                <DialogFooter>
                    <Button asChild className="w-full" onClick={handleClose}>
                        <Link href="/signup">Gumawa ng Account</Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function Home() {
    const user = useUser();
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [showPamaskoModal, setShowPamaskoModal] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Welcome screen logic
        if (localStorage.getItem('hasSeenWelcomeScreen') !== 'true') {
            router.replace('/welcome');
            return; // Important: stop execution to prevent other checks
        }

        // Existing logic for pamasko modal
        if (localStorage.getItem('hasSeenPamaskoModal') !== 'true') {
            setShowPamaskoModal(true);
            localStorage.setItem('hasSeenPamaskoModal', 'true');
        }
    }, [router]);

    useEffect(() => {
        if (user !== undefined) {
            if (user) {
                router.replace('/dashboard');
            } else {
                setIsCheckingAuth(false);
            }
        }
    }, [user, router]);
    
    // Show a loader while we check auth status or if we are redirecting
    if (isCheckingAuth || (isClient && localStorage.getItem('hasSeenWelcomeScreen') !== 'true')) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }


    return (
        <div className="flex-1 w-full bg-background text-foreground">
            {isClient && <PamaskoModal isOpen={showPamaskoModal} onOpenChange={setShowPamaskoModal} />}
            <div className="relative">
                <header className="fixed top-0 left-0 right-0 z-20 bg-transparent">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Logo className="text-white drop-shadow-md" />
                        <nav className="hidden md:flex gap-6 items-center">
                            <Link href="#features" className="text-sm font-medium text-white/80 hover:text-white drop-shadow">Features</Link>
                            <Link href="#deals" className="text-sm font-medium text-white/80 hover:text-white drop-shadow">Deals</Link>
                        </nav>
                        <div className="hidden md:flex">
                           <div className="flex items-center gap-2">
                              <Button variant="ghost" asChild className="text-white hover:bg-white/20 hover:text-white">
                                <Link href="/login">Mag-sign In</Link>
                              </Button>
                              <Button asChild className="bg-white text-primary hover:bg-white/90 shadow-lg">
                                <Link href="/signup">Gumawa ng Account</Link>
                              </Button>
                            </div>
                        </div>
                        <div className="md:hidden">
                             <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" className="bg-transparent text-white border-white/50 hover:bg-white/10 hover:text-white">
                                        <Menu className="h-6 w-6" />
                                        <span className="sr-only">Buksan ang menu</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="bg-background text-foreground">
                                    <SheetHeader>
                                        <SheetTitle><Logo /></SheetTitle>
                                    </SheetHeader>
                                    <div className="flex flex-col h-full">
                                        <div className="flex-1 space-y-6 pt-6">
                                            <nav className="flex flex-col gap-4">
                                            <Link href="#features" className="text-lg font-medium text-muted-foreground hover:text-primary">Features</Link>
                                            <Link href="#deals" className="text-lg font-medium text-muted-foreground hover:text-primary">Deals</Link>
                                            <a href="http://10.0.0.1/" target="_blank" rel="noopener noreferrer" className="flex items-center text-lg font-medium text-muted-foreground hover:text-primary">
                                                <Router className="mr-2 h-5 w-5" /> Piso Wifi Portal
                                            </a>
                                            <a href="https://supportvince.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center text-lg font-medium text-muted-foreground hover:text-primary">
                                                <Heart className="mr-2 h-5 w-5" /> Suportahan si Vince
                                            </a>
                                            <PwaInstallButton isInsideSheet={true} />
                                            </nav>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button variant="outline" asChild>
                                            <Link href="/login">Mag-sign In</Link>
                                            </Button>
                                            <Button asChild>
                                            <Link href="/signup">Gumawa ng Account</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </header>

                <main>
                    <section className="relative py-24 md:py-40 bg-gradient-to-br from-blue-300 via-pink-300 to-purple-300 overflow-hidden">
                        <div className="absolute inset-0 bg-primary/10"></div>
                         <div className="container mx-auto px-4 text-center relative z-10">
                            <div className="mx-auto bg-white/80 backdrop-blur-md rounded-full shadow-2xl h-40 w-40 flex items-center justify-center p-2">
                                <Image
                                  src="/avatars/icielogo.png"
                                  alt="Icie Wifi Character"
                                  width={150}
                                  height={150}
                                  className="object-cover rounded-full"
                                />
                             </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold text-primary-foreground tracking-tighter leading-tight mt-8 drop-shadow-lg">
                                Your WiFi, Your World.
                            </h1>
                            <p className="text-lg md:text-xl max-w-2xl mx-auto text-primary-foreground/90 mt-6 drop-shadow">
                                Higit pa sa internet. Maglaro, kumita, at kumonekta sa isang portal na idinisenyo para sa iyo.
                            </p>
                            <div className="mt-10">
                                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl transition-transform hover:scale-105 w-full sm:w-auto h-12 px-8 text-base font-bold">
                                    <Link href="/signup">
                                        Sumali sa Kasiyahan
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    <section id="features" className="py-20 md:py-28 bg-background">
                        <div className="container mx-auto px-4">
                             <div className="text-center mb-16">
                                <h2 className="text-3xl md:text-5xl font-headline font-bold mb-4 text-primary">Ang Ultimate WiFi Experience</h2>
                                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Lahat ng kailangan mo, sa isang lugar lang.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                               {features.map((feature) => (
                                    <div key={feature.title} className="text-center p-6 bg-card/50 rounded-xl shadow-sm border">
                                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mx-auto mb-5 border-2 border-primary/20">
                                            <feature.icon className="h-8 w-8"/>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                                        <p className="text-muted-foreground">{feature.description}</p>
                                    </div>
                               ))}
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="bg-secondary/30 border-t">
                    <div className="container mx-auto px-4 py-12">
                        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                            <div className="mb-6 md:mb-0">
                                <Logo />
                                <p className="text-sm text-muted-foreground mt-2">Ang kinabukasan ng koneksyon sa inyong lugar.</p>
                            </div>
                            <div className="flex flex-col items-center md:items-end">
                                <div className="flex space-x-4">
                                    <a href="http://10.0.0.1/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">Piso Wifi Portal</a>
                                    <a href="https://supportvince.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">Suportahan si Vince</a>
                                </div>
                                <div className="flex space-x-4 mt-2">
                                    <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
                                    <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
                                </div>
                                <p className="text-sm text-muted-foreground mt-4">&copy; {new Date().getFullYear()} Icie Wifi Portal. Lahat ng karapatan ay nakalaan.</p>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
            {isClient && (
                <div className="fixed bottom-4 right-4 z-40">
                    <BgmPlayer />
                </div>
            )}
        </div>
    );
}

    