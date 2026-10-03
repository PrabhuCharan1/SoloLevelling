/**
 * SCAR Language Preference & Explicit Command Detector
 * 
 * Strict Language Governance Rules:
 * 1. English ('en') is the permanent, authoritative default.
 * 2. Automatic language switching based on detected words, transcripts, or noise is STRICTLY PROHIBITED.
 * 3. Switches to Telugu ('te') ONLY on explicit user command (e.g. "Speak in Telugu", "Telugu lo matladu").
 * 4. Switches back to English ('en') ONLY on explicit user command (e.g. "Speak in English", "Switch back to English").
 * 5. Ordinary questions (even in Telugu/Tenglish, like "Na current rank entha?") DO NOT switch language.
 * 6. The chosen language preference persists across turns, sessions, and normal navigation.
 */

export type ResponseLanguage = 'en' | 'te';

const STORAGE_KEY = 'questlife_scar_voice_language';

const TELUGU_EXPLICIT_COMMANDS: RegExp[] = [
  /\b(?:speak\s+(?:in\s+)?telugu|speak\s+telugu)\b/i,
  /\b(?:telugu\s+lo\s+matladu|telugulo\s+matladu|telugu\s+matladu)\b/i,
  /\b(?:telugu\s+lo\s+matladava|telugulo\s+matladava)\b/i,
  /\b(?:telugu\s+lo\s+cheppu|telugulo\s+cheppu|telugu\s+cheppu)\b/i,
  /\b(?:telugu\s+lo\s+cheppandi|telugulo\s+cheppandi)\b/i,
  /\b(?:from\s+now\s+on[,\s]+(?:please\s+)?speak\s+(?:in\s+)?telugu)\b/i,
  /\b(?:answer\s+(?:me\s+)?in\s+telugu|reply\s+(?:to\s+me\s+)?in\s+telugu|talk\s+(?:to\s+me\s+)?in\s+telugu)\b/i,
  /\b(?:switch\s+(?:over\s+)?(?:back\s+)?to\s+telugu|change\s+to\s+telugu)\b/i,
  /\b(?:telugu\s+mode|enable\s+telugu)\b/i,
  /తెలుగులో\s*(?:మాట్లాడు|మాట్లాడవా|చెప్పు|చెప్పండి|సమాధానం\s*ఇవ్వు)/,
  /తెలుగు\s*(?:మాట్లాడు|చెప్పు)/,
];

const ENGLISH_EXPLICIT_COMMANDS: RegExp[] = [
  /\b(?:speak\s+(?:in\s+)?english|speak\s+english)\b/i,
  /\b(?:english\s+lo\s+matladu|englishlo\s+matladu|english\s+matladu)\b/i,
  /\b(?:english\s+lo\s+matladava|englishlo\s+matladava)\b/i,
  /\b(?:english\s+lo\s+cheppu|englishlo\s+cheppu|english\s+cheppu)\b/i,
  /\b(?:english\s+lo\s+cheppandi|englishlo\s+cheppandi)\b/i,
  /\b(?:switch\s+(?:over\s+)?(?:back\s+)?to\s+english|change\s+(?:back\s+)?to\s+english)\b/i,
  /\b(?:from\s+now\s+on[,\s]+(?:please\s+)?speak\s+(?:in\s+)?english)\b/i,
  /\b(?:answer\s+(?:me\s+)?in\s+english|reply\s+(?:to\s+me\s+)?in\s+english|talk\s+(?:to\s+me\s+)?in\s+english)\b/i,
  /\b(?:english\s+mode|enable\s+english)\b/i,
  /ఇంగ్లీష్\s*లో\s*(?:మాట్లాడు|మాట్లాడవా|చెప్పు|చెప్పండి|సమాధానం\s*ఇవ్వు)/,
  /ఇంగ్లీష్\s*(?:మాట్లాడు|చెప్పు)/,
];

export interface LanguageCommandEvaluation {
  isExplicitSwitch: boolean;
  targetLanguage?: ResponseLanguage;
  confirmationReply?: string;
  responseLanguage: ResponseLanguage;
}

