import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SplitSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface TimerState {
  taskId: string | null;
  taskTitle: string;
  targetDurationMinutes: number;
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isZenMode: boolean;
  startedAtTimestamp: number | null; // Epoch ms of the current running segment
  accumulatedSeconds: number;        // Total seconds from completed segments
  splitSessions: SplitSession[];
  isLiveTracked: boolean;
}

const STORAGE_KEY = 'lifemetric_active_timer_state_v1';

export const initialTimerState: TimerState = {
  taskId: null,
  taskTitle: '',
  targetDurationMinutes: 25,
  elapsedSeconds: 0,
  isRunning: false,
  isPaused: false,
  isZenMode: false,
  startedAtTimestamp: null,
  accumulatedSeconds: 0,
  splitSessions: [],
  isLiveTracked: true,
};

// Storage helper functions (safe for SSR)
export const saveTimerStateToStorage = (state: TimerState): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist timer state:', error);
  }
};

export const clearTimerStateFromStorage = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear timer state:', error);
  }
};

export const loadTimerStateFromStorage = (): TimerState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerState;

    // Recalculate true elapsed seconds if it was running across page reload
    if (parsed.isRunning && parsed.startedAtTimestamp) {
      const now = Date.now();
      const currentSegment = Math.max(0, Math.floor((now - parsed.startedAtTimestamp) / 1000));
      parsed.elapsedSeconds = parsed.accumulatedSeconds + currentSegment;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load timer state from storage:', error);
    return null;
  }
};

export const timerSlice = createSlice({
  name: 'timer',
  initialState: initialTimerState,
  reducers: {
    startTimer: (
      state,
      action: PayloadAction<{
        taskId: string;
        taskTitle: string;
        targetDurationMinutes: number;
        openZenMode?: boolean;
      }>
    ) => {
      const now = Date.now();
      state.taskId = action.payload.taskId;
      state.taskTitle = action.payload.taskTitle;
      state.targetDurationMinutes = action.payload.targetDurationMinutes;
      state.elapsedSeconds = 0;
      state.accumulatedSeconds = 0;
      state.startedAtTimestamp = now;
      state.isRunning = true;
      state.isPaused = false;
      state.isLiveTracked = true;
      state.splitSessions = [
        {
          id: 'session-' + now,
          startedAt: new Date(now).toISOString(),
          durationSeconds: 0,
        },
      ];
      if (action.payload.openZenMode !== undefined) {
        state.isZenMode = action.payload.openZenMode;
      }
      saveTimerStateToStorage(state);
    },

    resumeTimer: (state) => {
      if (!state.taskId || state.isRunning) return;

      const now = Date.now();
      state.isRunning = true;
      state.isPaused = false;
      state.startedAtTimestamp = now;

      // Start a new split session
      state.splitSessions.push({
        id: 'session-' + now,
        startedAt: new Date(now).toISOString(),
        durationSeconds: 0,
      });

      saveTimerStateToStorage(state);
    },

    pauseTimer: (state) => {
      if (!state.isRunning || !state.startedAtTimestamp) return;

      const now = Date.now();
      const currentSegment = Math.max(0, Math.floor((now - state.startedAtTimestamp) / 1000));
      state.accumulatedSeconds += currentSegment;
      state.elapsedSeconds = state.accumulatedSeconds;
      state.isRunning = false;
      state.isPaused = true;
      state.startedAtTimestamp = null;

      // Close current split session
      if (state.splitSessions.length > 0) {
        const lastIndex = state.splitSessions.length - 1;
        state.splitSessions[lastIndex].endedAt = new Date(now).toISOString();
        state.splitSessions[lastIndex].durationSeconds += currentSegment;
      }

      saveTimerStateToStorage(state);
    },

    tick: (state) => {
      if (!state.isRunning || !state.startedAtTimestamp) return;

      const now = Date.now();
      const currentSegment = Math.max(0, Math.floor((now - state.startedAtTimestamp) / 1000));
      state.elapsedSeconds = state.accumulatedSeconds + currentSegment;

      if (state.splitSessions.length > 0) {
        const lastIndex = state.splitSessions.length - 1;
        state.splitSessions[lastIndex].durationSeconds = currentSegment;
      }

      saveTimerStateToStorage(state);
    },

    stopTimer: (state) => {
      if (state.isRunning && state.startedAtTimestamp) {
        const now = Date.now();
        const currentSegment = Math.max(0, Math.floor((now - state.startedAtTimestamp) / 1000));
        state.accumulatedSeconds += currentSegment;
        state.elapsedSeconds = state.accumulatedSeconds;

        if (state.splitSessions.length > 0) {
          const lastIndex = state.splitSessions.length - 1;
          state.splitSessions[lastIndex].endedAt = new Date(now).toISOString();
          state.splitSessions[lastIndex].durationSeconds += currentSegment;
        }
      }

      state.isRunning = false;
      state.isPaused = false;
      state.startedAtTimestamp = null;
      clearTimerStateFromStorage();
    },

    toggleZenMode: (state, action: PayloadAction<boolean | undefined>) => {
      state.isZenMode = action.payload !== undefined ? action.payload : !state.isZenMode;
      saveTimerStateToStorage(state);
    },

    hydrateTimer: (state, action: PayloadAction<TimerState>) => {
      return {
        ...state,
        ...action.payload,
      };
    },

    resetTimer: () => {
      clearTimerStateFromStorage();
      return initialTimerState;
    },
  },
});

export const {
  startTimer,
  resumeTimer,
  pauseTimer,
  tick,
  stopTimer,
  toggleZenMode,
  hydrateTimer,
  resetTimer,
} = timerSlice.actions;

export default timerSlice.reducer;

