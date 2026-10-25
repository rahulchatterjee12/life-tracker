'use client';

import { Provider } from 'react-redux';
import { makeStore } from '@/lib/store';
import TimerPersistenceProvider from '@/components/providers/TimerPersistenceProvider';
import ThemeProvider from '@/components/providers/ThemeProvider';

const store = makeStore();

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <TimerPersistenceProvider>{children}</TimerPersistenceProvider>
      </ThemeProvider>
    </Provider>
  );
}
