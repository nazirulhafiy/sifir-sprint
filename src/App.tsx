import { useEffect, useRef, useState } from 'react'
import {
  audioSudahHidup,
  bunyiBetul,
  bunyiSalah,
  bunyiTamat,
  hidupkanAudio,
  muatBisu,
  tetapkanBisu,
} from './audio.ts'
import { CartoonBackdrop } from './CartoonBits.tsx'
import {
  formatMasa,
  getMasaSaat,
  hasil,
  janaSoalan,
  mata,
  type Soalan,
} from './game.ts'
import { MuteToggle } from './MuteToggle.tsx'
import { NumberPad } from './NumberPad.tsx'
import { usePress } from './press.ts'

type Screen = 'mula' | 'main' | 'tamat'
type Flash = 'betul' | 'salah' | null

type Stats = {
  markah: number
  streak: number
  streakTerbaik: number
  betul: number
  salah: number
}

const emptyStats = (): Stats => ({
  markah: 0,
  streak: 0,
  streakTerbaik: 0,
  betul: 0,
  salah: 0,
})

/** Grace window so Padam can clear a just-completed answer before auto-submit. */
const AUTO_JAWAB_MS = 750

export default function App() {
  const [screen, setScreen] = useState<Screen>('mula')
  const [seconds, setSeconds] = useState(60)
  const [soalan, setSoalan] = useState<Soalan>(() => janaSoalan(0))
  const [input, setInput] = useState('')
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [flash, setFlash] = useState<Flash>(null)
  const [locked, setLocked] = useState(false)
  const [roundId, setRoundId] = useState(0)
  const [bisu, setBisu] = useState(() => muatBisu())
  const [landingPulse, setLandingPulse] = useState(0)

  const statsRef = useRef(stats)
  const soalanRef = useRef(soalan)
  const inputRef = useRef(input)
  const secondsRef = useRef(seconds)
  const lockedRef = useRef(false)
  const tickRef = useRef(0)
  const keysRef = useRef({
    addDigit: (_digit: string) => {},
    padamSatu: () => {},
    jawab: (_value: string) => {},
  })
  const autoJawabRef = useRef<number | null>(null)

  function bumpTick() {
    tickRef.current += 1
    return tickRef.current
  }

  function afterTick(ms: number, fn: () => void) {
    const tick = tickRef.current
    window.setTimeout(() => {
      if (tickRef.current !== tick) return
      fn()
    }, ms)
  }

  function setLock(next: boolean) {
    lockedRef.current = next
    setLocked(next)
  }

  useEffect(() => {
    statsRef.current = stats
  }, [stats])

  useEffect(() => {
    soalanRef.current = soalan
  }, [soalan])

  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    secondsRef.current = seconds
  }, [seconds])

  useEffect(() => () => cancelPendingJawab(), [])

  useEffect(() => {
    const unlock = () => {
      if (!muatBisu()) void hidupkanAudio()
      if (!audioSudahHidup()) return
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (screen !== 'main') return
    const id = window.setInterval(() => {
      const next = secondsRef.current - 1
      if (next <= 0) {
        secondsRef.current = 0
        setSeconds(0)
        setLock(true)
        window.clearInterval(id)
        bumpTick()
        cancelPendingJawab()
        bunyiTamat()
        setScreen('tamat')
        return
      }
      secondsRef.current = next
      setSeconds(next)
    }, 1000)
    return () => window.clearInterval(id)
  }, [screen, roundId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (screen !== 'main') return
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault()
        keysRef.current.addDigit(event.key)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        keysRef.current.padamSatu()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        keysRef.current.jawab(inputRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen])

  function tukarBisu() {
    const next = !bisu
    setBisu(next)
    tetapkanBisu(next)
  }

  function resetRoundState() {
    bumpTick()
    cancelPendingJawab()
    const next = emptyStats()
    statsRef.current = next
    const first = janaSoalan(0)
    soalanRef.current = first
    setStats(next)
    setSoalan(first)
    setInput('')
    inputRef.current = ''
    const masa = getMasaSaat()
    secondsRef.current = masa
    setSeconds(masa)
    setFlash(null)
    setLock(false)
  }

  function mula() {
    void hidupkanAudio()
    resetRoundState()
    setRoundId((n) => n + 1)
    setScreen('main')
  }

  function keMula() {
    resetRoundState()
    setLandingPulse((n) => n + 1)
    setScreen('mula')
  }

  function applyStats(next: Stats) {
    statsRef.current = next
    setStats(next)
  }

  function cancelPendingJawab() {
    if (autoJawabRef.current === null) return
    window.clearTimeout(autoJawabRef.current)
    autoJawabRef.current = null
  }

  function scheduleAutoJawab() {
    cancelPendingJawab()
    const needed = String(hasil(soalanRef.current)).length
    if (inputRef.current.length < needed) return
    autoJawabRef.current = window.setTimeout(() => {
      autoJawabRef.current = null
      jawab(inputRef.current)
    }, AUTO_JAWAB_MS)
  }

  function addDigit(digit: string) {
    void hidupkanAudio()
    if (lockedRef.current || screen !== 'main') return
    if (inputRef.current.length >= 3) return
    const next = `${inputRef.current}${digit}`
    inputRef.current = next
    setInput(next)
    scheduleAutoJawab()
  }

  function padam() {
    if (lockedRef.current) return
    cancelPendingJawab()
    inputRef.current = ''
    setInput('')
  }

  function padamSatu() {
    if (lockedRef.current) return
    cancelPendingJawab()
    const next = inputRef.current.slice(0, -1)
    inputRef.current = next
    setInput(next)
    scheduleAutoJawab()
  }

  function jawab(value: string) {
    cancelPendingJawab()
    if (lockedRef.current) return
    if (!value) return
    const n = Number(value)
    if (!Number.isFinite(n)) return

    if (screen !== 'main' || secondsRef.current <= 0) return

    setLock(true)
    const current = soalanRef.current
    const betulJawab = n === hasil(current)
    const prev = statsRef.current

    if (betulJawab) {
      const streak = prev.streak + 1
      const next: Stats = {
        ...prev,
        markah: prev.markah + mata(streak),
        streak,
        streakTerbaik: Math.max(prev.streakTerbaik, streak),
        betul: prev.betul + 1,
      }
      applyStats(next)
      setFlash('betul')
      bunyiBetul()
      afterTick(280, () => {
        const q = janaSoalan(streak, current)
        soalanRef.current = q
        setSoalan(q)
        inputRef.current = ''
        setInput('')
        setFlash(null)
        setLock(false)
      })
      return
    }

    const next: Stats = {
      ...prev,
      streak: 0,
      salah: prev.salah + 1,
    }
    applyStats(next)
    setFlash('salah')
    bunyiSalah()
    afterTick(380, () => {
      const q = janaSoalan(0, current)
      soalanRef.current = q
      setSoalan(q)
      inputRef.current = ''
      setInput('')
      setFlash(null)
      setLock(false)
    })
  }

  keysRef.current = { addDigit, padamSatu, jawab }

  return (
    <div className="sky-stage">
      <CartoonBackdrop />
      <div className="stage mx-auto flex h-svh max-h-svh w-full max-w-md flex-col overflow-hidden px-4 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-1 flex shrink-0 items-center justify-end gap-2">
        {screen === 'main' && <BaruButton onBaru={keMula} />}
        <MuteToggle bisu={bisu} onToggle={tukarBisu} />
      </div>
      {screen === 'mula' && (
        <MulaScreen landingPulse={landingPulse} onMula={mula} />
      )}
      {screen === 'main' && (
        <PlayScreen
          seconds={seconds}
          soalan={soalan}
          input={input}
          stats={stats}
          flash={flash}
          locked={locked}
          onDigit={addDigit}
          onPadam={padam}
          onJawab={() => jawab(inputRef.current)}
        />
      )}
      {screen === 'tamat' && (
        <TamatScreen
          stats={stats}
          onLagiSatu={mula}
        />
      )}
      </div>
    </div>
  )
}

function BaruButton({ onBaru }: { onBaru: () => void }) {
  const press = usePress(onBaru)
  return (
    <button
      type="button"
      data-testid="baru"
      onPointerDown={press.onPointerDown}
      onClick={press.onClick}
      className="press ink wonky-sm bg-cream px-3 py-2 text-sm font-bold touch-manipulation"
    >
      Baru
    </button>
  )
}

function MulaScreen({
  landingPulse,
  onMula,
}: {
  landingPulse: number
  onMula: () => void
}) {
  const press = usePress(onMula)
  return (
    <div
      key={landingPulse}
      data-testid="landing"
      className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto text-center"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cream">
        KRACKEDDEVS · SEKOLAH EDITION
      </p>
      <div className="board wonky pop w-full bg-cream text-ink">
        <header className="bg-butter px-4 py-6 sm:py-7">
          <h1 className="text-6xl font-bold leading-[0.9] tracking-tight sm:text-7xl">
            Sifir
            <br />
            Sprint
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-sm font-semibold leading-relaxed text-navy">
            Soalan → jawab → markah → streak → Try Lagi.
          </p>
        </header>
        <div className="board-rule grid grid-cols-2">
          <div className="board-col px-2 py-4">
            <p className="text-3xl font-bold leading-none tabular sm:text-4xl">
              {getMasaSaat()}s
            </p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest">
              Masa
            </p>
          </div>
          <div className="board-col px-2 py-4">
            <p className="text-3xl font-bold leading-none sm:text-4xl">1–12</p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest">
              Jadual darab
            </p>
          </div>
        </div>
        <button
          type="button"
          data-testid="mula"
          onPointerDown={press.onPointerDown}
          onClick={press.onClick}
          className="board-foot press board-rule w-full bg-gold py-4 text-xl font-bold text-ink touch-manipulation"
        >
          Mula
        </button>
      </div>
    </div>
  )
}

function PlayScreen({
  seconds,
  soalan,
  input,
  stats,
  flash,
  locked,
  onDigit,
  onPadam,
  onJawab,
}: {
  seconds: number
  soalan: Soalan
  input: string
  stats: Stats
  flash: Flash
  locked: boolean
  onDigit: (digit: string) => void
  onPadam: () => void
  onJawab: () => void
}) {
  const low = seconds <= 10
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 pt-1">
        <div className="flex min-h-[88px] min-w-0 flex-1 flex-col justify-center ink wonky-sm bg-navy px-4 py-3 text-left text-cream">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold sm:text-base">
            Sifir Sprint
          </p>
          <p className="mt-0.5 text-sm font-semibold text-cream/80 sm:text-base">
            Soalan · Jawab · Lagi
          </p>
        </div>
        <div
          data-testid="timer"
          className={`wonky-orb relative h-[88px] w-[88px] shrink-0 ${low ? 'tick-low' : ''}`}
        >
          <div
            className={`ink wonky-orb grid h-full w-full place-items-center overflow-hidden text-center ${low ? 'bg-bad text-cream' : 'bg-cream'}`}
          >
            <div className="px-1">
              <p className="text-[10px] font-bold uppercase tracking-widest">Masa</p>
              <p className="text-4xl font-bold leading-none tabular">
                {formatMasa(seconds)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <QuestionCard
          soalan={soalan}
          input={input}
          flash={flash}
        />
      </div>

      <div className="relative z-0 mb-3 grid shrink-0 grid-cols-2 gap-2 pt-2">
        <StatPill label="Markah" value={stats.markah} accent={stats.streak >= 3} />
        <StatPill
          label="Streak"
          value={stats.streak}
          hint={stats.streak >= 3 ? '×2 mata' : undefined}
        />
      </div>

      <div className="shrink-0">
        <NumberPad
          disabled={locked || seconds <= 0}
          onDigit={onDigit}
          onPadam={onPadam}
          onJawab={onJawab}
        />
      </div>
    </div>
  )
}

function TamatScreen({
  stats,
  onLagiSatu,
}: {
  stats: Stats
  onLagiSatu: () => void
}) {
  const press = usePress(onLagiSatu)
  const sempurna = stats.salah === 0 && stats.betul > 0
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto text-center">
      <article
        data-testid="masa-tamat"
        className="board wonky pop w-full bg-cream text-ink"
      >
        <header className="bg-navy px-4 py-6 text-cream sm:py-7">
          <h1 className="text-5xl font-bold leading-[0.9] tracking-tight sm:text-6xl">
            Masa tamat!
          </h1>
        </header>
        <div className="board-rule bg-butter px-4 py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest">Markah</p>
          <p
            className="mt-1 text-7xl font-bold leading-none tabular"
            data-testid="tamat-markah"
          >
            {stats.markah}
          </p>
          <p className="mt-2 text-sm font-semibold">
            <span data-testid="tamat-betul">{stats.betul}</span>
            {' betul · '}
            <span data-testid="tamat-salah">{stats.salah}</span>
            {' salah'}
          </p>
          {sempurna && (
            <p className="mt-2 text-sm font-semibold text-navy">
              Sempurna!
            </p>
          )}
        </div>
        <button
          type="button"
          data-testid="lagi-satu"
          onPointerDown={press.onPointerDown}
          onClick={press.onClick}
          className="board-foot press board-rule w-full bg-gold py-4 text-xl font-bold text-ink touch-manipulation"
        >
          Try Lagi
        </button>
      </article>
    </div>
  )
}

