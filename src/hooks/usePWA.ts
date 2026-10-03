import { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_DISMISSED_KEY = 'questlife_pwa_install_dismissed_v1';

export function usePWA() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [onlineStatusChanged, setOnlineStatusChanged] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInstallDismissed, setIsInstallDismissed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
      }
      return false;
    } catch {
      return false;
    }
  });

  // SW Update states
  const [needRefresh, setNeedRefresh] = useState<boolean>(false);
  const [updateSWFn, setUpdateSWFn] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  // Connectivity monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOnlineStatusChanged(true);
      const timer = setTimeout(() => setOnlineStatusChanged(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOnlineStatusChanged(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect standalone mode & iOS & Install prompts
  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return isStandaloneMedia || isNavigatorStandalone;
    };

    setIsInstalled(checkStandalone());

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register service worker with update callback
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const updateSW = registerSW({
        onNeedRefresh() {
          console.log('[QuestLife PWA] New version detected');
          setNeedRefresh(true);
        },
        onOfflineReady() {
          console.log('[QuestLife PWA] App ready for offline work');
        },
        onRegisteredSW(swUrl, registration) {
          console.log('[QuestLife PWA] Service Worker registered at:', swUrl);
          // Check for updates every hour if app remains open
          if (registration) {
            setInterval(() => {
              registration.update().catch(() => {});
            }, 60 * 60 * 1000);
          }
        },
        onRegisterError(error) {
          console.warn('[QuestLife PWA] Service Worker registration failed:', error);
        },
      });

      setUpdateSWFn(() => updateSW);
    } catch (err) {
      console.warn('[QuestLife PWA] Service Worker initialization error:', err);
    }
  }, []);

  // Trigger app update
  const updateApp = useCallback(async () => {
    if (updateSWFn) {
      // Reload page and apply new service worker safely without clearing localStorage
      await updateSWFn(true);
    } else {
      window.location.reload();
    }
  }, [updateSWFn]);

  // Install app prompt trigger
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('Error during app install:', err);
    }
    return false;
  }, [deferredPrompt]);

  // Dismiss install prompt banner
  const dismissInstallPrompt = useCallback(() => {
    setIsInstallDismissed(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
      }
    } catch (err) {
      console.error('Error saving install prompt dismissal:', err);
    }
  }, []);

  return {
    isOnline,
    onlineStatusChanged,
    isInstallable: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS,
    isInstallDismissed,
    installApp,
    dismissInstallPrompt,
    needRefresh,
    updateApp,
  };
}
