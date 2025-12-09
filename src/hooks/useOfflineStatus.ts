import { useState, useEffect } from 'react';
import { offlineStorage } from '@/utils/offlineStorage';

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending sync count periodically
    const checkPending = async () => {
      const count = await offlineStorage.getPendingSyncCount();
      setPendingSyncCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pendingSyncCount };
};