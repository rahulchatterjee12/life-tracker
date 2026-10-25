import { configureStore } from '@reduxjs/toolkit';
import timerReducer from './features/timer/timerSlice';
import tasksReducer from './features/tasks/tasksSlice';
import vaultReducer from './features/vault/vaultSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      timer: timerReducer,
      tasks: tasksReducer,
      vault: vaultReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Allows Mongoose IDs/Dates in mock state without warning
      }),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
