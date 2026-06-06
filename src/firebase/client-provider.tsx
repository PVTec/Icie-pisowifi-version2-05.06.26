'use client';

import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // The provider will handle initialization internally.
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
