import { ClipboardList, ArrowRight, Trash2, FileText } from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { StarRating } from '../components/StarRating'

const SAMPLE = `⚽ Futsal — 09 July 2026
8-9pm @ The Cage
Reply to confirm 👇

1. Danny
2. Marcus
3. Leo
4. Sanjay
5. Kwame
6. Tom
7. Rui
8. Aiden
9. Bilal
10. Chris
11. Femi
12. Noah
13. Omar
14. Pete
15. Raj
16. Sam
17. Theo
18. Vik
19. Will`

interface RosterViewProps {
  rawInput: string
  onChangeRaw: (v: string) => void
  players: string[]
  ratingOf: (name: string) => number
  onRate: (name: string, value: number) => void
  onContinue: () => void
}

export function RosterView({
  rawInput,
  onChangeRaw,
  players,
  ratingOf,
  onRate,
  onContinue,
}: RosterViewProps) {
  return (
    <ViewShell
      title="SquadSort"
      subtitle="Paste the WhatsApp list"
      icon={ClipboardList}
      logoSrc="/logo.svg"
      action={
        <>
          <button
            type="button"
            onClick={() => onChangeRaw(SAMPLE)}
            className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 active:scale-95"
          >
            <FileText className="h-3.5 w-3.5" />
            Sample
          </button>
          <button
            type="button"
            onClick={() => onChangeRaw('')}
            disabled={!rawInput}
            aria-label="Clear"
            className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 active:scale-95 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <textarea
          value={rawInput}
          onChange={(e) => onChangeRaw(e.target.value)}
          placeholder={'Paste your WhatsApp list here…\n\n1. Danny\n2. Marcus\n3. Leo'}
          spellCheck={false}
          className="h-28 shrink-0 resize-none rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />

        {players.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-semibold text-zinc-500">
              <span>{players.length} players</span>
              <span>skill ⭐</span>
            </div>
            <ul className="divide-y divide-zinc-800/70">
              {players.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">{name}</span>
                  <StarRating value={ratingOf(name)} onChange={(v) => onRate(name, v)} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={players.length < 2}
          className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-emerald-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Continue to Setup
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </ViewShell>
  )
}
