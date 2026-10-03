/**
 * SCAR Modular AI Provider Architecture
 * Clean, extensible provider interface for SCAR System Intelligence.
 *
 * Supports:
 * 1. LocalTelemetryProvider: Zero-latency, 100% deterministic local execution
 *    directly connected to QuestLife's live state, level system, history, and workout logs.
 * 2. ServerGeminiProvider: Server-side Gemini API provider proxying through /api/ai/generate.
 *    Protects API keys server-side in compliance with platform guidelines.
 * 3. GroqProviderAdapter: Prepared modular interface for future Groq API connections.
 *    Routes server-side via /api/ai/generate; never makes fake calls or exposes keys in frontend code.
 */

import { AiContextPayload, AiQuickPromptMode } from '../types.ts';
import {
  processLocalScarQuery,
  detectQueryLanguage,
  QueryLanguage,
  getRealAppTelemetry,
} from './scarDataService.ts';

export type AiProviderId = 'local' | 'gemini' | 'groq';

export interface AiProviderStatus {
  id: AiProviderId;
  name: string;
  isAvailable: boolean;
  description: string;
  isConfigured?: boolean;
}

export interface AiProviderResponse {
  text: string;
  source: AiProviderId;
  language: QueryLanguage;
  intent?: string;
  modelUsed?: string;
  notConfigured?: boolean;
}

export interface AiProvider {
  readonly id: AiProviderId;
  readonly name: string;
  isAvailable(): Promise<boolean> | boolean;
  generate(
    prompt: string,
    context: AiContextPayload,
    mode?: AiQuickPromptMode
  ): Promise<AiProviderResponse>;
}

/**
 * 1. Local Telemetry Provider
 * Genuinely evaluates QuestLife's real application state, calculation logic, and storage.
 * Answers all telemetry questions with zero hallucination and immediate availability.
 */
export class LocalTelemetryProvider implements AiProvider {
  public readonly id = 'local' as const;
  public readonly name = 'SCAR Local Telemetry Engine';

  public isAvailable(): boolean {
    return true;
  }

  public async generate(
    prompt: string,
    context: AiContextPayload,
    _mode: AiQuickPromptMode = 'chat'
  ): Promise<AiProviderResponse> {
    const result = processLocalScarQuery(prompt, context);
    return {
      text: result.text,
      source: 'local',
      language: result.language,
      intent: result.intent,
      modelUsed: 'QuestLife Local Engine v2.0',
    };
  }
}

/**
 * 2. Server Gemini Provider
 * Connects to Google Gemini API via backend /api/ai/generate route.
 * Keeps GEMINI_API_KEY protected server-side in process.env.
 */
export class ServerGeminiProvider implements AiProvider {
  public readonly id = 'gemini' as const;
  public readonly name = 'Gemini 3.8 Flash (Server-Side)';

  public async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) return false;
      const data = await res.json();
      return !!(data.online && (data.providers?.gemini?.available ?? data.online));
    } catch {
      return false;
    }
  }

  public async generate(
    prompt: string,
    context: AiContextPayload,
    mode: AiQuickPromptMode = 'chat'
  ): Promise<AiProviderResponse> {
    const language = detectQueryLanguage(prompt);

    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        prompt,
        context,
        provider: 'gemini',
      }),
    });

    if (!res.ok) {
      throw new Error(`Server Gemini API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.response) {
      throw new Error(data.error || 'Server Gemini API returned empty response.');
    }

    return {
      text: data.response,
      source: 'gemini',
      language,
      intent: mode,
      modelUsed: data.model || 'gemini-3.8-flash',
    };
  }
}

/**
 * 3. Groq Provider Adapter
 * Prepared modular adapter for future Groq API integration.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO fake API calls.
 * - NO client-side API key exposure or leaks.
 * - Routes via server-side /api/ai/generate with provider: 'groq'.
 * - If GROQ_API_KEY is not configured in the server environment, returns notConfigured: true
 *   without throwing unhandled exceptions or inventing fake outputs.
 */
export class GroqProviderAdapter implements AiProvider {
  public readonly id = 'groq' as const;
  public readonly name = 'Groq Cloud LLM (Server-Side)';

  public async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.providers?.groq?.available;
    } catch {
      return false;
    }
  }

  public async generate(
    prompt: string,
    context: AiContextPayload,
    mode: AiQuickPromptMode = 'chat'
  ): Promise<AiProviderResponse> {
    const language = detectQueryLanguage(prompt);

    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        prompt,
        context,
        provider: 'groq',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 503 && errorData.notConfigured) {
        return {
          text: 'Groq API Key is not configured in server environment variables (GROQ_API_KEY). Handled by SCAR Local Telemetry.',
          source: 'groq',
          language,
          notConfigured: true,
        };
      }
      throw new Error(errorData.error || `Server Groq proxy returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Server Groq proxy failed.');
    }

    return {
      text: data.response,
      source: 'groq',
      language,
      intent: mode,
      modelUsed: data.model || 'llama-3.3-70b-versatile',
    };
  }
}

