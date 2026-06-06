'use client';
import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';

type PermissionState = 'prompt' | 'granted' | 'denied';

type UserProfile = {
  universalAccessExpiresAt?: Timestamp;
};

// This hook requires the experimental `local-network-access` permission in some browsers.
// Chrome: chrome://flags/#enable-private-network-access-respect-preflight-results
export function useWifiCheck(gatewayUrl = 'http://10.0.0.1/') {
  const [isOnWifi, setIsOnWifi] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [hasUniversalAccess, setHasUniversalAccess] = useState(false);
  const user = useUser();
  const { firestore } = useFirestore();

  useEffect(() => {
    // No user, no universal access.
    if (!user || !firestore) {
      setHasUniversalAccess(false);
      return;
    }
    const userDocRef = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const hasAccess = data.universalAccessExpiresAt ? data.universalAccessExpiresAt.toDate() > new Date() : false;
            setHasUniversalAccess(hasAccess);
        } else {
            setHasUniversalAccess(false);
        }
    });
    return () => unsubscribe();
  }, [user, firestore]);

  const checkConnection = useCallback(async () => {
    // If the user has a universal access pass, they are always considered "on the wifi".
    if (hasUniversalAccess) {
        setIsOnWifi(true);
        setIsChecking(false);
        setPermissionState('granted');
        return;
    }

    setIsChecking(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      // The fetch itself acts as the permission check for Local Network Access.
      // If it succeeds (even with no-cors), the user has granted access and is on the local network.
      // If it fails with a TypeError, it's likely a permission denial by the browser.
      await fetch(gatewayUrl, { mode: 'no-cors', signal: controller.signal });
      setIsOnWifi(true);
      setPermissionState('granted');
    } catch (e: any) {
      setIsOnWifi(false);
      if (e instanceof TypeError) {
        setPermissionState('denied');
      } else {
        // Other errors (like timeouts) are treated as just not being on the network.
        setPermissionState('prompt');
      }
    } finally {
      setIsChecking(false);
      clearTimeout(timeoutId);
    }
  }, [gatewayUrl, hasUniversalAccess]);

  useEffect(() => {
    checkConnection();
    // Periodically re-check connection status 
    const intervalId = setInterval(checkConnection, 5000);
    return () => clearInterval(intervalId);
  }, [checkConnection]);

  return { isOnWifi, isChecking, permissionState };
}
