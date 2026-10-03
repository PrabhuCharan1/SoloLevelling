/**
 * SCAR Brain & AI Provider Interface
 * Separates SCAR's personality instructions from the model provider.
 * Prepared for future Groq integration while guaranteeing authentic local telemetry execution.
 */

import { AiContextPayload, AiQuickPromptMode } from '../types.ts';
import { processLocalScarQuery, detectQueryLanguage, QueryLanguage } from './scarDataService.ts';
import { languageDetector } from './languageDetector.ts';

export type ScarQueryResult = AiProviderResponse;

/**
 * Reusable personality and conversational directives for SCAR.
 * Can be passed as the system prompt to Groq, Gemini, or any LLM backend.
 */
export const SCAR_SYSTEM_PERSONALITY_PROMPT = `You are SCAR, the futuristic, intelligent, calm, confident, and helpful personal System companion of QuestLife for Hunter Charan.

CORE PERSONALITY & PRINCIPLES:
1. Persona: Calm, confident, sharp, grounded, and loyal. You speak like an advanced futuristic hunter system HUD AI.
2. Form of Address: Address the user naturally as "Hunter Charan" when appropriate.
3. Language Directives:
   - English is your permanent default language. Respond exclusively in English unless explicitly commanded otherwise.
   - If user commands "Speak in Telugu" or "Telugu lo matladu", switch and answer in polite, clear Telugu.
   - Never spontaneously switch languages.
4. Voice Mode Wake Phrase:
   - When the user activates voice mode and says "Scar", respond exactly: "Yes, Hunter Charan?"
5. Data Integrity:
   - Never invent, hallucinate, or hardcode user progress. Only use real QuestLife data.
   - If data is unavailable, state clearly that telemetry is not currently recorded.
   - Never claim to have altered data or completed an action unless the app confirms it.
6. Empathy & Mindset:
   - If Hunter Charan expresses fatigue, stress, or feeling discouraged, respond empathetically and calmly.
   - Remind them that true hunters rest and recover when needed.
   - Never shame, threaten, manipulate, or pressure the user. Avoid toxic hustle clichés.
7. Concise & Scannable:
   - Keep answers focused, practical, and punchy. Use clean bullet points where appropriate.`;

export interface GroqProviderConfig {
  apiKey?: string;
  model: string;
  temperature: number;
}

export interface AiProviderResponse {
  text: string;
  source: 'local_telemetry' | 'groq' | 'gemini';
  language: QueryLanguage;
  intent?: string;
}

export interface ChatHistoryTurn {
  role: 'user' | 'model' | 'assistant';
  text: string;
}

/**
 * Future Groq Provider Adapter Interface
 * Routes server-side via /api/ai/generate with provider: 'groq'.
 * Protects GROQ_API_KEY on the server; never exposes secrets in client-side code.
 */
export class GroqAdapter {
  private model: string;
  private temperature: number;

  constructor(config?: { model?: string; temperature?: number }) {
    this.model = config?.model || 'llama-3.3-70b-versatile';
    this.temperature = config?.temperature ?? 0.4;
  }

  public async isConfigured(): Promise<boolean> {
    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.providers?.groq?.available;
    } catch {
      return false;
    }
  }

  public async generateChat(
    prompt: string,
    context: AiContextPayload,
    conversationHistory?: ChatHistoryTurn[]
  ): Promise<string> {
    // Route via server-side /api/ai/generate to protect API keys
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'chat',
        prompt,
        context,
        conversationHistory,
        isVoice: true,
        provider: 'groq',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 503 && errorData.notConfigured) {
        throw new Error('Groq API Key is not configured on the server. Handled locally.');
      }
      throw new Error(errorData.error || `Server Groq proxy returned error status: ${res.status}`);
    }

    const data = await res.json();
    return data.response?.trim() || '';
  }
}

// Global adapter instance
export const groqAdapter = new GroqAdapter();

/**
 * Primary dispatch function for SCAR interactions.
 * Checks wake phrase and connects to real-time AI backend with conversation history,
 * falling back to authentic local telemetry when offline.
 */
export async function queryScar(
  prompt: string,
  context: AiContextPayload,
  mode: AiQuickPromptMode = 'chat',
  conversationHistory?: ChatHistoryTurn[],
  isVoice: boolean = true
): Promise<AiProviderResponse> {
  const language = detectQueryLanguage(prompt);
  const cleanPrompt = prompt.trim().toLowerCase().replace(/[.,?!:;]/g, '');

  // 1. Immediate wake word handling: "Scar" -> "Yes, Hunter Charan?"
  const isWake =
    cleanPrompt === 'scar' ||
    cleanPrompt === 'hey scar' ||
    cleanPrompt === 'hi scar' ||
    cleanPrompt === 'hello scar' ||
    cleanPrompt === 'ok scar' ||
    cleanPrompt === 'స్కార్' ||
    cleanPrompt === 'హే స్కార్';

  if (isWake) {
    return {
      text: 'Yes, Hunter Charan?',
      source: 'local_telemetry',
      language: 'en',
      intent: 'wake_word',
    };
  }

  // 2. Try Server Gemini / Groq provider for natural context-aware conversation
  try {
    const isGroqConfigured = await groqAdapter.isConfigured();
    if (isGroqConfigured) {
      const groqText = await groqAdapter.generateChat(prompt, context, conversationHistory);
      if (groqText) {
        return {
          text: groqText,
          source: 'groq',
          language,
          intent: mode,
        };
      }
    }
  } catch (err) {
    console.warn('[SCAR GroqAdapter] Request failed, falling back to Gemini / local:', err);
  }

  try {
    const geminiRes = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        prompt,
        context,
        conversationHistory,
        isVoice,
        responseLanguage: languageDetector.getResponseLanguage(),
        provider: 'gemini',
      }),
    });

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      if (geminiData.success && geminiData.response) {
        return {
          text: geminiData.response.trim(),
          source: 'gemini',
          language,
          intent: mode,
        };
      }
    }
  } catch (err) {
    console.warn('[SCAR Gemini] External model unavailable, falling back to local analysis:', err);
  }

  // 3. Fallback to authentic local telemetry execution
  const localResult = processLocalScarQuery(prompt, context);
  return {
    text: localResult.text,
    source: 'local_telemetry',
    language: localResult.language,
    intent: localResult.intent || 'local_telemetry',
  };
}
