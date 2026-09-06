const MUTE_KEY = 'sifir-sprint.bisu'

const LEAD = [
  523, 659, 784, 659, 523, 392, 523, 0, 523, 659, 784, 880, 784, 659, 523, 392,
]
const BASS = [
  131, 0, 131, 0, 196, 0, 175, 0, 147, 0, 147, 0, 196, 0, 131, 0,
]
const STEP = 0.3

let ctx: AudioContext | null = null
let master: GainNode | null = null
let bgm: GainNode | null = null
let timer: number | null = null
let nextStep = 0
let stepIndex = 0
let muted = muatBisu()
let loopOn = false

export function muatBisu(): boolean {
  try {
    const raw = localStorage.getItem(MUTE_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

export function simpanBisu(next: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}

function beep(
  dest: AudioNode,
  freq: number,
  when: number,
  dur: number,
  type: OscillatorType,
  gain: number,
) {
  if (!ctx || freq <= 0) return
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, when)
  amp.gain.setValueAtTime(0.0001, when)
  amp.gain.exponentialRampToValueAtTime(gain, when + 0.018)
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  osc.connect(amp)
  amp.connect(dest)
  osc.start(when)
  osc.stop(when + dur + 0.02)
}

function ensure() {
  if (ctx) return ctx
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioCtx) return null
  ctx = new AudioCtx()
  master = ctx.createGain()
  master.gain.value = 0.18
  master.connect(ctx.destination)
  bgm = ctx.createGain()
  bgm.gain.value = muted ? 0 : 1
  bgm.connect(master)
  return ctx
}

function schedule() {
  if (!ctx || !bgm || !loopOn) return
  while (nextStep < ctx.currentTime + 0.35) {
    const i = stepIndex % LEAD.length
    const when = nextStep
    beep(bgm, LEAD[i], when, 0.22, 'triangle', 0.085)
    beep(bgm, BASS[i], when, 0.26, 'sine', 0.07)
    nextStep += STEP
    stepIndex += 1
  }
}

function startLoop() {
  if (!ctx || loopOn || muted) return
  loopOn = true
  stepIndex = 0
  nextStep = ctx.currentTime + 0.06
  schedule()
  timer = window.setInterval(schedule, 120)
}

function stopLoop() {
  loopOn = false
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

export async function hidupkanAudio() {
  muted = muatBisu()
  const audio = ensure()
  if (!audio) return
  if (audio.state === 'suspended') {
    try {
      await audio.resume()
    } catch {
      return
    }
  }
  if (bgm) {
    bgm.gain.cancelScheduledValues(audio.currentTime)
    bgm.gain.setValueAtTime(muted ? 0 : 1, audio.currentTime)
  }
  if (!muted) startLoop()
}

export function tetapkanBisu(next: boolean) {
  muted = next
  simpanBisu(next)
  if (!ctx || !bgm) {
    if (!next) void hidupkanAudio()
    return
  }
  bgm.gain.cancelScheduledValues(ctx.currentTime)
  bgm.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.04)
  if (next) stopLoop()
  else startLoop()
}

export function bunyiBetul() {
  if (muted) return
  const audio = ensure()
  if (!audio || !master || audio.state !== 'running') return
  const t = audio.currentTime
  beep(master, 784, t, 0.09, 'triangle', 0.12)
  beep(master, 1047, t + 0.08, 0.12, 'triangle', 0.12)
}

export function bunyiSalah() {
  if (muted) return
  const audio = ensure()
  if (!audio || !master || audio.state !== 'running') return
  const t = audio.currentTime
  beep(master, 196, t, 0.12, 'sine', 0.14)
  beep(master, 147, t + 0.1, 0.16, 'sine', 0.12)
}
