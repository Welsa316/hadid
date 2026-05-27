import type { PlateStack } from '@/db/schema'

export interface CalculatorResult {
  /** Plates loaded on each side of the bar, heaviest first. */
  perSidePlates: PlateStack[]
  /** Resulting total weight, including bar and machine carriage. */
  achievedWeight: number
  /** Whether `achievedWeight === target` (no rounding). */
  isExact: boolean
}

const EPS = 1e-6

/**
 * Greedy plate loader — heaviest first, respecting how many of each plate
 * the user actually owns (we can only put one plate per side per pair, so
 * available per side is `floor(count / 2)`).
 *
 * Returns the closest-achievable loading at-or-below `target`. Returns null
 * when the target is below the bar+machine and so cannot be loaded.
 */
export function calculatePlates(
  target: number,
  bar: number,
  plates: PlateStack[],
  machine = 0,
): CalculatorResult | null {
  const net = target - bar - machine
  if (net < -EPS) return null
  if (net < EPS) return { perSidePlates: [], achievedWeight: bar + machine, isExact: true }

  const perSideTarget = net / 2
  const sorted = [...plates].sort((a, b) => b.weight - a.weight)
  let remaining = perSideTarget
  const used: PlateStack[] = []
  for (const plate of sorted) {
    if (plate.weight <= 0 || plate.count <= 0) continue
    const availPerSide = Math.floor(plate.count / 2)
    if (availPerSide === 0) continue
    const useCount = Math.min(
      Math.floor((remaining + EPS) / plate.weight),
      availPerSide,
    )
    if (useCount > 0) {
      used.push({ weight: plate.weight, count: useCount })
      remaining -= useCount * plate.weight
    }
  }
  const loaded = perSideTarget - remaining
  return {
    perSidePlates: used,
    achievedWeight: bar + machine + 2 * loaded,
    isExact: remaining < EPS,
  }
}

/**
 * Returns the loadable weight closest to `target` — picks the nearer of the
 * largest achievable at-or-below and the smallest achievable above. Used by
 * the suggested-next-set logic to never propose a non-loadable number.
 */
export function roundToLoadable(
  target: number,
  bar: number,
  plates: PlateStack[],
  machine = 0,
): CalculatorResult | null {
  const lower = calculatePlates(target, bar, plates, machine)
  if (lower === null) return null
  if (lower.isExact) return lower

  // Try every "lower + one more single plate per side" candidate and pick
  // the smallest one above the target.
  let upper: CalculatorResult | null = null
  for (const plate of [...plates].sort((a, b) => a.weight - b.weight)) {
    if (plate.weight <= 0 || plate.count <= 0) continue
    const usedOfThis =
      lower.perSidePlates.find((p) => p.weight === plate.weight)?.count ?? 0
    const availPerSide = Math.floor(plate.count / 2)
    if (usedOfThis >= availPerSide) continue
    const candidateWeight = lower.achievedWeight + 2 * plate.weight
    if (candidateWeight > target - EPS) {
      if (upper === null || candidateWeight < upper.achievedWeight) {
        const stack: PlateStack[] = [
          ...lower.perSidePlates.map((p) => ({ ...p })),
        ]
        const existing = stack.find((p) => p.weight === plate.weight)
        if (existing !== undefined) existing.count += 1
        else stack.push({ weight: plate.weight, count: 1 })
        stack.sort((a, b) => b.weight - a.weight)
        upper = { perSidePlates: stack, achievedWeight: candidateWeight, isExact: false }
      }
    }
  }
  if (upper === null) return lower
  return target - lower.achievedWeight <= upper.achievedWeight - target ? lower : upper
}

/**
 * Default plate kits keyed by unit. Sensible counts for a home rack — users
 * can adjust in the gym-profile editor.
 */
export const DEFAULT_PLATES: Record<'lb' | 'kg', PlateStack[]> = {
  lb: [
    { weight: 45, count: 4 },
    { weight: 35, count: 2 },
    { weight: 25, count: 4 },
    { weight: 10, count: 4 },
    { weight: 5, count: 4 },
    { weight: 2.5, count: 4 },
  ],
  kg: [
    { weight: 20, count: 4 },
    { weight: 15, count: 2 },
    { weight: 10, count: 4 },
    { weight: 5, count: 4 },
    { weight: 2.5, count: 4 },
    { weight: 1.25, count: 4 },
  ],
}

export const BAR_PRESETS: Record<'lb' | 'kg', Array<{ label: string; weight: number }>> = {
  lb: [
    { label: 'Standard 45 lb', weight: 45 },
    { label: "Women's 35 lb", weight: 35 },
    { label: 'Training 15 lb', weight: 15 },
  ],
  kg: [
    { label: 'Standard 20 kg', weight: 20 },
    { label: "Women's 15 kg", weight: 15 },
    { label: 'Training 7 kg', weight: 7 },
  ],
}
