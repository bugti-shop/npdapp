import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const OfflineIndicator = ({ className, showLabel = true }: OfflineIndicatorProps) => {
  const { isOnline, pendingSyncCount } = useOfflineStatus();

  if (isOnline && pendingSyncCount === 0) {
    return null; // Don't show when online and synced
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        isOnline 
          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
        className
      )}
    >
      {isOnline ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          {showLabel && <span>{pendingSyncCount} pending</span>}
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          {showLabel && <span>Offline</span>}
        </>
      )}
    </div>
  );
};

export const OfflineBanner = () => {
  const { isOnline, pendingSyncCount } = useOfflineStatus();

  if (isOnline && pendingSyncCount === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium",
        isOnline 
          ? "bg-yellow-500 text-yellow-950"
          : "bg-red-500 text-white"
      )}
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Syncing {pendingSyncCount} changes...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <CloudOff className="h-4 w-4" />
          You're offline. Changes will sync when you reconnect.
        </span>
      )}
    </div>
  );
};