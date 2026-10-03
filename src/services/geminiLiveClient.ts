/**
 * SCAR Gemini Live Client
 * Real-time bidirectional streaming client bridging browser audio and the backend Gemini Live session.
 */
import { QuestLifeContextPayload } from './questLifeToolHandler.ts';

export type LiveConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GeminiLiveClientCallbacks {
  onAudioChunk?: (base64Pcm: string) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: LiveConnectionStatus) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private status: LiveConnectionStatus = 'disconnected';
  private callbacks: GeminiLiveClientCallbacks = {};
  private reconnectTimer: any = null;
  private shouldStayConnected = false;
  private cachedContext: QuestLifeContextPayload | null = null;

  constructor(callbacks: GeminiLiveClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: GeminiLiveClientCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getStatus(): LiveConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: LiveConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(newStatus);
    }
  }

  /**
   * Connect to server-side Gemini Live session
   */
  public async connect(context?: QuestLifeContextPayload): Promise<boolean> {
    if (context) {
      this.cachedContext = context;
    }
    this.shouldStayConnected = true;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }

    this.setStatus('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/scar/live`;

      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        if (!this.ws) {
          this.setStatus('error');
          resolve(false);
          return;
        }

        const connectionTimeout = setTimeout(() => {
          if (this.status === 'connecting') {
            console.warn('[GeminiLiveClient] Connection timed out');
            this.disconnect();
            this.setStatus('error');
            resolve(false);
          }
        }, 8000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.setStatus('connected');

          // Send initial session setup with real QuestLife context
          if (this.cachedContext) {
            this.send({
              type: 'setup',
              context: this.cachedContext,
            });
          }
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
          } catch (err) {
            console.error('[GeminiLiveClient] Failed to parse message:', err);
          }
        };

        this.ws.onerror = (e) => {
          console.error('[GeminiLiveClient] WebSocket error:', e);
          clearTimeout(connectionTimeout);
          this.setStatus('error');
          if (this.callbacks.onError) {
            this.callbacks.onError('Gemini Live session connection error.');
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.setStatus('disconnected');

          if (this.shouldStayConnected) {
            // Auto reconnect after brief backoff if connection dropped unexpectedly
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              if (this.shouldStayConnected) {
                this.connect();
              }
            }, 2500);
          }
        };
      });
    } catch (err: any) {
      console.error('[GeminiLiveClient] Connection failed:', err);
      this.setStatus('error');
      if (this.callbacks.onError) {
        this.callbacks.onError(err?.message || 'Failed to initialize Live connection.');
      }
      return false;
    }
  }

  private handleServerMessage(msg: any): void {
    switch (msg.type) {
      case 'audio':
        if (msg.data && this.callbacks.onAudioChunk) {
          this.callbacks.onAudioChunk(msg.data);
        }
        break;

      case 'interrupted':
        if (this.callbacks.onInterrupted) {
          this.callbacks.onInterrupted();
        }
        break;

      case 'turn_complete':
        if (this.callbacks.onTurnComplete) {
          this.callbacks.onTurnComplete();
        }
        break;

      case 'transcript':
        if (msg.text && this.callbacks.onTranscript) {
          this.callbacks.onTranscript(msg.text, !!msg.isUser);
        }
        break;

      case 'error':
        if (this.callbacks.onError) {
          this.callbacks.onError(msg.message || 'SCAR Live encountered an error.');
        }
        break;

      case 'ready':
        // Session initialized & ready
        break;

      default:
        break;
    }
  }

  private send(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.error('[GeminiLiveClient] Send error:', err);
      }
    }
  }

  /**
   * Stream 16kHz PCM audio chunk to Gemini Live
   */
  public sendAudioChunk(base64Pcm: string): void {
    if (!base64Pcm || this.status !== 'connected') return;
    this.send({
      type: 'realtime_input',
      audio: base64Pcm,
    });
  }

  /**
   * Send text prompt / turn to Gemini Live
   */
  public sendTextMessage(text: string): void {
    if (!text || this.status !== 'connected') return;
    this.send({
      type: 'text_turn',
      text,
    });
  }

  /**
   * Signal user interruption to halt model output on server
   */
  public interrupt(): void {
    if (this.status !== 'connected') return;
    this.send({
      type: 'interrupt',
    });
  }

  /**
   * Update real QuestLife state for tool evaluations
   */
  public updateContext(context: QuestLifeContextPayload): void {
    this.cachedContext = context;
    if (this.status === 'connected') {
      this.send({
        type: 'update_context',
        context,
      });
    }
  }

  /**
   * Gracefully close connection
   */
  public disconnect(): void {
    this.shouldStayConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    this.setStatus('disconnected');
  }
}

export const geminiLiveClient = new GeminiLiveClient();
