
'use client';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useMemo,
} from 'react';
import { type FirebaseApp } from 'firebase/app';
import { type Auth, onAuthStateChanged, type User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { type Firestore, collection, onSnapshot, query as firestoreQuery, where, doc, DocumentReference } from 'firebase/firestore';
import { initializeFirebase } from './index';
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';

// --- Custom Hooks for Firestore data ---

/**
 * A hook to fetch a collection of documents from Firestore and listen for real-time updates.
 * @param query - The Firestore query to execute.
 * @returns An object containing the data, loading state, and any error.
 */
export function useCollection<T>(q: ReturnType<typeof firestoreQuery> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const documents = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];
          setData(documents);
        } catch (e: any) {
          setError(e);
          console.error("Error processing snapshot: ", e);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
            path: (q as any)._query.path.segments.join('/'),
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [q]);

  return { data, loading, error };
}

export function useDoc<T>(ref: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (doc) => {
        try {
          if (doc.exists()) {
            setData({ id: doc.id, ...doc.data() } as T);
          } else {
            setData(null);
          }
        } catch (e: any) {
          setError(e);
          console.error("Error processing doc snapshot: ", e);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}


export type FirebaseContextValue = {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  user: User | null | undefined;
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

export type FirebaseProviderProps = {
  children: ReactNode;
};

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [services, setServices] = useState<FirebaseContextValue>({
    app: null,
    auth: null,
    firestore: null,
    user: undefined
  });

  useEffect(() => {
    // Firebase should only be initialized on the client.
    const { app, auth, firestore } = initializeFirebase();
    
    setPersistence(auth, browserLocalPersistence).then(() => {
      setServices({ app, auth, firestore, user: auth.currentUser });

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
      });

      return () => unsubscribe();
    }).catch((error) => {
      console.error("Firebase persistence error:", error);
    });

  }, []); // Run only once on mount

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => {
    return { ...services, user };
  }, [services, user]);


  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  const { app } = useFirebase();
  return { app };
}

export function useAuth() {
  const { auth, user } = useFirebase();
  return { auth, user };
}

export function useFirestore() {
    const { firestore } = useFirebase();
    return { firestore };
}

export function useUser() {
  const { user } = useFirebase();
  return user;
}
