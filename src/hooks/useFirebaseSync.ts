import { useEffect, useState, useCallback } from 'react';
import { firebaseSyncManager } from '@/utils/firebaseSync';
import { User } from 'firebase/auth';

export const useFirebaseSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [syncEnabled, setSyncEnabledState] = useState(firebaseSyncManager.isSyncEnabled());
  const [autoSyncEnabled, setAutoSyncState] = useState(firebaseSyncManager.isAutoSyncEnabled());
  const [lastSync, setLastSync] = useState<Date | null>(firebaseSyncManager.getLastSyncTime());
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(firebaseSyncManager.isAuthenticated());

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
    const unsubscribe = firebaseSyncManager.onAuthChange((user) => {
      setUser(user);
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseSyncManager.onDataChange(() => {
      setLastSync(firebaseSyncManager.getLastSyncTime());
    });

    return () => unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsSyncing(true);
    setHasError(false);

    const result = await firebaseSyncManager.signUp(email, password);
    
    if (result.success) {
      firebaseSyncManager.setSyncEnabled(true);
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

    const result = await firebaseSyncManager.signIn(email, password);
    
    if (result.success) {
      firebaseSyncManager.setSyncEnabled(true);
      setSyncEnabledState(true);
      setIsAuthenticated(true);
      await firebaseSyncManager.pullAllData();
    } else {
      setHasError(true);
    }

    setIsSyncing(false);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSyncManager.signOut();
    setSyncEnabledState(false);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const enableSync = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsSyncing(true);
    setHasError(false);

    firebaseSyncManager.setSyncEnabled(true);
    setSyncEnabledState(true);
    await firebaseSyncManager.syncAllData();

    setIsSyncing(false);
  }, [isAuthenticated]);

  const disableSync = useCallback(() => {
    firebaseSyncManager.setSyncEnabled(false);
    setSyncEnabledState(false);
  }, []);

  const setAutoSync = useCallback((enabled: boolean) => {
    firebaseSyncManager.setAutoSyncEnabled(enabled);
    setAutoSyncState(enabled);
  }, []);

  const manualSync = useCallback(async () => {
    if (!syncEnabled || !isAuthenticated) return;
    
    setIsSyncing(true);
    setHasError(false);

    const result = await firebaseSyncManager.syncAllData();
    
    if (!result.success) {
      setHasError(true);
    } else {
      setLastSync(firebaseSyncManager.getLastSyncTime());
    }

    setIsSyncing(false);
  }, [syncEnabled, isAuthenticated]);

  const pullData = useCallback(async () => {
    if (!syncEnabled || !isAuthenticated) return;
    
    setIsSyncing(true);
    setHasError(false);

    const result = await firebaseSyncManager.pullAllData();
    
    if (!result.success) {
      setHasError(true);
    } else {
      setLastSync(firebaseSyncManager.getLastSyncTime());
    }

    setIsSyncing(false);
  }, [syncEnabled, isAuthenticated]);

  // Trigger auto-sync
  const triggerAutoSync = useCallback(() => {
    firebaseSyncManager.triggerAutoSync();
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
    userEmail: firebaseSyncManager.getUserEmail(),
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
