import { AiMessage } from '../types.ts';
import { getStoredData, setStoredData } from './storageCore.ts';

const AI_CHAT_STORAGE_KEY = 'questlife_ai_messages';
const MAX_AI_MESSAGES = 50;

const DEFAULT_WELCOME_MESSAGE: AiMessage = {
  id: 'scar-init',
  sender: 'system',
  text: `SCAR OPERATIONAL.
System companion connected to QuestLife core.
Real-time telemetry active: Hunter Level, Rank progress, daily tasks, workout split, and hydration.
Ready, Hunter Charan. Ask me a question, select a prompt, or tap the microphone to speak.`,
  timestamp: new Date().toISOString(),
  mode: 'chat',
};

/**
 * Loads recent AI chat messages, keeping up to MAX_AI_MESSAGES.
 */
export function loadAiChatMessages(): AiMessage[] {
  const stored = getStoredData<AiMessage[]>(AI_CHAT_STORAGE_KEY, []);
  if (!Array.isArray(stored) || stored.length === 0) {
    return [DEFAULT_WELCOME_MESSAGE];
  }
  return stored.slice(-MAX_AI_MESSAGES);
}

/**
 * Saves AI chat messages, automatically truncating to the last MAX_AI_MESSAGES.
 */
export function saveAiChatMessages(messages: AiMessage[]): void {
  const capped = messages.slice(-MAX_AI_MESSAGES);
  setStoredData(AI_CHAT_STORAGE_KEY, capped);
}

/**
 * Appends a new message to the persistent chat history.
 */
export function appendAiChatMessage(message: AiMessage): AiMessage[] {
  const current = loadAiChatMessages();
  const next = [...current, message].slice(-MAX_AI_MESSAGES);
  saveAiChatMessages(next);
  return next;
}

/**
 * Clears AI chat history and resets to initial welcome message.
 * Does NOT touch any QuestLife quests, workouts, water, or stats.
 */
export function clearAiChatHistory(): AiMessage[] {
  const resetList: AiMessage[] = [
    {
      ...DEFAULT_WELCOME_MESSAGE,
      id: `scar-reset-${Date.now()}`,
      timestamp: new Date().toISOString(),
    },
  ];
  saveAiChatMessages(resetList);
  return resetList;
}