export type LanguageChangeListener = (language: ResponseLanguage) => void;

export class LanguageDetector {
  private currentLanguage: ResponseLanguage = 'en';
  private listeners: Set<LanguageChangeListener> = new Set();

  constructor() {
    this.currentLanguage = this.loadPersistedLanguage();
  }

  private loadPersistedLanguage(): ResponseLanguage {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'te') {
          return 'te';
        }
      } catch (_) {}
    }
    return 'en';
  }

  private persistLanguage(lang: ResponseLanguage): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch (_) {}
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentLanguage);
      } catch (err) {
        console.error('[LanguageDetector] Listener error:', err);
      }
    }
  }

  public subscribe(listener: LanguageChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentLanguage);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Evaluates user transcript for EXPLICIT language switch commands.
   * If user explicitly commanded a language switch:
   *   - Updates persistent language preference.
   *   - Returns confirmation text.
   * If normal query (even in Telugu/Tenglish):
   *   - Keeps current locked language intact!
   */
  public processUserTranscript(transcript: string): LanguageCommandEvaluation {
    const clean = transcript.trim();
    if (!clean) {
      return {
        isExplicitSwitch: false,
        responseLanguage: this.currentLanguage,
      };
    }

    // 1. Check for explicit switch to Telugu
    const isTeluguCommand = TELUGU_EXPLICIT_COMMANDS.some((regex) => regex.test(clean));
    if (isTeluguCommand) {
      this.setResponseLanguage('te');
      console.log('[LanguageDetector] Explicit command detected: SWITCH TO TELUGU');
      return {
        isExplicitSwitch: true,
        targetLanguage: 'te',
        confirmationReply: 'సరే హంటర్ చరణ్, ఇకనుండి నేను తెలుగులోనే సమాధానం ఇస్తాను.',
        responseLanguage: 'te',
      };
    }

    // 2. Check for explicit switch to English
    const isEnglishCommand = ENGLISH_EXPLICIT_COMMANDS.some((regex) => regex.test(clean));
    if (isEnglishCommand) {
      this.setResponseLanguage('en');
      console.log('[LanguageDetector] Explicit command detected: SWITCH TO ENGLISH');
      return {
        isExplicitSwitch: true,
        targetLanguage: 'en',
        confirmationReply: 'Understood, Hunter Charan. Switching back to English.',
        responseLanguage: 'en',
      };
    }

    // 3. Normal question: DO NOT CHANGE LANGUAGE
    return {
      isExplicitSwitch: false,
      responseLanguage: this.currentLanguage,
    };
  }

  /**
   * Compatibility helper for backward integration
   */
  public detectLanguage(text: string): ResponseLanguage {
    const result = this.processUserTranscript(text);
    return result.responseLanguage;
  }

  /**
   * Locks and returns the response language for turn execution.
   */
  public lockLanguageForTurn(userTranscript: string): ResponseLanguage {
    const result = this.processUserTranscript(userTranscript);
    return result.responseLanguage;
  }

  /**
   * Returns current persistent language preference ('en' by default)
   */
  public getResponseLanguage(): ResponseLanguage {
    return this.currentLanguage;
  }

  public getLockedLanguage(): ResponseLanguage {
    return this.currentLanguage;
  }

  public isLocked(): boolean {
    return true; // Always locked to user's persistent preference
  }

  public unlockLanguage(): void {
    // Intentionally no-op: language preference remains persistently locked
  }

  /**
   * Explicitly set response language (e.g. from UI controls or explicit commands)
   */
  public setResponseLanguage(lang: ResponseLanguage): void {
    if (this.currentLanguage !== lang) {
      this.currentLanguage = lang;
      this.persistLanguage(lang);
      this.notifyListeners();
      console.log(`[LanguageDetector] Persistent response language set to: ${lang.toUpperCase()}`);
    }
  }

  public setPreferredLanguage(lang: ResponseLanguage): void {
    this.setResponseLanguage(lang);
  }
}

export const languageDetector = new LanguageDetector();