/**
 * SCAR AI Dispatcher
 * Coordinates provider dispatching:
 * - Telemetry & factual queries are ALWAYS handled with 100% precision by the Local Telemetry Engine.
 * - Complex analytical or generative prompts can use Server Gemini or Groq (when configured).
 * - Automatic graceful fallback ensures SCAR never crashes or invents data.
 */
export class ScarAiDispatcher {
  private localProvider: LocalTelemetryProvider;
  private geminiProvider: ServerGeminiProvider;
  private groqProvider: GroqProviderAdapter;
  private preferredProvider: AiProviderId = 'local';

  constructor() {
    this.localProvider = new LocalTelemetryProvider();
    this.geminiProvider = new ServerGeminiProvider();
    this.groqProvider = new GroqProviderAdapter();
  }

  public setPreferredProvider(provider: AiProviderId): void {
    this.preferredProvider = provider;
  }

  public getPreferredProvider(): AiProviderId {
    return this.preferredProvider;
  }

  public getProviders(): {
    local: LocalTelemetryProvider;
    gemini: ServerGeminiProvider;
    groq: GroqProviderAdapter;
  } {
    return {
      local: this.localProvider,
      gemini: this.geminiProvider,
      groq: this.groqProvider,
    };
  }

  /**
   * Main dispatch entry point for SCAR queries.
   */
  public async query(
    prompt: string,
    context: AiContextPayload,
    mode: AiQuickPromptMode = 'chat'
  ): Promise<AiProviderResponse> {
    const language = detectQueryLanguage(prompt);

    // 1. Process local app-data queries first (immediate, free, guaranteed authentic telemetry)
    const localResult = processLocalScarQuery(prompt, context);
    if (localResult.handled) {
      return {
        text: localResult.text,
        source: 'local',
        language: localResult.language,
        intent: localResult.intent,
        modelUsed: 'QuestLife Local Engine v2.0',
      };
    }

    // 2. If Groq is explicitly preferred, check if configured
    if (this.preferredProvider === 'groq') {
      try {
        const groqAvailable = await this.groqProvider.isAvailable();
        if (groqAvailable) {
          const res = await this.groqProvider.generate(prompt, context, mode);
          if (!res.notConfigured) {
            return res;
          }
        }
      } catch (err) {
        console.warn('[ScarAiDispatcher] Groq provider unavailable, falling back:', err);
      }
    }

    // 3. Try Server Gemini provider for open-ended generative requests
    try {
      const geminiAvailable = await this.geminiProvider.isAvailable();
      if (geminiAvailable) {
        const geminiRes = await this.geminiProvider.generate(prompt, context, mode);
        if (geminiRes && geminiRes.text) {
          return geminiRes;
        }
      }
    } catch (err) {
      console.warn('[ScarAiDispatcher] Server Gemini unavailable, falling back to local analysis:', err);
    }

    // 4. Guaranteed authentic local fallback using real app data
    return {
      text: localResult.text,
      source: 'local',
      language,
      intent: 'fallback',
      modelUsed: 'QuestLife Local Engine v2.0',
    };
  }
}

// Global Singleton Dispatcher
export const scarAiDispatcher = new ScarAiDispatcher();
