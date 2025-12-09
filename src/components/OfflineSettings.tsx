import { useState, useEffect } from 'react';
import { WifiOff, Cloud, RefreshCw, Database, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { offlineStorage } from '@/utils/offlineStorage';

export const OfflineSettings = () => {
  const { toast } = useToast();
  const { isOnline, pendingSyncCount } = useOfflineStatus();
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [todosCount, setTodosCount] = useState(0);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const loadCounts = async () => {
      const notes = await offlineStorage.getAllNotes();
      const todos = await offlineStorage.getAllTodos();
      setNotesCount(notes.length);
      setTodosCount(todos.length);
    };
    loadCounts();
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await offlineStorage.clearCache();
      toast({
        title: 'Cache Cleared',
        description: 'All cached data has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear cache.',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      toast({
        title: 'Offline',
        description: 'Cannot sync while offline.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await offlineStorage.processSyncQueue();
      toast({
        title: 'Sync Complete',
        description: 'All pending changes have been synced.',
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Could not sync changes. Will retry later.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Offline Mode
        </CardTitle>
        <CardDescription>
          Access your notes and tasks without internet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {pendingSyncCount > 0 && (
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full">
              {pendingSyncCount} pending
            </span>
          )}
        </div>

        {/* Cached Data Info */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Cached Data</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{notesCount}</p>
              <p className="text-xs text-muted-foreground">Notes</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{todosCount}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
          </div>
        </div>

        {/* Offline Caching Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Offline Caching</p>
            <p className="text-xs text-muted-foreground">
              Store data locally for offline access
            </p>
          </div>
          <Switch
            checked={cacheEnabled}
            onCheckedChange={setCacheEnabled}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {pendingSyncCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleSyncNow}
              disabled={!isOnline}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleClearCache}
            disabled={isClearing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Your data is automatically saved locally and synced when online. 
          Changes made offline will sync automatically when you reconnect.
        </p>
      </CardContent>
    </Card>
  );
};