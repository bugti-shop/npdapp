import { Cloud, CloudOff, RefreshCw, Download, CheckCircle, AlertCircle, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const SyncSettings = () => {
  const navigate = useNavigate();
  const {
    isOnline,
    isSyncing,
    hasError,
    syncEnabled,
    autoSyncEnabled,
    lastSync,
    isAuthenticated,
    userEmail,
    enableSync,
    disableSync,
    setAutoSync,
    manualSync,
    pullData,
    signOut,
  } = useFirebaseSync();
  const { toast } = useToast();

  const handleToggleSync = async () => {
    if (syncEnabled) {
      disableSync();
      toast({
        title: "Sync Disabled",
        description: "Your data will no longer sync across devices.",
      });
    } else {
      await enableSync();
      toast({
        title: "Sync Enabled",
        description: "Your data will now sync across all your devices.",
      });
    }
  };

  const handleManualSync = async () => {
    await manualSync();
    if (!hasError) {
      toast({
        title: "Sync Complete",
        description: "All your data has been synced.",
      });
    } else {
      toast({
        title: "Sync Failed",
        description: "Failed to sync data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePullData = async () => {
    await pullData();
    if (!hasError) {
      toast({
        title: "Data Downloaded",
        description: "Latest data has been downloaded from cloud.",
      });
      window.location.reload();
    } else {
      toast({
        title: "Download Failed",
        description: "Failed to download data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-muted-foreground" />
            Cloud Sync
          </CardTitle>
          <CardDescription>
            Sign in to sync your notes, folders, and todos across all your Android devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/auth')} className="w-full">
            <User className="h-4 w-4 mr-2" />
            Sign In to Enable Sync
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {syncEnabled ? (
            <Cloud className="h-5 w-5 text-primary" />
          ) : (
            <CloudOff className="h-5 w-5 text-muted-foreground" />
          )}
          Cloud Sync
        </CardTitle>
        <CardDescription>
          Sync your notes, folders, and todos across all your Android devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{userEmail}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-sm text-muted-foreground">
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Last synced: {format(lastSync, 'MMM d, h:mm a')}
            </span>
          )}
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Cloud Sync</p>
            <p className="text-xs text-muted-foreground">
              Sync data in real-time across devices
            </p>
          </div>
          <Switch
            checked={syncEnabled}
            onCheckedChange={handleToggleSync}
            disabled={isSyncing || !isOnline}
          />
        </div>

        {/* Auto-sync Toggle */}
        {syncEnabled && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-sync on changes</p>
              <p className="text-xs text-muted-foreground">
                Automatically sync when you edit notes or todos
              </p>
            </div>
            <Switch
              checked={autoSyncEnabled}
              onCheckedChange={setAutoSync}
              disabled={isSyncing}
            />
          </div>
        )}

        {/* Sync Buttons */}
        {syncEnabled && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handlePullData}
              disabled={isSyncing || !isOnline}
            >
              <Download className="h-4 w-4 mr-2" />
              Pull Data
            </Button>
          </div>
        )}

        {hasError && (
          <p className="text-xs text-destructive">
            Sync error occurred. Please check your connection and try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
