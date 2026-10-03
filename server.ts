import express from 'express';
import http from 'http';
import path from 'path';
import 'dotenv/config';
import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import { SCAR_SYSTEM_INSTRUCTION, SCAR_LIVE_TOOLS, getScarSystemInstruction } from './src/services/scarLiveConfig.ts';
import { executeQuestLifeTool, QuestLifeContextPayload } from './src/services/questLifeToolHandler.ts';
import { processLocalScarQuery } from './src/services/scarDataService.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));
app.use('/assets/sounds', express.static(path.join(process.cwd(), 'public/assets/sounds'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'audio/mpeg');
  }
}));
app.use('/sounds', express.static(path.join(process.cwd(), 'public/assets/sounds'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'audio/mpeg');
  }
}));

// Lazy initialize Supabase Admin client for background auto-confirmation
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;

  try {
    supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return supabaseAdmin;
  } catch (err) {
    console.error('[Supabase Admin] Initialization error:', err);
    return null;
  }
}

// Lazy initialize GoogleGenAI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check & status endpoint
app.get('/api/ai/status', (_req, res) => {
  const client = getAiClient();
  const hasGroq = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY');
  res.json({
    online: !!client || hasGroq,
    model: client ? 'gemini-3.8-flash' : (hasGroq ? 'llama-3.3-70b-versatile' : 'local'),
    liveModel: 'gemini-3.8-live',
    hasLiveApi: !!client,
    systemStatus: (client || hasGroq) ? 'OPERATIONAL' : 'LOCAL_ONLY',
    name: 'SCAR',
    providers: {
      geminiLive: {
        available: !!client,
        model: 'gemini-3.8-live',
        voice: 'Charon (Male Indian Persona)',
      },
      gemini: {
        available: !!client,
        model: 'gemini-3.8-flash',
      },
      groq: {
        available: hasGroq,
        model: 'llama-3.3-70b-versatile',
        configured: hasGroq,
      },
      local: {
        available: true,
        name: 'SCAR Local Telemetry Engine',
      },
    },
  });
});

