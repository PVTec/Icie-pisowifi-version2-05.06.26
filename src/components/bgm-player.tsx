
'use client';

import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { Button } from './ui/button';
import { Play, Pause, Music, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { BgmContext } from '@/context/bgm-context';

interface BgmPlayerProps {
}

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
    purchasedThemes?: string[];
    bgmThemeTrialExpiresAt?: Timestamp;
};

export function BgmPlayer(props: BgmPlayerProps) {
  const bgmContext = useContext(BgmContext);
  const [isMounted, setIsMounted] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const user = useUser();
  const { firestore } = useFirestore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
            }
        });
        return () => unsubscribe();
    }
  }, [user, firestore]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => {
        setIsPlaylistOpen(true);
    }, 700); // 700ms for long press
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };
  
  const handlePlaylistSelect = (bgmId: string) => {
    if (!bgmContext) return;
    const selectedOption = bgmOptions.find(opt => opt.id === bgmId);
    if (selectedOption) {
        if (selectedOption.id === 'christmas' || selectedOption.id === 'last-christmas') {
            const isChristmasSeason = new Date() < new Date('2026-01-10');
            if (!isChristmasSeason) {
                return; // Can't select if event is over
            }
        } else if (userProfile) { // Check userProfile for other special themes
            const isBgmTrialActive = userProfile.bgmThemeTrialExpiresAt && userProfile.bgmThemeTrialExpiresAt.toDate() > new Date();
            const isPurchased = (userProfile.purchasedThemes || []).includes(bgmId);
            
            if (selectedOption.isSpecial && !isBgmTrialActive && !isPurchased) {
                console.log("Trial required for this BGM.");
                return;
            }
        } else if (selectedOption.isSpecial && !userProfile) {
            // Logged out user trying to select special theme (other than Christmas)
            return;
        }

        bgmContext.changeTrack(selectedOption.src, selectedOption.id);
        setIsPlaylistOpen(false);
    }
  };
  
  if (!isMounted || !bgmContext) {
      return null;
  }

  const { isPlaying, togglePlayPause, currentBgmId } = bgmContext;

  return (
    <>
        <Dialog open={isPlaylistOpen} onOpenChange={setIsPlaylistOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Playlist ng Background Music</DialogTitle>
                    <DialogDescription>Pumili ng kanta na magpe-play sa buong portal.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    {bgmOptions.map((option) => {
                        const isChristmasEvent = (option.id === 'christmas' || option.id === 'last-christmas') && new Date() < new Date('2026-01-10');
                        let isDisabled = false;
                        if (option.isSpecial && !isChristmasEvent) {
                            if (!userProfile) {
                                isDisabled = true; // Logged out users can't play special BGM
                            } else {
                                const isBgmTrialActive = userProfile.bgmThemeTrialExpiresAt && userProfile.bgmThemeTrialExpiresAt.toDate() > new Date();
                                const isPurchased = (userProfile.purchasedThemes || []).includes(option.id);
                                isDisabled = !isBgmTrialActive && !isPurchased;
                            }
                        }
                        
                        return (
                            <button
                                key={option.id}
                                onClick={() => handlePlaylistSelect(option.id)}
                                disabled={isDisabled}
                                className={cn(
                                    "w-full text-left p-3 rounded-md transition-colors flex items-center justify-between",
                                    currentBgmId === option.id 
                                        ? "bg-primary text-primary-foreground" 
                                        : "hover:bg-secondary",
                                    isDisabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <span className={cn(
                                    option.id === 'golden' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400",
                                    option.id === 'soda-pop' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500",
                                    option.id === 'takedown' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400",
                                    option.id === 'howitsdone' && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-pink-400 to-blue-400",
                                    (option.id === 'christmas' || option.id === 'last-christmas') && "font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-green-500 to-red-500",
                                )}>{option.label}</span>
                                {currentBgmId === option.id && <Music className="h-5 w-5"/>}
                            </button>
                        );
                    })}
                </div>
                 <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogClose>
            </DialogContent>
        </Dialog>
        <Button 
            id="bgm-player-button"
            onClick={togglePlayPause} 
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp} // Also clear timer if pointer leaves
            size="icon" 
            variant="secondary"
            className='rounded-full h-12 w-12 shadow-lg touch-none' // touch-none to prevent scrolling on mobile while holding
        >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
    </>
  );
}
