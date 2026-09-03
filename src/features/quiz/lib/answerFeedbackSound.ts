import { readStorage } from "@/lib/storage"

const SOUND_SETTING_KEY = "quizpka-sound-enabled"

let audioContext: AudioContext | null = null

type Tone = {
  frequency: number
  offset: number
  duration: number
  volume: number
  type: OscillatorType
}

const CORRECT_TONES: Tone[] = [
  { frequency: 523, offset: 0, duration: 0.16, volume: 0.32, type: "triangle" },
  { frequency: 659, offset: 0.1, duration: 0.18, volume: 0.3, type: "triangle" },
  { frequency: 784, offset: 0.2, duration: 0.22, volume: 0.27, type: "triangle" },
]

const WRONG_TONES: Tone[] = [
  { frequency: 240, offset: 0, duration: 0.2, volume: 0.28, type: "square" },
  { frequency: 180, offset: 0.14, duration: 0.26, volume: 0.24, type: "square" },
]

function scheduleTone(context: AudioContext, tone: Tone): void {
  const startAt = context.currentTime + tone.offset
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = tone.type
  oscillator.frequency.setValueAtTime(tone.frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(tone.volume, startAt + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + tone.duration + 0.01)
}

/** Plays a short answer cue and silently degrades when browser audio is unavailable. */
export function playAnswerFeedback(isCorrect: boolean): void {
  if (readStorage(SOUND_SETTING_KEY) === "false" || typeof window === "undefined" || !window.AudioContext) return

  try {
    audioContext ??= new window.AudioContext()
    const context = audioContext
    const play = () => (isCorrect ? CORRECT_TONES : WRONG_TONES).forEach((tone) => scheduleTone(context, tone))

    if (context.state === "suspended") {
      void context.resume().then(play).catch(() => undefined)
    } else {
      play()
    }
  } catch {
    // Sound feedback is optional and must never interrupt the quiz interaction.
  }
}
