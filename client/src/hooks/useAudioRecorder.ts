// ── Simple mic recorder ───────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'

export type RecorderState = 'idle' | 'recording' | 'stopped'

export interface UseAudioRecorderResult {
  state:      RecorderState
  durationMs: number
  start:      () => Promise<void>
  stop:       () => Promise<Blob>
  reset:      () => void
  error:      string | null
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [state,      setState]      = useState<RecorderState>('idle')
  const [durationMs, setDurationMs] = useState(0)
  const [error,      setError]      = useState<string | null>(null)

  const mediaRecRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const streamRef    = useRef<MediaStream | null>(null)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const resolveRef   = useRef<((blob: Blob) => void) | null>(null)
  const startTimeRef = useRef<number>(0)

  // Clean up on unmount
  useEffect(() => () => {
    intervalRef.current && clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      // Prefer webm/opus; fall back to whatever browser supports
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecRef.current = rec

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

      rec.start(100) // 100ms timeslices
      startTimeRef.current = Date.now()
      setState('recording')

      intervalRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current)
      }, 200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied')
    }
  }, [])

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const rec = mediaRecRef.current
      if (!rec || rec.state === 'inactive') {
        resolve(new Blob([], { type: 'audio/webm' }))
        return
      }
      resolveRef.current = resolve
      rec.onstop = () => {
        intervalRef.current && clearInterval(intervalRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        setState('stopped')
        resolveRef.current?.(blob)
      }
      rec.stop()
    })
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setDurationMs(0)
    setError(null)
    chunksRef.current = []
    mediaRecRef.current = null
  }, [])

  return { state, durationMs, start, stop, reset, error }
}
