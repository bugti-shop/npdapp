import { useEffect, useState, useCallback } from 'react';
import { firebaseSyncManager } from '@/utils/firebaseSync';

export const useFirebaseSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [syncEnabled, setSyncEnabledState] = useState(firebaseSyncManager.isSyncEnabled());
  const [lastSync, setLastSync] = useState<Date | null>(firebaseSyncManager.getLastSyncTime());

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
    const unsubscribe = firebaseSyncManager.onDataChange(() => {
      setLastSync(firebaseSyncManager.getLastSyncTime());
    });

    return () => unsubscribe();
  }, []);

  const enableSync = useCallback(async () => {
    setIsSyncing(true);
    setHasError(false);

    const signedIn = await firebaseSyncManager.signIn();
    if (signedIn) {
      firebaseSyncManager.setSyncEnabled(true);
      setSyncEnabledState(true);
      await firebaseSyncManager.syncAllData();
    } else {
      setHasError(true);
    }

    setIsSyncing(false);
  }, []);

  const disableSync = useCallback(() => {
    firebaseSyncManager.setSyncEnabled(false);
    setSyncEnabledState(false);
  }, []);

  const manualSync = useCallback(async () => {
    if (!syncEnabled) return;
    
    setIsSyncing(true);
    setHasError(false);

    const result = await firebaseSyncManager.syncAllData();
    
    if (!result.success) {
      setHasError(true);
    } else {
      setLastSync(firebaseSyncManager.getLastSyncTime());
    }

    setIsSyncing(false);
  }, [syncEnabled]);

  const pullData = useCallback(async () => {
    if (!syncEnabled) return;
    
    setIsSyncing(true);
    setHasError(false);

    const result = await firebaseSyncManager.pullAllData();
    
    if (!result.success) {
      setHasError(true);
    } else {
      setLastSync(firebaseSyncManager.getLastSyncTime());
    }

    setIsSyncing(false);
  }, [syncEnabled]);

  return {
    isOnline,
    isSyncing,
    hasError,
    syncEnabled,
    lastSync,
    enableSync,
    disableSync,
    manualSync,
    pullData,
  };
};
