/**
 * SCAR Modular Wake-Word Detection Engine
 * Decoupled from Gemini Live so it can be swapped with native Android wake engines.
 */

import { speakingGate } from './speakingGate.ts';

export interface IWakeWordDetector {
  start(): Promise<boolean>;
  stop(): void;
  isActive(): boolean;
  getWakePhrase(): string;
  setWakePhrase(phrase: string): void;
  onWakeWord(callback: () => void): () => void;
  processTranscript(transcript: string): boolean;
  matchesWakePhrase(transcript: string): boolean;
  setBlocked(blocked: boolean): void;
  isBlockedState(): boolean;
}

const WAKE_PHRASE_STORAGE_KEY = 'questlife_scar_wake_phrase';
const DEFAULT_WAKE_PHRASE = 'Scar';

export class BrowserWakeWordDetector implements IWakeWordDetector {
  private wakePhrase: string;
  private listeners: Set<() => void> = new Set();
  private active = false;
  private isBlocked = false;
  private recognition: any = null;

  constructor() {
    this.wakePhrase = this.loadWakePhrase();
  }

  private loadWakePhrase(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(WAKE_PHRASE_STORAGE_KEY);
        if (stored && stored.trim()) return stored.trim();
      } catch (_) {}
    }
    return DEFAULT_WAKE_PHRASE;
  }

  public getWakePhrase(): string {
    return this.wakePhrase;
  }

  public setWakePhrase(phrase: string): void {
    const trimmed = phrase.trim();
    if (!trimmed) return;
    this.wakePhrase = trimmed;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(WAKE_PHRASE_STORAGE_KEY, trimmed);
      } catch (_) {}
    }
  }

  public onWakeWord(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private triggerWake(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[WakeDetector] Listener error:', err);
      }
    }
  }

  public setBlocked(blocked: boolean): void {
    if (this.isBlocked === blocked) return;
    this.isBlocked = blocked;
    console.log(`[WakeDetector] Wake word detection ${blocked ? 'BLOCKED' : 'ENABLED'}`);

    if (blocked) {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (_) {}
      }
    } else {
      if (this.active) {
        this.restart();
      }
    }
  }

  public isBlockedState(): boolean {
    return (
      this.isBlocked ||
      speakingGate.shouldBlockInput() ||
      (typeof window !== 'undefined' && (window as any).isScarSpeaking === true)
    );
  }

  /**
   * Pure evaluation: returns true if transcript matches the wake phrase, without triggering listeners.
   */
  public matchesWakePhrase(transcript: string): boolean {
    if (this.isBlockedState()) return false;
    if (!transcript) return false;
    const clean = transcript.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    const target = this.wakePhrase.toLowerCase().trim();
    const regex = new RegExp(`(^|\\b)(${target}|hey ${target}|ok ${target}|okay ${target}|skar)(\\b|$)`, 'i');
    return regex.test(clean);
  }

  /**
   * Evaluates text/interim transcript for wake phrase and triggers listeners if matched.
   * Tolerates natural variations like "Hey Scar", "Ok Scar", "Scar.", "Skar"
   */
  public processTranscript(transcript: string): boolean {
    if (this.isBlockedState()) return false;
    if (this.matchesWakePhrase(transcript)) {
      this.triggerWake();
      return true;
    }
    return false;
  }

  public async start(): Promise<boolean> {
    if (this.active) return true;

    // Use Web Speech API for low-overhead browser wake detection if available
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.active = true;
      return true;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        if (this.isBlockedState()) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (this.processTranscript(transcript)) {
            // Once wake word is detected, active conversation begins
            break;
          }
        }
      };

      this.recognition.onerror = (e: any) => {
        // If aborted or network, try to keep alive if still active and not blocked
        if (e.error !== 'aborted' && this.active && !this.isBlocked) {
          setTimeout(() => {
            if (this.active && !this.isBlocked) this.restart();
          }, 600);
        }
      };

      this.recognition.onend = () => {
        if (this.active && !this.isBlocked) {
          setTimeout(() => {
            if (this.active && !this.isBlocked) this.restart();
          }, 300);
        }
      };

      this.recognition.start();
      this.active = true;
      return true;
    } catch (err) {
      console.warn('[WakeDetector] WebSpeech wake word engine fallback:', err);
      this.active = true;
      return false;
    }
  }

  private restart(): void {
    if (!this.active || !this.recognition) return;
    try {
      this.recognition.start();
    } catch (_) {}
  }

  public stop(): void {
    this.active = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_) {}
      this.recognition = null;
    }
  }

  public isActive(): boolean {
    return this.active;
  }
}

export const wakeWordDetector = new BrowserWakeWordDetector();
