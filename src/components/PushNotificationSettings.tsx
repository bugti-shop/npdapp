import { useState, useEffect, useCallback } from 'react';
import { Calendar, Bell, BellRing, BellOff, CheckCircle, Settings, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { pushNotificationService, PushTopic } from '@/utils/pushNotifications';
import { Capacitor } from '@capacitor/core';

const TOPIC_OPTIONS: { id: PushTopic; label: string; description: string }[] = [
  { id: 'task_reminders', label: 'Task Reminders', description: 'Get notified about upcoming tasks' },
  { id: 'note_reminders', label: 'Note Reminders', description: 'Receive note reminder notifications' },
  { id: 'updates', label: 'App Updates', description: 'Be notified about new features' },
  { id: 'tips', label: 'Productivity Tips', description: 'Receive helpful productivity tips' },
];

export const PushNotificationSettings = () => {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [subscribedTopics, setSubscribedTopics] = useState<PushTopic[]>(['task_reminders', 'note_reminders']);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    setIsEnabled(pushNotificationService.isEnabled());
    setToken(pushNotificationService.getToken());
    setSubscribedTopics(pushNotificationService.getSubscribedTopics());
  }, []);

  const handleEnablePush = async () => {
    setIsInitializing(true);
    try {
      const success = await pushNotificationService.initialize();
      if (success) {
        setIsEnabled(true);
        setToken(pushNotificationService.getToken());
        toast({
          title: 'Push Notifications Enabled',
          description: 'You will now receive push notifications for reminders.',
        });
      } else {
        toast({
          title: 'Permission Required',
          description: 'Please enable notifications in your device settings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to Enable',
        description: 'Could not enable push notifications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDisablePush = () => {
    pushNotificationService.setEnabled(false);
    setIsEnabled(false);
    toast({
      title: 'Push Notifications Disabled',
      description: 'You will no longer receive push notifications.',
    });
  };

  const handleTopicToggle = (topic: PushTopic) => {
    const newTopics = subscribedTopics.includes(topic)
      ? subscribedTopics.filter(t => t !== topic)
      : [...subscribedTopics, topic];
    
    setSubscribedTopics(newTopics);
    pushNotificationService.setSubscribedTopics(newTopics);
  };

  const handleTestNotification = async () => {
    toast({
      title: 'Test Notification',
      description: 'This is a test notification. On a real device, you would receive a push notification.',
    });
  };

  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Real-time notifications for your tasks and reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Native App Required</p>
              <p className="text-xs text-muted-foreground">
                Push notifications are available when using the Android or iOS app.
                Install the app to receive real-time notifications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get real-time notifications for your tasks and reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEnabled 
                  ? 'You will receive push notifications' 
                  : 'Enable to receive real-time alerts'}
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={isEnabled ? handleDisablePush : handleEnablePush}
            disabled={isInitializing}
          />
        </div>

        {isEnabled && (
          <>
            {/* Token Status */}
            {token && (
              <div className="p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-700 dark:text-green-400">
                    Device registered for push notifications
                  </span>
                </div>
              </div>
            )}

            {/* Topic Subscriptions */}
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium">Notification Types</p>
              {TOPIC_OPTIONS.map((topic) => (
                <div 
                  key={topic.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <Checkbox
                    id={topic.id}
                    checked={subscribedTopics.includes(topic.id)}
                    onCheckedChange={() => handleTopicToggle(topic.id)}
                  />
                  <label htmlFor={topic.id} className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium">{topic.label}</p>
                    <p className="text-xs text-muted-foreground">{topic.description}</p>
                  </label>
                </div>
              ))}
            </div>

            {/* Test Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={handleTestNotification}
            >
              <Bell className="h-4 w-4 mr-2" />
              Send Test Notification
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};