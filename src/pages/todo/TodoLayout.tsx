import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search } from 'lucide-react';
import { TodoBottomNavigation } from '@/components/TodoBottomNavigation';
import { SyncBadge } from '@/components/SyncStatusIndicator';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { syncManager } from '@/utils/syncManager';
import appLogo from '@/assets/app-logo.png';

const triggerHaptics = async () => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    // Haptics not available
  }
};

interface TodoLayoutProps {
  children: ReactNode;
  title: string;
}

export const TodoLayout = ({ children, title }: TodoLayoutProps) => {
  const navigate = useNavigate();
  const { isOnline, isSyncing, hasError, lastSync } = useRealtimeSync();
  const syncEnabled = syncManager.isSyncEnabled();

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src={appLogo} alt="Npd" className="h-8 w-8" />
              <h1 className="text-xl font-bold">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {syncEnabled && (
                <SyncBadge
                  isOnline={isOnline}
                  isSyncing={isSyncing}
                  lastSync={lastSync}
                  hasError={hasError}
                />
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await triggerHaptics();
                  navigate('/');
                }}
                className="h-9 w-9 hover:bg-transparent active:bg-transparent"
                title="Switch to Notes"
              >
                <FileText className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks"
              className="pl-10 bg-secondary/50 border-none"
            />
          </div>
        </div>
      </header>
      {children}
      <TodoBottomNavigation />
    </div>
  );
};
