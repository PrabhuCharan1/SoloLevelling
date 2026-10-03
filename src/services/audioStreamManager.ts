/**
 * SCAR Audio Stream Manager
 * Low-latency bidirectional Web Audio streaming for Gemini Live.
 * - Input: Captures microphone audio, resamples to 16kHz 16-bit PCM, base64 encodes for streaming.
 * - Output: Plays 24kHz raw PCM chunks from Gemini with gapless scheduling & instant interruption.
 */

import { speakingGate } from './speakingGate.ts';

export class AudioStreamManager {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isCapturing = false;

  // Playback queue & scheduling
  private nextPlayTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying = false;
  private endTimeout: any = null;

  // Callbacks
  public onPcmChunk: ((base64Pcm: string) => void) | null = null;
  public onInputVolume: ((vol: number) => void) | null = null;
  public onOutputVolume: ((vol: number) => void) | null = null;
  public onPlaybackStarted: (() => void) | null = null;
  public onPlaybackEnded: (() => void) | null = null;
  public onUserBargeIn: (() => void) | null = null;

  /**
   * Resamples arbitrary input sample rate (e.g. 44.1k/48k) to 16kHz 16-bit linear PCM
   */
  private downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
    if (inputSampleRate === 16000) {
      const output = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return output;
    }

    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(input.length / ratio);
    const output = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const index = Math.floor(pos);
      const fraction = pos - index;
      const s0 = input[index] || 0;
      const s1 = input[index + 1] !== undefined ? input[index + 1] : s0;
      const sample = s0 + fraction * (s1 - s0);
      const clamped = Math.max(-1, Math.min(1, sample));
      output[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    return output;
  }

  /**
   * Request microphone permission and prepare audio contexts
   */
  public async initMicrophone(): Promise<boolean> {
    try {
      if (this.mediaStream) return true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
      return true;
    } catch (err) {
      console.error('[AudioStreamManager] Failed to obtain microphone access:', err);
      return false;
    }
  }

  /**
   * Start streaming microphone PCM to Gemini Live
   */
  public async startCapture(): Promise<boolean> {
    if (this.isCapturing) return true;

    const granted = await this.initMicrophone();
    if (!granted || !this.mediaStream) return false;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx();

      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      const inputSampleRate = this.inputAudioCtx.sampleRate || 48000;
      this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      // ScriptProcessor with 2048 buffer size for ultra-low latency streaming
      const bufferSize = 2048;
      this.processorNode = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isCapturing) return;

        // SPEAKING GATE: Zero input sent while SCAR is speaking or during 500ms cooldown
        if (
          speakingGate.shouldBlockInput() ||
          (typeof window !== 'undefined' && (window as any).isScarSpeaking === true) ||
          this.isPlaying
        ) {
          if (this.onInputVolume) {
            this.onInputVolume(0);
          }
          return;
        }

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate RMS volume for real-time visualizer
        let sum = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sum += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sum / inputChannelData.length);
        const volume = Math.min(1, rms * 4.5);
        if (this.onInputVolume) {
          this.onInputVolume(volume);
        }

        // Barge-in check: If SCAR is currently vocalizing and user speaks with volume, interrupt SCAR instantly
        if (this.isPlaying && volume > 0.38) {
          this.stopPlayback();
          if (this.onUserBargeIn) {
            this.onUserBargeIn();
          }
        }

        // Downsample input audio to 16kHz PCM
        const pcm16 = this.downsampleTo16k(inputChannelData, inputSampleRate);

        // Convert Int16Array to Base64 binary string
        const buffer = new Uint8Array(pcm16.buffer);
        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64 = btoa(binary);

        if (this.onPcmChunk) {
          this.onPcmChunk(base64);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.inputAudioCtx.destination);
      this.isCapturing = true;
      return true;
    } catch (err) {
      console.error('[AudioStreamManager] Failed to start capture:', err);
      return false;
    }
  }

  /**
   * Stop capturing microphone audio
   */
  public stopCapture(): void {
    this.isCapturing = false;

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (_) {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch (_) {}
      this.inputAudioCtx = null;
    }

    if (this.onInputVolume) {
      this.onInputVolume(0);
    }
  }

  /**
   * Initialize or get the 24kHz output AudioContext for Gemini Live playback
   */
  private getOutputContext(): AudioContext {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtx();
      this.nextPlayTime = 0;
    }
    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume().catch((e) => console.warn('AudioContext resume warning:', e));
    }
    return this.outputAudioCtx;
  }

  /**
   * Play incoming 24kHz PCM chunk from Gemini Live
   */
  public playPcmChunk(base64Data: string): void {
    if (!base64Data) return;

    // Explicitly set isScarSpeaking = true and close speaking gate when Gemini audio starts
    speakingGate.onGeminiAudioStart();
    if (typeof window !== 'undefined') {
      (window as any).isScarSpeaking = true;
    }

    try {
      const ctx = this.getOutputContext();

      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 16-bit PCM little endian
      const pcm16 = new Int16Array(bytes.buffer);
      const numSamples = pcm16.length;
      if (numSamples === 0) return;

      const audioBuffer = ctx.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);

      // Convert Int16 to Float32 [-1.0, 1.0]
      let sum = 0;
      for (let i = 0; i < numSamples; i++) {
        const floatVal = pcm16[i] / 32768.0;
        channelData[i] = floatVal;
        sum += floatVal * floatVal;
      }

      const rms = Math.sqrt(sum / numSamples);
      if (this.onOutputVolume) {
        this.onOutputVolume(Math.min(1, rms * 4));
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      // Schedule immediately or seamlessly queue right after previous chunk
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);

      this.nextPlayTime = startTime + audioBuffer.duration;
      this.activeSources.add(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        if (this.onPlaybackStarted) {
          this.onPlaybackStarted();
        }
      }

      // Track playback end
      if (this.endTimeout) {
        clearTimeout(this.endTimeout);
      }
      const timeUntilEnd = Math.max(0, (this.nextPlayTime - currentTime) * 1000) + 120;
      this.endTimeout = setTimeout(() => {
        this.isPlaying = false;
        this.activeSources.clear();
        speakingGate.onPlaybackFinished(() => {
          if (this.onPlaybackEnded) {
            this.onPlaybackEnded();
          }
          if (this.onOutputVolume) {
            this.onOutputVolume(0);
          }
        });
      }, timeUntilEnd);

      source.onended = () => {
        this.activeSources.delete(source);
      };
    } catch (err) {
      console.error('[AudioStreamManager] Error decoding/playing PCM chunk:', err);
    }
  }

  /**
   * Stop/Interrupt all playback immediately (Barge-in / User Interruption)
   */
  public stopPlayback(): void {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    }
    this.activeSources.clear();

    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    } else {
      this.nextPlayTime = 0;
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      if (this.onPlaybackEnded) {
        this.onPlaybackEnded();
      }
    }

    if (this.onOutputVolume) {
      this.onOutputVolume(0);
    }
  }

  public isSpeaking(): boolean {
    return this.isPlaying;
  }

  public isListening(): boolean {
    return this.isCapturing;
  }

  public destroy(): void {
    this.stopCapture();
    this.stopPlayback();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch (_) {}
      this.outputAudioCtx = null;
    }
  }
}

export const audioStreamManager = new AudioStreamManager();
