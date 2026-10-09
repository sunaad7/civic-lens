import { useEffect, useRef, useState } from 'react'

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult:
    | ((event: {
        resultIndex: number
        results: { length: number; [index: number]: { 0: { transcript: string } } }
      }) => void)
    | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionCtor = new () => RecognitionLike

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface VoiceInputProps {
  value: string
  onChange: (next: string) => void
}

export function VoiceInput({ value, onChange }: VoiceInputProps) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<RecognitionLike | null>(null)
  const startValueRef = useRef('')
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const supported = getRecognitionCtor() !== null

  useEffect(() => {
    return () => {
      recRef.current?.stop()
    }
  }, [])

  if (!supported) return null

  const stop = () => {
    recRef.current?.stop()
    setListening(false)
  }

  const start = () => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = false
    rec.interimResults = true
    startValueRef.current = valueRef.current

    rec.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      const base = startValueRef.current.trim()
      const next = base ? `${base} ${transcript}` : transcript
      onChangeRef.current(next)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    recRef.current = rec
    rec.start()
    setListening(true)
  }

  return (
    <button
      type="button"
      className={`btn btn-mic ${listening ? 'active' : ''}`}
      onClick={() => (listening ? stop() : start())}
      aria-pressed={listening}
      title="Dictate with your voice"
    >
      {listening ? '■ Stop dictating' : '● Dictate'}
    </button>
  )
}
