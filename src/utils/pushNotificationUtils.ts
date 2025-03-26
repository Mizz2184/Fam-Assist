/**
 * Push Notification Utilities
 * 
 * This file contains utilities for handling push notifications in the browser.
 * In a production app, you would typically use a service like Firebase Cloud
 * Messaging, OneSignal, or a custom solution with service workers.
 */

// Check if push notifications are supported
export const isPushNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Request permission for push notifications
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  
  return await Notification.requestPermission();
};

// Get current notification permission
export const getNotificationPermission = (): NotificationPermission => {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  
  return Notification.permission;
};

// Send a browser notification
export const sendBrowserNotification = (
  title: string, 
  options?: NotificationOptions
): Notification | null => {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }
  
  try {
    return new Notification(title, options);
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

// Register the service worker for push notifications (would be implemented in production)
export const registerForPushNotifications = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false;
  }
  
  try {
    // Normally, here you would:
    // 1. Register a service worker
    // 2. Get the push subscription from the service worker
    // 3. Send the subscription to your server
    
    // For demonstration purposes, we'll just show a simple success
    if (Notification.permission === 'granted') {
      sendBrowserNotification('Notifications Enabled', {
        body: 'You will receive notifications for grocery list updates.',
        icon: '/icon.png'
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
};

// Save subscription to local storage (would save to server in production)
export const saveSubscription = (subscription: PushSubscription): void => {
  try {
    localStorage.setItem('pushSubscription', JSON.stringify(subscription.toJSON()));
  } catch (error) {
    console.error('Error saving subscription:', error);
  }
};

// Load subscription from local storage
export const loadSubscription = (): PushSubscriptionJSON | null => {
  try {
    const subscription = localStorage.getItem('pushSubscription');
    if (!subscription) {
      return null;
    }
    
    return JSON.parse(subscription) as PushSubscriptionJSON;
  } catch (error) {
    console.error('Error loading subscription:', error);
    return null;
  }
};

// Unregister from push notifications
export const unregisterFromPushNotifications = async (): Promise<boolean> => {
  if (!isPushNotificationSupported()) {
    return false;
  }
  
  try {
    // Remove subscription from local storage
    localStorage.removeItem('pushSubscription');
    
    // In a real app, you would also:
    // 1. Get all service worker registrations
    // 2. Unregister them
    // 3. Notify your server to remove the subscription
    
    return true;
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
    return false;
  }
}; 