type NumberPadProps = {
  disabled?: boolean
  onDigit: (digit: string) => void
  onPadam: () => void
  onJawab: () => void
}

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function NumberPad({
  disabled = false,
  onDigit,
  onPadam,
  onJawab,
}: NumberPadProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {digits.map((digit) => (
        <PadButton
          key={digit}
          disabled={disabled}
          onClick={() => onDigit(digit)}
          label={digit}
        />
      ))}
      <PadButton
        disabled={disabled}
        onClick={onPadam}
        label="Padam"
        tone="muted"
      />
      <PadButton
        disabled={disabled}
        onClick={() => onDigit('0')}
        label="0"
      />
      <PadButton
        disabled={disabled}
        onClick={onJawab}
        label="Jawab"
        tone="gold"
      />
    </div>
  )
}

type PadButtonProps = {
  label: string
  disabled?: boolean
  tone?: 'default' | 'muted' | 'gold'
  onClick: () => void
}

function PadButton({
  label,
  disabled,
  tone = 'default',
  onClick,
}: PadButtonProps) {
  const toneClass =
    tone === 'gold'
      ? 'bg-gold text-navy shadow-[0_6px_0_#9a6f1c] active:translate-y-0.5 active:shadow-[0_3px_0_#9a6f1c]'
      : tone === 'muted'
        ? 'bg-navy-card text-cream/70 border border-white/8 shadow-[0_5px_0_#0a1020] active:translate-y-0.5 active:shadow-[0_2px_0_#0a1020]'
        : 'bg-[#1a2438] text-cream border border-white/8 shadow-[0_5px_0_#0a1020] active:translate-y-0.5 active:shadow-[0_2px_0_#0a1020]'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-14 rounded-2xl text-xl font-extrabold tracking-wide touch-manipulation transition disabled:opacity-40 disabled:shadow-none ${toneClass}`}
    >
      {label}
    </button>
  )
}
