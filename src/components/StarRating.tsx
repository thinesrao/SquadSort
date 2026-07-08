import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number // 1..3
  onChange: (v: number) => void
  size?: number // icon px
}

/** Compact 3-star skill selector (1 = Beginner, 2 = Average, 3 = Top). */
export function StarRating({ value, onChange, size = 18 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((n) => {
        const filled = n <= value
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-0.5 active:scale-90"
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}
              strokeWidth={2}
            />
          </button>
        )
      })}
    </div>
  )
}
