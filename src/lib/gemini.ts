import { AiContextPayload, AiQuickPromptMode } from '../types.ts';

export interface AiServiceResponse {
  success: boolean;
  text: string;
  isOfflineFallback: boolean;
}

/**
 * Checks server-side Gemini system readiness.
 */
export async function checkAiStatus(): Promise<{ online: boolean; model?: string }> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: !!data.online, model: data.model };
  } catch {
    return { online: false };
  }
}

/**
 * Calls the server-side Gemini endpoint with robust error handling and local fallback.
 */
async function callAiServer(
  mode: AiQuickPromptMode,
  prompt: string | undefined,
  context: AiContextPayload
): Promise<AiServiceResponse> {
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, prompt, context }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.response === 'string' && data.response.trim()) {
        return {
          success: true,
          text: data.response.trim(),
          isOfflineFallback: false,
        };
      }
    }
  } catch (err) {
    console.warn('[System AI Service] Connection failed, switching to local telemetry fallback:', err);
  }

  // Graceful local algorithmic fallback
  const fallbackText = generateLocalTelemetryFallback(mode, prompt, context);
  return {
    success: true,
    text: fallbackText,
    isOfflineFallback: true,
  };
}

/**
 * Local offline algorithmic fallback computed purely from actual QuestLife data.
 */
