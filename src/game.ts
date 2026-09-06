export type Soalan = {
  a: number
  b: number
}

export function hasil(soalan: Soalan): number {
  return soalan.a * soalan.b
}

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function janaSoalan(streak: number, elak?: Soalan): Soalan {
  const berat = Math.min(0.18 + streak * 0.09, 0.82)
  const pilih = (): Soalan => {
    const sukar = Math.random() < berat
    return {
      a: sukar ? rand(6, 12) : rand(1, 12),
      b: sukar ? rand(6, 12) : rand(1, 12),
    }
  }

  let soalan = pilih()
  for (let i = 0; i < 10; i += 1) {
    if (!elak || soalan.a !== elak.a || soalan.b !== elak.b) break
    soalan = pilih()
  }
  return soalan
}

export function mata(streakSelepas: number): number {
  return streakSelepas >= 3 ? 2 : 1
}

export function getMasaSaat(): number {
  if (typeof window === 'undefined') return 60
  const q = new URLSearchParams(window.location.search).get('masa')
  if (!q) return 60
  const n = Number(q)
  if (!Number.isFinite(n)) return 60
  return Math.min(60, Math.max(5, Math.floor(n)))
}

export function formatMasa(saat: number): string {
  return String(Math.max(0, saat)).padStart(2, '0')
}
