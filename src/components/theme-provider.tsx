
"use client"

import * as React from "react"
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';

type UserProfile = {
    activeTheme?: string;
    bubbleEffectActive?: boolean;
};

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  attribute = "class",
  ...props
}: ThemeProviderProps) {
  const user = useUser();
  const { firestore } = useFirestore();

  React.useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (themeName: string | undefined, bubbleEffectActive: boolean | undefined) => {
        // Remove all possible theme classes to start fresh
        root.classList.remove('dark', 'theme-bubbles-light', 'theme-golden', 'theme-takedown', 'theme-howitsdone', 'theme-christmas');
        root.classList.remove('bubble-effect-active');

        if (themeName === 'dark') {
            root.classList.add('dark');
        } else if (themeName && themeName !== 'light') {
            root.classList.add(`theme-${themeName}`);
        }
        // If theme is 'light' or undefined, no class is needed (it's the default)

        // Special handling for bubble effect
        if (themeName === 'bubbles-light' || bubbleEffectActive) {
             root.classList.add('bubble-effect-active');
        }
    };
    
    if (user && firestore) {
      const unsub = onSnapshot(doc(firestore, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          const isChristmasSeason = new Date() < new Date('2026-01-10');
          let themeToApply = data.activeTheme;

          if (!themeToApply) {
              themeToApply = isChristmasSeason ? 'christmas' : 'light';
          }
          applyTheme(themeToApply, data.bubbleEffectActive);
        }
      });
      return () => unsub();
    } else {
        // Handle logged-out state
        const isChristmasSeason = new Date() < new Date('2026-01-10');
        const defaultTheme = isChristmasSeason ? 'christmas' : 'light';
        applyTheme(defaultTheme, false);
    }

  }, [user, firestore]);

  return <>{children}</>
}
