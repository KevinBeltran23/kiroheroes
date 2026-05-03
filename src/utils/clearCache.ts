import { createMMKV } from 'react-native-mmkv';
import { queryClient } from '../services/store/queryClient';

/**
 * Nuke every local cache so the app fetches fresh data from Firebase.
 *
 * Three MMKV stores exist:
 *  1. react-query-cache   – persisted React Query results (24 h GC)
 *  2. user-profile-cache  – cached user profile from AuthContext
 *  3. theme-preferences-cache – dark mode / color-blind / high-contrast
 *
 * This also resets the in-memory React Query cache.
 */
export function clearAllCaches() {
  // In-memory React Query state
  queryClient.clear();

  // Persisted React Query cache
  const rqStorage = createMMKV({ id: 'react-query-cache' });
  rqStorage.clearAll();

  // User profile cache
  const userStorage = createMMKV({ id: 'user-profile-cache' });
  userStorage.clearAll();

  // Theme preferences cache
  const themeStorage = createMMKV({ id: 'theme-preferences-cache' });
  themeStorage.clearAll();
}