function QuestionCard({
  soalan,
  input,
  flash,
}: {
  soalan: Soalan
  input: string
  flash: Flash
}) {
  const fill =
    flash === 'betul' ? 'bg-ok' : flash === 'salah' ? 'bg-bad' : 'bg-cream'

  return (
    <section
      data-testid="soalan"
      data-a={soalan.a}
      data-b={soalan.b}
      className={`ink-thick wonky relative mt-2 mb-2 flex min-h-0 flex-1 flex-col px-4 pt-4 pb-7 text-center ${fill}`}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Soalan</p>
        <p
          key={`${soalan.a}x${soalan.b}-${input}-${flash ?? 'idle'}`}
          data-testid="equation"
          className="pop min-h-0 text-[clamp(2rem,5.5vh,3.75rem)] font-bold leading-none tracking-tight tabular"
        >
          {soalan.a} <span className="text-pink">×</span> {soalan.b}
        </p>
        <p
          data-testid="input"
          className="ink wonky-sm relative z-10 shrink-0 min-h-14 min-w-24 self-center bg-butter px-4 text-5xl font-bold tabular"
        >
          {input || '?'}
        </p>
      </div>
    </section>
  )
}

function StatPill({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: number
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={`ink wonky-pill px-3 py-2.5 ${accent ? 'bg-gold' : 'bg-teal'}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold leading-none tabular">
        {value}
        {hint && (
          <span className="ml-2 align-middle text-xs font-bold">{hint}</span>
        )}
      </p>
    </div>
  )
}
