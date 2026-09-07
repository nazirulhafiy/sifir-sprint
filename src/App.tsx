import { useEffect, useRef, useState } from 'react'
import {
  bunyiBetul,
  bunyiSalah,
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
import { muatStor, simpanPusingan, type Stor } from './storage.ts'

type Screen = 'mula' | 'main' | 'ulang' | 'markah'
type Flash = 'betul' | 'salah' | null

type Stats = {
  markah: number
  streak: number
  streakTerbaik: number
  betul: number
  salah: number
  misses: Soalan[]
}

const emptyStats = (): Stats => ({
  markah: 0,
  streak: 0,
  streakTerbaik: 0,
  betul: 0,
  salah: 0,
  misses: [],
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
  const [replayIndex, setReplayIndex] = useState(0)
  const [reveal, setReveal] = useState<number | null>(null)
  const [stor, setStor] = useState<Stor>(() => muatStor())
  const [roundId, setRoundId] = useState(0)
  const [bisu, setBisu] = useState(() => muatBisu())
  const [cue, setCue] = useState<string | null>(null)
  const [roundPulse, setRoundPulse] = useState(0)
  const [landingPulse, setLandingPulse] = useState(0)

  const statsRef = useRef(stats)
  const soalanRef = useRef(soalan)
  const savedRef = useRef(false)
  const inputRef = useRef(input)
  const secondsRef = useRef(seconds)
  const lockedRef = useRef(false)
  const replayIndexRef = useRef(0)
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
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock)
      if (!muatBisu()) void hidupkanAudio()
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
        afterTick(280, () => endPlay())
        return
      }
      secondsRef.current = next
      setSeconds(next)
    }, 1000)
    return () => window.clearInterval(id)
  }, [screen, roundId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (screen !== 'main' && screen !== 'ulang') return
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

  function persistRound() {
    if (savedRef.current) return
    const latest = statsRef.current
    setStor(
      simpanPusingan({
        markah: latest.markah,
        betul: latest.betul,
        salah: latest.salah,
        masa: Date.now(),
      }),
    )
    savedRef.current = true
  }

  function resetRoundState() {
    bumpTick()
    cancelPendingJawab()
    savedRef.current = false
    const next = emptyStats()
    statsRef.current = next
    const first = janaSoalan(0)
    soalanRef.current = first
    replayIndexRef.current = 0
    setStats(next)
    setSoalan(first)
    setInput('')
    inputRef.current = ''
    const masa = getMasaSaat()
    secondsRef.current = masa
    setSeconds(masa)
    setFlash(null)
    setLock(false)
    setReplayIndex(0)
    setReveal(null)
    setCue(null)
  }

  function mula(opts?: { announce?: boolean }) {
    if (!bisu) void hidupkanAudio()
    resetRoundState()
    setRoundId((n) => n + 1)
    setScreen('main')
    if (opts?.announce) {
      setRoundPulse((n) => n + 1)
      setCue('Pusingan baru!')
      afterTick(2400, () => setCue(null))
    }
  }

  function mulaSemula() {
    persistRound()
    mula({ announce: true })
  }

  function keMula() {
    if (screen === 'ulang' || screen === 'markah') persistRound()
    resetRoundState()
    setLandingPulse((n) => n + 1)
    setScreen('mula')
  }

  function endPlay() {
    bumpTick()
    cancelPendingJawab()
    const latest = statsRef.current
    if (latest.misses.length > 0) {
      const firstMiss = latest.misses[0]
      soalanRef.current = firstMiss
      replayIndexRef.current = 0
      setSoalan(firstMiss)
      setReplayIndex(0)
      setInput('')
      inputRef.current = ''
      setFlash(null)
      setReveal(null)
      setLock(false)
      setScreen('ulang')
      return
    }
    keMarkah()
  }

  function keMarkah() {
    persistRound()
    setScreen('markah')
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
    if (lockedRef.current || (screen !== 'main' && screen !== 'ulang')) return
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

    if (screen === 'ulang') {
      jawabUlang(n)
      return
    }
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
      misses: [...prev.misses, current],
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

  function jawabUlang(n: number) {
    setLock(true)
    const current = soalanRef.current
    const answer = hasil(current)
    if (n === answer) {
      setFlash('betul')
      bunyiBetul()
      afterTick(320, () => nextReplay())
      return
    }
    setFlash('salah')
    bunyiSalah()
    setReveal(answer)
    afterTick(2200, () => nextReplay())
  }

  function nextReplay() {
    const misses = statsRef.current.misses
    const nextIndex = replayIndexRef.current + 1
    if (nextIndex >= misses.length) {
      keMarkah()
      return
    }
    const q = misses[nextIndex]
    soalanRef.current = q
    replayIndexRef.current = nextIndex
    setSoalan(q)
    setReplayIndex(nextIndex)
    inputRef.current = ''
    setInput('')
    setReveal(null)
    setFlash(null)
    setLock(false)
  }

  return (
    <div className="sky-stage">
      <CartoonBackdrop />
      <div className="stage mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-1 flex items-center justify-end gap-2">
        {screen !== 'mula' && <BaruButton onBaru={keMula} />}
        <MuteToggle bisu={bisu} onToggle={tukarBisu} />
      </div>
      {screen === 'mula' && (
        <MulaScreen terbaik={stor.terbaik} landingPulse={landingPulse} onMula={mula} />
      )}
      {screen === 'main' && (
        <PlayScreen
          seconds={seconds}
          soalan={soalan}
          input={input}
          stats={stats}
          flash={flash}
          locked={locked}
          cue={cue}
          roundPulse={roundPulse}
          onDigit={addDigit}
          onPadam={padam}
          onJawab={() => jawab(inputRef.current)}
        />
      )}
      {screen === 'ulang' && (
        <ReplayScreen
          soalan={soalan}
          input={input}
          flash={flash}
          reveal={reveal}
          index={replayIndex}
          total={stats.misses.length}
          locked={locked}
          onDigit={addDigit}
          onPadam={padam}
          onJawab={() => jawab(inputRef.current)}
          onMulaSemula={mulaSemula}
        />
      )}
      {screen === 'markah' && (
        <ScoreScreen
          stats={stats}
          stor={stor}
          onLagiSatu={() => mula({ announce: true })}
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
  terbaik,
  landingPulse,
  onMula,
}: {
  terbaik: number
  landingPulse: number
  onMula: () => void
}) {
  const press = usePress(onMula)
  return (
    <div
      key={landingPulse}
      data-testid="landing"
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cream">
        KrackedDevs · Sekolah
      </p>
      <div className="board wonky pop w-full bg-cream text-ink">
        <header className="bg-butter px-4 py-6 sm:py-7">
          <h1 className="text-6xl font-bold leading-[0.9] tracking-tight sm:text-7xl">
            Sifir
            <br />
            Sprint
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-sm font-semibold leading-relaxed text-navy">
            Soalan → jawab → markah → streak → lagi satu.
          </p>
        </header>
        <div className="board-rule grid grid-cols-3">
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
          <div className="board-col px-2 py-4">
            <p className="text-3xl font-bold leading-none tabular sm:text-4xl">
              {terbaik}
            </p>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest">
              Terbaik
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
  cue,
  roundPulse,
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
  cue: string | null
  roundPulse: number
  onDigit: (digit: string) => void
  onPadam: () => void
  onJawab: () => void
}) {
  const low = seconds <= 10
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 pt-1">
        <div className="ink wonky-sm bg-navy px-3 py-2 text-left text-cream">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
            Sifir Sprint
          </p>
          <p className="text-xs font-semibold text-cream/80">Soalan · Jawab · Lagi</p>
        </div>
        <div
          key={roundPulse}
          data-testid="timer"
          className={`ink wonky-orb grid h-[88px] w-[88px] place-items-center bg-cream text-center ${low ? 'tick-low bg-bad text-cream' : ''} ${roundPulse > 0 ? 'pop' : ''}`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest">Masa</p>
            <p className="text-4xl font-bold leading-none tabular">
              {formatMasa(seconds)}
            </p>
          </div>
        </div>
      </header>

      <QuestionCard
        soalan={soalan}
        input={input}
        flash={flash}
        pulseKey={roundPulse}
        cue={cue}
      />

      <div key={roundPulse} className="mb-4 grid grid-cols-2 gap-2">
        <StatPill label="Markah" value={stats.markah} accent={stats.streak >= 3} />
        <StatPill
          label="Streak"
          value={stats.streak}
          hint={stats.streak >= 3 ? '×2 mata' : undefined}
        />
      </div>

      <NumberPad
        disabled={locked || seconds <= 0}
        onDigit={onDigit}
        onPadam={onPadam}
        onJawab={onJawab}
      />
    </div>
  )
}

function ReplayScreen({
  soalan,
  input,
  flash,
  reveal,
  index,
  total,
  locked,
  onDigit,
  onPadam,
  onJawab,
  onMulaSemula,
}: {
  soalan: Soalan
  input: string
  flash: Flash
  reveal: number | null
  index: number
  total: number
  locked: boolean
  onDigit: (digit: string) => void
  onPadam: () => void
  onJawab: () => void
  onMulaSemula: () => void
}) {
  const press = usePress(onMulaSemula)
  return (
    <div className="flex flex-1 flex-col">
      <header className="ink wonky-sm bg-pink px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
          Belajar / Replay
        </p>
        <p className="text-sm font-semibold" data-testid="replay-progress">
          Ulang soalan tersalah · {index + 1} / {total}
        </p>
        <p className="mt-1 text-xs font-semibold">Lepas ni: Markah</p>
      </header>

      <QuestionCard soalan={soalan} input={input} flash={flash} />

      <div
        className={`ink wonky mb-4 min-h-16 px-4 py-3 text-center ${reveal === null ? 'bg-cream' : 'bg-butter'}`}
      >
        {reveal === null ? (
          <p className="text-sm font-semibold">
            Jawab semula. Kalau tersalah, jawapan betul dipaparkan.
          </p>
        ) : (
          <p className="text-xl font-bold" data-testid="jawapan-betul">
            Jawapan: {soalan.a} × {soalan.b} = {reveal}
          </p>
        )}
      </div>

      <NumberPad
        disabled={locked}
        onDigit={onDigit}
        onPadam={onPadam}
        onJawab={onJawab}
      />

      <button
        type="button"
        data-testid="mula-semula"
        onPointerDown={press.onPointerDown}
        onClick={press.onClick}
        className="press ink wonky mt-4 w-full bg-cream py-3 text-base font-bold touch-manipulation"
      >
        Mula Semula
      </button>
    </div>
  )
}

function ScoreScreen({
  stats,
  stor,
  onLagiSatu,
}: {
  stats: Stats
  stor: Stor
  onLagiSatu: () => void
}) {
  const press = usePress(onLagiSatu)
  const sempurna = stats.salah === 0 && stats.betul > 0
  const rekodTerbaik = stats.markah > 0 && stats.markah === stor.terbaik
  return (
    <div className="flex flex-1 flex-col justify-center py-2">
      <article className="board wonky flex min-h-0 flex-1 flex-col bg-cream text-ink">
        <header className="bg-butter px-4 py-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]">
            Papan markah
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-navy">
            Pusingan ini
          </p>
          <p className="mt-2 text-7xl font-bold leading-none tabular" data-testid="markah">
            {stats.markah}
          </p>
          <p className="mt-2 text-sm font-semibold">
            {sempurna
              ? 'Sempurna — tiada tersalah!'
              : `${stats.betul} betul · ${stats.salah} salah`}
          </p>
          {rekodTerbaik && (
            <p className="mt-3 inline-block bg-navy px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold">
              Rekod terbaik
            </p>
          )}
        </header>

        <div className="board-rule grid grid-cols-2">
          <div
            data-testid="stat-terbaik"
            className={`board-col px-3 py-3.5 text-center ${rekodTerbaik ? 'bg-gold' : 'bg-cream'}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest">Terbaik</p>
            <p className="mt-1 text-3xl font-bold leading-none tabular">{stor.terbaik}</p>
          </div>
          <div
            data-testid="stat-streak-terbaik"
            className="board-col bg-teal px-3 py-3.5 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Streak terbaik
            </p>
            <p className="mt-1 text-3xl font-bold leading-none tabular">
              {stats.streakTerbaik}
            </p>
          </div>
        </div>

        <section className="board-rule flex min-h-0 flex-1 flex-col">
          <h2 className="bg-navy px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cream">
            5 pusingan terakhir
          </h2>
          {stor.terakhir.length === 0 ? (
            <p className="px-3 py-4 text-sm font-semibold text-navy">
              Belum ada rekod.
            </p>
          ) : (
            <ol className="min-h-0 flex-1 overflow-auto">
              {stor.terakhir.map((rekod, i) => {
                const ini = i === 0
                return (
                  <li
                    key={`${rekod.masa}-${i}`}
                    className={`board-row flex items-center justify-between gap-3 px-3 py-2.5 ${
                      ini ? 'bg-butter' : 'bg-cream'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-xs font-bold tabular text-navy">
                        {i + 1}
                      </span>
                      <span className="text-2xl font-bold tabular">{rekod.markah}</span>
                      {ini && (
                        <span className="bg-navy px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                          Ini
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-semibold">
                      {rekod.betul} betul · {rekod.salah} salah
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <button
          type="button"
          data-testid="lagi-satu"
          onPointerDown={press.onPointerDown}
          onClick={press.onClick}
          className="board-foot press board-rule w-full bg-gold py-4 text-xl font-bold text-ink touch-manipulation"
        >
          Lagi Satu
        </button>
      </article>
    </div>
  )
}

function QuestionCard({
  soalan,
  input,
  flash,
  pulseKey = 0,
  cue = null,
}: {
  soalan: Soalan
  input: string
  flash: Flash
  pulseKey?: number
  cue?: string | null
}) {
  const fill =
    flash === 'betul' ? 'bg-ok' : flash === 'salah' ? 'bg-bad' : 'bg-cream'

  return (
    <section
      data-testid="soalan"
      data-a={soalan.a}
      data-b={soalan.b}
      className={`ink-thick wonky relative my-5 flex flex-1 flex-col items-center justify-center px-4 py-6 text-center ${fill}`}
    >
      {cue && (
        <p
          data-testid="pusingan-baru"
          className="cue-pop ink-thick wonky-sm absolute left-3 right-3 top-3 z-10 bg-gold px-3 py-2.5 text-lg font-bold leading-tight"
        >
          {cue}
        </p>
      )}
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]">Soalan</p>
      <p
        key={`${soalan.a}x${soalan.b}-${input}-${flash ?? 'idle'}-${pulseKey}`}
        className="pop text-6xl font-bold leading-none tracking-tight tabular sm:text-7xl"
      >
        {soalan.a} <span className="text-pink">×</span> {soalan.b}
      </p>
      <p
        data-testid="input"
        className="ink wonky-sm mt-6 min-h-14 min-w-24 bg-butter px-4 text-5xl font-bold tabular"
      >
        {input || '?'}
      </p>
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
