import { useEffect, useRef, useState } from 'react'
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
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
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
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-gold">
        KrackedDevs · Sekolah
      </p>
      <h1 className="text-5xl font-extrabold leading-none tracking-tight text-cream">
        Sifir Sprint
      </h1>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
        Soalan → jawab → markah → streak → lagi satu.
      </p>
      <div className="mt-8 rounded-3xl border border-white/8 bg-navy-mid/80 px-6 py-5 text-cream/80">
        <p className="text-3xl font-extrabold tabular text-gold">60s</p>
        <p className="mt-1 text-sm">Jadual darab 1–12</p>
        {terbaik > 0 && (
          <p className="mt-3 text-xs uppercase tracking-widest text-cream/50">
            Terbaik · {terbaik}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onMula}
        className="mt-10 w-full rounded-2xl bg-gold py-4 text-lg font-extrabold text-navy shadow-[0_7px_0_#9a6f1c] touch-manipulation active:translate-y-0.5 active:shadow-[0_4px_0_#9a6f1c]"
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
      <header className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
            Sifir Sprint
          </p>
          <p className="text-xs text-cream/45">Soalan · Jawab · Lagi</p>
        </div>
        <div
          className={`rounded-2xl px-3 py-2 text-right ${low ? 'bg-bad/15 tick-low' : 'bg-navy-card'}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-cream/50">
            Masa
          </p>
          <p
            className={`text-4xl font-extrabold leading-none tabular ${low ? 'text-bad' : 'text-gold'}`}
          >
            {formatMasa(seconds)}
          </p>
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
      <header className="pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
          Belajar / Replay
        </p>
        <p className="text-sm text-cream/60">
          Ulang soalan tersalah · {index + 1} / {total}
        </p>
      </header>

      <QuestionCard soalan={soalan} input={input} flash={flash} />

      <div className="mb-4 min-h-12 rounded-2xl border border-white/8 bg-navy-card px-4 py-3 text-center">
        {reveal === null ? (
          <p className="text-sm text-cream/55">
            Jawab semula. Kalau tersalah, jawapan betul dipaparkan.
          </p>
        ) : (
          <p className="text-lg font-extrabold text-gold">
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
      <header className="pt-2 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
          Markah
        </p>
        <p className="mt-3 text-7xl font-extrabold leading-none tabular text-cream">
          {stats.markah}
        </p>
        <p className="mt-2 text-sm text-cream/60">
          {sempurna ? 'Sempurna — tiada tersalah!' : `${stats.betul} betul · ${stats.salah} salah`}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <StatPill label="Terbaik" value={stor.terbaik} accent />
        <StatPill label="Streak terbaik" value={stats.streakTerbaik} />
      </div>

      <section className="mt-6 flex-1">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-cream/45">
          5 pusingan terakhir
        </h2>
        {stor.terakhir.length === 0 ? (
          <p className="text-sm text-cream/40">Belum ada rekod.</p>
        ) : (
          <ol className="space-y-2">
            {stor.terakhir.map((rekod, i) => (
              <li
                key={`${rekod.masa}-${i}`}
                className="flex items-center justify-between rounded-xl bg-navy-card px-3 py-2.5"
              >
                <span className="text-lg font-extrabold tabular text-gold">
                  {rekod.markah}
                </span>
                <span className="text-xs text-cream/50">
                  {rekod.betul} betul · {rekod.salah} salah
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <button
        type="button"
        onClick={onLagi}
        className="mt-6 w-full rounded-2xl bg-gold py-4 text-lg font-extrabold text-navy shadow-[0_7px_0_#9a6f1c] touch-manipulation active:translate-y-0.5 active:shadow-[0_4px_0_#9a6f1c]"
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
  const ring =
    flash === 'betul'
      ? 'ring-4 ring-ok/80 bg-ok/10'
      : flash === 'salah'
        ? 'ring-4 ring-bad/80 bg-bad/10'
        : 'ring-1 ring-white/8 bg-navy-mid/90'

  return (
    <section
      className={`relative my-5 flex flex-1 flex-col items-center justify-center rounded-[28px] px-4 py-6 text-center ${ring}`}
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-cream/40">
        Soalan
      </p>
      <p
        key={`${soalan.a}x${soalan.b}-${input}-${flash ?? 'idle'}`}
        className="pop text-6xl font-extrabold leading-none tracking-tight tabular sm:text-7xl"
      >
        {soalan.a} <span className="text-gold">×</span> {soalan.b}
      </p>
      <p className="mt-6 min-h-14 text-5xl font-extrabold tabular text-gold-bright">
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
      className={`rounded-2xl px-3 py-2.5 ${accent ? 'bg-gold/15 ring-1 ring-gold/40' : 'bg-navy-card'}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-cream/45">
        {label}
      </p>
      <p className="text-2xl font-extrabold leading-none tabular text-cream">
        {value}
        {hint && (
          <span className="ml-2 align-middle text-xs font-bold text-gold">
            {hint}
          </span>
        )}
      </p>
    </div>
  )
}
