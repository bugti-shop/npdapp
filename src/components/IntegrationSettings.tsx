import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Unlink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { googleCalendarAuth, GoogleCalendar } from '@/utils/googleCalendarAuth';

interface IntegrationSettingsProps {
  variant?: 'notes' | 'todo';
}

export const IntegrationSettings = ({ variant = 'notes' }: IntegrationSettingsProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(['primary']);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    // Check existing connection
    const connected = googleCalendarAuth.isEnabled() && googleCalendarAuth.getAccessToken();
    setIsConnected(!!connected);
    if (connected) {
      loadCalendars();
    }

    // Load saved preferences
    const savedCalendars = localStorage.getItem('selectedGoogleCalendars');
    if (savedCalendars) {
      try {
        setSelectedCalendars(JSON.parse(savedCalendars));
      } catch (e) {
        setSelectedCalendars(['primary']);
      }
    }

    const savedAutoSync = localStorage.getItem('googleCalendarAutoSync');
    setAutoSyncEnabled(savedAutoSync === 'true');

    // Listen for connection updates
    const handleStorageChange = () => {
      const nowConnected = googleCalendarAuth.isEnabled() && googleCalendarAuth.getAccessToken();
      if (nowConnected && !isConnected) {
        setIsConnected(true);
        loadCalendars();
        toast({
          title: 'Google Calendar Connected',
          description: 'Successfully connected to your Google Calendar.',
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [isConnected]);

  const loadCalendars = async () => {
    try {
      const fetchedCalendars = await googleCalendarAuth.fetchCalendars();
      setCalendars(fetchedCalendars);
    } catch (error) {
      console.error('Failed to load calendars:', error);
      if ((error as Error).message.includes('expired')) {
        setIsConnected(false);
      }
    }
  };

  const handleConnect = () => {
    const returnPath = variant === 'todo' ? '/todo/settings' : '/settings';
    const authUrl = googleCalendarAuth.getAuthUrl(returnPath);
    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    googleCalendarAuth.disconnect();
    setIsConnected(false);
    setCalendars([]);
    toast({
      title: 'Disconnected',
      description: 'Google Calendar has been disconnected.',
    });
  };

  const handleCalendarToggle = (calendarId: string) => {
    setSelectedCalendars(prev => {
      let newSelection: string[];
      if (prev.includes(calendarId)) {
        if (prev.length === 1) {
          toast({
            title: 'At least one calendar required',
            description: 'You must have at least one calendar selected.',
            variant: 'destructive',
          });
          return prev;
        }
        newSelection = prev.filter(id => id !== calendarId);
      } else {
        newSelection = [...prev, calendarId];
      }
      localStorage.setItem('selectedGoogleCalendars', JSON.stringify(newSelection));
      return newSelection;
    });
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('googleCalendarAutoSync', String(enabled));
    toast({
      title: enabled ? 'Auto-sync enabled' : 'Auto-sync disabled',
      description: enabled 
        ? 'Calendar events will sync automatically.' 
        : 'Automatic syncing has been turned off.',
    });
  };

  const handleImportEvents = async () => {
    if (!isConnected || selectedCalendars.length === 0) {
      toast({
        title: 'Cannot import',
        description: 'Please connect to Google Calendar and select at least one calendar.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const { tasks, count } = await googleCalendarAuth.importEventsAsTasks(selectedCalendars);
      
      if (variant === 'todo') {
        // Import as tasks
        const existingTasks = JSON.parse(localStorage.getItem('nota-todo-items') || '[]');
        const existingIds = new Set(existingTasks.map((t: any) => t.googleCalendarEventId));
        const newTasks = tasks.filter(t => !existingIds.has(t.googleCalendarEventId));
        const mergedTasks = [...existingTasks, ...newTasks];
        localStorage.setItem('nota-todo-items', JSON.stringify(mergedTasks));
        window.dispatchEvent(new Event('todoItemsUpdated'));

        toast({
          title: 'Import successful',
          description: `Imported ${newTasks.length} new events as tasks.`,
        });
      } else {
        // Import as reminders/notes
        const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        let newCount = 0;
        
        for (const task of tasks) {
          const existingNote = existingNotes.find((n: any) => n.googleCalendarEventId === task.googleCalendarEventId);
          if (!existingNote) {
            existingNotes.push({
              id: task.id,
              type: 'regular',
              title: task.text,
              content: task.description || '',
              voiceRecordings: [],
              reminderEnabled: true,
              reminderTime: task.dueDate,
              googleCalendarEventId: task.googleCalendarEventId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            newCount++;
          }
        }
        
        localStorage.setItem('notes', JSON.stringify(existingNotes));
        window.dispatchEvent(new Event('notesUpdated'));

        toast({
          title: 'Import successful',
          description: `Imported ${newCount} new events as reminders.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: (error as Error).message || 'Failed to import calendar events.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Integrations
        </CardTitle>
        <CardDescription>
          Connect external services to enhance your productivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Calendar Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Import events as {variant === 'todo' ? 'tasks' : 'reminders'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">Not connected</span>
                </div>
              )}
            </div>
          </div>

          {!isConnected ? (
            <Button 
              onClick={handleConnect} 
              className="w-full"
              disabled={isLoading}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Calendar Selection */}
              {calendars.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select calendars to import from:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {calendars.map((calendar) => (
                      <div 
                        key={calendar.id} 
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50"
                      >
                        <Checkbox
                          id={calendar.id}
                          checked={selectedCalendars.includes(calendar.id)}
                          onCheckedChange={() => handleCalendarToggle(calendar.id)}
                        />
                        <label 
                          htmlFor={calendar.id} 
                          className="text-sm flex-1 cursor-pointer flex items-center gap-2"
                        >
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                          />
                          {calendar.summary}
                          {calendar.primary && (
                            <span className="text-xs text-muted-foreground">(Primary)</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-sync Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-sync</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically import new events
                  </p>
                </div>
                <Switch
                  checked={autoSyncEnabled}
                  onCheckedChange={handleAutoSyncToggle}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleImportEvents}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Import Events
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDisconnect}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};