import { useRef, useCallback } from 'react';

export function useAudioBuffer() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function startRecorder(stream: MediaStream) {
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return;
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start();
    recorderRef.current = recorder;
  }

  const start = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    startRecorder(stream);
  }, []);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  // Stop recorder to flush a complete valid WebM, then restart for next bookmark
  const getBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      const stream = streamRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }

      recorder.onstop = () => {
        const blob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: recorder.mimeType })
          : null;
        if (stream) startRecorder(stream);
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  return { start, stop, getBlob };
}