// 2. Auto-confirm user email endpoint (removes email confirmation requirement for existing accounts)
app.post('/api/auth/auto-confirm', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const admin = getSupabaseAdmin();

    if (!admin) {
      // If service role key is not configured, inform the caller gracefully
      return res.json({
        success: false,
        configured: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY not configured on server.',
      });
    }

    // Lookup user in auth.users by email
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      console.warn('[Auto-Confirm] User lookup failed:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    const targetUser = (data.users as any[]).find((u: any) => u.email?.toLowerCase() === trimmedEmail);
    if (!targetUser) {
      return res.json({ success: false, error: 'User not found.' });
    }

    // Confirm user's email if not already confirmed
    if (!targetUser.email_confirmed_at) {
      const { error: updateError } = await admin.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });

      if (updateError) {
        console.warn('[Auto-Confirm] Confirmation failed:', updateError.message);
        return res.status(500).json({ success: false, error: updateError.message });
      }

      console.log(`[Auto-Confirm] Auto-confirmed email for user: ${trimmedEmail} (ID: ${targetUser.id})`);
    }

    return res.json({ success: true, confirmed: true });
  } catch (err: any) {
    console.error('[Auto-Confirm] Server error:', err?.message || err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 2. SCAR Generation Endpoint
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { mode, prompt, context, provider, conversationHistory, isVoice } = req.body || {};

    // Check availability based on requested provider
    const isGroq = provider === 'groq';
    const groqKey = process.env.GROQ_API_KEY;
    const hasGroq = !!(groqKey && groqKey !== 'MY_GROQ_API_KEY');
    const client = getAiClient();

    if (isGroq) {
      if (!groqKey || groqKey === 'MY_GROQ_API_KEY') {
        return res.status(503).json({
          success: false,
          notConfigured: true,
          error: 'GROQ_API_KEY is not configured on the server.',
        });
      }
    } else if (!client) {
      return res.status(503).json({
        success: false,
        offline: true,
        error: 'SCAR external model is currently offline. Telemetry handled locally.',
      });
    }

    const isVoiceMode = isVoice || mode === 'voice_chat' || mode === 'chat';
    const effectiveLanguage: 'en' | 'te' = (req.body.responseLanguage === 'te' || context?.responseLanguage === 'te') ? 'te' : 'en';

    const systemInstruction = `You are SCAR, the futuristic, intelligent, calm, confident, and conversational personal companion of QuestLife for Hunter Charan.
You function like a real cinematic AI assistant: natural, conversational, context-aware, fast, and voice-driven. You are NOT a mechanical chatbot that reads text reports aloud.

VOICE & CONVERSATIONAL DIRECTIVES:
1. Speak naturally like a real intelligent companion. Responses will be spoken aloud to the user.
2. NEVER use uppercase section headers (e.g. do NOT write "TODAY'S STATUS", "AI INSIGHT", "NEXT MOVE").
3. DO NOT use markdown bolding (**text**), bullet points (* or -), or numbered lists. Structure your answers in clean, natural conversational sentences with normal punctuation.
4. STRICT LANGUAGE ENFORCEMENT:
${effectiveLanguage === 'te'
  ? `   - Respond EXCLUSIVELY in natural, polite, fluent Telugu (తెలుగు).
   - Even if the user asks in English or mixed language, answer in TELUGU ONLY.
   - MULTI-LANGUAGE OUTPUTS ARE STRICTLY FORBIDDEN: never mix English and Telugu sentences, and never output translations.
   - The ONLY time to switch to English is if the user gives an explicit command: "Speak in English", "English lo matladu", etc.`
  : `   - Respond EXCLUSIVELY in clear, confident, polite Indian English.
   - English is your permanent default language.
   - Even if the user asks in Telugu or uses Telugu/Tenglish words (e.g. "Na current rank entha?", "today tasks enti?", "Na streak entha?"), understand them perfectly but ANSWER IN ENGLISH ONLY.
   - MULTI-LANGUAGE OUTPUTS ARE STRICTLY FORBIDDEN: never mix English and Telugu sentences, and never output translations.
   - NEVER spontaneously switch to Telugu.
   - The ONLY time to switch to Telugu is if the user gives an explicit command: "Speak in Telugu", "Telugu lo matladu", etc.`}
5. Wake Phrase:
   - If the user says or asks "Scar", respond exactly: "Yes, Hunter Charan?"
6. Addressing the user:
   - Address the user as "Hunter Charan" or "Charan" naturally when starting or greeting.
   - Do NOT repeat "Hunter Charan" in every sentence or turn. Keep it natural.
7. Tone & Natural Acknowledgements:
   - Use natural conversational transitions and occasional short acknowledgements such as "Yeah," "Alright," "Got it," "Sure," or their natural equivalents.
   - Avoid repetitive filler phrases like "How can I help you today?".
8. Conversational Context & Follow-Ups:
   - Understand follow-up questions from the ongoing conversation history (e.g. "What about my level?", "Did I complete that?", "What next?").
9. Data Integrity & Real Telemetry:
   - Strictly refer to the real QuestLife context provided below.
   - Never fabricate or hallucinate completed tasks, XP, levels, rank, or workouts.
   - If requested data is not tracked in QuestLife (e.g. calories, heart rate, sleep), state that calmly and naturally.
10. Empathetic Support:
   - If the user expresses fatigue, stress, or discouragement, respond empathetically and calmly. Recovery is part of discipline.`;

    let userPrompt = '';

    if (mode === 'daily_analysis') {
      userPrompt = `Analyze today's hunter performance based STRICTLY on this context:
Date: ${context?.date}
Time: ${context?.currentTime}
Hunter: ${context?.userName} (Level ${context?.level}, ${context?.totalXP} Total XP, Streak: ${context?.currentStreak} days)
Daily Quest Progress: ${context?.todayProgress}% (${context?.completedQuests?.length || 0} completed, ${context?.pendingQuests?.length || 0} pending)
Completed Quests: ${context?.completedQuests?.join(', ') || 'None'}
Pending Quests: ${context?.pendingQuests?.map((q: any) => `${q.title} (${q.timeSpan || 'Scheduled'})`).join(', ') || 'None'}
Workout: ${context?.workoutTitle || 'None'} - ${context?.workoutProgress?.isCompleted ? 'COMPLETED' : `${context?.workoutProgress?.completedCount || 0}/${context?.workoutProgress?.totalCount || 0} exercises`}
Hydration: ${(context?.waterConsumedMl || 0) / 1000}L / ${(context?.waterTargetMl || 3000) / 1000}L

Provide a crisp, conversational voice summary of today's progress, an observant insight, and 1-2 practical next moves in spoken sentences without markdown headers or bullets.`;
    } else if (mode === 'whats_next') {
      userPrompt = `Determine the immediate next action for Hunter ${context?.userName}.
Current Time: ${context?.currentTime}
Pending Quests: ${context?.pendingQuests?.map((q: any) => `${q.title} [Time: ${q.timeSpan || 'Anytime'}]`).join('; ') || 'All daily quests completed!'}
Workout Status: ${context?.workoutProgress?.isCompleted ? 'Workout Finished' : `Workout pending (${context?.workoutProgress?.completedCount || 0}/${context?.workoutProgress?.totalCount || 0})`}
Water: ${context?.waterConsumedMl || 0}ml of ${context?.waterTargetMl || 3000}ml

Identify the single most urgent or clock-aligned pending task. If all tasks are completed, acknowledge today's victory and suggest healthy rest or recovery. Speak directly and concisely without bullet points.`;
    } else if (mode === 'routine_analysis') {
      userPrompt = `Analyze Hunter ${context?.userName}'s daily routine schedule for potential optimizations:
Configured Routine:
${context?.routine?.map((r: any) => `- [${r.enabled ? 'ACTIVE' : 'DISABLED'}] ${r.timeSpan}: ${r.title} (${r.category})`).join('\n') || 'No routine configured'}

Check for scheduling compressions, long gaps, or sleep sufficiency. Speak conversationally.`;
    } else if (mode === 'session_plan') {
      const topic = context?.sessionTopic || prompt || 'Study / Skill Learning';
      userPrompt = `Generate a focused, tactical session plan for: "${topic}".
Hunter: ${context?.userName}
Time of Day: ${context?.currentTime}
Provide a natural conversational breakdown with Pomodoro blocks.`;
    } else if (mode === 'weekly_analysis') {
      userPrompt = `Review Hunter ${context?.userName}'s weekly consistency:
Current Streak: ${context?.currentStreak} Days
Weekly Quest Completion Rate: ${context?.weeklyStats?.completedRate || context?.todayProgress}%
Total Completed Quests: ${context?.weeklyStats?.totalQuestsFinished || context?.completedQuests?.length || 0}
XP Level: Level ${context?.level} (${context?.totalXP} XP)

Provide a conversational review of weekly progress in natural spoken sentences.`;
    } else if (mode === 'workout_assistance') {
      userPrompt = `Summarize and advise on today's workout protocol:
Workout: ${context?.workoutTitle || 'Daily Workout'}
Progress: ${context?.workoutProgress?.completedCount || 0} of ${context?.workoutProgress?.totalCount || 0} exercises completed
Status: ${context?.workoutProgress?.isCompleted ? 'All exercises logged' : 'Exercises in progress'}
User Query: ${prompt || 'Provide tactical execution and recovery advice'}

Respond conversationally with practical coaching.`;
    } else if (mode === 'water_insight') {
      userPrompt = `Analyze hydration state:
Consumed: ${context?.waterConsumedMl || 0} ml
Target: ${context?.waterTargetMl || 3000} ml
Remaining: ${Math.max(0, (context?.waterTargetMl || 3000) - (context?.waterConsumedMl || 0))} ml
Current Time: ${context?.currentTime}

Provide concise, friendly hydration pacing advice for the rest of the day.`;
    } else if (mode === 'body_scan_comparison') {
      const prevDataUrl = context?.previousImage || '';
      const currDataUrl = context?.currentImage || '';

      const comparisonSystemInstruction = `You are the QuestLife Body Progress Visual Analyzer.
Compare the user's previous progress photo with their current progress photo.
CRITICAL RULES:
1. Do NOT compare the user with other people.
2. Do NOT classify the user's body as good/bad/perfect.
3. Do NOT estimate body-fat percentage.
4. Do NOT diagnose health conditions.
5. Do NOT use appearance to determine Hunter Rank or XP.
6. Analyze ONLY observable visual changes in these exact categories:
   - Chest: "visible change" | "no clear change"
   - Arms: "visible change" | "no clear change"
   - Shoulders: "visible change" | "no clear change"
   - Abdomen: "visible change" | "no clear change"
   - Overall: "visible changes detected" | "no clear changes detected"
7. If lighting, pose, camera distance, clothing, or image quality makes comparison unreliable, explicitly set confidenceReliable to false and unreliableReason to:
   "System could not confidently determine visual changes because the photos differ in lighting/pose/position."
   Do NOT invent changes.

You MUST respond strictly with valid JSON:
{
  "confidenceReliable": boolean,
  "unreliableReason": string | null,
  "chest": "visible change" | "no clear change",
  "arms": "visible change" | "no clear change",
  "shoulders": "visible change" | "no clear change",
  "abdomen": "visible change" | "no clear change",
  "overall": "visible changes detected" | "no clear changes detected",
  "summary": string
}`;

      const parts: any[] = [
        {
          text: 'Compare Photo 1 (Previous Scan) and Photo 2 (Current Scan) according to the system instructions. Provide structured visual change assessment.',
        },
      ];

      // Parse inline base64 images if present
      if (prevDataUrl.includes('base64,')) {
        const [meta, data] = prevDataUrl.split('base64,');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/jpeg';
        parts.push({
          inlineData: {
            mimeType,
            data,
          },
        });
      }

      if (currDataUrl.includes('base64,')) {
        const [meta, data] = currDataUrl.split('base64,');
        const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/jpeg';
        parts.push({
          inlineData: {
            mimeType,
            data,
          },
        });
      }

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          systemInstruction: comparisonSystemInstruction,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const outputText = response.text || '{}';
      let parsed = null;
      try {
        parsed = JSON.parse(outputText);
      } catch {
        // Fallback handled by client
      }

      return res.json({
        success: true,
        response: outputText,
        parsedComparison: parsed,
        mode,
      });
    } else {
      // General Voice / Chat Mode
      userPrompt = `User Spoke: "${prompt || 'Status check'}"

Real QuestLife Application Context:
- Hunter Name: ${context?.userName || 'Charan'}
- Current Level: Level ${context?.level || 1} (${context?.levelDetails?.rank || 'E-RANK'})
- Total XP: ${context?.totalXP || 0} XP (Need ${context?.levelDetails?.xpToNextLevel || 500} XP to next level)
- Today Date: ${context?.date}, Time: ${context?.currentTime}
- Today's Quests Progress: ${context?.todayProgress || 0}%
- Completed Tasks: ${context?.completedQuests?.length ? context.completedQuests.join(', ') : 'None completed yet today'}
- Pending Tasks: ${context?.pendingQuests?.length ? context.pendingQuests.map((q: any) => `${q.title} (+${q.xp} XP)`).join(', ') : 'All daily quests cleared'}
- Workout: ${context?.workoutTitle || 'Routine'} (${context?.workoutProgress?.isCompleted ? 'COMPLETED' : `${context?.workoutProgress?.completedCount || 0}/${context?.workoutProgress?.totalCount || 0} exercises completed`})
- Hydration: ${context?.waterConsumedMl || 0}ml of ${context?.waterTargetMl || 3000}ml (${Math.round(((context?.waterConsumedMl || 0) / (context?.waterTargetMl || 3000)) * 100)}%)
- Streak: ${context?.currentStreak || 0} Consecutive Days

Answer naturally as SCAR in a conversational voice style. If the user asks in Telugu or Tenglish, reply in kind. Never use bullet points, asterisks, or markdown.`;
    }

    if (isGroq && groqKey) {
      const groqMessages: any[] = [{ role: 'system', content: systemInstruction }];

      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        for (const turn of conversationHistory.slice(-6)) {
          groqMessages.push({
            role: turn.role === 'model' || turn.role === 'assistant' ? 'assistant' : 'user',
            content: turn.text,
          });
        }
      }

      groqMessages.push({ role: 'user', content: userPrompt });

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          temperature: 0.4,
          max_tokens: 450,
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return res.status(groqRes.status).json({
          success: false,
          error: `Groq API Error: ${errText}`,
        });
      }

      const groqData = (await groqRes.json()) as any;
      const outputText = groqData.choices?.[0]?.message?.content || '';
      return res.json({
        success: true,
        response: outputText,
        mode,
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
      });
    }

    // Default to Gemini API with conversation history support
    const contents: any[] = [];

    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const turn of conversationHistory.slice(-6)) {
        contents.push({
          role: turn.role === 'model' || turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    let outputText = '';
    let usedModel = 'gemini-3.8-flash';
    let usedProvider = 'gemini';

    try {
      const response = await client!.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.4,
          maxOutputTokens: 450,
        },
      });
      outputText = response.text || '';
    } catch (primaryErr: any) {
      console.log('[SCAR Engine] Primary model rate-limited or quota reached, engaging resilient fallback...');

      // 1. Try Groq if configured as the primary high-capacity fallback
      if (hasGroq && groqKey) {
        try {
          const groqMessages = [
            { role: 'system', content: systemInstruction },
            ...(Array.isArray(conversationHistory)
              ? conversationHistory.slice(-6).map((turn: any) => ({
                  role: turn.role === 'model' || turn.role === 'assistant' ? 'assistant' : 'user',
                  content: turn.text || '',
                }))
              : []),
            { role: 'user', content: userPrompt },
          ];

          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: groqMessages,
              temperature: 0.4,
              max_tokens: 450,
            }),
          });

          if (groqRes.ok) {
            const groqData = (await groqRes.json()) as any;
            const groqOutput = groqData.choices?.[0]?.message?.content || '';
            if (groqOutput) {
              return res.json({
                success: true,
                response: groqOutput,
                mode,
                model: 'llama-3.3-70b-versatile',
                provider: 'groq',
              });
            }
          }
        } catch (_) {}
      }

      // 2. Try Gemini alternative models
      let secondarySuccess = false;
      const fallbackModels = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];
      for (const fallbackModel of fallbackModels) {
        try {
          const fallbackRes = await client!.models.generateContent({
            model: fallbackModel,
            contents,
            config: {
              systemInstruction,
              temperature: 0.4,
              maxOutputTokens: 450,
            },
          });
          outputText = fallbackRes.text || '';
          if (outputText) {
            usedModel = fallbackModel;
            secondarySuccess = true;
            break;
          }
        } catch (_) {
          // Continue to next fallback model
        }
      }

      // 3. Authentic local SCAR telemetry fallback if all external models are exhausted
      if (!secondarySuccess || !outputText) {
        console.log('[SCAR Engine] Serving response via SCAR authentic local telemetry engine.');
        const local = processLocalScarQuery(prompt || '', context || {});
        return res.json({
          success: true,
          response: local.text,
          mode,
          model: 'scar-local-telemetry',
          provider: 'local',
        });
      }
    }

    return res.json({
      success: true,
      response: outputText,
      mode,
      model: usedModel,
      provider: usedProvider,
    });
  } catch (error: any) {
    console.error('[System AI Error]:', error?.stack || error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'AI connection unavailable. Please try again.',
      stack: error?.stack,
    });
  }
});

