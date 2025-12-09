import { useEffect, useState, useCallback } from 'react';
import { realtimeSyncManager } from '@/utils/realtimeSync';
import { User } from 'firebase/auth';

export const useFirebaseSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [syncEnabled, setSyncEnabledState] = useState(realtimeSyncManager.isSyncEnabled());
  const [autoSyncEnabled, setAutoSyncState] = useState(realtimeSyncManager.isAutoSyncEnabled());
  const [lastSync, setLastSync] = useState<Date | null>(realtimeSyncManager.getLastSyncTime());
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(realtimeSyncManager.isAuthenticated());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeSyncManager.onAuthChange((user) => {
      setUser(user);
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeSyncManager.onDataChange(() => {
      setLastSync(realtimeSyncManager.getLastSyncTime());
    });

    return () => unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsSyncing(true);
    setHasError(false);

    const result = await realtimeSyncManager.signUp(email, password);
    
    if (result.success) {
      realtimeSyncManager.setSyncEnabled(true);
      setSyncEnabledState(true);
      setIsAuthenticated(true);
    } else {
      setHasError(true);
    }

    setIsSyncing(false);
    return result;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsSyncing(true);
    setHasError(false);

    const result = await realtimeSyncManager.signIn(email, password);
    
    if (result.success) {
      realtimeSyncManager.setSyncEnabled(true);
      setSyncEnabledState(true);
      setIsAuthenticated(true);
      await realtimeSyncManager.pullAllData();
    } else {
      setHasError(true);
    }

    setIsSyncing(false);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await realtimeSyncManager.signOut();
    setSyncEnabledState(false);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const enableSync = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsSyncing(true);
    setHasError(false);

    realtimeSyncManager.setSyncEnabled(true);
    setSyncEnabledState(true);
    await realtimeSyncManager.syncAllData();

    setIsSyncing(false);
  }, [isAuthenticated]);

  const disableSync = useCallback(() => {
    realtimeSyncManager.setSyncEnabled(false);
    setSyncEnabledState(false);
  }, []);

  const setAutoSync = useCallback((enabled: boolean) => {
    realtimeSyncManager.setAutoSyncEnabled(enabled);
    setAutoSyncState(enabled);
  }, []);

  const manualSync = useCallback(async () => {
    if (!syncEnabled || !isAuthenticated) return;
    
    setIsSyncing(true);
    setHasError(false);

    const result = await realtimeSyncManager.syncAllData();
    
    if (!result.success) {
      setHasError(true);
    } else {
      setLastSync(realtimeSyncManager.getLastSyncTime());
    }

    setIsSyncing(false);
  }, [syncEnabled, isAuthenticated]);

  const pullData = useCallback(async () => {
    if (!syncEnabled || !isAuthenticated) return;
    
    setIsSyncing(true);
    setHasError(false);

    const result = await realtimeSyncManager.pullAllData();
    
    if (!result.success) {
      setHasError(true);
    } else {
      setLastSync(realtimeSyncManager.getLastSyncTime());
    }

    setIsSyncing(false);
  }, [syncEnabled, isAuthenticated]);

  const triggerAutoSync = useCallback(() => {
    realtimeSyncManager.triggerAutoSync();
  }, []);

  return {
    isOnline,
    isSyncing,
    hasError,
    syncEnabled,
    autoSyncEnabled,
    lastSync,
    user,
    isAuthenticated,
    userEmail: realtimeSyncManager.getUserEmail(),
    signUp,
    signIn,
    signOut,
    enableSync,
    disableSync,
    setAutoSync,
    manualSync,
    pullData,
    triggerAutoSync,
  };
};
