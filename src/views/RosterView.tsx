import { ClipboardList, ArrowRight, Trash2, Users, FileText } from 'lucide-react'
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
    <ViewShell
      title="Roster"
      subtitle="Paste the WhatsApp list"
      icon={ClipboardList}
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
          className="min-h-24 flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />

        {players.length > 0 && (
          <div className="max-h-24 shrink-0 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
            <div className="flex flex-wrap gap-1.5">
              {players.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                >
                  <span className="text-[10px] font-semibold text-zinc-500">{i + 1}</span>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
            <Users className="h-5 w-5 text-emerald-300" />
            <span className="text-sm font-medium text-emerald-200">Players</span>
            <span className="ml-auto text-2xl font-black tabular-nums text-emerald-400">
              {players.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onContinue}
            disabled={players.length < 2}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-base font-bold text-emerald-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            Setup
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </ViewShell>
  )
}
