'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  hydrateTimer,
  loadTimerStateFromStorage,
  saveTimerStateToStorage,
  tick,
} from '@/lib/features/timer/timerSlice';

export default function TimerPersistenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const timer = useAppSelector((state) => state.timer);
  const timerRef = useRef(timer);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // 1. Initial hydration on client mount
  useEffect(() => {
    const saved = loadTimerStateFromStorage();
    if (saved && (saved.taskId || saved.elapsedSeconds > 0 || saved.isRunning)) {
      dispatch(hydrateTimer(saved));
    }
  }, [dispatch]);

  // 2. Continuous 1-second interval tick when timer is actively running
  useEffect(() => {
    if (!timer.isRunning) return;

    const intervalId = window.setInterval(() => {
      dispatch(tick());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timer.isRunning, dispatch]);

  // 3. Persist before tab reload / unload or tab background
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timerRef.current.taskId) {
        saveTimerStateToStorage(timerRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
}

