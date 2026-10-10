# Design

Cartoon school-edition look: deep **navy** structure, warm **amber** (butter / gold) accents, cream boards, and a sky-to-peach gradient stage behind the playfield.

## Palette and type

| Token | Role |
| --- | --- |
| `navy` (`#16224a`) | Page background, play header bar, **Masa tamat** title band |
| `butter` / `gold` | Landing header, score card body, primary CTAs (`Mula`, `Try Lagi`), pad highlights |
| `cream` | Card surfaces, timer orb (normal), mute control |
| `gold` (accent on navy) | Play header kicker text |
| `ok` / `bad` | Correct / wrong flash; timer orb turns bad red at ≤10s |

Display font: **Fredoka** (with Bricolage Grotesk fallback). Numbers use tabular figures where scores and the timer are shown.

Decorative motion lives in [`src/CartoonBits.tsx`](../src/CartoonBits.tsx) and global stage styles in [`src/index.css`](../src/index.css) (`.sky-stage`, wonky borders, press states).

## Screens

### Play (`main`)

- Top: navy title strip (“Sifir Sprint”) + circular **Masa** timer (cream; urgent styling when low).
- Centre: large multiplication **soalan** and answer input with brief betul/salah flash feedback.
- Bottom: live **Markah** and **Streak** pills (×2 mata hint when streak ≥ 3).
- **Number pad** for digits, Padam, and Jawab; **Baru** returns to title without reloading.
- Mute toggle top-right (with **Baru** during play).

### Masa tamat (`tamat`)

End-of-round **score card** (`data-testid="masa-tamat"`):

1. Navy header: **Masa tamat!**
2. Butter panel: large **Markah**, then `N betul · M salah` (and **Sempurna!** when no misses).
3. Gold **Try Lagi** — starts a fresh round in-place.

Mute sits alone top-right on this screen.

### Title (`mula`)

Cream board with butter header, 60s / 1–12 summary, gold **Mula** CTA. First **Mula** (or pad/key) unlocks Web Audio when not muted.

## Sound

Implemented in [`src/audio.ts`](../src/audio.ts):

- **BGM:** short looping chiptune pattern after the user unlocks audio (first interaction).
- **SFX:** distinct tones for correct, wrong, and round end.
- **Mute:** `localStorage` key `sifir-sprint.bisu`; default unmuted on first visit.

BGM stops when the round ends; **Try Lagi** can start it again if sound is on.

## Scoring (player-visible)

- Correct answers add streak; at **3+** streak, points **double**.
- Wrong answers break streak and count toward salah on the tamat card.

Logic: [`src/game.ts`](../src/game.ts).