// Vite Middleware for SPA serving & Gemini Live WebSocket Server
async function startServer() {
  const httpServer = http.createServer(app);

  // Initialize WebSocket Server for SCAR Gemini Live Session
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const { pathname } = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (pathname === '/api/scar/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      console.warn('[WebSocket Upgrade Error]:', err);
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[SCAR Live WS] Client connected to SCAR Live session');

    const client = getAiClient();
    if (!client) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'GEMINI_API_KEY is not configured on the server. Falling back to standard voice mode.',
        })
      );
      clientWs.close();
      return;
    }

    let sessionContext: QuestLifeContextPayload = {};
    let liveSession: any = null;
    let isSessionAlive = true;

    try {
      const initialLanguage = (sessionContext.responseLanguage === 'te') ? 'te' : 'en';
      liveSession = await client.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: getScarSystemInstruction(initialLanguage),
          tools: SCAR_LIVE_TOOLS as any,
        },
        callbacks: {
          onopen: () => {
            console.log('[SCAR Live Session] Connected to Gemini Live');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready' }));
            }
          },
          onmessage: (msg: any) => {
            if (!isSessionAlive || clientWs.readyState !== WebSocket.OPEN) return;

            // 1. Tool Call Execution from Gemini Live
            if (msg.toolCall?.functionCalls) {
              const functionResponses: any[] = [];
              for (const call of msg.toolCall.functionCalls) {
                console.log(`[SCAR Live Tool] Executing: ${call.name}`, call.args);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'tool_executing',
                      toolName: call.name,
                    })
                  );
                }
                const result = executeQuestLifeTool(call.name, call.args, sessionContext);
                functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: { output: result },
                });
              }
              try {
                liveSession?.sendToolResponse({ functionResponses });
              } catch (toolErr) {
                console.error('[SCAR Live Tool Error]:', toolErr);
              }
            }

            // 2. Audio Chunks from Gemini Live
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'audio',
                      data: part.inlineData.data,
                      mimeType: 'audio/pcm;rate=24000',
                    })
                  );
                }
                if (part.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'transcript',
                      text: part.text,
                      isUser: false,
                    })
                  );
                }
              }
            }

            // 3. User & Model Transcriptions
            if (msg.serverContent?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'transcript',
                  text: msg.serverContent.outputTranscription.text,
                  isUser: false,
                })
              );
            }

            if (msg.serverContent?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'transcript',
                  text: msg.serverContent.inputTranscription.text,
                  isUser: true,
                })
              );
            }

            // 4. User Interruption / Barge-in
            if (msg.serverContent?.interrupted) {
              console.log('[SCAR Live] User interrupted model turn');
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            // 5. Turn Complete (model finished current response)
            if (msg.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }
          },
          onerror: (err: any) => {
            console.error('[SCAR Live Session Error]:', err?.message || err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err?.message || 'Gemini Live session error',
                })
              );
            }
          },
          onclose: (e: any) => {
            console.log('[SCAR Live Session] Closed:', e?.code, e?.reason);
            isSessionAlive = false;
          },
        },
      });

      // Confirm ready status to client
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'ready' }));
      }
    } catch (connectErr: any) {
      console.error('[SCAR Live Connect Error]:', connectErr?.message || connectErr);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            message: `Failed to establish Gemini Live connection: ${connectErr?.message || 'unknown error'}`,
          })
        );
      }
      return;
    }

    clientWs.on('message', (raw: any) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'ping') {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          return;
        }

        if (data.type === 'setup' || data.type === 'update_context') {
          sessionContext = { ...sessionContext, ...data.context };
        } else if (data.type === 'lock_language' && data.language) {
          const targetLang = data.language === 'te' ? 'te' : 'en';
          sessionContext = { ...sessionContext, responseLanguage: targetLang };
          console.log(`[SCAR Live WS] Locked response language: ${targetLang}`);
          if (liveSession && isSessionAlive) {
            try {
              liveSession.sendClientContent({
                turns: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: targetLang === 'te'
                          ? '[SYSTEM DIRECTIVE: The user has explicitly selected TELUGU. From now on, answer all responses exclusively in natural, polite Telugu. Never speak English unless explicitly commanded. MULTI-LANGUAGE OUTPUTS ARE STRICTLY FORBIDDEN: never output mixed English and Telugu sentences or translations.]'
                          : '[SYSTEM DIRECTIVE: The user has explicitly selected ENGLISH. From now on, answer all responses exclusively in clear Indian English. Even if the user speaks Telugu, reply in English only. MULTI-LANGUAGE OUTPUTS ARE STRICTLY FORBIDDEN: never output mixed Telugu and English sentences or translations.]',
                      },
                    ],
                  },
                ],
                turnComplete: false,
              });
            } catch (dirErr) {
              console.warn('[SCAR Live WS] Directive send error:', dirErr);
            }
          }
        } else if (data.type === 'realtime_input' && data.audio) {
          if (liveSession && isSessionAlive) {
            try {
              liveSession.sendRealtimeInput({
                audio: {
                  data: data.audio,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } catch (sendErr) {
              console.warn('[SCAR Live WS] Send realtime audio error:', sendErr);
            }
          }
        } else if (data.type === 'audio_stream_end') {
          if (liveSession && isSessionAlive) {
            try {
              liveSession.sendRealtimeInput({
                audioStreamEnd: true,
              });
            } catch (endErr) {
              console.warn('[SCAR Live WS] Send audioStreamEnd error:', endErr);
            }
          }
        } else if (data.type === 'text_turn' && data.text) {
          if (liveSession && isSessionAlive) {
            try {
              liveSession.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: data.text }] }],
                turnComplete: true,
              });
            } catch (sendErr) {
              console.warn('[SCAR Live WS] Send text turn error:', sendErr);
            }
          }
        } else if (data.type === 'interrupt') {
          console.log('[SCAR Live WS] Client interrupt signal received');
        }
      } catch (parseErr) {
        console.error('[SCAR Live WS] Message parse error:', parseErr);
      }
    });

    clientWs.on('close', () => {
      console.log('[SCAR Live WS] Client disconnected');
      isSessionAlive = false;
      if (liveSession) {
        try {
          liveSession.close();
        } catch (_) {}
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.send(`
// SCAR Clean HMR Mock Client - Zero WebSocket errors in sandboxed AI Studio preview
class DummyHot {
  accept() {}
  dispose() {}
  prune() {}
  decline() {}
  invalidate() {}
  on() {}
  off() {}
  send() {}
  data = {}
}
export function createHotContext() { return new DummyHot(); }
export function updateStyle(id, content) {
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = document.getElementById(id);
  if (style) style.remove();
}
export function injectQuery(url) { return url; }
export class ErrorOverlay extends HTMLElement {}
      `);
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`QuestLife server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
