import { usePress } from './press.ts'

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
      {digits.map((digit, i) => (
        <PadButton
          key={digit}
          disabled={disabled}
          onClick={() => onDigit(digit)}
          label={digit}
          wobble={i % 3 === 0 ? 'l' : i % 3 === 2 ? 'r' : undefined}
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
  wobble?: 'l' | 'r'
  onClick: () => void
}

function PadButton({
  label,
  disabled,
  tone = 'default',
  wobble,
  onClick,
}: PadButtonProps) {
  const press = usePress(onClick, disabled)
  const toneClass =
    tone === 'gold'
      ? 'bg-gold'
      : tone === 'muted'
        ? 'bg-pink'
        : 'bg-butter'

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={press.onPointerDown}
      onClick={press.onClick}
      data-testid={label === 'Jawab' ? 'jawab' : label === 'Padam' ? 'padam' : `digit-${label}`}
      className={`press ink wonky-sm min-h-14 text-xl font-bold tracking-wide text-ink touch-manipulation disabled:opacity-40 disabled:shadow-none ${toneClass} ${wobble === 'l' ? 'tilt-l' : wobble === 'r' ? 'tilt-r' : ''}`}
    >
      <span className="pad-face pointer-events-none">{label}</span>
    </button>
  )
}
