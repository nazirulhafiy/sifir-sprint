export type Rekod = {
  markah: number
  betul: number
  salah: number
  masa: number
}

export type Stor = {
  terbaik: number
  terakhir: Rekod[]
}

const KEY = 'sifir-sprint.v1'

export function storKosong(): Stor {
  return { terbaik: 0, terakhir: [] }
}

export function muatStor(): Stor {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return storKosong()
    const parsed = JSON.parse(raw) as Stor
    if (typeof parsed.terbaik !== 'number' || !Array.isArray(parsed.terakhir)) {
      return storKosong()
    }
    return {
      terbaik: parsed.terbaik,
      terakhir: parsed.terakhir.slice(0, 5),
    }
  } catch {
    return storKosong()
  }
}

export function simpanPusingan(rekod: Rekod): Stor {
  const now = muatStor()
  const terakhir = [rekod, ...now.terakhir].slice(0, 5)
  const terbaik = Math.max(now.terbaik, rekod.markah)
  const next = { terbaik, terakhir }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
