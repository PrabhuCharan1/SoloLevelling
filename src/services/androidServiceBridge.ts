/**
 * Android Foreground Service & Native Voice Bridge Abstraction
 * Decouples the SCAR Gemini Live conversational engine from Android lifecycle & background restrictions.
 */

export interface AndroidForegroundServiceConfig {
  notificationTitle: string;
  notificationText: string;
  isBackgroundWakeWordActive: boolean;
}

export class AndroidServiceBridge {
  private wakeLock: any = null;
  private isForegroundServiceRunning = false;

  /**
   * Check if running inside Android TWA / PWA / WebView wrapper
   */
  public isAndroidEnvironment(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
  }

  /**
   * Acquire screen WakeLock while active voice mode is engaged
   */
  public async acquireWakeLock(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
        return true;
      } catch (err) {
        console.warn('[AndroidBridge] Screen wake lock unavailable:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Release screen WakeLock
   */
  public async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (_) {}
      this.wakeLock = null;
    }
  }

  /**
   * Notify native Android bridge or PWA service worker of voice active state
   */
  public setVoiceSessionActive(active: boolean, title = 'SCAR Active System', text = 'Listening for Hunter Charan'): void {
    this.isForegroundServiceRunning = active;

    if (active) {
      this.acquireWakeLock();
    } else {
      this.releaseWakeLock();
    }

    // If native Capacitor / Android JavaScript Interface is injected
    if (typeof window !== 'undefined' && (window as any).AndroidSCARBridge) {
      try {
        (window as any).AndroidSCARBridge.setVoiceSessionActive(active, title, text);
      } catch (err) {
        console.warn('[AndroidBridge] Native interface error:', err);
      }
    }
  }

  public isRunning(): boolean {
    return this.isForegroundServiceRunning;
  }
}

export const androidServiceBridge = new AndroidServiceBridge();
