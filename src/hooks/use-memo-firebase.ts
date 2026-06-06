"use client"
import { useMemo } from "react"
import type { Query, DocumentReference } from "firebase/firestore"

// This is a helper hook to memoize Firebase queries and document references.
// This is important to prevent infinite loops when using hooks like useCollection or useDoc.
export const useMemoFirebase = <T extends Query | DocumentReference | null>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps)
}
