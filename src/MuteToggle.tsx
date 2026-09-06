type MuteToggleProps = {
  bisu: boolean
  onToggle: () => void
}

export function MuteToggle({ bisu, onToggle }: MuteToggleProps) {
  return (
    <button
      type="button"
      data-testid="mute"
      aria-label={bisu ? 'Hidupkan bunyi' : 'Bisu'}
      aria-pressed={bisu}
      onClick={onToggle}
      className="press ink wonky-orb grid h-12 w-12 place-items-center bg-cream text-ink touch-manipulation"
    >
      {bisu ? <IconOff /> : <IconOn />}
    </button>
  )
}

function IconOn() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        fill="currentColor"
        d="M4 9v6h3.2L12 19.2V4.8L7.2 9H4zm11.5 3c0-1.8-1-3.3-2.5-4.1v8.2c1.5-.8 2.5-2.3 2.5-4.1zm2.5 0c0 3-1.8 5.6-4.4 6.7l.8 1.8C17.8 19 20 16.3 20 12s-2.2-7-5.6-8.5l-.8 1.8C16.2 6.4 18 9 18 12z"
      />
    </svg>
  )
}

function IconOff() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        fill="currentColor"
        d="M4 9v6h3.2L12 19.2V4.8L7.2 9H4zm12.3-3.1 1.4 1.4-2.1 2.1c.3.5.4 1 .4 1.6 0 1.8-1 3.3-2.5 4.1v2.2c1.4-.4 2.6-1.3 3.4-2.5l1.8 1.8C19.4 15.2 20 13.7 20 12c0-2.6-1.2-4.9-3.1-6.4l-.6.3zM14 8.9v1.7l-1.5-1.5.3-.3 1.2.1zM3.3 3 2 4.3 20.7 23 22 21.7 3.3 3z"
      />
    </svg>
  )
}