export function generateLocalTelemetryFallback(
  mode: AiQuickPromptMode,
  prompt: string | undefined,
  context: AiContextPayload
): string {
  const pendingCount = context.pendingQuests.length;
  const completedCount = context.completedQuests.length;
  const totalCount = pendingCount + completedCount;
  const waterRemaining = Math.max(0, context.waterTargetMl - context.waterConsumedMl);

  switch (mode) {
    case 'daily_analysis': {
      const firstPending = context.pendingQuests[0];
      return `TODAY'S STATUS [OFFLINE TELEMETRY]
• Progress: ${context.todayProgress}% (${completedCount}/${totalCount} Quests)
• Workout: ${context.workoutProgress?.isCompleted ? 'COMPLETED' : `${context.workoutProgress?.completedCount || 0}/${context.workoutProgress?.totalCount || 0} Exercises Logged`}
• Hydration: ${(context.waterConsumedMl / 1000).toFixed(2)}L / ${(context.waterTargetMl / 1000).toFixed(2)}L (${waterRemaining > 0 ? `${waterRemaining}ml remaining` : 'Target reached!'})

AI INSIGHT
Hunter ${context.userName} has completed ${completedCount} objectives with an active streak of ${context.currentStreak} days. XP progression is steady at Level ${context.level}.

NEXT MOVE
${firstPending ? `1. Target next scheduled objective: "${firstPending.title}" (${firstPending.timeSpan || 'Scheduled'}).` : '1. All scheduled daily tasks cleared. Excellent discipline.'}
${!context.workoutProgress?.isCompleted ? '2. Execute pending exercise blocks.' : '2. Complete physical recovery protocols.'}
${waterRemaining > 0 ? `3. Hydrate with remaining ${waterRemaining}ml before evening.` : '3. Hydration objective satisfied.'}`;
    }

    case 'whats_next': {
      if (context.pendingQuests.length === 0) {
        return `WHAT'S NEXT [OFFLINE TELEMETRY]
All scheduled daily tasks for ${context.date} have been completed!
• Daily Quests: 100% Cleared
• Status: Ready for evening reflection and rest
• Tactical Directive: Rest, recover, and prepare for tomorrow's reset.`;
      }

      const nextTask = context.pendingQuests[0];
      return `WHAT'S NEXT [OFFLINE TELEMETRY]
Hunter Directive: Focus on current priority.
• Priority Objective: ${nextTask.title}
• Window / Category: ${nextTask.timeSpan || nextTask.category}
• Reward: +${nextTask.xp} XP upon completion
• Pending tasks remaining today: ${context.pendingQuests.length} tasks`;
    }

    case 'routine_analysis': {
      const enabledRoutine = context.routine.filter((r) => r.enabled);
      return `ROUTINE ANALYSIS [OFFLINE TELEMETRY]
• Total Configured Objectives: ${context.routine.length}
• Active Routine Slots: ${enabledRoutine.length}
• Categories Covered: Morning, College, Evening, Night

OBSERVATIONS
• Schedule Density: ${enabledRoutine.length > 8 ? 'High density daily schedule. Ensure adequate buffer between blocks.' : 'Balanced schedule pacing.'}
• Sleep & Recovery: Verify you maintain at least 7-8 hours between Night tasks and Morning wake-up.
• Organization Advice: Group physical training and hydration reminders closely for optimal habit stacking.`;
    }

    case 'session_plan': {
      const topic = context.sessionTopic || prompt || 'Focused Study & Skill Learning';
      return `SESSION PLAN: ${topic.toUpperCase()} [OFFLINE TELEMETRY]
Protocol: High-Focus 60-Minute Tactical Block

• Block 1 (00:00 - 00:25): Core concept acquisition & deep focus. No tab switching.
• Tactical Pause (00:25 - 00:30): 5-minute break. Stand up, stretch, hydrate.
• Block 2 (00:30 - 00:55): Active application, practice problem, or implementation.
• Review & Log (00:55 - 01:00): Summary notes & mark daily quest complete.`;
    }

    case 'weekly_analysis': {
      const weeklyRate = context.weeklyStats
        ? ('averageCompletion' in context.weeklyStats ? context.weeklyStats.averageCompletion : context.weeklyStats.completedRate)
        : context.todayProgress;
      return `WEEKLY SUMMARY [OFFLINE TELEMETRY]
• Current Streak: ${context.currentStreak} Days
• Hunter Level: Level ${context.level} (${context.totalXP} Total XP)
• Completion Rate: ${weeklyRate}%

OBSERVED PATTERNS
• Consistency: Maintaining active quest engagement across recent sessions.
• High-Impact Area: Consistency in daily hydration and routine check-ins compounds highest XP.

WHAT TO IMPROVE
• Focus on clearing Morning routine blocks early to create momentum for evening study.

NEXT WEEK SUGGESTION
• Protect your current ${context.currentStreak}-day streak and aim for 100% completion on workout days.`;
    }

    case 'workout_assistance': {
      return `WORKOUT ASSISTANCE [OFFLINE TELEMETRY]
• Workout Split: ${context.workoutTitle || 'Daily Workout'}
• Progress: ${context.workoutProgress?.completedCount || 0} / ${context.workoutProgress?.totalCount || 0} exercises completed
• State: ${context.workoutProgress?.isCompleted ? 'WORKOUT COMPLETE' : 'IN PROGRESS'}

TACTICAL PRINCIPLES
1. Controlled Tempo: 2-3 seconds eccentric lowering for maximum muscle recruitment.
2. Form Over Weight: Zero ego lifting — protect joints and maintain spinal neutrality.
3. Rest Intervals: 90-120 seconds between heavy compound sets; 60 seconds for accessories.`;
    }

    case 'water_insight': {
      return `HYDRATION INSIGHT [OFFLINE TELEMETRY]
• Target: ${context.waterTargetMl} ml (${(context.waterTargetMl / 1000).toFixed(1)}L)
• Consumed: ${context.waterConsumedMl} ml (${(context.waterConsumedMl / 1000).toFixed(1)}L)
• Remaining: ${waterRemaining} ml

GUIDANCE
${waterRemaining === 0 ? 'Hydration target reached for today! Maintain steady electrolyte balance.' : `Drink approximately ${Math.min(waterRemaining, 250)}ml across the next couple hours to hit your target smoothly.`}`;
    }

    default: {
      return `SCAR TELEMETRY
Hunter: ${context.userName} | Level ${context.level} | Streak: ${context.currentStreak} Days
Today: ${completedCount}/${totalCount} Quests (${context.todayProgress}%) | Water: ${(context.waterConsumedMl / 1000).toFixed(1)}L

Query: "${prompt || 'Status check'}"
SCAR is running in local telemetry mode with genuine app state.`;
    }
  }
}

/**
 * Public functions exported for UI consumption
 */
export async function generateDailyAnalysis(context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('daily_analysis', undefined, context);
}

export async function generateWhatsNext(context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('whats_next', undefined, context);
}

export async function generateRoutineSuggestion(context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('routine_analysis', undefined, context);
}

export async function generateStudySuggestion(topic: string, context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('session_plan', topic, { ...context, sessionTopic: topic });
}

export async function generateWeeklyAnalysis(context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('weekly_analysis', undefined, context);
}

export async function generateWorkoutAssistance(query: string, context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('workout_assistance', query, context);
}

export async function generateWaterInsight(context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('water_insight', undefined, context);
}

export async function chatWithSystemAI(prompt: string, context: AiContextPayload): Promise<AiServiceResponse> {
  return callAiServer('chat', prompt, context);
}

export const chatWithScar = chatWithSystemAI;
