import { ClipboardList, ArrowRight, Trash2, Users } from 'lucide-react'
import { ViewShell } from '../components/ViewShell'

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
  onContinue: () => void
}

export function RosterView({ rawInput, onChangeRaw, players, onContinue }: RosterViewProps) {
  return (
    <ViewShell title="Roster" subtitle="Paste the WhatsApp list" icon={ClipboardList}>
      <div className="flex flex-col gap-4">
        <textarea
          value={rawInput}
          onChange={(e) => onChangeRaw(e.target.value)}
          placeholder={'Paste your WhatsApp list here…\n\n1. Danny\n2. Marcus\n3. Leo'}
          spellCheck={false}
          rows={10}
          className="w-full resize-y rounded-2xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChangeRaw(SAMPLE)}
            className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 py-3 text-sm font-semibold text-zinc-200 transition active:scale-[0.98]"
          >
            Paste sample
          </button>
          <button
            type="button"
            onClick={() => onChangeRaw('')}
            disabled={!rawInput}
            className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-400 transition active:scale-[0.98] disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>

        {/* Live parsed count */}
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-200">
            <Users className="h-5 w-5" />
            Players detected
          </span>
          <span className="text-3xl font-black tabular-nums text-emerald-400">
            {players.length}
          </span>
        </div>

        {players.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {players.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
              >
                <span className="text-xs font-semibold text-zinc-500">{i + 1}</span>
                {name}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={players.length < 2}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-emerald-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Continue to Setup
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </ViewShell>
  )
}
