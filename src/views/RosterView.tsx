import { useState } from 'react'
import { ClipboardList, ArrowRight, Trash2, FileText, Star, Plus, X, Pencil } from 'lucide-react'
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
  roster: string[]
  ratingOf: (name: string) => number
  onRate: (name: string, value: number) => void
  isGk: (name: string) => boolean
  onToggleGk: (name: string) => void
  showRatings: boolean
  onToggleShowRatings: () => void
  onAddPlayer: (name: string) => void
  onRenamePlayer: (index: number, name: string) => void
  onRemovePlayer: (index: number) => void
  onContinue: () => void
}

export function RosterView({
  rawInput,
  onChangeRaw,
  roster,
  ratingOf,
  onRate,
  isGk,
  onToggleGk,
  showRatings,
  onToggleShowRatings,
  onAddPlayer,
  onRenamePlayer,
  onRemovePlayer,
  onContinue,
}: RosterViewProps) {
  const [addName, setAddName] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const commitAdd = () => {
    if (addName.trim()) {
      onAddPlayer(addName)
      setAddName('')
    }
  }
  const startEdit = (i: number, name: string) => {
    setEditIndex(i)
    setEditValue(name)
  }
  const commitEdit = () => {
    if (editIndex != null) onRenamePlayer(editIndex, editValue)
    setEditIndex(null)
  }

  return (
    <ViewShell
      title="SquadSort"
      subtitle="Paste, then tweak the list"
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
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <textarea
          value={rawInput}
          onChange={(e) => onChangeRaw(e.target.value)}
          placeholder={'Paste your WhatsApp list here…\n\n1. Danny\n2. Marcus'}
          spellCheck={false}
          className="h-20 shrink-0 resize-none rounded-2xl border border-zinc-800 bg-zinc-900 p-3 font-mono text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />

        {/* Add a player manually */}
        <div className="flex shrink-0 gap-2">
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitAdd()}
            placeholder="Add a player…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={commitAdd}
            disabled={!addName.trim()}
            className="flex items-center gap-1 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 active:scale-95 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {roster.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
              <span className="text-[11px] font-semibold text-zinc-500">{roster.length} players</span>
              <button
                type="button"
                onClick={onToggleShowRatings}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                  showRatings ? 'bg-amber-400/15 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <Star className={`h-3 w-3 ${showRatings ? 'fill-amber-400 text-amber-400' : ''}`} />
                {showRatings ? 'Hide ratings' : 'Rate & GK'}
              </button>
            </div>

            <ul className="min-h-0 flex-1 divide-y divide-zinc-800/70 overflow-y-auto px-2 pb-1">
              {roster.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center gap-2 px-1 py-2">
                  {editIndex === i ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                      className="min-w-0 flex-1 rounded-lg border border-emerald-500/50 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:outline-none"
                    />
                  ) : (
                    <>
                      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(i, name)}
                        className="flex min-w-0 flex-1 items-center gap-1 truncate text-left text-sm text-zinc-100"
                      >
                        <span className="truncate">{name}</span>
                        <Pencil className="h-3 w-3 shrink-0 text-zinc-600" />
                      </button>
                    </>
                  )}

                  {showRatings && editIndex !== i && (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleGk(name)}
                        aria-label={`${name} goalkeeper`}
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition active:scale-95 ${
                          isGk(name) ? 'bg-emerald-500 text-emerald-950' : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        GK
                      </button>
                      <StarRating value={ratingOf(name)} onChange={(v) => onRate(name, v)} size={16} />
                    </>
                  )}

                  {editIndex !== i && (
                    <button
                      type="button"
                      onClick={() => onRemovePlayer(i)}
                      aria-label={`Remove ${name}`}
                      className="shrink-0 p-1 text-zinc-600 active:scale-90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={roster.length < 2}
          className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-lg font-bold text-emerald-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Continue to Setup
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </ViewShell>
  )
}
