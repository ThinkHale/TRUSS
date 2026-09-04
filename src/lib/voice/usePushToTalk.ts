'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Hold-to-talk fallback for the roleplay.
 *
 * WebRTC is the good experience, but reps practice in trucks with two bars of
 * signal. This path records a clip, sends one request, and plays back the
 * character's reply — slower, but it works where a live socket will not.
 */

export type PushToTalkState = 'idle' | 'recording' | 'sending' | 'playing' | 'error';

export interface Turn {
  role: 'rep' | 'character';
  text: string;
}

/** Long enough for a real answer, short enough to upload on bad signal. */
const MAX_CLIP_MS = 60_000;

export function usePushToTalk(sessionId: string | null) {
  const [state, setState] = useState<PushToTalkState>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const send = useCallback(
    async (payload: FormData) => {
      if (!sessionId) return;
      setState('sending');
      setError(null);

      try {
        payload.set('sessionId', sessionId);
        const res = await fetch('/api/practice/reply', { method: 'POST', body: payload });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message ?? data.error ?? 'reply_failed');

        setTurns((prev) => [
          ...prev,
          { role: 'rep', text: data.repText },
          { role: 'character', text: data.characterText },
        ]);

        if (data.audio) {
          setState('playing');
          const audio = new Audio(`data:${data.audioMimeType};base64,${data.audio}`);
          audioRef.current = audio;
          audio.onended = () => setState('idle');
          audio.onerror = () => setState('idle');
          await audio.play().catch(() => setState('idle'));
        } else {
          setState('idle');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'reply_failed');
        setState('error');
      }
    },
    [sessionId],
  );

  const startRecording = useCallback(async () => {
    if (state === 'recording' || state === 'sending') return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Let the browser choose a container it can actually produce; Safari and
      // Chrome disagree, and the transcription API accepts both.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1200) {
          // Almost certainly an accidental tap rather than speech.
          setState('idle');
          return;
        }

        const form = new FormData();
        form.append('audio', blob, mimeType === 'audio/webm' ? 'clip.webm' : 'clip.mp4');
        void send(form);
      };

      recorder.start();
      setState('recording');

      // Hard stop so a stuck button does not record forever.
      timeoutRef.current = setTimeout(() => stopRecording(), MAX_CLIP_MS);
    } catch {
      setError('mic-denied');
      setState('error');
    }
  }, [send, state]);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
  }, []);

  /** Typed input, for a rep who cannot speak out loud where they are. */
  const sendText = useCallback(
    (text: string) => {
      const form = new FormData();
      form.append('text', text);
      return send(form);
    },
    [send],
  );

  return { state, turns, error, startRecording, stopRecording, sendText };
}
