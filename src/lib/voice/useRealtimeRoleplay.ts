'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Live speech-to-speech roleplay over WebRTC.
 *
 * The browser negotiates directly with OpenAI Realtime using a short-lived
 * credential minted by our server, so audio never round-trips through us and
 * latency stays low enough to feel like a real conversation — the rep can
 * interrupt the homeowner, and silence ends their turn.
 *
 * Transcripts are surfaced as they finalize so the session can be scored even
 * if the connection drops partway through.
 */

export type RoleplayState =
  | 'idle'
  | 'requesting-mic'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'ended'
  | 'error';

export interface Turn {
  role: 'rep' | 'character';
  text: string;
  offsetMs: number;
}

interface Options {
  onTurn?: (turn: Turn) => void;
  onError?: (message: string) => void;
}

export interface RealtimeRoleplay {
  state: RoleplayState;
  turns: Turn[];
  error: string | null;
  /** True when the rep's microphone is muted. */
  muted: boolean;
  start: (scenarioId: string) => Promise<string | null>;
  stop: () => void;
  toggleMute: () => void;
  /** Audio element the character's voice plays through. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const REALTIME_URL = 'https://api.openai.com/v1/realtime';
/** Turns are flushed to the server in small batches to survive a drop. */
const FLUSH_INTERVAL_MS = 5000;

export function useRealtimeRoleplay(options: Options = {}): RealtimeRoleplay {
  const [state, setState] = useState<RoleplayState>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const pendingRef = useRef<Turn[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { onTurn, onError } = options;

  const fail = useCallback(
    (message: string) => {
      setError(message);
      setState('error');
      onError?.(message);
    },
    [onError],
  );

  /** Persists buffered turns. Failures are non-fatal; they retry next tick. */
  const flush = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || pendingRef.current.length === 0) return;

    const batch = pendingRef.current.splice(0, pendingRef.current.length);
    try {
      await fetch('/api/practice/turns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, turns: batch }),
      });
    } catch {
      // Put them back so the next flush tries again.
      pendingRef.current.unshift(...batch);
    }
  }, []);

  const recordTurn = useCallback(
    (role: Turn['role'], text: string) => {
      const clean = text.trim();
      if (!clean) return;

      const turn: Turn = { role, text: clean, offsetMs: Date.now() - startedAtRef.current };
      setTurns((prev) => [...prev, turn]);
      pendingRef.current.push(turn);
      onTurn?.(turn);
    },
    [onTurn],
  );

  const teardown = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    channelRef.current?.close();
    channelRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  const stop = useCallback(() => {
    teardown();
    void flush();
    setState((prev) => (prev === 'error' ? prev : 'ended'));
  }, [teardown, flush]);

  const start = useCallback(
    async (scenarioId: string): Promise<string | null> => {
      setError(null);
      setTurns([]);
      pendingRef.current = [];
      setState('requesting-mic');

      // 1. Microphone first: if this is denied, nothing else is worth doing.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
      } catch {
        fail('mic-denied');
        return null;
      }

      setState('connecting');

      // 2. Ephemeral credential and session row.
      let credential: { sessionId: string; clientSecret?: string; model?: string };
      try {
        const res = await fetch('/api/practice/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId, mode: 'voice' }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message ?? payload.error ?? 'session-failed');
        credential = payload;
      } catch (err) {
        teardown();
        fail(err instanceof Error ? err.message : 'session-failed');
        return null;
      }

      if (!credential.clientSecret) {
        teardown();
        fail('session-failed');
        return null;
      }

      sessionIdRef.current = credential.sessionId;
      startedAtRef.current = Date.now();

      // 3. WebRTC to OpenAI.
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.ontrack = (event) => {
          if (audioRef.current) {
            audioRef.current.srcObject = event.streams[0];
            void audioRef.current.play().catch(() => {
              // Autoplay can be blocked; the UI offers a tap-to-hear control.
            });
          }
        };

        pc.addTrack(stream.getAudioTracks()[0], stream);

        const channel = pc.createDataChannel('oai-events');
        channelRef.current = channel;
        channel.onmessage = (event) => handleServerEvent(event.data);

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            teardown();
            void flush();
            fail('connection-lost');
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const model = credential.model ?? 'gpt-4o-realtime-preview';
        const res = await fetch(`${REALTIME_URL}?model=${encodeURIComponent(model)}`, {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${credential.clientSecret}`,
            'Content-Type': 'application/sdp',
          },
        });

        if (!res.ok) throw new Error('sdp-exchange-failed');

        await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });

        setState('listening');
        flushTimerRef.current = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

        return credential.sessionId;
      } catch {
        teardown();
        fail('connection-failed');
        return null;
      }

      function handleServerEvent(raw: string) {
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(raw);
        } catch {
          return;
        }

        switch (event.type) {
          // The rep's speech, once Whisper finalizes it.
          case 'conversation.item.input_audio_transcription.completed':
            recordTurn('rep', String(event.transcript ?? ''));
            break;

          // The character's line, once it finishes speaking.
          case 'response.audio_transcript.done':
            recordTurn('character', String(event.transcript ?? ''));
            setState('listening');
            break;

          case 'response.created':
            setState('speaking');
            break;

          case 'input_audio_buffer.speech_started':
            // The rep talked over the character; that is allowed and realistic.
            setState('listening');
            break;

          case 'error':
            fail(String((event.error as { message?: string })?.message ?? 'realtime-error'));
            break;
        }
      }
    },
    [fail, flush, recordTurn, teardown],
  );

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  // Always release the microphone when the component goes away.
  useEffect(() => teardown, [teardown]);

  return { state, turns, error, muted, start, stop, toggleMute, audioRef };
}
