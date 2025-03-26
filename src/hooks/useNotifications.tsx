import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseNotificationsReturn {
  notificationsEnabled: boolean;
  notificationsSupported: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
}

/**
 * Hook to handle browser notifications
 */
export const useNotifications = (): UseNotificationsReturn => {
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [notificationsSupported, setNotificationsSupported] = useState<boolean>(false);

  // Check if notifications are supported and allowed
  useEffect(() => {
    // Check if browser supports notifications
    const isSupported = 'Notification' in window;
    setNotificationsSupported(isSupported);

    // Check current permission status
    if (isSupported) {
      const permission = Notification.permission;
      setNotificationsEnabled(permission === 'granted');
    }
  }, []);

  // Function to request permission and enable notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!notificationsSupported) {
      toast({
        title: 'Notifications Not Supported',
        description: 'Your browser does not support notifications.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const enabled = permission === 'granted';
      setNotificationsEnabled(enabled);

      if (enabled) {
        toast({
          title: 'Notifications Enabled',
          description: 'You will receive notifications for grocery list updates.'
        });
        
        // Create a test notification
        new Notification('Notifications Enabled', {
          body: 'You will be notified when collaborators update your grocery lists.',
          icon: '/icon.png'
        });

        // Here you would typically register with your push service
        // registerWithPushService(serviceWorkerRegistration);
      } else {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive'
        });
      }

      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error Enabling Notifications',
        description: 'There was a problem enabling notifications.',
        variant: 'destructive'
      });
      return false;
    }
  }, [notificationsSupported, toast]);

  // Function to disable notifications
  const disableNotifications = useCallback((): void => {
    // Note: There's no browser API to programmatically revoke permission
    // We can only stop sending notifications and instruct the user
    setNotificationsEnabled(false);
    toast({
      title: 'Notifications Disabled',
      description: 'You can re-enable notifications in your browser settings.'
    });

    // Here you would typically unregister from your push service
    // unregisterFromPushService();
  }, [toast]);

  return {
    notificationsEnabled,
    notificationsSupported,
    enableNotifications,
    disableNotifications
  };
};

export default useNotifications; 