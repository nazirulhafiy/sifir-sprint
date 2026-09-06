import { useEffect, useRef, useState } from 'react'
import { CartoonBackdrop } from './CartoonBits.tsx'
import {
  formatMasa,
  getMasaSaat,
  hasil,
  janaSoalan,
  mata,
  type Soalan,
} from './game.ts'
import { NumberPad } from './NumberPad.tsx'
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

  const statsRef = useRef(stats)
  const soalanRef = useRef(soalan)
  const savedRef = useRef(false)
  const inputRef = useRef(input)
  const secondsRef = useRef(seconds)
  const keysRef = useRef({
    addDigit: (_digit: string) => {},
    padam: () => {},
    jawab: (_value: string) => {},
  })

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

  useEffect(() => {
    if (screen !== 'main') return
    const id = window.setInterval(() => {
      const next = secondsRef.current - 1
      if (next <= 0) {
        secondsRef.current = 0
        setSeconds(0)
        setLocked(true)
        window.clearInterval(id)
        window.setTimeout(() => endPlay(), 280)
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
        keysRef.current.padam()
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

  function mula() {
    savedRef.current = false
    const next = emptyStats()
    statsRef.current = next
    const first = janaSoalan(0)
    soalanRef.current = first
    setStats(next)
    setSoalan(first)
    setInput('')
    inputRef.current = ''
    setSeconds(getMasaSaat())
    setFlash(null)
    setLocked(false)
    setReplayIndex(0)
    setReveal(null)
    setRoundId((n) => n + 1)
    setScreen('main')
  }

  function endPlay() {
    const latest = statsRef.current
    if (latest.misses.length > 0) {
      const firstMiss = latest.misses[0]
      soalanRef.current = firstMiss
      setSoalan(firstMiss)
      setReplayIndex(0)
      setInput('')
      inputRef.current = ''
      setFlash(null)
      setReveal(null)
      setLocked(false)
      setScreen('ulang')
      return
    }
    keMarkah()
  }

  function keMarkah() {
    if (!savedRef.current) {
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
    setScreen('markah')
  }

  function applyStats(next: Stats) {
    statsRef.current = next
    setStats(next)
  }

  function addDigit(digit: string) {
    if (locked || (screen !== 'main' && screen !== 'ulang')) return
    if (inputRef.current.length >= 3) return
    const next = `${inputRef.current}${digit}`
    inputRef.current = next
    setInput(next)
    const needed = String(hasil(soalanRef.current)).length
    if (next.length >= needed) {
      jawab(next)
    }
  }

  function padam() {
    if (locked) return
    const next = inputRef.current.slice(0, -1)
    inputRef.current = next
    setInput(next)
  }

  function jawab(value: string) {
    if (locked) return
    if (!value) return
    const n = Number(value)
    if (!Number.isFinite(n)) return

    if (screen === 'ulang') {
      jawabUlang(n)
      return
    }
    if (screen !== 'main' || secondsRef.current <= 0) return

    setLocked(true)
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
      window.setTimeout(() => {
        const q = janaSoalan(streak, current)
        soalanRef.current = q
        setSoalan(q)
        inputRef.current = ''
        setInput('')
        setFlash(null)
        setLocked(false)
      }, 200)
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
    window.setTimeout(() => {
      const q = janaSoalan(0, current)
      soalanRef.current = q
      setSoalan(q)
      inputRef.current = ''
      setInput('')
      setFlash(null)
      setLocked(false)
    }, 260)
  }

  keysRef.current = { addDigit, padam, jawab }

  function jawabUlang(n: number) {
    setLocked(true)
    const current = soalanRef.current
    const answer = hasil(current)
    if (n === answer) {
      setFlash('betul')
      window.setTimeout(() => nextReplay(), 240)
      return
    }
    setFlash('salah')
    setReveal(answer)
    window.setTimeout(() => nextReplay(), 1300)
  }

  function nextReplay() {
    const misses = statsRef.current.misses
    const nextIndex = replayIndex + 1
    if (nextIndex >= misses.length) {
      keMarkah()
      return
    }
    const q = misses[nextIndex]
    soalanRef.current = q
    setSoalan(q)
    setReplayIndex(nextIndex)
    inputRef.current = ''
    setInput('')
    setReveal(null)
    setFlash(null)
    setLocked(false)
  }

  return (
    <div className="sky-stage">
      <CartoonBackdrop />
      <div className="stage mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      {screen === 'mula' && <MulaScreen terbaik={stor.terbaik} onMula={mula} />}
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
        />
      )}
      {screen === 'markah' && (
        <ScoreScreen stats={stats} stor={stor} onLagi={mula} />
      )}
      </div>
    </div>
  )
}

function MulaScreen({
  terbaik,
  onMula,
}: {
  terbaik: number
  onMula: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cream">
        KrackedDevs · Sekolah
      </p>
      <h1 className="ink-thick wonky tilt-l bg-butter px-5 py-3 text-4xl font-bold leading-none tracking-tight text-ink sm:text-5xl">
        Sifir Sprint
      </h1>
      <p className="mt-5 max-w-xs text-base font-semibold leading-relaxed text-navy">
        Soalan → jawab → markah → streak → lagi satu.
      </p>
      <div className="ink wonky mt-8 bg-cream px-6 py-5">
        <p className="text-4xl font-bold tabular text-ink">60s</p>
        <p className="mt-1 text-sm font-semibold">Jadual darab 1–12</p>
        {terbaik > 0 && (
          <p className="mt-3 text-xs font-bold uppercase tracking-widest">
            Terbaik · {terbaik}
          </p>
        )}
      </div>
      <button
        type="button"
        data-testid="mula"
        onClick={onMula}
        className="press ink-thick wonky mt-10 w-full bg-gold py-4 text-xl font-bold text-ink touch-manipulation"
      >
        Mula
      </button>
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
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 pt-1">
        <div className="ink wonky-sm bg-navy px-3 py-2 text-left text-cream">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
            Sifir Sprint
          </p>
          <p className="text-xs font-semibold text-cream/80">Soalan · Jawab · Lagi</p>
        </div>
        <div
          data-testid="timer"
          className={`ink wonky-orb grid h-[88px] w-[88px] place-items-center bg-cream text-center ${low ? 'tick-low bg-bad text-cream' : ''}`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest">Masa</p>
            <p className="text-4xl font-bold leading-none tabular">
              {formatMasa(seconds)}
            </p>
          </div>
        </div>
      </header>

      <QuestionCard soalan={soalan} input={input} flash={flash} />

      <div className="mb-4 grid grid-cols-2 gap-2">
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
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="ink wonky-sm bg-pink px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]">
          Belajar / Replay
        </p>
        <p className="text-sm font-semibold" data-testid="replay-progress">
          Ulang soalan tersalah · {index + 1} / {total}
        </p>
      </header>

      <QuestionCard soalan={soalan} input={input} flash={flash} />

      <div className="ink wonky mb-4 min-h-12 bg-cream px-4 py-3 text-center">
        {reveal === null ? (
          <p className="text-sm font-semibold">
            Jawab semula. Kalau tersalah, jawapan betul dipaparkan.
          </p>
        ) : (
          <p className="text-lg font-bold" data-testid="jawapan-betul">
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
    </div>
  )
}

function ScoreScreen({
  stats,
  stor,
  onLagi,
}: {
  stats: Stats
  stor: Stor
  onLagi: () => void
}) {
  const sempurna = stats.salah === 0 && stats.betul > 0
  return (
    <div className="flex flex-1 flex-col">
      <header className="ink-thick wonky tilt-r bg-butter px-4 py-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Markah</p>
        <p className="mt-2 text-7xl font-bold leading-none tabular" data-testid="markah">
          {stats.markah}
        </p>
        <p className="mt-2 text-sm font-semibold">
          {sempurna ? 'Sempurna — tiada tersalah!' : `${stats.betul} betul · ${stats.salah} salah`}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <StatPill label="Terbaik" value={stor.terbaik} accent />
        <StatPill label="Streak terbaik" value={stats.streakTerbaik} />
      </div>

      <section className="mt-6 flex-1">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-navy">
          5 pusingan terakhir
        </h2>
        {stor.terakhir.length === 0 ? (
          <p className="text-sm font-semibold text-navy">Belum ada rekod.</p>
        ) : (
          <ol className="space-y-2">
            {stor.terakhir.map((rekod, i) => (
              <li
                key={`${rekod.masa}-${i}`}
                className="ink wonky-sm flex items-center justify-between bg-cream px-3 py-2.5"
              >
                <span className="text-lg font-bold tabular">{rekod.markah}</span>
                <span className="text-xs font-semibold">
                  {rekod.betul} betul · {rekod.salah} salah
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <button
        type="button"
        data-testid="lagi"
        onClick={onLagi}
        className="press ink-thick wonky mt-6 w-full bg-gold py-4 text-xl font-bold text-ink touch-manipulation"
      >
        Lagi
      </button>
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
      className={`ink-thick wonky relative my-5 flex flex-1 flex-col items-center justify-center px-4 py-6 text-center ${fill}`}
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]">Soalan</p>
      <p
        key={`${soalan.a}x${soalan.b}-${input}-${flash ?? 'idle'}`}
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
