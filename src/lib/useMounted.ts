'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Idiomatic React 19 / Next.js client-mount hook using useSyncExternalStore.
 * Returns `false` on server and during initial hydration, then `true` on client.
 * Triggers zero cascading renders and avoids ESLint set-state-in-effect issues.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

