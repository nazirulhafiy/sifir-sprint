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
let unlocked = false

export function muatBisu(): boolean {
  try {
    const raw = localStorage.getItem(MUTE_KEY)
    if (raw === null) return false
    return raw === '1'
  } catch {
    return false
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

function isRunning(audio: AudioContext) {
  return audio.state === 'running'
}

/** iOS / autoplay: a 1-sample source + resume() must run in the user-gesture turn. */
function gestureUnlock(audio: AudioContext) {
  try {
    const buffer = audio.createBuffer(1, 1, audio.sampleRate)
    const source = audio.createBufferSource()
    source.buffer = buffer
    source.connect(audio.destination)
    source.start(0)
  } catch {
    /* ignore missing Web Audio bits */
  }
  if (!isRunning(audio)) void audio.resume()
}

function syncBgmGain(audio: AudioContext) {
  if (!bgm) return
  const t = audio.currentTime
  bgm.gain.cancelScheduledValues(t)
  bgm.gain.setValueAtTime(muted ? 0 : 1, t)
}

function onContextState() {
  if (!ctx) return
  if (!isRunning(ctx)) return
  unlocked = true
  if (muted) return
  if (!loopOn) startLoop()
  else schedule()
}

function ensure() {
  if (ctx) return ctx
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioCtx) return null
  ctx = new AudioCtx()
  ctx.addEventListener('statechange', onContextState)
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
  if (nextStep < ctx.currentTime - 0.5) nextStep = ctx.currentTime
  const horizon = ctx.currentTime + 0.35
  while (nextStep < horizon) {
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
  // Resume + silent buffer + first BGM notes must be synchronous in the
  // tap/key turn. Awaiting resume() first leaves Safari/Chrome past the
  // user-activation window, so Mula stayed silent until mute was toggled.
  gestureUnlock(audio)
  syncBgmGain(audio)
  if (!muted) startLoop()
  if (isRunning(audio)) {
    unlocked = true
    return
  }
  try {
    await audio.resume()
  } catch {
    return
  }
  if (!isRunning(audio)) return
  unlocked = true
  syncBgmGain(audio)
  if (!muted) {
    if (!loopOn) startLoop()
    else schedule()
  }
}

export function tetapkanBisu(next: boolean) {
  muted = next
  simpanBisu(next)
  if (!ctx || !bgm) {
    if (!next) void hidupkanAudio()
    return
  }
  if (!next) gestureUnlock(ctx)
  bgm.gain.cancelScheduledValues(ctx.currentTime)
  bgm.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.04)
  if (next) stopLoop()
  else startLoop()
}

export function bunyiBetul() {
  if (muted) return
  const audio = ensure()
  if (!audio || !master || !isRunning(audio)) return
  const t = audio.currentTime
  beep(master, 784, t, 0.09, 'triangle', 0.12)
  beep(master, 1047, t + 0.08, 0.12, 'triangle', 0.12)
}

export function bunyiSalah() {
  if (muted) return
  const audio = ensure()
  if (!audio || !master || !isRunning(audio)) return
  const t = audio.currentTime
  beep(master, 196, t, 0.12, 'sine', 0.14)
  beep(master, 147, t + 0.1, 0.16, 'sine', 0.12)
}

export function audioSudahHidup() {
  return unlocked && !!ctx && isRunning(ctx)
}
