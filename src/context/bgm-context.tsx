
'use client';

import React, { createContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface BgmContextType {
  isPlaying: boolean;
  togglePlayPause: () => void;
  changeTrack: (newSrc: string, newId: string) => void;
  currentBgmId: string;
}

export const BgmContext = createContext<BgmContextType | undefined>(undefined);

const bgmOptions = [
    { id: 'linda-pecado', src: '/music/bgm.mp3' },
    { id: 'zenzenzense', src: '/music/icie.mp3' },
    { id: 'christmas', src: '/music/christmas.mp3', isSpecial: true },
    { id: 'last-christmas', src: '/music/lastchristmas.mp3', isSpecial: true },
    { id: 'golden', src: '/music/golden.mp3', isSpecial: true },
    { id: 'takedown', src: '/music/takedown.mp3', isSpecial: true },
    { id: 'soda-pop', src: '/music/soda-pop.mp3', isSpecial: true },
    { id: 'howitsdone', src: '/music/howitsdone.mp3', isSpecial: true },
];

export const BgmProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBgmId, setCurrentBgmId] = useState('linda-pecado');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio element only on client-side
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
        const isChristmasSeason = new Date() < new Date('2026-01-10');
        const defaultBgm = isChristmasSeason ? bgmOptions.find(b => b.id === 'christmas')! : bgmOptions[0];
        const savedBgmId = localStorage.getItem('selectedBgmId') || defaultBgm.id;
        const savedBgmSrc = bgmOptions.find(b => b.id === savedBgmId)?.src || defaultBgm.src;

        audioRef.current = new Audio(savedBgmSrc);
        audioRef.current.loop = true;
        setCurrentBgmId(savedBgmId);
        
        // Dispatch event for components that still listen to it (e.g., theme provider)
        window.dispatchEvent(new CustomEvent('bgm-change', { detail: { src: savedBgmSrc, id: savedBgmId }}));
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => console.error("Audio play failed:", error));
      }
      setIsPlaying(!isPlaying);
      window.dispatchEvent(new CustomEvent('music-state-change', { detail: { isPlaying: !isPlaying } }));
    }
  }, [isPlaying]);

  const changeTrack = useCallback((newSrc: string, newId: string) => {
    if (audioRef.current) {
        const wasPlaying = isPlaying;
        audioRef.current.pause();
        audioRef.current.src = newSrc;
        setCurrentBgmId(newId);
        localStorage.setItem('selectedBgmId', newId);
        if (wasPlaying) {
            audioRef.current.play().catch(error => console.error("Audio play failed on track change:", error));
        }
        window.dispatchEvent(new CustomEvent('bgm-change', { detail: { src: newSrc, id: newId }}));
    }
  }, [isPlaying]);

  // Handle external change events from the old system
  useEffect(() => {
    const handleExternalBgmChange = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { src, id } = customEvent.detail;
        if (src && id) {
            changeTrack(src, id);
        }
    };
    window.addEventListener('bgm-change', handleExternalBgmChange);
    return () => {
        window.removeEventListener('bgm-change', handleExternalBgmChange);
    };
  }, [changeTrack]);

  const value = {
    isPlaying,
    togglePlayPause,
    changeTrack,
    currentBgmId,
  };

  return <BgmContext.Provider value={value}>{children}</BgmContext.Provider>;
};
